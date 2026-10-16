import { DocumentItem, DocumentModel, DocumentCalculations } from '@/types/document';
import { safeEvaluateExpression } from './safe-eval';
import { amountToWords } from './currency';

/**
 * Financial engine — deterministic, integer-minor-unit (paise) arithmetic.
 *
 * Every rupee value is converted to an integer number of paise before any
 * addition, subtraction or percentage is applied, so 0.1 + 0.2 never becomes
 * 0.30000000000000004 and mixed tax rates can never drift from their totals.
 * The only float operations allowed are the single rounding at the point a
 * quantity × rate is computed, and percentage divisions which are rounded
 * back to whole paise immediately.
 */

/** rupees -> paise, rounded once */
export function toMinor(amount: number): number {
  if (!isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

/** paise -> rupees */
export function fromMinor(minor: number): number {
  return minor / 100;
}

export function roundTo2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/** percentage of an integer amount, rounded to whole paise */
function pctOf(minor: number, pct: number): number {
  if (minor <= 0 || pct <= 0) return 0;
  return Math.round((minor * pct) / 100);
}

export function calculateItemRow(item: DocumentItem): {
  quantity: number;
  rate: number;
  subtotal: number;
  discountAmount: number;
  taxable: number;
  taxAmount: number;
  total: number;
} {
  const qty = safeEvaluateExpression(item.quantity);
  const rate = safeEvaluateExpression(item.rate);
  // the ONE place float rounding happens: line amount to exact paise
  const subtotalMinor = toMinor(Math.max(0, qty) * Math.max(0, rate));

  let discountMinor = 0;
  const dv = Math.max(0, Number(item.discountValue) || 0);
  if (item.discountType === 'percent') {
    discountMinor = pctOf(subtotalMinor, dv);
  } else {
    discountMinor = Math.min(subtotalMinor, toMinor(dv));
  }

  const taxableMinor = Math.max(0, subtotalMinor - discountMinor);
  const taxRate = Math.max(0, Number(item.taxRate) || 0);
  const taxMinor = pctOf(taxableMinor, taxRate);
  const totalMinor = taxableMinor + taxMinor;

  return {
    quantity: qty,
    rate,
    subtotal: fromMinor(subtotalMinor),
    discountAmount: fromMinor(discountMinor),
    taxable: fromMinor(taxableMinor),
    taxAmount: fromMinor(taxMinor),
    total: fromMinor(totalMinor),
  };
}

export function calculateDocument(doc: DocumentModel): DocumentCalculations {
  const rows = doc.items.map((item) => {
    const row = calculateItemRow(item);
    return {
      subtotalMinor: toMinor(row.subtotal),
      discountMinor: toMinor(row.discountAmount),
      taxableMinor: toMinor(row.taxable),
      taxRate: Math.max(0, Number(item.taxRate) || 0),
    };
  });

  const subtotalMinor = rows.reduce((s, r) => s + r.subtotalMinor, 0);
  const itemDiscountsMinor = rows.reduce((s, r) => s + r.discountMinor, 0);
  const afterItemDiscountsMinor = Math.max(0, subtotalMinor - itemDiscountsMinor);

  // ---- overall (document-level) discount, rounded ONCE to whole paise ----
  let overallDiscountMinor = 0;
  if (doc.discount && doc.discount.type !== 'none' && Number(doc.discount.value) > 0) {
    if (doc.discount.type === 'percent') {
      overallDiscountMinor = pctOf(afterItemDiscountsMinor, Math.max(0, Number(doc.discount.value)));
    } else {
      overallDiscountMinor = Math.min(afterItemDiscountsMinor, toMinor(Math.max(0, Number(doc.discount.value))));
    }
  }
  const totalDiscountMinor = itemDiscountsMinor + overallDiscountMinor;
  const taxableAmountMinor = Math.max(0, afterItemDiscountsMinor - overallDiscountMinor);

  // ---- tax: per item (supports MIXED rates), pro-rated for the overall discount ----
  let cgstMinor = 0;
  let sgstMinor = 0;
  let igstMinor = 0;
  let customTaxMinor = 0;

  const proportion =
    afterItemDiscountsMinor > 0 ? taxableAmountMinor / afterItemDiscountsMinor : 0;

  if (doc.tax.mode === 'gst') {
    for (const r of rows) {
      if (r.taxRate <= 0) continue;
      const effectiveTaxableMinor = Math.round(r.taxableMinor * proportion);
      const taxMinor = pctOf(effectiveTaxableMinor, r.taxRate);
      if (doc.tax.gstType === 'cgst_sgst') {
        const half = Math.round(taxMinor / 2);
        cgstMinor += half;
        sgstMinor += taxMinor - half; // halves always sum to the exact item tax
      } else {
        igstMinor += taxMinor;
      }
    }
  } else if (doc.tax.mode === 'custom') {
    const rate = Math.max(0, Number(doc.tax.customTaxRate) || 0);
    if (doc.tax.customTaxInclusive && rate > 0) {
      // tax-inclusive custom pricing: taxableAmountMinor is the GROSS;
      // extract the tax portion exactly: gross * r / (100 + r)
      customTaxMinor = Math.round((taxableAmountMinor * rate) / (100 + rate));
    } else {
      customTaxMinor = pctOf(taxableAmountMinor, rate);
    }
  }

  const totalTaxMinor = cgstMinor + sgstMinor + igstMinor + customTaxMinor;

  const rawTotalMinor = taxableAmountMinor + totalTaxMinor;

  let roundOffMinor = 0;
  let grandTotalMinor = rawTotalMinor;
  if (doc.autoRoundOff) {
    const roundedMinor = Math.round(rawTotalMinor / 100) * 100; // nearest rupee
    roundOffMinor = roundedMinor - rawTotalMinor;
    grandTotalMinor = roundedMinor;
  }
  grandTotalMinor = Math.max(0, grandTotalMinor);

  const grandTotal = fromMinor(grandTotalMinor);
  const words = amountToWords(grandTotal, doc.currency);

  return {
    subtotal: fromMinor(subtotalMinor),
    itemDiscountsTotal: fromMinor(itemDiscountsMinor),
    overallDiscountTotal: fromMinor(overallDiscountMinor),
    totalDiscount: fromMinor(totalDiscountMinor),
    taxableAmount: fromMinor(taxableAmountMinor),
    cgst: fromMinor(cgstMinor),
    sgst: fromMinor(sgstMinor),
    igst: fromMinor(igstMinor),
    customTax: fromMinor(customTaxMinor),
    totalTax: fromMinor(totalTaxMinor),
    rawTotal: fromMinor(rawTotalMinor),
    roundOff: fromMinor(roundOffMinor),
    grandTotal,
    amountInWords: words,
  };
}
