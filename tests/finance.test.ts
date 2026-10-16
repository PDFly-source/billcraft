import { describe, test, expect } from 'bun:test';
import { calculateItemRow, calculateDocument, toMinor, fromMinor } from '../lib/calculations';
import { numberToIndianWords } from '../lib/currency';
import { buildDashboard, documentBalance, validatePayment, isOverdue } from '../lib/finance';
import { SavedDocument } from '../types/local';

const item = (over: Partial<Record<string, unknown>>) => ({
  id: 'i1', name: 'Item', description: '', hsn: '', quantity: 1, unit: 'pcs',
  rate: 100, discountType: 'percent', discountValue: 0, taxRate: 18, ...over,
});

const doc = (over: Record<string, unknown>) => ({
  id: 'd1', type: 'invoice',
  meta: { documentNumber: 'INV-2026-0001', date: '2026-10-16', dueDate: '2026-10-30', validUntil: '', referenceNumber: '', placeOfSupply: '', paymentTerms: '', receiptFor: '', amountReceived: 0 },
  business: { name: 'B', tagline: '', logo: '', address: '', phone: '', email: '', website: '', gstin: '', pan: '', state: '', stateCode: '' },
  customer: { name: 'C', company: '', address: '', phone: '', email: '', gstin: '', state: '', stateCode: '', placeOfSupply: '' },
  items: [item({})],
  discount: { type: 'none', value: 0 },
  tax: { mode: 'gst', gstType: 'cgst_sgst', customTaxName: '', customTaxRate: 0, customTaxInclusive: false },
  payment: { method: 'cash', bankName: '', accountHolder: '', accountNumber: '', ifsc: '', branch: '', upiId: '', upiPayeeName: '', showUPIQR: false, notes: '' },
  signature: { type: 'none', image: '', text: '', designation: '' },
  notes: '', terms: '', template: 'modern', colorTheme: 'plum', customColor: '',
  currency: 'INR', autoRoundOff: false, paperSize: 'a4', orientation: 'portrait', showBillCraftBranding: true,
  ...over,
});

describe('line item math', () => {
  test('qty x rate with exact paise rounding', () => {
    const r = calculateItemRow(item({ quantity: 3, rate: 333.33, taxRate: 0 }));
    expect(r.subtotal).toBe(999.99);
    expect(r.taxAmount).toBe(0);
  });

  test('classic float trap: 0.1 + 0.2 style rows stay exact', () => {
    // 3 x 19.999 = 59.997 -> rounds to 60.00 at the single line rounding point
    const r = calculateItemRow(item({ quantity: 3, rate: 19.999, taxRate: 0 }));
    expect(r.subtotal).toBe(60.00);
  });

  test('percent line discount', () => {
    const r = calculateItemRow(item({ quantity: 2, rate: 500, discountValue: 10, taxRate: 0 }));
    expect(r.subtotal).toBe(1000);
    expect(r.discountAmount).toBe(100);
    expect(r.taxable).toBe(900);
  });

  test('fixed line discount cannot exceed the line', () => {
    const r = calculateItemRow(item({ quantity: 1, rate: 50, discountType: 'fixed', discountValue: 999, taxRate: 0 }));
    expect(r.taxable).toBe(0);
  });

  test('negative quantities and NaN are rejected', () => {
    const r = calculateItemRow(item({ quantity: -5, rate: 100, taxRate: 0 }));
    expect(r.subtotal).toBe(0);
    const nan = calculateItemRow(item({ quantity: 'abc', rate: 'x', taxRate: 0 }));
    expect(nan.subtotal).toBe(0);
  });
});

