import { describe, test, expect, beforeEach } from 'bun:test';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { resetForTests } from '../lib/db/idb';
import * as repo from '../lib/db/repository';
import { buildBackup, validateBackup, readBackupFile, previewRestore, applyRestore, getPreRestoreBackup } from '../lib/backup';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory() as unknown as IDBFactory & typeof indexedDB;
  resetForTests();
});

const mkDoc = (id: string, num: string, over: Record<string, unknown> = {}) => ({
  id, type: 'invoice', documentNumber: num,
  document: { id, type: 'invoice' } as never, calc: {} as never,
  status: 'unpaid', payments: [], clientId: null, clientName: 'Acme',
  issueDate: '2026-10-01', dueDate: '2026-10-15', totalMinor: 100000, amountPaidMinor: 0,
  convertedFromId: null, convertedToId: null,
  createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', ...over,
});

describe('export', () => {
  test('produces complete portable backup with schema version + counts', async () => {
    await repo.saveClient({ name: 'Acme', gstin: '27A' });
    await repo.saveProduct({ name: 'P', price: 10 });
    await repo.saveDocument(mkDoc('d1', 'INV-1') as never);
    await repo.saveImage('img1', 'data:image/png;base64,AAAA');
    await repo.saveProfile({ ...repo.DEFAULT_PROFILE, businessName: 'My Biz' });
    const b = await buildBackup();
    expect(b.app).toBe('billcraft');
    expect(b.schemaVersion).toBeGreaterThanOrEqual(1);
    expect(b.counts).toEqual({ clients: 1, products: 1, documents: 1, images: 1 });
    expect(b.data.businessProfile?.businessName).toBe('My Biz');
    // JSON round-trip must not lose data
    const back = validateBackup(JSON.parse(JSON.stringify(b)));
    expect(back.ok).toBe(true);
  });
});

describe('validation rejects malformed files', () => {
  test('not billcraft / wrong shapes', () => {
    expect(validateBackup(null).ok).toBe(false);
    expect(validateBackup({}).ok).toBe(false);
    expect(validateBackup({ app: 'other', schemaVersion: 1, exportedAt: '2026-10-16T00:00:00Z', data: {} }).ok).toBe(false);
    expect(validateBackup({ app: 'billcraft', schemaVersion: 'x', exportedAt: '', data: {} }).ok).toBe(false);
    expect(validateBackup({ app: 'billcraft', schemaVersion: 99, exportedAt: '2026-10-16T00:00:00Z', data: {} }).ok).toBe(false);
  });

  test('count mismatch flags corruption', () => {
    const b = {
      app: 'billcraft', schemaVersion: 1, exportedAt: '2026-10-16T00:00:00Z',
      counts: { clients: 5, products: 0, documents: 0, images: 0 },
      data: { clients: [], products: [], documents: [], images: [], businessProfile: null, preferences: null },
    };
    const r = validateBackup(b);
    expect(r.ok).toBe(false);
  });

  test('invalid records rejected with field-level errors', () => {
    const b = {
      app: 'billcraft', schemaVersion: 1, exportedAt: '2026-10-16T00:00:00Z',
      counts: { clients: 1, products: 0, documents: 1, images: 1 },
      data: {
        clients: [{ id: '', name: '' }],
        products: [], documents: [mkDoc('d', 'N')],
        images: [{ id: 'i', dataUrl: 'not-base64' }],
        businessProfile: null, preferences: null,
      },
    };
    const r = validateBackup(b);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toContain('clients[0]');
    expect(r.ok === false && r.error).toContain('images[0]');
  });

  test('truncated JSON rejected by readBackupFile', async () => {
    const file = new File(['{"app":"billcraft","schemaVersion":1,"data":{"clie'], 'broken.json');
    const r = await readBackupFile(file);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.error).toContain('not valid JSON');
  });

  test('oversized file rejected', async () => {
    const big = 'x'.repeat(61 * 1024 * 1024);
    const file = new File([big], 'big.json');
    const r = await readBackupFile(file);
    expect(r.ok).toBe(false);
  });
});

