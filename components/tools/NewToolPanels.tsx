'use client';

/**
 * Phase 2 tool panels: Profit Margin, EMI, Currency Converter, HSN/SAC Finder.
 * All math lives in pure library functions (unit-tested); these components
 * only present inputs/results.
 */
import React, { useMemo, useState } from 'react';
import { formatNumber } from '@/lib/format';
import { calculateProfitMargin, calculateEMI, tenureToMonths } from '@/lib/business-calculators';
import {
  CURRENCIES, convertCurrency, searchCurrencies, getBundledRate,
  getManualRate, setManualRate as saveManualRate, clearManualRate, getActiveTable, BUNDLED_RATES,
} from '@/lib/currency-rates';
import { searchHsn, HSN_CATEGORIES, HSN_DATA_INFO } from '@/lib/hsn-data';
import { Copy, Check, TrendingUp, AlertTriangle } from 'lucide-react';

const inputCls =
  'w-full px-3 py-2 text-xs font-bold bg-[#FAF6EE] dark:bg-[#111015] border border-[#E7E0EE] dark:border-[#302B38] rounded-xl text-[#17151F] dark:text-[#F8F5FC]';
const labelCls = 'block text-[11px] font-bold text-[#17151F] dark:text-[#F8F5FC] mb-1';
const resultBoxCls =
  'p-3.5 rounded-xl bg-[#FAF6EE] dark:bg-[#111015] border border-[#E7E0EE] dark:border-[#302B38] space-y-2';

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`row sp text-[11px] ${strong ? 'border-t border-[#E7E0EE] dark:border-[#302B38] pt-2' : ''}`}>
      <span className="text-[#6D6879] dark:text-[#A39BB0] font-medium">{label}:</span>
      <b className={strong ? 'text-[#17151F] dark:text-[#F8F5FC]' : 'text-[#17151F] dark:text-[#F8F5FC]'}>{value}</b>
    </div>
  );
}

const INR = (n: number) =>
  '₹' + (Number.isFinite(n) ? formatNumber(n, undefined, true) : '—');

// ----------------------------------------------------------------------
// Profit Margin Calculator
// ----------------------------------------------------------------------
export function ProfitMarginTool() {
  const [cost, setCost] = useState<number>(800);
  const [price, setPrice] = useState<number>(1000);
  const [qty, setQty] = useState<number>(1);

  const r = useMemo(() => calculateProfitMargin({ costPrice: cost, sellingPrice: price, quantity: qty }), [cost, price, qty]);

  return (
    <div className="space-y-3.5 text-xs text-[#17151F] dark:text-[#F8F5FC]">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>Cost Price (₹ / unit)</label>
          <input type="number" min="0" value={cost || ''} onChange={(e) => setCost(parseFloat(e.target.value) || 0)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Selling Price (₹ / unit)</label>
          <input type="number" min="0" value={price || ''} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Quantity (optional, default 1)</label>
        <input type="number" min="1" value={qty === 1 ? '' : qty} placeholder="1" onChange={(e) => setQty(parseFloat(e.target.value) || 1)} className={inputCls} />
      </div>

      {!r.valid ? (
        <p className="text-[11px] text-[#E94B4B] flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> {r.error}
        </p>
      ) : (
        <div className={resultBoxCls}>
          <Row label="Total Cost" value={INR(r.totalCost)} />
          <Row label="Total Revenue" value={INR(r.totalRevenue)} />
          <Row label={r.isLoss ? 'Loss' : 'Profit'} value={`${r.isLoss ? '-' : '+'}${INR(Math.abs(r.profit)).slice(1)}`} />
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="rounded-lg border border-[#E7E0EE] dark:border-[#302B38] p-2">
              <span className="text-[9px] font-bold uppercase text-[#593C8F] dark:text-[#A8D5BA] block">Margin</span>
              <b className="text-[15px] text-[#17151F] dark:text-[#F8F5FC]">
                {r.marginPercent === null ? '—' : `${r.marginPercent}%`}
              </b>
              <span className="text-[8.5px] text-[#6D6879] dark:text-[#A39BB0] block">profit ÷ revenue</span>
            </div>
            <div className="rounded-lg border border-[#E7E0EE] dark:border-[#302B38] p-2">
              <span className="text-[9px] font-bold uppercase text-[#B07C1E] block">Markup</span>
              <b className="text-[15px] text-[#17151F] dark:text-[#F8F5FC]">
                {r.markupPercent === null ? '—' : `${r.markupPercent}%`}
              </b>
              <span className="text-[8.5px] text-[#6D6879] dark:text-[#A39BB0] block">profit ÷ cost</span>
            </div>
          </div>
          {r.isLoss && (
            <p className="text-[10px] text-[#E94B4B]">Selling below cost — this is a loss.</p>
          )}
        </div>
      )}
      <p className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0]">
        Margin = share of revenue kept as profit. Markup = profit relative to cost. Same deal, different base.
      </p>
    </div>
  );
}

