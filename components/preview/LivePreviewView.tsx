'use client';

import React, { useState } from 'react';
import { DocumentModel } from '@/types/document';
import { calculateDocument } from '@/lib/calculations';
import { formatCurrency } from '@/lib/currency';
import { BillCraftIcon } from '@/components/ui/BillCraftIcons';
import { BillCraftLogo } from '@/components/ui/BillCraftLogo';
import { DocumentRenderer } from '@/components/templates/DocumentRenderer';
import { downloadPDF } from '@/lib/pdf-generator';
import { Loader2 } from 'lucide-react';

interface LivePreviewViewProps {
  document: DocumentModel;
  onBack: () => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const LivePreviewView: React.FC<LivePreviewViewProps> = ({
  document: doc,
  onBack,
  onShowToast,
}) => {
  const [viewFullA4, setViewFullA4] = useState(false);
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

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    const el = window.document.getElementById('printable-document');
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
        /* Full A4 Rendered Sheet */
        <div className="rounded-xl overflow-hidden shadow-lg p-2 bg-[#EFEAF5] dark:bg-[#111015]">
          <div className="transform scale-[0.78] sm:scale-100 origin-top">
            <DocumentRenderer document={doc} />
          </div>
        </div>
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
                  {doc.customer.company || doc.customer.name || 'Acme Solutions'}
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
                    const rowAmount = (Number(item.quantity) || 1) * (Number(item.rate) || 0);
                    return (
                      <tr key={item.id || idx}>
                        <td>{item.name || 'Item'}</td>
                        <td className="r">{item.quantity}</td>
                        <td className="r">{formatCurrency(Number(item.rate) || 0, doc.currency)}</td>
                        <td className="r">{formatCurrency(rowAmount, doc.currency)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <>
                    <tr>
                      <td>Professional Service</td>
                      <td className="r">2</td>
                      <td className="r">₹2,500</td>
                      <td className="r">₹5,000</td>
                    </tr>
                    <tr>
                      <td>Design Service</td>
                      <td className="r">1</td>
                      <td className="r">₹4,000</td>
                      <td className="r">₹4,000</td>
                    </tr>
                  </>
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
                  <span>{doc.tax.mode === 'gst' ? 'GST 18%' : 'Tax'}</span>
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
              <div>
                <span className="lab" style={{ fontSize: '7.5px' }}>PAYMENT</span>
                <div style={{ marginTop: '2px' }}>
                  <b>UPI / Bank Transfer</b>
                </div>
              </div>

              {/* Exact QR Pattern SVG from Reference HTML */}
              <svg width="46" height="46" viewBox="0 0 24 24" style={{ border: '1px solid var(--bd)', padding: '3px', borderRadius: '4px' }}>
                <g fill="#17151F">
                  <rect x="2" y="2" width="7" height="7" />
                  <rect x="15" y="2" width="7" height="7" />
                  <rect x="2" y="15" width="7" height="7" />
                  <rect x="11" y="11" width="3" height="3" />
                  <rect x="16" y="15" width="3" height="3" />
                  <rect x="11" y="4" width="2" height="2" />
                  <rect x="20" y="19" width="2" height="3" />
                  <rect x="11" y="18" width="3" height="3" />
                </g>
                <g fill="#fff">
                  <rect x="4" y="4" width="3" height="3" />
                  <rect x="17" y="4" width="3" height="3" />
                  <rect x="4" y="17" width="3" height="3" />
                </g>
              </svg>
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

      {/* Hidden Sheet for PDF rendering */}
      <div className="hidden">
        <DocumentRenderer document={doc} />
      </div>
    </div>
  );
};
