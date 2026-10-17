/**
 * Repository/service layer for all local data operations.
 * UI components never talk to IndexedDB directly; they use these functions
 * (or the React context in hooks/useLocalData.tsx which wraps them).
 *
 * Search uses a normalized `nameLower` index plus in-memory filtering for
 * phone/email/GSTIN. Records keep stable UUIDs across every operation so
 * merges and relationships (document.clientId) never break.
 */
import {
  ClientRecord, ProductRecord, SavedDocument, BusinessProfileRecord,
  DocumentPreferences, DraftRecord, LOCAL_SCHEMA_VERSION, StorageStatus,
  PaymentRecord, DocumentStatus, BankAccountRecord, ClauseRecord,
} from '@/types/local';
import { STORES, withStores, requestAll, requestByKey, putRecord, deleteRecord, clearStore, countStore, getDB } from './idb';

const norm = (s: string) => (s || '').trim().toLowerCase();

/** Indexed denormalization fields (not part of the public record type). */
type IndexedClient = ClientRecord & { nameLower?: string };
type IndexedProduct = ProductRecord & { nameLower?: string };

export function nowISO(): string { return new Date().toISOString(); }

function withTimestamps<T extends { createdAt?: string; updatedAt?: string }>(rec: T): T {
  const t = nowISO();
  return { ...rec, createdAt: rec.createdAt || t, updatedAt: t } as T;
}

function denormalizeClient(c: ClientRecord): IndexedClient {
  return { ...c, nameLower: norm(c.name) } as IndexedClient;
}
function denormalizeProduct(p: ProductRecord): IndexedProduct {
  return { ...p, nameLower: norm(p.name) } as IndexedProduct;
}

// ---------- Clients ----------

export async function listClients(): Promise<ClientRecord[]> {
  const all = await requestAll<ClientRecord>(STORES.clients);
  return all.sort((a, b) => norm(a.name).localeCompare(norm(b.name)));
}

export async function getClient(id: string): Promise<ClientRecord | undefined> {
  return requestByKey<ClientRecord>(STORES.clients, id);
}

export async function saveClient(input: Partial<ClientRecord> & { id?: string }): Promise<ClientRecord> {
  const existing = input.id ? await getClient(input.id) : undefined;
  const merged = {
    id: existing?.id || input.id || crypto.randomUUID(),
    name: (input.name ?? existing?.name ?? '').trim(),
    contactPerson: input.contactPerson ?? existing?.contactPerson ?? '',
    phone: input.phone ?? existing?.phone ?? '',
    email: input.email ?? existing?.email ?? '',
    billingAddress: input.billingAddress ?? existing?.billingAddress ?? '',
    shippingAddress: input.shippingAddress ?? existing?.shippingAddress ?? '',
    gstin: (input.gstin ?? existing?.gstin ?? '').trim().toUpperCase(),
    state: input.state ?? existing?.state ?? '',
    stateCode: input.stateCode ?? existing?.stateCode ?? '',
    notes: input.notes ?? existing?.notes ?? '',
    createdAt: existing?.createdAt,
  };
  const stamped = withTimestamps(merged) as ClientRecord;
  await putRecord(STORES.clients, denormalizeClient(stamped));
  return stamped;
}

export async function deleteClient(id: string): Promise<void> {
  await deleteRecord(STORES.clients, id);
}

export function searchClients(clients: ClientRecord[], q: string): ClientRecord[] {
  const t = norm(q);
  if (!t) return clients;
  return clients.filter((c) =>
    norm(c.name).includes(t) || norm(c.phone).includes(t) ||
    norm(c.email).includes(t) || norm(c.gstin).includes(t) ||
    norm(c.contactPerson).includes(t)
  );
}

/** Practical duplicate guard: same normalized name, or same GSTIN when both have one. */
export function findDuplicateClient(clients: ClientRecord[], cand: { name: string; gstin?: string }, ignoreId?: string): ClientRecord | undefined {
  return clients.find((c) => c.id !== ignoreId && (
    (cand.gstin && c.gstin && c.gstin === cand.gstin.toUpperCase().trim()) ||
    (norm(c.name) && norm(c.name) === norm(cand.name))
  ));
}

// ---------- Products ----------

export async function listProducts(): Promise<ProductRecord[]> {
  const all = await requestAll<ProductRecord>(STORES.products);
  return all.sort((a, b) => norm(a.name).localeCompare(norm(b.name)));
}

export async function getProduct(id: string): Promise<ProductRecord | undefined> {
  return requestByKey<ProductRecord>(STORES.products, id);
}

