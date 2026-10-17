'use client';

import React, { useState } from 'react';
import {
  DocumentModel,
  DocumentType,
  TemplateId,
  ColorThemeId,
  DocumentItem,
} from '@/types/document';
import { performDocumentHealthCheck } from '@/lib/validation';
import { useLocalData } from '@/hooks/useLocalData';
import { ClientPickerModal, ProductPickerModal } from '@/components/data/Pickers';
import { findDuplicateClient, getClient, getProduct } from '@/lib/db/repository';
import { downloadPDF } from '@/lib/pdf-generator';
import { convertDocument, generateDocNumber } from '@/lib/sample-data';
import { calculateDocument, calculateItemRow } from '@/lib/calculations';
import { formatCurrency } from '@/lib/currency';
import { BillCraftIcon } from '@/components/ui/BillCraftIcons';
import { BusinessDetailsForm } from './BusinessDetailsForm';
import { CustomerDetailsForm } from './CustomerDetailsForm';
import { DocumentMetaForm } from './DocumentMetaForm';
import { ItemTableEditor } from './ItemTableEditor';
import { TaxDiscountEditor } from './TaxDiscountEditor';
import { PaymentEditor } from './PaymentEditor';
import { SignatureEditor } from './SignatureEditor';
import { NotesTermsEditor } from './NotesTermsEditor';
import { DocumentRenderer } from '@/components/templates/DocumentRenderer';
import { FONT_OPTIONS } from '@/lib/themes';
import { Type, Droplets } from 'lucide-react';
import { HealthCheckModal } from './HealthCheckModal';
import { FullscreenPreviewModal } from './FullscreenPreviewModal';
import { ResetConfirmModal } from './ResetConfirmModal';
import {
  Loader2,
  ChevronDown,
  ChevronRight,
  ArrowRightLeft,
  Copy,
  RotateCcw,
  ShieldCheck,
  Palette,
  Bookmark,
  Save,
  Loader2 as SaveSpinner,
} from 'lucide-react';

