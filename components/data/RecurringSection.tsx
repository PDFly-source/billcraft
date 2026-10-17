'use client';

/**
 * Phase 4 recurring invoices: series list + one-click generation.
 * A series stores an immutable template snapshot — generating never edits a
 * historical document, and editing history never changes the template.
 * Reminders are local: History shows due badges and the app can fire a
 * Web Notification (only if the user already granted permission).
 */
import React, { useMemo, useState } from 'react';
import { useLocalData } from '@/hooks/useLocalData';
import { SavedDocument, RecurringSeriesRecord } from '@/types/local';
import {
  isDue, nextPeriodDate, suggestFirstDue, toYmd, FREQUENCY_LABEL, Frequency,
} from '@/lib/recurring';
import { formatCurrency } from '@/lib/currency';
import { calculateDocument } from '@/lib/calculations';
import { Repeat, Plus, RefreshCw, Pause, Play, Trash2, X, CalendarClock, Check } from 'lucide-react';
import { formatDate } from '@/lib/format';

interface RecurringSectionProps {
  onShowToast: (m: string) => void;
  /** A document chosen via the item-level "Make recurring" action. */
  seedDoc: SavedDocument | null;
  onSeedConsumed: () => void;
}

const inputCls =
  'w-full rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-2 py-1.5 text-[11px] text-[#17151F] dark:text-[#F8F5FC] outline-none focus:border-[#593C8F] dark:focus:border-[#A8D5BA]';

