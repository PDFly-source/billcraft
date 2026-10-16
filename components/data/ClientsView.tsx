'use client';

import React, { useMemo, useState } from 'react';
import { ClientRecord } from '@/types/local';
import { useLocalData } from '@/hooks/useLocalData';
import { searchClients, findDuplicateClient } from '@/lib/db/repository';
import { BillCraftIcon } from '@/components/ui/BillCraftIcons';
import { User, Phone, Mail, Search, Plus, Pencil, Trash2, Building2, X, Save, MapPin, AlertTriangle } from 'lucide-react';

const EMPTY: Omit<ClientRecord, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '', contactPerson: '', phone: '', email: '', billingAddress: '',
  shippingAddress: '', gstin: '', state: '', stateCode: '', notes: '',
};

export const ClientsView: React.FC<{ onShowToast: (m: string) => void }> = ({ onShowToast }) => {
  const { clients, ready, storageError, saveClient, deleteClient } = useLocalData();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'name' | 'recent'>('name');
  const [editing, setEditing] = useState<ClientRecord | null>(null);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<ClientRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const list = useMemo(() => {
    let l = searchClients(clients, query);
    if (sort === 'recent') l = [...l].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    return l;
  }, [clients, query, sort]);

  const openNew = () => { setForm({ ...EMPTY }); setErrors({}); setEditing({ ...EMPTY, id: '', createdAt: '', updatedAt: '' }); };
  const openEdit = (c: ClientRecord) => { setForm({ ...c }); setErrors({}); setEditing(c); };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Client name is required';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Invalid email address';
    if (form.phone && !/^[+\d][\d\s-]{6,17}$/.test(form.phone.trim())) e.phone = 'Invalid phone number';
    if (form.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d]?$/.test(form.gstin.toUpperCase())) e.gstin = 'GSTIN should look like 27AABCU9603R1ZM';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const dup = findDuplicateClient(clients, { name: form.name, gstin: form.gstin }, editing?.id || undefined);
    if (dup && !window.confirm(`"${dup.name}" already exists${dup.gstin ? ' with this GSTIN' : ''}.\n\nSave anyway as a separate client?`)) return;
    setSaving(true);
    try {
      await saveClient({ ...form, name: form.name.trim(), gstin: form.gstin.trim().toUpperCase(), id: editing?.id || undefined });
      onShowToast(editing?.id ? 'Client updated' : 'Client saved');
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
      await deleteClient(confirmDelete.id);
      onShowToast(`Deleted "${confirmDelete.name}"`);
    } catch (err) {
      onShowToast(`Delete failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      setConfirmDelete(null);
    }
  };

  const input = (key: keyof typeof EMPTY, label: string, opts?: { area?: boolean; placeholder?: string; type?: string }) => (
    <label className="block">
      <span className="lab">{label}</span>
      {opts?.area ? (
        <textarea
          className={`w-full rounded-xl border bg-white dark:bg-[#17141D] px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#A8D5BA] ${errors[key] ? 'border-red-400' : 'border-[#E7E0EE] dark:border-[#302B38]'}`}
          rows={2}
          value={form[key]}
          placeholder={opts?.placeholder}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        />
      ) : (
        <input
          type={opts?.type ?? 'text'}
          className={`w-full rounded-xl border bg-white dark:bg-[#17141D] px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-[#593C8F] dark:focus:ring-[#A8D5BA] ${errors[key] ? 'border-red-400' : 'border-[#E7E0EE] dark:border-[#302B38]'}`}
          value={form[key]}
          placeholder={opts?.placeholder}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        />
      )}
      {errors[key] && <span className="text-[10px] text-red-500">{errors[key]}</span>}
    </label>
  );

  return (
    <div className="max-w-[420px] mx-auto space-y-3.5 py-1 px-1 animate-in fade-in duration-200">
      <div className="h" style={{ color: 'var(--ink)' }}>Clients</div>

      {storageError && (
        <div className="card row items-start gap-2 p-3 border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div className="text-[11px] text-red-700 dark:text-red-300">
            Local storage is unavailable in this browser ({storageError}). Client data cannot be saved.
          </div>
        </div>
      )}

      {/* search + add */}
      <div className="row sp" style={{ gap: '8px' }}>
        <div className="row flex-1" style={{ background: '#fff', border: '1px solid var(--bd)', borderRadius: 12, padding: '6px 10px', gap: 6 }}>
          <Search className="w-3.5 h-3.5 text-[#6D6879] dark:text-[#A39BB0]" />
          <input
            className="flex-1 bg-transparent outline-none text-[12px] text-[#17151F] dark:text-[#F8F5FC]"
            placeholder="Search name, phone, email, GSTIN…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search clients"
          />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search"><X className="w-3.5 h-3.5 text-[#6D6879]" /></button>}
        </div>
        <button type="button" onClick={openNew} className="btn shrink-0" style={{ gap: 4 }}>
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {/* sort */}
      <div className="row" style={{ gap: 6 }}>
        <span className="text-[10px] text-[#6D6879] dark:text-[#A39BB0]">Sort:</span>
        {(['name', 'recent'] as const).map((s) => (
          <button key={s} type="button" onClick={() => setSort(s)}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${sort === s ? 'bg-[#593C8F] text-white' : 'text-[#6D6879] dark:text-[#A39BB0] hover:bg-[#F1ECF8] dark:hover:bg-[#281E36]'}`}>
            {s === 'name' ? 'A–Z' : 'Recently updated'}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-[#6D6879] dark:text-[#A39BB0]">{list.length} of {clients.length}</span>
      </div>

      {/* list */}
      {!ready ? (
        <div className="card p-6 text-center text-[11px] text-[#6D6879]">Loading clients…</div>
      ) : list.length === 0 ? (
        <div className="card p-6 text-center space-y-2">
          <User className="w-8 h-8 mx-auto text-[#B9A8D6]" />
          <div className="text-[12px] font-bold text-[#17151F] dark:text-[#F8F5FC]">
            {query ? 'No clients match your search' : 'No clients yet'}
          </div>
          <p className="text-[10.5px] text-[#6D6879] dark:text-[#A39BB0]">
            {query ? 'Try a different name, phone or GSTIN.' : 'Save client details once and reuse them on every invoice, quotation and estimate.'}
          </p>
          {!query && <button type="button" onClick={openNew} className="btn"><Plus className="w-3.5 h-3.5" /> Add your first client</button>}
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((c) => (
            <div key={c.id} className="card p-3 space-y-1.5">
              <div className="row sp">
                <div className="row" style={{ gap: 8 }}>
                  <span className="w-8 h-8 rounded-xl bg-[#F1ECF8] dark:bg-[#281E36] row justify-center items-center shrink-0 inline-flex">
                    <Building2 className="w-4 h-4 text-[#593C8F] dark:text-[#A8D5BA]" />
                  </span>
                  <div>
                    <div className="text-[12px] font-bold text-[#17151F] dark:text-[#F8F5FC]">{c.name}</div>
                    {c.contactPerson && <div className="text-[10px] text-[#6D6879] dark:text-[#A39BB0]">{c.contactPerson}</div>}
                  </div>
                </div>
                <div className="row" style={{ gap: 4 }}>
                  <button type="button" onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-[#F1ECF8] dark:hover:bg-[#281E36] transition" aria-label={`Edit ${c.name}`}><Pencil className="w-3.5 h-3.5 text-[#593C8F] dark:text-[#A8D5BA]" /></button>
                  <button type="button" onClick={() => setConfirmDelete(c)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition" aria-label={`Delete ${c.name}`}><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                </div>
              </div>
              <div className="row flex-wrap" style={{ gap: 8 }}>
                {c.phone && <span className="row" style={{ gap: 3 }}><Phone className="w-3 h-3 text-[#6D6879]" /><span className="text-[10px] text-[#6D6879] dark:text-[#A39BB0]">{c.phone}</span></span>}
                {c.email && <span className="row" style={{ gap: 3 }}><Mail className="w-3 h-3 text-[#6D6879]" /><span className="text-[10px] text-[#6D6879] dark:text-[#A39BB0]">{c.email}</span></span>}
                {c.gstin && <span className="text-[10px] font-mono bg-[#F6F2FA] dark:bg-[#20192C] px-1.5 py-0.5 rounded text-[#593C8F] dark:text-[#A8D5BA]">GSTIN {c.gstin}</span>}
                {c.billingAddress && <span className="row items-start w-full" style={{ gap: 3 }}><MapPin className="w-3 h-3 text-[#6D6879] mt-0.5" /><span className="text-[10px] text-[#6D6879] dark:text-[#A39BB0] whitespace-pre-line">{c.billingAddress}</span></span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* editor modal */}
      {editing && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 animate-in fade-in duration-150" onClick={() => setEditing(null)}>
          <div className="bg-[#FAF6EE] dark:bg-[#1B1820] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom duration-200" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={editing.id ? 'Edit client' : 'Add client'}>
            <div className="row sp sticky top-0 bg-[#FAF6EE] dark:bg-[#1B1820] px-4 py-3 border-b border-[#E7E0EE] dark:border-[#302B38]">
              <div className="text-[13px] font-bold text-[#17151F] dark:text-[#F8F5FC]">{editing.id ? 'Edit Client' : 'Add Client'}</div>
              <button type="button" onClick={() => setEditing(null)} aria-label="Close"><X className="w-4 h-4 text-[#6D6879]" /></button>
            </div>
            <div className="p-4 space-y-3">
              {input('name', 'Client / business name *', { placeholder: 'Acme Traders Pvt Ltd' })}
              {input('contactPerson', 'Contact person', { placeholder: 'Ravi Kumar' })}
              <div className="grid grid-cols-2 gap-3">
                {input('phone', 'Phone', { placeholder: '98765 43210' })}
                {input('email', 'Email', { placeholder: 'ravi@acme.in', type: 'email' })}
              </div>
              {input('billingAddress', 'Billing address', { area: true, placeholder: 'Street, city, state, PIN' })}
              {input('shippingAddress', 'Shipping address', { area: true, placeholder: 'Leave blank to use billing address' })}
              <div className="grid grid-cols-2 gap-3">
                {input('gstin', 'GSTIN', { placeholder: '27AABCU9603R1ZM' })}
                <label className="block">
                  <span className="lab">State / state code</span>
                  <input className="w-full rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-[#593C8F]" value={form.state} placeholder="Maharashtra" onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
                  <input className="w-full mt-1 rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-[#593C8F]" value={form.stateCode} placeholder="27" onChange={(e) => setForm((f) => ({ ...f, stateCode: e.target.value }))} aria-label="State code" />
                </label>
              </div>
              {input('notes', 'Notes', { area: true, placeholder: 'Payment habits, preferences…' })}
            </div>
            <div className="row sticky bottom-0 bg-[#FAF6EE] dark:bg-[#1B1820] px-4 py-3 border-t border-[#E7E0EE] dark:border-[#302B38]" style={{ gap: 8 }}>
              <button type="button" onClick={() => setEditing(null)} className="btn o flex-1">Cancel</button>
              <button type="button" onClick={handleSave} disabled={saving} className="btn flex-1 inline-flex items-center justify-center gap-1.5 disabled:opacity-60">
                <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save client'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150" onClick={() => setConfirmDelete(null)}>
          <div className="bg-[#FAF6EE] dark:bg-[#1B1820] rounded-2xl max-w-sm w-full p-5 space-y-3" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
            <div className="row" style={{ gap: 8 }}>
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <div className="text-[13px] font-bold text-[#17151F] dark:text-[#F8F5FC]">Delete client?</div>
            </div>
            <p className="text-[11px] text-[#6D6879] dark:text-[#A39BB0]">
              &quot;{confirmDelete.name}&quot; will be removed from your client list. Previously issued documents keep their own snapshot and are not affected.
            </p>
            <div className="row" style={{ gap: 8 }}>
              <button type="button" onClick={() => setConfirmDelete(null)} className="btn o flex-1">Keep client</button>
              <button type="button" onClick={handleDelete} className="flex-1 px-3 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[11px] font-bold transition">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