interface DocumentEditorProps {
  document: DocumentModel;
  onUpdateDocument: (updated: DocumentModel) => void;
  onResetDocument: () => void;
  onShowToast: (message: string) => void;
  onBackToHome?: () => void;
  onOpenPreview?: () => void;
  onSaveToHistory?: () => void;
  saveBusy?: boolean;
  autosaveStatus?: 'idle' | 'saving' | 'saved' | 'error';
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  document: doc,
  onUpdateDocument,
  onResetDocument,
  onShowToast,
  onBackToHome,
  onOpenPreview,
  onSaveToHistory,
  saveBusy = false,
  autosaveStatus = 'idle',
}) => {
  const [isFullscreenPreviewOpen, setIsFullscreenPreviewOpen] = useState(false);
  const [isHealthCheckOpen, setIsHealthCheckOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isClientPickerOpen, setIsClientPickerOpen] = useState(false);
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [productRowIndex, setProductRowIndex] = useState(0);
  const { clients, products, saveClient } = useLocalData();
  const [isExporting, setIsExporting] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showConvertMenu, setShowConvertMenu] = useState(false);

  // Section expansion states
  const [isEditingBusiness, setIsEditingBusiness] = useState(false);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [isEditingFullItems, setIsEditingFullItems] = useState(false);
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [isEditingTax, setIsEditingTax] = useState(false);
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [isEditingSignature, setIsEditingSignature] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  const calcs = calculateDocument(doc);
  const healthCheck = performDocumentHealthCheck(doc);

  // Load a saved client INTO THIS DOCUMENT ONLY (the saved profile is untouched)
  const handlePickClient = async (clientId: string) => {
    const c = await getClient(clientId);
    if (!c) return;
    onUpdateDocument({
      ...doc,
      customer: {
        ...doc.customer,
        name: c.contactPerson || c.name,
        company: c.name,
        address: c.billingAddress,
        phone: c.phone,
        email: c.email,
        gstin: c.gstin,
        state: c.state,
        stateCode: c.stateCode,
        placeOfSupply: c.state || doc.customer.placeOfSupply,
      },
    });
    onShowToast(`Loaded "${c.name}" — editing here never changes the saved client`);
  };

  // Save the current customer details as a reusable client (with duplicate guard)
  const handleSaveClientFromForm = () => {
    const name = (doc.customer.company || doc.customer.name || '').trim();
    if (!name) {
      onShowToast('Enter a client name first');
      return;
    }
    const dup = findDuplicateClient(clients, { name, gstin: doc.customer.gstin });
    if (dup && !window.confirm(`"${dup.name}" already exists in your clients.\n\nSave anyway as a separate client?`)) return;
    void saveClient({
      name,
      contactPerson: doc.customer.name && doc.customer.name !== name ? doc.customer.name : '',
      phone: doc.customer.phone,
      email: doc.customer.email,
      billingAddress: doc.customer.address,
      gstin: doc.customer.gstin,
      state: doc.customer.state,
      stateCode: doc.customer.stateCode,
    }).then(() => onShowToast(`"${name}" saved to Clients`));
  };

  // Autofill a row from the catalogue; per-document overrides stay free
  const handlePickProduct = async (productId: string) => {
    const p = await getProduct(productId);
    if (!p) return;
    const idx = productRowIndex;
    const updated = doc.items.map((it, i) =>
      i === idx
        ? { ...it, name: p.name, description: p.description || it.description, hsn: p.hsn || it.hsn,
            unit: (p.unit || it.unit) as typeof it.unit, rate: p.price,
            taxRate: typeof p.taxRate === 'number' ? p.taxRate : it.taxRate }
        : it,
    );
    onUpdateDocument({ ...doc, items: updated });
    onShowToast(`"${p.name}" added — you can override price/tax for this document only`);
  };

  // Focus a specific field (invoked from health check modal)
  const handleFocusField = (fieldTarget: string) => {
    if (fieldTarget.includes('business')) setIsEditingBusiness(true);
    if (fieldTarget.includes('customer')) setIsEditingCustomer(true);
    if (fieldTarget.includes('items')) setIsEditingFullItems(true);
    if (fieldTarget.includes('meta')) setIsEditingMeta(true);
    if (fieldTarget.includes('tax')) setIsEditingTax(true);
    if (fieldTarget.includes('payment')) setIsEditingPayment(true);

    setTimeout(() => {
      const el = window.document.getElementById(fieldTarget);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if ('focus' in el) (el as HTMLElement).focus();
      }
    }, 100);
  };

  // Add Item
  const handleAddNewItem = () => {
    const newItem: DocumentItem = {
      id: `item_${Date.now()}`,
      name: 'Professional Service',
      description: 'Standard consulting service',
      hsn: '998314',
      quantity: 1,
      unit: 'service',
      rate: '2500',
      discountType: 'percent',
      discountValue: 0,
      taxRate: doc.tax.mode === 'gst' ? 18 : 0,
    };
    onUpdateDocument({ ...doc, items: [...doc.items, newItem] });
    onShowToast('New item added');
  };

  // Export PDF Handler
  const handleExportPDF = async () => {
    if (!healthCheck.isReady) {
      setIsHealthCheckOpen(true);
      onShowToast(healthCheck.blockingErrors[0] || 'Please complete required fields before exporting.');
      return;
    }

    const el = window.document.getElementById('printable-document');
    if (!el) return;

    try {
      setIsExporting(true);
      const filename = await downloadPDF(el, doc, {
        paperSize: doc.paperSize,
        orientation: doc.orientation,
      });
      onShowToast(`PDF downloaded: ${filename}`);
    } catch (err) {
      console.error('PDF export error:', err);
      onShowToast('PDF generation failed. Use browser Print → Save as PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  // Duplicate Document
  const handleDuplicate = () => {
    const copy: DocumentModel = JSON.parse(JSON.stringify(doc));
    copy.id = `bc_${Date.now()}`;
    copy.meta.documentNumber = generateDocNumber(doc.type);
    onUpdateDocument(copy);
    setShowMoreMenu(false);
    onShowToast(`Duplicated as #${copy.meta.documentNumber}`);
  };

  // Document Conversion
  const handleConvert = (targetType: DocumentType) => {
    const converted = convertDocument(doc, targetType);
    onUpdateDocument(converted);
    setShowConvertMenu(false);
    setShowMoreMenu(false);
    onShowToast(`Converted to ${targetType.toUpperCase()}`);
  };

  return (
    <div className="max-w-[420px] lg:max-w-6xl mx-auto space-y-4 py-1 px-1 animate-in fade-in duration-200">
      {/* Layout Grid: Left Form Column + Right Live Preview on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Center Column (Exact Screen 04 Architecture) */}
        <div className="lg:col-span-6 space-y-3">
          {/* Screen 04 Navigation Bar */}
          <div className="nav">
            <div className="row">
              <button
                type="button"
                onClick={onBackToHome}
                className="cursor-pointer p-1 -ml-1 text-[#17151F] dark:text-[#F8F5FC]"
                title="Back"
              >
                <BillCraftIcon name="back" />
              </button>
              <b className="capitalize text-[#17151F] dark:text-[#F8F5FC] text-sm">
                {doc.type}
              </b>
              <span className="bdg g text-[9px]">Draft</span>
            </div>

            <div className="row relative" style={{ gap: '10px' }}>
              {/* Preview Button */}
              <button
                type="button"
                onClick={() => (onOpenPreview ? onOpenPreview() : setIsFullscreenPreviewOpen(true))}
                className="p-1 rounded-lg text-[#17151F] dark:text-[#F8F5FC] hover:bg-[#FAF6EE] dark:hover:bg-[#281E36] transition cursor-pointer"
                title="Open Preview"
              >
                <BillCraftIcon name="eye" />
              </button>

              {/* More Actions Toggle */}
              <button
                type="button"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="p-1 rounded-lg text-[#17151F] dark:text-[#F8F5FC] hover:bg-[#FAF6EE] dark:hover:bg-[#281E36] transition cursor-pointer"
                title="More Actions"
              >
                <BillCraftIcon name="more" />
              </button>

              {/* More Actions Dropdown Menu */}
              {showMoreMenu && (
                <div
                  className="absolute right-0 top-8 w-48 rounded-xl bg-white dark:bg-[#1B1820] border border-[#E7E0EE] dark:border-[#302B38] shadow-xl z-50 p-1.5 space-y-1 text-xs"
                >
                  {onSaveToHistory && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          onSaveToHistory();
                          setShowMoreMenu(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#FAF6EE] dark:hover:bg-[#281E36] text-[#17151F] dark:text-[#F8F5FC] flex items-center gap-1.5"
                      >
                        {saveBusy ? <SaveSpinner className="w-3.5 h-3.5 animate-spin text-[#593C8F]" /> : <Bookmark className="w-3.5 h-3.5 text-[#593C8F]" />}
                        {saveBusy ? 'Saving…' : 'Save to History'}
                      </button>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] text-[#6D6879]">
                        {autosaveStatus === 'saving' && (<><SaveSpinner className="w-3 h-3 animate-spin" /> Draft saving…</>)}
                        {autosaveStatus === 'saved' && (<><Save className="w-3 h-3 text-emerald-600" /> Draft saved locally</>)}
                        {autosaveStatus === 'error' && <span className="text-red-500">Draft save failed — storage full?</span>}
                      </div>
                      <div className="border-t border-[#E7E0EE] dark:border-[#302B38] my-1" />
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsHealthCheckOpen(true);
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#FAF6EE] dark:hover:bg-[#281E36] text-[#17151F] dark:text-[#F8F5FC] flex items-center justify-between"
                  >
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Health Check ({healthCheck.score}%)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowConvertMenu(!showConvertMenu)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#FAF6EE] dark:hover:bg-[#281E36] text-[#17151F] dark:text-[#F8F5FC] flex items-center justify-between"
                  >
                    <span className="flex items-center gap-1.5">
                      <ArrowRightLeft className="w-3.5 h-3.5 text-[#593C8F]" />
                      Convert Document
                    </span>
                    <ChevronRight className="w-3 h-3 text-[#6D6879]" />
                  </button>

                  {showConvertMenu && (
                    <div className="pl-3 py-1 space-y-1 border-l-2 border-[#593C8F] my-1">
                      {(['invoice', 'quotation', 'receipt', 'estimate', 'proforma'] as const).map((t) => {
                        if (t === doc.type) return null;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => handleConvert(t)}
                            className="block w-full text-left text-[11px] py-1 text-[#6D6879] hover:text-[#17151F] capitalize"
                          >
                            → {t}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleDuplicate}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#FAF6EE] dark:hover:bg-[#281E36] text-[#17151F] dark:text-[#F8F5FC] flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#593C8F]" />
                    Duplicate Document
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsResetConfirmOpen(true);
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Clear Document
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Style Picker Bar */}
          <div className="card p-2.5 flex items-center justify-between text-xs">
            <div className="row" style={{ gap: '6px' }}>
              <Palette className="w-3.5 h-3.5 text-[#593C8F]" />
              <span className="text-[#6D6879] dark:text-[#A39BB0] font-bold text-[11px]">Template:</span>
              <select
                value={doc.template}
                onChange={(e) => onUpdateDocument({ ...doc, template: e.target.value as TemplateId })}
                className="font-bold text-[11px] bg-transparent text-[#17151F] dark:text-[#F8F5FC] outline-none cursor-pointer capitalize"
              >
                <option value="modern" className="text-slate-900 bg-white dark:bg-[#1B1820] dark:text-slate-100">Modern</option>
                <option value="classic" className="text-slate-900 bg-white dark:bg-[#1B1820] dark:text-slate-100">Classic</option>
                <option value="minimal" className="text-slate-900 bg-white dark:bg-[#1B1820] dark:text-slate-100">Minimal</option>
                <option value="corporate" className="text-slate-900 bg-white dark:bg-[#1B1820] dark:text-slate-100">Corporate</option>
                <option value="elegant" className="text-slate-900 bg-white dark:bg-[#1B1820] dark:text-slate-100">Elegant</option>
                <option value="gst_pro" className="text-slate-900 bg-white dark:bg-[#1B1820] dark:text-slate-100">GST Pro</option>
              </select>
            </div>

            <div className="row" style={{ gap: '6px' }}>
              <span className="text-[#6D6879] dark:text-[#A39BB0] font-bold text-[11px]">Theme:</span>
              <select
                value={doc.colorTheme}
                onChange={(e) => onUpdateDocument({ ...doc, colorTheme: e.target.value as ColorThemeId })}
                className="font-bold text-[11px] bg-transparent text-[#593C8F] dark:text-[#A8D5BA] outline-none cursor-pointer capitalize"
              >
                <option value="plum" className="text-slate-900 bg-white dark:bg-[#1B1820] dark:text-slate-100">Royal Plum</option>
                <option value="mint" className="text-slate-900 bg-white dark:bg-[#1B1820] dark:text-slate-100">Mint</option>
                <option value="coral" className="text-slate-900 bg-white dark:bg-[#1B1820] dark:text-slate-100">Coral</option>
                <option value="cornflower" className="text-slate-900 bg-white dark:bg-[#1B1820] dark:text-slate-100">Cornflower</option>
                <option value="golden" className="text-slate-900 bg-white dark:bg-[#1B1820] dark:text-slate-100">Golden</option>
                <option value="emerald" className="text-slate-900 bg-white dark:bg-[#1B1820] dark:text-slate-100">Emerald</option>
              </select>
            </div>
          </div>

          {/* Font + per-document watermark toggle (Phase 2) */}
          <div className="card p-2.5 flex items-center justify-between text-xs">
            <div className="row" style={{ gap: '6px' }}>
              <Type className="w-3.5 h-3.5 text-[#593C8F]" />
              <span className="text-[#6D6879] dark:text-[#A39BB0] font-bold text-[11px]">Font:</span>
              <select
                value={doc.fontFamily || 'sans'}
                onChange={(e) => onUpdateDocument({ ...doc, fontFamily: e.target.value as DocumentModel['fontFamily'] })}
                className="font-bold text-[11px] bg-transparent text-[#17151F] dark:text-[#F8F5FC] outline-none cursor-pointer"
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f.id} value={f.id} className="text-slate-900 bg-white dark:bg-[#1B1820] dark:text-slate-100">{f.name}</option>
                ))}
              </select>
            </div>

            <div className="row" style={{ gap: '6px' }}>
              <Droplets className="w-3.5 h-3.5 text-[#593C8F]" />
              <label className="row cursor-pointer" style={{ gap: 4 }}>
                <input
                  type="checkbox"
                  checked={Boolean(doc.watermark?.enabled)}
                  onChange={(e) =>
                    onUpdateDocument({
                      ...doc,
                      watermark: {
                        ...(doc.watermark || { text: '', opacity: 0.08, position: 'center', rotation: -30 }),
                        ...(doc.watermark || { source: 'text' as const }),
                        enabled: e.target.checked,
                      },
                    })
                  }
                />
                <span className="text-[10.5px] font-bold text-[#6D6879] dark:text-[#A39BB0]">Watermark (this document)</span>
              </label>
            </div>
          </div>

          {/* 1. BUSINESS DETAILS */}
          <div className="space-y-1">
            <div className="row sp">
              <div className="lab">BUSINESS DETAILS</div>
              <button
                type="button"
                onClick={() => setIsEditingBusiness(!isEditingBusiness)}
                className="text-[10px] font-bold text-[#593C8F] dark:text-[#A8D5BA] cursor-pointer hover:underline"
              >
                {isEditingBusiness ? 'Done' : 'Edit'}
              </button>
            </div>
            <div
              onClick={() => setIsEditingBusiness(!isEditingBusiness)}
              className="card cursor-pointer hover:border-[#593C8F] transition"
              style={{ padding: '10px 12px', lineHeight: 1.5 }}
            >
              <b className="block text-xs text-[#17151F] dark:text-[#F8F5FC]">
                {doc.business.name || 'BillCraft Studio'}
              </b>
              <div className="m" style={{ fontSize: '10.5px', color: 'var(--mut)' }}>
                {doc.business.address || 'Nalbari, Assam'} · {doc.business.phone || '+91 XXXXX XXXXX'}
                <br />
                GSTIN: {doc.business.gstin || 'XXXXXXXX'}
              </div>
            </div>

            {isEditingBusiness && (
              <div className="card p-3 mt-1.5 shadow-sm border-[#593C8F]/30 animate-in fade-in duration-150">
                <BusinessDetailsForm
                  business={doc.business}
                  onChange={(upd) => onUpdateDocument({ ...doc, business: { ...doc.business, ...upd } })}
                />
              </div>
            )}
          </div>

          {/* 2. CUSTOMER */}
          <div className="space-y-1">
            <div className="row sp">
              <div className="lab">
                {doc.type === 'purchase_order' ? 'SUPPLIER' : doc.type === 'delivery_challan' ? 'RECIPIENT' : doc.type === 'credit_note' || doc.type === 'debit_note' ? 'PARTY' : 'CUSTOMER'}
              </div>
              <button
                type="button"
                onClick={() => setIsEditingCustomer(!isEditingCustomer)}
                className="text-[10px] font-bold text-[#593C8F] dark:text-[#A8D5BA] cursor-pointer hover:underline"
              >
                {isEditingCustomer ? 'Done' : 'Edit'}
              </button>
            </div>
            <div
              onClick={() => setIsEditingCustomer(!isEditingCustomer)}
              className="f cursor-pointer hover:border-[#593C8F] transition"
            >
              <small>CUSTOMER</small>
              <b className="text-xs text-[#17151F] dark:text-[#F8F5FC] block">
                {doc.customer.name || doc.customer.company || 'Acme Solutions'}
              </b>
              {doc.customer.address && (
                <div className="m" style={{ fontSize: '10px', color: 'var(--mut)', marginTop: '2px' }}>
                  {doc.customer.address}
                </div>
              )}
            </div>

            {isEditingCustomer && (
              <div className="card p-3 mt-1.5 shadow-sm border-[#593C8F]/30 animate-in fade-in duration-150">
                <CustomerDetailsForm
                  onPickClient={() => setIsClientPickerOpen(true)}
                  onSaveClient={handleSaveClientFromForm}
                  clientCount={clients.length}
                  customer={doc.customer}
                  onChange={(upd) => onUpdateDocument({ ...doc, customer: { ...doc.customer, ...upd } })}
                />
              </div>
            )}
          </div>

          {/* 3. DOCUMENT INFO */}
          <div className="space-y-1">
            <div className="row sp">
              <div className="lab">DOCUMENT INFO</div>
              <button
                type="button"
                onClick={() => setIsEditingMeta(!isEditingMeta)}
                className="text-[10px] font-bold text-[#593C8F] dark:text-[#A8D5BA] cursor-pointer hover:underline"
              >
                {isEditingMeta ? 'Done' : 'Edit'}
              </button>
            </div>
            <div
              onClick={() => setIsEditingMeta(!isEditingMeta)}
              className="card row sp cursor-pointer hover:border-[#593C8F] transition"
              style={{ padding: '9px 12px' }}
            >
              <div>
                <b className="text-xs text-[#17151F] dark:text-[#F8F5FC]">
                  #{doc.meta.documentNumber}
                </b>
                <div className="m" style={{ fontSize: '10px', color: 'var(--mut)' }}>
                  Date: {doc.meta.date} {doc.meta.dueDate ? `· Due: ${doc.meta.dueDate}` : ''}
                </div>
              </div>
              <span className="text-[10px] font-bold text-[#593C8F]">Edit</span>
            </div>

            {isEditingMeta && (
              <div className="card p-3 mt-1.5 shadow-sm border-[#593C8F]/30 animate-in fade-in duration-150">
                <DocumentMetaForm
                  meta={doc.meta}
                  type={doc.type}
                  onChange={(upd) => onUpdateDocument({ ...doc, meta: { ...doc.meta, ...upd } })}
                />
              </div>
            )}
          </div>

          {/* 4. ITEMS */}
          <div className="space-y-2">
            <div className="row sp">
              <div className="lab">ITEMS</div>
              <button
                type="button"
                onClick={() => setIsEditingFullItems(!isEditingFullItems)}
                className="text-[10px] font-bold text-[#593C8F] dark:text-[#A8D5BA] cursor-pointer hover:underline"
              >
                {isEditingFullItems ? 'Simple View' : 'Table Editor'}
              </button>
            </div>

            {/* If Full Items Table is Active */}
            {isEditingFullItems ? (
              <div className="card p-3 shadow-sm border-[#593C8F]/30">
                <ItemTableEditor
                  items={doc.items}
                  currency={doc.currency}
                  showGST={doc.tax.mode === 'gst'}
                  onChange={(nextItems) => onUpdateDocument({ ...doc, items: nextItems })}
                  onPickProduct={(idx) => { setProductRowIndex(idx); setIsProductPickerOpen(true); }}
                  productCount={products.length}
                />
              </div>
            ) : (
              /* Item Cards per Reference Mockup */
              <div className="space-y-1.5">
                {doc.items.map((item, idx) => {
                  const rowCalc = calculateItemRow(item);
                  return (
                    <div
                      key={item.id || idx}
                      className="card row sp"
                      style={{ padding: '9px 12px' }}
                    >
                      <div>
                        <b className="text-xs text-[#17151F] dark:text-[#F8F5FC]">
                          {item.name || `Item #${idx + 1}`}
                        </b>
                        <div className="m">
                          {item.quantity} × {formatCurrency(rowCalc.rate, doc.currency)}
                        </div>
                      </div>
                      <b className="text-xs text-[#17151F] dark:text-[#F8F5FC]">
                        {formatCurrency(rowCalc.total, doc.currency)}
                      </b>
                    </div>
                  );
                })}

                {/* Add Item dashed button per reference mockup */}
                <div
                  onClick={handleAddNewItem}
                  className="row cursor-pointer select-none hover:bg-[#FAF6EE] dark:hover:bg-[#281E36] transition"
                  style={{
                    justifyContent: 'center',
                    border: '1.5px dashed var(--pl)',
                    color: 'var(--pl)',
                    borderRadius: '12px',
                    height: '40px',
                    fontWeight: 700,
                    fontSize: '12px',
                  }}
                >
                  <BillCraftIcon name="plus" />
                  <span>Add Item</span>
                </div>
              </div>
            )}
          </div>

          {/* 5. TOTALS CARD */}
          <div
            className="card"
            style={{
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
            }}
          >
            <div className="row sp">
              <span className="m" style={{ color: 'var(--mut)' }}>Subtotal</span>
              <b className="text-xs text-[#17151F] dark:text-[#F8F5FC]">
                {formatCurrency(calcs.subtotal, doc.currency)}
              </b>
            </div>

            {calcs.totalDiscount > 0 && (
              <div className="row sp">
                <span className="m" style={{ color: 'var(--mut)' }}>Discount</span>
                <b style={{ color: 'var(--red)', fontSize: '12px' }}>
                  -{formatCurrency(calcs.totalDiscount, doc.currency)}
                </b>
              </div>
            )}

            {doc.tax.mode !== 'none' && (
              <div className="row sp">
                <span className="m" style={{ color: 'var(--mut)' }}>
                  {doc.tax.mode === 'gst' ? 'GST 18%' : 'Tax'}
                </span>
                <b className="text-xs text-[#17151F] dark:text-[#F8F5FC]">
                  {formatCurrency(calcs.totalTax, doc.currency)}
                </b>
              </div>
            )}

            <div
              className="row sp"
              style={{
                borderTop: '1px solid var(--bd)',
                paddingTop: '7px',
              }}
            >
              <b className="text-sm text-[#17151F] dark:text-[#F8F5FC]">Grand Total</b>
              <span className="tot" style={{ fontSize: '18px' }}>
                {formatCurrency(calcs.grandTotal, doc.currency)}
              </span>
            </div>
          </div>

          {/* 6. ADVANCED SECTIONS (Taxes, Payment, Signature, Notes) */}
          <div className="space-y-1.5 pt-1">
            {/* Tax Settings Toggle */}
            <div className="card p-2.5">
              <div
                onClick={() => setIsEditingTax(!isEditingTax)}
                className="row sp cursor-pointer"
              >
                <div className="row">
                  <span className="ic" style={{ width: '26px', height: '26px', borderRadius: '8px' }}>
                    <BillCraftIcon name="pct" style={{ width: '14px', height: '14px' }} />
                  </span>
                  <b className="text-xs text-[#17151F] dark:text-[#F8F5FC]">Tax & Discount Setup</b>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-[#6D6879] transition ${isEditingTax ? 'rotate-180' : ''}`} />
              </div>
              {isEditingTax && (
                <div className="pt-3 border-t border-[#E7E0EE] dark:border-[#302B38] mt-2">
                  <TaxDiscountEditor
                    tax={doc.tax}
                    discount={doc.discount}
                    currency={doc.currency}
                    autoRoundOff={doc.autoRoundOff}
                    onTaxChange={(upd) => onUpdateDocument({ ...doc, tax: { ...doc.tax, ...upd } })}
                    onDiscountChange={(upd) => onUpdateDocument({ ...doc, discount: { ...doc.discount, ...upd } })}
                    onCurrencyChange={(c) => onUpdateDocument({ ...doc, currency: c })}
                    onRoundOffToggle={(val) => onUpdateDocument({ ...doc, autoRoundOff: val })}
                  />
                </div>
              )}
            </div>

            {/* Payment & UPI QR Toggle */}
            <div className="card p-2.5">
              <div
                onClick={() => setIsEditingPayment(!isEditingPayment)}
                className="row sp cursor-pointer"
              >
                <div className="row">
                  <span className="ic mt" style={{ width: '26px', height: '26px', borderRadius: '8px' }}>
                    <BillCraftIcon name="qr" style={{ width: '14px', height: '14px' }} />
                  </span>
                  <b className="text-xs text-[#17151F] dark:text-[#F8F5FC]">Payment & UPI QR</b>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-[#6D6879] transition ${isEditingPayment ? 'rotate-180' : ''}`} />
              </div>
              {isEditingPayment && (
                <div className="pt-3 border-t border-[#E7E0EE] dark:border-[#302B38] mt-2">
                  <PaymentEditor
                    payment={doc.payment}
                    grandTotal={calcs.grandTotal}
                    businessName={doc.business.name}
                    onChange={(upd) => onUpdateDocument({ ...doc, payment: { ...doc.payment, ...upd } })}
                  />
                </div>
              )}
            </div>

            {/* Signature Toggle */}
            <div className="card p-2.5">
              <div
                onClick={() => setIsEditingSignature(!isEditingSignature)}
                className="row sp cursor-pointer"
              >
                <div className="row">
                  <span className="ic" style={{ width: '26px', height: '26px', borderRadius: '8px' }}>
                    <BillCraftIcon name="doc" style={{ width: '14px', height: '14px' }} />
                  </span>
                  <b className="text-xs text-[#17151F] dark:text-[#F8F5FC]">Signature / Stamp</b>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-[#6D6879] transition ${isEditingSignature ? 'rotate-180' : ''}`} />
              </div>
              {isEditingSignature && (
                <div className="pt-3 border-t border-[#E7E0EE] dark:border-[#302B38] mt-2">
                  <SignatureEditor
                    signature={doc.signature}
                    businessName={doc.business.name}
                    onChange={(upd) => onUpdateDocument({ ...doc, signature: { ...doc.signature, ...upd } })}
                  />
                </div>
              )}
            </div>

            {/* Notes & Terms Toggle */}
            <div className="card p-2.5">
              <div
                onClick={() => setIsEditingNotes(!isEditingNotes)}
                className="row sp cursor-pointer"
              >
                <div className="row">
                  <span className="ic" style={{ width: '26px', height: '26px', borderRadius: '8px' }}>
                    <BillCraftIcon name="abc" style={{ width: '14px', height: '14px' }} />
                  </span>
                  <b className="text-xs text-[#17151F] dark:text-[#F8F5FC]">Notes & Clauses</b>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-[#6D6879] transition ${isEditingNotes ? 'rotate-180' : ''}`} />
              </div>
              {isEditingNotes && (
                <div className="pt-3 border-t border-[#E7E0EE] dark:border-[#302B38] mt-2">
                  <NotesTermsEditor
                    notes={doc.notes}
                    terms={doc.terms}
                    onNotesChange={(v) => onUpdateDocument({ ...doc, notes: v })}
                    onTermsChange={(v) => onUpdateDocument({ ...doc, terms: v })}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 7. Action Buttons per Screen 04 */}
          <div className="row pt-2" style={{ gap: '8px' }}>
            <button
              type="button"
              onClick={() => (onOpenPreview ? onOpenPreview() : setIsFullscreenPreviewOpen(true))}
              className="btn o flex-1"
            >
              <BillCraftIcon name="eye" />
              <span>Preview</span>
            </button>

            <button
              type="button"
              onClick={handleExportPDF}
              disabled={isExporting}
              className="btn flex-[1.2]"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Exporting…</span>
                </>
              ) : (
                <>
                  <BillCraftIcon name="file-preview-outline" />
                  <span>Export PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Live A4 Preview Pane on Desktop */}
        <div className="hidden lg:block lg:col-span-6 sticky top-20">
          <div className="card p-3 shadow-md">
            <div className="row sp pb-2 px-1 text-xs">
              <span className="font-extrabold uppercase tracking-wider flex items-center gap-1.5 text-[#17151F] dark:text-[#F8F5FC]">
                <BillCraftIcon name="eye" style={{ width: '14px', height: '14px', color: 'var(--pl)' }} />
                Live Preview
              </span>
              <button
                type="button"
                onClick={() => setIsFullscreenPreviewOpen(true)}
                className="text-[#593C8F] dark:text-[#A8D5BA] font-bold hover:underline cursor-pointer"
              >
                Fullscreen Preview →
              </button>
            </div>

            <div className="max-h-[82vh] overflow-y-auto rounded-xl p-3 bg-[#EFEAF5] dark:bg-[#111015]">
              <div className="transform scale-[0.82] origin-top">
                <DocumentRenderer document={doc} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Local data pickers (document-scoped; saved records are never modified) */}
      <ClientPickerModal
        open={isClientPickerOpen}
        onClose={() => setIsClientPickerOpen(false)}
        onPick={(id) => void handlePickClient(id)}
        onManage={() => { if (onBackToHome) onBackToHome(); }}
      />
      <ProductPickerModal
        open={isProductPickerOpen}
        onClose={() => setIsProductPickerOpen(false)}
        onPick={(id) => void handlePickProduct(id)}
        onManage={() => {}}
      />

      {/* Modals */}
      <FullscreenPreviewModal
        isOpen={isFullscreenPreviewOpen}
        document={doc}
        onClose={() => setIsFullscreenPreviewOpen(false)}
        onShowToast={onShowToast}
      />

      <HealthCheckModal
        isOpen={isHealthCheckOpen}
        health={healthCheck}
        onClose={() => setIsHealthCheckOpen(false)}
        onFocusField={handleFocusField}
      />

      <ResetConfirmModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={() => {
          onResetDocument();
          onShowToast('Document cleared successfully.');
        }}
      />
    </div>
  );
};
