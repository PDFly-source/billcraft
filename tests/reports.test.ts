import { describe, expect, it } from 'bun:test';
import {
  revenueDocs, revenueByClient, gstSummary, topItems,
  csvField, csvLine, toGstr1Csv, toClientRevenueCsv,
  SavedDocument, DateRange,
} from '@/lib/reports';
import { DocumentModel, DocumentCalculations } from '@/types/document';
import { SampleDoc } from './fixtures/documents';

const mk = (overrides: Partial<SavedDocument>): SavedDocument => SampleDoc(overrides);

describe('Phase 4: revenueDocs filtering', () => {
  const docs = [
    mk({ id: 'i1', type: 'invoice', status: 'paid', issueDate: '2026-04-10' }),
    mk({ id: 'i2', type: 'invoice', status: 'unpaid', issueDate: '2026-05-15' }),
    mk({ id: 'c1', type: 'credit_note', status: 'issued', issueDate: '2026-05-20' }),
    mk({ id: 'd1', type: 'debit_note', status: 'issued', issueDate: '2026-05-25' }),
    mk({ id: 'q1', type: 'quotation', status: 'issued', issueDate: '2026-05-01' }),
    mk({ id: 'p1', type: 'purchase_order', status: 'issued', issueDate: '2026-05-01' }),
    mk({ id: 'i3', type: 'invoice', status: 'cancelled', issueDate: '2026-05-01' }),
    mk({ id: 'r1', type: 'receipt', status: 'issued', issueDate: '2026-05-01' }),
  ];

  it('includes only invoices + credit/debit notes, excludes cancelled and non-sales', () => {
    expect(revenueDocs(docs).map((d) => d.id)).toEqual(['i1', 'i2', 'c1', 'd1']);
  });

  it('applies inclusive date range', () => {
    const range: DateRange = { from: '2026-05-01', to: '2026-05-20' };
    expect(revenueDocs(docs, range).map((d) => d.id)).toEqual(['i2', 'c1']);
  });

  it('empty range returns everything reportable', () => {
    expect(revenueDocs(docs, {}).length).toBe(4);
  });
});

describe('Phase 4: revenueByClient', () => {
  it('groups by client, subtracts credit notes, sums payments', () => {
    const docs = [
      mk({ id: 'a1', type: 'invoice', clientId: 'c1', clientName: 'Acme', totalMinor: 100000, amountPaidMinor: 40000 }),
      mk({ id: 'a2', type: 'invoice', clientId: 'c1', clientName: 'Acme', totalMinor: 50000, amountPaidMinor: 50000 }),
      mk({ id: 'cn', type: 'credit_note', clientId: 'c1', clientName: 'Acme', totalMinor: 20000, amountPaidMinor: 0 }),
      mk({ id: 'b1', type: 'invoice', clientId: 'c2', clientName: 'Beta', totalMinor: 80000, amountPaidMinor: 80000 }),
    ];
    const rows = revenueByClient(docs);
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe('Acme'); // 100000+50000-20000 = 130000 > 80000
    expect(rows[0].invoicedMinor).toBe(130000);
    expect(rows[0].paidMinor).toBe(90000);
    expect(rows[0].outstandingMinor).toBe(40000);
    expect(rows[0].docCount).toBe(3);
    expect(rows[1].outstandingMinor).toBe(0);
  });

  it('unlinked docs group under the same denormalized name', () => {
    const docs = [
      mk({ id: 'x', type: 'invoice', clientId: null, clientName: 'Walk-in', totalMinor: 1000, amountPaidMinor: 0 }),
      mk({ id: 'y', type: 'invoice', clientId: null, clientName: 'Walk-in', totalMinor: 2000, amountPaidMinor: 0 }),
    ];
    expect(revenueByClient(docs)).toHaveLength(1);
    expect(revenueByClient(docs)[0].invoicedMinor).toBe(3000);
  });
});

describe('Phase 4: gstSummary', () => {
  it('nets credit notes out of tax totals and splits B2B/B2C by GSTIN', () => {
    const calc = (taxable: number, cgst: number, sgst: number, igst = 0): DocumentCalculations =>
      ({ subtotal: taxable, itemDiscountsTotal: 0, overallDiscountTotal: 0, totalDiscount: 0, taxableAmount: taxable, cgst, sgst, igst, customTax: 0, totalTax: cgst + sgst + igst, rawTotal: 0, roundOff: 0, grandTotal: 0, amountInWords: '' });
    const docs = [
      mk({ id: 'inv', type: 'invoice', totalMinor: 118000, calc: calc(1000, 90, 90), customerGstin: '27AABCU9603R1ZM' }),
      mk({ id: 'cn', type: 'credit_note', totalMinor: 11800, calc: calc(100, 9, 9), customerGstin: '27AABCU9603R1ZM' }),
      mk({ id: 'b2c', type: 'invoice', totalMinor: 59000, calc: calc(500, 45, 45), customerGstin: '' }),
    ];
    const s = gstSummary(docs);
    expect(s.b2bCount).toBe(2);
    expect(s.b2cCount).toBe(1);
    expect(s.taxableMinor).toBe(140000); // 100000 - 10000 + 50000
    expect(s.cgstMinor).toBe(12600);
    expect(s.sgstMinor).toBe(12600);
    expect(s.totalTaxMinor).toBe(25200);
    expect(s.creditNoteMinor).toBe(11800);
    expect(s.invoiceMinor).toBe(177000);
    expect(s.byRate.length).toBeGreaterThan(0);
  });
});

