'use client';

import React from 'react';
import { DocumentItem, UnitType, CurrencyCode } from '@/types/document';
import { safeEvaluateExpression } from '@/lib/safe-eval';
import { calculateItemRow } from '@/lib/calculations';
import { formatCurrency } from '@/lib/currency';
import {
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Calculator,
  PackageSearch,
} from 'lucide-react';

interface ItemTableEditorProps {
  items: DocumentItem[];
  currency: CurrencyCode;
  showGST: boolean;
  onChange: (updatedItems: DocumentItem[]) => void;
  onPickProduct?: (index: number) => void;
  productCount?: number;
}

const UNIT_OPTIONS: { value: UnitType; label: string }[] = [
  { value: 'pcs', label: 'pcs (Pieces)' },
  { value: 'service', label: 'service' },
  { value: 'hr', label: 'hr (Hours)' },
  { value: 'day', label: 'day' },
  { value: 'month', label: 'month' },
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'g' },
  { value: 'ltr', label: 'ltr' },
  { value: 'ml', label: 'ml' },
  { value: 'box', label: 'box' },
  { value: 'set', label: 'set' },
  { value: 'other', label: 'other' },
];

export const ItemTableEditor: React.FC<ItemTableEditorProps> = ({
  items,
  currency,
  showGST,
  onChange,
  onPickProduct,
  productCount = 0,
}) => {
  const addItem = () => {
    const newItem: DocumentItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: '',
      description: '',
      hsn: showGST ? '998314' : '',
      quantity: 1,
      unit: 'service',
      rate: '',
      discountType: 'percent',
      discountValue: 0,
      taxRate: showGST ? 18 : 0,
    };
    onChange([...items, newItem]);
  };

  const updateItem = (index: number, fields: Partial<DocumentItem>) => {
    const next = [...items];
    next[index] = { ...next[index], ...fields };
    onChange(next);
  };

  const handleExpressionBlur = (index: number, field: 'quantity' | 'rate') => {
    const raw = items[index][field];
    if (typeof raw === 'string' && /[+*x/×-]/.test(raw)) {
      const calculated = safeEvaluateExpression(raw);
      updateItem(index, { [field]: calculated });
    }
  };

  const duplicateItem = (index: number) => {
    const toDup = items[index];
    const copy: DocumentItem = {
      ...toDup,
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: `${toDup.name} (Copy)`,
    };
    const next = [...items];
    next.splice(index + 1, 0, copy);
    onChange(next);
  };

  const deleteItem = (index: number) => {
    if (items.length <= 1) {
      // Keep at least one empty item row
      updateItem(0, { name: '', description: '', rate: '', quantity: 1 });
      return;
    }
    const next = items.filter((_, i) => i !== index);
    onChange(next);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(index - 1, 0, moved);
    onChange(next);
  };

  const moveDown = (index: number) => {
    if (index === items.length - 1) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(index + 1, 0, moved);
    onChange(next);
  };

  return (
    <div id="items-section" className="space-y-4">
      {/* Smart Calculator Hint */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-purple-50 dark:bg-purple-950/40 px-3 py-1.5 rounded-lg border border-purple-100 dark:border-purple-900/50">
        <span className="flex items-center gap-1.5 font-medium text-purple-700 dark:text-purple-300">
          <Calculator className="w-3.5 h-3.5" />
          Smart math supported in Qty & Rate fields (e.g. 5*800, 10/2, 5+5)
        </span>
        <span className="hidden sm:inline text-[11px] text-purple-600/70 dark:text-purple-400/70">
          Calculates automatically on blur
        </span>
      </div>

      {/* Item List / Cards */}
      <div className="space-y-3">
        {items.map((item, idx) => {
          const rowCalc = calculateItemRow(item);
          return (
            <div
              key={item.id || idx}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              {/* Row Header & Actions */}
              <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {item.name ? item.name : `Item #${idx + 1}`}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {onPickProduct && (
                    <button
                      type="button"
                      onClick={() => onPickProduct(idx)}
                      title={productCount > 0 ? 'Autofill from catalogue' : 'Open catalogue (empty)'}
                      className="p-1 rounded text-slate-400 hover:text-[#593C8F] dark:hover:text-[#A8D5BA]"
                    >
                      <PackageSearch className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    title="Move Up"
                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(idx)}
                    disabled={idx === items.length - 1}
                    title="Move Down"
                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicateItem(idx)}
                    title="Duplicate Item"
                    className="p-1 rounded text-slate-400 hover:text-purple-600 dark:hover:text-purple-400"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteItem(idx)}
                    title="Delete Item"
                    className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Main Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Item Name */}
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Item Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateItem(idx, { name: e.target.value })}
                    placeholder="Product or service name"
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8]"
                  />
                </div>

                {/* HSN/SAC */}
                {showGST && (
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      HSN / SAC
                    </label>
                    <input
                      type="text"
                      value={item.hsn}
                      onChange={(e) => updateItem(idx, { hsn: e.target.value })}
                      placeholder="e.g. 998314"
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8]"
                    />
                  </div>
                )}

                {/* Quantity */}
                <div className={showGST ? 'sm:col-span-2' : 'sm:col-span-3'}>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Quantity
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                      onBlur={() => handleExpressionBlur(idx, 'quantity')}
                      placeholder="1"
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8]"
                    />
                    <select
                      value={item.unit}
                      onChange={(e) => updateItem(idx, { unit: e.target.value as UnitType })}
                      className="text-xs bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-1.5 focus:outline-none"
                    >
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.value}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Rate */}
                <div className={showGST ? 'sm:col-span-2' : 'sm:col-span-3'}>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Rate / Price
                  </label>
                  <input
                    type="text"
                    value={item.rate}
                    onChange={(e) => updateItem(idx, { rate: e.target.value })}
                    onBlur={() => handleExpressionBlur(idx, 'rate')}
                    placeholder="0.00"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8]"
                  />
                </div>

                {/* Row Total */}
                <div className="sm:col-span-2 flex flex-col justify-end text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Row Total</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono">
                    {formatCurrency(rowCalc.total, currency)}
                  </span>
                </div>
              </div>

              {/* Collapsible / Optional Item Details (Description, Tax Rate, Item Discount) */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mt-2.5 pt-2 border-t border-slate-50 dark:border-slate-800/60">
                <div className="sm:col-span-6">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(idx, { description: e.target.value })}
                    placeholder="Optional item description or specifications..."
                    className="w-full px-2.5 py-1 text-[11px] bg-transparent border-b border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#593C8F] dark:focus:border-[#7B5BB8] text-slate-600 dark:text-slate-400"
                  />
                </div>

                {/* Item Level Tax % */}
                <div className="sm:col-span-3 flex items-center gap-1.5">
                  <label className="text-[10px] font-medium text-slate-400 shrink-0">Tax %:</label>
                  <select
                    value={item.taxRate}
                    onChange={(e) => updateItem(idx, { taxRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none"
                  >
                    <option value={0}>0% (Exempt)</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>

                {/* Item Level Discount */}
                <div className="sm:col-span-3 flex items-center gap-1.5">
                  <label className="text-[10px] font-medium text-slate-400 shrink-0">Disc %:</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={item.discountValue || ''}
                    onChange={(e) => updateItem(idx, { discountValue: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full px-2 py-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Item Action */}
      <button
        type="button"
        onClick={addItem}
        className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-[#593C8F]/30 dark:border-[#7B5BB8]/40 hover:border-[#593C8F] dark:hover:border-[#7B5BB8] text-[#593C8F] dark:text-[#A8D5BA] hover:bg-[#593C8F]/5 dark:hover:bg-[#7B5BB8]/10 text-xs font-bold transition flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Line Item (Alt + I)
      </button>
    </div>
  );
};
