import { DocumentItem, DocumentModel, DocumentCalculations } from '@/types/document';
import { safeEvaluateExpression } from './safe-eval';
import { amountToWords } from './currency';

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
  const subtotal = Math.max(0, qty * rate);

  let discountAmount = 0;
  if (item.discountType === 'percent') {
    discountAmount = (subtotal * Math.max(0, item.discountValue || 0)) / 100;
  } else {
    discountAmount = Math.min(subtotal, Math.max(0, item.discountValue || 0));
  }

  const taxable = Math.max(0, subtotal - discountAmount);
  const taxRate = Math.max(0, item.taxRate || 0);
  const taxAmount = (taxable * taxRate) / 100;
  const total = taxable + taxAmount;

  return {
    quantity: qty,
    rate,
    subtotal: roundTo2(subtotal),
    discountAmount: roundTo2(discountAmount),
    taxable: roundTo2(taxable),
    taxAmount: roundTo2(taxAmount),
    total: roundTo2(total),
  };
}

export function calculateDocument(doc: DocumentModel): DocumentCalculations {
  let subtotal = 0;
  let itemDiscountsTotal = 0;
  let itemTaxSum = 0;

  doc.items.forEach((item) => {
    const row = calculateItemRow(item);
    subtotal += row.subtotal;
    itemDiscountsTotal += row.discountAmount;
    itemTaxSum += row.taxAmount;
  });

  subtotal = roundTo2(subtotal);
  itemDiscountsTotal = roundTo2(itemDiscountsTotal);

  // Overall Document Discount
  let overallDiscountTotal = 0;
  const afterItemDiscounts = Math.max(0, subtotal - itemDiscountsTotal);

  if (doc.discount && doc.discount.type !== 'none' && doc.discount.value > 0) {
    if (doc.discount.type === 'percent') {
      overallDiscountTotal = (afterItemDiscounts * doc.discount.value) / 100;
    } else {
      overallDiscountTotal = Math.min(afterItemDiscounts, doc.discount.value);
    }
  }
  overallDiscountTotal = roundTo2(overallDiscountTotal);
  const totalDiscount = roundTo2(itemDiscountsTotal + overallDiscountTotal);

  const taxableAmount = Math.max(0, roundTo2(subtotal - totalDiscount));

  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let customTax = 0;
  let totalTax = 0;

  if (doc.tax.mode === 'gst') {
    // If items have individual tax rates, compute weighted or check default rate
    // If items have explicit taxes set on items, use them adjusted for overall discount, or calculate from taxableAmount
    const effectiveTaxRate = doc.items.length > 0
      ? (doc.items.reduce((acc, i) => acc + (Number(i.taxRate) || 0), 0) / doc.items.length)
      : 18;

    const baseTax = roundTo2((taxableAmount * effectiveTaxRate) / 100);

    if (doc.tax.gstType === 'cgst_sgst') {
      cgst = roundTo2(baseTax / 2);
      sgst = roundTo2(baseTax / 2);
      totalTax = roundTo2(cgst + sgst);
    } else {
      igst = baseTax;
      totalTax = igst;
    }
  } else if (doc.tax.mode === 'custom') {
    const rate = Math.max(0, doc.tax.customTaxRate || 0);
    customTax = roundTo2((taxableAmount * rate) / 100);
    totalTax = customTax;
  } else {
    // TaxMode 'none'
    totalTax = 0;
  }

  const rawTotal = roundTo2(taxableAmount + totalTax);

  let roundOff = 0;
  let grandTotal = rawTotal;

  if (doc.autoRoundOff) {
    const rounded = Math.round(rawTotal);
    roundOff = roundTo2(rounded - rawTotal);
    grandTotal = rounded;
  }

  grandTotal = Math.max(0, roundTo2(grandTotal));

  const words = amountToWords(grandTotal, doc.currency);

  return {
    subtotal,
    itemDiscountsTotal,
    overallDiscountTotal,
    totalDiscount,
    taxableAmount,
    cgst,
    sgst,
    igst,
    customTax,
    totalTax,
    rawTotal,
    roundOff,
    grandTotal,
    amountInWords: words,
  };
}

export function roundTo2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}
