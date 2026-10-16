'use client';

import React, { useState } from 'react';
import { AppSettings, CurrencyCode, TaxMode, TemplateId } from '@/types/document';
import { CURRENCIES } from '@/lib/currency';
import { BillCraftIcon } from '@/components/ui/BillCraftIcons';
import { BillCraftLogo } from '@/components/ui/BillCraftLogo';

import { BackupRestoreSection, DataManagementSection, PrivacyNoticeCard } from '@/components/data/DataSections';
import { BusinessProfileForm } from '@/components/data/BusinessProfileForm';
import { useLocalData } from '@/hooks/useLocalData';
import { ChevronDown, Building2, Database, Download, FileJson } from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (updated: Partial<AppSettings>) => void;
  onShowToast: (msg: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onShowToast,
}) => {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [openSection, setOpenSection] = useState<'profile' | 'backup' | 'data' | 'style' | null>(null);
  const { docPrefs, saveDocPrefs } = useLocalData();

  const Section = ({ id, icon, title, subtitle }: { id: 'profile' | 'backup' | 'data' | 'style'; icon: React.ReactNode; title: string; subtitle: string }) => (
    <div className="card overflow-hidden">
      <button type="button" className="row sp w-full text-left" style={{ padding: '10px 12px' }} onClick={() => setOpenSection(openSection === id ? null : id)} aria-expanded={openSection === id}>
        <div className="row" style={{ gap: 8 }}>
          <span className="w-7 h-7 rounded-lg bg-[#F1ECF8] dark:bg-[#281E36] row inline-flex justify-center items-center">{icon}</span>
          <div>
            <div className="text-[11.5px] font-bold text-[#17151F] dark:text-[#F8F5FC]">{title}</div>
            <div className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0]">{subtitle}</div>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-[#6D6879] transition ${openSection === id ? 'rotate-180' : ''}`} />
      </button>
      {openSection === id && <div className="animate-in fade-in duration-150" style={{ padding: '10px 12px' }}>{childrenById[id]}</div>}
    </div>
  );

  const childrenById: Record<'profile' | 'backup' | 'data' | 'style', React.ReactNode> = {
    profile: <BusinessProfileForm onShowToast={onShowToast} />,
    backup: <BackupRestoreSection onShowToast={onShowToast} />,
    data: <DataManagementSection onShowToast={onShowToast} />,
    style: (
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
            <label className="block"><span className="text-[10px] text-[#6D6879] dark:text-[#A39BB0]">Default text</span>
              <input className="w-full rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-2 py-1.5 text-[11px]" value={docPrefs.watermark.text} onChange={(e) => void saveDocPrefs({ ...docPrefs, watermark: { ...docPrefs.watermark, text: e.target.value } })} />
            </label>
            <label className="block"><span className="text-[10px] text-[#6D6879] dark:text-[#A39BB0]">Opacity: {(docPrefs.watermark.opacity * 100).toFixed(0)}%</span>
              <input type="range" min="4" max="20" step="1" value={docPrefs.watermark.opacity * 100} onChange={(e) => void saveDocPrefs({ ...docPrefs, watermark: { ...docPrefs.watermark, opacity: parseInt(e.target.value) / 100 } })} className="w-full" />
            </label>
          </div>
        </label>
        <label className="row sp"><span className="text-[10px] text-[#6D6879] dark:text-[#A39BB0]">Show BillCraft branding on documents</span>
          <input type="checkbox" checked={docPrefs.showBranding} onChange={(e) => void saveDocPrefs({ ...docPrefs, showBranding: e.target.checked })} />
        </label>
      </div>
    ),
  };

  return (
    <div className="max-w-[420px] mx-auto space-y-3.5 py-1 px-1 animate-in fade-in duration-200">
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

      {/* Settings Rows from Reference Mockup */}
      <div className="card p-2 divide-y divide-[#EFE9F5] dark:divide-[#2D2736]">
        {/* Appearance */}
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

        {/* Default Currency */}
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

        {/* Default Template */}
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

        {/* Tax Mode */}
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

        {/* Paper Size */}
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
          <div
            onClick={() => setShowExportOptions(!showExportOptions)}
            className="set cursor-pointer hover:opacity-80"
          >
            <b>PDF Settings</b>
            <span style={{ color: 'var(--pl)', fontWeight: 700 }}>
              {showExportOptions ? 'Hide' : 'Customize export'}
            </span>
          </div>
          {showExportOptions && (
            <div className="p-2 space-y-2 text-xs bg-[#FAF6EE] dark:bg-[#111015] rounded-lg mt-1 border border-[#E7E0EE] dark:border-[#302B38]">
              <label className="row sp cursor-pointer">
                <span className="font-semibold text-[#17151F] dark:text-[#F8F5FC]">Auto Round-off Total</span>
                <input
                  type="checkbox"
                  checked={settings.autoRoundOff}
                  onChange={(e) => onUpdateSettings({ autoRoundOff: e.target.checked })}
                  className="rounded text-[#593C8F]"
                />
              </label>
              <label className="row sp cursor-pointer">
                <span className="font-semibold text-[#17151F] dark:text-[#F8F5FC]">BillCraft Document Footer</span>
                <input
                  type="checkbox"
                  checked={settings.showBranding}
                  onChange={(e) => onUpdateSettings({ showBranding: e.target.checked })}
                  className="rounded text-[#593C8F]"
                />
              </label>
            </div>
          )}
        </div>

        {/* Keyboard Shortcuts */}
        <div>
          <div
            onClick={() => setShowShortcuts(!showShortcuts)}
            className="set cursor-pointer hover:opacity-80"
          >
            <b>Keyboard Shortcuts</b>
            <span style={{ color: 'var(--pl)', fontWeight: 700 }}>
              {showShortcuts ? 'Hide' : 'View shortcuts'}
            </span>
          </div>
          {showShortcuts && (
            <div className="p-2 space-y-1.5 text-[11px] bg-[#FAF6EE] dark:bg-[#111015] rounded-lg mt-1 border border-[#E7E0EE] dark:border-[#302B38]">
              <div className="row sp">
                <span className="text-[#6D6879] dark:text-[#A39BB0]">Command Palette:</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-[#1B1820] border border-[#E7E0EE] font-mono text-[10px]">⌘ / Ctrl + K</kbd>
              </div>
              <div className="row sp">
                <span className="text-[#6D6879] dark:text-[#A39BB0]">Print Document:</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-[#1B1820] border border-[#E7E0EE] font-mono text-[10px]">⌘ / Ctrl + P</kbd>
              </div>
              <div className="row sp">
                <span className="text-[#6D6879] dark:text-[#A39BB0]">Export PDF:</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-[#1B1820] border border-[#E7E0EE] font-mono text-[10px]">⌘ / Ctrl + E</kbd>
              </div>
              <div className="row sp">
                <span className="text-[#6D6879] dark:text-[#A39BB0]">Add Item:</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-[#1B1820] border border-[#E7E0EE] font-mono text-[10px]">Alt + I</kbd>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* LOCAL DATA sections */}
      <div className="lab" style={{ marginTop: '2px' }}>YOUR DATA</div>
      <Section id="profile" icon={<Building2 className="w-3.5 h-3.5 text-[#593C8F] dark:text-[#A8D5BA]" />} title="Business profile" subtitle="Prefill invoices with your business, bank & GST details" />
      <Section id="style" icon={<Database className="w-3.5 h-3.5 text-[#593C8F] dark:text-[#A8D5BA]" />} title="Document style defaults" subtitle="Density, watermark & branding for new documents" />
      <Section id="backup" icon={<FileJson className="w-3.5 h-3.5 text-[#593C8F] dark:text-[#A8D5BA]" />} title="Backup & restore" subtitle="Export or import all data as a portable JSON file" />
      <Section id="data" icon={<Download className="w-3.5 h-3.5 text-[#593C8F] dark:text-[#A8D5BA]" />} title="Data management" subtitle="Storage usage & clearing data" />
      <PrivacyNoticeCard onExportBackup={() => setOpenSection('backup')} />

      {/* PRIVACY Label & Card from Reference Mockup */}
      <div className="lab" style={{ marginTop: '2px' }}>PRIVACY</div>
      <div
        className="card"
        style={{
          padding: '12px',
          background: '#E4F2E9',
          borderColor: 'var(--mint)',
        }}
      >
        <div className="row" style={{ color: 'var(--em)' }}>
          <BillCraftIcon name="lock" />
          <b style={{ letterSpacing: '.1em', fontSize: '11px', color: 'var(--em)' }}>LOCAL-FIRST</b>
        </div>
        <div
          style={{
            fontWeight: 800,
            fontSize: '13px',
            lineHeight: 1.35,
            margin: '6px 0 4px',
            color: 'var(--em)',
          }}
        >
          No account.<br />
          No server.<br />
          No cloud document storage.
        </div>
        <div className="m" style={{ fontSize: '10px', color: 'var(--em)', opacity: 0.85 }}>
          Your current document is processed inside your browser.
        </div>
      </div>

      {/* About & Brand Footer */}
      <div className="pt-2 space-y-2">
        <div className="row sp m">
          <span>About · BillCraft</span>
          <span className="bdg">v1.0</span>
        </div>
        <div className="lab" style={{ textAlign: 'center', fontSize: '8.5px', color: 'var(--pl)', justifyContent: 'center' }}>
          CREATE • CALCULATE • SHARE
        </div>
      </div>
    </div>
  );
};
