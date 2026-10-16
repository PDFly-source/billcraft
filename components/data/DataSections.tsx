'use client';

/**
 * Settings > Backup & Restore (Feature 5) and Data Management (Feature 13)
 * plus the local-data privacy notice (Feature 7).
 */
import React, { useRef, useState } from 'react';
import { useLocalData } from '@/hooks/useLocalData';
import {
  exportBackupToFile, readBackupFile, previewRestore, applyRestore,
  validateBackup, getPreRestoreBackup, type RestoreReport, type ValidationResult,
} from '@/lib/backup';
import { BillCraftBackup, RestorePreview } from '@/types/local';
import {
  Download, Upload, ShieldAlert, AlertTriangle, Check, X, Database,
  HardDrive, Trash2, RotateCcw, FileJson,
} from 'lucide-react';

const fmtBytes = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : b > 1024 ? `${(b / 1024).toFixed(1)} KB` : `${b} B`);

export const BackupRestoreSection: React.FC<{ onShowToast: (m: string) => void }> = ({ onShowToast }) => {
  const { refresh, counts } = useLocalData();
  const [exporting, setExporting] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ backup: BillCraftBackup; preview: RestorePreview; file: File } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [confirmText, setConfirmText] = useState('');
  const [applying, setApplying] = useState(false);
  const [report, setReport] = useState<RestoreReport | null>(null);
  const [restoringSnapshot, setRestoringSnapshot] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    setLastResult(null);
    try {
      const { filename, bytes } = await exportBackupToFile();
      setLastResult(`✔ Backup downloaded: ${filename} (${fmtBytes(bytes)})`);
      onShowToast(`Backup downloaded (${fmtBytes(bytes)})`);
    } catch (err) {
      const msg = `Backup failed: ${err instanceof Error ? err.message : 'unknown error'}`;
      setLastResult(`✘ ${msg}`);
      onShowToast(msg);
    } finally {
      setExporting(false);
      await refresh();
    }
  };

  const handleFileChosen = async (file: File | undefined) => {
    if (!file) return;
    setValidationError(null);
    setReport(null);
    const result: ValidationResult = await readBackupFile(file);
    if (!result.ok) {
      setValidationError(result.error);
      onShowToast('Backup file rejected — see details');
      return;
    }
    try {
      const preview = await previewRestore(result.backup);
      setPending({ backup: result.backup, preview, file });
      setMode('merge');
      setConfirmText('');
    } catch (err) {
      setValidationError(`Could not prepare restore: ${err instanceof Error ? err.message : 'error'}`);
    }
  };

  const handleApply = async () => {
    if (!pending) return;
    if (mode === 'replace' && confirmText.trim().toUpperCase() !== 'REPLACE') {
      onShowToast('Type REPLACE to confirm destructive restore');
      return;
    }
    setApplying(true);
    try {
      const rep = await applyRestore(pending.backup, mode);
      setReport(rep);
      setPending(null);
      await refresh();
      onShowToast(
        mode === 'merge'
          ? `Restore complete — ${rep.documents.added} new, ${rep.documents.updated} updated, ${rep.documents.keptLocal} kept local`
          : 'Replace restore complete — previous data saved as recovery snapshot',
      );
    } catch (err) {
      onShowToast(`Restore failed and was rolled back: ${err instanceof Error ? err.message : 'error'}`);
    } finally {
      setApplying(false);
    }
  };

  const handleRecoverSnapshot = async () => {
    setRestoringSnapshot(true);
    try {
      const snap = await getPreRestoreBackup();
      if (!snap) { onShowToast('No recovery snapshot found'); return; }
      const parsed = JSON.parse(snap.json) as unknown;
      const v = validateBackup(parsed);
      if (!v.ok) { onShowToast('Recovery snapshot is damaged'); return; }
      const rep = await applyRestore(v.backup, 'replace');
      setReport(rep);
      await refresh();
      onShowToast('Recovery snapshot restored');
    } catch (err) {
      onShowToast(`Recovery failed: ${err instanceof Error ? err.message : 'error'}`);
    } finally {
      setRestoringSnapshot(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="card p-3 space-y-2">
        <div className="row" style={{ gap: 6 }}>
          <Download className="w-4 h-4 text-[#593C8F] dark:text-[#A8D5BA]" />
          <span className="text-[11px] font-bold text-[#17151F] dark:text-[#F8F5FC]">Export backup</span>
        </div>
        <p className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0]">
          Downloads ALL your data — profile, clients, products, documents with payments and snapshots, images and preferences — as one portable JSON file. Keep it somewhere safe.
        </p>
        <button type="button" onClick={() => void handleExport()} disabled={exporting} className="btn w-full justify-center inline-flex items-center gap-1.5 disabled:opacity-60">
          <FileJson className="w-3.5 h-3.5" /> {exporting ? 'Preparing backup…' : 'Download backup (JSON)'}
        </button>
        {lastResult && <div className={`text-[9.5px] ${lastResult.startsWith('✔') ? 'text-[#2E7D5B] dark:text-[#6FBF9E]' : 'text-red-500'}`}>{lastResult}</div>}
      </div>

      <div className="card p-3 space-y-2">
        <div className="row" style={{ gap: 6 }}>
          <Upload className="w-4 h-4 text-[#593C8F] dark:text-[#A8D5BA]" />
          <span className="text-[11px] font-bold text-[#17151F] dark:text-[#F8F5FC]">Restore backup</span>
        </div>
        <p className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0]">
          Import a BillCraft backup file. It is validated first; you preview exactly what will change before anything is written.
        </p>
        <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" aria-label="Choose backup file" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; void handleFileChosen(f); }} />
        <button type="button" onClick={() => fileInput.current?.click()} className="btn o w-full justify-center inline-flex items-center gap-1.5">
          <Upload className="w-3.5 h-3.5" /> Choose backup file…
        </button>
        {validationError && (
          <div className="row items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-2.5">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <div className="text-[10.5px] font-bold text-red-600 dark:text-red-400">File rejected</div>
              <div className="text-[9.5px] text-red-700 dark:text-red-300">{validationError}</div>
            </div>
          </div>
        )}
      </div>

      {report && (
        <div className="card p-3 space-y-1.5 animate-in fade-in duration-200">
          <div className="row" style={{ gap: 6 }}><Check className="w-4 h-4 text-[#2E7D5B] dark:text-[#6FBF9E]" /><span className="text-[11px] font-bold text-[#17151F] dark:text-[#F8F5FC]">Restore report ({report.mode})</span></div>
          <div className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0] leading-relaxed">
            Clients: {report.clients.added} added, {report.clients.updated} updated, {report.clients.keptLocal} kept local → {report.verification.clients} saved<br />
            Products: {report.products.added} added, {report.products.updated} updated, {report.products.keptLocal} kept local → {report.verification.products} saved<br />
            Documents: {report.documents.added} added, {report.documents.updated} updated, {report.documents.keptLocal} kept local → {report.verification.documents} saved<br />
            Images: {report.images.total} • Business profile: {report.profileApplied ? 'applied' : 'not in backup'}
            {report.preRestoreBackup?.created ? ' • Recovery snapshot of your previous data was saved' : ''}
          </div>
        </div>
      )}

      {pending && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 animate-in fade-in duration-150" onClick={() => !applying && setPending(null)}>
          <div className="bg-[#FAF6EE] dark:bg-[#1B1820] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom duration-200" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Restore backup">
            <div className="row sp sticky top-0 bg-[#FAF6EE] dark:bg-[#1B1820] px-4 py-3 border-b border-[#E7E0EE] dark:border-[#302B38]">
              <div className="text-[13px] font-bold text-[#17151F] dark:text-[#F8F5FC]">Review restore</div>
              <button type="button" onClick={() => setPending(null)} disabled={applying} aria-label="Cancel"><X className="w-4 h-4 text-[#6D6879]" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="card p-3 space-y-1 text-[10px] text-[#6D6879] dark:text-[#A39BB0]">
                <div className="row sp"><span>File</span><span className="font-mono text-[#17151F] dark:text-[#F8F5FC] truncate max-w-[200px]">{pending.file.name}</span></div>
                <div className="row sp"><span>Exported</span><span>{new Date(pending.preview.exportedAt).toLocaleString()}</span></div>
                <div className="row sp"><span>Schema</span><span>v{pending.preview.schemaVersion}</span></div>
                <div className="row sp"><span>Size</span><span>{fmtBytes(pending.file.size)}</span></div>
                <div className="row sp"><span>Contents</span><span>{pending.preview.counts.clients} clients • {pending.preview.counts.products} products • {pending.preview.counts.documents} documents • {pending.preview.counts.images} images</span></div>
              </div>

              <div className="text-[10.5px] font-bold text-[#17151F] dark:text-[#F8F5FC]">Merge result preview</div>
              <div className="card p-3 text-[9.5px] text-[#6D6879] dark:text-[#A39BB0] space-y-1">
                <div>Clients: <b className="text-[#17151F] dark:text-[#F8F5FC]">+{pending.preview.mergeSummary.clients.added}</b> new, <b className="text-[#17151F] dark:text-[#F8F5FC]">↻{pending.preview.mergeSummary.clients.updated}</b> newer import wins, <b className="text-[#17151F] dark:text-[#F8F5FC]">={pending.preview.mergeSummary.clients.keptLocal}</b> kept local</div>
                <div>Products: <b className="text-[#17151F] dark:text-[#F8F5FC]">+{pending.preview.mergeSummary.products.added}</b> new, <b className="text-[#17151F] dark:text-[#F8F5FC]">↻{pending.preview.mergeSummary.products.updated}</b>, <b className="text-[#17151F] dark:text-[#F8F5FC]">={pending.preview.mergeSummary.products.keptLocal}</b> kept</div>
                <div>Documents: <b className="text-[#17151F] dark:text-[#F8F5FC]">+{pending.preview.mergeSummary.documents.added}</b> new, <b className="text-[#17151F] dark:text-[#F8F5FC]">↻{pending.preview.mergeSummary.documents.updated}</b>, <b className="text-[#17151F] dark:text-[#F8F5FC]">={pending.preview.mergeSummary.documents.keptLocal}</b> kept</div>
                <div className="text-[8.5px] pt-1">Merge rule: for the same ID, the record with the newer last-edited time wins (ties favor the import). Nothing is deleted.</div>
              </div>

              <div className="text-[10.5px] font-bold text-[#17151F] dark:text-[#F8F5FC]">Choose restore mode</div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setMode('merge')} className={`p-2.5 rounded-xl border text-left transition ${mode === 'merge' ? 'border-[#593C8F] bg-[#F1ECF8] dark:bg-[#281E36]' : 'border-[#E7E0EE] dark:border-[#302B38]'}`}>
                  <div className="text-[10.5px] font-bold text-[#17151F] dark:text-[#F8F5FC]">Merge</div>
                  <div className="text-[9px] text-[#6D6879] dark:text-[#A39BB0]">Union of both datasets. Conflicts resolved by last-edited time. Safe.</div>
                </button>
                <button type="button" onClick={() => setMode('replace')} className={`p-2.5 rounded-xl border text-left transition ${mode === 'replace' ? 'border-red-400 bg-red-50 dark:bg-red-950/30' : 'border-[#E7E0EE] dark:border-[#302B38]'}`}>
                  <div className="text-[10.5px] font-bold text-red-600 dark:text-red-400">Replace</div>
                  <div className="text-[9px] text-[#6D6879] dark:text-[#A39BB0]">DELETES all current local data first, then imports the backup. A recovery snapshot is saved.</div>
                </button>
              </div>

              {mode === 'replace' && (
                <div className="space-y-2 animate-in fade-in duration-150">
                  <div className="row items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-2.5">
                    <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div className="text-[9.5px] text-red-700 dark:text-red-300">
                      This overwrites your ENTIRE local dataset: {counts?.clients ?? '?'} clients, {counts?.products ?? '?'} products, {counts?.documents ?? '?'} documents and images.
                      A recovery snapshot of your current data is saved inside BillCraft — you can restore it from this screen after the import.
                    </div>
                  </div>
                  <label className="block">
                    <span className="lab">Type REPLACE to confirm</span>
                    <input className="w-full rounded-xl border border-red-300 dark:border-red-800 bg-white dark:bg-[#17141D] px-3 py-2 text-[12px] outline-none" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="REPLACE" />
                  </label>
                </div>
              )}
            </div>
            <div className="row sticky bottom-0 bg-[#FAF6EE] dark:bg-[#1B1820] px-4 py-3 border-t border-[#E7E0EE] dark:border-[#302B38]" style={{ gap: 8 }}>
              <button type="button" onClick={() => setPending(null)} disabled={applying} className="btn o flex-1">Cancel</button>
              <button type="button" onClick={() => void handleApply()} disabled={applying} className="btn flex-1 inline-flex items-center justify-center gap-1.5 disabled:opacity-60"><Upload className="w-3.5 h-3.5" /> {applying ? 'Restoring…' : mode === 'merge' ? 'Merge backup' : 'Replace all data'}</button>
            </div>
          </div>
        </div>
      )}

      <div className="card p-3 row sp items-center">
        <div className="row" style={{ gap: 6 }}>
          <RotateCcw className="w-3.5 h-3.5 text-[#6D6879]" />
          <div>
            <div className="text-[10px] font-bold text-[#17151F] dark:text-[#F8F5FC]">Recovery snapshot</div>
            <div className="text-[9px] text-[#6D6879] dark:text-[#A39BB0]">Undoes the last replace-restore</div>
          </div>
        </div>
        <button type="button" onClick={() => void handleRecoverSnapshot()} disabled={restoringSnapshot} className="btn o shrink-0 disabled:opacity-60">{restoringSnapshot ? '…' : 'Restore'}</button>
      </div>
    </div>
  );
};

