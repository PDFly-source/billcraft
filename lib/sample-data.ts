import { DocumentModel, DocumentType, CurrencyCode, DocumentItem } from '@/types/document';

export const TERMS_PRESETS = [
  'Payment due within 7 days from invoice date.',
  'Payment due within 15 days from invoice date.',
  'Payment due within 30 days from invoice date.',
  'Goods once sold cannot be returned or exchanged.',
  '50% advance required before project commencement, balance on delivery.',
  'Interest @ 18% per annum will be charged on overdue payments.',
  'Please quote the document reference number in all payments and communications.',
];

export const NOTE_PRESETS = [
  'Thank you for your business. It is a pleasure working with you!',
  'Please transfer payment to the account details listed above.',
  'Scan the UPI QR code using any UPI app (GPay, PhonePe, Paytm, etc.) for instant settlement.',
  'All prices are inclusive of applicable taxes unless stated otherwise.',
];

export function getTodayDateString(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

export function getFutureDateString(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

export function generateDocNumber(type: DocumentType): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(100 + Math.random() * 900);
  switch (type) {
    case 'invoice':
      return `INV-${year}-${rand}`;
    case 'quotation':
      return `QT-${year}-${rand}`;
    case 'receipt':
      return `REC-${year}-${rand}`;
    case 'estimate':
      return `EST-${year}-${rand}`;
    case 'proforma':
      return `PI-${year}-${rand}`;
  }
}

export function createEmptyDocument(type: DocumentType = 'invoice', currency: CurrencyCode = 'INR'): DocumentModel {
  return {
    id: `bc_${Date.now()}`,
    type,
    meta: {
      documentNumber: generateDocNumber(type),
      date: getTodayDateString(),
      dueDate: getFutureDateString(14),
      validUntil: getFutureDateString(30),
      referenceNumber: '',
      placeOfSupply: 'Assam (18)',
      paymentTerms: 'Payment due on receipt',
      receiptFor: 'Services Rendered',
      amountReceived: 0,
    },
    business: {
      name: '',
      tagline: '',
      logo: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      gstin: '',
      pan: '',
      state: 'Assam',
      stateCode: '18',
    },
    customer: {
      name: '',
      company: '',
      address: '',
      phone: '',
      email: '',
      gstin: '',
      state: 'Assam',
      stateCode: '18',
      placeOfSupply: 'Assam (18)',
    },
    items: [
      {
        id: `item_${Date.now()}_1`,
        name: '',
        description: '',
        hsn: '998314',
        quantity: 1,
        unit: 'service',
        rate: '',
        discountType: 'percent',
        discountValue: 0,
        taxRate: 18,
      },
    ],
    discount: {
      type: 'none',
      value: 0,
    },
    tax: {
      mode: 'gst',
      gstType: 'cgst_sgst',
      customTaxName: 'VAT',
      customTaxRate: 10,
      customTaxInclusive: false,
    },
    payment: {
      method: 'upi',
      bankName: '',
      accountHolder: '',
      accountNumber: '',
      ifsc: '',
      branch: '',
      upiId: '',
      upiPayeeName: '',
      showUPIQR: true,
      notes: '',
    },
    signature: {
      type: 'text',
      image: '',
      text: '',
      designation: 'Authorized Signatory',
    },
    notes: 'Thank you for your business.',
    terms: 'Payment due within 14 days of invoice date.',
    template: 'modern',
    colorTheme: 'plum',
    customColor: '#593C8F',
    currency,
    autoRoundOff: true,
    paperSize: 'a4',
    orientation: 'portrait',
    showBillCraftBranding: true,
  };
}

export function createSampleDocument(type: DocumentType = 'invoice', currency: CurrencyCode = 'INR'): DocumentModel {
  const sampleItems: DocumentItem[] = [
    {
      id: 'demo_1',
      name: 'Professional Service',
      description: 'Consulting, system architecture & specification',
      hsn: '998314',
      quantity: 2,
      unit: 'service',
      rate: 2500,
      discountType: 'percent',
      discountValue: 0,
      taxRate: 18,
    },
    {
      id: 'demo_2',
      name: 'Design Service',
      description: 'UI/UX design system & brand asset kit',
      hsn: '998311',
      quantity: 1,
      unit: 'service',
      rate: 4000,
      discountType: 'percent',
      discountValue: 0,
      taxRate: 18,
    },
  ];

  const getInitialDocNumber = (t: DocumentType) => {
    switch (t) {
      case 'invoice': return 'INV-2026-001';
      case 'quotation': return 'QT-2026-001';
      case 'receipt': return 'REC-2026-001';
      case 'estimate': return 'EST-2026-001';
      case 'proforma': return 'PI-2026-001';
    }
  };

  return {
    id: `bc_demo_${type}`,
    type,
    meta: {
      documentNumber: getInitialDocNumber(type),
      date: '2026-10-02',
      dueDate: '2026-10-16',
      validUntil: '2026-11-01',
      referenceNumber: 'PO-98214',
      placeOfSupply: 'Assam (18)',
      paymentTerms: 'Net 14 Days',
      receiptFor: 'Professional & Design Services',
      amountReceived: 10030,
    },
    business: {
      name: 'BillCraft Studio',
      tagline: 'CREATE • CALCULATE • SHARE',
      logo: '',
      address: 'Nalbari, Assam · +91 XXXXX XXXXX',
      phone: '+91 XXXXX XXXXX',
      email: 'hello@billcraft.studio',
      website: 'www.billcraft.studio',
      gstin: 'XXXXXXXX',
      pan: 'AABCB1234F',
      state: 'Assam',
      stateCode: '18',
    },
    customer: {
      name: 'Acme Solutions',
      company: 'Acme Solutions',
      address: 'Tower B, Global Cyber Park, Sector 42',
      phone: '+91 XXXXX XXXXX',
      email: 'accounts@acmesolutions.com',
      gstin: '06AACCA5678D1Z9',
      state: 'Haryana',
      stateCode: '06',
      placeOfSupply: 'Haryana (06)',
    },
    items: sampleItems,
    discount: {
      type: 'fixed',
      value: 500,
    },
    tax: {
      mode: 'gst',
      gstType: 'cgst_sgst',
      customTaxName: 'GST',
      customTaxRate: 18,
      customTaxInclusive: false,
    },
    payment: {
      method: 'upi',
      bankName: 'HDFC Bank',
      accountHolder: 'BillCraft Studio',
      accountNumber: '50200012345678',
      ifsc: 'HDFC0001234',
      branch: 'Central Plaza Branch',
      upiId: 'billcraft@upi',
      upiPayeeName: 'BillCraft Studio',
      showUPIQR: true,
      notes: 'UPI / Bank Transfer',
    },
    signature: {
      type: 'text',
      image: '',
      text: 'BillCraft Studio',
      designation: 'Authorized Signatory',
    },
    notes: 'Thank you for your business.',
    terms: 'Payment due within 14 days of invoice date.',
    template: 'modern',
    colorTheme: 'plum',
    customColor: '#593C8F',
    currency,
    autoRoundOff: true,
    paperSize: 'a4',
    orientation: 'portrait',
    showBillCraftBranding: true,
  };
}

/**
 * Cleanly converts one document type to another without destructive mutation
 */
export function convertDocument(sourceDoc: DocumentModel, targetType: DocumentType): DocumentModel {
  const newNumber = generateDocNumber(targetType);
  const copy: DocumentModel = JSON.parse(JSON.stringify(sourceDoc));

  copy.id = `bc_${Date.now()}`;
  copy.type = targetType;
  copy.meta.documentNumber = newNumber;
  copy.meta.date = getTodayDateString();

  if (targetType === 'receipt') {
    copy.meta.receiptFor = copy.items.length > 0 ? copy.items.map(i => i.name).join(', ') : 'Settlement of Invoice';
    copy.meta.referenceNumber = sourceDoc.meta.documentNumber;
  }

  return copy;
}