// ----------------------------------------------------------------------
// EMI Calculator
// ----------------------------------------------------------------------
export function EMICalculatorTool() {
  const [principal, setPrincipal] = useState<number>(500000);
  const [rate, setRate] = useState<number>(9);
  const [tenure, setTenure] = useState<number>(5);
  const [unit, setUnit] = useState<'years' | 'months'>('years');

  const months = tenureToMonths(tenure, unit);
  const r = useMemo(() => calculateEMI({ principal, annualRatePercent: rate, tenureMonths: months }), [principal, rate, months]);
  const principalShare = r.valid ? Math.max(0, r.totalPayment - r.totalInterest) : 0;
  const interestPct = r.valid && r.totalPayment > 0 ? (r.totalInterest / r.totalPayment) * 100 : 0;

  return (
    <div className="space-y-3.5 text-xs text-[#17151F] dark:text-[#F8F5FC]">
      <div>
        <label className={labelCls}>Loan Amount / Principal (₹)</label>
        <input type="number" min="0" value={principal || ''} onChange={(e) => setPrincipal(parseFloat(e.target.value) || 0)} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Annual Interest Rate (%)</label>
        <input type="number" min="0" max="100" step="0.1" value={rate || ''} onChange={(e) => setRate(parseFloat(e.target.value) || 0)} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Loan Tenure</label>
        <div className="flex gap-2">
          <input type="number" min="1" value={tenure || ''} onChange={(e) => setTenure(parseFloat(e.target.value) || 1)} className={inputCls} />
          <button
            type="button"
            onClick={() => setUnit(unit === 'years' ? 'months' : 'years')}
            className="shrink-0 px-3 rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#1B1820] text-[11px] font-bold text-[#17151F] dark:text-[#F8F5FC] cursor-pointer"
          >
            {unit === 'years' ? 'Years' : 'Months'}
          </button>
        </div>
        {months > 0 && <span className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0] block mt-1">= {months} months</span>}
      </div>

      {!r.valid ? (
        <p className="text-[11px] text-[#E94B4B] flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> {r.error}
        </p>
      ) : (
        <div className={resultBoxCls}>
          <div className="row sp border-b border-[#E7E0EE] dark:border-[#302B38] pb-2">
            <b>Monthly EMI</b>
            <span className="tot" style={{ fontSize: '18px' }}>{INR(r.emi)}</span>
          </div>
          <Row label="Total Payment" value={INR(r.totalPayment)} />
          <Row label="Total Interest" value={INR(r.totalInterest)} />
          {/* principal vs interest breakdown bar */}
          <div className="pt-1">
            <div className="flex h-3 rounded-full overflow-hidden border border-[#E7E0EE] dark:border-[#302B38]">
              <div style={{ width: `${Math.max(0, 100 - interestPct)}%`, background: '#593C8F' }} title="Principal" />
              <div style={{ width: `${Math.min(100, interestPct)}%`, background: '#F0B83A' }} title="Interest" />
            </div>
            <div className="row sp text-[9.5px] mt-1 text-[#6D6879] dark:text-[#A39BB0]">
              <span className="row" style={{ gap: 4 }}><i style={{ width: 8, height: 8, background: '#593C8F', borderRadius: 2, display: 'inline-block' }} /> Principal {r.valid ? (100 - interestPct).toFixed(1) : '0'}%</span>
              <span className="row" style={{ gap: 4 }}><i style={{ width: 8, height: 8, background: '#F0B83A', borderRadius: 2, display: 'inline-block' }} /> Interest {interestPct.toFixed(1)}%</span>
            </div>
          </div>
          {r.isZeroInterest && (
            <p className="text-[10px] text-[#2E7D5B] dark:text-[#A8D5BA]">Zero-interest loan: principal split evenly across months.</p>
          )}
        </div>
      )}
      <p className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0]">
        Estimate based on a standard reducing-balance formula. Actual lender terms, fees and rounding may differ.
      </p>
    </div>
  );
}

