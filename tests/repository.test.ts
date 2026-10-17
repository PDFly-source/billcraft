import { describe, test, expect, beforeEach } from 'bun:test';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { resetForTests } from '../lib/db/idb';
import * as repo from '../lib/db/repository';

const freshDB = async () => {
  globalThis.indexedDB = new IDBFactory() as unknown as IDBFactory & typeof indexedDB;
  resetForTests();
};

beforeEach(freshDB);

describe('client CRUD + persistence', () => {
  test('create, read, update, delete; persists across "reopen"', async () => {
    const c = await repo.saveClient({ name: 'Acme Traders', phone: '9876543210', gstin: '27AABCU9603R1ZM', email: 'a@b.com' });
    expect(c.id).toBeTruthy();

    const again = await repo.saveClient({ id: c.id, name: 'Acme Traders Pvt Ltd' });
    expect(again.id).toBe(c.id);
    expect(again.gstin).toBe('27AABCU9603R1ZM'); // untouched fields preserved
    expect(again.phone).toBe('9876543210');

    let all = await repo.listClients();
    expect(all.map((x) => x.name)).toEqual(['Acme Traders Pvt Ltd']);

    // simulate browser restart: new IDB factory would be a real reopen; here verify the same DB still has it
    const got = await repo.getClient(c.id);
    expect(got?.name).toBe('Acme Traders Pvt Ltd');

    await repo.deleteClient(c.id);
    all = await repo.listClients();
    expect(all).toHaveLength(0);
  });

  test('search by name, phone, email, GSTIN', async () => {
    await repo.saveClient({ name: 'Zeta Corp', phone: '1111111111', email: 'z@x.io', gstin: '29AAAAA0000A1Z5' });
    await repo.saveClient({ name: 'Alpha Retail', phone: '2222222222', email: 'alpha@x.io' });
    const all = await repo.listClients();
    expect(repo.searchClients(all, 'alpha')).toHaveLength(1);
    expect(repo.searchClients(all, '2222222')).toHaveLength(1);
    expect(repo.searchClients(all, 'z@x.io')).toHaveLength(1);
    expect(repo.searchClients(all, '29aaaaa')).toHaveLength(1);
    expect(repo.searchClients(all, '')).toHaveLength(2);
  });

  test('duplicate guard: same name or same GSTIN', async () => {
    await repo.saveClient({ name: 'Acme', gstin: '27AABCU9603R1ZM' });
    const all = await repo.listClients();
    expect(repo.findDuplicateClient(all, { name: ' acme ' })).toBeTruthy();
    expect(repo.findDuplicateClient(all, { name: 'Other', gstin: '27aabcu9603r1zm' })).toBeTruthy();
    expect(repo.findDuplicateClient(all, { name: 'Other', gstin: '' })).toBeUndefined();
  });

  test('sorts by name', async () => {
    await repo.saveClient({ name: 'Bravo' });
    await repo.saveClient({ name: 'Alpha' });
    const all = await repo.listClients();
    expect(all.map((c) => c.name)).toEqual(['Alpha', 'Bravo']);
  });
});

describe('product catalogue', () => {
  test('CRUD + search + exact priceMinor', async () => {
    const p = await repo.saveProduct({ name: 'Consulting', sku: 'SRV-01', unit: 'hr', price: 123.456, taxRate: 18, hsn: '998314' });
    expect(p.priceMinor).toBe(12346); // rounded once to paise
    const got = await repo.getProduct(p.id);
    expect(got?.sku).toBe('SRV-01');
    await repo.saveProduct({ id: p.id, price: -50 });
    const after = await repo.getProduct(p.id);
    expect(after?.price).toBe(0); // negative prices rejected
    const all = await repo.listProducts();
    expect(repo.searchProducts(all, 'srv')).toHaveLength(1);
    expect(repo.searchProducts(all, '998314')).toHaveLength(1);
    await repo.deleteProduct(p.id);
    expect(await repo.listProducts()).toHaveLength(0);
  });
});

describe('document history + payments', () => {
  const base = (over: Record<string, unknown>) => ({
    type: 'invoice', documentNumber: 'INV-2026-0001',
    document: { id: 'x', type: 'invoice' } as never,
    calc: {} as never, status: 'unpaid', payments: [],
    clientId: null, clientName: 'Acme', issueDate: '2026-10-16', dueDate: '2026-10-30',
    totalMinor: 100000, amountPaidMinor: 0, convertedFromId: null, convertedToId: null, ...over,
  });

  test('save, reopen, edit — historical snapshot preserved', async () => {
    const d = await repo.saveDocument(base({}) as never);
    await repo.saveClient({ name: 'Renamed Client' }); // unrelated client edit
    const got = await repo.getDocument(d.id);
    expect(got?.clientName).toBe('Acme'); // snapshot NOT rewritten
    await repo.saveDocument({ ...got, status: 'partial' } as never);
    const again = await repo.getDocument(d.id);
    expect(again?.status).toBe('partial');
    expect(again?.createdAt).toBe(d.createdAt); // createdAt stable
  });

  test('payments update status and balance accurately', async () => {
    const d = await repo.saveDocument(base({}) as never);
    const p1 = await repo.addPayment(d.id, { date: '2026-10-17', amount: 400.55, amountMinor: 40055, method: 'upi', note: '' });
    expect(p1.status).toBe('partial');
    expect(p1.amountPaidMinor).toBe(40055);
    const p2 = await repo.addPayment(d.id, { date: '2026-10-18', amount: 599.45, amountMinor: 59945, method: 'cash', note: '' });
    expect(p2.status).toBe('paid'); // 100000 paise reached exactly
    const noMore = await repo.addPayment(d.id, { date: '2026-10-19', amount: 1, amountMinor: 100, method: 'cash', note: '' });
    expect(noMore.status).toBe('paid');
    expect(noMore.amountPaidMinor).toBe(100100); // repo does not reject overpay — UI validates via validatePayment
    const removed = await repo.deletePayment(noMore.id, noMore.payments[noMore.payments.length - 1].id);
    expect(removed.status).toBe('paid');
    expect(removed.amountPaidMinor).toBe(100000);
  });
});

