'use client';

/**
 * Phase 4 reports view: revenue by client, GST summary, top items and
 * GSTR-1-style CSV export — all computed locally from saved documents.
 * The CSV is an offline bookkeeping aid, never a government filing.
 */
import React, { useMemo, useState } from 'react';
import { useLocalData } from '@/hooks/useLocalData';
import { formatCurrency } from '@/lib/currency';
import {
  DateRange, revenueDocs, revenueByClient, gstSummary, topItems,
  toGstr1Csv, toClientRevenueCsv, downloadCsv,
} from '@/lib/reports';
import { BarChart3, Download, Users, Package, Landmark, Info } from 'lucide-react';

type Preset = 'this_month' | 'last_month' | 'this_quarter' | 'this_fy' | 'all' | 'custom';

const PRESETS: { id: Preset; label: string }[] = [
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'this_quarter', label: 'Quarter' },
  { id: 'this_fy', label: 'FY' },
  { id: 'all', label: 'All Time' },
  { id: 'custom', label: 'Custom' },
];

/** Indian FY: Apr 1 – Mar 31. Quarter follows calendar quarters. */
function presetRange(preset: Preset, today = new Date()): DateRange {
  const y = today.getFullYear();
  const m = today.getMonth();
  const pad = (n: number) => String(n).padStart(2, '0');
  const d = (dt: Date) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  switch (preset) {
    case 'this_month':
      return { from: d(new Date(y, m, 1)), to: d(new Date(y, m + 1, 0)) };
    case 'last_month':
      return { from: d(new Date(y, m - 1, 1)), to: d(new Date(y, m, 0)) };
    case 'this_quarter':
      return { from: d(new Date(y, Math.floor(m / 3) * 3, 1)), to: d(new Date(y, Math.floor(m / 3) * 3 + 3, 0)) };
    case 'this_fy': {
      const fyStart = m >= 3 ? y : y - 1; // months are 0-indexed: April = 3
      return { from: d(new Date(fyStart, 3, 1)), to: d(new Date(fyStart + 1, 3, 0)) };
    }
    default:
      return {};
  }
}

const SectionCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; subtitle?: string }> =
  ({ title, icon, children, subtitle }) => (
    <div className="card p-3">
      <div className="row items-center justify-between">
        <div className="row" style={{ gap: 6 }}>
          <span className="w-5 h-5 rounded-lg row inline-flex justify-center items-center text-[#593C8F] dark:text-[#A8D5BA] bg-[#593C8F]/8">{icon}</span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-[#6D6879] dark:text-[#A39BB0]">{title}</span>
        </div>
        {subtitle && <span className="text-[8.5px] text-[#6D6879] dark:text-[#A39BB0]">{subtitle}</span>}
      </div>
      <div className="mt-2.5">{children}</div>
    </div>
  );

const Row: React.FC<{ cells: React.ReactNode[] }> = ({ cells }) => (
  <div className="grid grid-cols-[1fr_auto] sm:grid-cols-4 gap-x-2 py-1.5 border-t border-[#E7E0EE] dark:border-[#302B38]">
    {cells.map((c, i) => (
      <div key={i} className={`text-[11px] truncate ${i === 0 ? 'font-bold text-[#17151F] dark:text-[#F8F5FC]' : 'text-[#6D6879] dark:text-[#A39BB0] text-right'}`}>{c}</div>
    ))}
  </div>
);

export const ReportsView: React.FC<{ onShowToast: (msg: string) => void }> = ({ onShowToast }) => {
  const { documents, ready, storageError } = useLocalData();
  const [preset, setPreset] = useState<Preset>('this_fy');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const range: DateRange = useMemo(
    () => (preset === 'custom' ? { from: customFrom || undefined, to: customTo || undefined } : presetRange(preset)),
    [preset, customFrom, customTo],
  );

  const scoped = useMemo(() => revenueDocs(documents, range), [documents, range]);
  const cur = documents[0]?.document.currency || 'INR';
  const money = (paise: number) => formatCurrency(paise / 100, cur);

  const clients = useMemo(() => revenueByClient(scoped), [scoped]);
  const gst = useMemo(() => gstSummary(scoped), [scoped]);
  const items = useMemo(() => topItems(scoped, 8), [scoped]);

  const revenueMinor = clients.reduce((s, c) => s + c.invoicedMinor, 0);
  const paidMinor = clients.reduce((s, c) => s + c.paidMinor, 0);
  const outstandingMinor = revenueMinor - paidMinor;

  if (storageError) {
    return (
      <div className="card p-3 text-[11px] text-red-500">
        Local storage is unavailable in this browser, so reports cannot be generated. {storageError}
      </div>
    );
  }
  if (!ready) return <div className="card p-3 text-[11px] text-[#6D6879] dark:text-[#A39BB0]">Loading your data…</div>;

  const exportGstr = () => {
    downloadCsv(`gstr1-style-${new Date().toISOString().slice(0, 10)}.csv`, toGstr1Csv(scoped));
    onShowToast('GSTR-1 style CSV exported (offline summary)');
  };
  const exportClients = () => {
    downloadCsv(`client-revenue-${new Date().toISOString().slice(0, 10)}.csv`, toClientRevenueCsv(clients));
    onShowToast('Client revenue CSV exported');
  };

  return (
    <div className="space-y-3">
      {/* Range selector */}
      <div className="card p-3">
        <div className="row flex-wrap" style={{ gap: 4 }}>
          <span className="row" style={{ gap: 6 }}>
            <BarChart3 className="w-3.5 h-3.5 text-[#593C8F]" />
            <b className="text-[12px] text-[#17151F] dark:text-[#F8F5FC]">Reports</b>
          </span>
          <span className="text-[9px] text-[#6D6879] dark:text-[#A39BB0]">
            {scoped.length} sales document{scoped.length === 1 ? '' : 's'} in range
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreset(p.id)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                preset === p.id
                  ? 'bg-[#593C8F] text-white'
                  : 'bg-[#593C8F]/8 text-[#593C8F] dark:text-[#A8D5BA] hover:bg-[#593C8F]/15'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="mt-2 flex flex-wrap gap-2">
            <label className="row text-[10px] text-[#6D6879] dark:text-[#A39BB0]" style={{ gap: 4 }}>
              From <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="rounded-lg border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-2 py-1 text-[10px] text-[#17151F] dark:text-[#F8F5FC]" />
            </label>
            <label className="row text-[10px] text-[#6D6879] dark:text-[#A39BB0]" style={{ gap: 4 }}>
              To <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="rounded-lg border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-2 py-1 text-[10px] text-[#17151F] dark:text-[#F8F5FC]" />
            </label>
          </div>
        )}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <button type="button" onClick={exportGstr} className="btn px-2.5 py-1 inline-flex items-center gap-1.5 text-[10px] font-bold bg-[#593C8F] text-white rounded-lg" disabled={scoped.length === 0}>
            <Download className="w-3 h-3" /> GSTR-1 style CSV
          </button>
          <button type="button" onClick={exportClients} className="btn px-2.5 py-1 inline-flex items-center gap-1.5 text-[10px] font-bold bg-[#593C8F]/10 text-[#593C8F] dark:text-[#A8D5BA] rounded-lg" disabled={clients.length === 0}>
            <Download className="w-3 h-3" /> Client revenue CSV
          </button>
        </div>
        <p className="mt-1.5 text-[8.5px] text-[#6D6879] dark:text-[#A39BB0] flex items-start gap-1">
          <Info className="w-2.5 h-2.5 mt-0.5 shrink-0" />
          Exports are offline bookkeeping aids generated on your device — they are not a government filing.
        </p>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="card p-2.5">
          <p className="text-[9px] font-bold uppercase text-[#6D6879] dark:text-[#A39BB0]">Net Revenue</p>
          <p className="text-[13.5px] font-bold text-[#17151F] dark:text-[#F8F5FC] mt-0.5">{money(revenueMinor)}</p>
        </div>
        <div className="card p-2.5">
          <p className="text-[9px] font-bold uppercase text-[#6D6879] dark:text-[#A39BB0]">Collected</p>
          <p className="text-[13.5px] font-bold text-[#2E7D5B] dark:text-[#6FBF9E] mt-0.5">{money(paidMinor)}</p>
        </div>
        <div className="card p-2.5">
          <p className="text-[9px] font-bold uppercase text-[#6D6879] dark:text-[#A39BB0]">Outstanding</p>
          <p className="text-[13.5px] font-bold text-[#B07C1E] dark:text-[#F0B83A] mt-0.5">{money(outstandingMinor)}</p>
        </div>
        <div className="card p-2.5">
          <p className="text-[9px] font-bold uppercase text-[#6D6879] dark:text-[#A39BB0]">GST Payable</p>
          <p className="text-[13.5px] font-bold text-[#593C8F] dark:text-[#A8D5BA] mt-0.5">{money(gst.totalTaxMinor)}</p>
        </div>
      </div>

      {/* Client revenue */}
      <SectionCard title="Revenue by Client" icon={<Users className="w-3 h-3" />} subtitle={`${clients.length} client${clients.length === 1 ? '' : 's'}`}>
        {clients.length === 0 ? (
          <p className="text-[11px] text-[#6D6879] dark:text-[#A39BB0]">No sales documents in this range yet.</p>
        ) : (
          <>
            <Row cells={['Client', 'Docs', 'Revenue', 'Outstanding']} />
            {clients.slice(0, 10).map((c) => (
              <Row key={c.clientId || c.name} cells={[c.name, c.docCount, money(c.invoicedMinor), money(c.outstandingMinor)]} />
            ))}
          </>
        )}
      </SectionCard>

      {/* GST summary */}
      <SectionCard title="GST Summary" icon={<Landmark className="w-3 h-3" />} subtitle={`B2B ${gst.b2bCount} · B2C ${gst.b2cCount}`}>
        {gst.taxableMinor === 0 ? (
          <p className="text-[11px] text-[#6D6879] dark:text-[#A39BB0]">No GST documents in this range.</p>
        ) : (
          <>
            <Row cells={['Taxable Value', '', '', money(gst.taxableMinor)]} />
            <Row cells={['CGST', '', '', money(gst.cgstMinor)]} />
            <Row cells={['SGST', '', '', money(gst.sgstMinor)]} />
            <Row cells={['IGST', '', '', money(gst.igstMinor)]} />
            <Row cells={['Total Tax', '', '', money(gst.totalTaxMinor)]} />
            {gst.creditNoteMinor > 0 && <Row cells={['Credit Notes (value)', '', '', `−${money(gst.creditNoteMinor)}`]} />}
            <div className="mt-2">
              <p className="text-[9px] font-bold uppercase text-[#6D6879] dark:text-[#A39BB0] mb-1">By rate slab</p>
              <Row cells={['Rate', 'Invoices', 'Taxable', 'Tax']} />
              {gst.byRate.map((r) => (
                <Row key={r.rate} cells={[`${r.rate}%`, r.invoiceCount, money(r.taxableMinor), money(r.cgstMinor + r.sgstMinor + r.igstMinor)]} />
              ))}
            </div>
          </>
        )}
      </SectionCard>

      {/* Top items */}
      <SectionCard title="Top Products & Services" icon={<Package className="w-3 h-3" />}>
        {items.length === 0 ? (
          <p className="text-[11px] text-[#6D6879] dark:text-[#A39BB0]">Nothing sold in this range yet.</p>
        ) : (
          <>
            <Row cells={['Item', 'Qty', '', 'Revenue']} />
            {items.map((it) => (
              <Row key={it.name} cells={[it.name, it.qty, it.kind === 'service' ? 'service' : '', money(it.revenueMinor)]} />
            ))}
          </>
        )}
      </SectionCard>
    </div>
  );
};
