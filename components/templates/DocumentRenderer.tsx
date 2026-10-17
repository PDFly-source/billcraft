'use client';

import { asset } from '@/lib/assets';
import React, { useEffect, useState } from 'react';
import { DocumentModel } from '@/types/document';
import { calculateDocument, calculateItemRow } from '@/lib/calculations';
import { formatCurrency } from '@/lib/currency';
import { generateUPIString, generateQRCodeDataUrl } from '@/lib/upi';
import { paymentSummary } from '@/lib/finance';
import { validatePaymentLink } from '@/lib/validation';
import { getThemeColor, getFontStack } from '@/lib/themes';
import Image from 'next/image';
import { formatDate } from '@/lib/format';

/** Display dates via the user's date-format preference (Phase 4). */
const fd = (d?: string) => formatDate(d);

interface DocumentRendererProps {
  document: DocumentModel;
  className?: string;
  isPrinting?: boolean;
}

export const DocumentRenderer: React.FC<DocumentRendererProps> = ({
  document: doc,
  className = '',
  isPrinting = false,
}) => {
  const [upiQrUrl, setUpiQrUrl] = useState<string>('');
  const calculations = calculateDocument(doc);
  const theme = getThemeColor(doc.colorTheme, doc.customColor);

  useEffect(() => {
    let isMounted = true;
    if (doc.payment.method === 'upi' && doc.payment.showUPIQR && doc.payment.upiId) {
      const upiUri = generateUPIString({
        upiId: doc.payment.upiId,
        payeeName: doc.payment.upiPayeeName || doc.business.name,
        amount: calculations.grandTotal,
        transactionNote: `${doc.type.toUpperCase()} ${doc.meta.documentNumber}`,
      });
      generateQRCodeDataUrl(upiUri).then((url) => {
        if (isMounted) setUpiQrUrl(url);
      });
    } else {
      Promise.resolve().then(() => {
        if (isMounted) setUpiQrUrl('');
      });
    }
    return () => {
      isMounted = false;
    };
  }, [
    doc.payment.method,
    doc.payment.showUPIQR,
    doc.payment.upiId,
    doc.payment.upiPayeeName,
    doc.business.name,
    doc.meta.documentNumber,
    doc.type,
    calculations.grandTotal,
  ]);

  const docTitle = getDocumentTitle(doc.type);

  // Render template based on doc.template
  return (
    <div
      id="printable-document"
      className={`printable-document-sheet bg-white text-[#17151F] mx-auto select-text font-sans relative overflow-hidden ${
        doc.paperSize === 'a5'
          ? 'max-w-[148mm] min-h-[210mm]'
          : doc.paperSize === 'letter'
          ? 'max-w-[216mm] min-h-[279mm]'
          : 'max-w-[210mm] min-h-[297mm]'
      } ${
        doc.density === 'compact' ? 'p-4 sm:p-7' : doc.density === 'spacious' ? 'p-8 sm:p-12' : 'p-6 sm:p-10'
      } shadow-sm border border-[#E7E0EE] transition-all ${className}`}
      style={{
        boxSizing: 'border-box',
        fontFamily: getFontStack(doc.fontFamily),
      }}
    >
      {/* Optional watermark (clamped to safe readability bounds; never blocks text) */}
      {doc.watermark?.enabled && doc.watermark.source === 'logo' && doc.business.logo ? (
        <LogoWatermark logo={doc.business.logo} opacity={doc.watermark.opacity} position={doc.watermark.position} />
      ) : doc.watermark?.enabled && doc.watermark.source !== 'logo' && doc.watermark.text.trim() ? (
        <WatermarkOverlay text={doc.watermark.text} opacity={doc.watermark.opacity} position={doc.watermark.position} rotation={doc.watermark.rotation} />
      ) : null}

      {/* Reference Top Gradient Stripe */}
      <div
        className="absolute top-0 left-0 right-0 h-[5px]"
        style={{
          background: `linear-gradient(90deg, ${theme.primary}, #8a68c4 70%, #F0B83A)`,
        }}
      />

      {renderTemplateContent(doc, calculations, theme, upiQrUrl, docTitle)}

      {/* Optional BillCraft Footer */}
      {doc.showBillCraftBranding && (
        <div className="mt-8 pt-4 border-t border-[#E7E0EE] flex items-center justify-between text-[11px] text-[#6D6879]">
          <span className="flex items-center gap-2 font-medium">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset("/assets/billcraft-emblem.png")}
              alt="BillCraft"
              className="w-4 h-4 object-contain inline-block shrink-0"
            />
            Created with BillCraft Studio • CREATE • CALCULATE • SHARE
          </span>
          <span>{doc.meta.documentNumber}</span>
        </div>
      )}
    </div>
  );
};

function getDocumentTitle(type: string): string {
  switch (type) {
    case 'quotation':
      return 'QUOTATION';
    case 'receipt':
      return 'RECEIPT';
    case 'estimate':
      return 'ESTIMATE';
    case 'proforma':
      return 'PROFORMA INVOICE';
    case 'purchase_order':
      return 'PURCHASE ORDER';
    case 'delivery_challan':
      return 'DELIVERY CHALLAN';
    case 'credit_note':
      return 'CREDIT NOTE';
    case 'debit_note':
      return 'DEBIT NOTE';
    default:
      return 'TAX INVOICE';
  }
}

/** Per-type label for the second party on the document. */
function getPartyLabel(type: string): string {
  switch (type) {
    case 'purchase_order':
      return 'Supplier';
    case 'delivery_challan':
      return 'Deliver To';
    case 'credit_note':
    case 'debit_note':
      return 'Party';
    case 'receipt':
      return 'Received From';
    default:
      return 'Billed To';
  }
}

/** Business-side label (who issues the document). */
function getIssuerLabel(type: string): string {
  switch (type) {
    case 'purchase_order':
      return 'Buyer';
    case 'delivery_challan':
      return 'Dispatched By';
    default:
      return 'From';
  }
}

function renderTemplateContent(
  doc: DocumentModel,
  calc: ReturnType<typeof calculateDocument>,
  theme: ReturnType<typeof getThemeColor>,
  upiQrUrl: string,
  docTitle: string
) {
  switch (doc.template) {
    case 'classic':
      return renderClassic(doc, calc, theme, upiQrUrl, docTitle);
    case 'minimal':
      return renderMinimal(doc, calc, theme, upiQrUrl, docTitle);
    case 'corporate':
      return renderCorporate(doc, calc, theme, upiQrUrl, docTitle);
    case 'elegant':
      return renderElegant(doc, calc, theme, upiQrUrl, docTitle);
    case 'bold':
      return renderBold(doc, calc, theme, upiQrUrl, docTitle);
    case 'gst_pro':
      return renderGSTPro(doc, calc, theme, upiQrUrl, docTitle);
    case 'freelancer':
      return renderFreelancer(doc, calc, theme, upiQrUrl, docTitle);
    case 'service':
      return renderService(doc, calc, theme, upiQrUrl, docTitle);
    case 'retail':
      return renderRetail(doc, calc, theme, upiQrUrl, docTitle);
    case 'modern':
    default:
      return renderModern(doc, calc, theme, upiQrUrl, docTitle);
  }
}

