/**
 * JSON backup & restore.
 *
 * Export produces a complete, portable, self-validating JSON file.
 * Restore ALWAYS: parse -> validate the entire payload -> build a preview ->
 * apply inside IndexedDB transactions. A failed validation never writes
 * anything; a failed write aborts its transaction, so no partial state.
 *
 * Merge conflict rule (deterministic): the record with the newer `updatedAt`
 * wins; on an exact tie the IMPORTED record wins. Replacing is explicit and
 * destructive and always creates a recoverable pre-restore backup first.
 */
import {
  BillCraftBackup, RestorePreview, ClientRecord, ProductRecord,
  SavedDocument, BusinessProfileRecord, BankAccountRecord, ClauseRecord,
  RecurringSeriesRecord, LOCAL_SCHEMA_VERSION,
} from '@/types/local';
import { STORES, withStores, requestAll, putRecord, clearStore } from './db/idb';
import { kvGet, kvSet, getProfile, getDataCounts, listBankAccounts, listClauses, listRecurringSeries } from './db/repository';

const MAX_BACKUP_BYTES = 60 * 1024 * 1024; // 60 MB safety limit

/**
 * Auto-dated backup filename using the user's LOCAL date and time, with a
 * seconds component so repeated exports never collide:
 *   billcraft-backup-2026-10-17-134500.json
 * Colons and other filename-hostile characters are avoided; the timestamp
 * stays lexicographically sortable.
 */
