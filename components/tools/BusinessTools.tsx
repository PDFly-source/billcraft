'use client';

import React, { useMemo, useState } from 'react';
import { BillCraftIcon, IconName } from '@/components/ui/BillCraftIcons';
import { BillCraftLogo } from '@/components/ui/BillCraftLogo';
import { Pin, PinOff, Search, X, ChevronLeft } from 'lucide-react';
import {
  GSTCalculatorTool, DiscountCalculatorTool, AmountInWordsTool,
  UPIQRGeneratorTool, TaxCalculatorTool, PercentageCalculatorTool,
} from './ToolPanels';
import { ProfitMarginTool, EMICalculatorTool, CurrencyConverterTool, HsnFinderTool } from './NewToolPanels';
import { getPinnedTools, setPinnedTools, togglePin, partitionPinned } from '@/lib/tools-prefs';

export type ToolId =
  | 'gst' | 'discount' | 'words' | 'upi_qr' | 'tax' | 'percentage'
  | 'profit_margin' | 'currency' | 'hsn' | 'emi';

interface BusinessToolsProps {
  initialTool?: ToolId;
}

export type ToolCategory = 'Tax & GST' | 'Money' | 'Trading' | 'Reference';

interface ToolCardMeta {
  id: ToolId;
  name: string;
  desc: string;
  icon: IconName;
  category: ToolCategory;
}

const TOOLS: ToolCardMeta[] = [
  { id: 'gst', name: 'GST Calculator', desc: 'Calculate GST, CGST, SGST and IGST instantly.', icon: 'pct', category: 'Tax & GST' },
  { id: 'discount', name: 'Discount Calculator', desc: 'Work out savings and final price.', icon: 'calc', category: 'Money' },
  { id: 'words', name: 'Amount in Words', desc: 'Convert numbers to written amounts.', icon: 'abc', category: 'Reference' },
  { id: 'upi_qr', name: 'UPI QR Generator', desc: 'Create payment QR codes.', icon: 'qr', category: 'Money' },
  { id: 'tax', name: 'Tax Calculator', desc: 'Estimate tax on any amount.', icon: 'doc', category: 'Tax & GST' },
  { id: 'percentage', name: 'Percentage Calculator', desc: 'Quick percentage maths.', icon: 'pct', category: 'Money' },
  { id: 'profit_margin', name: 'Profit Margin', desc: 'Margin & markup on cost vs price.', icon: 'shield', category: 'Trading' },
  { id: 'currency', name: 'Currency Converter', desc: 'Offline dated rates + manual rate.', icon: 'dl', category: 'Money' },
  { id: 'hsn', name: 'HSN / SAC Finder', desc: 'Search common GST goods & service codes.', icon: 'clip', category: 'Tax & GST' },
  { id: 'emi', name: 'EMI Calculator', desc: 'Monthly instalments & interest split.', icon: 'rec', category: 'Trading' },
];

const ALL_TOOL_IDS = TOOLS.map((t) => t.id);

const CATEGORIES: ('All' | ToolCategory)[] = ['All', 'Tax & GST', 'Money', 'Trading', 'Reference'];

