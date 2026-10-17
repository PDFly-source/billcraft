import { describe, expect, it } from 'bun:test';
import {
  paymentSummary,
  sumPaymentsMinor,
  validateDocPayment,
  isDuplicatePayment,
  DocPaymentLite,
} from '@/lib/finance';
import {
  validatePaymentLink,
  isValidUpiId,
  isValidEwayBillNumber,
  validateCustomField,
  itemDiscountError,
} from '@/lib/validation';
import { createBlankItem, duplicateItemAt, reorderItems, sanitizeDiscountValue } from '@/lib/item-ops';

const pay = (id: string, amountMinor: number, date = '2026-10-17', reference = ''): DocPaymentLite => ({
  id,
  date,
  amountMinor,
  reference,
});

describe('Phase 3: paymentSummary', () => {
  it('returns UNPAID with no payments', () => {
    const s = paymentSummary(118000, []);
    expect(s.status).toBe('UNPAID');
    expect(s.paidMinor).toBe(0);
    expect(s.balanceMinor).toBe(118000);
  });

  it('returns PARTIAL when partially paid', () => {
    const s = paymentSummary(118000, [pay('a', 59000)]);
    expect(s.status).toBe('PARTIAL');
    expect(s.balanceMinor).toBe(59000);
  });

  it('returns PAID when fully covered', () => {
    const s = paymentSummary(118000, [pay('a', 59000), pay('b', 59000)]);
    expect(s.status).toBe('PAID');
    expect(s.balanceMinor).toBe(0);
  });

  it('ignores malformed payments instead of throwing', () => {
    const bad = [{ id: 'x', date: '', amountMinor: NaN }, { id: 'y', date: '', amountMinor: -400 }, null] as unknown as DocPaymentLite[];
    expect(sumPaymentsMinor(bad)).toBe(0);
    expect(paymentSummary(10000, bad).status).toBe('UNPAID');
  });

  it('handles null/undefined payments arrays', () => {
    expect(paymentSummary(10000, null).status).toBe('UNPAID');
    expect(paymentSummary(10000, undefined).status).toBe('UNPAID');
  });
});

describe('Phase 3: validateDocPayment', () => {
  it('rejects zero, negative and non-numeric amounts', () => {
    expect(validateDocPayment(10000, [], 0).valid).toBe(false);
    expect(validateDocPayment(10000, [], -5).valid).toBe(false);
    expect(validateDocPayment(10000, [], Number('abc')).valid).toBe(false);
  });

  it('rejects overpayment beyond balance', () => {
    const v = validateDocPayment(10000, [pay('a', 4000)], 70);
    expect(v.valid).toBe(false);
    expect(v.error).toContain('outstanding balance');
  });

  it('accepts exact balance payment', () => {
    expect(validateDocPayment(10000, [pay('a', 4000)], 60).valid).toBe(true);
  });

  it('converts rupees to paise exactly', () => {
    const v = validateDocPayment(100000, [], 123.45);
    expect(v.amountMinor).toBe(12345);
  });
});

describe('Phase 3: isDuplicatePayment', () => {
  it('flags same amount + date + reference', () => {
    const existing = [pay('a', 5000, '2026-10-17', 'UPI-1')];
    expect(isDuplicatePayment(existing, 5000, '2026-10-17', 'UPI-1')).toBe(true);
  });

  it('allows same amount with different date or reference', () => {
    const existing = [pay('a', 5000, '2026-10-17', 'UPI-1')];
    expect(isDuplicatePayment(existing, 5000, '2026-10-18', 'UPI-1')).toBe(false);
    expect(isDuplicatePayment(existing, 5000, '2026-10-17', 'UPI-2')).toBe(false);
  });
});

describe('Phase 3: payment link validation', () => {
  it('accepts empty (optional)', () => {
    expect(validatePaymentLink('').valid).toBe(true);
    expect(validatePaymentLink('   ').valid).toBe(true);
  });

  it('accepts proper https URLs', () => {
    expect(validatePaymentLink('https://pay.example.com/x').valid).toBe(true);
    expect(validatePaymentLink('https://razorpay.me/@shop').valid).toBe(true);
  });

  it('rejects http, javascript: and data: schemes', () => {
    expect(validatePaymentLink('http://pay.example.com').valid).toBe(false);
    expect(validatePaymentLink('javascript:alert(1)').valid).toBe(false);
    expect(validatePaymentLink('data:text/html,x').valid).toBe(false);
    expect(validatePaymentLink('ftp://x.y').valid).toBe(false);
  });

  it('rejects URLs with spaces', () => {
    expect(validatePaymentLink('https://a b.com').valid).toBe(false);
  });
});

