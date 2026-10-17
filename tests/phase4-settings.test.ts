import { describe, test, expect, beforeEach } from 'bun:test';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { resetForTests } from '../lib/db/idb';
import * as repo from '../lib/db/repository';
import { backupFilename } from '../lib/backup';
import {
  formatDate, formatNumber, localeForGrouping,
  setNumberGroupingPref, setDateFormatPref,
} from '../lib/format';
import { formatCurrency } from '../lib/currency';
import {
  setupLock, verifyPin, resetLock, getLockConfig, isValidPin,
  recordFailedAttempt, throttleDelayMs, clearThrottle, constantTimeEqual,
  isLockedOnLoad, markLocked, markUnlocked,
} from '../lib/applock';

const mkDoc = (id: string, num: string) => ({
  id, type: 'invoice', documentNumber: num,
  document: { id, type: 'invoice' } as never, calc: {} as never,
  status: 'unpaid', payments: [], clientId: null, clientName: 'Acme',
  issueDate: '2026-10-01', dueDate: '2026-10-15', totalMinor: 100000, amountPaidMinor: 0,
  convertedFromId: null, convertedToId: null,
  createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z',
});

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory() as unknown as IDBFactory & typeof indexedDB;
  resetForTests();
  clearThrottle();
  resetLock();
  setNumberGroupingPref('auto');
  setDateFormatPref('ddmmyyyy');
});

// ---------- Feature A: number & date formatting ----------

describe('Phase 4 A: date formatting', () => {
  test('DD/MM/YYYY renders without changing the stored date', () => {
    expect(formatDate('2026-03-05', 'ddmmyyyy')).toBe('05/03/2026');
  });
  test('MM/DD/YYYY renders', () => {
    expect(formatDate('2026-03-05', 'mmddyyyy')).toBe('03/05/2026');
  });
  test('ISO passthrough renders', () => {
    expect(formatDate('2026-03-05', 'iso')).toBe('2026-03-05');
  });
  test('no timezone shift: dates are never parsed through Date', () => {
    // a UTC-evening date that would roll to the next day in UTC parsing is
    // still displayed as-is because formatDate never constructs a Date
    expect(formatDate('2026-01-01', 'ddmmyyyy')).toBe('01/01/2026');
  });
  test('empty and invalid values pass through untouched, never fabricated', () => {
    expect(formatDate('', 'ddmmyyyy')).toBe('');
    expect(formatDate(undefined, 'ddmmyyyy')).toBe('');
    expect(formatDate('not-a-date', 'ddmmyyyy')).toBe('not-a-date');
  });
  test('preference changes only the rendering, not the value', () => {
    const stored = '2026-10-17';
    const a = formatDate(stored, 'ddmmyyyy');
    const b = formatDate(stored, 'mmddyyyy');
    expect(a).toBe('17/10/2026');
    expect(b).toBe('10/17/2026');
    expect(stored).toBe('2026-10-17'); // untouched
  });
});

describe('Phase 4 A: number grouping', () => {
  test('Indian grouping: 1,00,000', () => {
    expect(formatNumber(100000, 'indian')).toBe('1,00,000');
  });
  test('International grouping: 100,000', () => {
    expect(formatNumber(100000, 'international')).toBe('100,000');
  });
  test('auto grouping follows the currency (INR -> Indian)', () => {
    expect(localeForGrouping('auto', true)).toBe('en-IN');
    expect(localeForGrouping('auto', false)).toBe('en-US');
  });
  test('formatCurrency honours the grouping preference without changing the amount', () => {
    expect(formatCurrency(100000, 'INR', 'indian')).toBe('₹1,00,000.00');
    expect(formatCurrency(100000, 'INR', 'international')).toBe('₹100,000.00');
  });
  test('existing INR monetary math is unaffected by display grouping', () => {
    setNumberGroupingPref('international');
    // the underlying amount used for calc is the same number
    const displayed = formatCurrency(123456.78, 'INR', 'international');
    expect(displayed.replace(/[₹,]/g, '')).toBe('123456.78');
    setNumberGroupingPref('auto');
  });
});

// ---------- Feature B: invoice numbering ----------

describe('Phase 4 B: invoice numbering', () => {
  test('prefix and sequence persist; defaults stay backward compatible', async () => {
    const year = new Date().getFullYear();
    await repo.saveProfile({ ...repo.DEFAULT_PROFILE, invoicePrefix: 'BILL', invoiceStartNumber: 7 });
    const n1 = await repo.nextDocumentNumber('invoice');
    expect(n1).toBe(`BILL-${year}-0007`);
    const n2 = await repo.nextDocumentNumber('invoice');
    expect(n2).toBe(`BILL-${year}-0008`);
  });

  test('padding preference is respected', async () => {
    const year = new Date().getFullYear();
    await repo.saveNumberingPrefs({ padding: 6, autoIncrement: true });
    const n = await repo.nextDocumentNumber('invoice');
    expect(n).toMatch(/^INV-\d{4}-\d{6}$/);
  });

  test('duplicate numbers are prevented: existing number is skipped', async () => {
    const year = new Date().getFullYear();
    await repo.saveDocument(mkDoc('d1', `INV-${year}-0001`) as never);
    // force the counter back so the next allocation would collide
    await repo.setNextSequenceNumber('invoice', 1);
    const n = await repo.nextDocumentNumber('invoice');
    expect(n).not.toBe(`INV-${year}-0001`);
    expect(n).toBe(`INV-${year}-0002`);
  });

  test('peek does not consume the sequence', async () => {
    const year = new Date().getFullYear();
    const peek1 = await repo.peekNextDocumentNumber('invoice');
    const peek2 = await repo.peekNextDocumentNumber('invoice');
    expect(peek1).toBe(peek2);
    const consumed = await repo.nextDocumentNumber('invoice');
    expect(consumed).toBe(peek1);
    const peek3 = await repo.peekNextDocumentNumber('invoice');
    expect(peek3).not.toBe(peek1);
  });

  test('setNextSequenceNumber moves the next allocation', async () => {
    const year = new Date().getFullYear();
    await repo.setNextSequenceNumber('invoice', 42);
    const n = await repo.nextDocumentNumber('invoice');
    expect(n).toBe(`INV-${year}-0042`);
  });

  test('auto-increment preference defaults to true and round-trips', async () => {
    const p = await repo.getNumberingPrefs();
    expect(p.autoIncrement).toBe(true);
    expect(p.padding).toBe(4);
    await repo.saveNumberingPrefs({ padding: 5, autoIncrement: false });
    const q = await repo.getNumberingPrefs();
    expect(q).toEqual({ padding: 5, autoIncrement: false });
  });

  test('existing saved documents are never renumbered by preference changes', async () => {
    await repo.saveDocument(mkDoc('d1', 'INV-2025-0001') as never);
    await repo.setNextSequenceNumber('invoice', 99);
    const docs = await repo.listDocuments();
    expect(docs[0].documentNumber).toBe('INV-2025-0001');
  });
});

