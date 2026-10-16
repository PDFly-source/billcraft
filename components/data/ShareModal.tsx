'use client';

/**
 * Share via WhatsApp (Feature 8). Generates the PDF from the ACTUAL rendered
 * document, builds a personalized message (editable), and uses the Web Share
 * API with the file when the browser supports it. When file sharing is not
 * supported it says so honestly: the PDF downloads and WhatsApp opens with
 * just the text — the user attaches the file themselves.
 */
import React, { useMemo, useState } from 'react';
import { DocumentModel, DocumentCalculations } from '@/types/document';
import { buildShareMessage, shareViaWhatsApp, normalizePhone, whatsappTextUrl } from '@/lib/whatsapp';
import { generatePDFBlob } from '@/lib/pdf-generator';
import { formatCurrency } from '@/lib/currency';
import { X, Send, Info, FileText, Phone } from 'lucide-react';

export const ShareModal: React.FC<{
  open: boolean;
  doc: DocumentModel;
  calc: DocumentCalculations;
  onClose: () => void;
  onShowToast: (m: string) => void;
}> = ({ open, doc, calc, onClose, onShowToast }) => {
  const [phone, setPhone] = useState(doc.customer.phone || '');
  const [message, setMessage] = useState(() => buildShareMessage(doc, calc));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ mode: string; instructions: string | null } | null>(null);

  const capability = useMemo(() => {
    if (typeof navigator === 'undefined') return { canShareFiles: false };
    return {
      canShareFiles:
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        (() => {
          try {
            const probe = new File([new Blob(['x'], { type: 'application/pdf' })], 'probe.pdf', { type: 'application/pdf' });
            return navigator.canShare({ files: [probe] });
          } catch {
            return false;
          }
        })(),
    };
  }, []);

  if (!open) return null;

  const handleShare = async () => {
    setBusy(true);
    setResult(null);
    try {
      const el = document.getElementById('printable-document');
      if (!el) throw new Error('Document preview not found — open the preview first');
      const pdf = await generatePDFBlob(el, { paperSize: doc.paperSize });
      const r = await shareViaWhatsApp(doc, calc, normalizePhone(phone), pdf, undefined, message);
      setResult({ mode: r.mode, instructions: r.instructions });
      onShowToast(r.mode === 'native-share' ? 'Opening share sheet with PDF attached' : 'PDF downloaded — WhatsApp opened with your message');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'share failed';
      if (msg.toLowerCase().includes('abort')) {
        onShowToast('Share cancelled');
      } else {
        onShowToast(`Share failed: ${msg}`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-end sm:items-center justify-center bg-black/50 animate-in fade-in duration-150" onClick={onClose}>
      <div className="bg-[#FAF6EE] dark:bg-[#1B1820] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom duration-200" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Share via WhatsApp">
        <div className="row sp sticky top-0 bg-[#FAF6EE] dark:bg-[#1B1820] px-4 py-3 border-b border-[#E7E0EE] dark:border-[#302B38]">
          <div>
            <div className="text-[13px] font-bold text-[#17151F] dark:text-[#F8F5FC]">Share via WhatsApp</div>
            <div className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0]">{doc.meta.documentNumber} • {formatCurrency(calc.grandTotal, doc.currency)}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"><X className="w-4 h-4 text-[#6D6879]" /></button>
        </div>

        <div className="p-4 space-y-3">
          <div className={`row items-start gap-2 rounded-xl p-2.5 ${capability.canShareFiles ? 'bg-[#6FBF9E]/10 border border-[#6FBF9E]/30' : 'bg-[#F0B83A]/12 border border-[#F0B83A]/30'}`}>
            <Info className={`w-4 h-4 shrink-0 mt-0.5 ${capability.canShareFiles ? 'text-[#2E7D5B]' : 'text-[#B07C1E]'}`} />
            <div className="text-[9.5px] text-[#17151F] dark:text-[#F8F5FC] leading-relaxed">
              {capability.canShareFiles
                ? 'This browser supports sharing files directly — your PDF will be attached automatically via the system share sheet.'
                : 'This browser does not allow web pages to attach files to WhatsApp. The PDF will be downloaded and WhatsApp will open with your message — attach the downloaded file in WhatsApp with the 📎 button.'}
            </div>
          </div>

          <label className="block">
            <span className="lab">WhatsApp number {doc.customer.phone ? '(from client)' : ''}</span>
            <div className="row" style={{ gap: 6 }}>
              <Phone className="w-3.5 h-3.5 text-[#6D6879] shrink-0 mt-2" />
              <input
                type="tel"
                inputMode="tel"
                className="w-full rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-[#593C8F]"
                placeholder="98765 43210 (choose recipient in WhatsApp if blank)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <span className="text-[9px] text-[#6D6879] dark:text-[#A39BB0]">Leave blank to pick the recipient yourself inside WhatsApp.</span>
          </label>

          <label className="block">
            <span className="lab">Message (editable)</span>
            <textarea
              rows={8}
              className="w-full rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-3 py-2 text-[11.5px] outline-none focus:ring-2 focus:ring-[#593C8F] leading-relaxed"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>

          {result && (
            <div className="card p-3 space-y-1.5 animate-in fade-in duration-150">
              <div className="row" style={{ gap: 6 }}>
                <FileText className="w-3.5 h-3.5 text-[#2E7D5B] dark:text-[#6FBF9E]" />
                <span className="text-[10px] font-bold text-[#17151F] dark:text-[#F8F5FC]">
                  {result.mode === 'native-share' ? 'Shared via system share sheet' : 'PDF downloaded + WhatsApp opened'}
                </span>
              </div>
              {result.instructions && <p className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0] leading-relaxed">{result.instructions}</p>}
              <a
                href={whatsappTextUrl(normalizePhone(phone), message)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[9.5px] font-bold text-[#593C8F] dark:text-[#A8D5BA] underline"
              >
                WhatsApp didn&apos;t open? Tap here
              </a>
            </div>
          )}
        </div>

        <div className="row sticky bottom-0 bg-[#FAF6EE] dark:bg-[#1B1820] px-4 py-3 border-t border-[#E7E0EE] dark:border-[#302B38]" style={{ gap: 8 }}>
          <button type="button" onClick={onClose} className="btn o flex-1">Close</button>
          <button type="button" onClick={() => void handleShare()} disabled={busy} className="flex-1 px-3 py-2 rounded-xl bg-[#25D366] hover:bg-[#1FB859] text-white text-[11px] font-bold transition inline-flex items-center justify-center gap-1.5 disabled:opacity-60">
            <Send className="w-3.5 h-3.5" /> {busy ? 'Preparing…' : 'Share PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};
