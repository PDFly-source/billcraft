import { describe, test, expect, beforeEach } from 'bun:test';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { resetForTests } from '../lib/db/idb';
import * as repo from '../lib/db/repository';
import {
  addMonthsYmd, addDaysYmd, daysBetweenYmd, toYmd,
  isDue, nextPeriodDate, suggestFirstDue,
  materializeFromSeries, advanceAfterGeneration, FREQUENCY_LABEL,
} from '../lib/recurring';
import { RecurringSeriesRecord, SavedDocument } from '../types/local';
import { DocumentModel } from '../types/document';

const freshDB = async () => {
  globalThis.indexedDB = new IDBFactory() as unknown as IDBFactory & typeof indexedDB;
  resetForTests();
};
beforeEach(freshDB);

const template = (): DocumentModel => ({
  id: 'tpl_1', type: 'invoice',
  meta: { documentNumber: 'INV-2026-0001', date: '2026-04-01', dueDate: '2026-04-30', validUntil: '', referenceNumber: '', placeOfSupply: '', paymentTerms: '' },
  business: { name: 'BillCraft Studio', tagline: '', address: '', phone: '', email: '', gstin: '', pan: '', logo: '', website: '', state: '', stateCode: '' },
  customer: { name: 'Acme', contactPerson: '', phone: '', email: '', address: '', gstin: '', state: '', stateCode: '', shippingAddress: '', company: 'Acme' },
  items: [{ id: 'it1', name: 'Retainer', description: '', hsn: '998314', quantity: 1, unit: 'service', rate: 10000, discountType: 'percent', discountValue: 0, taxRate: 18 }],
  discount: { type: 'fixed', value: 0 },
  tax: { mode: 'gst', gstType: 'cgst_sgst', customRate: 0, customLabel: '' },
  payment: { method: 'upi', bankName: '', accountHolder: '', accountNumber: '', ifsc: '', branch: '', upiId: 'biz@upi', upiPayeeName: '', showUPIQR: true, notes: '' },
  signature: { type: 'none', image: '', text: '', designation: '' },
  notes: '', terms: '',
  template: 'modern', colorTheme: 'royal_plum', customColor: '',
  currency: 'INR', autoRoundOff: true,
  paperSize: 'a4', orientation: 'portrait', showBillCraftBranding: true,
  payments: [],
}) as unknown as DocumentModel;

const series = (over: Partial<RecurringSeriesRecord> = {}): RecurringSeriesRecord => ({
  id: 's1', name: 'Acme monthly retainer', frequency: 'monthly',
  nextDueDate: '2026-05-01', active: true,
  lastGeneratedId: null, lastGeneratedDate: '',
  type: 'invoice', document: template(), clientId: 'c1',
  createdAt: '2026-04-01T00:00:00Z', updatedAt: '2026-04-01T00:00:00Z',
  ...over,
});

/* ------------------------------ date math ------------------------------- */

describe('Phase 4: recurring date math', () => {
  test('addMonthsYmd clamps month-end days', () => {
    expect(addMonthsYmd('2026-01-31', 1)).toBe('2026-02-28'); // 2026 not a leap year
    expect(addMonthsYmd('2024-01-31', 1)).toBe('2024-02-29'); // leap year
    expect(addMonthsYmd('2026-01-15', 1)).toBe('2026-02-15');
    expect(addMonthsYmd('2026-04-10', 3)).toBe('2026-07-10');
    expect(addMonthsYmd('2026-04-10', 12)).toBe('2027-04-10');
  });

  test('addDaysYmd and daysBetweenYmd round-trip', () => {
    expect(addDaysYmd('2026-02-28', 1)).toBe('2026-03-01');
    expect(daysBetweenYmd('2026-04-01', '2026-04-30')).toBe(29);
    expect(daysBetweenYmd('2026-04-30', '2026-04-01')).toBe(-29);
  });

  test('nextPeriodDate follows frequency', () => {
    expect(nextPeriodDate(series())).toBe('2026-06-01');
    expect(nextPeriodDate(series({ frequency: 'quarterly' }))).toBe('2026-08-01');
    expect(nextPeriodDate(series({ frequency: 'yearly' }))).toBe('2027-05-01');
  });

  test('isDue only when active and due date reached', () => {
    expect(isDue(series(), '2026-05-01')).toBe(true);
    expect(isDue(series(), '2026-06-10')).toBe(true);   // overdue still due
    expect(isDue(series(), '2026-04-30')).toBe(false);  // not yet
    expect(isDue(series({ active: false }), '2026-05-01')).toBe(false); // paused never due
  });

  test('suggestFirstDue is one month out', () => {
    expect(suggestFirstDue('2026-10-17')).toBe('2026-11-17');
  });
});

/* --------------------------- materialization ---------------------------- */

