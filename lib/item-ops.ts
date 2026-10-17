/**
 * Pure item-list operations for the Phase 3 advanced items editor.
 * All functions are immutable, keep item ids stable unless a NEW item is
 * intentionally created (duplicate/add), and never mutate inputs.
 */
import { DocumentItem, UnitType } from '@/types/document';

let idCounter = 0;
/** Collision-safe unique item id (timestamp + counter + random). */
export function newItemId(): string {
  idCounter = (idCounter + 1) % 100000;
  return `item_${Date.now().toString(36)}_${idCounter.toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/** A fresh blank line item. Existing tax mode decides GST default. */
export function createBlankItem(showGST: boolean): DocumentItem {
  return {
    id: newItemId(),
    name: '',
    description: '',
    hsn: showGST ? '998314' : '',
    quantity: 1,
    unit: 'service' as UnitType,
    rate: '',
    discountType: 'percent',
    discountValue: 0,
    taxRate: showGST ? 18 : 0,
    kind: 'service',
  };
}

/**
 * Move the item at `from` to `to` (clamped to the list bounds).
 * Item ids (and all properties) are preserved exactly; only order changes.
 * Returns the SAME array reference when nothing would move.
 */
export function reorderItems(items: DocumentItem[], from: number, to: number): DocumentItem[] {
  const n = items.length;
  if (n === 0) return items;
  const f = Math.max(0, Math.min(n - 1, from));
  let t = Math.max(0, Math.min(n - 1, to));
  if (f === t) return items;
  const next = [...items];
  const [moved] = next.splice(f, 1);
  next.splice(t, 0, moved);
  return next;
}

/**
 * Duplicate the item at `index` and insert the copy DIRECTLY AFTER the
 * original. The copy gets a brand-new unique id; every other property
 * (name, description, hsn, qty, unit, rate, discount type/value, tax,
 * kind) is copied verbatim. Document-level data is never touched.
 */
export function duplicateItemAt(items: DocumentItem[], index: number): DocumentItem[] {
  if (index < 0 || index >= items.length) return items;
  const copy: DocumentItem = { ...items[index], id: newItemId() };
  const next = [...items];
  next.splice(index + 1, 0, copy);
  return next;
}

/** Clamp/sanitize a discount value for the given type. Prevents negatives,
 *  NaN, Infinity, and excessive discounts (>100% or > line subtotal is
 *  clamped by the calc engine; here we keep the input itself sane). */
export function sanitizeDiscountValue(raw: unknown, type: 'percent' | 'fixed'): number {
  let v = typeof raw === 'number' ? raw : parseFloat(String(raw));
  if (!isFinite(v) || isNaN(v)) return 0;
  if (v < 0) v = 0;
  if (type === 'percent' && v > 100) v = 100;
  // fixed amounts above 1e9 make no sense in a line item; clamp softly
  if (type === 'fixed' && v > 1e9) v = 1e9;
  return Math.round(v * 100) / 100;
}

/** Which index a dragged pointer "belongs to" given card midpoints (px). */
export function dropIndexFromMidpoints(midpoints: number[], pointerY: number): number {
  for (let i = 0; i < midpoints.length; i++) {
    if (pointerY < midpoints[i]) return i;
  }
  return midpoints.length - 1;
}
