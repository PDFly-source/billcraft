'use client';

import React from 'react';
import { TaxSettings, OverallDiscount, CurrencyCode } from '@/types/document';
import { CURRENCIES } from '@/lib/currency';
import { Percent, Tag, DollarSign, Calculator } from 'lucide-react';

interface TaxDiscountEditorProps {
  tax: TaxSettings;
  discount: OverallDiscount;
  currency: CurrencyCode;
  autoRoundOff: boolean;
  onTaxChange: (updated: Partial<TaxSettings>) => void;
  onDiscountChange: (updated: Partial<OverallDiscount>) => void;
  onCurrencyChange: (currency: CurrencyCode) => void;
  onRoundOffToggle: (val: boolean) => void;
}

export const TaxDiscountEditor: React.FC<TaxDiscountEditorProps> = ({
  tax,
  discount,
  currency,
  autoRoundOff,
  onTaxChange,
  onDiscountChange,
  onCurrencyChange,
  onRoundOffToggle,
}) => {
  return (
    <div id="tax-section" className="space-y-5">
      {/* Currency & Round-off settings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Currency
          </label>
          <div className="relative">
            <select
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value as CurrencyCode)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8] text-slate-900 dark:text-slate-100"
            >
              {Object.values(CURRENCIES).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.symbol} ({c.name})
                </option>
              ))}
            </select>
            <DollarSign className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          </div>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <div>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
              Automatic Round-off
            </span>
            <span className="text-[10px] text-slate-400">Round grand total to nearest integer</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={autoRoundOff}
              onChange={(e) => onRoundOffToggle(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#593C8F] dark:peer-checked:bg-[#7B5BB8]"></div>
          </label>
        </div>
      </div>

      {/* Tax Engine */}
      <div className="space-y-3">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          Tax Engine Mode
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onTaxChange({ mode: 'gst' })}
            className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition ${
              tax.mode === 'gst'
                ? 'bg-[#593C8F] text-white border-[#593C8F] shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            GST (India)
          </button>
          <button
            type="button"
            onClick={() => onTaxChange({ mode: 'custom' })}
            className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition ${
              tax.mode === 'custom'
                ? 'bg-[#593C8F] text-white border-[#593C8F] shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Custom Tax / VAT
          </button>
          <button
            type="button"
            onClick={() => onTaxChange({ mode: 'none' })}
            className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition ${
              tax.mode === 'none'
                ? 'bg-[#593C8F] text-white border-[#593C8F] shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            No Tax
          </button>
        </div>

        {/* GST Sub-options */}
        {tax.mode === 'gst' && (
          <div className="p-3 bg-purple-50/60 dark:bg-purple-950/20 rounded-lg border border-purple-100 dark:border-purple-900/40 space-y-2">
            <span className="text-xs font-semibold text-purple-900 dark:text-purple-200 block">
              GST Calculation Type
            </span>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                <input
                  type="radio"
                  name="gstType"
                  checked={tax.gstType === 'cgst_sgst'}
                  onChange={() => onTaxChange({ gstType: 'cgst_sgst' })}
                  className="text-[#593C8F] focus:ring-[#593C8F]"
                />
                <span>Intra-state (CGST + SGST)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                <input
                  type="radio"
                  name="gstType"
                  checked={tax.gstType === 'igst'}
                  onChange={() => onTaxChange({ gstType: 'igst' })}
                  className="text-[#593C8F] focus:ring-[#593C8F]"
                />
                <span>Inter-state (IGST)</span>
              </label>
            </div>
            <p className="text-[11px] text-purple-700/80 dark:text-purple-300/80 mt-1">
              {tax.gstType === 'cgst_sgst'
                ? 'CGST & SGST will be split evenly across the applicable GST rates.'
                : 'IGST will be applied in full without splitting.'}
            </p>
          </div>
        )}

        {/* Custom Tax Sub-options */}
        {tax.mode === 'custom' && (
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Tax Name
              </label>
              <input
                type="text"
                value={tax.customTaxName}
                onChange={(e) => onTaxChange({ customTaxName: e.target.value })}
                placeholder="e.g. VAT, Sales Tax"
                className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Tax Rate (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={tax.customTaxRate || ''}
                onChange={(e) => onTaxChange({ customTaxRate: parseFloat(e.target.value) || 0 })}
                placeholder="10"
                className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>
        )}
      </div>

      {/* Overall Discount Engine */}
      <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          Overall Document Discount
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onDiscountChange({ type: 'none', value: 0 })}
            className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition ${
              discount.type === 'none'
                ? 'bg-[#593C8F] text-white border-[#593C8F] shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            No Discount
          </button>
          <button
            type="button"
            onClick={() => onDiscountChange({ type: 'percent' })}
            className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition ${
              discount.type === 'percent'
                ? 'bg-[#593C8F] text-white border-[#593C8F] shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            Percentage (%)
          </button>
          <button
            type="button"
            onClick={() => onDiscountChange({ type: 'fixed' })}
            className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition ${
              discount.type === 'fixed'
                ? 'bg-[#593C8F] text-white border-[#593C8F] shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            Fixed Amount
          </button>
        </div>

        {discount.type !== 'none' && (
          <div className="relative mt-2">
            <input
              type="number"
              min={0}
              value={discount.value || ''}
              onChange={(e) => onDiscountChange({ value: parseFloat(e.target.value) || 0 })}
              placeholder={discount.type === 'percent' ? 'Enter discount percentage (e.g. 10)' : 'Enter fixed discount amount'}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F]"
            />
            {discount.type === 'percent' ? (
              <Percent className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            ) : (
              <Tag className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
