import { DocumentModel, PaymentMethod } from '@/types/document';
import { validatePaymentLink } from '@/lib/validation';

/**
 * SINGLE SOURCE OF TRUTH for how a document's payment information is
 * presented (Phase 4.1). The Mobile Preview Card, the Full A4 Preview,
 * the exported PDF and the print output all consume this view model so
 * the selected payment method, its details and the UPI QR visibility
 * rules can never diverge between output modes.
 *
 * Rules enforced here (see Phase 4.1 spec):
 * - Cash invoices never show UPI/bank as the selected method and never
 *   show a payment QR.
 * - A UPI QR is only shown when the primary method is UPI, the user
 *   enabled "show QR", and a non-empty UPI id exists.
 * - Bank/Card/Cheque/Other always display their own label and never
 *   silently fall back to UPI.
 * - The payment link is independent of the primary method and is only
 *   included when explicitly enabled and valid.
 */

export interface PaymentDetailLine {
  label: string;
  value: string;
}

export interface PaymentView {
  /** Primary payment method id from the document model. */
  method: PaymentMethod;
  /** Human-readable label for the selected method. */
  label: string;
  /** One-line description shown under the label (may be empty). */
  description: string;
  /** Structured method-specific detail lines (bank / UPI / other). */
  detailLines: PaymentDetailLine[];
  /**
   * Whether a real, scannable UPI payment QR may be displayed.
   * The QR image itself is generated asynchronously by the caller —
   * this flag only says the conditions for a genuine QR are met.
   */
  showQR: boolean;
  /** UPI id the QR must encode (present iff showQR is true). */
  qrUpiId: string;
  /** Payee name the QR should encode (falls back to the business name). */
  qrPayeeName: string;
  /** Whether the explicitly-enabled, valid payment link is included. */
  showPaymentLink: boolean;
  /** The validated payment link URL (present iff showPaymentLink). */
  paymentLink: string;
  /** Whether any method-specific details exist at all. */
  hasDetails: boolean;
}

/** Labels match the PaymentEditor exactly — one shared mapping. */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  upi: 'UPI / QR',
  bank: 'Bank Transfer',
  card: 'Card Payment',
  cheque: 'Cheque',
  other: 'Other',
};

const CASH_DESCRIPTION = 'Cash on Delivery / Direct Settlement';

/** Build the normalized payment presentation for a document. */
export function getPaymentView(doc: DocumentModel): PaymentView {
  const p = doc.payment;
  const label = PAYMENT_METHOD_LABELS[p.method] ?? PAYMENT_METHOD_LABELS.other;
  const detailLines: PaymentDetailLine[] = [];
  let description = '';

  if (p.method === 'bank' || p.method === 'other') {
    // Mirror the editor: bank fields are offered for Bank Wire and Other.
    if (p.bankName) detailLines.push({ label: 'Bank', value: p.bankName });
    if (p.accountHolder || doc.business.name) {
      detailLines.push({ label: 'A/C Name', value: p.accountHolder || doc.business.name });
    }
    if (p.accountNumber) detailLines.push({ label: 'A/C No', value: p.accountNumber });
    if (p.ifsc) detailLines.push({ label: 'IFSC', value: p.ifsc });
    if (p.branch) detailLines.push({ label: 'Branch', value: p.branch });
  }

  if (p.method === 'upi') {
    if (p.upiId) detailLines.push({ label: 'UPI ID', value: p.upiId });
    if (p.upiPayeeName) detailLines.push({ label: 'Payee', value: p.upiPayeeName });
  }

  if (p.method === 'cash') {
    description = CASH_DESCRIPTION;
  } else if (p.method === 'card') {
    description = 'Payment accepted by card';
  } else if (p.method === 'cheque') {
    description = 'Payment accepted by cheque';
  } else if (p.method === 'other') {
    description = 'As arranged with the business';
  } else if (detailLines.length === 0) {
    // UPI/Bank selected but no details filled in yet — show the method
    // label so the mode is never silently hidden.
    description = 'Payment details to be shared';
  }

  // QR conditions: ONLY for a UPI primary method with an id, never for
  // cash/bank/card/cheque/other, and only when the user asked for it.
  const showQR = p.method === 'upi' && p.showUPIQR === true && p.upiId.trim() !== '';
  const qrUpiId = showQR ? p.upiId : '';
  const qrPayeeName = showQR ? p.upiPayeeName || doc.business.name : '';

  // Payment link is fully independent of the primary method.
  const linkCheck = p.showPaymentLink && p.paymentLink ? validatePaymentLink(p.paymentLink) : { valid: false };
  const showPaymentLink = linkCheck.valid === true;

  return {
    method: p.method,
    label,
    description,
    detailLines,
    showQR,
    qrUpiId,
    qrPayeeName,
    showPaymentLink,
    paymentLink: showPaymentLink ? (p.paymentLink as string) : '',
    hasDetails: detailLines.length > 0,
  };
}
