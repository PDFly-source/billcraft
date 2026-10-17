/**
 * Phase 1 local-first data model.
 * All persistent structured data lives in IndexedDB (browser-only);
 * localStorage is used only for tiny UI preferences (e.g. privacy-notice
 * dismissal). Money values are stored twice where precision matters:
 * the float value for display compatibility and `*Minor` integers (paise)
 * for exact arithmetic.
 */
import { DocumentModel, DocumentType, DocumentCalculations, PaymentMethod } from './document';

export const LOCAL_SCHEMA_VERSION = 1;

export interface Timestamped {
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface ClientRecord extends Timestamped {
  id: string;                 // stable unique id (crypto.randomUUID)
  name: string;               // client / business name (required)
  contactPerson: string;
  phone: string;
  email: string;
  billingAddress: string;
  shippingAddress: string;
  gstin: string;
  state: string;
  stateCode: string;
  notes: string;
}

export interface ProductRecord extends Timestamped {
  id: string;
  name: string;              // required
  description: string;
  sku: string;
  unit: string;               // pcs / kg / hr / ...
  price: number;              // default unit price (major units)
  priceMinor: number;        // exact paise
  taxRate: number;            // GST %, 0 allowed
  hsn: string;                // HSN / SAC
  category: string;
}

export type InvoiceStatus = 'unpaid' | 'partial' | 'paid' | 'cancelled';
export type QuotationStatus = 'draft' | 'issued' | 'accepted' | 'rejected' | 'converted';
export type ReceiptStatus = 'issued' | 'cancelled';
export type EstimateStatus = QuotationStatus;
export type DocumentStatus = InvoiceStatus | QuotationStatus | ReceiptStatus | EstimateStatus;

export interface PaymentRecord extends Timestamped {
  id: string;
  date: string;               // YYYY-MM-DD
  amount: number;             // major units (display)
  amountMinor: number;        // paise (exact)
  method: PaymentMethod;
  note: string;
}

export interface SavedDocument extends Timestamped {
  id: string;
  type: DocumentType;
  documentNumber: string;
  document: DocumentModel;    // immutable snapshot of the full document
  calc: DocumentCalculations; // totals snapshot
  status: DocumentStatus;
  payments: PaymentRecord[];
  clientId: string | null;    // link back to a client, if chosen
  clientName: string;         // denormalized for list/search
  issueDate: string;          // YYYY-MM-DD
  dueDate: string;            // YYYY-MM-DD ('' when N/A)
  totalMinor: number;         // denormalized grand total, paise
  amountPaidMinor: number;    // derived at save time, paise
  convertedFromId: string | null; // quotation -> invoice link
  convertedToId: string | null;
}

export interface BusinessProfileRecord extends Timestamped {
  id: 'business-profile';    // singleton
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  gstin: string;
  state: string;
  stateCode: string;
  pan: string;
  bankName: string;
  bankAccountHolder: string;
  bankAccountNumber: string;
  bankIfsc: string;
  upiId: string;
  paymentInstructions: string;
  defaultCurrency: string;
  defaultGstType: 'cgst_sgst' | 'igst';
  defaultTaxMode: 'none' | 'gst' | 'custom';
  invoicePrefix: string;     // e.g. INV
  invoiceStartNumber: number;
  quotationPrefix: string;
  receiptPrefix: string;
  estimatePrefix: string;
  defaultPaymentTerms: string;
  defaultFooterNotes: string;
  logoId: string | null;     // images store key
  signatureId: string | null;
}

export interface DocumentPreferences {
  defaultTemplate: string;
  defaultColorTheme: string;
  defaultCustomColor?: string;      // custom accent hex when theme = custom
  defaultFontFamily?: 'sans' | 'serif' | 'mono'; // document font preference
  watermark: {
    enabled: boolean;
    text: string;
    opacity: number;         // 0.04 .. 0.20
    position: 'center' | 'tl' | 'tr' | 'bl' | 'br';
    rotation: number;        // -45 .. 45 deg
    source?: 'text' | 'logo'; // logo = business logo watermark
  };
  density: 'compact' | 'normal' | 'spacious';
  showBranding: boolean;
  autoRoundOff: boolean;
}

export interface DraftRecord {
  revision: number;          // guards against stale async writes
  savedAt: string;
  document: DocumentModel;
  hasStartedEditing: boolean;
}

export interface BillCraftBackup {
  app: 'billcraft';
  schemaVersion: number;
  exportedAt: string;        // ISO 8601
  generator: string;         // e.g. 'billcraft-web'
  counts: { clients: number; products: number; documents: number; images: number };
  data: {
    businessProfile: BusinessProfileRecord | null;
    clients: ClientRecord[];
    products: ProductRecord[];
    documents: SavedDocument[];
    images: { id: string; dataUrl: string }[];
    preferences: Partial<DocumentPreferences> | null;
  };
}

export interface RestorePreview {
  ok: true;
  schemaVersion: number;
  exportedAt: string;
  counts: { clients: number; products: number; documents: number; images: number };
  mergeSummary: {
    clients: { added: number; updated: number; keptLocal: number };
    products: { added: number; updated: number; keptLocal: number };
    documents: { added: number; updated: number; keptLocal: number };
    images: { added: number; updated: number };
    profileReplaced: boolean;
  };
}

export interface DataCounts { clients: number; products: number; documents: number; images: number; }

export interface StorageStatus {
  available: boolean;
  error: string | null;
  usage: number | null;      // bytes, when supported
  quota: number | null;      // bytes, when supported
}
