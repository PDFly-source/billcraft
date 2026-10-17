'use client';

/**
 * Phase 4 — Settings as a Business Control Center.
 * Information architecture (spec §2):
 *   A. App Preferences        (appearance, formatting, shortcuts)
 *   B. Document Settings       (defaults, numbering, style)
 *   C. Business Defaults       (profile, terms & notes)
 *   D. Privacy & Security      (local-first, app lock, limits)
 *   E. Data Management         (data-loss warning, backup, storage, clear)
 *   F. About & Support         (version, changelog, bug/feature reports)
 * Every control persists locally and applies immediately. No feature is
 * mocked: each card maps to a real implementation.
 */
import React, { useState } from 'react';
import { AppSettings, CurrencyCode, TaxMode, TemplateId } from '@/types/document';
import { CURRENCIES } from '@/lib/currency';
import {
  NUMBER_GROUPING_OPTIONS, DATE_FORMAT_OPTIONS, formatDate,
  type NumberGroupingPref, type DateFormatPref,
} from '@/lib/format';
import { BillCraftIcon } from '@/components/ui/BillCraftIcons';
import { BillCraftLogo } from '@/components/ui/BillCraftLogo';

import { BackupRestoreSection, DataManagementSection } from '@/components/data/DataSections';
import { BusinessProfileForm } from '@/components/data/BusinessProfileForm';
import { NumberingCard } from '@/components/settings/NumberingCard';
import { DefaultTermsCard } from '@/components/settings/DefaultTermsCard';
import { AppLockCard } from '@/components/settings/AppLockCard';
import { AboutModal } from '@/components/settings/AboutModal';
import { SupportSection } from '@/components/settings/SupportSection';
import { APP_VERSION } from '@/components/settings/AboutModal';
import { useLocalData } from '@/hooks/useLocalData';
import type { AppLockConfig } from '@/lib/applock';
import {
  ChevronDown, Building2, Database, FileJson, Palette, Hash, FileText,
  Lock, SlidersHorizontal, Info,
} from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (updated: Partial<AppSettings>) => void;
  onShowToast: (msg: string) => void;
  lockConfig: AppLockConfig | null;
  onLockConfigChange: (cfg: AppLockConfig | null) => void;
  onLockNow: () => void;
}

const GroupLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="lab" style={{ marginTop: '2px' }}>{children}</div>
);

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onShowToast,
  lockConfig,
  onLockConfigChange,
  onLockNow,
}) => {
  const [open, setOpen] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const { docPrefs, saveDocPrefs } = useLocalData();

  const toggle = (id: string) => setOpen((cur) => (cur === id ? null : id));

  const Section = ({ id, icon, title, subtitle, children }: {
    id: string; icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode;
  }) => (
    <div className="card overflow-hidden">
      <button
        type="button"
        className="row sp w-full text-left"
        style={{ padding: '10px 12px' }}
        onClick={() => toggle(id)}
        aria-expanded={open === id}
        aria-controls={`section-${id}`}
      >
        <div className="row" style={{ gap: 8 }}>
          <span className="w-7 h-7 rounded-lg bg-[#F1ECF8] dark:bg-[#281E36] row inline-flex justify-center items-center shrink-0">{icon}</span>
          <div>
            <div className="text-[11.5px] font-bold text-[#17151F] dark:text-[#F8F5FC]">{title}</div>
            <div className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0]">{subtitle}</div>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-[#6D6879] transition shrink-0 ${open === id ? 'rotate-180' : ''}`} />
      </button>
      {open === id && (
        <div id={`section-${id}`} className="animate-in fade-in duration-150" style={{ padding: '10px 12px' }}>{children}</div>
      )}
    </div>
  );

  return (
    <div className="max-w-[520px] mx-auto space-y-3.5 py-1 px-1 animate-in fade-in duration-200">
      {/* Title */}
      <div className="h" style={{ marginTop: '2px', color: 'var(--ink)' }}>
        Settings
      </div>

      {/* BillCraft Studio Card */}
      <div className="card row" style={{ padding: '10px' }}>
        <BillCraftLogo variant="lockup" size={40} />
        <div>
          <div className="m" style={{ fontSize: '10.5px', color: 'var(--mut)' }}>
            Local-first business document studio
          </div>
        </div>
      </div>

      {/* ---------------- A. APP PREFERENCES ---------------- */}
      <GroupLabel>APP PREFERENCES</GroupLabel>

      <div className="card p-2 divide-y divide-[#EFE9F5] dark:divide-[#2D2736]">
        <div className="set">
          <b>Appearance</b>
          <div className="row" style={{ gap: '4px' }}>
            {(['light', 'dark', 'system'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  onUpdateSettings({ theme: mode });
                  onShowToast(`Theme: ${mode.toUpperCase()}`);
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-bold capitalize cursor-pointer transition ${
                  settings.theme === mode
                    ? 'bg-[#593C8F] text-white shadow-xs'
                    : 'text-[#6D6879] hover:text-[#17151F]'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="set">
          <b>Number grouping</b>
          <select
            value={settings.numberGrouping || 'auto'}
            onChange={(e) => {
              onUpdateSettings({ numberGrouping: e.target.value as NumberGroupingPref });
              onShowToast(e.target.value === 'indian' ? 'Indian grouping: 1,00,000' : e.target.value === 'international' ? 'International grouping: 100,000' : 'Grouping follows currency');
            }}
            className="text-right font-bold text-xs bg-transparent text-[#593C8F] dark:text-[#A8D5BA] cursor-pointer outline-none"
            aria-label="Number grouping"
          >
            {NUMBER_GROUPING_OPTIONS.map((o) => (
              <option key={o.id} value={o.id} className="text-slate-900 bg-white dark:bg-[#1B1820] dark:text-slate-100">{o.label}</option>
            ))}
          </select>
        </div>

        <div className="set">
          <b>Date format</b>
          <div className="row" style={{ gap: 6 }}>
            <span className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0]">{formatDate(new Date().toISOString().slice(0, 10), settings.dateFormat || 'ddmmyyyy')}</span>
            <select
              value={settings.dateFormat || 'ddmmyyyy'}
              onChange={(e) => {
                onUpdateSettings({ dateFormat: e.target.value as DateFormatPref });
                onShowToast(`Dates: ${DATE_FORMAT_OPTIONS.find((o) => o.id === e.target.value)?.label}`);
              }}
              className="text-right font-bold text-xs bg-transparent text-[#593C8F] dark:text-[#A8D5BA] cursor-pointer outline-none"
              aria-label="Date format"
            >
              {DATE_FORMAT_OPTIONS.map((o) => (
                <option key={o.id} value={o.id} className="text-slate-900 bg-white dark:bg-[#1B1820] dark:text-slate-100">{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div>
          <div onClick={() => setShowShortcuts(!showShortcuts)} className="set cursor-pointer hover:opacity-80">
            <b>Keyboard Shortcuts</b>
            <span style={{ color: 'var(--pl)', fontWeight: 700 }}>{showShortcuts ? 'Hide' : 'View shortcuts'}</span>
          </div>
          {showShortcuts && (
            <div className="p-2 space-y-1.5 text-[11px] bg-[#FAF6EE] dark:bg-[#111015] rounded-lg mt-1 border border-[#E7E0EE] dark:border-[#302B38]">
              <div className="row sp"><span className="text-[#6D6879] dark:text-[#A39BB0]">Command Palette:</span><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-[#1B1820] border border-[#E7E0EE] font-mono text-[10px]">⌘ / Ctrl + K</kbd></div>
              <div className="row sp"><span className="text-[#6D6879] dark:text-[#A39BB0]">Print Document:</span><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-[#1B1820] border border-[#E7E0EE] font-mono text-[10px]">⌘ / Ctrl + P</kbd></div>
              <div className="row sp"><span className="text-[#6D6879] dark:text-[#A39BB0]">Export PDF:</span><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-[#1B1820] border border-[#E7E0EE] font-mono text-[10px]">⌘ / Ctrl + E</kbd></div>
              <div className="row sp"><span className="text-[#6D6879] dark:text-[#A39BB0]">Add Item:</span><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-[#1B1820] border border-[#E7E0EE] font-mono text-[10px]">Alt + I</kbd></div>
            </div>
          )}
        </div>
      </div>

      {/* ---------------- B. DOCUMENT SETTINGS ---------------- */}
      <GroupLabel>DOCUMENT SETTINGS</GroupLabel>

      <div className="card p-2 divide-y divide-[#EFE9F5] dark:divide-[#2D2736]">
        <div className="set">
          <b>Default Currency</b>
          <select
            value={settings.defaultCurrency}
            onChange={(e) => {
              const cur = e.target.value as CurrencyCode;
              onUpdateSettings({ defaultCurrency: cur });
              onShowToast(`Currency: ${cur}`);
            }}
            className="text-right font-bold text-xs bg-transparent text-[#593C8F] dark:text-[#A8D5BA] cursor-pointer outline-none"
          >
            {Object.values(CURRENCIES).map((c) => (
              <option key={c.code} value={c.code} className="text-slate-900 bg-white dark:bg-[#1B1820] dark:text-slate-100">
                {c.code} {c.symbol}
              </option>
            ))}
          </select>
        </div>

        <div className="set">
          <b>Default Template</b>
          <select
            value={settings.defaultTemplate}
            onChange={(e) => {
              const tpl = e.target.value as TemplateId;
              onUpdateSettings({ defaultTemplate: tpl });
              onShowToast(`Template: ${tpl.toUpperCase()}`);
            }}
            className="text-right font-bold text-xs bg-transparent text-[#593C8F] dark:text-[#A8D5BA] cursor-pointer outline-none capitalize"
          >
            <option value="modern" className="text-slate-900 bg-white dark:bg-[#1B1820] dark:text-slate-100">Modern</option>
            <option value="classic" className="text-slate-900 bg-white dark:bg-[#1B1820] dark:text-slate-100">Classic</option>
            <option value="minimal" className="text-slate-900 bg-white dark:bg-[#1B1820] dark:text-slate-100">Minimal</option>
            <option value="corporate" className="text-slate-900 bg-white dark:bg-[#1B1820] dark:text-slate-100">Corporate</option>
            <option value="elegant" className="text-slate-900 bg-white dark:bg-[#1B1820] dark:text-slate-100">Elegant</option>
            <option value="gst_pro" className="text-slate-900 bg-white dark:bg-[#1B1820] dark:text-slate-100">GST Professional</option>
          </select>
        </div>

        <div className="set">
          <b>Tax Mode</b>
          <select
            value={settings.defaultTaxMode}
            onChange={(e) => {
              const tax = e.target.value as TaxMode;
              onUpdateSettings({ defaultTaxMode: tax });
              onShowToast(`Tax Mode: ${tax.toUpperCase()}`);
            }}
            className="text-right font-bold text-xs bg-transparent text-[#593C8F] dark:text-[#A8D5BA] cursor-pointer outline-none uppercase"
          >
            <option value="gst" className="text-slate-900 bg-white dark:bg-[#1B1820] dark:text-slate-100">GST (CGST/SGST)</option>
            <option value="custom" className="text-slate-900 bg-white dark:bg-[#1B1820] dark:text-slate-100">Custom VAT</option>
            <option value="none" className="text-slate-900 bg-white dark:bg-[#1B1820] dark:text-slate-100">None</option>
          </select>
        </div>

        <div className="set">
          <b>Paper Size</b>
          <select
            value={settings.paperSize}
            onChange={(e) => {
              const ps = e.target.value as 'a4' | 'a5' | 'letter';
              onUpdateSettings({ paperSize: ps });
              onShowToast(`Paper: ${ps.toUpperCase()}`);
            }}
            className="text-right font-bold text-xs bg-transparent text-[#593C8F] dark:text-[#A8D5BA] cursor-pointer outline-none uppercase"
          >
            <option value="a4" className="text-slate-900 bg-white dark:bg-[#1B1820] dark:text-slate-100">A4</option>
            <option value="a5" className="text-slate-900 bg-white dark:bg-[#1B1820] dark:text-slate-100">A5</option>
            <option value="letter" className="text-slate-900 bg-white dark:bg-[#1B1820] dark:text-slate-100">US Letter</option>
          </select>
        </div>

        {/* PDF Settings Toggle */}
        <div>
          <div onClick={() => setShowExportOptions(!showExportOptions)} className="set cursor-pointer hover:opacity-80">
            <b>PDF Settings</b>
            <span style={{ color: 'var(--pl)', fontWeight: 700 }}>{showExportOptions ? 'Hide' : 'Customize export'}</span>
          </div>
          {showExportOptions && (
            <div className="p-2 space-y-2 text-xs bg-[#FAF6EE] dark:bg-[#111015] rounded-lg mt-1 border border-[#E7E0EE] dark:border-[#302B38]">
              <label className="row sp cursor-pointer">
                <span className="font-semibold text-[#17151F] dark:text-[#F8F5FC]">Auto Round-off Total</span>
                <input type="checkbox" checked={settings.autoRoundOff} onChange={(e) => onUpdateSettings({ autoRoundOff: e.target.checked })} className="rounded text-[#593C8F]" />
              </label>
              <label className="row sp cursor-pointer">
                <span className="font-semibold text-[#17151F] dark:text-[#F8F5FC]">BillCraft Document Footer</span>
                <input type="checkbox" checked={settings.showBranding} onChange={(e) => onUpdateSettings({ showBranding: e.target.checked })} className="rounded text-[#593C8F]" />
              </label>
            </div>
          )}
        </div>
      </div>

      <Section
        id="numbering"
        icon={<Hash className="w-3.5 h-3.5 text-[#593C8F] dark:text-[#A8D5BA]" />}
        title="Invoice numbering"
        subtitle="Prefix, next number, auto-increment & padding"
      >
        <NumberingCard onShowToast={onShowToast} />
      </Section>

      <Section
        id="style"
        icon={<Palette className="w-3.5 h-3.5 text-[#593C8F] dark:text-[#A8D5BA]" />}
        title="Document style defaults"
        subtitle="Density, watermark & branding for new documents"
      >
        <div className="space-y-3">
          <label className="block">
            <span className="lab">Default density</span>
            <select
              className="w-full rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-2 py-1.5 text-[11px]"
              value={docPrefs.density}
              onChange={(e) => void saveDocPrefs({ ...docPrefs, density: e.target.value as 'compact' | 'normal' | 'spacious' })}
            >
              <option value="compact">Compact</option>
              <option value="normal">Normal</option>
              <option value="spacious">Spacious</option>
            </select>
            <span className="text-[9px] text-[#6D6879] dark:text-[#A39BB0]">Applies to newly created documents.</span>
          </label>
          <label className="block">
            <span className="lab">Watermark defaults (per document, editable in preview)</span>
            <div className="space-y-1.5 p-2.5 rounded-xl border border-[#E7E0EE] dark:border-[#302B38]">
              <label className="row sp"><span className="text-[10px] text-[#6D6879] dark:text-[#A39BB0]">Enable watermark on new documents</span>
                <input type="checkbox" checked={docPrefs.watermark.enabled} onChange={(e) => void saveDocPrefs({ ...docPrefs, watermark: { ...docPrefs.watermark, enabled: e.target.checked } })} />
              </label>
              <label className="row sp"><span className="text-[10px] text-[#6D6879] dark:text-[#A39BB0]">Watermark source</span>
                <select
                  className="rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-2 py-1.5 text-[10.5px]"
                  value={docPrefs.watermark.source || 'text'}
                  onChange={(e) => void saveDocPrefs({ ...docPrefs, watermark: { ...docPrefs.watermark, source: e.target.value as 'text' | 'logo' } })}
                >
                  <option value="text">Text</option>
                  <option value="logo">Business logo</option>
                </select>
              </label>
              <label className="block"><span className="text-[10px] text-[#6D6879] dark:text-[#A39BB0]">Default text {docPrefs.watermark.source === 'logo' ? '(unused for logo watermarks)' : ''}</span>
                <input className="w-full rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-2 py-1.5 text-[11px]" value={docPrefs.watermark.text} onChange={(e) => void saveDocPrefs({ ...docPrefs, watermark: { ...docPrefs.watermark, text: e.target.value } })} />
              </label>
              {(docPrefs.watermark.source || 'text') === 'logo' && (
                <span className="text-[9px] text-[#6D6879] dark:text-[#A39BB0] italic">Logo watermark uses your saved business logo; opacity is capped to keep totals legible. Documents without a logo fall back to no watermark.</span>
              )}
              <label className="block"><span className="text-[10px] text-[#6D6879] dark:text-[#A39BB0]">Opacity: {(docPrefs.watermark.opacity * 100).toFixed(0)}%</span>
                <input type="range" min="4" max="20" step="1" value={docPrefs.watermark.opacity * 100} onChange={(e) => void saveDocPrefs({ ...docPrefs, watermark: { ...docPrefs.watermark, opacity: parseInt(e.target.value) / 100 } })} className="w-full" />
              </label>
            </div>
          </label>
          <label className="row sp"><span className="text-[10px] text-[#6D6879] dark:text-[#A39BB0]">Show BillCraft branding on documents</span>
            <input type="checkbox" checked={docPrefs.showBranding} onChange={(e) => void saveDocPrefs({ ...docPrefs, showBranding: e.target.checked })} />
          </label>
        </div>
      </Section>

      {/* ---------------- C. BUSINESS DEFAULTS ---------------- */}
      <GroupLabel>BUSINESS DEFAULTS</GroupLabel>

      <Section
        id="profile"
        icon={<Building2 className="w-3.5 h-3.5 text-[#593C8F] dark:text-[#A8D5BA]" />}
        title="Business profile"
        subtitle="Prefill invoices with your business, bank & GST details"
      >
        <BusinessProfileForm onShowToast={onShowToast} />
      </Section>

      <Section
        id="terms"
        icon={<FileText className="w-3.5 h-3.5 text-[#593C8F] dark:text-[#A8D5BA]" />}
        title="Default terms & notes"
        subtitle="Copied into new documents — existing ones keep their own"
      >
        <DefaultTermsCard onShowToast={onShowToast} />
      </Section>

      {/* ---------------- D. PRIVACY & SECURITY ---------------- */}
      <GroupLabel>PRIVACY &amp; SECURITY</GroupLabel>

      <div className="card" style={{ padding: '12px', background: '#E4F2E9', borderColor: 'var(--mint)' }}>
        <div className="row" style={{ color: 'var(--em)' }}>
          <BillCraftIcon name="lock" />
          <b style={{ letterSpacing: '.1em', fontSize: '11px', color: 'var(--em)' }}>LOCAL-FIRST</b>
        </div>
        <div style={{ fontWeight: 800, fontSize: '13px', lineHeight: 1.35, margin: '6px 0 4px', color: 'var(--em)' }}>
          No account.<br />
          No server.<br />
          No cloud document storage.
        </div>
        <div className="m" style={{ fontSize: '10px', color: 'var(--em)', opacity: 0.85 }}>
          Your business data is processed and stored inside your browser on this device.
        </div>
      </div>

      <AppLockCard
        lockConfig={lockConfig}
        onLockConfigChange={onLockConfigChange}
        onLockNow={onLockNow}
        onShowToast={onShowToast}
      />

      {/* ---------------- E. DATA MANAGEMENT ---------------- */}
      <GroupLabel>DATA MANAGEMENT</GroupLabel>

      {/* Prominent, honest data-loss warning (spec Feature E) */}
      <div
        className="card row items-start gap-2.5 p-3 border-[#F0B83A]/50 dark:border-[#F0B83A]/30 bg-[#FDF6E7] dark:bg-[#2A2415]"
        data-testid="data-loss-warning"
        role="note"
      >
        <span className="w-7 h-7 rounded-lg bg-[#F6E7C4] dark:bg-[#3A2F16] row inline-flex justify-center items-center shrink-0">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#B07C1E]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </span>
        <div className="flex-1">
          <div className="text-[10.5px] font-bold text-[#8A6512] dark:text-[#E2B95C]">Your data lives in this browser only</div>
          <p className="text-[9.5px] text-[#8A6512]/90 dark:text-[#E2B95C]/85 leading-relaxed mt-0.5">
            Your business data is stored on this device and in this browser. Clearing browser data, uninstalling the PWA, or losing access
            to this device may permanently remove your records. Export a backup regularly and keep it somewhere safe — BillCraft has no
            server copy, and data cleared from the browser is not recoverable through the app.
          </p>
        </div>
      </div>

      <Section
        id="backup"
        icon={<FileJson className="w-3.5 h-3.5 text-[#593C8F] dark:text-[#A8D5BA]" />}
        title="Backup & restore"
        subtitle="Export or import all data as a portable JSON file"
      >
        <BackupRestoreSection onShowToast={onShowToast} />
      </Section>

      <Section
        id="data"
        icon={<Database className="w-3.5 h-3.5 text-[#593C8F] dark:text-[#A8D5BA]" />}
        title="Storage usage & clear data"
        subtitle="Browser storage estimates, data counts, deletion controls"
      >
        <DataManagementSection onShowToast={onShowToast} />
      </Section>

      {/* ---------------- F. ABOUT & SUPPORT ---------------- */}
      <GroupLabel>ABOUT &amp; SUPPORT</GroupLabel>

      <div className="card p-2 divide-y divide-[#EFE9F5] dark:divide-[#2D2736]">
        <div className="set cursor-pointer hover:opacity-80" onClick={() => setAboutOpen(true)} role="button" tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAboutOpen(true); } }}
          aria-label="Open About BillCraft">
          <div className="row" style={{ gap: 6 }}>
            <Info className="w-4 h-4 text-[#593C8F] dark:text-[#A8D5BA]" />
            <b>About · What&apos;s New · Version history</b>
          </div>
          <span style={{ color: 'var(--pl)', fontWeight: 700 }}>View</span>
        </div>
        <div className="set">
          <div className="row" style={{ gap: 6 }}>
            <SlidersHorizontal className="w-4 h-4 text-[#593C8F] dark:text-[#A8D5BA]" />
            <b>BillCraft version</b>
          </div>
          <span className="bdg">v{APP_VERSION}</span>
        </div>
      </div>

      <SupportSection onShowToast={onShowToast} />

      {/* Tagline footer */}
      <div className="pt-2">
        <div className="lab" style={{ textAlign: 'center', fontSize: '8.5px', color: 'var(--pl)', justifyContent: 'center' }}>
          CREATE • CALCULATE • SHARE
        </div>
      </div>

      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
};
