'use client';

import React, { useRef, useState } from 'react';
import { DocumentItem, UnitType, CurrencyCode } from '@/types/document';
import { safeEvaluateExpression } from '@/lib/safe-eval';
import { calculateItemRow } from '@/lib/calculations';
import { formatCurrency } from '@/lib/currency';
import { sanitizeDiscountValue, dropIndexFromMidpoints, createBlankItem, duplicateItemAt, reorderItems } from '@/lib/item-ops';
import { itemDiscountError } from '@/lib/validation';
import {
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Calculator,
  PackageSearch,
  GripVertical,
  Package,
  Wrench,
} from 'lucide-react';

interface ItemTableEditorProps {
  items: DocumentItem[];
  currency: CurrencyCode;
  showGST: boolean;
  onChange: (updatedItems: DocumentItem[]) => void;
  onPickProduct?: (index: number) => void;
  productCount?: number;
}

const UNIT_OPTIONS: UnitType[] = ['service', 'pcs', 'hr', 'day', 'month', 'kg', 'g', 'ltr', 'ml', 'box', 'set', 'other'];

export const ItemTableEditor: React.FC<ItemTableEditorProps> = ({
  items,
  currency,
  showGST,
  onChange,
  onPickProduct,
  productCount = 0,
}) => {
  const addItem = () => {
    const newItem = createBlankItem(showGST);
    onChange([...items, newItem]);
    // focus the new row's name input after it renders (draft autosave fires via onChange)
    requestAnimationFrame(() => {
      const el = window.document.querySelector<HTMLInputElement>(`#item-name-${CSS.escape(newItem.id)}`);
      el?.focus();
    });
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
    onChange(duplicateItemAt(items, index)); // new unique id, inserted right after the original
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

  const moveUp = (index: number) => onChange(reorderItems(items, index, index - 1));
  const moveDown = (index: number) => onChange(reorderItems(items, index, index + 1));

  // ---------- pointer-based drag reordering (mouse + touch) ----------
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dragIndexRef = useRef<{ index: number; startY: number } | null>(null);
  const [dragState, setDragState] = useState<{ index: number; dy: number; overIndex: number } | null>(null);

  const midpoints = (): number[] =>
    cardRefs.current
      .slice(0, items.length)
      .map((el) => {
        if (!el) return Number.POSITIVE_INFINITY;
        const r = el.getBoundingClientRect();
        return r.top + r.height / 2;
      });

  const onHandlePointerDown = (e: React.PointerEvent<HTMLButtonElement>, index: number) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragIndexRef.current = { index, startY: e.clientY };
    setDragState({ index, dy: 0, overIndex: index });
  };

  const onHandlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const start = dragIndexRef.current;
    if (!start || !dragState) return;
    const dy = e.clientY - start.startY;
    const over = dropIndexFromMidpoints(midpoints(), e.clientY);
    setDragState({ ...dragState, dy, overIndex: over });
  };

  const onHandlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const start = dragIndexRef.current;
    if (!start) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    const over = dragState ? dragState.overIndex : start.index;
    dragIndexRef.current = null;
    setDragState(null);
    if (over !== start.index) {
      onChange(reorderItems(items, start.index, over)); // stable ids, totals recomputed by parent
    }
  };

  const onHandleCancel = () => {
    dragIndexRef.current = null;
    setDragState(null);
  };

  // ---------- keyboard: Alt+ArrowUp/Down moves focused row ----------
  const onCardKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (!e.altKey) return;
    if (e.key === 'ArrowUp' && index > 0) { e.preventDefault(); onChange(reorderItems(items, index, index - 1)); }
    if (e.key === 'ArrowDown' && index < items.length - 1) { e.preventDefault(); onChange(reorderItems(items, index, index + 1)); }
  };

  return (
    <div id="items-section" className="space-y-4">
      {/* Smart Calculator Hint */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-purple-50 dark:bg-purple-950/40 px-3 py-1.5 rounded-lg border border-purple-100 dark:border-purple-900/50">
        <span className="flex items-center gap-1.5 font-medium text-purple-700 dark:text-purple-300">
          <Calculator className="w-3.5 h-3.5" />
          Smart math supported in Qty &amp; Rate fields (e.g. 5*800, 10/2, 5+5)
        </span>
        <span className="hidden sm:inline text-[11px] text-purple-600/70 dark:text-purple-400/70">
          Calculates automatically on blur
        </span>
      </div>

      {/* Item List / Cards */}
      <div className="space-y-3">
        {items.map((item, idx) => {
          const rowCalc = calculateItemRow(item);
          const discError = itemDiscountError(item);
          const isDragging = dragState?.index === idx;
          const isOver = dragState && dragState.overIndex === idx && dragState.index !== idx;
          return (
            <div
              key={item.id || idx}
              ref={(el) => { cardRefs.current[idx] = el; }}
              onKeyDown={(e) => onCardKeyDown(e, idx)}
              aria-label={`Item ${idx + 1}`}
              className={`bg-white dark:bg-slate-900 rounded-xl border p-3.5 shadow-xs transition ${
                isDragging
                  ? 'border-[#593C8F] shadow-lg ring-2 ring-[#593C8F]/30 z-10 relative'
                  : isOver
                    ? 'border-[#593C8F]/50'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
              style={isDragging ? { transform: `translateY(${dragState?.dy ?? 0}px)`, transition: 'none' } : undefined}
            >
              {/* Row Header & Actions */}
              <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 min-w-0">
                  {/* Accessible drag handle: pointer drag + keyboard equivalents (Alt+↑/↓) */}
                  <button
                    type="button"
                    aria-label={`Reorder item ${idx + 1}. Drag, or press Alt plus arrow keys to move`}
                    title="Drag to reorder (or Alt+↑/↓)"
                    onPointerDown={(e) => onHandlePointerDown(e, idx)}
                    onPointerMove={onHandlePointerMove}
                    onPointerUp={onHandlePointerUp}
                    onPointerCancel={onHandleCancel}
                    onLostPointerCapture={onHandleCancel}
                    className="p-1 -m-1 rounded text-slate-300 dark:text-slate-600 hover:text-[#593C8F] dark:hover:text-[#A8D5BA] cursor-grab active:cursor-grabbing touch-none"
                    style={{ touchAction: 'none' }}
                  >
                    <GripVertical className="w-4 h-4 pointer-events-none" />
                  </button>
                  <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400 shrink-0">
                    {idx + 1}
                  </span>
                  {/* Product / Service tag */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={item.kind === 'service'}
                    aria-label={item.kind === 'service' ? 'Mark as product' : 'Mark as service'}
                    title={item.kind === 'service' ? 'Tagged: Service — click to tag as Product' : 'Tagged: Product — click to tag as Service'}
                    onClick={() => updateItem(idx, { kind: item.kind === 'service' ? 'product' : 'service' })}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border transition shrink-0 ${
                      item.kind === 'service'
                        ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-900 text-sky-700 dark:text-sky-300'
                        : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    {item.kind === 'service' ? <Wrench className="w-2.5 h-2.5" /> : <Package className="w-2.5 h-2.5" />}
                    {item.kind === 'service' ? 'SERVICE' : 'PRODUCT'}
                  </button>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                    {item.name ? item.name : `Item #${idx + 1}`}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {onPickProduct && (
                    <button
                      type="button"
                      onClick={() => onPickProduct(idx)}
                      title={productCount > 0 ? 'Autofill from catalogue' : 'Open catalogue (empty)'}
                      aria-label="Autofill from catalogue"
                      className="p-1 rounded text-slate-400 hover:text-[#593C8F] dark:hover:text-[#A8D5BA]"
                    >
                      <PackageSearch className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    title="Move Up (Alt+↑)"
                    aria-label={`Move item ${idx + 1} up`}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(idx)}
                    disabled={idx === items.length - 1}
                    title="Move Down (Alt+↓)"
                    aria-label={`Move item ${idx + 1} down`}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicateItem(idx)}
                    title="Duplicate Item"
                    aria-label={`Duplicate item ${idx + 1}`}
                    className="p-1 rounded text-slate-400 hover:text-purple-600 dark:hover:text-purple-400"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteItem(idx)}
                    title="Delete Item"
                    aria-label={`Delete item ${idx + 1}`}
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
                  <label htmlFor={`item-name-${item.id}`} className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Item Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id={`item-name-${item.id}`}
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
                    <label htmlFor={`item-hsn-${item.id}`} className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      HSN / SAC
                    </label>
                    <input
                      id={`item-hsn-${item.id}`}
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
                  <label htmlFor={`item-qty-${item.id}`} className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Quantity
                  </label>
                  <div className="flex gap-1">
                    <input
                      id={`item-qty-${item.id}`}
                      type="text"
                      inputMode="decimal"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                      onBlur={() => handleExpressionBlur(idx, 'quantity')}
                      placeholder="1"
                      className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8]"
                    />
                    <select
                      value={item.unit}
                      onChange={(e) => updateItem(idx, { unit: e.target.value as UnitType })}
                      aria-label="Unit"
                      className="text-xs bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-1.5 focus:outline-none"
                    >
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Rate */}
                <div className={showGST ? 'sm:col-span-2' : 'sm:col-span-3'}>
                  <label htmlFor={`item-rate-${item.id}`} className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Rate / Price
                  </label>
                  <input
                    id={`item-rate-${item.id}`}
                    type="text"
                    inputMode="decimal"
                    value={item.rate}
                    onChange={(e) => updateItem(idx, { rate: e.target.value })}
                    onBlur={() => handleExpressionBlur(idx, 'rate')}
                    placeholder="0.00"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#593C8F] dark:focus:ring-[#7B5BB8]"
                  />
                </div>

                {/* Row Total (after line discount + tax) */}
                <div className="sm:col-span-2 flex flex-col justify-end text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Row Total</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono">
                    {formatCurrency(rowCalc.total, currency)}
                  </span>
                  {rowCalc.discountAmount > 0 && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      after −{formatCurrency(rowCalc.discountAmount, currency)} discount
                    </span>
                  )}
                </div>
              </div>

              {/* Collapsible / Optional Item Details */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mt-2.5 pt-2 border-t border-slate-50 dark:border-slate-800/60">
                <div className="sm:col-span-6">
                  <label htmlFor={`item-desc-${item.id}`} className="sr-only">Description</label>
                  <input
                    id={`item-desc-${item.id}`}
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(idx, { description: e.target.value })}
                    placeholder="Optional item description or specifications..."
                    className="w-full px-2.5 py-1 text-[11px] bg-transparent border-b border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#593C8F] dark:focus:border-[#7B5BB8] text-slate-600 dark:text-slate-400"
                  />
                </div>

                {/* Item Level Tax % */}
                <div className="sm:col-span-3 flex items-center gap-1.5">
                  <label htmlFor={`item-tax-${item.id}`} className="text-[10px] font-medium text-slate-400 shrink-0">Tax %:</label>
                  <select
                    id={`item-tax-${item.id}`}
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

                {/* Item Level Discount: type + value */}
                <div className="sm:col-span-3 flex items-center gap-1.5">
                  <label htmlFor={`item-dtype-${item.id}`} className="sr-only">Discount type</label>
                  <select
                    id={`item-dtype-${item.id}`}
                    value={item.discountType || 'percent'}
                    onChange={(e) => updateItem(idx, {
                      discountType: e.target.value as 'percent' | 'fixed',
                      discountValue: sanitizeDiscountValue(item.discountValue, e.target.value as 'percent' | 'fixed'),
                    })}
                    title="Discount type"
                    className="px-1.5 py-1 text-[11px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded focus:outline-none"
                  >
                    <option value="percent">−%</option>
                    <option value="fixed">−₹</option>
                  </select>
                  <label htmlFor={`item-dval-${item.id}`} className="sr-only">Discount value</label>
                  <input
                    id={`item-dval-${item.id}`}
                    type="number"
                    min={0}
                    max={item.discountType === 'percent' ? 100 : undefined}
                    step="any"
                    value={item.discountValue ?? ''}
                    onChange={(e) => updateItem(idx, { discountValue: sanitizeDiscountValue(e.target.value, item.discountType || 'percent') })}
                    onBlur={(e) => updateItem(idx, { discountValue: sanitizeDiscountValue(e.target.value, item.discountType || 'percent') })}
                    placeholder="0"
                    aria-invalid={!!discError}
                    className={`w-full px-2 py-1 text-xs font-mono rounded focus:outline-none ${
                      discError
                        ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-400 text-rose-700 dark:text-rose-300'
                        : 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800'
                    }`}
                  />
                  <span className="text-[10px] font-medium text-slate-400 shrink-0">
                    {discError ? '!' : item.discountType === 'fixed' ? 'flat' : '%'}
                  </span>
                </div>
              </div>

              {/* Discount validation message + line breakdown */}
              {discError && (
                <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400" role="alert">{discError}</p>
              )}
              {rowCalc.discountAmount > 0 && (
                <p className="mt-1 text-[10px] text-slate-400 font-mono">
                  {formatCurrency(rowCalc.subtotal, currency)} − {formatCurrency(rowCalc.discountAmount, currency)} discount ={' '}
                  {formatCurrency(rowCalc.taxable, currency)} taxable + {formatCurrency(rowCalc.taxAmount, currency)} tax
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Item Action — brand-tinted, full states, 44px touch target */}
      <button
        type="button"
        onClick={addItem}
        aria-label="Add line item"
        className="w-full min-h-[44px] py-2.5 px-4 rounded-xl border-2 border-dashed border-[#593C8F]/30 dark:border-[#7B5BB8]/40 bg-[#593C8F]/[0.06] dark:bg-[#7B5BB8]/10 hover:bg-[#593C8F]/10 dark:hover:bg-[#7B5BB8]/20 hover:border-[#593C8F] dark:hover:border-[#7B5BB8] active:scale-[0.99] active:bg-[#593C8F]/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#593C8F] dark:focus-visible:ring-[#A8D5BA] text-[#593C8F] dark:text-[#A8D5BA] hover:text-[#452b6e] dark:hover:text-[#c2ead1] text-xs font-bold transition flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" strokeWidth={2.75} />
        Add Line Item (Alt + I)
      </button>
    </div>
  );
};