describe('Phase 4: materializeFromSeries', () => {
  test('fresh identity, due window preserved, payments cleared, template untouched', () => {
    const tpl = template();
    tpl.payments = [{ id: 'p1', date: '2026-04-02', amountMinor: 50000, method: 'upi', reference: '' }];
    const s = series({ document: tpl });
    const doc = materializeFromSeries(s, 'INV-2026-0042', '2026-05-01');

    expect(doc.meta.documentNumber).toBe('INV-2026-0042');
    expect(doc.meta.date).toBe('2026-05-01');
    expect(doc.id).not.toBe('tpl_1');
    // due date keeps the template's 29-day window
    expect(doc.meta.dueDate).toBe('2026-05-30');
    expect(doc.payments).toEqual([]);
    // template snapshot NOT mutated
    expect(tpl.meta.date).toBe('2026-04-01');
    expect(tpl.payments).toHaveLength(1);
    expect(s.document.meta.documentNumber).toBe('INV-2026-0001');
    // items/customer/style copied as-is
    expect(doc.items[0].name).toBe('Retainer');
    expect(doc.customer.company).toBe('Acme');
    expect(doc.template).toBe('modern');
  });

  test('series type drives the generated document type', () => {
    const doc = materializeFromSeries(series({ type: 'invoice' }), 'INV-9', '2026-05-01');
    expect(doc.type).toBe('invoice');
  });

  test('advanceAfterGeneration moves past today and handles catch-up', () => {
    const s = series({ nextDueDate: '2026-03-01' }); // 2+ months overdue
    const adv = advanceAfterGeneration(s, 'doc_new', '2026-05-15');
    expect(adv.lastGeneratedId).toBe('doc_new');
    expect(adv.lastGeneratedDate).toBe('2026-05-15');
    expect(adv.nextDueDate).toBe('2026-06-01');
    expect(isDue(adv, '2026-05-15')).toBe(false);
  });

  test('advance on time produces exactly the next period', () => {
    const adv = advanceAfterGeneration(series(), 'doc_new', '2026-05-01');
    expect(adv.nextDueDate).toBe('2026-06-01');
  });
});

/* --------------------------- repository CRUD ---------------------------- */

describe('Phase 4: recurring series storage', () => {
  test('save, list, update, delete round-trip with stable ids', async () => {
    expect(await repo.listRecurringSeries()).toEqual([]);

    const s1 = await repo.saveRecurringSeries({ name: 'Acme retainer', frequency: 'monthly', nextDueDate: '2026-06-01', type: 'invoice', document: template(), clientId: null });
    const s2 = await repo.saveRecurringSeries({ name: 'Beta quarterly', frequency: 'quarterly', nextDueDate: '2026-07-01', type: 'invoice', document: template(), clientId: 'c2' });
    expect((await repo.listRecurringSeries()).map((s) => s.name)).toEqual(['Acme retainer', 'Beta quarterly']);

    // partial update keeps untouched fields
    const paused = await repo.saveRecurringSeries({ id: s1.id, active: false });
    expect(paused.active).toBe(false);
    expect(paused.frequency).toBe('monthly');
    expect(paused.nextDueDate).toBe('2026-06-01');
    expect(paused.name).toBe('Acme retainer');

    await repo.deleteRecurringSeries(s2.id);
    const rest = await repo.listRecurringSeries();
    expect(rest.map((s) => s.id)).toEqual([s1.id]);
  });

  test('template snapshots are decoupled from saved documents', async () => {
    // save a real document, build a series from its snapshot, then edit the document
    const saved = await repo.saveDocument({
      id: 'd1', type: 'invoice', documentNumber: 'INV-1', document: template(),
      calc: { subtotal: 10000, itemDiscountsTotal: 0, overallDiscountTotal: 0, totalDiscount: 0, taxableAmount: 10000, cgst: 900, sgst: 900, igst: 0, customTax: 0, totalTax: 1800, rawTotal: 11800, roundOff: 0, grandTotal: 11800, amountInWords: '' },
      status: 'unpaid', payments: [], clientId: null, clientName: 'Acme',
      issueDate: '2026-04-01', dueDate: '2026-04-30', totalMinor: 1180000, amountPaidMinor: 0,
      convertedFromId: null, convertedToId: null,
    } as Omit<SavedDocument, 'createdAt' | 'updatedAt'>);

    const s = await repo.saveRecurringSeries({ name: 'From history', document: saved.document, type: 'invoice', nextDueDate: '2026-05-01' });

    // mutating the original doc's template afterwards must not touch the series
    const docAgain = await repo.getDocument(saved.id);
    docAgain!.document.customer.name = 'Changed';
    await repo.saveDocument(docAgain as unknown as Omit<SavedDocument, 'createdAt' | 'updatedAt'>);

    const seriesNow = (await repo.listRecurringSeries()).find((x) => x.id === s.id)!;
    expect(seriesNow.document.customer.name).toBe('Acme');
  });
});

/* ----------------------------- backup round-trip ------------------------ */

describe('Phase 4: backup includes recurring series', () => {
  test('export → validate → merge keeps series and is backward compatible', async () => {
    await repo.saveRecurringSeries({ name: 'Acme retainer', frequency: 'monthly', nextDueDate: '2026-06-01', type: 'invoice', document: template(), clientId: null });
    const backup = await (await import('../lib/backup')).buildBackup();
    expect((backup.data.recurringSeries || []).map((s: RecurringSeriesRecord) => s.name)).toEqual(['Acme retainer']);

    // v2 backups without recurringSeries still validate
    const legacy = JSON.parse(JSON.stringify(backup));
    delete legacy.data.recurringSeries;
    const { validateBackup } = await import('../lib/backup');
    expect(validateBackup(legacy).ok).toBe(true);
  });
});

test('frequency labels exist for all frequencies', () => {
  expect(FREQUENCY_LABEL.monthly).toBe('Monthly');
  expect(FREQUENCY_LABEL.quarterly).toBe('Quarterly');
  expect(FREQUENCY_LABEL.yearly).toBe('Yearly');
});