describe('document-level math', () => {
  test('CGST+SGST split sums exactly to total tax', () => {
    const c = calculateDocument(doc({}));
    expect(c.cgst + c.sgst).toBeCloseTo(c.totalTax, 10);
    expect(c.cgst).toBe(c.sgst);
    expect(c.grandTotal).toBe(118);
  });

  test('IGST mode', () => {
    const c = calculateDocument(doc({ tax: { mode: 'gst', gstType: 'igst', customTaxName: '', customTaxRate: 0, customTaxInclusive: false } }));
    expect(c.igst).toBe(18);
    expect(c.cgst).toBe(0);
    expect(c.sgst).toBe(0);
  });

  test('mixed tax rates are computed per item, not averaged', () => {
    const c = calculateDocument(doc({
      items: [item({ quantity: 1, rate: 100, taxRate: 5 }), item({ quantity: 1, rate: 100, taxRate: 18 })],
    }));
    // old engine averaged to 11.5 -> 11.50; correct per-item is 23.00 total
    expect(c.totalTax).toBe(23.00);
    expect(c.cgst).toBe(11.50);
    expect(c.sgst).toBe(11.50);
    expect(c.grandTotal).toBe(223.00);
  });

  test('overall percent discount pro-rates mixed-rate tax correctly', () => {
    const c = calculateDocument(doc({
      items: [item({ quantity: 1, rate: 100, taxRate: 5 }), item({ quantity: 1, rate: 100, taxRate: 18 })],
      discount: { type: 'percent', value: 10 },
    }));
    // taxable 180, taxes: 4.50 (5%) + 16.20 (18%) = 20.70
    expect(c.taxableAmount).toBe(180);
    expect(c.totalTax).toBe(20.70);
    expect(c.grandTotal).toBe(200.70);
  });

  test('document fixed discount caps at subtotal', () => {
    const c = calculateDocument(doc({ discount: { type: 'fixed', value: 9999 } }));
    expect(c.taxableAmount).toBe(0);
    expect(c.grandTotal).toBe(0);
  });

  test('custom tax, exclusive', () => {
    const c = calculateDocument(doc({ tax: { mode: 'custom', gstType: 'igst', customTaxName: 'VAT', customTaxRate: 10, customTaxInclusive: false } }));
    expect(c.customTax).toBe(10);
    expect(c.totalTax).toBe(10);
  });

  test('custom tax, INCLUSIVE pricing extracts the tax exactly', () => {
    const c = calculateDocument(doc({ tax: { mode: 'custom', gstType: 'igst', customTaxName: 'GST', customTaxRate: 18, customTaxInclusive: true } }));
    // 100 gross @18% inclusive -> tax = 15.2542... -> 15.25
    expect(c.customTax).toBe(15.25);
  });

  test('exempt (0%) and mixed 0/18 items', () => {
    const c = calculateDocument(doc({
      items: [item({ quantity: 1, rate: 60, taxRate: 0 }), item({ quantity: 1, rate: 100, taxRate: 18 })],
    }));
    expect(c.totalTax).toBe(18);
    expect(c.grandTotal).toBe(178);
  });

  test('autoRoundOff rounds to nearest rupee with exact round-off value', () => {
    const c = calculateDocument(doc({ items: [item({ quantity: 1, rate: 100.49, taxRate: 0 })], autoRoundOff: true }));
    expect(c.grandTotal).toBe(100);
    expect(c.roundOff).toBe(-0.49);
  });

  test('paise totals do not drift across many fractional rows', () => {
    const items = Array.from({ length: 25 }, (_, i) => item({ quantity: 1.1, rate: 3.07 + i * 0.01, taxRate: 18 }));
    const c = calculateDocument(doc({ items }));
    // sum of paise must be internally consistent: subtotal + tax == rawTotal
    expect(toMinor(c.subtotal) + toMinor(c.totalTax)).toBe(toMinor(c.rawTotal));
    expect(c.subtotal * 100).toBe(Math.round(c.subtotal * 100));
  });
});

describe('amount in words (Indian)', () => {
  test('lakh / crore formatting', () => {
    expect(numberToIndianWords(0)).toBe('Zero Rupees Only');
    expect(numberToIndianWords(1)).toBe('One Rupees Only');
    expect(numberToIndianWords(150000)).toContain('Lakh');
    expect(numberToIndianWords(25000000)).toContain('Crore');
    expect(numberToIndianWords(123456789.05)).toContain('Crore');
    expect(numberToIndianWords(12.5)).toContain('Fifty Paise');
  });
});

