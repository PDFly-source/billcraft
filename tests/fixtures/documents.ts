/** Shared SavedDocument factory for report tests — a minimal but valid
 *  default document that individual tests override per-case. */
import { SavedDocument } from '@/types/local';
import { DocumentModel, DocumentCalculations } from '@/types/document';

const defaultCalc = (taxable = 8475): DocumentCalculations => ({
  subtotal: taxable, itemDiscountsTotal: 0, overallDiscountTotal: 0, totalDiscount: 0,
  taxableAmount: taxable, cgst: Math.round(taxable * 0.09), sgst: Math.round(taxable * 0.09),
  igst: 0, customTax: 0, totalTax: Math.round(taxable * 0.18), rawTotal: Math.round(taxable * 1.18),
  roundOff: 0, grandTotal: Math.round(taxable * 1.18), amountInWords: '',
});

export interface SampleOverrides extends Partial<Omit<SavedDocument, 'document' | 'calc'>> {
  items?: DocumentModel['items'];
  customerGstin?: string;
  placeOfSupply?: string;
  calc?: DocumentCalculations;
  document?: Partial<DocumentModel>;
}

export const SampleDoc = (o: SampleOverrides = {}): SavedDocument => {
  const {
    items, customerGstin = '', placeOfSupply = '', calc, document,
    ...top
  } = o;
  const base: DocumentModel = {
    id: top.id || 'doc_1',
    type: (top.type as DocumentModel['type']) || 'invoice',
    meta: { documentNumber: 'INV-2026-001', date: '2026-04-10', dueDate: '2026-04-24', validUntil: '', referenceNumber: '', placeOfSupply, paymentTerms: 'Net 14 Days', receiptFor: '', amountReceived: 0 },
    business: { name: 'BillCraft Studio', tagline: 'CREATE • CALCULATE • SHARE', address: 'Nalbari, Assam', phone: '', email: '', gstin: '', pan: '', logo: '' },
    customer: { name: top.clientName || 'Acme Solutions', contactPerson: '', phone: '', email: '', address: 'Tower B', gstin: customerGstin, state: '', stateCode: '', shippingAddress: '' },
    items: items || [{
      id: 'it1', name: 'Consulting', description: '', hsn: '998314', quantity: 1, unit: 'service',
      rate: 10000, discountType: 'percent', discountValue: 0, taxRate: 18,
    }],
    discount: { type: 'fixed', value: 0 },
    tax: { mode: 'gst', gstType: 'cgst_sgst', customRate: 0, customLabel: '' },
    payment: { method: 'upi', bankName: '', accountHolder: '', accountNumber: '', ifsc: '', branch: '', upiId: 'billcraft@upi', upiPayeeName: '', showUPIQR: true, notes: '' },
    signature: { type: 'none', image: '', text: '', designation: '' },
    notes: '', terms: '',
    template: 'modern', colorTheme: 'royal_plum', customColor: '',
    currency: 'INR', autoRoundOff: true,
    paperSize: 'a4', orientation: 'portrait', showBillCraftBranding: true,
    ...document,
  };
  const usedCalc = calc || defaultCalc();
  return {
    id: 'doc_1',
    type: 'invoice',
    documentNumber: base.meta.documentNumber,
    document: base,
    calc: usedCalc,
    status: 'unpaid',
    payments: [],
    clientId: null,
    clientName: base.customer.name,
    issueDate: '2026-04-10',
    dueDate: '2026-04-24',
    amountPaidMinor: 0,
    convertedFromId: null,
    convertedToId: null,
    createdAt: '2026-04-10T00:00:00.000Z',
    updatedAt: '2026-04-10T00:00:00.000Z',
    ...top,
    totalMinor: top.totalMinor ?? Math.round(usedCalc.grandTotal * 100),
  } as SavedDocument;
};
