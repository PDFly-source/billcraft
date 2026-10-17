/**
 * Payment balances and dashboard aggregation.
 * Sales-reporting rules (applied consistently everywhere):
 *  - Only invoices count toward invoiced sales / receivables.
 *    Quotations, estimates, proforma and receipts are excluded from sales.
 *  - Cancelled invoices are excluded from active receivables.
 *  - "Paid" is actual payments recorded against invoices, never the invoice total.
 */
import { SavedDocument, PaymentRecord } from '@/types/local';
import { toMinor, fromMinor } from './calculations';

export interface DocumentBalance {
  total: number;
  paid: number;
  balance: number;
  overdue: boolean;
  statusLabel: 'paid' | 'partial' | 'unpaid' | 'cancelled' | 'other';
}

export function isInvoice(d: SavedDocument): boolean { return d.type === 'invoice'; }

export function isActiveInvoice(d: SavedDocument): boolean {
  return isInvoice(d) && d.status !== 'cancelled';
}

export function isOverdue(d: SavedDocument, today = new Date()): boolean {
  if (!isActiveInvoice(d) || d.status === 'paid') return false;
  if (!d.dueDate) return false;
  const due = new Date(d.dueDate + 'T23:59:59');
  return due.getTime() < today.getTime();
}

export function documentBalance(d: SavedDocument, today = new Date()): DocumentBalance {
  const total = fromMinor(d.totalMinor || 0);
  const paid = fromMinor(d.amountPaidMinor || 0);
  const balance = fromMinor(Math.max(0, (d.totalMinor || 0) - (d.amountPaidMinor || 0)));
  let statusLabel: DocumentBalance['statusLabel'] = 'other';
  if (d.status === 'cancelled') statusLabel = 'cancelled';
  else if (isInvoice(d)) statusLabel = d.status === 'paid' || balance <= 0.004 ? 'paid' : d.status === 'partial' ? 'partial' : 'unpaid';
  return { total, paid, balance, overdue: isOverdue(d, today), statusLabel };
}

export interface PaymentValidation {
  valid: boolean;
  error?: string;
  maxAmountMinor?: number;
}

export function validatePayment(d: SavedDocument, amount: number): PaymentValidation {
  const remaining = (d.totalMinor || 0) - (d.amountPaidMinor || 0);
  if (!isFinite(amount) || amount <= 0) return { valid: false, error: 'Enter a payment amount greater than zero' };
  const amtMinor = toMinor(amount);
  if (d.status === 'cancelled') return { valid: false, error: 'Cancelled invoices cannot take payments' };
  if (amtMinor > remaining) {
    return { valid: false, error: `Amount exceeds the remaining balance of ${fromMinor(remaining).toFixed(2)}`, maxAmountMinor: remaining };
  }
  return { valid: true, maxAmountMinor: remaining };
}

export interface DashboardSummary {
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
  overdue: number;
  documentCount: number;
  invoiceCount: number;
  monthly: { label: string; key: string; invoiced: number; paid: number }[];
  recent: SavedDocument[];
}