describe('Phase 4: topItems', () => {
  it('ranks items by revenue and nets credit-note quantities', () => {
    const withItems = (names: [string, number, number, number][]): Partial<DocumentModel> => ({
      items: names.map(([name, qty, rate, taxRate], i) => ({
        id: `it${i}`, name, description: '', hsn: '', quantity: qty, unit: 'service' as const,
        rate, discountType: 'percent' as const, discountValue: 0, taxRate,
      })),
    });
    const calc = (taxable: number): DocumentCalculations =>
      ({ subtotal: taxable, itemDiscountsTotal: 0, overallDiscountTotal: 0, totalDiscount: 0, taxableAmount: taxable, cgst: 0, sgst: 0, igst: 0, customTax: 0, totalTax: 0, rawTotal: taxable, roundOff: 0, grandTotal: taxable, amountInWords: '' });
    const docs = [
      mk({ id: 'i1', type: 'invoice', totalMinor: 800000, calc: calc(8000), document: withItems([['Consulting', 8, 1000, 18]]) as unknown as DocumentModel }),
      mk({ id: 'cn', type: 'credit_note', totalMinor: 100000, calc: calc(1000), document: withItems([['Consulting', 2, 1000, 18]]) as unknown as DocumentModel }),
      mk({ id: 'i2', type: 'invoice', totalMinor: 450000, calc: calc(4500), document: withItems([['Design', 3, 1500, 18]]) as unknown as DocumentModel }),
    ];
    const top = topItems(docs, 5);
    expect(top[0].name).toBe('Consulting');
    expect(top[0].qty).toBe(6);
    expect(top[1].name).toBe('Design');
  });
});

describe('Phase 4: CSV escaping', () => {
  it('escapes quotes, commas and newlines', () => {
    expect(csvField('plain')).toBe('plain');
    expect(csvField('has,comma')).toBe('"has,comma"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField('line\nbreak')).toBe('"line\nbreak"');
    expect(csvField('')).toBe('');
  });

  it('joins lines correctly', () => {
    expect(csvLine(['a', 'b,c', 42])).toBe('a,"b,c",42');
  });
});

describe('Phase 4: GSTR-1 CSV', () => {
  it('separates B2B and B2C sections with proper headers and rows', () => {
    const docs = [
      mk({ id: 'b2b', type: 'invoice', documentNumber: 'INV-001', issueDate: '2026-04-10', totalMinor: 118000, customerGstin: '27AABCU9603R1ZM', clientName: 'Acme', placeOfSupply: 'Maharashtra (27)' }),
      mk({ id: 'b2c', type: 'invoice', documentNumber: 'INV-002', issueDate: '2026-04-11', totalMinor: 59000, customerGstin: '', clientName: 'Walk-in' }),
      mk({ id: 'cn', type: 'credit_note', documentNumber: 'CN-001', issueDate: '2026-04-12', totalMinor: 11800, customerGstin: '27AABCU9603R1ZM', clientName: 'Acme' }),
    ];
    const csv = toGstr1Csv(docs);
    const joined = csv.join('\n');
    expect(joined).toContain('B2B INVOICES (registered customers)');
    expect(joined).toContain('27AABCU9603R1ZM');
    expect(joined).toContain('INV-001');
    expect(joined).toContain('Maharashtra (27)');
    expect(joined).toContain('B2C (unregistered customers)');
    expect(joined).toContain('INV-002');
    expect(joined).toContain('Credit Note'); // header includes the type column
  });

  it('client revenue CSV has one row per client', () => {
    const rows = toClientRevenueCsv([
      { clientId: 'c1', name: 'Acme', docCount: 2, invoicedMinor: 150000, paidMinor: 50000, outstandingMinor: 100000 },
    ]);
    expect(rows[0]).toBe('Client,Documents,Revenue,Collected,Outstanding');
    expect(rows[1]).toBe('Acme,2,1500.00,500.00,1000.00');
  });
});
