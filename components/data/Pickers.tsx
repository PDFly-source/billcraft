'use client';

/**
 * Client and Product pickers used by the editor. Selecting populates the
 * current DOCUMENT only — the saved client/profile record is never modified.
 */
import React, { useMemo, useState } from 'react';
import { useLocalData } from '@/hooks/useLocalData';
import { searchClients, searchProducts } from '@/lib/db/repository';
import { X, Search, User, Package } from 'lucide-react';

export const ClientPickerModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onPick: (clientId: string) => void;
  onManage: () => void;
}> = ({ open, onClose, onPick, onManage }) => {
  const { clients } = useLocalData();
  const [q, setQ] = useState('');
  const list = useMemo(() => searchClients(clients, q), [clients, q]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 animate-in fade-in duration-150" onClick={onClose}>
      <div className="bg-[#FAF6EE] dark:bg-[#1B1820] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[70vh] flex flex-col animate-in slide-in-from-bottom duration-200" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Select client">
        <div className="row sp px-4 py-3 border-b border-[#E7E0EE] dark:border-[#302B38]">
          <div className="text-[13px] font-bold text-[#17151F] dark:text-[#F8F5FC]">Select client</div>
          <button type="button" onClick={onClose} aria-label="Close"><X className="w-4 h-4 text-[#6D6879]" /></button>
        </div>
        <div className="p-3">
          <div className="row" style={{ background: '#fff', border: '1px solid var(--bd)', borderRadius: 12, padding: '6px 10px', gap: 6 }}>
            <Search className="w-3.5 h-3.5 text-[#6D6879] shrink-0" />
            <input autoFocus className="flex-1 bg-transparent outline-none text-[12px] text-[#17151F] dark:text-[#F8F5FC]" placeholder="Search clients…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
          {list.length === 0 ? (
            <div className="text-center py-6">
              <User className="w-7 h-7 mx-auto text-[#B9A8D6]" />
              <p className="text-[11px] text-[#6D6879] dark:text-[#A39BB0] mt-1.5">No saved client matches.</p>
              <button type="button" className="btn mt-2" onClick={() => { onManage(); onClose(); }}>Open Clients</button>
            </div>
          ) : list.map((c) => (
            <button key={c.id} type="button" className="card w-full p-3 text-left hover:border-[#593C8F] transition" onClick={() => { onPick(c.id); onClose(); }}>
              <div className="text-[12px] font-bold text-[#17151F] dark:text-[#F8F5FC]">{c.name}</div>
              <div className="row" style={{ gap: 8 }}>
                {c.phone && <span className="text-[10px] text-[#6D6879] dark:text-[#A39BB0]">{c.phone}</span>}
                {c.gstin && <span className="text-[10px] font-mono text-[#593C8F] dark:text-[#A8D5BA]">{c.gstin}</span>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export const ProductPickerModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onPick: (productId: string) => void;
  onManage: () => void;
}> = ({ open, onClose, onPick, onManage }) => {
  const { products } = useLocalData();
  const [q, setQ] = useState('');
  const list = useMemo(() => searchProducts(products, q), [products, q]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 animate-in fade-in duration-150" onClick={onClose}>
      <div className="bg-[#FAF6EE] dark:bg-[#1B1820] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[70vh] flex flex-col animate-in slide-in-from-bottom duration-200" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Select catalogue item">
        <div className="row sp px-4 py-3 border-b border-[#E7E0EE] dark:border-[#302B38]">
          <div className="text-[13px] font-bold text-[#17151F] dark:text-[#F8F5FC]">Add from catalogue</div>
          <button type="button" onClick={onClose} aria-label="Close"><X className="w-4 h-4 text-[#6D6879]" /></button>
        </div>
        <div className="p-3">
          <div className="row" style={{ background: '#fff', border: '1px solid var(--bd)', borderRadius: 12, padding: '6px 10px', gap: 6 }}>
            <Search className="w-3.5 h-3.5 text-[#6D6879] shrink-0" />
            <input autoFocus className="flex-1 bg-transparent outline-none text-[12px] text-[#17151F] dark:text-[#F8F5FC]" placeholder="Search items, SKU, HSN…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
          {list.length === 0 ? (
            <div className="text-center py-6">
              <Package className="w-7 h-7 mx-auto text-[#B9A8D6]" />
              <p className="text-[11px] text-[#6D6879] dark:text-[#A39BB0] mt-1.5">No catalogue item matches — you can still type a one-off item manually.</p>
              <button type="button" className="btn mt-2" onClick={() => { onManage(); onClose(); }}>Open Catalogue</button>
            </div>
          ) : list.map((p) => (
            <button key={p.id} type="button" className="card w-full p-3 text-left hover:border-[#593C8F] transition" onClick={() => { onPick(p.id); onClose(); }}>
              <div className="row sp">
                <div className="min-w-0">
                  <div className="row" style={{ gap: 6 }}>
                    <span className="text-[12px] font-bold text-[#17151F] dark:text-[#F8F5FC] truncate">{p.name}</span>
                    {p.sku && <span className="text-[9px] font-mono bg-[#F6F2FA] dark:bg-[#20192C] px-1.5 py-0.5 rounded text-[#593C8F] dark:text-[#A8D5BA] shrink-0">{p.sku}</span>}
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <span className="text-[11px] font-bold text-[#593C8F] dark:text-[#A8D5BA]">₹{p.price.toFixed(2)}</span>
                    <span className="text-[10px] text-[#6D6879] dark:text-[#A39BB0]">{p.unit} • GST {p.taxRate}%{p.hsn ? ` • HSN ${p.hsn}` : ''}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
