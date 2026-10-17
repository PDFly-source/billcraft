export type DocumentType =
  | 'invoice'
  | 'quotation'
  | 'receipt'
  | 'estimate'
  | 'proforma'
  | 'purchase_order'
  | 'delivery_challan'
  | 'credit_note'
  | 'debit_note';

export const DOCUMENT_TYPES: DocumentType[] = [
  'invoice', 'quotation', 'receipt', 'estimate', 'proforma',
  'purchase_order', 'delivery_challan', 'credit_note', 'debit_note',
];

export function isKnownDocumentType(t: string): t is DocumentType {
  return (DOCUMENT_TYPES as string[]).includes(t);
}

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'AUD' | 'CAD' | 'SGD';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  decimals: number;
  isIndianNumbering: boolean;
}

export type UnitType =
  | 'pcs'
  | 'kg'
  | 'g'
  | 'ltr'
  | 'ml'
  | 'hr'
  | 'day'
  | 'month'
  | 'box'
  | 'set'
  | 'service'
  | 'other';

export interface DocumentItem {
  id: string;
  name: string;
  description: string;
  hsn: string;
  quantity: number | string; // allows expression string while editing
  unit: UnitType;
  rate: number | string;     // allows expression string while editing
  discountType: 'percent' | 'fixed';
  discountValue: number;
  taxRate: number; // 0, 5, 12, 18, 28, etc.
}

export interface BusinessDetails {
  name: string;
  tagline: string;
  logo: string; // base64 data url or empty
  address: string;
  phone: string;
  email: string;
  website: string;
  gstin: string;
  pan: string;
  state: string;
  stateCode: string;
}

export interface CustomerDetails {
  name: string;
  company: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  state: string;
  stateCode: string;
  placeOfSupply: string;
}

export interface DocumentMeta {
  documentNumber: string;
  date: string;       // YYYY-MM-DD
  dueDate: string;    // YYYY-MM-DD
  validUntil: string; // YYYY-MM-DD (for quotation/estimate/proforma)
  referenceNumber: string;
  placeOfSupply: string;
  paymentTerms: string;
  // Receipt-specific
  receiptFor: string;
  amountReceived: number;
  // Purchase order / delivery challan specific (optional — older documents
  // simply omit these; they default sensibly at render time)
  expectedDeliveryDate?: string;   // PO: expected delivery
  deliveryAddress?: string;        // challan: ship-to address
  vehicleInfo?: string;            // challan: vehicle no / transport
  receivedBy?: string;             // challan: acknowledgement
  linkedInvoice?: string;         // credit/debit note: original invoice no
  adjustmentReason?: string;       // credit/debit note: reason for issue
}

export type DiscountType = 'none' | 'percent' | 'fixed';

export interface OverallDiscount {
  type: DiscountType;
  value: number;
}

export type TaxMode = 'none' | 'gst' | 'custom';
export type GSTType = 'cgst_sgst' | 'igst';

export interface TaxSettings {
  mode: TaxMode;
  gstType: GSTType;
  customTaxName: string;
  customTaxRate: number;
  customTaxInclusive: boolean;
}

export type PaymentMethod = 'cash' | 'upi' | 'bank' | 'card' | 'cheque' | 'other';

export interface PaymentDetails {
  method: PaymentMethod;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  upiId: string;
  upiPayeeName: string;
  showUPIQR: boolean;
  notes: string;
}

export type SignatureType = 'none' | 'draw' | 'upload' | 'text';

export interface SignatureDetails {
  type: SignatureType;
  image: string; // base64 or empty
  text: string;
  designation: string;
}

export type TemplateId =
  | 'classic'
  | 'modern'
  | 'minimal'
  | 'corporate'
  | 'elegant'
  | 'bold'
  | 'gst_pro'
  | 'freelancer'
  | 'service'
  | 'retail';

export type ColorThemeId =
  | 'plum'
  | 'mint'
  | 'coral'
  | 'cornflower'
  | 'golden'
  | 'emerald'
  | 'navy'
  | 'blush'
  | 'electric'
  | 'custom';

export interface DocumentCalculations {
  subtotal: number;
  itemDiscountsTotal: number;
  overallDiscountTotal: number;
  totalDiscount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  customTax: number;
  totalTax: number;
  rawTotal: number;
  roundOff: number;
  grandTotal: number;
  amountInWords: string;
}

export interface WatermarkSettings {
  enabled: boolean;
  text: string;
  opacity: number;   // 0.04 .. 0.20 (safe readability bounds)
  position: 'center' | 'tl' | 'tr' | 'bl' | 'br';
  rotation: number;  // -45 .. 45 degrees
  source?: 'text' | 'logo'; // logo = use the business logo image (default 'text')
}

export type DocDensity = 'compact' | 'normal' | 'spacious';

export type DocFontFamily = 'sans' | 'serif' | 'mono';

export interface DocumentModel {
  id: string;
  type: DocumentType;
  meta: DocumentMeta;
  business: BusinessDetails;
  customer: CustomerDetails;
  items: DocumentItem[];
  discount: OverallDiscount;
  tax: TaxSettings;
  payment: PaymentDetails;
  signature: SignatureDetails;
  notes: string;
  terms: string;
  template: TemplateId;
  colorTheme: ColorThemeId;
  customColor: string;
  currency: CurrencyCode;
  autoRoundOff: boolean;
  paperSize: 'a4' | 'a5' | 'letter';
  orientation: 'portrait' | 'landscape';
  showBillCraftBranding: boolean;
  watermark?: WatermarkSettings; // optional: older drafts have none
  density?: DocDensity;          // optional: page margin/typography density
  fontFamily?: DocFontFamily;    // optional: document font (default 'sans')
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  defaultCurrency: CurrencyCode;
  defaultTemplate: TemplateId;
  defaultColorTheme: ColorThemeId;
  defaultTaxMode: TaxMode;
  paperSize: 'a4' | 'a5' | 'letter';
  autoRoundOff: boolean;
  showBranding: boolean;
}
