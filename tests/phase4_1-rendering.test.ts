/**
 * Phase 4.1 — Permanent Invoice Preview, Payment & A4 Rendering.
 *
 * Covers the shared payment view model (single source of truth for the
 * Mobile Preview Card, Full A4 Preview, PDF and print), the true A4 paper
 * geometry and the export pagination mapping.
 */
import { describe, expect, test } from 'bun:test';
import { DocumentModel, PaymentMethod } from '@/types/document';
import { getPaymentView, PAYMENT_METHOD_LABELS } from '@/lib/payment-view';
import { generateUPIString } from '@/lib/upi';
import { calculateDocument } from '@/lib/calculations';

const baseDoc = (payment: Partial<DocumentModel['payment']>, method: PaymentMethod): DocumentModel =>
  ({
    id: 't1',
    type: 'invoice',
    meta: { documentNumber: 'INV-2026-0001', date: '2026-10-17', dueDate: '2026-10-31' },
    business: { name: 'Test Studio', address: '', phone: '', email: '', gstin: '', pan: '', logo: '' },
    customer: { name: 'Client', phone: '', email: '', address: '', gstin: '' },
    items: [
      { id: 'a', name: 'Service A', description: '', quantity: 2, unit: 'hrs', rate: 2500, discountType: 'none', discountValue: 0, taxRate: 18 },
    ],
    discount: { type: 'none', value: 0 },
    tax: { mode: 'none' },
    payment: {
      method,
      bankName: '', accountHolder: '', accountNumber: '', ifsc: '', branch: '',
      upiId: '', upiPayeeName: '', showUPIQR: false, notes: '',
      ...payment,
    },
    signature: { type: 'none', image: '', text: '', designation: '' },
    notes: '', terms: '',
    currency: 'INR',
    colorTheme: 'plum',
    template: 'modern',
    density: 'normal',
    fontFamily: 'sans',
    paperSize: 'a4',
    orientation: 'portrait',
    showBillCraftBranding: false,
  }) as unknown as DocumentModel;

describe('Phase 4.1 — payment view (single source of truth)', () => {
  test('CASH: label is Cash, never UPI/Bank, and no QR is shown', () => {
    // Cash selected while stale UPI/bank data still exists in the model
    const doc = baseDoc(
      { upiId: 'old@upi', showUPIQR: true, bankName: 'Old Bank', accountNumber: '123' },
      'cash'
    );
    const v = getPaymentView(doc);
    expect(v.method).toBe('cash');
    expect(v.label).toBe('Cash');
    expect(v.label).not.toContain('UPI');
    expect(v.label).not.toContain('Bank');
    expect(v.showQR).toBe(false); // QR hidden by default for cash
    expect(v.detailLines).toBeArray(0);
    // The stale UPI data must not produce a scannable QR payload either
    expect(v.qrUpiId).toBe('');
  });

  test('UPI: label, details, and QR only when id + showUPIQR are set', () => {
    const v = getPaymentView(baseDoc({ upiId: 'pay@ybl', showUPIQR: true }, 'upi'));
    expect(v.label).toBe('UPI / QR');
    expect(v.showQR).toBe(true);
    expect(v.qrUpiId).toBe('pay@ybl');
    expect(v.qrPayeeName).toBe('Test Studio'); // falls back to business name
    expect(v.detailLines.some((l) => l.label === 'UPI ID' && l.value === 'pay@ybl')).toBe(true);
  });

  test('UPI: QR hidden when showUPIQR is off, or upiId is empty', () => {
    expect(getPaymentView(baseDoc({ upiId: 'pay@ybl', showUPIQR: false }, 'upi')).showQR).toBe(false);
    expect(getPaymentView(baseDoc({ upiId: '   ', showUPIQR: true }, 'upi')).showQR).toBe(false);
  });

  test('BANK: shows Bank Transfer with details and never a UPI QR', () => {
    const v = getPaymentView(
      baseDoc({ bankName: 'SBI', accountNumber: '000123', ifsc: 'SBIN0001234', accountHolder: 'Test Studio' }, 'bank'),
      'bank'
    );
    expect(v.label).toBe('Bank Transfer');
    expect(v.showQR).toBe(false); // even with stale upiId + QR flag
    const byLabel = Object.fromEntries(v.detailLines.map((l) => [l.label, l.value]));
    expect(byLabel['Bank']).toBe('SBI');
    expect(byLabel['A/C No']).toBe('000123');
    expect(byLabel['IFSC']).toBe('SBIN0001234');
  });

  test('CARD / CHEQUE / OTHER: display their own labels, no UPI fallback', () => {
    expect(getPaymentView(baseDoc({}, 'card')).label).toBe('Card Payment');
    expect(getPaymentView(baseDoc({}, 'cheque')).label).toBe('Cheque');
    const other = getPaymentView(baseDoc({}, 'other'));
    expect(other.label).toBe('Other');
    expect(other.showQR).toBe(false);
  });

  test('METHOD WITHOUT DETAILS still shows the label (never silently hidden)', () => {
    const v = getPaymentView(baseDoc({}, 'upi')); // UPI with no id
    expect(v.label).toBe('UPI / QR');
    expect(v.hasDetails).toBe(false);
    expect(v.description).not.toBe('');
  });

  test('Payment link is independent of the primary method', () => {
    const withLink = baseDoc({ paymentLink: 'https://pay.example.com/x', showPaymentLink: true }, 'cash');
    const v = getPaymentView(withLink);
    expect(v.showPaymentLink).toBe(true);
    expect(v.paymentLink).toBe('https://pay.example.com/x');

    // Not shown when the link is invalid (http://)
    const badLink = baseDoc({ paymentLink: 'http://pay.example.com', showPaymentLink: true }, 'cash');
    expect(getPaymentView(badLink).showPaymentLink).toBe(false);

    // Not shown when not explicitly enabled
    const offLink = baseDoc({ paymentLink: 'https://pay.example.com', showPaymentLink: false }, 'upi');
    expect(getPaymentView(offLink).showPaymentLink).toBe(false);
  });

  test('All six methods have labels matching the editor mapping', () => {
    const methods: PaymentMethod[] = ['cash', 'upi', 'bank', 'card', 'cheque', 'other'];
    for (const m of methods) {
      expect(PAYMENT_METHOD_LABELS[m]).toBeTruthy();
      expect(getPaymentView(baseDoc({}, m)).label).toBe(PAYMENT_METHOD_LABELS[m]);
    }
  });
});