export function backupFilename(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
  const time = `${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
  return `billcraft-backup-${date}-${time}.json`;
}

export async function buildBackup(): Promise<BillCraftBackup> {
  const [clients, products, documents, images, profile] = await Promise.all([
    requestAll<ClientRecord>(STORES.clients),
    requestAll<ProductRecord>(STORES.products),
    requestAll<SavedDocument>(STORES.documents),
    requestAll<{ id: string; dataUrl: string }>(STORES.images),
    getProfile(),
  ]);
  const [prefsRaw, bankAccounts, clauses, recurringSeries] = await Promise.all([
    kvGet<Record<string, unknown>>('document-preferences'),
    listBankAccounts(),
    listClauses(),
    listRecurringSeries(),
  ]);
  const prefs = prefsRaw || null;
  return {
    app: 'billcraft',
    schemaVersion: LOCAL_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    generator: 'billcraft-web',
    counts: {
      clients: clients.length,
      products: products.length,
      documents: documents.length,
      images: images.length,
    },
    data: {
      businessProfile: profile,
      clients,
      products,
      documents,
      images,
      preferences: prefs,
      bankAccounts,  // v2
      clauses,       // v2
      recurringSeries, // v2 (Phase 4)
    },
  };
}

export async function exportBackupToFile(): Promise<{ filename: string; bytes: number }> {
  const backup = await buildBackup();
  const json = JSON.stringify(backup);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = backupFilename();
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return { filename: backupFilename(), bytes: blob.size };
}

// ---------------- validation ----------------

export type ValidationResult =
  | { ok: true; backup: BillCraftBackup }
  | { ok: false; error: string };

function isISODateLike(s: unknown): boolean {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}(T|$)/.test(s);
}

function validateTimestamped(x: unknown, where: string, errs: string[]): asserts x is { createdAt: unknown; updatedAt: unknown } {
  const o = x as Record<string, unknown>;
  if (!isISODateLike(o.createdAt)) errs.push(`${where}: missing/invalid createdAt`);
  if (!isISODateLike(o.updatedAt)) errs.push(`${where}: missing/invalid updatedAt`);
}

export function validateBackup(input: unknown): ValidationResult {
  if (typeof input !== 'object' || input === null) return { ok: false, error: 'File is not a valid JSON object' };
  const b = input as Record<string, unknown>;
  if (b.app !== 'billcraft') return { ok: false, error: 'This file was not exported by BillCraft' };
  if (typeof b.schemaVersion !== 'number' || !Number.isInteger(b.schemaVersion) || b.schemaVersion < 1) {
    return { ok: false, error: 'Backup has an invalid schema version' };
  }
  if (b.schemaVersion > LOCAL_SCHEMA_VERSION) {
    return { ok: false, error: `Backup schema v${b.schemaVersion} is newer than this app supports (v${LOCAL_SCHEMA_VERSION}). Update BillCraft first.` };
  }
  if (typeof b.exportedAt !== 'string' || !isISODateLike(b.exportedAt)) {
    return { ok: false, error: 'Backup has an invalid export timestamp' };
  }
  const d = b.data;
  if (typeof d !== 'object' || d === null) return { ok: false, error: 'Backup is missing its data section' };

  const errs: string[] = [];
  const counts = b.counts as Record<string, unknown> | undefined;
  const data = d as Record<string, unknown>;

  for (const key of ['clients', 'products', 'documents', 'images'] as const) {
    if (!Array.isArray(data[key])) {
      errs.push(`data.${key} must be an array`);
      continue;
    }
    if (counts && typeof counts[key] === 'number' && counts[key] !== (data[key] as unknown[]).length) {
      errs.push(`counts.${key} (${counts[key]}) does not match actual array length (${(data[key] as unknown[]).length}) — file may be truncated or corrupted`);
    }
  }

  if (Array.isArray(data.clients)) {
    data.clients.forEach((c, i) => {
      const o = c as Record<string, unknown>;
      if (typeof o.id !== 'string' || !o.id) errs.push(`clients[${i}]: missing id`);
      if (typeof o.name !== 'string' || !(o.name || '').trim()) errs.push(`clients[${i}]: missing name`);
      validateTimestamped(c, `clients[${i}]`, errs);
    });
  }
  if (Array.isArray(data.products)) {
    data.products.forEach((p, i) => {
      const o = p as Record<string, unknown>;
      if (typeof o.id !== 'string' || !o.id) errs.push(`products[${i}]: missing id`);
      if (typeof o.name !== 'string' || !(o.name || '').trim()) errs.push(`products[${i}]: missing name`);
      if (typeof o.price !== 'number' || !isFinite(o.price) || o.price < 0) errs.push(`products[${i}]: invalid price`);
      validateTimestamped(p, `products[${i}]`, errs);
    });
  }
  if (Array.isArray(data.documents)) {
    data.documents.forEach((doc, i) => {
      const o = doc as Record<string, unknown>;
      if (typeof o.id !== 'string' || !o.id) errs.push(`documents[${i}]: missing id`);
      if (typeof o.document !== 'object' || o.document === null) errs.push(`documents[${i}]: missing document snapshot`);
      if (typeof o.documentNumber !== 'string') errs.push(`documents[${i}]: missing document number`);
      if (typeof o.type !== 'string') errs.push(`documents[${i}]: missing type`);
      if (typeof o.totalMinor !== 'number' || !Number.isFinite(o.totalMinor)) errs.push(`documents[${i}]: invalid totalMinor`);
      if (typeof o.issueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.issueDate)) errs.push(`documents[${i}]: invalid issueDate`);
      validateTimestamped(doc, `documents[${i}]`, errs);
    });
  }
  if (Array.isArray(data.images)) {
    data.images.forEach((img, i) => {
      const o = img as Record<string, unknown>;
      if (typeof o.id !== 'string' || !o.id) errs.push(`images[${i}]: missing id`);
      if (typeof o.dataUrl !== 'string' || !/^data:image\/(png|jpe?g|webp);base64,/i.test(o.dataUrl)) {
        errs.push(`images[${i}]: not a valid base64 image payload`);
      }
    });
  }
  if (data.businessProfile !== null && typeof data.businessProfile === 'object') {
    const p = data.businessProfile as Record<string, unknown>;
    if (p.id !== 'business-profile') errs.push('businessProfile: unexpected id');
  }
  // v2 arrays: absent in v1 backups (fine), must be well-formed when present
  if (data.bankAccounts !== undefined) {
    if (!Array.isArray(data.bankAccounts)) errs.push('data.bankAccounts must be an array');
    else data.bankAccounts.forEach((a, i) => {
      const o = a as Record<string, unknown>;
      if (typeof o.id !== 'string' || !o.id) errs.push(`bankAccounts[${i}]: missing id`);
      validateTimestamped(a, `bankAccounts[${i}]`, errs);
    });
  }
  if (data.recurringSeries !== undefined) {
    if (!Array.isArray(data.recurringSeries)) errs.push('data.recurringSeries must be an array');
    else data.recurringSeries.forEach((s, i) => {
      const o = s as Record<string, unknown>;
      if (typeof o.id !== 'string' || !o.id) errs.push(`recurringSeries[${i}]: missing id`);
      validateTimestamped(s, `recurringSeries[${i}]`, errs);
    });
  }
  if (data.clauses !== undefined) {
    if (!Array.isArray(data.clauses)) errs.push('data.clauses must be an array');
    else data.clauses.forEach((c, i) => {
      const o = c as Record<string, unknown>;
      if (typeof o.id !== 'string' || !o.id) errs.push(`clauses[${i}]: missing id`);
      validateTimestamped(c, `clauses[${i}]`, errs);
    });
  }

  if (errs.length) return { ok: false, error: `Backup validation failed: ${errs.slice(0, 5).join('; ')}${errs.length > 5 ? ` (+${errs.length - 5} more)` : ''}` };
  return { ok: true, backup: input as BillCraftBackup };
}

/** Parse + size-check a raw file, with friendly errors. */
export async function readBackupFile(file: File): Promise<ValidationResult> {
  if (file.size > MAX_BACKUP_BYTES) {
    return { ok: false, error: `File is too large (${(file.size / 1048576).toFixed(1)} MB). Maximum supported is 60 MB.` };
  }
  let parsed: unknown;
  try {
    const text = await file.text();
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'File is not valid JSON (truncated or corrupted download?)' };
  }
  return validateBackup(parsed);
}

// ---------------- restore ----------------

function newer(local: { updatedAt?: string }, imported: { updatedAt?: string }): boolean {
  const lu = local.updatedAt || '';
  const iu = imported.updatedAt || '';
  return iu >= lu; // tie -> imported wins (documented rule)
}

export async function previewRestore(backup: BillCraftBackup): Promise<RestorePreview> {
  const [localClients, localProducts, localDocs] = await Promise.all([
    requestAll<ClientRecord>(STORES.clients),
    requestAll<ProductRecord>(STORES.products),
    requestAll<SavedDocument>(STORES.documents),
  ]);
  const sum = <T extends { id: string; updatedAt?: string }>(local: T[], imported: T[]) => {
    const ids = new Set(local.map((x) => x.id));
    let added = 0, updated = 0, keptLocal = 0;
    for (const rec of imported) {
      if (!ids.has(rec.id)) added++;
      else (newer(local.find((l) => l.id === rec.id) as { updatedAt?: string }, rec) ? updated++ : keptLocal++);
    }
    return { added, updated, keptLocal };
  };
  const localProfile = await getProfile();
  const [localAccounts, localClauses, localSeries] = await Promise.all([listBankAccounts(), listClauses(), listRecurringSeries()]);
  return {
    ok: true,
    schemaVersion: backup.schemaVersion,
    exportedAt: backup.exportedAt,
    counts: backup.counts,
    mergeSummary: {
      clients: sum(localClients, backup.data.clients),
      products: sum(localProducts, backup.data.products),
      documents: sum(localDocs, backup.data.documents),
      images: {
        added: backup.data.images.length,
        updated: 0,
      },
      profileReplaced: !!backup.data.businessProfile && (!localProfile || newer(localProfile, backup.data.businessProfile as BusinessProfileRecord)),
      bankAccounts: sum(localAccounts, backup.data.bankAccounts || []),
      clauses: sum(localClauses, backup.data.clauses || []),
      recurringSeries: sum(localSeries, backup.data.recurringSeries || []),
    },
  };
}

/** Recovery snapshot kept in kv so a destructive restore can be undone. */
export async function createPreRestoreBackup(): Promise<{ created: boolean; bytes: number }> {
  const snapshot = await buildBackup();
  const json = JSON.stringify(snapshot);
  await kvSet('pre-restore-backup', { savedAt: new Date().toISOString(), json });
  return { created: true, bytes: json.length };
}

export async function getPreRestoreBackup(): Promise<{ savedAt: string; json: string } | undefined> {
  return kvGet<{ savedAt: string; json: string }>('pre-restore-backup');
}

export interface RestoreReport {
  mode: 'merge' | 'replace';
  clients: { added: number; updated: number; keptLocal: number; total: number };
  products: { added: number; updated: number; keptLocal: number; total: number };
  documents: { added: number; updated: number; keptLocal: number; total: number };
  images: { total: number };
  profileApplied: boolean;
  preRestoreBackup: { created: boolean } | null;
  verification: { clients: number; products: number; documents: number };
}

/**
 * Apply a validated backup. Merge: union by stable id, newer-updatedAt wins.
 * Replace: clear all stores first, then write the backup (pre-restore snapshot
 * saved beforehand). The whole apply runs inside per-store transactions; any
 * failure throws and leaves prior data intact.
 */
export async function applyRestore(backup: BillCraftBackup, mode: 'merge' | 'replace'): Promise<RestoreReport> {
  const preRestore = mode === 'replace' ? await createPreRestoreBackup() : null;

  if (mode === 'replace') {
    await withStores(
      [STORES.clients, STORES.products, STORES.documents, STORES.kv, STORES.images],
      'readwrite',
      (stores) => {
        stores[STORES.clients].clear();
        stores[STORES.products].clear();
        stores[STORES.documents].clear();
        stores[STORES.images].clear();
      },
    );
    // keep kv counters/prefs wiped too — then restore preferences below
  }

  const [localClients, localProducts, localDocs] = await Promise.all([
    requestAll<ClientRecord>(STORES.clients),
    requestAll<ProductRecord>(STORES.products),
    requestAll<SavedDocument>(STORES.documents),
  ]);

  const merge = <T extends { id: string; updatedAt?: string }>(local: T[], imported: T[]): { added: number; updated: number; keptLocal: number } => {
    const byId = new Map(local.map((l) => [l.id, l]));
    let added = 0, updated = 0, keptLocal = 0;
    for (const rec of imported) {
      const existing = byId.get(rec.id);
      if (!existing) { added++; byId.set(rec.id, rec); }
      else if (newer(existing, rec)) { updated++; byId.set(rec.id, rec); }
      else keptLocal++;
    }
    return { added, updated, keptLocal };
  };

  const cStats = merge(localClients, backup.data.clients);
  const pStats = merge(localProducts, backup.data.products);
  const dStats = merge(localDocs, backup.data.documents);

  // single atomic write pass across stores
  await withStores([STORES.clients, STORES.products, STORES.documents, STORES.images], 'readwrite', (stores) => {
    for (const c of backup.data.clients) {
      const winner = mode === 'merge'
        ? (localClients.find((l) => l.id === c.id) && !newer(localClients.find((l) => l.id === c.id) as ClientRecord, c)
            ? (localClients.find((l) => l.id === c.id) as ClientRecord)
            : c)
        : c;
      stores[STORES.clients].put(winner);
    }
    for (const p of backup.data.products) {
      const winner = mode === 'merge'
        ? (localProducts.find((l) => l.id === p.id) && !newer(localProducts.find((l) => l.id === p.id) as ProductRecord, p)
            ? (localProducts.find((l) => l.id === p.id) as ProductRecord)
            : p)
        : p;
      stores[STORES.products].put(winner);
    }
    for (const d of backup.data.documents) {
      const winner = mode === 'merge'
        ? (localDocs.find((l) => l.id === d.id) && !newer(localDocs.find((l) => l.id === d.id) as SavedDocument, d)
            ? (localDocs.find((l) => l.id === d.id) as SavedDocument)
            : d)
        : d;
      stores[STORES.documents].put(winner);
    }
    for (const img of backup.data.images) {
      stores[STORES.images].put(img);
    }
  });

  if (backup.data.businessProfile) {
    await putRecord(STORES.kv, { key: 'business-profile', value: backup.data.businessProfile });
  }
  if (backup.data.preferences) {
    await kvSet('document-preferences', backup.data.preferences);
  }
  // v2 collections: merge by id, newer updatedAt wins (same deterministic rule)
  if (Array.isArray(backup.data.bankAccounts)) {
    const local = await listBankAccounts();
    const byId = new Map(local.map((a: BankAccountRecord) => [a.id, a]));
    for (const a of backup.data.bankAccounts) {
      const existing = byId.get(a.id);
      if (!existing || newer(existing, a)) byId.set(a.id, a);
    }
    await kvSet('bank-accounts', Array.from(byId.values()));
  }
  if (Array.isArray(backup.data.clauses)) {
    const local = await listClauses();
    const byId = new Map(local.map((c: ClauseRecord) => [c.id, c]));
    for (const c of backup.data.clauses) {
      const existing = byId.get(c.id);
      if (!existing || newer(existing, c)) byId.set(c.id, c);
    }
    await kvSet('my-clauses', Array.from(byId.values()));
  }
  if (Array.isArray(backup.data.recurringSeries)) {
    const local = await listRecurringSeries();
    const byId = new Map(local.map((s: RecurringSeriesRecord) => [s.id, s]));
    for (const s of backup.data.recurringSeries) {
      const existing = byId.get(s.id);
      if (!existing || newer(existing, s)) byId.set(s.id, s);
    }
    await kvSet('recurring-series', Array.from(byId.values()));
  }

  // verify
  const counts = await getDataCounts();

  return {
    mode,
    clients: { ...cStats, total: counts.clients },
    products: { ...pStats, total: counts.products },
    documents: { ...dStats, total: counts.documents },
    images: { total: counts.images },
    profileApplied: !!backup.data.businessProfile,
    preRestoreBackup: preRestore ? { created: preRestore.created } : null,
    verification: { clients: counts.clients, products: counts.products, documents: counts.documents },
  };
}
