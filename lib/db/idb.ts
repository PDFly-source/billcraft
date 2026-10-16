/**
 * Minimal promise wrapper over IndexedDB with typed error handling.
 * The rest of the app never touches raw IndexedDB APIs; if the browser has
 * no IndexedDB (or access throws), every operation rejects with a
 * StorageUnavailableError so the UI can show an honest banner instead of
 * silently losing data.
 */

export class StorageUnavailableError extends Error {
  constructor(message = 'IndexedDB is not available in this browser') {
    super(message);
    this.name = 'StorageUnavailableError';
  }
}

export class QuotaError extends Error {
  constructor(message = 'Storage quota exceeded') {
    super(message);
    this.name = 'QuotaError';
  }
}

const DB_NAME = 'billcraft-db';
export const DB_VERSION = 1;

export const STORES = {
  clients: 'clients',
  products: 'products',
  documents: 'documents',
  kv: 'kv',           // { key: string, value: unknown }
  images: 'images',   // { id: string, dataUrl: string }
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

let dbPromise: Promise<IDBDatabase> | null = null;
let unavailableReason: string | null = null;

export function isIndexedDBAvailable(): boolean {
  return unavailableReason === null;
}

export function getUnavailableReason(): string | null {
  return unavailableReason;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      unavailableReason = 'IndexedDB is not supported by this browser';
      reject(new StorageUnavailableError(unavailableReason));
      return;
    }
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (err) {
      unavailableReason = 'IndexedDB access was blocked';
      reject(new StorageUnavailableError(unavailableReason));
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      // v1: initial schema. Migrations must stay repeat-safe: only create
      // stores/indexes when missing, never drop or rewrite data.
      if (!db.objectStoreNames.contains(STORES.clients)) {
        const s = db.createObjectStore(STORES.clients, { keyPath: 'id' });
        s.createIndex('nameLower', 'nameLower');
        s.createIndex('gstin', 'gstin');
        s.createIndex('phone', 'phone');
      }
      if (!db.objectStoreNames.contains(STORES.products)) {
        const s = db.createObjectStore(STORES.products, { keyPath: 'id' });
        s.createIndex('nameLower', 'nameLower');
        s.createIndex('sku', 'sku');
      }
      if (!db.objectStoreNames.contains(STORES.documents)) {
        const s = db.createObjectStore(STORES.documents, { keyPath: 'id' });
        s.createIndex('documentNumber', 'documentNumber');
        s.createIndex('type', 'type');
        s.createIndex('issueDate', 'issueDate');
        s.createIndex('clientId', 'clientId');
      }
      if (!db.objectStoreNames.contains(STORES.kv)) {
        db.createObjectStore(STORES.kv, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORES.images)) {
        db.createObjectStore(STORES.images, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      unavailableReason = request.error?.message || 'IndexedDB open failed';
      reject(new StorageUnavailableError(unavailableReason));
    };
    request.onblocked = () => {
      unavailableReason = 'IndexedDB is blocked by another tab';
      reject(new StorageUnavailableError(unavailableReason));
    };
  });
}

export function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = openDatabase().catch((err) => {
      dbPromise = null; // allow retry
      throw err;
    });
  }
  return dbPromise;
}

function txError(err: unknown): Error {
  const e = err instanceof Error ? err : new Error(String(err));
  if (e.name === 'QuotaExceededError') return new QuotaError(e.message);
  return e;
}

export async function withStore<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest | void,
): Promise<T> {
  const db = await getDB();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    let result: T | undefined;
    tx.onabort = () => reject(txError(tx.error));
    tx.onerror = () => reject(txError(tx.error));
    try {
      const req = fn(tx.objectStore(storeName));
      if (req) {
        req.onsuccess = () => {
          result = req.result as T;
        };
      }
    } catch (err) {
      reject(txError(err));
      return;
    }
    tx.oncomplete = () => resolve(result as T);
  });
}

/** Run a multi-store operation in ONE transaction (atomicity across stores). */
export async function withStores<T>(
  storeNames: StoreName[],
  mode: IDBTransactionMode,
  fn: (stores: Record<StoreName, IDBObjectStore>) => IDBRequest | void,
): Promise<T> {
  const db = await getDB();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(Array.from(new Set(storeNames)), mode);
    let result: T | undefined;
    tx.onabort = () => reject(txError(tx.error));
    tx.onerror = () => reject(txError(tx.error));
    try {
      const stores: Record<string, IDBObjectStore> = {};
      for (const s of storeNames) stores[s] = tx.objectStore(s);
      const req = fn(stores as Record<StoreName, IDBObjectStore>);
      if (req) {
        req.onsuccess = () => {
          result = req.result as T;
        };
      }
    } catch (err) {
      reject(txError(err));
      return;
    }
    tx.oncomplete = () => resolve(result as T);
  });
}

export async function requestAll<T>(storeName: StoreName): Promise<T[]> {
  return withStore<T[]>(storeName, 'readonly', (s) => s.getAll());
}

export async function requestByKey<T>(storeName: StoreName, key: IDBValidKey): Promise<T | undefined> {
  return withStore<T | undefined>(storeName, 'readonly', (s) => s.get(key));
}

export async function putRecord<T>(storeName: StoreName, value: T): Promise<void> {
  return withStore<void>(storeName, 'readwrite', (s) => {
    s.put(value as unknown as object);
  });
}

export async function deleteRecord(storeName: StoreName, key: IDBValidKey): Promise<void> {
  return withStore<void>(storeName, 'readwrite', (s) => {
    s.delete(key);
  });
}

export async function clearStore(storeName: StoreName): Promise<void> {
  return withStore<void>(storeName, 'readwrite', (s) => {
    s.clear();
  });
}

export async function countStore(storeName: StoreName): Promise<number> {
  return withStore<number>(storeName, 'readonly', (s) => s.count());
}

/** Test-only: forget the cached connection so a fresh factory can be used. */
export function resetForTests(): void {
  dbPromise = null;
  unavailableReason = null;
}
