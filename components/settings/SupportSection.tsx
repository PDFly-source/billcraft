'use client';

/**
 * Phase 4 — Support: Report a Bug / Request a Feature via the REAL repository
 * issue tracker (PDFly-source/billcraft). No invented email addresses.
 * The diagnostic summary contains only app/version/platform details — never
 * business records. GitHub requires signing in; stated clearly.
 */
import React, { useState } from 'react';
import { Bug, Lightbulb, Copy, Check, Github, ExternalLink } from 'lucide-react';
import { APP_VERSION, REPO_URL } from '@/components/settings/AboutModal';

function diagnosticSummary(): string {
  let platform = 'unknown';
  try {
    const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
    platform = nav.userAgentData?.platform || navigator.platform || 'unknown';
  } catch { /* keep unknown */ }
  let storage = 'unknown';
  try { storage = typeof indexedDB !== 'undefined' ? 'available' : 'unavailable'; } catch { /* ignore */ }
  return [
    'BillCraft diagnostic summary',
    `App version: v${APP_VERSION}`,
    `Platform: ${platform}`,
    `Local storage (IndexedDB): ${storage}`,
    `Online: ${typeof navigator !== 'undefined' && navigator.onLine ? 'yes' : 'no'}`,
    'Data location: local-first (IndexedDB, this browser only)',
  ].join('\n');
}

export const SupportSection: React.FC<{ onShowToast: (m: string) => void }> = ({ onShowToast }) => {
  const [copied, setCopied] = useState(false);

  const copyDiagnostics = async () => {
    const text = diagnosticSummary();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onShowToast('Diagnostics copied — no business data included');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      onShowToast('Could not copy — clipboard unavailable');
    }
  };

  const bugUrl = `${REPO_URL}/issues/new?labels=bug&title=${encodeURIComponent('[Bug] ')}`;
  const featureUrl = `${REPO_URL}/issues/new?labels=enhancement&title=${encodeURIComponent('[Feature] ')}`;

  return (
    <div className="card p-3 space-y-2.5">
      <div className="row" style={{ gap: 6 }}>
        <Github className="w-4 h-4 text-[#593C8F] dark:text-[#A8D5BA]" />
        <span className="text-[11px] font-bold text-[#17151F] dark:text-[#F8F5FC]">Support</span>
      </div>
      <p className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0] leading-relaxed">
        Reports open the public GitHub issue tracker at PDFly-source/billcraft — an external website that may ask you to sign in to GitHub.
        BillCraft never sends your invoices, customers, GSTINs, signatures or backups anywhere: only the text you type plus the optional
        diagnostic summary below (app version and platform — no business data).
      </p>
      <div className="grid grid-cols-2 gap-2">
        <a href={bugUrl} target="_blank" rel="noopener noreferrer" className="btn o justify-center inline-flex items-center gap-1.5 text-[10.5px]">
          <Bug className="w-3.5 h-3.5" /> Report a bug <ExternalLink className="w-3 h-3 opacity-60" />
        </a>
        <a href={featureUrl} target="_blank" rel="noopener noreferrer" className="btn o justify-center inline-flex items-center gap-1.5 text-[10.5px]">
          <Lightbulb className="w-3.5 h-3.5" /> Request a feature <ExternalLink className="w-3 h-3 opacity-60" />
        </a>
      </div>
      <button type="button" onClick={() => void copyDiagnostics()} className="btn w-full justify-center inline-flex items-center gap-1.5">
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied to clipboard' : 'Copy diagnostic summary (no business data)'}
      </button>
      <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="block text-center text-[9.5px] font-bold text-[#593C8F] dark:text-[#A8D5BA] hover:underline">
        github.com/PDFly-source/billcraft
      </a>
    </div>
  );
};