// -------------------------------------------------------------
// 1. MODERN TEMPLATE (Default)
// -------------------------------------------------------------
function renderModern(
  doc: DocumentModel,
  calc: ReturnType<typeof calculateDocument>,
  theme: ReturnType<typeof getThemeColor>,
  upiQrUrl: string,
  docTitle: string
) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-[#E7E0EE]">
        <div className="space-y-2">
          {doc.business.logo ? (
            <div className="relative w-36 h-14 mb-2">
              <Image
                src={doc.business.logo}
                alt={doc.business.name || 'Logo'}
                fill
                className="object-contain object-left"
                referrerPolicy="no-referrer"
                unoptimized
              />
            </div>
          ) : null}
          <h1 className="text-2xl font-bold tracking-tight text-[#17151F]">
            {doc.business.name || 'Your Business Name'}
          </h1>
          {doc.business.tagline && (
            <p className="text-xs text-[#6D6879] font-medium">{doc.business.tagline}</p>
          )}
          <div className="text-xs text-[#6D6879] space-y-0.5 max-w-sm">
            {doc.business.address && <p>{doc.business.address}</p>}
            <p>
              {doc.business.phone && <span>Tel: {doc.business.phone} • </span>}
              {doc.business.email && <span>{doc.business.email}</span>}
            </p>
            {doc.business.gstin && (
              <p className="font-medium text-[#17151F]">GSTIN: {doc.business.gstin}</p>
            )}
            {doc.business.pan && <p className="text-[#6D6879]">PAN: {doc.business.pan}</p>}
          </div>
        </div>

        <div className="text-left sm:text-right space-y-2">
          <div
            className="inline-block px-3 py-1 rounded text-xs font-bold tracking-wider text-white"
            style={{ backgroundColor: theme.primary }}
          >
            {docTitle}
          </div>
          <div className="text-lg font-bold text-[#17151F]">#{doc.meta.documentNumber}</div>
          <div className="text-xs text-[#6D6879] space-y-1">
            <p>
              <span className="text-[#6D6879]">Date:</span>{' '}
              <span className="font-medium">{fd(doc.meta.date) || '—'}</span>
            </p>
            {doc.meta.dueDate && (
              <p>
                <span className="text-[#6D6879]">Due Date:</span>{' '}
                <span className="font-medium">{fd(doc.meta.dueDate)}</span>
              </p>
            )}
            {doc.meta.referenceNumber && (
              <p>
                <span className="text-[#6D6879]">Ref:</span>{' '}
                <span className="font-medium">{doc.meta.referenceNumber}</span>
              </p>
            )}
            {doc.meta.placeOfSupply && (
              <p>
                <span className="text-[#6D6879]">Place of Supply:</span>{' '}
                <span className="font-medium">{doc.meta.placeOfSupply}</span>
              </p>
            )}
            {doc.meta.ewayBillNumber && (
              <p>
                <span className="text-[#6D6879]">E-way Bill No:</span>{' '}
                <span className="font-mono font-medium">{doc.meta.ewayBillNumber}</span>
              </p>
            )}
            {(doc.meta.customFields?.length ?? 0) > 0 && (
              <div className="mt-1">
                {doc.meta.customFields!.filter((f) => f.label.trim()).map((f) => (
                  <p key={f.id}>
                    <span className="text-[#6D6879]">{f.label}:</span>{' '}
                    <span className="font-medium">{f.value}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Customer Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-[#FAF6EE] border border-[#E7E0EE] text-xs">
        <div>
          <span className="font-semibold text-[#6D6879] uppercase tracking-wider block mb-1">
            {getPartyLabel(doc.type)}
          </span>
          <p className="text-sm font-bold text-[#17151F]">{doc.customer.name || 'Client Name'}</p>
          {doc.customer.company && <p className="font-medium text-[#17151F]">{doc.customer.company}</p>}
          {doc.customer.address && <p className="text-[#6D6879] mt-1">{doc.customer.address}</p>}
          <p className="text-[#6D6879]">
            {doc.customer.phone && <span>Tel: {doc.customer.phone} </span>}
            {doc.customer.email && <span>• {doc.customer.email}</span>}
          </p>
          {doc.customer.gstin && (
            <p className="font-semibold text-[#17151F] mt-1">GSTIN: {doc.customer.gstin}</p>
          )}
        </div>

        {doc.meta.paymentTerms && (
          <div className="sm:text-right">
            <span className="font-semibold text-[#6D6879] uppercase tracking-wider block mb-1">
              Terms & Notes
            </span>
            <p className="text-[#17151F] font-medium">{doc.meta.paymentTerms}</p>
            {doc.meta.validUntil && (
              <p className="text-[#6D6879] mt-1">Valid Until: {fd(doc.meta.validUntil)}</p>
            )}
          </div>
        )}
      </div>

      {/* Items Table */}
      {renderItemsTable(doc, theme, 'modern')}

      {/* Totals & Payment Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4 border-t border-[#E7E0EE]">
        <div className="md:col-span-7 space-y-4">
          {renderPaymentAndQR(doc, theme, upiQrUrl)}
          {renderNotesAndTerms(doc)}
        </div>

        <div className="md:col-span-5 space-y-2">
          {renderTotalsBox(doc, calc, theme)}
          {renderSignatureBlock(doc)}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 2. CLASSIC TEMPLATE
// -------------------------------------------------------------
function renderClassic(
  doc: DocumentModel,
  calc: ReturnType<typeof calculateDocument>,
  theme: ReturnType<typeof getThemeColor>,
  upiQrUrl: string,
  docTitle: string
) {
  return (
    <div className="space-y-6 font-serif">
      <div className="text-center border-b-2 border-[#17151F] pb-4">
        {doc.business.logo && (
          <div className="relative w-28 h-12 mx-auto mb-2">
            <Image src={doc.business.logo} alt="Logo" fill className="object-contain" referrerPolicy="no-referrer" unoptimized />
          </div>
        )}
        <h1 className="text-2xl font-bold tracking-widest text-[#17151F] uppercase">
          {doc.business.name || 'BUSINESS NAME'}
        </h1>
        <p className="text-xs text-[#6D6879] mt-1 font-sans">{doc.business.address}</p>
        <p className="text-xs text-[#6D6879] font-sans">
          {doc.business.phone && `Tel: ${doc.business.phone} `}
          {doc.business.email && `• Email: ${doc.business.email}`}
          {doc.business.gstin && ` • GSTIN: ${doc.business.gstin}`}
        </p>
      </div>

      <div className="flex justify-between items-center bg-[#FAF6EE] px-4 py-2 border-y border-[#E7E0EE] font-sans">
        <span className="font-bold text-sm tracking-wider uppercase text-[#17151F]">{docTitle}</span>
        <span className="font-bold text-sm text-[#17151F]">NO. {doc.meta.documentNumber}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs font-sans">
        <div className="border border-[#E7E0EE] p-3">
          <span className="font-bold text-[#17151F] uppercase block mb-1 border-b border-[#E7E0EE] pb-1">
            {getPartyLabel(doc.type)}:
          </span>
          <p className="font-bold text-[#17151F]">{doc.customer.name}</p>
          {doc.customer.company && <p>{doc.customer.company}</p>}
          {doc.customer.address && <p>{doc.customer.address}</p>}
          {doc.customer.phone && <p>Tel: {doc.customer.phone}</p>}
          {doc.customer.gstin && <p className="font-semibold">GSTIN: {doc.customer.gstin}</p>}
        </div>
        <div className="border border-[#E7E0EE] p-3 space-y-1">
          <p className="flex justify-between">
            <span className="text-[#6D6879]">Date:</span>
            <span className="font-bold">{fd(doc.meta.date)}</span>
          </p>
          {doc.meta.dueDate && (
            <p className="flex justify-between">
              <span className="text-[#6D6879]">Due Date:</span>
              <span className="font-bold">{fd(doc.meta.dueDate)}</span>
            </p>
          )}
          {doc.meta.referenceNumber && (
            <p className="flex justify-between">
              <span className="text-[#6D6879]">Ref No:</span>
              <span className="font-bold">{doc.meta.referenceNumber}</span>
            </p>
          )}
          {doc.meta.placeOfSupply && (
            <p className="flex justify-between">
              <span className="text-[#6D6879]">Place of Supply:</span>
              <span className="font-bold">{doc.meta.placeOfSupply}</span>
            </p>
          )}
        </div>
      </div>

      <div className="font-sans">{renderItemsTable(doc, theme, 'classic')}</div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4 font-sans">
        <div className="md:col-span-7 space-y-3">
          {renderPaymentAndQR(doc, theme, upiQrUrl)}
          {renderNotesAndTerms(doc)}
        </div>
        <div className="md:col-span-5 space-y-3">
          {renderTotalsBox(doc, calc, theme)}
          {renderSignatureBlock(doc)}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 3. MINIMAL TEMPLATE
// -------------------------------------------------------------
function renderMinimal(
  doc: DocumentModel,
  calc: ReturnType<typeof calculateDocument>,
  theme: ReturnType<typeof getThemeColor>,
  upiQrUrl: string,
  docTitle: string
) {
  return (
    <div className="space-y-8 font-sans">
      <div className="flex justify-between items-baseline border-b border-[#17151F] pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#17151F] uppercase">
            {doc.business.name || 'BUSINESS'}
          </h1>
          <p className="text-xs text-[#6D6879]">{doc.business.address}</p>
        </div>
        <div className="text-right">
          <span className="text-xs tracking-widest text-[#6D6879] uppercase">{docTitle}</span>
          <p className="text-sm font-mono font-bold text-[#17151F]">{doc.meta.documentNumber}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 text-xs">
        <div>
          <span className="text-[#6D6879] uppercase tracking-wider block mb-1">To</span>
          <p className="font-bold text-[#17151F]">{doc.customer.name}</p>
          {doc.customer.company && <p className="text-[#17151F]">{doc.customer.company}</p>}
          {doc.customer.address && <p className="text-[#6D6879]">{doc.customer.address}</p>}
          {doc.customer.gstin && <p className="text-[#6D6879]">GSTIN: {doc.customer.gstin}</p>}
        </div>
        <div className="text-right space-y-1">
          <p><span className="text-[#6D6879]">Date:</span> {fd(doc.meta.date)}</p>
          {doc.meta.dueDate && <p><span className="text-[#6D6879]">Due:</span> {fd(doc.meta.dueDate)}</p>}
          {doc.meta.referenceNumber && <p><span className="text-[#6D6879]">Ref:</span> {doc.meta.referenceNumber}</p>}
        </div>
      </div>

      {renderItemsTable(doc, theme, 'minimal')}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-4">
        <div className="md:col-span-7 space-y-4">
          {renderPaymentAndQR(doc, theme, upiQrUrl)}
          {renderNotesAndTerms(doc)}
        </div>
        <div className="md:col-span-5 space-y-3">
          {renderTotalsBox(doc, calc, theme)}
          {renderSignatureBlock(doc)}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 4. CORPORATE TEMPLATE
// -------------------------------------------------------------
function renderCorporate(
  doc: DocumentModel,
  calc: ReturnType<typeof calculateDocument>,
  theme: ReturnType<typeof getThemeColor>,
  upiQrUrl: string,
  docTitle: string
) {
  return (
    <div className="space-y-6">
      {/* Corporate Solid Header Strip */}
      <div className="p-6 rounded text-white flex justify-between items-center" style={{ backgroundColor: theme.primary }}>
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider">{doc.business.name || 'CORPORATE STUDIO'}</h1>
          <p className="text-xs text-white/80">{doc.business.tagline || 'Excellence In Execution'}</p>
        </div>
        <div className="text-right">
          <span className="text-xs uppercase font-bold tracking-widest bg-white/20 px-2 py-0.5 rounded">
            {docTitle}
          </span>
          <div className="text-xl font-bold font-mono mt-1">#{doc.meta.documentNumber}</div>
        </div>
      </div>

      {/* Meta Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#FAF6EE] p-3 rounded text-xs">
        <div><span className="text-[#6D6879] block font-semibold">ISSUE DATE</span><span className="font-bold">{fd(doc.meta.date)}</span></div>
        <div><span className="text-[#6D6879] block font-semibold">DUE DATE</span><span className="font-bold">{fd(doc.meta.dueDate) || '—'}</span></div>
        <div><span className="text-[#6D6879] block font-semibold">REF NUMBER</span><span className="font-bold">{doc.meta.referenceNumber || '—'}</span></div>
        <div><span className="text-[#6D6879] block font-semibold">SUPPLY STATE</span><span className="font-bold">{doc.meta.placeOfSupply || '—'}</span></div>
      </div>

      {/* Recipient */}
      <div className="border-l-4 p-3 bg-[#FAF6EE] text-xs" style={{ borderColor: theme.primary }}>
        <span className="text-[#6D6879] uppercase font-bold">{getPartyLabel(doc.type).toUpperCase()} INFORMATION</span>
        <p className="text-sm font-bold text-[#17151F] mt-0.5">{doc.customer.name}</p>
        <p className="text-[#6D6879]">{doc.customer.company} {doc.customer.address ? `• ${doc.customer.address}` : ''}</p>
        {doc.customer.gstin && <p className="font-medium text-[#17151F]">GSTIN: {doc.customer.gstin}</p>}
      </div>

      {renderItemsTable(doc, theme, 'corporate')}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
        <div className="md:col-span-7 space-y-4">
          {renderPaymentAndQR(doc, theme, upiQrUrl)}
          {renderNotesAndTerms(doc)}
        </div>
        <div className="md:col-span-5 space-y-3">
          {renderTotalsBox(doc, calc, theme)}
          {renderSignatureBlock(doc)}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 5. ELEGANT TEMPLATE
// -------------------------------------------------------------
function renderElegant(
  doc: DocumentModel,
  calc: ReturnType<typeof calculateDocument>,
  theme: ReturnType<typeof getThemeColor>,
  upiQrUrl: string,
  docTitle: string
) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end border-b pb-4" style={{ borderColor: theme.border }}>
        <div>
          <span className="text-xs uppercase tracking-widest text-[#B45309] font-serif block mb-1">
            ESTABLISHED BUSINESS
          </span>
          <h1 className="text-2xl font-serif font-bold text-[#17151F]">{doc.business.name || 'Studio'}</h1>
          <p className="text-xs text-[#6D6879]">{doc.business.address}</p>
        </div>
        <div className="text-right">
          <span className="text-xs tracking-widest uppercase font-serif" style={{ color: theme.primary }}>
            {docTitle}
          </span>
          <p className="text-lg font-serif font-bold text-[#17151F]">№ {doc.meta.documentNumber}</p>
          <p className="text-xs text-[#6D6879]">{fd(doc.meta.date)}</p>
        </div>
      </div>

      <div className="p-4 rounded border text-xs" style={{ borderColor: theme.border, backgroundColor: theme.lightBg }}>
        <span className="text-xs uppercase font-serif tracking-widest block mb-1" style={{ color: theme.primary }}>
          Presented to
        </span>
        <p className="font-serif font-bold text-sm text-[#17151F]">{doc.customer.name}</p>
        {doc.customer.company && <p className="text-[#17151F]">{doc.customer.company}</p>}
        {doc.customer.address && <p className="text-[#6D6879]">{doc.customer.address}</p>}
      </div>

      {renderItemsTable(doc, theme, 'elegant')}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4">
        <div className="md:col-span-7 space-y-4">
          {renderPaymentAndQR(doc, theme, upiQrUrl)}
          {renderNotesAndTerms(doc)}
        </div>
        <div className="md:col-span-5 space-y-3">
          {renderTotalsBox(doc, calc, theme)}
          {renderSignatureBlock(doc)}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 6. BOLD TEMPLATE
// -------------------------------------------------------------
function renderBold(
  doc: DocumentModel,
  calc: ReturnType<typeof calculateDocument>,
  theme: ReturnType<typeof getThemeColor>,
  upiQrUrl: string,
  docTitle: string
) {
  return (
    <div className="space-y-6">
      <div className="bg-[#17151F] text-white p-6 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-amber-400 font-bold block mb-1">
            {docTitle}
          </span>
          <h1 className="text-2xl font-black">{doc.business.name || 'BUSINESS'}</h1>
          <p className="text-xs text-[#6D6879] mt-1">{doc.business.email} • {doc.business.phone}</p>
        </div>
        <div className="text-left sm:text-right">
          <div className="text-xs text-[#6D6879] uppercase font-semibold">Document No.</div>
          <div className="text-xl font-black font-mono text-white">{doc.meta.documentNumber}</div>
          <div className="text-xs text-[#6D6879] mt-1">Date: {fd(doc.meta.date)}</div>
        </div>
      </div>

      <div className="bg-[#FAF6EE] p-4 rounded-md text-xs grid grid-cols-2 gap-4">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-[#6D6879] block mb-1">{getPartyLabel(doc.type)}</span>
          <p className="font-bold text-sm text-[#17151F]">{doc.customer.name}</p>
          <p className="text-[#6D6879]">{doc.customer.company}</p>
          <p className="text-[#6D6879]">{doc.customer.address}</p>
        </div>
        <div className="text-right space-y-1">
          {doc.meta.dueDate && <p><span className="text-[#6D6879]">Due:</span> <span className="font-bold">{fd(doc.meta.dueDate)}</span></p>}
          {doc.customer.gstin && <p><span className="text-[#6D6879]">GSTIN:</span> <span className="font-bold">{doc.customer.gstin}</span></p>}
        </div>
      </div>

      {renderItemsTable(doc, theme, 'bold')}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4">
        <div className="md:col-span-7 space-y-4">
          {renderPaymentAndQR(doc, theme, upiQrUrl)}
          {renderNotesAndTerms(doc)}
        </div>
        <div className="md:col-span-5 space-y-3">
          {renderTotalsBox(doc, calc, theme)}
          {renderSignatureBlock(doc)}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 7. GST PROFESSIONAL TEMPLATE (Indian Standard)
// -------------------------------------------------------------
function renderGSTPro(
  doc: DocumentModel,
  calc: ReturnType<typeof calculateDocument>,
  theme: ReturnType<typeof getThemeColor>,
  upiQrUrl: string,
  docTitle: string
) {
  return (
    <div className="space-y-4 text-xs font-sans border-2 border-[#17151F] p-4 rounded">
      {/* Title */}
      <div className="text-center pb-2 border-b border-[#17151F]">
        <h2 className="text-base font-black tracking-wider uppercase text-[#17151F]">{docTitle}</h2>
        <span className="text-[10px] text-[#6D6879] uppercase font-semibold">
          (Under Section 31 of GST Act, 2017)
        </span>
      </div>

      {/* Business & Invoice Grid */}
      <div className="grid grid-cols-2 gap-2 border-b border-[#17151F] pb-3">
        <div className="pr-2 border-r border-[#E7E0EE]">
          <h3 className="font-bold text-sm text-[#17151F]">{doc.business.name || 'TAXABLE SUPPLIER'}</h3>
          <p className="text-[#6D6879]">{doc.business.address}</p>
          <p className="font-semibold text-[#17151F] mt-1">GSTIN: {doc.business.gstin || '—'}</p>
          <p className="text-[#17151F]">PAN: {doc.business.pan || '—'} | State: {doc.business.state} ({doc.business.stateCode})</p>
        </div>
        <div className="pl-2 space-y-1">
          <p className="flex justify-between"><span className="font-semibold text-[#6D6879]">Invoice No:</span> <span className="font-bold">{doc.meta.documentNumber}</span></p>
          <p className="flex justify-between"><span className="font-semibold text-[#6D6879]">Invoice Date:</span> <span>{fd(doc.meta.date)}</span></p>
          <p className="flex justify-between"><span className="font-semibold text-[#6D6879]">Due Date:</span> <span>{fd(doc.meta.dueDate) || '—'}</span></p>
          <p className="flex justify-between"><span className="font-semibold text-[#6D6879]">Place of Supply:</span> <span className="font-bold">{doc.meta.placeOfSupply || doc.customer.placeOfSupply || '—'}</span></p>
          <p className="flex justify-between"><span className="font-semibold text-[#6D6879]">Reverse Charge:</span> <span>No</span></p>
        </div>
      </div>

      {/* Recipient Details */}
      <div className="border-b border-[#17151F] pb-3">
        <span className="font-bold text-[#17151F] uppercase block mb-1">Details of Receiver (Billed To):</span>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="font-bold text-[#17151F]">{doc.customer.name}</p>
            <p className="text-[#6D6879]">{doc.customer.company}</p>
            <p className="text-[#6D6879]">{doc.customer.address}</p>
          </div>
          <div>
            <p className="font-semibold text-[#17151F]">GSTIN: {doc.customer.gstin || 'Unregistered'}</p>
            <p className="text-[#17151F]">State: {doc.customer.state || '—'} ({doc.customer.stateCode || '—'})</p>
            <p className="text-[#6D6879]">Contact: {doc.customer.phone || doc.customer.email || '—'}</p>
          </div>
        </div>
      </div>

      {/* GST Table */}
      {renderGSTTable(doc, theme)}

      {/* Totals & Tax Breakup */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2 border-t border-[#17151F]">
        <div className="md:col-span-7 space-y-3">
          <div className="border border-[#E7E0EE] p-2.5 rounded bg-[#FAF6EE]">
            <span className="font-bold text-[#17151F] block mb-0.5">Total Amount in Words:</span>
            <p className="text-[#17151F] font-medium italic">{calc.amountInWords}</p>
          </div>
          {renderPaymentAndQR(doc, theme, upiQrUrl)}
          {renderNotesAndTerms(doc)}
        </div>
        <div className="md:col-span-5 space-y-3">
          {renderTotalsBox(doc, calc, theme)}
          {renderSignatureBlock(doc)}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 8. FREELANCER TEMPLATE
// -------------------------------------------------------------
function renderFreelancer(
  doc: DocumentModel,
  calc: ReturnType<typeof calculateDocument>,
  theme: ReturnType<typeof getThemeColor>,
  upiQrUrl: string,
  docTitle: string
) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4" style={{ borderColor: theme.border }}>
        <div>
          <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded text-white" style={{ backgroundColor: theme.primary }}>
            {docTitle}
          </span>
          <h1 className="text-xl font-bold text-[#17151F] mt-2">{doc.business.name || 'Freelance Studio'}</h1>
          <p className="text-xs text-[#6D6879]">{doc.business.email}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold font-mono">Invoice #{doc.meta.documentNumber}</p>
          <p className="text-xs text-[#6D6879]">Date: {fd(doc.meta.date)}</p>
        </div>
      </div>

      <div className="bg-[#FAF6EE] p-4 rounded-xl border border-[#E7E0EE] text-xs">
        <span className="text-[#6D6879] font-semibold block mb-1">{getPartyLabel(doc.type).toUpperCase()}</span>
        <p className="font-bold text-sm text-[#17151F]">{doc.customer.name}</p>
        <p className="text-[#6D6879]">{doc.customer.company}</p>
      </div>

      {renderItemsTable(doc, theme, 'freelancer')}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
        <div className="md:col-span-7 space-y-4">
          {renderPaymentAndQR(doc, theme, upiQrUrl)}
          {renderNotesAndTerms(doc)}
        </div>
        <div className="md:col-span-5 space-y-3">
          {renderTotalsBox(doc, calc, theme)}
          {renderSignatureBlock(doc)}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 9. SERVICE TEMPLATE
// -------------------------------------------------------------
function renderService(
  doc: DocumentModel,
  calc: ReturnType<typeof calculateDocument>,
  theme: ReturnType<typeof getThemeColor>,
  upiQrUrl: string,
  docTitle: string
) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start pb-4 border-b border-[#E7E0EE]">
        <div>
          <h1 className="text-2xl font-bold text-[#17151F]">{doc.business.name || 'Services Ltd'}</h1>
          <p className="text-xs text-[#6D6879]">{doc.business.tagline || 'Professional Client Engagements'}</p>
          <p className="text-xs text-[#6D6879] mt-1">{doc.business.address}</p>
        </div>
        <div className="text-right">
          <span className="px-3 py-1 rounded text-xs font-bold text-white tracking-wider" style={{ backgroundColor: theme.primary }}>
            {docTitle}
          </span>
          <div className="text-lg font-bold text-[#17151F] mt-2">{doc.meta.documentNumber}</div>
          <div className="text-xs text-[#6D6879]">Date: {fd(doc.meta.date)}</div>
        </div>
      </div>

      <div className="p-4 rounded border border-[#E7E0EE] text-xs grid grid-cols-2 gap-4">
        <div>
          <span className="font-bold text-[#6D6879] uppercase">Service Recipient</span>
          <p className="font-bold text-[#17151F] mt-1">{doc.customer.name}</p>
          <p className="text-[#6D6879]">{doc.customer.company}</p>
          <p className="text-[#6D6879]">{doc.customer.address}</p>
        </div>
        <div className="text-right space-y-1">
          <p><span className="text-[#6D6879]">Due:</span> <span className="font-medium">{fd(doc.meta.dueDate)}</span></p>
          <p><span className="text-[#6D6879]">Terms:</span> <span className="font-medium">{doc.meta.paymentTerms || 'Standard'}</span></p>
        </div>
      </div>

      {renderItemsTable(doc, theme, 'service')}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4">
        <div className="md:col-span-7 space-y-4">
          {renderPaymentAndQR(doc, theme, upiQrUrl)}
          {renderNotesAndTerms(doc)}
        </div>
        <div className="md:col-span-5 space-y-3">
          {renderTotalsBox(doc, calc, theme)}
          {renderSignatureBlock(doc)}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// 10. RETAIL TEMPLATE (Compact Receipt Docket)
// -------------------------------------------------------------
function renderRetail(
  doc: DocumentModel,
  calc: ReturnType<typeof calculateDocument>,
  theme: ReturnType<typeof getThemeColor>,
  upiQrUrl: string,
  docTitle: string
) {
  return (
    <div className="space-y-4 max-w-xl mx-auto font-mono text-xs">
      <div className="text-center border-b-2 border-dashed border-[#E7E0EE] pb-3">
        <h1 className="text-lg font-bold uppercase">{doc.business.name || 'RETAIL STORE'}</h1>
        <p className="text-[#6D6879]">{doc.business.address}</p>
        <p className="text-[#6D6879]">GSTIN: {doc.business.gstin || 'UNREGISTERED'}</p>
        <div className="mt-2 text-xs font-bold uppercase tracking-widest">{docTitle}</div>
        <div className="text-[#6D6879]">REC #{doc.meta.documentNumber} • {fd(doc.meta.date)}</div>
      </div>

      <div className="border-b border-dashed border-[#E7E0EE] pb-2">
        <span className="text-[#6D6879]">{getPartyLabel(doc.type)}: </span>
        <span className="font-bold">{doc.customer.name || 'Counter Customer'}</span>
      </div>

      {renderItemsTable(doc, theme, 'retail')}

      <div className="border-t-2 border-dashed border-[#E7E0EE] pt-3 space-y-2">
        {renderTotalsBox(doc, calc, theme)}
      </div>

      <div className="border-t border-dashed border-[#E7E0EE] pt-3 text-center space-y-2">
        {renderPaymentAndQR(doc, theme, upiQrUrl)}
        <p className="text-[#6D6879] text-[11px]">{doc.notes || 'Thank you for shopping with us!'}</p>
        <p className="text-[10px] text-[#6D6879]">{doc.terms || 'Goods once sold cannot be returned.'}</p>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// HELPER: Items Table Renderer
// -------------------------------------------------------------
function renderItemsTable(doc: DocumentModel, theme: ReturnType<typeof getThemeColor>, styleVariant: string) {
  return (
    <div className="overflow-x-auto my-4">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr
            className={`border-b text-[11px] font-bold uppercase tracking-wider ${
              styleVariant === 'corporate'
                ? 'bg-[#FAF6EE] text-[#17151F]'
                : styleVariant === 'modern'
                ? 'bg-[#FAF6EE] text-[#6D6879]'
                : 'text-[#6D6879] border-[#E7E0EE]'
            }`}
          >
            <th className="py-2 px-2 w-8">#</th>
            <th className="py-2 px-2">Item & Description</th>
            {doc.tax.mode === 'gst' && <th className="py-2 px-2 text-center">HSN/SAC</th>}
            <th className="py-2 px-2 text-center">Qty</th>
            <th className="py-2 px-2 text-right">Rate</th>
            {doc.discount.type !== 'none' && <th className="py-2 px-2 text-right">Disc</th>}
            {doc.tax.mode !== 'none' && <th className="py-2 px-2 text-center">Tax</th>}
            <th className="py-2 px-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E7E0EE] text-[#17151F]">
          {doc.items.map((item, idx) => {
            const row = calculateItemRow(item);
            return (
              <tr key={item.id || idx} className="hover:bg-[#FAF6EE]/50">
                <td className="py-2.5 px-2 text-[#6D6879] text-[11px] align-top">{idx + 1}</td>
                <td className="py-2.5 px-2 align-top">
                  <div className="font-semibold text-[#17151F]">{item.name || 'Untitled Item'}</div>
                  {item.description && (
                    <div className="text-[11px] text-[#6D6879] whitespace-pre-line mt-0.5">{item.description}</div>
                  )}
                </td>
                {doc.tax.mode === 'gst' && (
                  <td className="py-2.5 px-2 text-center font-mono text-[#6D6879] align-top">{item.hsn || '—'}</td>
                )}
                <td className="py-2.5 px-2 text-center align-top font-medium">
                  {row.quantity} {item.unit !== 'pcs' ? item.unit : ''}
                </td>
                <td className="py-2.5 px-2 text-right font-medium align-top">
                  {formatCurrency(row.rate, doc.currency)}
                </td>
                {doc.discount.type !== 'none' && (
                  <td className="py-2.5 px-2 text-right text-[#6D6879] align-top">
                    {row.discountAmount > 0 ? `-${formatCurrency(row.discountAmount, doc.currency)}` : '—'}
                  </td>
                )}
                {doc.tax.mode !== 'none' && (
                  <td className="py-2.5 px-2 text-center text-[#6D6879] align-top">
                    {item.taxRate}%
                  </td>
                )}
                <td className="py-2.5 px-2 text-right font-bold text-[#17151F] align-top">
                  {formatCurrency(row.total, doc.currency)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// -------------------------------------------------------------
// HELPER: Official GST Table
// -------------------------------------------------------------
function renderGSTTable(doc: DocumentModel, theme: ReturnType<typeof getThemeColor>) {
  const isCgstSgst = doc.tax.gstType === 'cgst_sgst';

  return (
    <div className="overflow-x-auto my-2">
      <table className="w-full text-left text-[11px] border border-[#E7E0EE] border-collapse">
        <thead className="bg-[#FAF6EE] font-bold border-b border-[#E7E0EE]">
          <tr>
            <th className="p-1.5 border-r border-[#E7E0EE] w-6 text-center">#</th>
            <th className="p-1.5 border-r border-[#E7E0EE]">Item Description</th>
            <th className="p-1.5 border-r border-[#E7E0EE] text-center">HSN</th>
            <th className="p-1.5 border-r border-[#E7E0EE] text-center">Qty</th>
            <th className="p-1.5 border-r border-[#E7E0EE] text-right">Rate</th>
            <th className="p-1.5 border-r border-[#E7E0EE] text-right">Taxable</th>
            {isCgstSgst ? (
              <>
                <th className="p-1.5 border-r border-[#E7E0EE] text-center">CGST %</th>
                <th className="p-1.5 border-r border-[#E7E0EE] text-center">SGST %</th>
              </>
            ) : (
              <th className="p-1.5 border-r border-[#E7E0EE] text-center">IGST %</th>
            )}
            <th className="p-1.5 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E7E0EE]">
          {doc.items.map((item, idx) => {
            const row = calculateItemRow(item);
            const halfTax = (Number(item.taxRate) || 0) / 2;
            return (
              <tr key={item.id || idx}>
                <td className="p-1.5 border-r border-[#E7E0EE] text-center">{idx + 1}</td>
                <td className="p-1.5 border-r border-[#E7E0EE]">
                  <div className="font-semibold">{item.name}</div>
                  {item.description && <div className="text-[10px] text-[#6D6879]">{item.description}</div>}
                </td>
                <td className="p-1.5 border-r border-[#E7E0EE] text-center font-mono">{item.hsn || '—'}</td>
                <td className="p-1.5 border-r border-[#E7E0EE] text-center">{row.quantity}</td>
                <td className="p-1.5 border-r border-[#E7E0EE] text-right">{formatCurrency(row.rate, doc.currency)}</td>
                <td className="p-1.5 border-r border-[#E7E0EE] text-right font-medium">{formatCurrency(row.taxable, doc.currency)}</td>
                {isCgstSgst ? (
                  <>
                    <td className="p-1.5 border-r border-[#E7E0EE] text-center">{halfTax}%</td>
                    <td className="p-1.5 border-r border-[#E7E0EE] text-center">{halfTax}%</td>
                  </>
                ) : (
                  <td className="p-1.5 border-r border-[#E7E0EE] text-center">{item.taxRate}%</td>
                )}
                <td className="p-1.5 text-right font-bold">{formatCurrency(row.total, doc.currency)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// -------------------------------------------------------------
// HELPER: Totals Box
// -------------------------------------------------------------
function renderTotalsBox(
  doc: DocumentModel,
  calc: ReturnType<typeof calculateDocument>,
  theme: ReturnType<typeof getThemeColor>
) {
  return (
    <div className="bg-[#FAF6EE] p-4 rounded-lg border border-[#E7E0EE] text-xs space-y-2">
      <div className="flex justify-between text-[#6D6879]">
        <span>Subtotal</span>
        <span className="font-semibold text-[#17151F]">{formatCurrency(calc.subtotal, doc.currency)}</span>
      </div>

      {calc.totalDiscount > 0 && (
        <div className="flex justify-between text-emerald-700">
          <span>Discount ({doc.discount.type === 'percent' ? `${doc.discount.value}%` : 'Fixed'})</span>
          <span className="font-semibold">-{formatCurrency(calc.totalDiscount, doc.currency)}</span>
        </div>
      )}

      {doc.tax.mode !== 'none' && (
        <div className="flex justify-between text-[#6D6879] border-t border-[#E7E0EE]/60 pt-1.5">
          <span>Taxable Amount</span>
          <span className="font-semibold text-[#17151F]">{formatCurrency(calc.taxableAmount, doc.currency)}</span>
        </div>
      )}

      {/* Tax Breakdown */}
      {doc.tax.mode === 'gst' && doc.tax.gstType === 'cgst_sgst' && (
        <>
          <div className="flex justify-between text-[#6D6879]">
            <span>CGST</span>
            <span className="font-semibold">{formatCurrency(calc.cgst, doc.currency)}</span>
          </div>
          <div className="flex justify-between text-[#6D6879]">
            <span>SGST</span>
            <span className="font-semibold">{formatCurrency(calc.sgst, doc.currency)}</span>
          </div>
        </>
      )}

      {doc.tax.mode === 'gst' && doc.tax.gstType === 'igst' && (
        <div className="flex justify-between text-[#6D6879]">
          <span>IGST</span>
          <span className="font-semibold">{formatCurrency(calc.igst, doc.currency)}</span>
        </div>
      )}

      {doc.tax.mode === 'custom' && (
        <div className="flex justify-between text-[#6D6879]">
          <span>{doc.tax.customTaxName || 'Tax'} ({doc.tax.customTaxRate}%)</span>
          <span className="font-semibold">{formatCurrency(calc.customTax, doc.currency)}</span>
        </div>
      )}

      {doc.autoRoundOff && calc.roundOff !== 0 && (
        <div className="flex justify-between text-[#6D6879] text-[11px]">
          <span>Round Off</span>
          <span>{calc.roundOff > 0 ? `+${calc.roundOff.toFixed(2)}` : calc.roundOff.toFixed(2)}</span>
        </div>
      )}

      <div
        className="flex justify-between items-center text-white px-2.5 py-1.5 rounded-md font-extrabold text-[11px] mt-1 shadow-xs"
        style={{ backgroundColor: theme.primary }}
      >
        <span className="tracking-wider uppercase">TOTAL</span>
        <span className="text-sm font-black">
          {formatCurrency(calc.grandTotal, doc.currency)}
        </span>
      </div>

      {/* Recorded payments summary — advances reduce the balance shown */}
      {(doc.payments?.length ?? 0) > 0 && (() => {
        const ps = paymentSummary(Math.round(calc.grandTotal * 100), doc.payments || []);
        return (
          <div className="space-y-1 pt-1.5 border-t border-[#E7E0EE]">
            <div className="flex justify-between text-emerald-700">
              <span>Paid / Advance</span>
              <span className="font-bold">−{formatCurrency(ps.paidMinor / 100, doc.currency)}</span>
            </div>
            <div className="flex justify-between font-bold text-[#17151F]">
              <span className="uppercase tracking-wider text-[10px]">Balance Due</span>
              <span className="font-black">{formatCurrency(ps.balanceMinor / 100, doc.currency)}</span>
            </div>
            <div
              className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-extrabold border ${
                ps.status === 'PAID'
                  ? 'bg-emerald-100 border-emerald-400 text-emerald-800'
                  : 'bg-amber-100 border-amber-400 text-amber-800'
              }`}
            >
              {ps.status}
            </div>
          </div>
        );
      })()}

      <div className="text-[10px] text-[#6D6879] italic pt-1 border-t border-[#E7E0EE]">
        {calc.amountInWords}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// HELPER: Payment and UPI QR Box
// -------------------------------------------------------------
function renderPaymentAndQR(
  doc: DocumentModel,
  theme: ReturnType<typeof getThemeColor>,
  upiQrUrl: string
) {
  const hasBank = doc.payment.method === 'bank' && (doc.payment.bankName || doc.payment.accountNumber);
  const hasUPI = doc.payment.method === 'upi' && doc.payment.upiId;

  if (!hasBank && !hasUPI && doc.payment.method === 'cash') {
    return (
      <div className="text-xs p-3 rounded bg-[#FAF6EE] border border-[#E7E0EE]">
        <span className="font-bold text-[#17151F] block">Payment Mode:</span>
        <p className="text-[#6D6879]">Cash on Delivery / Direct Settlement</p>
      </div>
    );
  }

  return (
    <div className="p-3.5 rounded-lg bg-[#FAF6EE] border border-[#E7E0EE] text-xs">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 flex-1">
          <span className="font-bold text-[#17151F] uppercase tracking-wider text-[11px] block">
            Payment Details
          </span>

          {hasBank && (
            <div className="space-y-0.5 text-[#17151F] mt-1">
              <p><span className="text-[#6D6879]">Bank:</span> <span className="font-semibold">{doc.payment.bankName}</span></p>
              <p><span className="text-[#6D6879]">A/C Name:</span> <span className="font-medium">{doc.payment.accountHolder || doc.business.name}</span></p>
              <p><span className="text-[#6D6879]">A/C No:</span> <span className="font-mono font-semibold">{doc.payment.accountNumber}</span></p>
              <p><span className="text-[#6D6879]">IFSC:</span> <span className="font-mono font-semibold">{doc.payment.ifsc}</span></p>
              {doc.payment.branch && <p><span className="text-[#6D6879]">Branch:</span> <span>{doc.payment.branch}</span></p>}
            </div>
          )}

          {hasUPI && (
            <div className="space-y-0.5 text-[#17151F] mt-1">
              <p><span className="text-[#6D6879]">UPI ID:</span> <span className="font-mono font-bold text-[#17151F]">{doc.payment.upiId}</span></p>
              {doc.payment.upiPayeeName && <p><span className="text-[#6D6879]">Payee:</span> <span>{doc.payment.upiPayeeName}</span></p>}
            </div>
          )}

          {/* External payment link — only rendered when it passes the same
              https:// validation used in the editor; never treated as proof of payment */}
          {doc.payment.showPaymentLink && doc.payment.paymentLink && validatePaymentLink(doc.payment.paymentLink).valid && (
            <div className="mt-1.5">
              <a
                href={doc.payment.paymentLink}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-block font-bold underline break-all"
                style={{ color: theme.primary }}
              >
                Pay online: {doc.payment.paymentLink}
              </a>
            </div>
          )}

          {doc.payment.notes && <p className="text-[11px] text-[#6D6879] mt-1 italic">{doc.payment.notes}</p>}

          {/* Payments received against this document */}
          {(doc.payments?.length ?? 0) > 0 && (
            <div className="mt-1.5 pt-1.5 border-t border-[#E7E0EE]/70">
              <span className="text-[10px] font-bold text-[#17151F] uppercase tracking-wider block mb-0.5">
                Payments Received
              </span>
              <ul className="space-y-0.5">
                {(doc.payments || []).map((p) => (
                  <li key={p.id} className="text-[10px] text-[#6D6879]">
                    <b className="text-[#17151F]">{formatCurrency(p.amountMinor / 100, doc.currency)}</b> · {p.date} · {p.method}
                    {p.reference ? ` · ref ${p.reference}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Client-Side QR Code */}
        {hasUPI && doc.payment.showUPIQR && upiQrUrl && (
          <div className="text-center p-1.5 bg-white rounded border border-[#E7E0EE] shrink-0">
            <div className="relative w-20 h-20">
              <Image src={upiQrUrl} alt="UPI Payment QR" fill className="object-contain" referrerPolicy="no-referrer" unoptimized />
            </div>
            <span className="text-[9px] font-bold text-[#6D6879] uppercase tracking-wider block mt-1">
              Scan to Pay
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// HELPER: Notes & Terms
// -------------------------------------------------------------
/** Type-specific metadata rows (PO delivery date, challan transport, note references). */
function renderDocumentSpecifics(doc: DocumentModel) {
  const rows: { label: string; value: string }[] = [];
  if (doc.type === 'purchase_order' && doc.meta.expectedDeliveryDate) {
    rows.push({ label: 'Expected Delivery', value: doc.meta.expectedDeliveryDate });
  }
  if (doc.type === 'delivery_challan') {
    if (doc.meta.deliveryAddress) rows.push({ label: 'Delivery Address', value: doc.meta.deliveryAddress });
    if (doc.meta.vehicleInfo) rows.push({ label: 'Vehicle / Transport', value: doc.meta.vehicleInfo });
    if (doc.meta.referenceNumber) rows.push({ label: 'Reference (Invoice/PO)', value: doc.meta.referenceNumber });
  }
  if ((doc.type === 'credit_note' || doc.type === 'debit_note') && doc.meta.linkedInvoice) {
    rows.push({ label: 'Original Invoice', value: doc.meta.linkedInvoice });
  }
  if ((doc.type === 'credit_note' || doc.type === 'debit_note') && doc.meta.adjustmentReason) {
    rows.push({ label: 'Reason for Issue', value: doc.meta.adjustmentReason });
  }
  if (doc.type === 'delivery_challan') {
    rows.push({ label: 'Received By', value: doc.meta.receivedBy || '__________________' });
  }
  if ((doc.type === 'invoice' || doc.type === 'delivery_challan') && doc.meta.ewayBillNumber) {
    rows.push({ label: 'E-way Bill No', value: doc.meta.ewayBillNumber });
  }
  if ((doc.meta.customFields?.length ?? 0) > 0) {
    for (const f of doc.meta.customFields!.filter((x) => x.label.trim())) {
      rows.push({ label: f.label, value: f.value || '—' });
    }
  }
  if (rows.length === 0) return null;
  return (
    <div className="rounded-lg border border-[#E7E0EE] bg-[#FAF6EE] p-2.5 space-y-1">
      {rows.map((r) => (
        <div key={r.label} className="flex gap-2">
          <span className="font-bold text-[#17151F] shrink-0">{r.label}:</span>
          <span className="text-[#6D6879] break-words">{r.value}</span>
        </div>
      ))}
      {(doc.type === 'credit_note' || doc.type === 'debit_note') && (
        <p className="text-[10px] italic text-[#6D6879] pt-1 border-t border-[#E7E0EE]">
          Tax treatment of this adjustment depends on the underlying transaction and applicable
          Indian GST law. Please confirm statutory compliance before issuing.
        </p>
      )}
    </div>
  );
}

function renderNotesAndTerms(doc: DocumentModel) {
  const specifics = renderDocumentSpecifics(doc);
  if (!doc.notes && !doc.terms && !specifics) return null;
  return (
    <div className="space-y-2 text-xs">
      {specifics}
      {doc.notes && (
        <div>
          <span className="font-bold text-[#17151F] block mb-0.5">Notes:</span>
          <p className="text-[#6D6879] whitespace-pre-line leading-relaxed">{doc.notes}</p>
        </div>
      )}
      {doc.terms && (
        <div>
          <span className="font-bold text-[#17151F] block mb-0.5">Terms & Conditions:</span>
          <p className="text-[#6D6879] whitespace-pre-line text-[11px] leading-relaxed">{doc.terms}</p>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// HELPER: Signature Block
// -------------------------------------------------------------
function renderSignatureBlock(doc: DocumentModel) {
  if (doc.signature.type === 'none') return null;

  return (
    <div className="pt-4 text-right">
      <div className="inline-block text-center min-w-[140px]">
        {doc.signature.type === 'draw' || doc.signature.type === 'upload' ? (
          doc.signature.image ? (
            <div className="relative w-36 h-12 mx-auto mb-1 border-b border-[#E7E0EE]">
              <Image src={doc.signature.image} alt="Signature" fill className="object-contain" referrerPolicy="no-referrer" unoptimized />
            </div>
          ) : (
            <div className="h-10 border-b border-[#E7E0EE] mb-1" />
          )
        ) : doc.signature.type === 'text' && doc.signature.text ? (
          <p className="font-serif italic text-base text-[#17151F] border-b border-[#E7E0EE] pb-1 mb-1 font-medium">
            {doc.signature.text}
          </p>
        ) : (
          <div className="h-10 border-b border-[#E7E0EE] mb-1" />
        )}
        <span className="text-[11px] font-bold text-[#17151F] uppercase block tracking-wider">
          {doc.signature.designation || 'Authorized Signatory'}
        </span>
        <span className="text-[10px] text-[#6D6879] block">{doc.business.name}</span>
      </div>
    </div>
  );
}


/* ------------------------- watermark overlay ------------------------- */

const WM_POS: Record<string, string> = {
  center: 'inset-0 flex items-center justify-center',
  tl: 'top-[6%] left-[4%]',
  tr: 'top-[6%] right-[4%]',
  bl: 'bottom-[6%] left-[4%]',
  br: 'bottom-[6%] right-[4%]',
};

/** Business-logo watermark: image centred behind content, opacity clamped. */
const LogoWatermark: React.FC<{
  logo: string;
  opacity: number;
  position: 'center' | 'tl' | 'tr' | 'bl' | 'br';
}> = ({ logo, opacity, position }) => {
  const [failed, setFailed] = React.useState(false);
  if (failed) return null; // image failed to load -> no watermark at all
  // logos are stronger than text: clamp tighter to keep totals legible
  const safeOpacity = Math.min(0.15, Math.max(0.04, Number(opacity) || 0.08));
  return (
    <div aria-hidden className={`absolute pointer-events-none z-[1] flex ${WM_POS[position] || WM_POS.center}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logo}
        alt=""
        onError={() => setFailed(true)}
        style={{ opacity: safeOpacity, width: '42%', maxWidth: 300, objectFit: 'contain', userSelect: 'none' }}
      />
    </div>
  );
};

const WatermarkOverlay: React.FC<{
  text: string;
  opacity: number;
  position: 'center' | 'tl' | 'tr' | 'bl' | 'br';
  rotation: number;
}> = ({ text, opacity, position, rotation }) => {
  // clamp within safe limits so readability/contrast is preserved
  const safeOpacity = Math.min(0.2, Math.max(0.04, Number(opacity) || 0.08));
  const safeRotation = Math.min(45, Math.max(-45, Number(rotation) || 0));
  const t = text.trim().slice(0, 40);
  // size adapts so long names still fit the page
  const fontSize = t.length <= 8 ? 96 : t.length <= 14 ? 72 : t.length <= 22 ? 54 : 42;
  return (
    <div
      aria-hidden
      className={`absolute pointer-events-none z-[1] ${WM_POS[position] || WM_POS.center}`}
    >
      <span
        style={{
          opacity: safeOpacity,
          transform: `rotate(${safeRotation}deg)`,
          fontSize: `${fontSize}px`,
          fontWeight: 800,
          letterSpacing: '0.04em',
          whiteSpace: 'nowrap',
          color: '#2C1760',
          userSelect: 'none',
        }}
      >
        {t}
      </span>
    </div>
  );
};