export async function saveProduct(input: Partial<ProductRecord> & { id?: string }): Promise<ProductRecord> {
  const existing = input.id ? await getProduct(input.id) : undefined;
  const price = typeof input.price === 'number' && isFinite(input.price) ? Math.max(0, input.price) : (existing?.price ?? 0);
  const merged = {
    id: existing?.id || input.id || crypto.randomUUID(),
    name: (input.name ?? existing?.name ?? '').trim(),
    description: input.description ?? existing?.description ?? '',
    sku: (input.sku ?? existing?.sku ?? '').trim(),
    unit: input.unit ?? existing?.unit ?? 'pcs',
    price,
    priceMinor: Math.round(price * 100),
    taxRate: typeof input.taxRate === 'number' && isFinite(input.taxRate) ? Math.max(0, input.taxRate) : (existing?.taxRate ?? 0),
    hsn: (input.hsn ?? existing?.hsn ?? '').trim(),
    category: input.category ?? existing?.category ?? '',
    createdAt: existing?.createdAt,
  };
  const stamped = withTimestamps(merged) as ProductRecord;
  await putRecord(STORES.products, denormalizeProduct(stamped));
  return stamped;
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteRecord(STORES.products, id);
}

export function searchProducts(products: ProductRecord[], q: string): ProductRecord[] {
  const t = norm(q);
  if (!t) return products;
  return products.filter((p) =>
    norm(p.name).includes(t) || norm(p.sku).includes(t) ||
    norm(p.description).includes(t) || norm(p.hsn).includes(t)
  );
}

// ---------- Documents ----------

