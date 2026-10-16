'use client';

/**
 * Central local-data context. Every screen reads/writes local business data
 * through this provider (repository/service pattern from Feature 14) so no
 * business logic is duplicated across components.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ClientRecord, ProductRecord, SavedDocument, BusinessProfileRecord,
  DocumentPreferences, PaymentRecord, DocumentStatus, DataCounts, StorageStatus,
} from '@/types/local';
import * as repo from '@/lib/db/repository';
import { buildDashboard, DashboardSummary } from '@/lib/finance';

interface LocalDataState {
  ready: boolean;
  storageError: string | null;
  clients: ClientRecord[];
  products: ProductRecord[];
  documents: SavedDocument[];
  profile: BusinessProfileRecord | null;
  docPrefs: DocumentPreferences;
  dashboard: DashboardSummary;
  counts: DataCounts | null;
  storage: StorageStatus | null;

  // clients
  saveClient: (input: Partial<ClientRecord> & { id?: string }) => Promise<ClientRecord>;
  deleteClient: (id: string) => Promise<void>;
  // products
  saveProduct: (input: Partial<ProductRecord> & { id?: string }) => Promise<ProductRecord>;
  deleteProduct: (id: string) => Promise<void>;
  // documents
  saveDocument: (doc: Parameters<typeof repo.saveDocument>[0]) => Promise<SavedDocument>;
  deleteDocument: (id: string) => Promise<void>;
  setDocumentStatus: (id: string, status: DocumentStatus) => Promise<SavedDocument>;
  addPayment: (docId: string, payment: Omit<PaymentRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<SavedDocument>;
  deletePayment: (docId: string, paymentId: string) => Promise<SavedDocument>;
  // profile + prefs
  saveProfile: (profile: BusinessProfileRecord) => Promise<BusinessProfileRecord>;
  saveDocPrefs: (prefs: DocumentPreferences) => Promise<void>;
  // management
  refresh: () => Promise<void>;
  clearCategory: (category: 'clients' | 'products' | 'documents' | 'images') => Promise<void>;
  clearAllData: () => Promise<void>;
}

const LocalDataContext = createContext<LocalDataState | null>(null);

export const LocalDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [documents, setDocuments] = useState<SavedDocument[]>([]);
  const [profile, setProfile] = useState<BusinessProfileRecord | null>(null);
  const [docPrefs, setDocPrefs] = useState<DocumentPreferences>(repo.DEFAULT_DOC_PREFS);
  const [counts, setCounts] = useState<DataCounts | null>(null);
  const [storage, setStorage] = useState<StorageStatus | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [c, p, d, prof, prefs, cnt, st] = await Promise.all([
        repo.listClients(), repo.listProducts(), repo.listDocuments(),
        repo.getProfile(), repo.getDocPrefs(), repo.getDataCounts(), repo.getStorageStatus(),
      ]);
      setClients(c); setProducts(p); setDocuments(d);
      setProfile(prof); setDocPrefs(prefs); setCounts(cnt); setStorage(st);
      setStorageError(st.available ? null : (st.error || 'IndexedDB is unavailable'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStorageError(msg.includes('IndexedDB') ? msg : `Local storage error: ${msg}`);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  // CRUD wrappers that update state only AFTER the persistent write succeeds
  const wrap = useCallback(
    async (op: () => Promise<unknown>) => {
      await op();
      await refresh();
    },
    [refresh],
  );

  const value = useMemo<LocalDataState>(() => ({
    ready, storageError, clients, products, documents, profile, docPrefs, counts, storage,
    dashboard: buildDashboard(documents),
    saveClient: (input) => wrap(async () => { await repo.saveClient(input); }).then(() => repoLastClient(input)),
    deleteClient: (id) => wrap(async () => { await repo.deleteClient(id); }),
    saveProduct: (input) => wrap(async () => { await repo.saveProduct(input); }).then(() => undefined as unknown as ProductRecord),
    deleteProduct: (id) => wrap(async () => { await repo.deleteProduct(id); }),
    saveDocument: (doc) => wrap(async () => { await repo.saveDocument(doc); }).then(() => repo.getDocument(doc.id || '') as Promise<SavedDocument>),
    deleteDocument: (id) => wrap(async () => { await repo.deleteDocument(id); }),
    setDocumentStatus: (id, status) => wrap(async () => { await repo.setDocumentStatus(id, status); }).then(() => repo.getDocument(id) as Promise<SavedDocument>),
    addPayment: (docId, payment) => wrap(async () => { await repo.addPayment(docId, payment); }).then(() => repo.getDocument(docId) as Promise<SavedDocument>),
    deletePayment: (docId, paymentId) => wrap(async () => { await repo.deletePayment(docId, paymentId); }).then(() => repo.getDocument(docId) as Promise<SavedDocument>),
    saveProfile: (p) => wrap(async () => { await repo.saveProfile(p); }).then(() => p),
    saveDocPrefs: (p) => wrap(async () => { await repo.saveDocPrefs(p); }),
    refresh,
    clearCategory: (cat) => wrap(async () => { await repo.clearCategory(cat); }),
    clearAllData: () => wrap(async () => { await repo.clearAllData(); }),
  }), [ready, storageError, clients, products, documents, profile, docPrefs, counts, storage, wrap, refresh]);

  return <LocalDataContext.Provider value={value}>{children}</LocalDataContext.Provider>;
};

// helper closures that re-fetch the record the wrapper just persisted
async function repoLastClient(input: { id?: string }): Promise<ClientRecord> {
  if (input.id) {
    const c = await repo.getClient(input.id);
    if (c) return c;
  }
  const all = await repo.listClients();
  return all[all.length - 1];
}

export function useLocalData(): LocalDataState {
  const ctx = useContext(LocalDataContext);
  if (!ctx) throw new Error('useLocalData must be used within LocalDataProvider');
  return ctx;
}