// ---------------- Data Management ----------------

export const DataManagementSection: React.FC<{ onShowToast: (m: string) => void }> = ({ onShowToast }) => {
  const { counts, storage, clearCategory, clearAllData, refresh } = useLocalData();
  const [confirmCat, setConfirmCat] = useState<'clients' | 'products' | 'documents' | 'images' | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);

  const CAT_LABEL = { clients: 'All clients', products: 'All products & services', documents: 'All saved documents & payments', images: 'All images (logos, signatures)' };
  const CAT_CONSEQ = {
    clients: 'Every client record will be removed from this browser. Saved documents keep their own copies of client details.',
    products: 'The whole catalogue will be removed from this browser. Saved documents keep their own line items.',
    documents: 'Every saved document, its payments and totals will be permanently deleted from this browser. This cannot be undone — export a backup first.',
    images: 'Stored logo and signature images will be deleted. Documents already issued keep their own snapshots.',
  };

  const doClearCat = async () => {
    if (!confirmCat) return;
    setBusy(true);
    try {
      await clearCategory(confirmCat);
      await refresh();
      onShowToast(`${CAT_LABEL[confirmCat]} deleted`);
    } catch (err) {
      onShowToast(`Failed: ${err instanceof Error ? err.message : 'error'}`);
    } finally {
      setBusy(false);
      setConfirmCat(null);
    }
  };

  const doClearAll = async () => {
    setBusy(true);
    try {
      await clearAllData();
      await refresh();
      onShowToast('All BillCraft data cleared from this browser');
    } catch (err) {
      onShowToast(`Failed: ${err instanceof Error ? err.message : 'error'}`);
    } finally {
      setBusy(false);
      setConfirmAll(false);
      setConfirmText('');
    }
  };

  return (
    <div className="space-y-3">
      <div className="card p-3 space-y-2">
        <div className="row" style={{ gap: 6 }}><Database className="w-4 h-4 text-[#593C8F] dark:text-[#A8D5BA]" /><span className="text-[11px] font-bold text-[#17151F] dark:text-[#F8F5FC]">Local data</span></div>
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="row sp"><span className="text-[#6D6879] dark:text-[#A39BB0]">Clients</span><b className="text-[#17151F] dark:text-[#F8F5FC]">{counts?.clients ?? '…'}</b></div>
          <div className="row sp"><span className="text-[#6D6879] dark:text-[#A39BB0]">Products</span><b className="text-[#17151F] dark:text-[#F8F5FC]">{counts?.products ?? '…'}</b></div>
          <div className="row sp"><span className="text-[#6D6879] dark:text-[#A39BB0]">Documents</span><b className="text-[#17151F] dark:text-[#F8F5FC]">{counts?.documents ?? '…'}</b></div>
          <div className="row sp"><span className="text-[#6D6879] dark:text-[#A39BB0]">Images</span><b className="text-[#17151F] dark:text-[#F8F5FC]">{counts?.images ?? '…'}</b></div>
        </div>
        <div className="row sp border-t border-[#EFE9F5] dark:border-[#2D2736] pt-2">
          <span className="row" style={{ gap: 5 }}><HardDrive className="w-3.5 h-3.5 text-[#6D6879]" /><span className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0]">Storage used</span></span>
          <span className="text-[9.5px] text-[#17151F] dark:text-[#F8F5FC]">
            {storage?.usage != null ? `${fmtBytes(storage.usage)}${storage.quota ? ` of ~${fmtBytes(storage.quota)}` : ''}` : 'not reported by this browser'}
          </span>
        </div>
      </div>

      <div className="card p-3 space-y-2">
        <div className="text-[11px] font-bold text-[#17151F] dark:text-[#F8F5FC]">Clear selected data</div>
        <p className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0]">Each action removes that category from this browser only.</p>
        <div className="grid grid-cols-2 gap-2">
          {(['clients', 'products', 'documents', 'images'] as const).map((c) => (
            <button key={c} type="button" onClick={() => { setConfirmCat(c); setConfirmAll(false); }} className="btn o text-[10px] justify-center inline-flex items-center gap-1.5"><Trash2 className="w-3 h-3" /> {CAT_LABEL[c]}</button>
          ))}
        </div>
      </div>

      <div className="card p-3 space-y-2 border-red-200 dark:border-red-900/50">
        <div className="text-[11px] font-bold text-red-600 dark:text-red-400">Danger zone</div>
        <p className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0]">
          Clearing ALL application data deletes every client, product, document, payment, image and preference from this browser. Nothing syncs anywhere else. Export a backup first if any of it matters.
        </p>
        <button type="button" onClick={() => setConfirmAll(true)} className="w-full px-3 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[11px] font-bold transition inline-flex items-center justify-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Clear ALL application data</button>
      </div>

      {confirmCat && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150" onClick={() => setConfirmCat(null)}>
          <div className="bg-[#FAF6EE] dark:bg-[#1B1820] rounded-2xl max-w-sm w-full p-5 space-y-3" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
            <div className="row" style={{ gap: 8 }}><AlertTriangle className="w-5 h-5 text-red-400 shrink-0" /><div className="text-[13px] font-bold text-[#17151F] dark:text-[#F8F5FC]">Delete {CAT_LABEL[confirmCat]}?</div></div>
            <p className="text-[11px] text-[#6D6879] dark:text-[#A39BB0]">{CAT_CONSEQ[confirmCat]}</p>
            <div className="row" style={{ gap: 8 }}>
              <button type="button" onClick={() => setConfirmCat(null)} className="btn o flex-1">Cancel</button>
              <button type="button" onClick={() => void doClearCat()} disabled={busy} className="flex-1 px-3 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[11px] font-bold transition disabled:opacity-60">{busy ? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}

      {confirmAll && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150" onClick={() => setConfirmCat(null)}>
          <div className="bg-[#FAF6EE] dark:bg-[#1B1820] rounded-2xl max-w-sm w-full p-5 space-y-3" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
            <div className="row" style={{ gap: 8 }}><ShieldAlert className="w-5 h-5 text-red-500 shrink-0" /><div className="text-[13px] font-bold text-[#17151F] dark:text-[#F8F5FC]">Erase everything?</div></div>
            <p className="text-[11px] text-[#6D6879] dark:text-[#A39BB0]">
              ALL BillCraft data in this browser will be permanently deleted: {counts?.clients ?? '?'} clients, {counts?.products ?? '?'} products, {counts?.documents ?? '?'} documents with payments, images and settings.
              This does NOT touch your downloaded backups or other devices — but there is no undo inside the app.
            </p>
            <label className="block"><span className="lab">Type DELETE to confirm</span>
              <input className="w-full rounded-xl border border-red-300 dark:border-red-800 bg-white dark:bg-[#17141D] px-3 py-2 text-[12px] outline-none" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" />
            </label>
            <div className="row" style={{ gap: 8 }}>
              <button type="button" onClick={() => { setConfirmAll(false); setConfirmText(''); }} className="btn o flex-1">Keep my data</button>
              <button type="button" onClick={() => void doClearAll()} disabled={busy || confirmText.trim().toUpperCase() !== 'DELETE'} className="flex-1 px-3 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[11px] font-bold transition disabled:opacity-50">{busy ? 'Clearing…' : 'Delete everything'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------- Privacy notice (Feature 7) ----------------

export const PRIVACY_NOTICE_TEXT =
  'Your BillCraft data is stored locally in this browser on this device. Clearing browser data or uninstalling the app may permanently erase your records. Export a backup regularly.';

export const PrivacyNoticeCard: React.FC<{
  onExportBackup: () => void;
  dismissible?: boolean;
  onDismiss?: () => void;
}> = ({ onExportBackup, dismissible, onDismiss }) => {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed && dismissible) return null;
  return (
    <div className="card row items-start gap-2.5 p-3 border-[#F0B83A]/40 dark:border-[#F0B83A]/25 bg-[#FDF6E7] dark:bg-[#2A2415]" data-testid="privacy-notice">
      <AlertTriangle className="w-4 h-4 text-[#B07C1E] shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="text-[10px] font-bold text-[#17151F] dark:text-[#F8F5FC]">Data stays on this device</div>
        <p className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0] leading-relaxed mt-0.5">{PRIVACY_NOTICE_TEXT}</p>
        <p className="text-[9px] text-[#6D6879] dark:text-[#A39BB0] mt-1">
          Your records do NOT sync between devices or to any cloud. Local browser storage is not a backup.
        </p>
        <div className="row mt-1.5" style={{ gap: 6 }}>
          <button type="button" onClick={onExportBackup} className="btn shrink-0" style={{ gap: 4, fontSize: 10 }}><Download className="w-3 h-3" /> Export Backup</button>
          {dismissible && <button type="button" onClick={() => { setDismissed(true); onDismiss?.(); }} className="text-[9.5px] font-bold text-[#6D6879] hover:underline self-center">Dismiss</button>}
        </div>
      </div>
    </div>
  );
};
