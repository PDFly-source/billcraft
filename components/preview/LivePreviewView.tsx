'use client';

import React, { useEffect, useState } from 'react';
import { DocumentModel } from '@/types/document';
import { calculateDocument } from '@/lib/calculations';
import { formatCurrency } from '@/lib/currency';
import { BillCraftIcon } from '@/components/ui/BillCraftIcons';
import { BillCraftLogo } from '@/components/ui/BillCraftLogo';
import { A4Page } from '@/components/preview/A4Page';
import { DocumentRenderer } from '@/components/templates/DocumentRenderer';
import { downloadPDF, getPrintableElement } from '@/lib/pdf-generator';
import { getPaymentView } from '@/lib/payment-view';
import { calculateItemRow } from '@/lib/calculations';
import { generateQRCodeDataUrl, generateUPIString } from '@/lib/upi';
import { Loader2, MessageCircle } from 'lucide-react';
import { ShareModal } from '@/components/data/ShareModal';

interface LivePreviewViewProps {
  document: DocumentModel;
  onBack: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

/** Hidden, always-mounted export sheet for this view (Phase 4.1). */
const EXPORT_SHEET_ID = 'live-preview-export-sheet';

export const LivePreviewView: React.FC<LivePreviewViewProps> = ({
  document: doc,
  onBack,
  onShowToast,
}) => {
  const [viewFullA4, setViewFullA4] = useState(false);
  const [cardQrUrl, setCardQrUrl] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const calcs = calculateDocument(doc);

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${doc.type.toUpperCase()} ${doc.meta.documentNumber}`,
          text: `Invoice ${doc.meta.documentNumber} for ${doc.customer.company || doc.customer.name || 'Customer'} - Total: ${formatCurrency(calcs.grandTotal, doc.currency)}`,
          url: window.location.href,
        });
        onShowToast('Share dialog opened');
      } catch {
        // User cancelled or share not supported
      }
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(
        `${doc.type.toUpperCase()} ${doc.meta.documentNumber} • Total: ${formatCurrency(calcs.grandTotal, doc.currency)}`
      );
      onShowToast('Document summary copied to clipboard');
    }
  };

  const [isShareOpen, setIsShareOpen] = useState(false);

  // Real UPI QR (only when the shared payment view allows it) — replaces the
  // old decorative placeholder SVG that was shown regardless of method.
  const payView = getPaymentView(doc);
  useEffect(() => {
    let mounted = true;
    if (payView.showQR) {
      generateQRCodeDataUrl(
        generateUPIString({
          upiId: payView.qrUpiId,
          payeeName: payView.qrPayeeName,
          amount: calcs.grandTotal,
          transactionNote: `${doc.type.toUpperCase()} ${doc.meta.documentNumber || ''}`,
        })
      ).then((url) => {
        if (mounted) setCardQrUrl(url);
      });
    } else {
      setCardQrUrl('');
    }
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payView.showQR, payView.qrUpiId, payView.qrPayeeName, calcs.grandTotal, doc.meta.documentNumber, doc.type]);


  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    const el = getPrintableElement([EXPORT_SHEET_ID]);
    if (!el) {
      window.print();
      return;
    }
    setIsExporting(true);
    try {
      const filename = await downloadPDF(el, doc, { paperSize: doc.paperSize });
      onShowToast(`PDF exported: ${filename}`);
    } catch {
      onShowToast('PDF export failed. Opening print dialog instead.', 'error');
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-[420px] mx-auto space-y-3 py-1 px-1 animate-in fade-in duration-200">
      {/* Navigation Header matching Screen 05 */}
      <div className="nav">
        <div onClick={onBack} className="row cursor-pointer select-none">
          <BillCraftIcon name="back" />
          <b>Invoice Preview</b>
        </div>
        <div className="row" style={{ gap: '12px' }}>
          <button
            type="button"
            onClick={handleShare}
            className="text-[#17151F] dark:text-[#F8F5FC] hover:text-[#593C8F] transition cursor-pointer p-1"
            title="Share"
            aria-label="Share"
          >
            <BillCraftIcon name="share" />
          </button>
          <button
            type="button"
            onClick={() => setIsShareOpen(true)}
            className="text-[#17151F] dark:text-[#F8F5FC] hover:text-[#25D366] transition cursor-pointer p-1"
            title="Share via WhatsApp"
            aria-label="Share via WhatsApp"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="text-[#17151F] dark:text-[#F8F5FC] hover:text-[#593C8F] transition cursor-pointer p-1"
            title="Print"
            aria-label="Print"
          >
            <BillCraftIcon name="prt" />
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExporting}
            className="text-[#17151F] dark:text-[#F8F5FC] hover:text-[#593C8F] transition cursor-pointer p-1 disabled:opacity-50"
            title="Download PDF"
            aria-label="Download PDF"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin text-[#593C8F]" /> : <BillCraftIcon name="file-preview-outline" />}
          </button>
        </div>
      </div>

      {/* Toggle View Mode */}
      <div className="flex items-center justify-between px-1 text-xs">
        <span className="text-[11px] font-bold text-[#6D6879] dark:text-[#A39BB0]">
          {viewFullA4 ? 'Full Printable Sheet' : 'Mobile Preview Card'}
        </span>
        <button
          type="button"
          onClick={() => setViewFullA4(!viewFullA4)}
          className="text-[11px] font-bold text-[#593C8F] dark:text-[#A8D5BA] hover:underline cursor-pointer"
        >
          {viewFullA4 ? 'Switch to Card View' : 'Switch to Full A4 View'}
        </button>
      </div>

      {viewFullA4 ? (
        /* Full A4 — true 210x297mm sheet uniformly scaled to this viewport */
        <A4Page document={doc} sheetId="live-preview-a4-sheet" className="shadow-lg" />
      ) : (
        /* Mockup Styled .inv Card matching Reference HTML exactly */
        <div className="rounded-2xl p-3 bg-[#EFEAF5] dark:bg-[#20192C] space-y-3">
          <div className="inv">
            {/* Top row: Logo + Document Type/Number */}
            <div className="row sp">
              <div className="row" style={{ gap: '5px' }}>
                <BillCraftLogo size={22} />
                <b style={{ fontSize: '11px', letterSpacing: '.05em' }}>BILLCRAFT</b>
              </div>
              <div style={{ textAlign: 'right' }}>
                <b style={{ fontSize: '15px', color: 'var(--pl)', letterSpacing: '.06em' }}>
                  {doc.type.toUpperCase()}
                </b>
                <div className="m" style={{ fontSize: '8px' }}>
                  #{doc.meta.documentNumber || 'INV-2026-001'}
                </div>
              </div>
            </div>

            {/* Bill To */}
            <div style={{ margin: '10px 0 2px' }}>
              <span className="lab" style={{ fontSize: '7.5px' }}>BILL TO</span>
              <div>
                <b style={{ fontSize: '10px' }}>
                  {doc.customer.company || doc.customer.name || 'Client Name'}
                </b>
              </div>
            </div>

            {/* Items Table */}
            <table>
              <thead>
                <tr>
                  <th>ITEM</th>
                  <th className="r">QTY</th>
                  <th className="r">RATE</th>
                  <th className="r">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {doc.items.length > 0 ? (
                  doc.items.map((item, idx) => {
                    // Same shared row calculation as the A4 preview and PDF
                    // (per-item discounts included) — never inline math.
                    const row = calculateItemRow(item);
                    return (
                      <tr key={item.id || idx}>
                        <td>{item.name || 'Item'}</td>
                        <td className="r">{row.quantity}</td>
                        <td className="r">{formatCurrency(row.rate, doc.currency)}</td>
                        <td className="r">{formatCurrency(row.total, doc.currency)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} style={{ color: 'var(--mut)', padding: '8px 0' }}>
                      No items added yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Totals Block */}
            <div style={{ marginLeft: 'auto', width: '150px', lineHeight: 1.9 }}>
              <div className="row sp">
                <span>Subtotal</span>
                <span>{formatCurrency(calcs.subtotal, doc.currency)}</span>
              </div>
              {calcs.totalDiscount > 0 && (
                <div className="row sp">
                  <span>Discount</span>
                  <span style={{ color: 'var(--red)' }}>-{formatCurrency(calcs.totalDiscount, doc.currency)}</span>
                </div>
              )}
              {doc.tax.mode !== 'none' && (
                <div className="row sp">
                  {/* Label mirrors the A4 totals block (CGST+SGST / IGST / custom) */}
                  <span>
                    {doc.tax.mode === 'gst'
                      ? doc.tax.gstType === 'igst' ? 'GST (IGST)' : 'GST (CGST+SGST)'
                      : `${doc.tax.customTaxName || 'Tax'} (${doc.tax.customTaxRate}%)`}
                  </span>
                  <span>{formatCurrency(calcs.totalTax, doc.currency)}</span>
                </div>
              )}
              <div
                className="row sp"
                style={{
                  background: 'var(--pl)',
                  color: '#fff',
                  padding: '5px 7px',
                  borderRadius: '5px',
                  fontWeight: 800,
                  fontSize: '11px',
                  marginTop: '3px',
                }}
              >
                <span>TOTAL</span>
                <span>{formatCurrency(calcs.grandTotal, doc.currency)}</span>
              </div>
            </div>

            {/* Payment & QR Row */}
            <div
              className="row sp"
              style={{
                marginTop: '14px',
                borderTop: '1px solid var(--bd)',
                paddingTop: '10px',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <span className="lab" style={{ fontSize: '7.5px' }}>PAYMENT</span>
                <div style={{ marginTop: '2px' }}>
                  {/* Same normalized payment view as A4 preview / PDF / print */}
                  <b>{payView.label}</b>
                  {payView.detailLines.length > 0 && (
                    <div style={{ marginTop: '2px', color: 'var(--mut)', fontSize: '7.5px', wordBreak: 'break-all' }}>
                      {payView.detailLines.map((l) => `${l.label}: ${l.value}`).join(' · ')}
                    </div>
                  )}
                  {payView.showPaymentLink && (
                    <div style={{ marginTop: '2px', color: 'var(--pl)', fontSize: '7.5px', fontWeight: 700, wordBreak: 'break-all' }}>
                      Pay online: {payView.paymentLink}
                    </div>
                  )}
                </div>
              </div>

              {/* REAL scannable UPI QR — only when the shared payment view
                  allows it. No placeholder QR is ever drawn. */}
              {payView.showQR && cardQrUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cardQrUrl}
                  alt="UPI Payment QR"
                  width="46"
                  height="46"
                  style={{ border: '1px solid var(--bd)', padding: '3px', borderRadius: '4px', background: '#fff' }}
                />
              ) : null}
            </div>

            {/* Thank you note */}
            <div style={{ textAlign: 'center', marginTop: '16px', color: 'var(--mut)', fontSize: '8.5px' }}>
              {doc.notes || 'Thank you for your business.'}
            </div>
          </div>

          {/* Badge */}
          <div className="row" style={{ justifyContent: 'center' }}>
            <span className="bdg">A4 · LIVE PREVIEW</span>
          </div>
        </div>
      )}

      <ShareModal
        open={isShareOpen}
        doc={doc}
        calc={calcs}
        onClose={() => setIsShareOpen(false)}
        onShowToast={onShowToast}
      />

      {/* Hidden export sheet — always at true A4 width regardless of view
          mode, so PDF output never depends on which preview is visible. */}
      <div className="hidden" aria-hidden>
        <DocumentRenderer document={doc} sheetId={EXPORT_SHEET_ID} />
      </div>
    </div>
  );
}