describe('numbering', () => {
  test('sequential per type, honors profile start number', async () => {
    const n1 = await repo.nextDocumentNumber('invoice');
    const n2 = await repo.nextDocumentNumber('invoice');
    expect(n2 > n1).toBe(true);
    expect(n1).toMatch(/^INV-\d{4}-\d{4}$/);
    const q1 = await repo.nextDocumentNumber('quotation');
    expect(q1.startsWith('QUO-')).toBe(true);

    await repo.saveProfile({ ...repo.DEFAULT_PROFILE, invoiceStartNumber: 50 });
    const n50 = await repo.nextDocumentNumber('invoice');
    expect(n50).toMatch(/-(0050|0051)$/);
  });
});

describe('drafts, images, kv, data management', () => {
  test('draft save, read, clear', async () => {
    await repo.saveDraft({ revision: 3, savedAt: new Date().toISOString(), document: { id: 'd' } as never, hasStartedEditing: true });
    const got = await repo.getDraft();
    expect(got?.revision).toBe(3);
    await repo.clearDraft();
    expect(await repo.getDraft()).toBeUndefined();
  });

  test('images stored in IDB, not localStorage', async () => {
    await repo.saveImage('logo1', 'data:image/png;base64,AAAA');
    expect(await repo.getImage('logo1')).toBe('data:image/png;base64,AAAA');
    await repo.deleteImage('logo1');
    expect(await repo.getImage('logo1')).toBeUndefined();
  });

  test('counts + clearCategory + clearAllData', async () => {
    await repo.saveClient({ name: 'A' });
    await repo.saveProduct({ name: 'P' });
    await repo.saveDocument({ type: 'invoice', documentNumber: 'X', document: {} as never, calc: {} as never, status: 'unpaid', payments: [], clientId: null, clientName: 'A', issueDate: '2026-10-16', dueDate: '', totalMinor: 0, amountPaidMinor: 0, convertedFromId: null, convertedToId: null } as never);
    let counts = await repo.getDataCounts();
    expect(counts).toEqual({ clients: 1, products: 1, documents: 1, images: 0 });
    await repo.clearCategory('clients');
    counts = await repo.getDataCounts();
    expect(counts.clients).toBe(0);
    expect(counts.documents).toBe(1); // documents untouched
    await repo.clearAllData();
    counts = await repo.getDataCounts();
    expect(counts).toEqual({ clients: 0, products: 0, documents: 0, images: 0 });
  });
});

describe('Phase 3: bank accounts & my clauses (kv collections)', () => {
  test('bank account save, list, update, delete', async () => {
    const a = await repo.saveBankAccount({ nickname: 'HDFC Current', bankName: 'HDFC', accountNumber: '123456', ifsc: 'hdfc0001234' });
    expect(a.ifsc).toBe('HDFC0001234');
    const b = await repo.saveBankAccount({ nickname: 'ICICI' });
    expect((await repo.listBankAccounts()).length).toBe(2);

    const upd = await repo.saveBankAccount({ id: a.id, nickname: 'HDFC Main' });
    expect(upd.nickname).toBe('HDFC Main');
    expect(upd.createdAt).toBe(a.createdAt); // created stamp stable across updates
    expect((await repo.listBankAccounts()).length).toBe(2);

    await repo.deleteBankAccount(b.id);
    expect((await repo.listBankAccounts()).map((x) => x.id)).toEqual([a.id]);
  });

  test('clause save, list, update, delete', async () => {
    const c = await repo.saveClause({ title: 'Late payment', text: '1.5% monthly interest after due date.' });
    expect((await repo.listClauses()).length).toBe(1);
    const upd = await repo.saveClause({ id: c.id, title: 'Late payment policy', text: '2% after due date.' });
    expect(upd.title).toBe('Late payment policy');
    await repo.deleteClause(c.id);
    expect((await repo.listClauses()).length).toBe(0);
  });
});

describe('Phase 3: draft save revision guard (out-of-order writes)', () => {
  test('a stale lower-revision write never clobbers a newer draft', async () => {
    const mk = (revision: number) => ({ revision, savedAt: new Date().toISOString(), hasStartedEditing: true } as Parameters<typeof repo.saveDraft>[0]);
    expect(await repo.saveDraft(mk(3))).toBe(true);
    // an in-flight older write resolves late — it must be rejected
    expect(await repo.saveDraft(mk(2))).toBe(false);
    const d = await repo.getDraft();
    expect(d?.revision).toBe(3);
    // a newer write still applies
    expect(await repo.saveDraft(mk(4))).toBe(true);
    expect((await repo.getDraft())?.revision).toBe(4);
  });
});
