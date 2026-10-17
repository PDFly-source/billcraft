'use client';

/**
 * Phase 4 — About modal: real version from package.json, truthful changelog
 * (dates taken from the repository's actual commit history), What's New for
 * this release, keyboard-accessible dismissal.
 */
import React, { useEffect, useRef } from 'react';
import { BillCraftLogo } from '@/components/ui/BillCraftLogo';
import { X, Github, Sparkles, History, ExternalLink } from 'lucide-react';
import pkg from '../../package.json';

export const APP_VERSION: string = pkg.version;
export const REPO_URL = 'https://github.com/PDFly-source/billcraft';
export const REPO_ISSUES_URL = `${REPO_URL}/issues`;

/** Truthful history — entries match actual repository commits. */
export const CHANGELOG: { version: string; date: string; title: string; items: string[] }[] = [
  {
    version: `v${APP_VERSION}`,
    date: '2026-10-17',
    title: 'Settings & Business Control Center (Phase 4)',
    items: [
      'Number formatting preference (Indian 1,00,000 / International 100,000)',
      'Date display preference (DD/MM/YYYY, MM/DD/YYYY, ISO) — stored dates never change',
      'Configurable invoice numbering: prefix, next number, padding, auto-increment, duplicate prevention',
      'Optional app lock with PIN (PBKDF2, Web Crypto), inactivity timeout and Lock Now',
      'Default terms & notes editor for new documents',
      'Storage usage panel with browser estimates and refresh',
      'Auto-dated backup filenames with seconds',
      'About, changelog, Report a Bug and Request a Feature support section',
    ],
  },
  {
    version: 'Phase 4.2',
    date: '2026-10-17',
    title: 'Recurring invoices',
    items: [
      'Recurring invoice series (monthly / quarterly / yearly) with one-click generation',
      'Local due reminders and backup support for series',
    ],
  },
  {
    version: 'Phase 4.1',
    date: '2026-10-17',
    title: 'Reports',
    items: ['Revenue by client, GST summary, top items and CSV exports'],
  },
  {
    version: 'Phase 3',
    date: '2026-10-17',
    title: 'Editor UX & data model',
    items: [
      'Item table, payments, signature and clause editors with autosave chip',
      'Payment engine, bank accounts, reusable clauses, backup schema v2',
    ],
  },
  {
    version: 'Phase 2',
    date: '2026-10-17',
    title: 'Business tools expansion',
    items: ['4 new document types, template personalization, pretty doc-type labels'],
  },
  {
    version: 'Phase 1',
    date: '2026-10-16',
    title: 'Local-first foundation',
    items: [
      'Persistent clients, products, history & payments in IndexedDB',
      'Create flow prefills from business profile, sequential numbering',
      'Official BillCraft branding, splash screen, GitHub Pages deployment',
    ],
  },
];

export const AboutModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/50 animate-in fade-in duration-150" onClick={onClose}>
      <div
        className="bg-[#FAF6EE] dark:bg-[#1B1820] w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="About BillCraft"
      >
        <div className="row sp sticky top-0 bg-[#FAF6EE] dark:bg-[#1B1820] px-4 py-3 border-b border-[#E7E0EE] dark:border-[#302B38]">
          <div className="row" style={{ gap: 8 }}>
            <BillCraftLogo variant="compact" size={26} />
            <div className="text-[13px] font-bold text-[#17151F] dark:text-[#F8F5FC]">About BillCraft</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close about dialog" ref={closeRef}><X className="w-4 h-4 text-[#6D6879]" /></button>
        </div>

        <div className="p-4 space-y-4">
          <div className="card p-3 space-y-2">
            <div className="row sp">
              <span className="text-[11px] font-bold text-[#17151F] dark:text-[#F8F5FC]">Version</span>
              <span className="bdg">v{APP_VERSION}</span>
            </div>
            <p className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0] leading-relaxed">
              Premium privacy-first business document studio for invoices, quotations, receipts and GST calculations.
              No account, no backend, no cloud document storage — everything runs and stays in your browser.
            </p>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#593C8F] dark:text-[#A8D5BA] hover:underline"
            >
              <Github className="w-3.5 h-3.5" /> PDFly-source/billcraft <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="card p-3 space-y-2">
            <div className="row" style={{ gap: 6 }}>
              <Sparkles className="w-4 h-4 text-[#593C8F] dark:text-[#A8D5BA]" />
              <span className="text-[11px] font-bold text-[#17151F] dark:text-[#F8F5FC]">What&apos;s New in v{APP_VERSION}</span>
            </div>
            <ul className="space-y-1 text-[9.5px] text-[#6D6879] dark:text-[#A39BB0] leading-relaxed list-disc pl-4">
              {CHANGELOG[0].items.map((it) => <li key={it}>{it}</li>)}
            </ul>
          </div>

          <div className="card p-3 space-y-2.5">
            <div className="row" style={{ gap: 6 }}>
              <History className="w-4 h-4 text-[#593C8F] dark:text-[#A8D5BA]" />
              <span className="text-[11px] font-bold text-[#17151F] dark:text-[#F8F5FC]">Version history</span>
            </div>
            <div className="space-y-3">
              {CHANGELOG.map((rel, i) => (
                <div key={i} className="space-y-1">
                  <div className="row sp">
                    <span className="text-[10.5px] font-bold text-[#17151F] dark:text-[#F8F5FC]">{rel.version} — {rel.title}</span>
                    <span className="text-[9px] text-[#6D6879] dark:text-[#A39BB0]">{rel.date}</span>
                  </div>
                  <ul className="space-y-0.5 text-[9.5px] text-[#6D6879] dark:text-[#A39BB0] list-disc pl-4">
                    {rel.items.map((it) => <li key={it}>{it}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