describe('restore: merge', () => {
  test('unions by id; newer updatedAt wins; tie -> imported', async () => {
    await repo.saveClient({ name: 'Local Acme', gstin: 'G1' });
    const local = (await repo.listClients())[0];
    const importClient = { ...local, name: 'Imported Acme', createdAt: local.createdAt, updatedAt: local.updatedAt };
    const fresh = { id: 'new1', name: 'New Client', contactPerson: '', phone: '', email: '', billingAddress: '', shippingAddress: '', gstin: '', state: '', stateCode: '', notes: '', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z' };
    const backup = {
      app: 'billcraft', schemaVersion: 1, exportedAt: '2026-10-16T00:00:00Z',
      counts: { clients: 2, products: 0, documents: 0, images: 0 },
      data: { clients: [importClient, fresh], products: [], documents: [], images: [], businessProfile: null, preferences: null },
    };
    const v = validateBackup(backup);
    expect(v.ok).toBe(true);
    if (!v.ok) return;

    const preview = await previewRestore(v.backup);
    expect(preview.mergeSummary.clients).toEqual({ added: 1, updated: 1, keptLocal: 0 }); // tie -> imported wins

    const report = await applyRestore(v.backup, 'merge');
    expect(report.clients).toEqual({ added: 1, updated: 1, keptLocal: 0, total: 2 });
    const after = await repo.listClients();
    expect(after.map((c) => c.name).sort()).toEqual(['Imported Acme', 'New Client']);
    // ID preserved, relationship intact
    expect(after.find((c) => c.name === 'Imported Acme')?.id).toBe(local.id);
  });

  test('older imported record does NOT clobber newer local edit', async () => {
    const local = await repo.saveClient({ name: 'Newer Local' });
    const older = { ...local, name: 'Older Imported', createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z' };
    const backup = {
      app: 'billcraft', schemaVersion: 1, exportedAt: '2026-10-16T00:00:00Z',
      counts: { clients: 1, products: 0, documents: 0, images: 0 },
      data: { clients: [older], products: [], documents: [], images: [], businessProfile: null, preferences: null },
    };
    const v = validateBackup(backup);
    if (!v.ok) throw new Error('should be valid');
    const report = await applyRestore(v.backup, 'merge');
    expect(report.clients.keptLocal).toBe(1);
    expect((await repo.listClients())[0].name).toBe('Newer Local');
  });
});

describe('restore: replace', () => {
  test('wipes then imports exactly; pre-restore backup created; verification counts', async () => {
    await repo.saveClient({ name: 'Local Only' });
    await repo.saveDocument(mkDoc('local-doc', 'INV-L') as never);
    const imported = mkDoc('imp1', 'INV-I');
    const backup = {
      app: 'billcraft', schemaVersion: 1, exportedAt: '2026-10-16T00:00:00Z',
      counts: { clients: 0, products: 0, documents: 1, images: 0 },
      data: { clients: [], products: [], documents: [imported], images: [], businessProfile: null, preferences: null },
    };
    const v = validateBackup(backup);
    if (!v.ok) throw new Error('should be valid');
    const report = await applyRestore(v.backup, 'replace');
    expect(report.documents).toEqual({ added: 1, updated: 0, keptLocal: 0, total: 1 });
    expect(report.verification.documents).toBe(1);
    const docs = await repo.listDocuments();
    expect(docs).toHaveLength(1);
    expect(docs[0].documentNumber).toBe('INV-I'); // local INV-L is gone (documented replace semantics)
    // recovery snapshot exists and contains the wiped local doc
    const snap = await getPreRestoreBackup();
    expect(snap?.json).toContain('INV-L');
  });
});

describe('historical integrity through restore', () => {
  test('document snapshots survive client changes and round-trip restore', async () => {
    const c = await repo.saveClient({ name: 'Original Name' });
    await repo.saveDocument({
      id: 'd1', type: 'invoice', documentNumber: 'INV-1',
      document: { id: 'd1', type: 'invoice', customer: { name: 'Original Name' } } as never,
      calc: {} as never, status: 'unpaid', payments: [], clientId: c.id, clientName: 'Original Name',
      issueDate: '2026-10-01', dueDate: '', totalMinor: 50000, amountPaidMinor: 0,
      convertedFromId: null, convertedToId: null, createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z',
    } as never);
    // rename the client afterwards
    await repo.saveClient({ id: c.id, name: 'Renamed' });
    const export1 = await buildBackup();
    const v = validateBackup(export1);
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    await repo.clearAllData();
    await applyRestore(v.backup, 'replace');
    const doc = (await repo.listDocuments())[0];
    expect(doc.clientName).toBe('Original Name'); // snapshot preserved
    expect((await repo.listClients())[0].name).toBe('Renamed');
  });
});
