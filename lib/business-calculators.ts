/**
 * Phase 2 business calculator pure functions.
 * No DOM, no storage — fully unit-testable.
 */

export interface ProfitMarginInput {
  costPrice: number;
  sellingPrice: number;
  quantity: number; // default 1 when omitted by the caller
}

export interface ProfitMarginResult {
  valid: boolean;
  error?: string;
  totalCost: number;
  totalRevenue: number;
  profit: number;           // positive = profit, negative = loss
  isLoss: boolean;
  marginPercent: number | null; // profit / revenue x 100 (null when revenue is 0)
  markupPercent: number | null; // profit / cost x 100    (null when cost is 0)
}

export function roundTo2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Profit / loss analysis. Distinguishes MARGIN (profit ÷ revenue) from
 * MARKUP (profit ÷ cost). Safe for zero revenue, zero cost and negatives.
 */
export function calculateProfitMargin(input: ProfitMarginInput): ProfitMarginResult {
  const { costPrice, sellingPrice } = input;
  const quantity = Number.isFinite(input.quantity) && input.quantity > 0 ? input.quantity : 1;

  if (!Number.isFinite(costPrice) || !Number.isFinite(sellingPrice)) {
    return invalidResult('Enter valid numbers for cost and selling price');
  }
  if (costPrice < 0 || sellingPrice < 0) {
    return invalidResult('Cost and selling price cannot be negative');
  }
  // hard numeric guard (safe against absurd magnitudes that break math)
  if (costPrice > 1e12 || sellingPrice > 1e12) {
    return invalidResult('Amount is too large');
  }

  const totalCost = roundTo2(costPrice * quantity);
  const totalRevenue = roundTo2(sellingPrice * quantity);
  const profit = roundTo2(totalRevenue - totalCost);
  const marginPercent = totalRevenue === 0 ? null : roundTo2((profit / totalRevenue) * 100);
  const markupPercent = totalCost === 0 ? null : roundTo2((profit / totalCost) * 100);

  return {
    valid: true,
    totalCost,
    totalRevenue,
    profit,
    isLoss: profit < 0,
    marginPercent,
    markupPercent,
  };
}

function invalidResult(error: string): ProfitMarginResult {
  return {
    valid: false, error, totalCost: 0, totalRevenue: 0,
    profit: 0, isLoss: false, marginPercent: null, markupPercent: null,
  };
}

// ---------------------------------------------------------------------
// EMI
// ---------------------------------------------------------------------

export interface EMIInput {
  principal: number;
  annualRatePercent: number;
  tenureMonths: number;
}

export interface EMIResult {
  valid: boolean;
  error?: string;
  emi: number;
  totalPayment: number;
  totalInterest: number;
  interestSharePercent: number | null;
  isZeroInterest: boolean;
}

/**
 * Standard reducing-balance EMI:
 *   EMI = P x r x (1+r)^n / ((1+r)^n - 1),  r = annual rate / 12 / 100
 * A zero-interest loan is handled as a plain division (no exponent blow-up).
 */
export function calculateEMI(input: EMIInput): EMIResult {
  const { principal, annualRatePercent, tenureMonths } = input;
  if (!Number.isFinite(principal) || !Number.isFinite(annualRatePercent) || !Number.isFinite(tenureMonths)) {
    return { valid: false, error: 'Enter valid numbers', emi: 0, totalPayment: 0, totalInterest: 0, interestSharePercent: null, isZeroInterest: false };
  }
  if (principal <= 0) {
    return { valid: false, error: 'Principal must be greater than zero', emi: 0, totalPayment: 0, totalInterest: 0, interestSharePercent: null, isZeroInterest: false };
  }
  if (principal > 1e12) {
    return { valid: false, error: 'Principal is too large', emi: 0, totalPayment: 0, totalInterest: 0, interestSharePercent: null, isZeroInterest: false };
  }
  if (annualRatePercent < 0 || annualRatePercent > 100) {
    return { valid: false, error: 'Interest rate must be between 0 and 100%', emi: 0, totalPayment: 0, totalInterest: 0, interestSharePercent: null, isZeroInterest: false };
  }
  const n = Math.round(tenureMonths);
  if (n < 1 || n > 1200) {
    return { valid: false, error: 'Tenure must be between 1 month and 100 years', emi: 0, totalPayment: 0, totalInterest: 0, interestSharePercent: null, isZeroInterest: false };
  }

  if (annualRatePercent === 0) {
    const emi = roundTo2(principal / n);
    return {
      valid: true,
      emi,
      totalPayment: roundTo2(emi * n),
      totalInterest: 0,
      interestSharePercent: 0,
      isZeroInterest: true,
    };
  }

  const r = annualRatePercent / 12 / 100;
  const pow = Math.pow(1 + r, n);
  const emi = roundTo2((principal * r * pow) / (pow - 1));
  const totalPayment = roundTo2(emi * n);
  const totalInterest = roundTo2(totalPayment - principal);
  return {
    valid: true,
    emi,
    totalPayment,
    totalInterest,
    interestSharePercent: totalPayment === 0 ? null : roundTo2((totalInterest / totalPayment) * 100),
    isZeroInterest: false,
  };
}

/** Convert a tenure given as years or months into months (integer, >= 1). */
export function tenureToMonths(value: number, unit: 'months' | 'years'): number {
  const months = unit === 'years' ? value * 12 : value;
  if (!Number.isFinite(months) || months < 1) return 0;
  return Math.round(months);
}