export const BusinessTools: React.FC<BusinessToolsProps> = ({ initialTool }) => {
  const [activeTool, setActiveTool] = useState<ToolId | null>(initialTool || null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'All' | ToolCategory>('All');
  const [pinned, setPinned] = useState<ToolId[]>(() => getPinnedTools(ALL_TOOL_IDS));

  const pin = (id: ToolId) => {
    const next = togglePin(id, pinned);
    setPinned(next);
    setPinnedTools(next);
  };

  const t = (query || '').trim().toLowerCase();
  const matches = (m: ToolCardMeta) =>
    (!t || m.name.toLowerCase().includes(t) || m.desc.toLowerCase().includes(t) || m.category.toLowerCase().includes(t)) &&
    (category === 'All' || m.category === category);

  const { pinned: pinnedCards, rest } = useMemo(
    () => partitionPinned(TOOLS, pinned),
    [pinned]
  );
  const pinnedVisible = pinnedCards.filter(matches);
  const restVisible = rest.filter(matches);
  const hasResults = pinnedVisible.length + restVisible.length > 0;

  const Card = ({ m }: { m: ToolCardMeta }) => {
    const isSelected = activeTool === m.id;
    const isPinned = pinned.includes(m.id);
    return (
      <div
        onClick={() => setActiveTool(m.id)}
        className={`card cursor-pointer select-none transition group ${
          isSelected ? 'border-2 !border-[#593C8F] bg-[#FAF6EE] dark:bg-[#281E36]' : 'hover:border-slate-300'
        }`}
        style={{ padding: '11px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
        role="button"
        tabIndex={0}
        aria-label={`Open ${m.name} tool`}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTool(m.id); } }}
      >
        <div>
          <div className="row sp">
            <span className="ic" style={{ width: '32px', height: '32px', borderRadius: '10px' }}>
              <BillCraftIcon name={m.icon} style={{ width: '16px', height: '16px' }} />
            </span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); pin(m.id); }}
              aria-label={isPinned ? `Unpin ${m.name}` : `Pin ${m.name} to top`}
              title={isPinned ? 'Unpin from top' : 'Pin to top'}
              className="p-1 rounded-lg hover:bg-[#F1ECF8] dark:hover:bg-[#281E36] cursor-pointer"
            >
              {isPinned
                ? <Pin className="w-3.5 h-3.5 text-[#593C8F] dark:text-[#A8D5BA]" />
                : <PinOff className="w-3.5 h-3.5 text-[#6D6879]/50" />}
            </button>
          </div>
          <b style={{ display: 'block', margin: '7px 0 2px', fontSize: '11.5px', color: 'var(--ink)' }}>
            {m.name}
          </b>
          <div className="m" style={{ fontSize: '9.5px', color: 'var(--mut)', lineHeight: 1.3 }}>
            {m.desc}
          </div>
        </div>
        <div className="row sp" style={{ marginTop: '6px' }}>
          <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--pl)' }}>
            {isSelected ? 'Active' : 'Open'}
          </span>
          <span style={{ fontSize: '8.5px', fontWeight: 700, color: 'var(--mut)' }}>{m.category}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[420px] mx-auto space-y-3.5 py-1 px-1 animate-in fade-in duration-200">
      {/* Brand Header */}
      <div className="row sp">
        <div className="row">
          <BillCraftLogo variant="lockup" size={40} />
        </div>
      </div>

      {/* Screen Title */}
      <div>
        <div className="h" style={{ color: 'var(--ink)' }}>Business Tools</div>
        <div className="m" style={{ marginTop: '3px', color: 'var(--mut)' }}>
          Small tools. Big time savings.
        </div>
      </div>

      {/* Search tools */}
      <div className="card row items-center gap-2" style={{ padding: '8px 10px' }}>
        <Search className="w-3.5 h-3.5 text-[#6D6879] shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tools…"
          aria-label="Search tools"
          className="flex-1 min-w-0 bg-transparent outline-none text-[12px] text-[#17151F] dark:text-[#F8F5FC]"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Clear search">
            <X className="w-3.5 h-3.5 text-[#6D6879]" />
          </button>
        )}
      </div>

      {/* Categories */}
      <div className="row" style={{ gap: '5px', overflowX: 'auto', paddingBottom: '2px' }}>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`chip ${category === c ? 'on' : ''}`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Empty search state */}
      {!hasResults && (
        <div className="card p-5 text-center" data-testid="tools-empty">
          <p className="text-[12px] font-bold text-[#17151F] dark:text-[#F8F5FC]">No tools match your search</p>
          <p className="text-[10px] text-[#6D6879] dark:text-[#A39BB0] mt-1">
            Try a different keyword or category.
          </p>
          <button
            type="button"
            onClick={() => { setQuery(''); setCategory('All'); }}
            className="btn o mt-2"
            style={{ fontSize: 10.5 }}
          >
            Clear search
          </button>
        </div>
      )}

      {/* Pinned tools (persisted locally, shown once at the top) */}
      {pinnedVisible.length > 0 && (
        <>
          <div className="lab">PINNED</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px' }}>
            {pinnedVisible.map((m) => <Card key={`p-${m.id}`} m={m} />)}
          </div>
        </>
      )}

      {/* All other tools */}
      {restVisible.length > 0 && (
        <>
          {pinnedVisible.length > 0 && <div className="lab">ALL TOOLS</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px' }}>
            {restVisible.map((m) => <Card key={m.id} m={m} />)}
          </div>
        </>
      )}

      {/* Active Interactive Calculator View */}
      {activeTool && (
        <div className="card p-4 space-y-4 pt-3 mt-2 shadow-md">
          <div className="row sp border-b border-[#E7E0EE] dark:border-slate-800 pb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#593C8F] dark:text-[#A8D5BA] flex items-center gap-1.5">
              <span>{TOOLS.find((tl) => tl.id === activeTool)?.name}</span>
            </span>
            <button
              type="button"
              onClick={() => setActiveTool(null)}
              className="text-[11px] font-bold text-[#6D6879] hover:text-[#17151F] cursor-pointer"
            >
              Close ✕
            </button>
          </div>

          {activeTool === 'gst' && <GSTCalculatorTool />}
          {activeTool === 'discount' && <DiscountCalculatorTool />}
          {activeTool === 'words' && <AmountInWordsTool />}
          {activeTool === 'upi_qr' && <UPIQRGeneratorTool />}
          {activeTool === 'tax' && <TaxCalculatorTool />}
          {activeTool === 'percentage' && <PercentageCalculatorTool />}
          {activeTool === 'profit_margin' && <ProfitMarginTool />}
          {activeTool === 'currency' && <CurrencyConverterTool />}
          {activeTool === 'hsn' && <HsnFinderTool />}
          {activeTool === 'emi' && <EMICalculatorTool />}
        </div>
      )}

      {/* Bottom note */}
      {activeTool && (
        <button
          type="button"
          onClick={() => setActiveTool(null)}
          className="w-full text-center text-[10.5px] font-bold text-[#593C8F] dark:text-[#A8D5BA] py-1 cursor-pointer hover:underline row justify-center"
          style={{ gap: 4 }}
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Back to all tools
        </button>
      )}
    </div>
  );
};
