'use client';

import React from 'react';
import { DocumentMeta, DocumentType, CustomField } from '@/types/document';
import { Calendar, Hash, FileText, Clock, Truck, Plus, X, Map } from 'lucide-react';

interface DocumentMetaFormProps {
  meta: DocumentMeta;
  type: DocumentType;
  onChange: (updated: Partial<DocumentMeta>) => void;
}

export const DocumentMetaForm: React.FC<DocumentMetaFormProps> = ({ meta, type, onChange }) => {
  const getDocNumberLabel = () => {
    switch (type) {
      case 'quotation':
        return 'Quotation Number';
      case 'receipt':
        return 'Receipt Number';
      case 'estimate':
        return 'Estimate Number';
      case 'proforma':
        return 'Proforma Number';
      case 'purchase_order':
        return 'PO Number';
      case 'delivery_challan':
        return 'Challan Number';
      case 'credit_note':
        return 'Credit Note Number';
      case 'debit_note':
        return 'Debit Note Number';
      default:
        return 'Invoice Number';
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Document Number */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {getDocNumberLabel()} <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              id="meta-number"
              type="text"
              value={meta.documentNumber}
              onChange={(e) => onChange({ documentNumber: e.target.value })}
              placeholder="e.g. INV-2026-001"
              className="w-full pl-9 pr-3 py-2 text-sm font-mono font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
            />
            <Hash className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          </div>
        </div>

        {/* Document Date */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Date <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              id="meta-date"
              type="date"
              value={meta.date}
              onChange={(e) => onChange({ date: e.target.value })}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
            />
            <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          </div>
        </div>

        {/* Due Date or Valid Until */}
        {type === 'quotation' || type === 'estimate' || type === 'proforma' ? (
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Valid Until
            </label>
            <div className="relative">
              <input
                type="date"
                value={meta.validUntil}
                onChange={(e) => onChange({ validUntil: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
              />
              <Clock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Payment Due Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={meta.dueDate}
                onChange={(e) => onChange({ dueDate: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
              />
              <Clock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            </div>
          </div>
        )}
      </div>

      {/* Type-specific fields: PO delivery date, challan transport, note links */}
      {type === 'purchase_order' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Expected Delivery Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={meta.expectedDeliveryDate || ''}
                onChange={(e) => onChange({ expectedDeliveryDate: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
              />
              <Truck className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 self-end italic sm:col-span-2">
            Purchase order issued to the supplier below. Goods are ordered subject to the terms on this document.
          </p>
        </div>
      )}

      {type === 'delivery_challan' && (
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Vehicle / Transport Info
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={meta.vehicleInfo || ''}
                  onChange={(e) => onChange({ vehicleInfo: e.target.value })}
                  placeholder="e.g. AS01AB1234 / Sharma Transports"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
                />
                <Truck className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Delivery Address
              </label>
              <input
                type="text"
                value={meta.deliveryAddress || ''}
                onChange={(e) => onChange({ deliveryAddress: e.target.value })}
                placeholder="Where the goods are delivered (if different from the recipient address)"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Received By (acknowledgement)
              </label>
              <input
                type="text"
                value={meta.receivedBy || ''}
                onChange={(e) => onChange({ receivedBy: e.target.value })}
                placeholder="Name / signature of the person receiving goods"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
              />
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 self-end italic">
              A delivery challan records dispatch/delivery of goods — it is not a tax invoice.
            </p>
          </div>
        </div>
      )}

      {(type === 'credit_note' || type === 'debit_note') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Original Invoice Number {type === 'credit_note' ? '(if linked)' : '(if linked)'}
            </label>
            <div className="relative">
              <input
                type="text"
                value={meta.linkedInvoice || ''}
                onChange={(e) => onChange({ linkedInvoice: e.target.value })}
                placeholder="e.g. INV-2026-0014"
                className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
              />
              <FileText className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Reason for Issue
            </label>
            <input
              type="text"
              value={meta.adjustmentReason || ''}
              onChange={(e) => onChange({ adjustmentReason: e.target.value })}
              placeholder="e.g. Goods returned, rate revision, quantity correction"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
            />
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 italic sm:col-span-2">
            {type === 'credit_note'
              ? 'A credit note reduces the value of a previous supply (returns, corrections, discounts).'
              : 'A debit note increases the value of a previous supply (post-supply price or tax increases).'}{' '}
            Tax treatment depends on the transaction and applicable Indian GST rules.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Reference / PO Number */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Reference / PO Number
          </label>
          <div className="relative">
            <input
              type="text"
              value={meta.referenceNumber}
              onChange={(e) => onChange({ referenceNumber: e.target.value })}
              placeholder="e.g. PO-8921"
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
            />
            <FileText className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          </div>
        </div>

        {/* Place of supply */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Place of Supply
          </label>
          <input
            type="text"
            value={meta.placeOfSupply}
            onChange={(e) => onChange({ placeOfSupply: e.target.value })}
            placeholder="e.g. Assam (18)"
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
          />
        </div>

        {/* Payment Terms */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Payment Terms
          </label>
          <input
            type="text"
            value={meta.paymentTerms}
            onChange={(e) => onChange({ paymentTerms: e.target.value })}
            placeholder="e.g. Net 15, Due on Receipt"
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      {/* Receipt-specific row */}
      {type === 'receipt' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <div>
            <label className="block text-xs font-semibold text-amber-900 dark:text-amber-200 mb-1">
              Payment Received For
            </label>
            <input
              type="text"
              value={meta.receiptFor}
              onChange={(e) => onChange({ receiptFor: e.target.value })}
              placeholder="e.g. Web Design Services"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-amber-900 dark:text-amber-200 mb-1">
              Amount Received
            </label>
            <input
              type="number"
              value={meta.amountReceived || ''}
              onChange={(e) => onChange({ amountReceived: parseFloat(e.target.value) || 0 })}
              placeholder="Amount received"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
      )}
      {/* E-way bill number (invoices & challans) — format-validated only, no government check */}
      {(type === 'invoice' || type === 'delivery_challan') && (
        <div className="pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                E-way Bill Number (optional)
              </label>
              <div className="relative">
                <input
                  id="meta-eway"
                  type="text"
                  inputMode="numeric"
                  maxLength={12}
                  value={meta.ewayBillNumber || ''}
                  onChange={(e) => onChange({ ewayBillNumber: e.target.value.replace(/[^0-9]/g, '').slice(0, 12) })}
                  placeholder="12-digit e-way bill number"
                  className="w-full pl-9 pr-3 py-2 text-sm font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
                />
                <Map className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 italic mt-1">
                Reference only — BillCraft does not validate this against the e-way bill portal.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Custom additional fields (compact when unused) */}
      <div className="pt-1 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Additional Fields (optional)</span>
          <button
            type="button"
            onClick={() => {
              const fields = [...(meta.customFields || [])];
              if (fields.length >= 6) return;
              fields.push({ id: `cf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, label: '', value: '' });
              onChange({ customFields: fields });
            }}
            disabled={(meta.customFields || []).length >= 6}
            className="inline-flex items-center gap-1 text-[10px] font-bold text-[#593C8F] dark:text-[#A8D5BA] hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-3 h-3" /> Add Field
          </button>
        </div>
        {(meta.customFields || []).map((f, i) => {
          const fields = meta.customFields || [];
          return (
            <div key={f.id} className="flex items-center gap-2">
              <input
                type="text"
                value={f.label}
                maxLength={40}
                onChange={(e) => {
                  const next = [...fields];
                  next[i] = { ...f, label: e.target.value };
                  onChange({ customFields: next });
                }}
                placeholder="Label (e.g. Project Code)"
                aria-label={`Custom field ${i + 1} label`}
                className="w-2/5 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
              />
              <input
                type="text"
                value={f.value}
                maxLength={120}
                onChange={(e) => {
                  const next = [...fields];
                  next[i] = { ...f, value: e.target.value };
                  onChange({ customFields: next });
                }}
                placeholder="Value"
                aria-label={`Custom field ${i + 1} value`}
                className="flex-1 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => onChange({ customFields: fields.filter((_, j) => j !== i) })}
                aria-label={`Remove custom field ${i + 1}`}
                title="Remove field"
                className="p-1.5 rounded text-slate-400 hover:text-rose-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