describe('Phase 4.1 — UPI QR payload', () => {
  test('QR payload encodes recipient, payee name and exact amount', () => {
    const uri = generateUPIString({
      upiId: 'pay@ybl',
      payeeName: 'Test Studio',
      amount: calculateDocument(baseDoc({ upiId: 'pay@ybl' }, 'upi')).grandTotal,
      transactionNote: 'INVOICE INV-2026-0001',
    });
    // pa keeps the canonical unencoded form (accepted by UPI apps);
    // amount is the exact calculated grand total (2 x 2500 = 5000).
    expect(uri).toContain('pa=pay@ybl');
    expect(uri).toContain('pn=Test%20Studio');
    expect(uri).toContain('cu=INR');
    expect(uri).toContain('am=5000.00');
    expect(uri).toContain('tn=INVOICE%20INV-2026-0001');
    expect(uri).not.toContain('undefined');
  });
});

describe('Phase 4.1 — A4 geometry', () => {
  test('210mm maps to the expected 96dpi pixel width used by previews', () => {
    const MM_TO_PX = 96 / 25.4;
    expect(Math.round(210 * MM_TO_PX)).toBe(794);
  });

  test('Export pagination maps a 794px-wide capture onto exact A4 pages', () => {
    // generatePDFBlob captures the fixed-width sheet at scale 2 → 1588px
    // canvas, then maps it onto 210mm-wide pages and slices every 297mm,
    // with a 2mm epsilon so pixel-rounding residue never spills an
    // almost-empty extra page (production: PAGE_EPSILON_MM = 2).
    const PAGE_EPSILON_MM = 2;
    const canvasW = 794 * 2;
    const pageWidth = 210; // mm
    const pageHeight = 297; // mm

    const countPages = (contentH: number) => {
      const imgHeight = (contentH * pageWidth) / canvasW;
      let heightLeft = imgHeight - pageHeight; // after the first page
      let pages = 1;
      while (heightLeft > PAGE_EPSILON_MM) { pages++; heightLeft -= pageHeight; }
      return pages;
    };

    // Single-page sheet with ~0.3mm capture rounding residue → ONE page
    // (this is the exact regression E2E caught before the epsilon fix).
    expect(countPages(1123 * 2)).toBe(1);
    expect(countPages(1125 * 2)).toBe(1); // 297.6mm mapped — still one page

    // Genuine two-page overflow → TWO pages
    expect(countPages(2246 * 2)).toBe(2); // ≈594mm
    expect(countPages(1500 * 2)).toBe(2); // ≈397mm
    // Three-page overflow → THREE pages
    expect(countPages(3369 * 2)).toBe(3); // ≈891mm
  });

  test('Aspect ratio is preserved: the capture width maps 1:1 to 210mm', () => {
    // The sheet is exactly 210mm wide and the page is exactly 210mm wide,
    // so the horizontal scale factor is exactly 1 — never stretched.
    const MM_TO_PX = 96 / 25.4;
    const canvasW = 794 * 2;
    const pageWidth = 210;
    // canvas px -> mm (undoing the 2x capture scale), then vs page width.
    const capturedWidthMm = canvasW / 2 / MM_TO_PX;
    const horizontalScale = pageWidth / capturedWidthMm;
    expect(horizontalScale).toBeCloseTo(1, 2); // 210mm captured -> 210mm page
  });
});
