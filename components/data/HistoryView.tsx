'use client';

/**
 * Persistent document history: search, filter, sort, open, duplicate,
 * convert quotation->invoice, payment recording, PDF/print of saved documents.
 * Every action works on REAL IndexedDB records (Feature 4/15).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SavedDocument, PaymentRecord } from '@/types/local';
import { DocumentRenderer } from '@/components/templates/DocumentRenderer';
import { useLocalData } from '@/hooks/useLocalData';
import { searchDocuments, filterDocuments, SORTERS, documentBalance, validatePayment } from '@/lib/finance';
import { formatCurrency } from '@/lib/currency';
import { downloadPDF } from '@/lib/pdf-generator';
import {
  Search, X, Trash2, Copy, FileText, Printer, Download, ArrowRightLeft,
  AlertTriangle, Wallet, Pencil, Ban, ChevronDown, Repeat,
} from 'lucide-react';

import { RecurringSection } from '@/components/data/RecurringSection';
import { formatDate } from '@/lib/format';

export interface HistoryViewProps {
  onOpenDocument: (doc: SavedDocument) => void;
  onDuplicateDocument: (doc: SavedDocument) => void;
  onConvertDocument: (doc: SavedDocument) => void;
  onShowToast: (m: string) => void;
}

const TYPE_LABEL: Record<string, string> = {
  purchase_order: 'Purchase Order', delivery_challan: 'Challan', credit_note: 'Credit Note',
  debit_note: 'Debit Note', invoice: 'Invoice', quotation: 'Quotation', receipt: 'Receipt',
  estimate: 'Estimate', proforma: 'Proforma',
};
const TYPE_COLOR: Record<string, string> = {
  invoice: 'bg-[#593C8F] text-white', quotation: 'bg-[#F0B83A] text-[#17151F]',
  receipt: 'bg-[#6FBF9E] text-[#17151F]', estimate: 'bg-[#5B8DB8] text-white',
  proforma: 'bg-[#8B7BB8] text-white', purchase_order: 'bg-[#B07C1E] text-white',
  delivery_challan: 'bg-[#43A6C6] text-white', credit_note: 'bg-[#2E7D5B] text-white',
  debit_note: 'bg-[#C25E5E] text-white',
};

function StatusChip({ d }: { d: SavedDocument }) {
  const b = documentBalance(d);
  const map: Record<string, string> = {
    paid: 'bg-[#6FBF9E]/15 text-[#2E7D5B] dark:text-[#6FBF9E]',
    partial: 'bg-[#F0B83A]/20 text-[#B07C1E] dark:text-[#F0B83A]',
    unpaid: 'bg-[#593C8F]/12 text-[#593C8F] dark:text-[#B9A8D6]',
    overdue: 'bg-red-500/15 text-red-600 dark:text-red-400',
    cancelled: 'bg-[#6D6879]/15 text-[#6D6879] line-through',
    other: 'bg-[#6D6879]/15 text-[#6D6879]',
  };
  let label = TYPE_LABEL[d.type] || d.type;
  if (d.type === 'invoice') {
    label = d.status === 'cancelled' ? 'Cancelled' : b.overdue ? 'Overdue' : b.statusLabel;
  } else if (d.type === 'quotation' || d.type === 'estimate') {
    label = d.status === 'converted' ? 'Converted' : d.status === 'accepted' ? 'Accepted' : d.status === 'rejected' ? 'Rejected' : 'Issued';
  } else if (d.status === 'cancelled') label = 'Cancelled';
  return <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${map[b.statusLabel === 'paid' && !b.overdue ? 'paid' : b.overdue ? 'overdue' : d.status === 'cancelled' ? 'cancelled' : b.statusLabel] || map.other}`}>{label}</span>;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  onOpenDocument, onDuplicateDocument, onConvertDocument, onShowToast,
}) => {
  const { documents, ready, storageError, deleteDocument, setDocumentStatus, addPayment, deletePayment } = useLocalData();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('date-desc');
  const [confirmDelete, setConfirmDelete] = useState<SavedDocument | null>(null);
  const [paymentDoc, setPaymentDoc] = useState<SavedDocument | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [recurringSeed, setRecurringSeed] = useState<SavedDocument | null>(null);

  const list = useMemo(() => {
    let l = searchDocuments(documents, query);
    l = filterDocuments(l, { type: typeFilter, status: statusFilter, from: fromDate, to: toDate });
    const sorter = SORTERS[sortBy] || SORTERS['date-desc'];
    return [...l].sort(sorter);
  }, [documents, query, typeFilter, statusFilter, fromDate, toDate, sortBy]);

  // ---- off-screen render host for exporting saved documents ----
  const [exportDoc, setExportDoc] = useState<SavedDocument | null>(null);
  const [printing, setPrinting] = useState<SavedDocument | null>(null);
  const exportHostRef = useRef<HTMLDivElement>(null);

  const waitRendered = (ms = 500) => new Promise<void>((r) => setTimeout(r, ms));

  const handlePDF = async (d: SavedDocument) => {
    if (exportDoc || printing) return;
    setBusyId(d.id);
    setExportDoc(d);
    await waitRendered();
    try {
      const el = exportHostRef.current?.firstElementChild as HTMLElement;
      if (!el) throw new Error('render failed');
      const name = await downloadPDF(el, d.document, { paperSize: d.document.paperSize });
      onShowToast(`Downloaded ${name}`);
    } catch (err) {
      onShowToast(`PDF export failed: ${err instanceof Error ? err.message : 'error'}`);
    } finally {
      setExportDoc(null);
      setBusyId(null);
    }
  };

  const handlePrint = async (d: SavedDocument) => {
    if (exportDoc || printing) return;
    setBusyId(d.id);
    setPrinting(d);
    await waitRendered();
    document.body.classList.add('bc-history-printing');
    try {
      window.print();
    } finally {
      document.body.classList.remove('bc-history-printing');
      setPrinting(null);
      setBusyId(null);
    }
  };

  useEffect(() => {
    const after = () => {
      document.body.classList.remove('bc-history-printing');
      setPrinting(null);
    };
    window.addEventListener('afterprint', after);
    return () => window.removeEventListener('afterprint', after);
  }, []);

  /** Render a saved document off-screen for print/PDF export.
   *  The host is exactly one A4 width (210mm) wide, so the capture is
   *  always true-size regardless of viewport (Phase 4.1). */
  const hiddenHost = (d: SavedDocument | null) =>
    d ? (
      <div
        id="history-print-host"
        ref={exportHostRef}
        aria-hidden
        style={{ position: 'fixed', left: -99999, top: 0, width: '210mm', background: '#fff', pointerEvents: 'none' }}
      >
        <DocumentRenderer document={d.document} sheetId={`history-sheet-${d.id}`} />
      </div>
    ) : null;

  return (
    <div className="max-w-[420px] mx-auto space-y-3.5 py-1 px-1 animate-in fade-in duration-200">
      <div className="h" style={{ color: 'var(--ink)' }}>History</div>

      {storageError && (
        <div className="card row items-start gap-2 p-3 border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div className="text-[11px] text-red-700 dark:text-red-300">Local storage unavailable ({storageError}). History cannot load.</div>
        </div>
      )}

      <RecurringSection onShowToast={onShowToast} seedDoc={recurringSeed} onSeedConsumed={() => setRecurringSeed(null)} />

      <div className="row sp" style={{ gap: 8 }}>
        <div className="row flex-1" style={{ background: '#fff', border: '1px solid var(--bd)', borderRadius: 12, padding: '6px 10px', gap: 6 }}>
          <Search className="w-3.5 h-3.5 text-[#6D6879] dark:text-[#A39BB0]" />
          <input className="flex-1 bg-transparent outline-none text-[12px] text-[#17151F] dark:text-[#F8F5FC]" placeholder="Search number or client…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search documents" />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear"><X className="w-3.5 h-3.5 text-[#6D6879]" /></button>}
        </div>
        <button type="button" onClick={() => setShowFilters((v) => !v)} className="btn o shrink-0" style={{ gap: 4 }}>
          Filters <ChevronDown className={`w-3 h-3 transition ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {showFilters && (
        <div className="card p-3 space-y-2.5 animate-in fade-in duration-150">
          <div className="grid grid-cols-2 gap-2">
            <label className="block"><span className="lab">Type</span>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-2 py-1.5 text-[11px]">
                <option value="all">All types</option>
                {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="block"><span className="lab">Status</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-2 py-1.5 text-[11px]">
                <option value="all">Any status</option>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partially paid</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
                <option value="converted">Converted</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block"><span className="lab">From date</span>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-2 py-1.5 text-[11px]" />
            </label>
            <label className="block"><span className="lab">To date</span>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-2 py-1.5 text-[11px]" />
            </label>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <span className="lab">Sort:</span>
            {[['date-desc', 'Newest'], ['date-asc', 'Oldest'], ['amount-desc', 'Amount ↓'], ['number-desc', 'Number ↓']].map(([v, l]) => (
              <button key={v} type="button" onClick={() => setSortBy(v)} className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${sortBy === v ? 'bg-[#593C8F] text-white' : 'text-[#6D6879] hover:bg-[#F1ECF8] dark:hover:bg-[#281E36]'}`}>{l}</button>
            ))}
          </div>
          {(typeFilter !== 'all' || statusFilter !== 'all' || fromDate || toDate) && (
            <button type="button" className="text-[10px] font-bold text-[#593C8F] dark:text-[#A8D5BA] underline" onClick={() => { setTypeFilter('all'); setStatusFilter('all'); setFromDate(''); setToDate(''); }}>Clear all filters</button>
          )}
        </div>
      )}

      {!ready ? (
        <div className="card p-6 text-center text-[11px] text-[#6D6879]">Loading history…</div>
      ) : list.length === 0 ? (
        <div className="card p-6 text-center space-y-2">
          <FileText className="w-8 h-8 mx-auto text-[#B9A8D6]" />
          <div className="text-[12px] font-bold text-[#17151F] dark:text-[#F8F5FC]">{documents.length === 0 ? 'No saved documents yet' : 'Nothing matches'}</div>
          <p className="text-[10.5px] text-[#6D6879] dark:text-[#A39BB0]">
            {documents.length === 0 ? 'Save an invoice from the editor and it will appear here, with payments and totals.' : 'Adjust the search or filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((d) => {
            const b = documentBalance(d);
            const cur = d.document.currency;
            return (
              <div key={d.id} className="card p-3 space-y-2">
                <div className="row sp">
                  <div className="row" style={{ gap: 8 }}>
                    <span className={`px-1.5 py-1 rounded-lg text-[9px] font-bold uppercase ${TYPE_COLOR[d.type] || 'bg-[#6D6879] text-white'} shrink-0`}>{TYPE_LABEL[d.type] || d.type}</span>
                    <div className="min-w-0">
                      <div className="text-[12px] font-bold text-[#17151F] dark:text-[#F8F5FC] truncate">{d.documentNumber}</div>
                      <div className="text-[10px] text-[#6D6879] dark:text-[#A39BB0] truncate">{d.clientName || '—'} • {formatDate(d.issueDate)}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[13px] font-bold text-[#17151F] dark:text-[#F8F5FC]">{formatCurrency(b.total, cur)}</div>
                    <StatusChip d={d} />
                  </div>
                </div>

                {d.type === 'invoice' && d.status !== 'cancelled' && b.balance > 0.004 && (
                  <div className="row" style={{ gap: 6 }}>
                    <span className="text-[10px] text-[#6D6879] dark:text-[#A39BB0]">Paid {formatCurrency(b.paid, cur)} • Balance</span>
                    <span className="text-[10px] font-bold text-[#593C8F] dark:text-[#A8D5BA]">{formatCurrency(b.balance, cur)}</span>
                  </div>
                )}
                {d.convertedFromId && <div className="text-[9px] text-[#6D6879]">Converted from quotation #{d.convertedFromId.slice(0, 8)}</div>}

                <div className="row flex-wrap border-t border-[#EFE9F5] dark:border-[#2D2736] pt-2" style={{ gap: 4 }}>
                  <button type="button" onClick={() => onOpenDocument(d)} className="p-1.5 rounded-lg hover:bg-[#F1ECF8] dark:hover:bg-[#281E36] transition" aria-label="Open in editor" title="Open & edit"><Pencil className="w-3.5 h-3.5 text-[#593C8F] dark:text-[#A8D5BA]" /></button>
                  <button type="button" onClick={() => onDuplicateDocument(d)} className="p-1.5 rounded-lg hover:bg-[#F1ECF8] dark:hover:bg-[#281E36] transition" aria-label="Duplicate as new draft" title="Duplicate"><Copy className="w-3.5 h-3.5 text-[#593C8F] dark:text-[#A8D5BA]" /></button>
                  {(d.type === 'invoice' || d.type === 'proforma') && d.status !== 'cancelled' && (
                    <button type="button" onClick={() => setRecurringSeed(d)} className="p-1.5 rounded-lg hover:bg-[#F1ECF8] dark:hover:bg-[#281E36] transition" aria-label="Make recurring" title="Make recurring"><Repeat className="w-3.5 h-3.5 text-[#593C8F] dark:text-[#A8D5BA]" /></button>
                  )}
                  {(d.type === 'quotation' || d.type === 'estimate') && d.status !== 'converted' && (
                    <button type="button" onClick={() => onConvertDocument(d)} className="p-1.5 rounded-lg hover:bg-[#F1ECF8] dark:hover:bg-[#281E36] transition" aria-label="Convert to invoice" title="Convert to invoice"><ArrowRightLeft className="w-3.5 h-3.5 text-[#593C8F] dark:text-[#A8D5BA]" /></button>
                  )}
                  {d.type === 'invoice' && d.status !== 'cancelled' && (
                    <button type="button" onClick={() => setPaymentDoc(d)} className="p-1.5 rounded-lg hover:bg-[#F1ECF8] dark:hover:bg-[#281E36] transition" aria-label="Record payment" title="Record payment"><Wallet className="w-3.5 h-3.5 text-[#2E7D5B] dark:text-[#6FBF9E]" /></button>
                  )}
                  <button type="button" disabled={busyId === d.id} onClick={() => void handlePDF(d)} className="p-1.5 rounded-lg hover:bg-[#F1ECF8] dark:hover:bg-[#281E36] transition disabled:opacity-40" aria-label="Download PDF" title="Download PDF"><Download className="w-3.5 h-3.5 text-[#593C8F] dark:text-[#A8D5BA]" /></button>
                  <button type="button" onClick={() => void handlePrint(d)} className="p-1.5 rounded-lg hover:bg-[#F1ECF8] dark:hover:bg-[#281E36] transition" aria-label="Print" title="Print"><Printer className="w-3.5 h-3.5 text-[#593C8F] dark:text-[#A8D5BA]" /></button>
                  {d.type === 'invoice' && d.status !== 'cancelled' && (
                    <button type="button" onClick={() => void setDocumentStatus(d.id, 'cancelled').then(() => onShowToast(`${d.documentNumber} cancelled`))} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition" aria-label="Cancel invoice" title="Cancel invoice"><Ban className="w-3.5 h-3.5 text-red-400" /></button>
                  )}
                  <button type="button" onClick={() => setConfirmDelete(d)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition ml-auto" aria-label="Delete document" title="Delete"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150" onClick={() => setConfirmDelete(null)}>
          <div className="bg-[#FAF6EE] dark:bg-[#1B1820] rounded-2xl max-w-sm w-full p-5 space-y-3" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
            <div className="row" style={{ gap: 8 }}><AlertTriangle className="w-5 h-5 text-red-400 shrink-0" /><div className="text-[13px] font-bold text-[#17151F] dark:text-[#F8F5FC]">Delete {confirmDelete.documentNumber}?</div></div>
            <p className="text-[11px] text-[#6D6879] dark:text-[#A39BB0]">
              This permanently removes the saved document and its payment records from this browser. Export a backup first if you might need it.
            </p>
            <div className="row" style={{ gap: 8 }}>
              <button type="button" onClick={() => setConfirmDelete(null)} className="btn o flex-1">Keep it</button>
              <button type="button" onClick={() => { void deleteDocument(confirmDelete.id).then(() => { onShowToast('Document deleted'); setConfirmDelete(null); }); }} className="flex-1 px-3 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[11px] font-bold transition">Delete</button>
            </div>
          </div>
        </div>
      )}

      {hiddenHost(exportDoc)}
      {hiddenHost(printing)}

      {paymentDoc && (
        <PaymentModal
          doc={paymentDoc}
          onClose={() => setPaymentDoc(null)}
          onSave={async (amount, method, date, note) => {
            const v = validatePayment(paymentDoc, amount);
            if (!v.valid) { onShowToast(v.error || 'Invalid payment'); return false; }
            try {
              await addPayment(paymentDoc.id, { date, amount, amountMinor: Math.round(amount * 100), method, note });
              onShowToast(`Recorded ${formatCurrency(amount, paymentDoc.document.currency)}`);
              setPaymentDoc(null);
              return true;
            } catch (err) {
              onShowToast(`Could not save payment: ${err instanceof Error ? err.message : 'error'}`);
              return false;
            }
          }}
          onDeletePayment={async (pid) => { await deletePayment(paymentDoc.id, pid); onShowToast('Payment removed'); }}
        />
      )}
    </div>
  );
};

// ------------------------- payment modal -------------------------

const PaymentModal: React.FC<{
  doc: SavedDocument;
  onClose: () => void;
  onSave: (amount: number, method: PaymentRecord['method'], date: string, note: string) => Promise<boolean>;
  onDeletePayment: (paymentId: string) => Promise<void>;
}> = ({ doc, onClose, onSave, onDeletePayment }) => {
  const b = documentBalance(doc);
  const [amount, setAmount] = useState(String(b.balance.toFixed(2)));
  const [method, setMethod] = useState<PaymentRecord['method']>('upi');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const amt = parseFloat(amount);
    const v = validatePayment(doc, amt);
    if (!v.valid) { setError(v.error || 'Invalid amount'); return; }
    setSaving(true);
    const ok = await onSave(amt, method, date, note);
    setSaving(false);
    if (!ok) setError('Could not save payment');
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 animate-in fade-in duration-150" onClick={onClose}>
      <div className="bg-[#FAF6EE] dark:bg-[#1B1820] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom duration-200" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`Payments for ${doc.documentNumber}`}>
        <div className="row sp sticky top-0 bg-[#FAF6EE] dark:bg-[#1B1820] px-4 py-3 border-b border-[#E7E0EE] dark:border-[#302B38]">
          <div>
            <div className="text-[13px] font-bold text-[#17151F] dark:text-[#F8F5FC]">Payments</div>
            <div className="text-[10px] text-[#6D6879] dark:text-[#A39BB0]">{doc.documentNumber} • Total {formatCurrency(b.total, doc.document.currency)}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"><X className="w-4 h-4 text-[#6D6879]" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="card p-3 row sp">
            <div><div className="text-[9px] uppercase font-bold text-[#6D6879]">Paid</div><div className="text-[13px] font-bold text-[#2E7D5B] dark:text-[#6FBF9E]">{formatCurrency(b.paid, doc.document.currency)}</div></div>
            <div className="text-right"><div className="text-[9px] uppercase font-bold text-[#6D6879]">Remaining</div><div className="text-[13px] font-bold text-[#593C8F] dark:text-[#A8D5BA]">{formatCurrency(b.balance, doc.document.currency)}</div></div>
          </div>

          {doc.payments.length > 0 && (
            <div className="space-y-1.5">
              <div className="lab">Recorded payments</div>
              {doc.payments.map((p) => (
                <div key={p.id} className="card row sp p-2.5">
                  <div>
                    <div className="text-[11px] font-bold text-[#17151F] dark:text-[#F8F5FC]">{formatCurrency(p.amount, doc.document.currency)} <span className="text-[9px] text-[#6D6879] font-normal">via {p.method}</span></div>
                    <div className="text-[9px] text-[#6D6879] dark:text-[#A39BB0]">{p.date}{p.note ? ` • ${p.note}` : ''}</div>
                  </div>
                  <button type="button" onClick={() => void onDeletePayment(p.id)} className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition" aria-label="Remove payment"><Trash2 className="w-3 h-3 text-red-400" /></button>
                </div>
              ))}
            </div>
          )}

          <label className="block"><span className="lab">Payment amount ({doc.document.currency})</span>
            <input type="number" inputMode="decimal" min="0" step="0.01" className={`w-full rounded-xl border bg-white dark:bg-[#17141D] px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-[#593C8F] ${error ? 'border-red-400' : 'border-[#E7E0EE] dark:border-[#302B38]'}`} value={amount} onChange={(e) => { setAmount(e.target.value); setError(null); }} />
            {error && <span className="text-[10px] text-red-500">{error}</span>}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="lab">Method</span>
              <select value={method} onChange={(e) => setMethod(e.target.value as PaymentRecord['method'])} className="w-full rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-3 py-2 text-[12px]">
                {['cash', 'upi', 'bank', 'card', 'cheque', 'other'].map((m) => <option key={m} value={m}>{m.toUpperCase()}</option>)}
              </select>
            </label>
            <label className="block"><span className="lab">Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-3 py-2 text-[12px]" />
            </label>
          </div>
          <label className="block"><span className="lab">Note (optional)</span>
            <input className="w-full rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-3 py-2 text-[12px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="UTR, cheque number…" />
          </label>
        </div>
        <div className="row sticky bottom-0 bg-[#FAF6EE] dark:bg-[#1B1820] px-4 py-3 border-t border-[#E7E0EE] dark:border-[#302B38]" style={{ gap: 8 }}>
          <button type="button" onClick={onClose} className="btn o flex-1">Close</button>
          <button type="button" onClick={() => void save()} disabled={saving} className="btn flex-1 inline-flex items-center justify-center gap-1.5 disabled:opacity-60"><Wallet className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Record payment'}</button>
        </div>
      </div>
    </div>
  );
};