export async function listDocuments(): Promise<SavedDocument[]> {
  const all = await requestAll<SavedDocument>(STORES.documents);
  return all.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export async function getDocument(id: string): Promise<SavedDocument | undefined> {
  return requestByKey<SavedDocument>(STORES.documents, id);
}

export function recomputePaid(payments: PaymentRecord[]): number {
  return payments.reduce((sum, p) => sum + (p.amountMinor || 0), 0);
}

export async function saveDocument(doc: Omit<SavedDocument, 'createdAt' | 'updatedAt'> & { createdAt?: string; updatedAt?: string }): Promise<SavedDocument> {
  const existing = doc.id ? await getDocument(doc.id) : undefined;
  const stamped: SavedDocument = withTimestamps({
    ...doc,
    id: doc.id || crypto.randomUUID(),
    createdAt: existing?.createdAt,
  } as SavedDocument);
  stamped.amountPaidMinor = recomputePaid(stamped.payments || []);
  await putRecord(STORES.documents, stamped);
  return stamped;
}

export async function deleteDocument(id: string): Promise<void> {
  await deleteRecord(STORES.documents, id);
}

export async function addPayment(docId: string, payment: Omit<PaymentRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedDocument> {
  const doc = await getDocument(docId);
  if (!doc) throw new Error('Document not found');
  const rec: PaymentRecord = {
    ...payment,
    id: crypto.randomUUID(),
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  const payments = [...(doc.payments || []), rec];
  const paidMinor = recomputePaid(payments);
  let status: DocumentStatus = doc.status;
  if (doc.type === 'invoice') {
    if (doc.status !== 'cancelled') {
      status = paidMinor <= 0 ? 'unpaid' : (paidMinor >= doc.totalMinor ? 'paid' : 'partial');
    }
  }
  return saveDocument({ ...doc, payments, status, amountPaidMinor: paidMinor });
}

export async function deletePayment(docId: string, paymentId: string): Promise<SavedDocument> {
  const doc = await getDocument(docId);
  if (!doc) throw new Error('Document not found');
  const payments = (doc.payments || []).filter((p) => p.id !== paymentId);
  const paidMinor = recomputePaid(payments);
  let status: DocumentStatus = doc.status;
  if (doc.type === 'invoice' && doc.status !== 'cancelled') {
    status = paidMinor <= 0 ? 'unpaid' : (paidMinor >= doc.totalMinor ? 'paid' : 'partial');
  }
  return saveDocument({ ...doc, payments, status, amountPaidMinor: paidMinor });
}

export async function setDocumentStatus(id: string, status: DocumentStatus): Promise<SavedDocument> {
  const doc = await getDocument(id);
  if (!doc) throw new Error('Document not found');
  return saveDocument({ ...doc, status });
}

// ---------- KV (profile, prefs, drafts, counters) ----------

export async function kvGet<T>(key: string): Promise<T | undefined> {
  const row = await requestByKey<{ key: string; value: T }>(STORES.kv, key);
  return row?.value;
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  await putRecord(STORES.kv, { key, value });
}

export async function kvDelete(key: string): Promise<void> {
  await deleteRecord(STORES.kv, key);
}

export const DEFAULT_PROFILE: BusinessProfileRecord = {
  id: 'business-profile',
  businessName: '', ownerName: '', phone: '', email: '', website: '',
  address: '', gstin: '', state: '', stateCode: '', pan: '',
  bankName: '', bankAccountHolder: '', bankAccountNumber: '', bankIfsc: '',
  upiId: '', paymentInstructions: '',
  defaultCurrency: 'INR', defaultGstType: 'cgst_sgst', defaultTaxMode: 'gst',
  invoicePrefix: 'INV', invoiceStartNumber: 1,
  quotationPrefix: 'QUO', receiptPrefix: 'RCP', estimatePrefix: 'EST',
  defaultPaymentTerms: 'Payment due within 15 days',
  defaultFooterNotes: 'Thank you for your business!',
  logoId: null, signatureId: null,
  createdAt: nowISO(), updatedAt: nowISO(),
};

export async function getProfile(): Promise<BusinessProfileRecord | null> {
  return (await kvGet<BusinessProfileRecord>('business-profile')) || null;
}

export async function saveProfile(profile: BusinessProfileRecord): Promise<BusinessProfileRecord> {
  const stamped = withTimestamps(profile);
  await kvSet('business-profile', stamped);
  return stamped;
}

export const DEFAULT_DOC_PREFS: DocumentPreferences = {
  defaultTemplate: 'modern',
  defaultColorTheme: 'plum',
  defaultCustomColor: '',
  defaultFontFamily: 'sans',
  watermark: { enabled: false, text: '', opacity: 0.08, position: 'center', rotation: -30, source: 'text' },
  density: 'normal',
  showBranding: true,
  autoRoundOff: true,
};

export async function getDocPrefs(): Promise<DocumentPreferences> {
  const saved = await kvGet<Partial<DocumentPreferences>>('document-preferences');
  return { ...DEFAULT_DOC_PREFS, ...(saved || {}) };
}

export async function saveDocPrefs(prefs: DocumentPreferences): Promise<void> {
  await kvSet('document-preferences', prefs);
}

// ---------- Drafts ----------

export async function getDraft(): Promise<DraftRecord | undefined> {
  return kvGet<DraftRecord>('editor-draft');
}

/**
 * Save the draft with an out-of-order guard: if a NEWER revision is already
 * persisted (an in-flight older write resolves late), the stale write is
 * skipped so it can never clobber the newer draft.
 */
export async function saveDraft(draft: DraftRecord): Promise<boolean> {
  const existing = await kvGet<DraftRecord>('editor-draft');
  if (existing && Number.isFinite(existing.revision) && existing.revision > draft.revision) {
    return false; // stale write rejected
  }
  await kvSet('editor-draft', draft);
  return true;
}

export async function clearDraft(): Promise<void> {
  await kvDelete('editor-draft');
}

// ---------- Bank accounts (Phase 3: multiple accounts) ----------

export async function listBankAccounts(): Promise<BankAccountRecord[]> {
  const list = await kvGet<BankAccountRecord[]>('bank-accounts');
  return Array.isArray(list) ? list : [];
}

export async function saveBankAccount(input: Partial<BankAccountRecord> & { id?: string }): Promise<BankAccountRecord> {
  const list = await listBankAccounts();
  const existing = input.id ? list.find((a) => a.id === input.id) : undefined;
  const rec: BankAccountRecord = {
    id: existing?.id || input.id || crypto.randomUUID(),
    nickname: (input.nickname ?? existing?.nickname ?? 'My Account').trim() || 'My Account',
    accountHolder: input.accountHolder ?? existing?.accountHolder ?? '',
    bankName: input.bankName ?? existing?.bankName ?? '',
    accountNumber: input.accountNumber ?? existing?.accountNumber ?? '',
    ifsc: (input.ifsc ?? existing?.ifsc ?? '').toString().toUpperCase(),
    branch: input.branch ?? existing?.branch ?? '',
    paymentInstructions: input.paymentInstructions ?? existing?.paymentInstructions ?? '',
    createdAt: existing?.createdAt || '',
    updatedAt: '',
  };
  const stamped = withTimestamps(rec) as BankAccountRecord;
  const next = existing ? list.map((a) => (a.id === stamped.id ? stamped : a)) : [...list, stamped];
  await kvSet('bank-accounts', next);
  return stamped;
}

export async function deleteBankAccount(id: string): Promise<void> {
  const list = await listBankAccounts();
  await kvSet('bank-accounts', list.filter((a) => a.id !== id));
}

// ---------- My Clauses (Phase 3: reusable custom clauses) ----------

export async function listClauses(): Promise<ClauseRecord[]> {
  const list = await kvGet<ClauseRecord[]>('my-clauses');
  return Array.isArray(list) ? list : [];
}

export async function saveClause(input: Partial<ClauseRecord> & { id?: string }): Promise<ClauseRecord> {
  const list = await listClauses();
  const existing = input.id ? list.find((c) => c.id === input.id) : undefined;
  const title = (input.title ?? existing?.title ?? '').trim();
  const text = (input.text ?? existing?.text ?? '').trim();
  const rec: ClauseRecord = {
    id: existing?.id || input.id || crypto.randomUUID(),
    title: title || 'Untitled clause',
    text,
    createdAt: existing?.createdAt || '',
    updatedAt: '',
  };
  const stamped = withTimestamps(rec) as ClauseRecord;
  const next = existing ? list.map((c) => (c.id === stamped.id ? stamped : c)) : [...list, stamped];
  await kvSet('my-clauses', next);
  return stamped;
}

export async function deleteClause(id: string): Promise<void> {
  const list = await listClauses();
  await kvSet('my-clauses', list.filter((c) => c.id !== id));
}

// ---------- Images ----------

export async function saveImage(id: string, dataUrl: string): Promise<void> {
  await putRecord(STORES.images, { id, dataUrl });
}

export async function getImage(id: string): Promise<string | undefined> {
  const row = await requestByKey<{ id: string; dataUrl: string }>(STORES.images, id);
  return row?.dataUrl;
}

export async function deleteImage(id: string): Promise<void> {
  await deleteRecord(STORES.images, id);
}

// ---------- Numbering ----------

const prefixFor = (type: string, profile: BusinessProfileRecord): string => {
  switch (type) {
    case 'invoice': return profile.invoicePrefix || 'INV';
    case 'quotation': return profile.quotationPrefix || 'QUO';
    case 'receipt': return profile.receiptPrefix || 'RCP';
    case 'estimate': return profile.estimatePrefix || 'EST';
    case 'proforma': return 'PI';
    case 'purchase_order': return 'PO';
    case 'delivery_challan': return 'CHN';
    case 'credit_note': return 'CRN';
    case 'debit_note': return 'DBN';
    default: return 'DOC';
  }
};

/**
 * Deterministic document numbering: reads the per-type counter, ensures it is
 * at least the profile's starting number, bumps it atomically enough for a
 * single-user local app, and returns e.g. INV-2026-0007.
 */
export async function nextDocumentNumber(type: string): Promise<string> {
  const profile = (await getProfile()) || DEFAULT_PROFILE;
  const key = `counter:${type}`;
  const current = (await kvGet<number>(key)) ?? 0;
  const start = type === 'invoice' ? Math.max(1, profile.invoiceStartNumber || 1) : 1;
  const next = Math.max(current + 1, start);
  await kvSet(key, next);
  const year = new Date().getFullYear();
  return `${prefixFor(type, profile)}-${year}-${String(next).padStart(4, '0')}`;
}

// ---------- Storage status ----------

export async function getStorageStatus(): Promise<StorageStatus> {
  try {
    await getDB(); // throws if unavailable
    let usage: number | null = null;
    let quota: number | null = null;
    if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
      try {
        const est = await navigator.storage.estimate();
        usage = est.usage ?? null;
        quota = est.quota ?? null;
      } catch { /* estimates unsupported — leave null */ }
    }
    return { available: true, error: null, usage, quota };
  } catch (err) {
    return { available: false, error: err instanceof Error ? err.message : String(err), usage: null, quota: null };
  }
}

// ---------- Data management ----------

export interface DataCounts { clients: number; products: number; documents: number; images: number; }

export async function getDataCounts(): Promise<DataCounts> {
  await getDB();
  const [clients, products, documents, images] = await Promise.all([
    countStore(STORES.clients), countStore(STORES.products),
    countStore(STORES.documents), countStore(STORES.images),
  ]);
  return { clients, products, documents, images };
}

export async function clearCategory(category: 'clients' | 'products' | 'documents' | 'images'): Promise<void> {
  await clearStore(STORES[category]);
}

/** Clear ALL BillCraft application data (documents, clients, products, kv, images). */
export async function clearAllData(): Promise<void> {
  await withStores([STORES.clients, STORES.products, STORES.documents, STORES.kv, STORES.images], 'readwrite', (stores) => {
    stores[STORES.clients].clear();
    stores[STORES.products].clear();
    stores[STORES.documents].clear();
    stores[STORES.kv].clear();
    stores[STORES.images].clear();
  });
}

export { LOCAL_SCHEMA_VERSION };