describe('Phase 3: UPI / e-way validators', () => {
  it('validates UPI id format', () => {
    expect(isValidUpiId('shop@okhdfcbank')).toBe(true);
    expect(isValidUpiId('name@upi')).toBe(true);
    expect(isValidUpiId('bad')).toBe(false);
    expect(isValidUpiId('@@x')).toBe(false);
    expect(isValidUpiId('')).toBe(false);
  });

  it('validates e-way bill number (12 digits, optional)', () => {
    expect(isValidEwayBillNumber('')).toBe(true);
    expect(isValidEwayBillNumber('123456789012')).toBe(true);
    expect(isValidEwayBillNumber('12345')).toBe(false);
    expect(isValidEwayBillNumber('ABC123456789')).toBe(false);
  });
});

describe('Phase 3: custom fields', () => {
  it('requires a label and caps lengths', () => {
    expect(validateCustomField({ label: '', value: 'x' }).valid).toBe(false);
    expect(validateCustomField({ label: 'Project', value: 'x' }).valid).toBe(true);
    expect(validateCustomField({ label: 'x'.repeat(41), value: 'x' }).valid).toBe(false);
    expect(validateCustomField({ label: 'x', value: 'y'.repeat(121) }).valid).toBe(false);
  });
});

describe('Phase 3: item ops', () => {
  it('createBlankItem has unique ids and GST-aware defaults', () => {
    const a = createBlankItem(true);
    const b = createBlankItem(false);
    expect(a.id).not.toBe(b.id);
    expect(a.taxRate).toBe(18);
    expect(b.taxRate).toBe(0);
    expect(a.quantity).toBe(1);
    expect(a.kind).toBe('service');
  });

  it('duplicateItemAt inserts a copy with a new id right after the original', () => {
    const items = [createBlankItem(false), createBlankItem(false), createBlankItem(false)];
    items[0].name = 'first';
    items[1].name = 'second';
    const next = duplicateItemAt(items, 0);
    expect(next).toHaveLength(4);
    expect(next[0].name).toBe('first');
    expect(next[1].name).toBe('first');
    expect(next[1].id).not.toBe(next[0].id);
    expect(next[2].name).toBe('second');
  });

  it('reorderItems is a no-op at boundaries and correct in the middle', () => {
    const items = [createBlankItem(false), createBlankItem(false), createBlankItem(false)];
    items[0].name = 'a';
    items[1].name = 'b';
    items[2].name = 'c';
    const same = reorderItems(items, 0, -1);
    expect(same).toEqual(items);
    const same2 = reorderItems(items, 2, 3);
    expect(same2).toEqual(items);
    const moved = reorderItems(items, 0, 2);
    expect(moved.map((i) => i.name)).toEqual(['b', 'c', 'a']);
    expect(moved[0].id).toBe(items[1].id); // stable ids preserved
  });

  it('sanitizeDiscountValue clamps percent to 100 and rejects negatives', () => {
    expect(sanitizeDiscountValue('150', 'percent')).toBe(100);
    expect(sanitizeDiscountValue('-10', 'fixed')).toBe(0);
    expect(sanitizeDiscountValue('25', 'percent')).toBe(25);
    expect(sanitizeDiscountValue('', 'percent')).toBe(0);
  });

  it('itemDiscountError flags percent over 100 and negatives', () => {
    expect(itemDiscountError({ discountType: 'percent', discountValue: 120 })).toBeTruthy();
    expect(itemDiscountError({ discountType: 'fixed', discountValue: -1 })).toBeTruthy();
    expect(itemDiscountError({ discountType: 'percent', discountValue: 10 })).toBeNull();
    expect(itemDiscountError({ discountType: 'fixed', discountValue: 10 })).toBeNull();
  });
});
