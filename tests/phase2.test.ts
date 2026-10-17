/**
 * Phase 2 regression tests:
 *  - profit margin & markup calculator
 *  - EMI calculator (incl. zero-interest)
 *  - offline currency conversion (bundled + manual rate)
 *  - HSN/SAC search (exact, prefix, description, no-match, category)
 *  - tools pinning & search partitioning (localStorage persistence)
 *  - document numbering for the four new document types
 *  - font stacks & custom theme colour
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { resetForTests } from '../lib/db/idb';
import * as repo from '../lib/db/repository';
import { calculateProfitMargin, calculateEMI, tenureToMonths } from '../lib/business-calculators';
import {
  convertCurrency, getBundledRate, searchCurrencies, setManualRate,
  clearManualRate, getManualRate, CURRENCIES,
} from '../lib/currency-rates';
import { searchHsn, HSN_ENTRIES } from '../lib/hsn-data';
import { partitionPinned, togglePin } from '../lib/tools-prefs';
import { getFontStack, FONT_OPTIONS, getThemeColor } from '../lib/themes';
import { isKnownDocumentType, DOCUMENT_TYPES } from '../types/document';

const freshDB = async () => {
  globalThis.indexedDB = new IDBFactory() as unknown as IDBFactory & typeof indexedDB;
  resetForTests();
};
beforeEach(freshDB);

// ---------------------------------------------------------------- profit margin
describe('profit margin calculator', () => {
  test('profit: margin is on revenue, markup is on cost', () => {
    // cost 800, sell 1000, qty 1 -> profit 200
    const r = calculateProfitMargin({ costPrice: 800, sellingPrice: 1000, quantity: 1 });
    expect(r.valid).toBe(true);
    expect(r.profit).toBe(200);
    expect(r.isLoss).toBe(false);
    expect(r.marginPercent).toBe(20);   // 200/1000
    expect(r.markupPercent).toBe(25);   // 200/800
  });

  test('quantity scales totals without changing percentages', () => {
    const r = calculateProfitMargin({ costPrice: 800, sellingPrice: 1000, quantity: 5 });
    expect(r.totalCost).toBe(4000);
    expect(r.totalRevenue).toBe(5000);
    expect(r.profit).toBe(1000);
    expect(r.marginPercent).toBe(20);
  });

  test('loss is flagged and negative', () => {
    const r = calculateProfitMargin({ costPrice: 1000, sellingPrice: 800, quantity: 1 });
    expect(r.isLoss).toBe(true);
    expect(r.profit).toBe(-200);
    expect(r.marginPercent).toBe(-25);
    expect(r.markupPercent).toBe(-20);
  });

  test('zero revenue -> margin undefined, markup defined', () => {
    const r = calculateProfitMargin({ costPrice: 500, sellingPrice: 0, quantity: 1 });
    expect(r.valid).toBe(true);
    expect(r.marginPercent).toBeNull();
    expect(r.markupPercent).toBe(-100);
  });

  test('zero cost -> markup undefined, margin 100', () => {
    const r = calculateProfitMargin({ costPrice: 0, sellingPrice: 500, quantity: 1 });
    expect(r.valid).toBe(true);
    expect(r.markupPercent).toBeNull();
    expect(r.marginPercent).toBe(100);
  });

  test('negative and invalid inputs are rejected safely', () => {
    expect(calculateProfitMargin({ costPrice: -5, sellingPrice: 10, quantity: 1 }).valid).toBe(false);
    expect(calculateProfitMargin({ costPrice: NaN, sellingPrice: 10, quantity: 1 }).valid).toBe(false);
    // quantity 0 or NaN falls back to 1 (optional field)
    const q = calculateProfitMargin({ costPrice: 100, sellingPrice: 150, quantity: NaN });
    expect(q.totalRevenue).toBe(150);
  });

  test('decimal rounding stays exact at 2 places', () => {
    const r = calculateProfitMargin({ costPrice: 33.335, sellingPrice: 66.665, quantity: 3 });
    expect(r.totalCost).toBeCloseTo(100.01, 2);
    expect(r.totalRevenue).toBeCloseTo(200.0, 2);
  });
});

// ---------------------------------------------------------------- EMI
describe('EMI calculator', () => {
  test('standard reducing balance EMI (known value)', () => {
    // 5,00,000 @ 9% for 60 months -> EMI 10,379.18 (standard EMI formula)
    const r = calculateEMI({ principal: 500000, annualRatePercent: 9, tenureMonths: 60 });
    expect(r.valid).toBe(true);
    expect(r.emi).toBeCloseTo(10379.18, 1);
    expect(r.totalPayment).toBeCloseTo(622750.8, 1);
    expect(r.totalInterest).toBeCloseTo(122750.8, 1);
    expect(r.isZeroInterest).toBe(false);
  });

  test('zero-interest loan splits principal evenly', () => {
    const r = calculateEMI({ principal: 120000, annualRatePercent: 0, tenureMonths: 12 });
    expect(r.valid).toBe(true);
    expect(r.isZeroInterest).toBe(true);
    expect(r.emi).toBe(10000);
    expect(r.totalInterest).toBe(0);
    expect(r.interestSharePercent).toBe(0);
  });

  test('invalid principal / rate / tenure rejected', () => {
    expect(calculateEMI({ principal: 0, annualRatePercent: 9, tenureMonths: 12 }).valid).toBe(false);
    expect(calculateEMI({ principal: -5, annualRatePercent: 9, tenureMonths: 12 }).valid).toBe(false);
    expect(calculateEMI({ principal: 100, annualRatePercent: 150, tenureMonths: 12 }).valid).toBe(false);
    expect(calculateEMI({ principal: 100, annualRatePercent: 9, tenureMonths: 0 }).valid).toBe(false);
    expect(calculateEMI({ principal: 100, annualRatePercent: 9, tenureMonths: 13 * 100 + 1 }).valid).toBe(false);
  });

  test('tenure conversion years <-> months', () => {
    expect(tenureToMonths(5, 'years')).toBe(60);
    expect(tenureToMonths(18, 'months')).toBe(18);
    expect(tenureToMonths(0, 'years')).toBe(0);
  });
});

// ---------------------------------------------------------------- currency
describe('offline currency conversion', () => {
  test('known bundled rate: USD -> INR', () => {
    const r = convertCurrency(100, 'USD', 'INR');
    expect(r.ok).toBe(true);
    expect(r.isManual).toBe(false);
    expect(r.converted).toBe(8400);       // 100 x 84.0
    expect(r.asOf).toBe('2025-01-01');
  });

  test('cross rate via USD base: EUR -> INR', () => {
    const r = convertCurrency(100, 'EUR', 'INR');
    expect(r.ok).toBe(true);
    // 100 EUR -> 100/0.92 USD -> 108.695... USD -> x 84 INR
    expect(r.converted).toBeCloseTo(9130.43, 0);
  });

  test('same currency is identity', () => {
    const r = convertCurrency(75.5, 'INR', 'INR');
    expect(r.ok).toBe(true);
    expect(r.converted).toBe(75.5);
  });

  test('invalid amounts rejected', () => {
    expect(convertCurrency(-1, 'USD', 'INR').ok).toBe(false);
    expect(convertCurrency(NaN, 'USD', 'INR').ok).toBe(false);
    expect(convertCurrency(10, 'USD', 'ZZZ').ok).toBe(false);
  });

  test('manual rate override is used and remembered, then cleared', () => {
    if (typeof localStorage === 'undefined') {
      // no storage environment: manual rates degrade gracefully to bundled rates
      setManualRate('USD', 'INR', 85.5); // must not throw
      expect(convertCurrency(100, 'USD', 'INR').isManual).toBe(false);
      return;
    }
    setManualRate('USD', 'INR', 85.5);
    const saved = getManualRate('USD', 'INR');
    expect(saved?.rate).toBe(85.5);
    const r = convertCurrency(100, 'USD', 'INR');
    expect(r.ok).toBe(true);
    expect(r.isManual).toBe(true);
    expect(r.converted).toBe(8550);
    clearManualRate('USD', 'INR');
    expect(getManualRate('USD', 'INR')).toBeUndefined();
    const back = convertCurrency(100, 'USD', 'INR');
    expect(back.isManual).toBe(false);
    expect(back.converted).toBe(8400);
  });

  test('currency list search by code and name', () => {
    expect(searchCurrencies(CURRENCIES, 'inr')[0].code).toBe('INR');
    expect(searchCurrencies(CURRENCIES, 'yen').map((c) => c.code)).toContain('JPY');
    expect(searchCurrencies(CURRENCIES, 'zzz')).toEqual([]);
  });

  test('bundled rate lookup', () => {
    expect(getBundledRate('USD', 'USD')).toBe(1);
    expect(getBundledRate('AED', 'USD')).toBeCloseTo(1 / 3.6725, 6);
    expect(getBundledRate('USD', 'ZZZ')).toBeNull();
  });
});

// ---------------------------------------------------------------- HSN / SAC
describe('HSN/SAC finder', () => {
  test('exact code match is surfaced', () => {
    const r = searchHsn('7318');
    expect(r.exactMatch?.description).toContain('Screws');
    expect(r.entries.length).toBeGreaterThan(0);
  });

  test('code prefix search ranks prefix matches first', () => {
    const r = searchHsn('731');
    expect(r.entries[0].code.startsWith('731')).toBe(true);
  });

  test('multi-word description search', () => {
    const r = searchHsn('freight transport road');
    expect(r.entries.some((e) => e.code === '998511')).toBe(true);
  });

  test('no match returns empty with no fabrication', () => {
    const r = searchHsn('quantum banana submarine');
    expect(r.entries).toEqual([]);
    expect(r.exactMatch).toBeNull();
  });

  test('category filter applies', () => {
    const r = searchHsn('', 'Services (SAC)');
    expect(r.entries.length).toBeGreaterThan(0);
    expect(r.entries.every((e) => e.kind === 'SAC')).toBe(true);
  });

  test('SAC and HSN entries both present; dataset is non-trivial', () => {
    expect(HSN_ENTRIES.some((e) => e.kind === 'SAC')).toBe(true);
    expect(HSN_ENTRIES.some((e) => e.kind === 'HSN')).toBe(true);
    expect(HSN_ENTRIES.length).toBeGreaterThan(100);
  });
});

// ---------------------------------------------------------------- tools prefs
describe('tools pinning', () => {
  test('toggle pin adds and removes', () => {
    expect(togglePin('gst', [])).toEqual(['gst']);
    expect(togglePin('gst', ['gst'])).toEqual([]);
    expect(togglePin('emi', ['gst'])).toEqual(['gst', 'emi']);
  });

  test('partition: pinned first, never duplicated in rest', () => {
    const tools = [{ id: 'gst' as const }, { id: 'emi' as const }, { id: 'words' as const }];
    const { pinned, rest } = partitionPinned(tools, ['emi']);
    expect(pinned.map((t) => t.id)).toEqual(['emi']);
    expect(rest.map((t) => t.id)).toEqual(['gst', 'words']);
    // a pin that no longer exists is ignored
    const bad = partitionPinned(tools, ['nonexistent' as never, 'gst']);
    expect(bad.pinned.map((t) => t.id)).toEqual(['gst']);
  });
});

// ---------------------------------------------------------------- numbering
describe('sequential numbering for new document types', () => {
  test('each new type gets its own prefix and counter', async () => {
    const po = await repo.nextDocumentNumber('purchase_order');
    const chn = await repo.nextDocumentNumber('delivery_challan');
    const crn = await repo.nextDocumentNumber('credit_note');
    const dbn = await repo.nextDocumentNumber('debit_note');
    const year = new Date().getFullYear();
    expect(po).toBe(`PO-${year}-0001`);
    expect(chn).toBe(`CHN-${year}-0001`);
    expect(crn).toBe(`CRN-${year}-0001`);
    expect(dbn).toBe(`DBN-${year}-0001`);
    const po2 = await repo.nextDocumentNumber('purchase_order');
    expect(po2).toBe(`PO-${year}-0002`);
  });
});

// ---------------------------------------------------------------- fonts & theme
describe('document fonts and custom accent', () => {
  test('font stacks exist for all three options with sane defaults', () => {
    expect(FONT_OPTIONS.map((f) => f.id)).toEqual(['sans', 'serif', 'mono']);
    expect(getFontStack('serif')).toContain('Georgia');
    expect(getFontStack(undefined)).toContain('Segoe UI');
    expect(getFontStack('mono')).toContain('monospace');
  });

  test('custom accent hex drives the theme', () => {
    const t = getThemeColor('custom', '#1a2b3c');
    expect(t.primary).toBe('#1a2b3c');
    // invalid/absent custom falls back safely
    const fallback = getThemeColor('custom');
    expect(fallback.primary).toBe('#593C8F');
    expect(getThemeColor('plum').name).toBe('Royal Plum');
  });
});

// ---------------------------------------------------------------- type registry
describe('document type registry', () => {
  test('all nine types are known; unknown strings rejected', () => {
    expect(DOCUMENT_TYPES.length).toBe(9);
    expect(isKnownDocumentType('purchase_order')).toBe(true);
    expect(isKnownDocumentType('delivery_challan')).toBe(true);
    expect(isKnownDocumentType('credit_note')).toBe(true);
    expect(isKnownDocumentType('debit_note')).toBe(true);
    expect(isKnownDocumentType('not_a_type')).toBe(false);
  });
});
