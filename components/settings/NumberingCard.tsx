'use client';

/**
 * Phase 4 — Invoice numbering preferences: prefix, next sequence number,
 * automatic increment toggle, optional padding, live preview of the next
 * identifier. Reuses the existing numbering implementation (profile prefixes +
 * per-type counters in IndexedDB); saved documents are never renumbered.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useLocalData } from '@/hooks/useLocalData';
import {
  getNumberingPrefs, saveNumberingPrefs, peekNextDocumentNumber,
  setNextSequenceNumber, DEFAULT_PROFILE,
} from '@/lib/db/repository';
import { Hash, Eye, RefreshCw } from 'lucide-react';

const PREFIX_RE = /^[A-Za-z0-9-]{0,12}$/;

export const NumberingCard: React.FC<{ onShowToast: (m: string) => void }> = ({ onShowToast }) => {
  const { profile, saveProfile, documents, refresh } = useLocalData();
  const [prefix, setPrefix] = useState(profile?.invoicePrefix ?? 'INV');
  const [nextNum, setNextNum] = useState('1');
  const [prefs, setPrefs] = useState<{ padding: number; autoIncrement: boolean } | null>(null);
  const [preview, setPreview] = useState('…');
  const [busy, setBusy] = useState(false);

  // load prefs + honest next-number state
  const reload = useCallback(async () => {
    const p = await getNumberingPrefs();
    setPrefs(p);
    const parts = (await peekNextDocumentNumber('invoice')).match(/^(.*)-(\d{4})-(\d+)$/);
    if (parts) setNextNum(parts[3].replace(/^0+/, '') || '0');
    setPreview(await peekNextDocumentNumber('invoice'));
  }, []);

  useEffect(() => {
    setPrefix(profile?.invoicePrefix ?? 'INV');
    void reload();
  }, [profile?.invoicePrefix, reload]);

  // preview follows any prefix edit immediately (no persistence yet)
  useEffect(() => {
    const year = new Date().getFullYear();
    const seq = nextNum || '1';
    setPreview(`${(prefix || 'INV')}-${year}-${seq.padStart(prefs?.padding ?? 4, '0')}`);
  }, [prefix, nextNum, prefs?.padding]);

  const savePrefix = async () => {
    const clean = prefix.trim();
    if (!PREFIX_RE.test(clean)) {
      onShowToast('Prefix: up to 12 letters, digits or dashes only');
      return;
    }
    setBusy(true);
    try {
      const base = profile || { ...DEFAULT_PROFILE };
      await saveProfile({ ...base, invoicePrefix: clean || 'INV' });
      await refresh();
      onShowToast(`Invoice prefix: ${clean || 'INV'}`);
    } catch {
      onShowToast('Could not save prefix');
    } finally {
      setBusy(false);
    }
  };

  const saveNextNumber = async () => {
    const n = parseInt(nextNum, 10);
    if (!Number.isFinite(n) || String(n).length > 8 || n < 1) {
      onShowToast('Next number must be a whole number (1-99999999)');
      return;
    }
    setBusy(true);
    try {
      await setNextSequenceNumber('invoice', n);
      await reload();
      onShowToast(`Next invoice will be ${await peekNextDocumentNumber('invoice')}`);
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'Could not set next number');
    } finally {
      setBusy(false);
    }
  };

  const toggleAutoIncrement = async (v: boolean) => {
    const next = { padding: prefs?.padding ?? 4, autoIncrement: v };
    setPrefs(next);
    try {
      await saveNumberingPrefs(next);
      onShowToast(v ? 'Automatic numbering on' : 'Automatic numbering off — you type each number');
    } catch {
      onShowToast('Could not save preference');
    }
  };

  const savePadding = async (v: number) => {
    const next = { padding: v, autoIncrement: prefs?.autoIncrement ?? true };
    setPrefs(next);
    try { await saveNumberingPrefs(next); } catch { onShowToast('Could not save padding'); }
  };

  return (
    <div className="space-y-3">
      <div className="card p-3 space-y-2.5">
        <div className="row" style={{ gap: 6 }}>
          <Hash className="w-4 h-4 text-[#593C8F] dark:text-[#A8D5BA]" />
          <span className="text-[11px] font-bold text-[#17151F] dark:text-[#F8F5FC]">Invoice numbering</span>
        </div>
        <p className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0]">
          New documents are numbered {`{prefix}-{year}-{sequence}`}. Saved invoices are never renumbered automatically. Duplicate
          numbers are blocked at creation and at save time. BillCraft is local-first, so numbers are unique on this device — there is
          no central server to guarantee cross-device uniqueness.
        </p>

        <label className="block">
          <span className="lab">Invoice prefix</span>
          <div className="row" style={{ gap: 6 }}>
            <input
              className="flex-1 rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-2 py-1.5 text-[11px] font-mono"
              value={prefix}
              maxLength={12}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="INV"
              aria-label="Invoice prefix"
            />
            <button type="button" className="btn shrink-0" disabled={busy} onClick={() => void savePrefix()}>Save</button>
          </div>
        </label>

        <label className="block">
          <span className="lab">Next sequence number</span>
          <div className="row" style={{ gap: 6 }}>
            <input
              className="flex-1 rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-2 py-1.5 text-[11px]"
              inputMode="numeric"
              value={nextNum}
              onChange={(e) => setNextNum(e.target.value.replace(/\D/g, ''))}
              aria-label="Next sequence number"
            />
            <button type="button" className="btn shrink-0" disabled={busy} onClick={() => void saveNextNumber()}>Set</button>
          </div>
          <span className="text-[9px] text-[#6D6879] dark:text-[#A39BB0]">Affects only the NEXT document — history stays untouched.</span>
        </label>

        <label className="row sp">
          <span className="text-[10px] text-[#6D6879] dark:text-[#A39BB0]">Number new documents automatically</span>
          <input
            type="checkbox"
            checked={prefs?.autoIncrement ?? true}
            onChange={(e) => void toggleAutoIncrement(e.target.checked)}
            aria-label="Number new documents automatically"
          />
        </label>

        <label className="block">
          <span className="lab">Sequence padding</span>
          <select
            className="w-full rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-2 py-1.5 text-[11px]"
            value={prefs?.padding ?? 4}
            onChange={(e) => void savePadding(parseInt(e.target.value, 10))}
            aria-label="Sequence padding"
          >
            {[3, 4, 5, 6].map((p) => <option key={p} value={p}>{p} digits ({'0'.repeat(Math.max(0, p - 1))}…7)</option>)}
          </select>
        </label>

        <div className="rounded-xl bg-[#F6F2FA] dark:bg-[#241D31] p-2.5 row sp">
          <div className="row" style={{ gap: 6 }}>
            <Eye className="w-3.5 h-3.5 text-[#593C8F] dark:text-[#A8D5BA]" />
            <span className="text-[10px] font-bold text-[#17151F] dark:text-[#F8F5FC]">Next invoice will be</span>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <span className="text-[11px] font-mono font-bold text-[#593C8F] dark:text-[#A8D5BA]" data-testid="next-number-preview">{preview}</span>
            <button type="button" className="text-[#6D6879]" aria-label="Refresh preview" onClick={() => void reload()}><RefreshCw className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        <p className="text-[9px] text-[#6D6879] dark:text-[#A39BB0]">
          {documents.length} saved document{documents.length === 1 ? '' : 's'} keep their existing numbers. Quotation, receipt and other
          document types continue their own sequences in the editor.
        </p>
      </div>
    </div>
  );
};