describe('payments & balances', () => {
  const mkDoc = (over: Partial<SavedDocument>): SavedDocument => ({
    id: 'inv1', type: 'invoice', documentNumber: 'INV-1',
    document: {} as never, calc: {} as never, status: 'unpaid', payments: [],
    clientId: null, clientName: 'Acme', issueDate: '2026-09-01', dueDate: '2026-09-15',
    totalMinor: 100000, amountPaidMinor: 0, convertedFromId: null, convertedToId: null,
    createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z', ...over,
  });

  test('partial payment balance', () => {
    const d = mkDoc({ amountPaidMinor: 40000, payments: [{ id: 'p1', date: '2026-09-05', amount: 400, amountMinor: 40000, method: 'cash', note: '', createdAt: '', updatedAt: '' }] });
    const b = documentBalance(d);
    expect(b.paid).toBe(400);
    expect(b.balance).toBe(600);
  });

  test('overdue detection', () => {
    const d = mkDoc({});
    expect(isOverdue(d, new Date('2026-10-16'))).toBe(true);
    expect(isOverdue(mkDoc({ dueDate: '2026-12-31' }), new Date('2026-10-16'))).toBe(false);
    expect(isOverdue(mkDoc({ status: 'paid' }), new Date('2026-10-16'))).toBe(false);
    expect(isOverdue(mkDoc({ status: 'cancelled' }), new Date('2026-10-16'))).toBe(false);
  });

  test('payment validation rejects overpayment and invalid amounts', () => {
    const d = mkDoc({ amountPaidMinor: 90000 });
    expect(validatePayment(d, 100.01).valid).toBe(false); // exceeds 100 remaining
    expect(validatePayment(d, -5).valid).toBe(false);
    expect(validatePayment(d, 100).maxAmountMinor).toBe(10000);
    expect(validatePayment(d, 100).valid).toBe(true); // exactly the remaining balance
    expect(validatePayment(mkDoc({ status: 'cancelled' }), 10).valid).toBe(false);
  });
});

describe('dashboard sales-reporting rules', () => {
  const mk = (over: Partial<SavedDocument>): SavedDocument => ({
    id: Math.random().toString(36).slice(2), type: 'invoice', documentNumber: 'X',
    document: {} as never, calc: {} as never, status: 'unpaid', payments: [],
    clientId: null, clientName: 'A', issueDate: '2026-10-01', dueDate: '',
    totalMinor: 100000, amountPaidMinor: 0, convertedFromId: null, convertedToId: null,
    createdAt: '', updatedAt: '', ...over,
  });

  test('quotations/estimates/receipts excluded from invoiced sales', () => {
    const s = buildDashboard([
      mk({ type: 'invoice', totalMinor: 100000 }),
      mk({ type: 'quotation', totalMinor: 500000 }),
      mk({ type: 'estimate', totalMinor: 700000 }),
      mk({ type: 'receipt', totalMinor: 900000 }),
    ]);
    expect(s.totalInvoiced).toBe(1000);
    expect(s.documentCount).toBe(4);
  });

  test('cancelled invoices excluded from receivables; payments counted separately', () => {
    const s = buildDashboard([
      mk({ id: 'a', totalMinor: 100000, amountPaidMinor: 40000, status: 'partial' }),
      mk({ id: 'b', totalMinor: 200000, status: 'cancelled' }),
    ]);
    expect(s.totalInvoiced).toBe(1000);
    expect(s.totalPaid).toBe(400);
    expect(s.outstanding).toBe(600);
    expect(s.overdue).toBe(0);
  });

  test('overdue amount = remaining balance of overdue active invoices', () => {
    const s = buildDashboard([
      mk({ id: 'a', totalMinor: 100000, amountPaidMinor: 25000, dueDate: '2026-10-01' }),
    ], new Date('2026-10-16'));
    expect(s.outstanding).toBe(750);
    expect(s.overdue).toBe(750);
  });

  test('monthly chart uses only issue months with data', () => {
    const s = buildDashboard([mk({ issueDate: '2026-10-05', totalMinor: 50000 })], new Date('2026-10-16'));
    expect(s.monthly).toHaveLength(12);
    const oct = s.monthly[s.monthly.length - 1];
    expect(oct.key).toBe('2026-10');
    expect(oct.invoiced).toBe(500);
    expect(s.monthly[0].invoiced).toBe(0);
  });
});
