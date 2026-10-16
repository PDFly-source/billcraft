'use client';

import React, { useMemo, useState } from 'react';
import { ProductRecord } from '@/types/local';
import { useLocalData } from '@/hooks/useLocalData';
import { searchProducts } from '@/lib/db/repository';
import { Search, Plus, Pencil, Trash2, X, Save, Package, AlertTriangle } from 'lucide-react';

const EMPTY = {
  name: '', description: '', sku: '', unit: 'pcs',
  price: '' as string | number, taxRate: 18, hsn: '', category: '',
};

const UNITS = ['pcs', 'kg', 'g', 'ltr', 'ml', 'hr', 'day', 'month', 'box', 'set', 'service', 'other'];

export const ProductsView: React.FC<{ onShowToast: (m: string) => void }> = ({ onShowToast }) => {
  const { products, ready, storageError, saveProduct, deleteProduct } = useLocalData();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'name' | 'recent'>('name');
  const [editing, setEditing] = useState<ProductRecord | null>(null);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<ProductRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const list = useMemo(() => {
    let l = searchProducts(products, query);
    if (sort === 'recent') l = [...l].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    return l;
  }, [products, query, sort]);

  const openNew = () => { setForm({ ...EMPTY }); setErrors({}); setEditing({ ...EMPTY, id: '', price: 0, priceMinor: 0, createdAt: '', updatedAt: '' } as ProductRecord); };
  const openEdit = (p: ProductRecord) => { setForm({ name: p.name, description: p.description, sku: p.sku, unit: p.unit, price: p.price, taxRate: p.taxRate, hsn: p.hsn, category: p.category }); setErrors({}); setEditing(p); };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Item name is required';
    const price = parseFloat(String(form.price));
    if (isNaN(price) || price < 0) e.price = 'Enter a valid non-negative price';
    const tax = parseFloat(String(form.taxRate));
    if (isNaN(tax) || tax < 0 || tax > 100) e.taxRate = 'Tax rate must be 0–100%';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await saveProduct({
        id: editing?.id || undefined,
        name: form.name.trim(), description: form.description, sku: form.sku.trim(),
        unit: form.unit, price: parseFloat(String(form.price)) || 0,
        taxRate: parseFloat(String(form.taxRate)) || 0, hsn: form.hsn.trim(), category: form.category,
      });
      onShowToast(editing?.id ? 'Item updated' : 'Item saved');
      setEditing(null);
    } catch (err) {
      onShowToast(`Save failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteProduct(confirmDelete.id);
      onShowToast(`Deleted "${confirmDelete.name}"`);
    } catch (err) {
      onShowToast(`Delete failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="max-w-[420px] mx-auto space-y-3.5 py-1 px-1 animate-in fade-in duration-200">
      <div className="h" style={{ color: 'var(--ink)' }}>Products &amp; Services</div>

      {storageError && (
        <div className="card row items-start gap-2 p-3 border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div className="text-[11px] text-red-700 dark:text-red-300">Local storage unavailable ({storageError}). Catalogue cannot be saved.</div>
        </div>
      )}

      <div className="row sp" style={{ gap: 8 }}>
        <div className="row flex-1" style={{ background: '#fff', border: '1px solid var(--bd)', borderRadius: 12, padding: '6px 10px', gap: 6 }}>
          <Search className="w-3.5 h-3.5 text-[#6D6879] dark:text-[#A39BB0]" />
          <input className="flex-1 bg-transparent outline-none text-[12px] text-[#17151F] dark:text-[#F8F5FC]" placeholder="Search name, SKU, HSN…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search products" />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear"><X className="w-3.5 h-3.5 text-[#6D6879]" /></button>}
        </div>
        <button type="button" onClick={openNew} className="btn shrink-0" style={{ gap: 4 }}><Plus className="w-3.5 h-3.5" /> Add</button>
      </div>

      <div className="row" style={{ gap: 6 }}>
        <span className="text-[10px] text-[#6D6879] dark:text-[#A39BB0]">Sort:</span>
        {(['name', 'recent'] as const).map((s) => (
          <button key={s} type="button" onClick={() => setSort(s)} className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${sort === s ? 'bg-[#593C8F] text-white' : 'text-[#6D6879] dark:text-[#A39BB0] hover:bg-[#F1ECF8] dark:hover:bg-[#281E36]'}`}>{s === 'name' ? 'A–Z' : 'Recent'}</button>
        ))}
        <span className="ml-auto text-[10px] text-[#6D6879] dark:text-[#A39BB0]">{list.length} of {products.length}</span>
      </div>

      {!ready ? (
        <div className="card p-6 text-center text-[11px] text-[#6D6879]">Loading catalogue…</div>
      ) : list.length === 0 ? (
        <div className="card p-6 text-center space-y-2">
          <Package className="w-8 h-8 mx-auto text-[#B9A8D6]" />
          <div className="text-[12px] font-bold text-[#17151F] dark:text-[#F8F5FC]">{query ? 'No items match your search' : 'Catalogue is empty'}</div>
          <p className="text-[10.5px] text-[#6D6879] dark:text-[#A39BB0]">
            {query ? 'Try a different name or SKU.' : 'Save products and services once — then autofill name, price, unit and GST on every line item.'}
          </p>
          {!query && <button type="button" onClick={openNew} className="btn"><Plus className="w-3.5 h-3.5" /> Add first item</button>}
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((p) => (
            <div key={p.id} className="card p-3">
              <div className="row sp">
                <div className="min-w-0">
                  <div className="row" style={{ gap: 6 }}>
                    <span className="text-[12px] font-bold text-[#17151F] dark:text-[#F8F5FC] truncate">{p.name}</span>
                    {p.sku && <span className="text-[9px] font-mono bg-[#F6F2FA] dark:bg-[#20192C] px-1.5 py-0.5 rounded text-[#593C8F] dark:text-[#A8D5BA] shrink-0">{p.sku}</span>}
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <span className="text-[11px] font-bold text-[#593C8F] dark:text-[#A8D5BA]">₹{p.price.toFixed(2)}</span>
                    <span className="text-[10px] text-[#6D6879] dark:text-[#A39BB0]">per {p.unit}</span>
                    <span className="text-[10px] text-[#6D6879] dark:text-[#A39BB0]">GST {p.taxRate}%</span>
                    {p.hsn && <span className="text-[10px] text-[#6D6879] dark:text-[#A39BB0]">HSN {p.hsn}</span>}
                  </div>
                  {p.description && <div className="text-[10px] text-[#6D6879] dark:text-[#A39BB0] truncate">{p.description}</div>}
                </div>
                <div className="row shrink-0" style={{ gap: 4 }}>
                  <button type="button" onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-[#F1ECF8] dark:hover:bg-[#281E36] transition" aria-label={`Edit ${p.name}`}><Pencil className="w-3.5 h-3.5 text-[#593C8F] dark:text-[#A8D5BA]" /></button>
                  <button type="button" onClick={() => setConfirmDelete(p)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition" aria-label={`Delete ${p.name}`}><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 animate-in fade-in duration-150" onClick={() => setEditing(null)}>
          <div className="bg-[#FAF6EE] dark:bg-[#1B1820] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom duration-200" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={editing.id ? 'Edit item' : 'Add item'}>
            <div className="row sp sticky top-0 bg-[#FAF6EE] dark:bg-[#1B1820] px-4 py-3 border-b border-[#E7E0EE] dark:border-[#302B38]">
              <div className="text-[13px] font-bold text-[#17151F] dark:text-[#F8F5FC]">{editing.id ? 'Edit Item' : 'Add Product / Service'}</div>
              <button type="button" onClick={() => setEditing(null)} aria-label="Close"><X className="w-4 h-4 text-[#6D6879]" /></button>
            </div>
            <div className="p-4 space-y-3">
              <label className="block"><span className="lab">Item / service name *</span>
                <input className={`w-full rounded-xl border bg-white dark:bg-[#17141D] px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-[#593C8F] ${errors.name ? 'border-red-400' : 'border-[#E7E0EE] dark:border-[#302B38]'}`} value={form.name} placeholder="Steel bolts M8" onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                {errors.name && <span className="text-[10px] text-red-500">{errors.name}</span>}
              </label>
              <label className="block"><span className="lab">Description</span>
                <textarea className="w-full rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-[#593C8F]" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="lab">SKU / item code</span>
                  <input className="w-full rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-[#593C8F]" value={form.sku} placeholder="BOLT-M8" onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
                </label>
                <label className="block"><span className="lab">Unit</span>
                  <select className="w-full rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-[#593C8F]" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}>
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="lab">Default unit price (₹) *</span>
                  <input type="number" inputMode="decimal" min="0" step="0.01" className={`w-full rounded-xl border bg-white dark:bg-[#17141D] px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-[#593C8F] ${errors.price ? 'border-red-400' : 'border-[#E7E0EE] dark:border-[#302B38]'}`} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
                  {errors.price && <span className="text-[10px] text-red-500">{errors.price}</span>}
                </label>
                <label className="block"><span className="lab">GST rate (%)</span>
                  <select className="w-full rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-[#593C8F]" value={form.taxRate} onChange={(e) => setForm((f) => ({ ...f, taxRate: parseFloat(e.target.value) }))}>
                    {[0, 5, 12, 18, 28].map((r) => <option key={r} value={r}>{r}%{r === 0 ? ' (exempt)' : ''}</option>)}
                  </select>
                </label>
              </div>
              <label className="block"><span className="lab">HSN / SAC code (optional)</span>
                <input className="w-full rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-[#593C8F]" value={form.hsn} placeholder="7318" onChange={(e) => setForm((f) => ({ ...f, hsn: e.target.value }))} />
              </label>
            </div>
            <div className="row sticky bottom-0 bg-[#FAF6EE] dark:bg-[#1B1820] px-4 py-3 border-t border-[#E7E0EE] dark:border-[#302B38]" style={{ gap: 8 }}>
              <button type="button" onClick={() => setEditing(null)} className="btn o flex-1">Cancel</button>
              <button type="button" onClick={handleSave} disabled={saving} className="btn flex-1 inline-flex items-center justify-center gap-1.5 disabled:opacity-60"><Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save item'}</button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150" onClick={() => setConfirmDelete(null)}>
          <div className="bg-[#FAF6EE] dark:bg-[#1B1820] rounded-2xl max-w-sm w-full p-5 space-y-3" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
            <div className="row" style={{ gap: 8 }}><AlertTriangle className="w-5 h-5 text-red-400 shrink-0" /><div className="text-[13px] font-bold text-[#17151F] dark:text-[#F8F5FC]">Delete item?</div></div>
            <p className="text-[11px] text-[#6D6879] dark:text-[#A39BB0]">&quot;{confirmDelete.name}&quot; will be removed from your catalogue. Saved documents keep their own line-item copies.</p>
            <div className="row" style={{ gap: 8 }}>
              <button type="button" onClick={() => setConfirmDelete(null)} className="btn o flex-1">Keep item</button>
              <button type="button" onClick={handleDelete} className="flex-1 px-3 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[11px] font-bold transition">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
