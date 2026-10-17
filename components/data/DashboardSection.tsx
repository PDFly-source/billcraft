'use client';

/**
 * Phase 1 dashboard: real totals from locally saved documents only.
 * Sales-reporting rules (see lib/finance.ts): only non-cancelled invoices
 * count as invoiced sales / receivables; collected = recorded payments.
 */
import React, { useMemo, useState } from 'react';
import { useLocalData } from '@/hooks/useLocalData';
import { SavedDocument } from '@/types/local';
import { formatCurrency } from '@/lib/currency';
import { TrendingUp, CheckCircle2, Clock, AlertTriangle, FileText, ChevronRight, BarChart3 } from 'lucide-react';
import { formatDate } from '@/lib/format';

export interface DashboardSectionProps {
  onOpenHistory: () => void;
  onOpenDocument?: (doc: SavedDocument) => void;
  onCreateDocument: (type: import('@/types/document').DocumentType) => void;
}

const TYPE_LABEL: Record<string, string> = {
  invoice: 'Invoice', quotation: 'Quotation', receipt: 'Receipt', estimate: 'Estimate', proforma: 'Proforma',
  purchase_order: 'Purchase Order', delivery_challan: 'Challan', credit_note: 'Credit Note', debit_note: 'Debit Note',
};

const StatTile: React.FC<{
  label: string; value: string; icon: React.ReactNode;
  tone: 'plum' | 'green' | 'gold' | 'red'; hint?: string;
}> = ({ label, value, icon, tone, hint }) => {
  const tones = {
    plum: 'text-[#593C8F] dark:text-[#A8D5BA] bg-[#593C8F]/8',
    green: 'text-[#2E7D5B] dark:text-[#6FBF9E] bg-[#6FBF9E]/12',
    gold: 'text-[#B07C1E] dark:text-[#F0B83A] bg-[#F0B83A]/15',
    red: 'text-red-500 dark:text-red-400 bg-red-500/10',
  };
  return (
    <div className="card p-2.5 min-w-0">
      <div className="row" style={{ gap: 5 }}>
        <span className={`w-5 h-5 rounded-lg row inline-flex justify-center items-center shrink-0 ${tones[tone]}`}>{icon}</span>
        <span className="text-[9px] font-bold uppercase tracking-wide text-[#6D6879] dark:text-[#A39BB0] truncate">{label}</span>
      </div>
      <div className="text-[13.5px] font-bold mt-1 text-[#17151F] dark:text-[#F8F5FC] truncate" title={value}>{value}</div>
      {hint && <div className="text-[8.5px] text-[#6D6879] dark:text-[#A39BB0] mt-0.5 truncate">{hint}</div>}
    </div>
  );
};