// ----------------------------------------------------------------------
// Currency Converter (offline, dated rates + manual override)
// ----------------------------------------------------------------------
export function CurrencyConverterTool() {
  const [amount, setAmount] = useState<number>(100);
  const [from, setFrom] = useState<string>('USD');
  const [to, setTo] = useState<string>('INR');
  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery] = useState('');
  const [manualOpen, setManualOpen] = useState(false);
  const [manualRate, setManualRate] = useState<string>('');
  const table = getActiveTable();

  const r = useMemo(() => convertCurrency(amount, from, to), [amount, from, to]);
  const manual = getManualRate(from, to);
  const bundled = getBundledRate(from, to);

  const Select = ({ value, onChange, query, onQuery, label }: {
    value: string; onChange: (v: string) => void; query: string; onQuery: (q: string) => void; label: string;
  }) => {
    const filtered = searchCurrencies(CURRENCIES, query);
    return (
      <div>
        <label className={labelCls}>{label}</label>
        <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
          ))}
        </select>
        <input
          type="text"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search currency…"
          aria-label={`Search ${label}`}
          className="w-full mt-1 px-3 py-1.5 text-[11px] bg-white dark:bg-[#1B1820] border border-[#E7E0EE] dark:border-[#302B38] rounded-xl text-[#17151F] dark:text-[#F8F5FC]"
        />
        {query && filtered.length === 0 && (
          <span className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0] block mt-1">No currency matches “{query}”.</span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3.5 text-xs text-[#17151F] dark:text-[#F8F5FC]">
      <div className="grid grid-cols-2 gap-2">
        <Select value={from} onChange={setFrom} query={fromQuery} onQuery={setFromQuery} label="From" />
        <Select value={to} onChange={setTo} query={toQuery} onQuery={setToQuery} label="To" />
      </div>
      <div>
        <label className={labelCls}>Amount ({from})</label>
        <input type="number" min="0" value={amount || ''} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} className={inputCls} />
      </div>

      <div className={resultBoxCls}>
        {r.ok ? (
          <>
            <div className="row sp border-b border-[#E7E0EE] dark:border-[#302B38] pb-2">
              <b>{formatNumber(amount, undefined, true)} {from}</b>
              <span className="tot" style={{ fontSize: '18px' }}>
                {formatNumber(r.converted)} {to}
              </span>
            </div>
            <Row label="Rate used" value={`1 ${from} = ${r.rateUsed} ${to}`} />
            <Row label="Rate type" value={r.isManual ? 'Your manual rate' : `Offline snapshot (effective ${r.asOf})`} />
            <p className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0] pt-1">
              ⚠️ Offline rates are from <b>{table.asOf}</b> and may be outdated — they are not live market rates.
            </p>
          </>
        ) : (
          <p className="text-[11px] text-[#E94B4B]">{r.error}</p>
        )}
      </div>

      {/* manual rate entry — remembered locally */}
      <div className="rounded-xl border border-[#E7E0EE] dark:border-[#302B38] p-2.5">
        <div className="row sp">
          <button
            type="button"
            onClick={() => { setManualOpen(!manualOpen); if (!manualOpen) setManualRate(manual ? String(manual.rate) : bundled ? String(bundled) : ''); }}
            className="text-[11px] font-bold text-[#593C8F] dark:text-[#A8D5BA] cursor-pointer hover:underline"
          >
            {manualOpen ? 'Hide manual rate' : 'Set manual rate'}
          </button>
          {manual && (
            <button
              type="button"
              onClick={() => { clearManualRate(from, to); setManualRate(''); }}
              className="text-[10px] font-bold text-[#E94B4B] cursor-pointer hover:underline"
            >
              Remove saved rate
            </button>
          )}
        </div>
        {manualOpen && (
          <div className="row mt-2" style={{ gap: 6 }}>
            <input
              type="number"
              min="0"
              step="0.000001"
              value={manualRate}
              onChange={(e) => setManualRate(e.target.value)}
              placeholder={`1 ${from} = ? ${to}`}
              aria-label="Manual exchange rate"
              className="flex-1 min-w-0 px-3 py-2 text-xs font-mono font-bold bg-[#FAF6EE] dark:bg-[#111015] border border-[#E7E0EE] dark:border-[#302B38] rounded-xl text-[#17151F] dark:text-[#F8F5FC]"
            />
            <button
              type="button"
              onClick={() => {
                const v = parseFloat(manualRate);
                if (Number.isFinite(v) && v > 0) {
                  saveManualRate(from, to, v);
                  setManualRate(String(v));
                }
                setManualOpen(false);
              }}
              className="btn shrink-0"
              style={{ fontSize: 10.5 }}
            >
              Save
            </button>
          </div>
        )}
        {manual && !manualOpen && (
          <p className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0] mt-1">
            Using your saved rate: 1 {manual.from} = {manual.rate} {manual.to} (saved {manual.savedAt.slice(0, 10)}).
          </p>
        )}
        <p className="text-[9px] text-[#6D6879] dark:text-[#A39BB0] mt-1.5">
          Rates bundled offline ({BUNDLED_RATES.source.toLowerCase()}, effective {table.asOf}); manual rates stay on this device.
        </p>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// HSN / SAC Code Finder
