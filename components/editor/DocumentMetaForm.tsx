'use client';

import React from 'react';
import { DocumentMeta, DocumentType } from '@/types/document';
import { Calendar, Hash, FileText, Clock } from 'lucide-react';

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
    </div>
  );
};