export const DashboardSection: React.FC<DashboardSectionProps> = ({
  onOpenHistory, onOpenDocument, onCreateDocument,
}) => {
  const { dashboard, documents, ready, storageError } = useLocalData();

  const cur = documents[0]?.document.currency || 'INR';
  const maxInvoiced = useMemo(
    () => Math.max(...dashboard.monthly.map((m) => m.invoiced), 0.01),
    [dashboard],
  );

  if (storageError) {
    return (
      <div className="card p-3 row items-start gap-2 border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30">
        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
        <div className="text-[10.5px] text-red-700 dark:text-red-300">
          Local storage unavailable, so totals cannot be shown ({storageError}). Documents still work for this session.
        </div>
      </div>
    );
  }

  const empty = dashboard.documentCount === 0;

  return (
    <section aria-label="Business dashboard" className="space-y-2.5">
      <div className="row sp">
        <div className="row" style={{ gap: 6 }}>
          <BarChart3 className="w-4 h-4 text-[#593C8F] dark:text-[#A8D5BA]" />
          <span className="text-[11px] font-bold text-[#17151F] dark:text-[#F8F5FC]">Your business</span>
        </div>
        <button type="button" onClick={onOpenHistory} className="text-[10px] font-bold text-[#593C8F] dark:text-[#A8D5BA] hover:underline">
          History →
        </button>
      </div>

      {/* summary tiles */}
      <div className="grid grid-cols-2 gap-2" data-testid="dashboard-tiles">
        <StatTile label="Total invoiced" value={empty && !ready ? '…' : formatCurrency(dashboard.totalInvoiced, cur)} icon={<TrendingUp className="w-3 h-3" />} tone="plum" hint={`${dashboard.invoiceCount} active invoice${dashboard.invoiceCount === 1 ? '' : 's'}`} />
        <StatTile label="Amount paid" value={empty && !ready ? '…' : formatCurrency(dashboard.totalPaid, cur)} icon={<CheckCircle2 className="w-3 h-3" />} tone="green" hint="Recorded payments" />
        <StatTile label="Outstanding" value={empty && !ready ? '…' : formatCurrency(dashboard.outstanding, cur)} icon={<Clock className="w-3 h-3" />} tone="gold" hint="Uncollected invoice balance" />
        <StatTile label="Overdue" value={empty && !ready ? '…' : formatCurrency(dashboard.overdue, cur)} icon={<AlertTriangle className="w-3 h-3" />} tone="red" hint="Past due date" />
      </div>

      {/* monthly chart */}
      <div className="card p-3">
        <div className="row sp mb-2">
          <span className="text-[10.5px] font-bold text-[#17151F] dark:text-[#F8F5FC]">Monthly invoicing (last 12 months)</span>
        </div>
        <div className="row items-end" style={{ gap: 3, height: 64 }} role="img" aria-label="Monthly invoiced and collected amounts for the last 12 months">
          {dashboard.monthly.map((m) => {
            const h = Math.max(2, Math.min(100, Math.round((m.invoiced / maxInvoiced) * 100)));
            const paidShare = Math.min(100, (m.paid / Math.max(m.invoiced, 0.01)) * 100);
            return (
              <div key={m.key} className="flex-1 flex flex-col items-center justify-end h-full min-w-0" title={`${m.label}: invoiced ${formatCurrency(m.invoiced, cur)}, paid ${formatCurrency(m.paid, cur)}`}>
                <div className="w-full rounded-t-sm relative overflow-hidden" style={{ height: `${h}%`, background: 'linear-gradient(180deg, #7352A8 0%, #593C8F 100%)', minHeight: 2 }}>
                  <div className="absolute bottom-0 left-0 right-0" style={{ height: `${paidShare}%`, background: '#6FBF9E' }} />
                </div>
                <span className="text-[7.5px] text-[#6D6879] dark:text-[#A39BB0] mt-1 leading-none truncate w-full text-center">{m.label}</span>
              </div>
            );
          })}
        </div>
        <div className="row" style={{ gap: 8 }}>
          <span className="row items-center gap-1 text-[9px] text-[#6D6879] dark:text-[#A39BB0]"><span className="w-2 h-2 rounded-sm bg-[#593C8F]" /> Invoiced</span>
          <span className="row items-center gap-1 text-[9px] text-[#6D6879] dark:text-[#A39BB0]"><span className="w-2 h-2 rounded-sm bg-[#6FBF9E]" /> Paid</span>
        </div>
      </div>

      {/* recent documents */}
      <div className="space-y-1.5">
        <div className="row sp">
          <span className="text-[11px] font-bold text-[#17151F] dark:text-[#F8F5FC]">Recent documents</span>
          <button type="button" onClick={onOpenHistory} className="text-[10px] font-bold text-[#593C8F] dark:text-[#A8D5BA]">View all</button>
        </div>
        {dashboard.recent.length === 0 ? (
          <div className="card p-3 row items-center gap-2">
            <FileText className="w-4 h-4 text-[#B9A8D6] shrink-0" />
            <span className="text-[10.5px] text-[#6D6879] dark:text-[#A39BB0]">No saved documents yet — save one from the editor and your real totals appear here.</span>
          </div>
        ) : (
          dashboard.recent.map((d) => (
            <button key={d.id} type="button" className="card row sp p-2.5 w-full text-left hover:border-[#593C8F] transition" onClick={() => onOpenDocument ? onOpenDocument(d) : onOpenHistory()}>
              <div className="min-w-0">
                <div className="row" style={{ gap: 6 }}>
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#593C8F]/10 text-[#593C8F] dark:text-[#A8D5BA] shrink-0">{TYPE_LABEL[d.type] || d.type}</span>
                  <span className="text-[11px] font-bold text-[#17151F] dark:text-[#F8F5FC] truncate">{d.documentNumber}</span>
                </div>
                <div className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0] truncate">{d.clientName} • {formatDate(d.issueDate)}</div>
              </div>
              <div className="row shrink-0" style={{ gap: 4 }}>
                <span className="text-[11px] font-bold text-[#17151F] dark:text-[#F8F5FC]">{formatCurrency((d.totalMinor || 0) / 100, d.document.currency)}</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#6D6879]" />
              </div>
            </button>
          ))
        )}
      </div>

      {/* quick actions */}
      <div className="row" style={{ gap: 6 }}>
        <span className="text-[10px] font-bold text-[#17151F] dark:text-[#F8F5FC] self-center">Quick create:</span>
        {(['invoice', 'quotation', 'receipt', 'estimate'] as const).map((t) => (
          <button key={t} type="button" onClick={() => onCreateDocument(t)} className="px-2 py-1 rounded-lg bg-[#593C8F] text-white text-[10px] font-bold hover:bg-[#4A3178] transition capitalize">
            + {t === 'quotation' ? 'Quote' : t.slice(0, 3)}
          </button>
        ))}
      </div>
    </section>
  );
};