// ----------------------------------------------------------------------
export function HsnFinderTool() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('All');
  const [copied, setCopied] = useState<string | null>(null);

  const { entries, exactMatch } = useMemo(() => searchHsn(query, category), [query, category]);

  const copyCode = (code: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        setCopied(code);
        setTimeout(() => setCopied(null), 1500);
      }).catch(() => undefined);
    }
  };

  return (
    <div className="space-y-3 text-xs text-[#17151F] dark:text-[#F8F5FC]">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search code (e.g. 7318) or description (e.g. bolts, IT services)…"
        aria-label="Search HSN or SAC codes"
        className={inputCls}
      />
      <div className="row" style={{ gap: 5, overflowX: 'auto', paddingBottom: 2 }}>
        {HSN_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`chip ${category === c ? 'on' : ''}`}
            style={{ fontSize: 9.5 }}
          >
            {c}
          </button>
        ))}
      </div>

      {exactMatch && (
        <div className="rounded-xl border-2 border-[#6FBF9E] bg-[#EFF8F3] dark:bg-[#16241D] p-2.5">
          <div className="row sp">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-[#2E7D5B]">Exact match</span>
              <b className="block text-[13px] font-mono">{exactMatch.code}</b>
              <span className="text-[10px] text-[#6D6879] dark:text-[#A39BB0]">{exactMatch.description}</span>
            </div>
            <button
              type="button"
              onClick={() => copyCode(exactMatch.code)}
              aria-label={`Copy code ${exactMatch.code}`}
              className="row shrink-0 px-2 py-1 rounded-lg border border-[#CBE5D7] text-[10px] font-bold text-[#2E7D5B] cursor-pointer bg-white/70 dark:bg-transparent"
              style={{ gap: 4 }}
            >
              {copied === exactMatch.code ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied === exactMatch.code ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      <div className="max-h-[260px] overflow-y-auto rounded-xl border border-[#E7E0EE] dark:border-[#302B38]">
        {entries.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-[11px] font-bold text-[#17151F] dark:text-[#F8F5FC]">No match found</p>
            <p className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0] mt-1">
              This offline catalogue covers common chapters only. Check the official CBIC portal for codes not listed here.
            </p>
          </div>
        ) : (
          entries.map((e, i) => (
            <div
              key={`${e.code}-${i}`}
              className="row sp px-2.5 py-1.5 border-b border-[#E7E0EE]/60 dark:border-[#302B38]/60 last:border-0"
            >
              <div className="min-w-0">
                <div className="row" style={{ gap: 5 }}>
                  <b className="font-mono text-[11px]">{e.code}</b>
                  <span className="bdg" style={{ background: e.kind === 'SAC' ? '#F0B83A' : '#593C8F', color: e.kind === 'SAC' ? '#17151F' : '#fff' }}>
                    {e.kind}
                  </span>
                </div>
                <div className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0] truncate">{e.description}</div>
              </div>
              <button
                type="button"
                onClick={() => copyCode(e.code)}
                aria-label={`Copy code ${e.code}`}
                className="shrink-0 p-1 rounded-lg hover:bg-[#F1ECF8] dark:hover:bg-[#281E36] cursor-pointer"
              >
                {copied === e.code ? <Check className="w-3 h-3 text-[#2E7D5B]" /> : <Copy className="w-3 h-3 text-[#6D6879]" />}
              </button>
            </div>
          ))
        )}
      </div>

      <p className="text-[9px] text-[#6D6879] dark:text-[#A39BB0] leading-relaxed">
        {HSN_DATA_INFO.coverageNote} Source: {HSN_DATA_INFO.source}. Last verified {HSN_DATA_INFO.lastVerified}.
      </p>
    </div>
  );
}
