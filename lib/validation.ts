import { DocumentModel } from '@/types/document';
import { safeEvaluateExpression } from './safe-eval';

export interface HealthCheckItem {
  id: string;
  label: string;
  passed: boolean;
  message: string;
  fieldTarget: string;
  isWarningOnly?: boolean;
}

export interface HealthCheckResult {
  isReady: boolean;
  score: number; // 0 - 100
  passedCount: number;
  totalCount: number;
  items: HealthCheckItem[];
  blockingErrors: string[];
}

export function performDocumentHealthCheck(doc: DocumentModel): HealthCheckResult {
  const items: HealthCheckItem[] = [];
  const blockingErrors: string[] = [];

  // 1. Document Number
  const hasDocNumber = Boolean(doc.meta.documentNumber && doc.meta.documentNumber.trim().length > 0);
  items.push({
    id: 'doc-number',
    label: 'Document Number',
    passed: hasDocNumber,
    message: hasDocNumber ? `Number set: ${doc.meta.documentNumber}` : 'Document number is required.',
    fieldTarget: 'meta-number',
  });
  if (!hasDocNumber) blockingErrors.push('Document number is missing.');

  // 2. Document Date
  const hasDocDate = Boolean(doc.meta.date && !isNaN(Date.parse(doc.meta.date)));
  items.push({
    id: 'doc-date',
    label: 'Document Date',
    passed: hasDocDate,
    message: hasDocDate ? `Valid date: ${doc.meta.date}` : 'Document date is missing or invalid.',
    fieldTarget: 'meta-date',
  });
  if (!hasDocDate) blockingErrors.push('Document date is missing or invalid.');

  // 3. Business Name
  const hasBusinessName = Boolean(doc.business.name && doc.business.name.trim().length > 0);
  items.push({
    id: 'business-name',
    label: 'Business Details',
    passed: hasBusinessName,
    message: hasBusinessName ? doc.business.name : 'Business name is missing.',
    fieldTarget: 'business-name',
  });
  if (!hasBusinessName) blockingErrors.push('Business name is required.');

  // 4. Customer Name / Company
  const hasCustomer = Boolean(
    (doc.customer.name && doc.customer.name.trim().length > 0) ||
    (doc.customer.company && doc.customer.company.trim().length > 0)
  );
  items.push({
    id: 'customer-name',
    label: 'Customer Information',
    passed: hasCustomer,
    message: hasCustomer ? (doc.customer.name || doc.customer.company) : 'Add customer name or company name.',
    fieldTarget: 'customer-name',
  });
  if (!hasCustomer) blockingErrors.push('Customer information is required.');

  // 5. At least 1 item with positive values
  const hasItems = doc.items.length > 0;
  const validItems = doc.items.every(i => {
    const qty = safeEvaluateExpression(i.quantity);
    const rate = safeEvaluateExpression(i.rate);
    return Boolean(i.name.trim()) && qty > 0 && rate >= 0;
  });
  const itemsPassed = hasItems && validItems;

  items.push({
    id: 'items-valid',
    label: 'Line Items',
    passed: itemsPassed,
    message: itemsPassed
      ? `${doc.items.length} item(s) configured`
      : (!hasItems ? 'Add at least one item before exporting.' : 'Some items have missing names or zero quantity.'),
    fieldTarget: 'items-section',
  });
  if (!itemsPassed) {
    blockingErrors.push(!hasItems ? 'Add at least one line item.' : 'Ensure all items have descriptions and valid quantity.');
  }

  // 6. Tax Configuration
  let taxPassed = true;
  let taxMessage = 'Taxes configured';
  if (doc.tax.mode === 'gst') {
    if (doc.business.gstin && doc.business.gstin.trim().length > 0 && doc.business.gstin.trim().length < 15) {
      taxPassed = false;
      taxMessage = 'GSTIN should ideally be 15 characters.';
    } else {
      taxMessage = doc.tax.gstType === 'cgst_sgst' ? 'GST Mode: CGST + SGST' : 'GST Mode: IGST';
    }
  }
  items.push({
    id: 'tax-config',
    label: 'Tax Configuration',
    passed: taxPassed,
    message: taxMessage,
    fieldTarget: 'tax-section',
    isWarningOnly: !taxPassed,
  });

  // 7. Payment details check
  let paymentPassed = true;
  let paymentMessage = 'Payment method specified';
  if (doc.payment.method === 'upi' && doc.payment.showUPIQR) {
    if (!doc.payment.upiId || !doc.payment.upiId.includes('@')) {
      paymentPassed = false;
      paymentMessage = 'Enter a valid UPI ID (e.g. name@okhdfcbank) to render QR.';
    } else {
      paymentMessage = `UPI QR linked to ${doc.payment.upiId}`;
    }
  } else if (doc.payment.method === 'bank') {
    if (!doc.payment.bankName && !doc.payment.accountNumber) {
      paymentPassed = false;
      paymentMessage = 'Bank name or account number recommended.';
    }
  }
  items.push({
    id: 'payment-details',
    label: 'Payment Information',
    passed: paymentPassed,
    message: paymentMessage,
    fieldTarget: 'payment-section',
    isWarningOnly: true,
  });

  const passedCount = items.filter(i => i.passed).length;
  const score = Math.round((passedCount / items.length) * 100);
  const isReady = blockingErrors.length === 0;

  return {
    isReady,
    score,
    passedCount,
    totalCount: items.length,
    items,
    blockingErrors,
  };
}