// ---------- Feature G: dated backups ----------

describe('Phase 4 G: backup filenames', () => {
  test('sortable local timestamp with seconds, no colons', () => {
    const name = backupFilename(new Date(2026, 9, 17, 13, 45, 0));
    expect(name).toBe('billcraft-backup-2026-10-17-134500.json');
  });
  test('repeated exports within the same minute do not collide', () => {
    const a = backupFilename(new Date(2026, 9, 17, 13, 45, 0));
    const b = backupFilename(new Date(2026, 9, 17, 13, 45, 30));
    expect(a).not.toBe(b);
  });
  test('filename has no filesystem-hostile characters', () => {
    expect(backupFilename()).toMatch(/^billcraft-backup-\d{4}-\d{2}-\d{2}-\d{6}\.json$/);
  });
});

// ---------- Feature C: app lock ----------

describe('Phase 4 C: app lock (PIN)', () => {
  test('setup + successful unlock', async () => {
    const cfg = await setupLock('1234', { timeoutMinutes: 5, lockOnStart: true });
    expect(cfg.enabled).toBe(true);
    expect(cfg.timeoutMinutes).toBe(5);
    expect(await verifyPin('1234')).toBe(true);
  });

  test('incorrect PIN is rejected with a generic result', async () => {
    await setupLock('123456', { timeoutMinutes: 0, lockOnStart: false });
    expect(await verifyPin('999999')).toBe(false);
    expect(await verifyPin('1234')).toBe(false); // wrong length also fails
  });

  test('the PIN is never stored in plaintext or reversible form', async () => {
    await setupLock('917253', { timeoutMinutes: 5, lockOnStart: true });
    const cfg = await getLockConfig();
    const raw = JSON.stringify(cfg);
    expect(raw).not.toContain('917253');
    expect(cfg?.hash).not.toBe(cfg?.salt);
    expect(cfg?.iterations).toBeGreaterThan(100000);
  });

  test('PIN validation: 4-6 digits only', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('123456')).toBe(true);
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('1234567')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
  });

  test('failed attempts earn an increasing delay (throttling)', () => {
    clearThrottle();
    expect(throttleDelayMs()).toBe(0);
    recordFailedAttempt(); recordFailedAttempt();
    expect(throttleDelayMs()).toBe(0); // 2 fails: still allowed
    recordFailedAttempt(); // 3rd
    expect(throttleDelayMs()).toBeGreaterThan(0);
    clearThrottle();
    recordFailedAttempt(); recordFailedAttempt(); recordFailedAttempt();
    recordFailedAttempt(); recordFailedAttempt(); // 6
    const d6 = throttleDelayMs();
    expect(d6).toBeGreaterThan(0);
  });

  test('resetLock disables the lock but the honest data policy stays out of scope', async () => {
    await setupLock('4321', { timeoutMinutes: 1, lockOnStart: false });
    resetLock();
    expect(await getLockConfig()).toBe(null);
    expect(await verifyPin('4321')).toBe(false); // no lock -> no gate
  });

  test('lock-on-start cannot be bypassed by a refresh', async () => {
    const cfg = await setupLock('1111', { timeoutMinutes: 0, lockOnStart: true });
    // fresh session with lock-on-start: locked even though no explicit lock
    expect(isLockedOnLoad(cfg)).toBe(true);
    markUnlocked();
    // with lockOnStart, a refresh re-locks — the flag alone can't disable it
    const cfg2 = await getLockConfig();
    expect(isLockedOnLoad(cfg2)).toBe(true);
    markUnlocked();

    // without lock-on-start: only an explicit lock persists across reload
    const cfg3 = await setupLock('2222', { timeoutMinutes: 0, lockOnStart: false });
    expect(isLockedOnLoad(cfg3)).toBe(false);
    markLocked();
    expect(isLockedOnLoad(cfg3)).toBe(true); // explicitly locked stays locked
    markUnlocked();
    expect(isLockedOnLoad(cfg3)).toBe(false);
  });

  test('constant-time compare behaves', () => {
    const a = new Uint8Array([1, 2, 3, 4]);
    expect(constantTimeEqual(a, new Uint8Array([1, 2, 3, 4]))).toBe(true);
    expect(constantTimeEqual(a, new Uint8Array([1, 2, 3, 5]))).toBe(false);
    expect(constantTimeEqual(a, new Uint8Array([1, 2]))).toBe(false);
  });
});