/** Builds the dashboard from ACTUAL saved records only. */
export function buildDashboard(docs: SavedDocument[], today = new Date()): DashboardSummary {
  let invoicedMinor = 0;
  let paidMinor = 0;
  const activeInvoices = docs.filter(isActiveInvoice);
  for (const d of activeInvoices) {
    invoicedMinor += d.totalMinor || 0;
    paidMinor += Math.min(d.amountPaidMinor || 0, d.totalMinor || 0);
  }
  // outstanding = invoiced - collected (only non-cancelled invoices)
  let outstandingMinor = 0;
  let overdueMinor = 0;
  for (const d of activeInvoices) {
    const rem = Math.max(0, (d.totalMinor || 0) - (d.amountPaidMinor || 0));
    outstandingMinor += rem;
    if (isOverdue(d, today)) overdueMinor += rem;
  }

  // monthly series: last 12 months incl. current
  const monthly: DashboardSummary['monthly'] = [];
  const base = new Date(today.getFullYear(), today.getMonth(), 1);
  for (let i = 11; i >= 0; i--) {
    const m = new Date(base.getFullYear(), base.getMonth() - i, 1);
    monthly.push({
      key: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`,
      label: m.toLocaleString('en-IN', { month: 'short' }),
      invoiced: 0,
      paid: 0,
    });
  }
  const byKey = new Map(monthly.map((m) => [m.key, m]));
  for (const d of activeInvoices) {
    if (!/^\d{4}-\d{2}/.test(d.issueDate)) continue;
    const entry = byKey.get(d.issueDate.slice(0, 7));
    if (entry) {
      entry.invoiced = fromMinor(toMinor(entry.invoiced) + (d.totalMinor || 0));
      entry.paid = fromMinor(toMinor(entry.paid) + Math.min(d.amountPaidMinor || 0, d.totalMinor || 0));
    }
  }

  return {
    totalInvoiced: fromMinor(invoicedMinor),
    totalPaid: fromMinor(paidMinor),
    outstanding: fromMinor(outstandingMinor),
    overdue: fromMinor(overdueMinor),
    documentCount: docs.length,
    invoiceCount: activeInvoices.length,
    monthly,
    recent: [...docs].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)).slice(0, 5),
  };
}

export function searchDocuments(docs: SavedDocument[], q: string): SavedDocument[] {
  const t = (q || '').trim().toLowerCase();
  if (!t) return docs;
  return docs.filter(
    (d) =>
      d.documentNumber.toLowerCase().includes(t) ||
      d.clientName.toLowerCase().includes(t) ||
      d.type.includes(t)
  );
}

export function filterDocuments(
  docs: SavedDocument[],
  f: { type?: string; status?: string; from?: string; to?: string }
): SavedDocument[] {
  return docs.filter((d) => {
    if (f.type && f.type !== 'all' && d.type !== f.type) return false;
    if (f.status && f.status !== 'all') {
      const b = documentBalance(d);
      if (f.status === 'overdue' ? !b.overdue : d.status !== f.status) return false;
    }
    if (f.from && d.issueDate && d.issueDate < f.from) return false;
    if (f.to && d.issueDate && d.issueDate > f.to) return false;
    return true;
  });
}

export const SORTERS: Record<string, (a: SavedDocument, b: SavedDocument) => number> = {
  'date-desc': (a, b) => (a.issueDate < b.issueDate ? 1 : -1),
  'date-asc': (a, b) => (a.issueDate > b.issueDate ? 1 : -1),
  'amount-desc': (a, b) => (b.totalMinor || 0) - (a.totalMinor || 0),
  'amount-asc': (a, b) => (a.totalMinor || 0) - (b.totalMinor || 0),
  'number-desc': (a, b) => b.documentNumber.localeCompare(a.documentNumber),
  'number-asc': (a, b) => a.documentNumber.localeCompare(b.documentNumber),
};

// ===================== Phase 3: payment summary =====================
// ONE shared source for editor badge, preview, PDF, payment history and
// dashboard balance maths. All values are exact paise integers.

export type DocPaymentLite = { id: string; date: string; amountMinor: number; method?: string; reference?: string };
export type PaidStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

export interface PaymentSummary {
  paidMinor: number;
  balanceMinor: number;
  status: PaidStatus;
  /** human label like '₹1,180.00 paid · ₹350.00 due' (formatted by caller) */
  paymentCount: number;
}

/** Sum of recorded payments; malformed records contribute zero. */
export function sumPaymentsMinor(payments: DocPaymentLite[] | undefined | null): number {
  if (!Array.isArray(payments)) return 0;
  let total = 0;
  for (const p of payments) {
    const m = Math.round(Number(p?.amountMinor));
    if (isFinite(m) && m > 0) total += m;
  }
  return total;
}

/** Shared balance/status engine: total payable minus recorded payments. */
export function paymentSummary(totalMinor: number, payments: DocPaymentLite[] | undefined | null): PaymentSummary {
  const total = Math.max(0, Math.round(Number(totalMinor) || 0));
  const paidMinor = sumPaymentsMinor(payments);
  const balanceMinor = Math.max(0, total - paidMinor);
  let status: PaidStatus = 'UNPAID';
  if (paidMinor > 0 && balanceMinor <= 0) status = 'PAID';
  else if (paidMinor > 0) status = 'PARTIAL';
  return { paidMinor, balanceMinor, status, paymentCount: Array.isArray(payments) ? payments.length : 0 };
}

export interface AddPaymentValidation {
  valid: boolean;
  error?: string;
  amountMinor?: number;
}

/** Validate a new payment against the document's payable total and the
 *  already-recorded payments. Overpayments are rejected (they are not
 *  represented anywhere in the app). */
export function validateDocPayment(totalMinor: number, existing: DocPaymentLite[], amount: number): AddPaymentValidation {
  if (!isFinite(amount) || amount <= 0) return { valid: false, error: 'Enter a payment amount greater than zero' };
  const amtMinor = Math.round(amount * 100);
  const { balanceMinor } = paymentSummary(totalMinor, existing);
  if (amtMinor > balanceMinor) {
    return {
      valid: false,
      error: `Payment cannot exceed the outstanding balance of ${(balanceMinor / 100).toFixed(2)}`,
      amountMinor: balanceMinor,
    };
  }
  return { valid: true, amountMinor: amtMinor };
}

/** Duplicate submission guard: same amount (paise), same date AND same
 *  reference already recorded. */
export function isDuplicatePayment(existing: DocPaymentLite[], amountMinor: number, date: string, reference: string): boolean {
  return existing.some(
    (p) =>
      Math.round(p.amountMinor) === Math.round(amountMinor) &&
      (p.date || '') === (date || '') &&
      (p.reference || '') === (reference || ''),
  );
}