export const RecurringSection: React.FC<RecurringSectionProps> = ({
  onShowToast, seedDoc, onSeedConsumed,
}) => {
  const { recurring, ready, documents, saveRecurring, deleteRecurring, generateSeries } = useLocalData();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<RecurringSeriesRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const today = toYmd(new Date());

  // ---- creation form state ----
  const sourceOptions = useMemo(
    () => documents.filter((d) => (d.type === 'invoice' || d.type === 'proforma') && d.status !== 'cancelled'),
    [documents],
  );
  const [sourceId, setSourceId] = useState('');
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [firstDue, setFirstDue] = useState('');

  React.useEffect(() => {
    if (seedDoc) {
      setSourceId(seedDoc.id);
      setName(`${seedDoc.clientName || 'Recurring'} — ${FREQUENCY_LABEL.monthly}`);
      setFrequency('monthly');
      setFirstDue(suggestFirstDue());
      setModalOpen(true);
      onSeedConsumed();
    }
  }, [seedDoc, onSeedConsumed]);

  const openBlank = () => {
    const first = sourceOptions[0];
    setSourceId(first?.id || '');
    setName(first ? `${first.clientName || 'Recurring'} — ${FREQUENCY_LABEL.monthly}` : '');
    setFrequency('monthly');
    setFirstDue(suggestFirstDue());
    setModalOpen(true);
  };

  const canSave = !!sourceId && sourceOptions.some((d) => d.id === sourceId) && !!firstDue;

  const handleCreate = async () => {
    if (!canSave) return;
    const src = sourceOptions.find((d) => d.id === sourceId)!;
    await saveRecurring({
      name: name.trim() || `${src.clientName} — ${FREQUENCY_LABEL[frequency]}`,
      frequency,
      nextDueDate: firstDue,
      active: true,
      type: 'invoice',
      // immutable template snapshot — later edits to this document or to
      // the client record never change the series
      document: src.document,
      clientId: src.clientId,
    });
    setModalOpen(false);
    onShowToast(`Recurring series saved — next on ${firstDue}`);
  };

  const handleGenerate = async (s: RecurringSeriesRecord) => {
    if (busyId) return;
    setBusyId(s.id);
    try {
      const saved = await generateSeries(s.id);
      if (saved) onShowToast(`Generated ${saved.documentNumber} (${formatCurrency(saved.calc.grandTotal)}) — saved to History`);
      else onShowToast('Series is paused — resume it first');
    } catch (err) {
      onShowToast(`Generation failed: ${err instanceof Error ? err.message : 'error'}`);
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = (s: RecurringSeriesRecord) => {
    void saveRecurring({ id: s.id, active: !s.active })
      .then(() => onShowToast(s.active ? 'Series paused' : 'Series resumed'));
  };

  const dueCount = recurring.filter((s) => isDue(s, today)).length;

  return (
    <div className="card p-3" data-testid="recurring-section">
      <div className="row items-center justify-between">
        <div className="row" style={{ gap: 6 }}>
          <span className="w-5 h-5 rounded-lg row inline-flex justify-center items-center text-[#593C8F] dark:text-[#A8D5BA] bg-[#593C8F]/8"><Repeat className="w-3 h-3" /></span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-[#6D6879] dark:text-[#A39BB0]">Recurring Invoices</span>
        </div>
        <button type="button" onClick={openBlank} className="btn px-2 py-1 inline-flex items-center gap-1 text-[10px] font-bold bg-[#593C8F] text-white rounded-lg">
          <Plus className="w-3 h-3" /> New series
        </button>
      </div>

      {dueCount > 0 && (
        <div className="mt-2 rounded-lg bg-[#F0B83A]/15 px-2 py-1.5 text-[10px] font-bold text-[#B07C1E] dark:text-[#F0B83A] flex items-center gap-1.5">
          <CalendarClock className="w-3 h-3" /> {dueCount} series {dueCount === 1 ? 'is' : 'are'} due — generate below
        </div>
      )}

      {!ready ? null : recurring.length === 0 ? (
        <p className="mt-2 text-[10.5px] text-[#6D6879] dark:text-[#A39BB0]">
          No recurring series yet. Create one from any saved invoice — BillCraft reminds you locally when it&apos;s due. No servers involved.
        </p>
      ) : (
        <div className="mt-2 space-y-1.5">
          {recurring.map((s) => {
            const due = isDue(s, today);
            return (
              <div key={s.id} className="rounded-xl border border-[#EFE9F5] dark:border-[#2D2736] p-2">
                <div className="row items-center justify-between" style={{ gap: 6 }}>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-[#17151F] dark:text-[#F8F5FC] truncate">{s.name}</p>
                    <p className="text-[9px] text-[#6D6879] dark:text-[#A39BB0]">
                      {FREQUENCY_LABEL[s.frequency]} · next {formatDate(s.nextDueDate) || '—'}
                      {s.lastGeneratedDate && ` · last ${s.lastGeneratedDate}`}
                      {s.document.items?.length ? ` · ${s.document.items.length} item${s.document.items.length === 1 ? '' : 's'}` : ''}
                      {' · '}
                      {formatCurrency(calculateDocument(s.document).grandTotal, s.document.currency)}
                    </p>
                  </div>
                  <div className="row shrink-0" style={{ gap: 3 }}>
                    {due && <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase bg-[#F0B83A]/20 text-[#B07C1E] dark:text-[#F0B83A]">Due</span>}
                    {!s.active && <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase bg-[#EFE9F5] dark:bg-[#2D2736] text-[#6D6879] dark:text-[#A39BB0]">Paused</span>}
                    <button
                      type="button"
                      disabled={busyId === s.id}
                      onClick={() => void handleGenerate(s)}
                      title="Generate next invoice now (saved straight to History)"
                      aria-label={`Generate invoice for ${s.name}`}
                      className="p-1.5 rounded-lg hover:bg-[#F1ECF8] dark:hover:bg-[#281E36] transition disabled:opacity-40"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-[#593C8F] dark:text-[#A8D5BA] ${busyId === s.id ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(s)}
                      title={s.active ? 'Pause series' : 'Resume series'}
                      aria-label={s.active ? `Pause ${s.name}` : `Resume ${s.name}`}
                      className="p-1.5 rounded-lg hover:bg-[#F1ECF8] dark:hover:bg-[#281E36] transition"
                    >
                      {s.active
                        ? <Pause className="w-3.5 h-3.5 text-[#6D6879] dark:text-[#A39BB0]" />
                        : <Play className="w-3.5 h-3.5 text-[#2E7D5B] dark:text-[#6FBF9E]" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(s)}
                      title="Delete series (generated documents stay)"
                      aria-label={`Delete series ${s.name}`}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---- create modal ---- */}
      {modalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="New recurring series">
          <div className="card w-full max-w-[380px] p-4">
            <div className="row items-center justify-between">
              <b className="text-[13px] text-[#17151F] dark:text-[#F8F5FC]">New recurring series</b>
              <button type="button" onClick={() => setModalOpen(false)} aria-label="Close" className="p-1 rounded-lg hover:bg-[#F1ECF8] dark:hover:bg-[#281E36]"><X className="w-4 h-4 text-[#6D6879] dark:text-[#A39BB0]" /></button>
            </div>

            {sourceOptions.length === 0 ? (
              <p className="mt-3 text-[11px] text-[#6D6879] dark:text-[#A39BB0]">
                Save an invoice to History first — its snapshot becomes the template.
              </p>
            ) : (
              <div className="mt-3 space-y-2.5">
                <label className="block">
                  <span className="lab">Template document</span>
                  <select value={sourceId} onChange={(e) => {
                    setSourceId(e.target.value);
                    const d = sourceOptions.find((x) => x.id === e.target.value);
                    if (d) setName(`${d.clientName || 'Recurring'} — ${FREQUENCY_LABEL[frequency]}`);
                  }} className={inputCls} aria-label="Template document">
                    {sourceOptions.map((d) => (
                      <option key={d.id} value={d.id}>{d.documentNumber} · {d.clientName || 'No client'}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="lab">Series name</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} maxLength={60} placeholder="e.g. Acme monthly retainer" />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="lab">Frequency</span>
                    <select value={frequency} onChange={(e) => {
                      const f = e.target.value as Frequency;
                      setFrequency(f);
                      const d = sourceOptions.find((x) => x.id === sourceId);
                      if (d) setName(`${d.clientName || 'Recurring'} — ${FREQUENCY_LABEL[f]}`);
                    }} className={inputCls} aria-label="Frequency">
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="lab">First due date</span>
                    <input type="date" value={firstDue} onChange={(e) => setFirstDue(e.target.value)} className={inputCls} aria-label="First due date" />
                  </label>
                </div>
                <p className="text-[9px] text-[#6D6879] dark:text-[#A39BB0]">
                  The document&apos;s current content is copied as an immutable template — future edits stay separate. You can generate the next invoice any time; BillCraft only reminds you locally.
                </p>
                <button
                  type="button"
                  disabled={!canSave}
                  onClick={() => void handleCreate()}
                  className="w-full btn px-3 py-2 inline-flex items-center justify-center gap-1.5 text-[11px] font-bold bg-[#593C8F] text-white rounded-xl disabled:opacity-40"
                >
                  <Check className="w-3.5 h-3.5" /> Save series
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- delete confirm ---- */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Delete recurring series">
          <div className="card w-full max-w-[340px] p-4">
            <b className="text-[13px] text-[#17151F] dark:text-[#F8F5FC]">Delete “{confirmDelete.name}”?</b>
            <p className="mt-1.5 text-[11px] text-[#6D6879] dark:text-[#A39BB0]">
              The series stops, but every invoice it already generated stays in History untouched.
            </p>
            <div className="mt-3 row justify-end" style={{ gap: 6 }}>
              <button type="button" onClick={() => setConfirmDelete(null)} className="btn o px-3 py-1.5 text-[11px]">Keep</button>
              <button
                type="button"
                onClick={() => { void deleteRecurring(confirmDelete.id).then(() => { setConfirmDelete(null); onShowToast('Series deleted'); }); }}
                className="btn px-3 py-1.5 text-[11px] font-bold bg-red-500 text-white rounded-lg"
              >
                Delete series
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
