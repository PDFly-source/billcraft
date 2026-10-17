'use client';

/**
 * Phase 4 — Default Terms & Notes. Edits the EXISTING business-profile
 * defaults (defaultPaymentTerms / defaultFooterNotes) that are copied into
 * new documents at creation time. Saved documents keep their own copies —
 * changing defaults never overwrites an existing document.
 */
import React, { useEffect, useState } from 'react';
import { useLocalData } from '@/hooks/useLocalData';
import { DEFAULT_PROFILE } from '@/lib/db/repository';
import { FileText, StickyNote, Eraser } from 'lucide-react';

export const DefaultTermsCard: React.FC<{ onShowToast: (m: string) => void }> = ({ onShowToast }) => {
  const { profile, saveProfile, refresh } = useLocalData();
  const [terms, setTerms] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmClear, setConfirmClear] = useState<'terms' | 'notes' | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTerms(profile?.defaultPaymentTerms ?? '');
    setNotes(profile?.defaultFooterNotes ?? '');
  }, [profile?.defaultPaymentTerms, profile?.defaultFooterNotes]);

  const save = async (patch: { defaultPaymentTerms?: string; defaultFooterNotes?: string }) => {
    setBusy(true);
    try {
      const base = profile || { ...DEFAULT_PROFILE };
      await saveProfile({ ...base, ...patch });
      await refresh();
      onShowToast('Defaults saved — applied to new documents only');
    } catch {
      onShowToast('Could not save defaults');
    } finally {
      setBusy(false);
      setConfirmClear(null);
    }
  };

  return (
    <div className="card p-3 space-y-3">
      <div className="row" style={{ gap: 6 }}>
        <FileText className="w-4 h-4 text-[#593C8F] dark:text-[#A8D5BA]" />
        <span className="text-[11px] font-bold text-[#17151F] dark:text-[#F8F5FC]">Default terms & notes</span>
      </div>
      <p className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0]">
        These defaults are copied into NEW documents when they are created. Existing documents are never overwritten —
        each document keeps its own editable terms and notes.
      </p>

      <label className="block">
        <span className="lab">Default payment terms (applied to new documents)</span>
        <textarea
          className="w-full rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-2 py-1.5 text-[11px] min-h-[52px]"
          value={terms}
          maxLength={600}
          onChange={(e) => setTerms(e.target.value)}
          placeholder="e.g. Payment due within 15 days"
          aria-label="Default payment terms"
        />
        {terms.trim() && (
          <div className="mt-1 rounded-lg bg-[#F6F2FA] dark:bg-[#241D31] p-2 text-[9.5px] text-[#17151F] dark:text-[#F8F5FC] italic">
            Preview: “{terms.trim()}”
          </div>
        )}
        <div className="row sp mt-1">
          <span className="text-[9px] text-[#6D6879] dark:text-[#A39BB0]">{terms.length}/600</span>
          <div className="row" style={{ gap: 6 }}>
            {terms.trim() && (
              <button type="button" className="text-[9px] font-bold text-red-500 hover:underline" onClick={() => setConfirmClear('terms')}>
                <Eraser className="w-3 h-3 inline" /> Clear
              </button>
            )}
            <button type="button" className="btn shrink-0" style={{ fontSize: 10, padding: '4px 10px' }} disabled={busy} onClick={() => void save({ defaultPaymentTerms: terms.trim() })}>
              Save terms
            </button>
          </div>
        </div>
        {confirmClear === 'terms' && (
          <div className="mt-1.5 rounded-xl border border-red-200 dark:border-red-900 p-2 row sp" role="alertdialog" aria-label="Clear default terms?">
            <span className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0]">Clear the default terms? New documents will start empty. Existing documents keep theirs.</span>
            <div className="row shrink-0" style={{ gap: 4 }}>
              <button type="button" className="btn o" style={{ fontSize: 9, padding: '3px 8px' }} onClick={() => setConfirmClear(null)}>Cancel</button>
              <button type="button" className="px-2 py-1 rounded-lg bg-red-500 text-white text-[9px] font-bold" onClick={() => { setTerms(''); void save({ defaultPaymentTerms: '' }); }}>Clear</button>
            </div>
          </div>
        )}
      </label>

      <label className="block">
        <span className="lab">Default invoice notes / footer</span>
        <textarea
          className="w-full rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-2 py-1.5 text-[11px] min-h-[52px]"
          value={notes}
          maxLength={600}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Thank you for your business!"
          aria-label="Default invoice notes"
        />
        {notes.trim() && (
          <div className="mt-1 rounded-lg bg-[#F6F2FA] dark:bg-[#241D31] p-2 text-[9.5px] text-[#17151F] dark:text-[#F8F5FC] italic">
            Preview: “{notes.trim()}”
          </div>
        )}
        <div className="row sp mt-1">
          <span className="text-[9px] text-[#6D6879] dark:text-[#A39BB0]">{notes.length}/600</span>
          <div className="row" style={{ gap: 6 }}>
            {notes.trim() && (
              <button type="button" className="text-[9px] font-bold text-red-500 hover:underline" onClick={() => setConfirmClear('notes')}>
                <Eraser className="w-3 h-3 inline" /> Clear
              </button>
            )}
            <button type="button" className="btn shrink-0" style={{ fontSize: 10, padding: '4px 10px' }} disabled={busy} onClick={() => void save({ defaultFooterNotes: notes.trim() })}>
              <StickyNote className="w-3 h-3" /> Save notes
            </button>
          </div>
        </div>
        {confirmClear === 'notes' && (
          <div className="mt-1.5 rounded-xl border border-red-200 dark:border-red-900 p-2 row sp" role="alertdialog" aria-label="Clear default notes?">
            <span className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0]">Clear the default notes? New documents will start empty. Existing documents keep theirs.</span>
            <div className="row shrink-0" style={{ gap: 4 }}>
              <button type="button" className="btn o" style={{ fontSize: 9, padding: '3px 8px' }} onClick={() => setConfirmClear(null)}>Cancel</button>
              <button type="button" className="px-2 py-1 rounded-lg bg-red-500 text-white text-[9px] font-bold" onClick={() => { setNotes(''); void save({ defaultFooterNotes: '' }); }}>Clear</button>
            </div>
          </div>
        )}
      </label>
    </div>
  );
};
