/**
 * OFFLINE currency conversion.
 *
 * Rates are a bundled snapshot with an explicit effective date. They are NOT
 * live: the UI must always show the effective date and warn that offline
 * rates may be outdated. No network dependency, no external API.
 *
 * Structure is deliberately forward-compatible: a future feature can fetch a
 * newer RatesTable and store it via the same `loadCustomTable`/`getActiveTable`
 * seam without touching any call sites.
 */

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
}

export interface RatesTable {
  base: 'USD';
  asOf: string;          // ISO date the snapshot was taken
  source: string;        // human-readable provenance
  rates: Record<string, number>; // 1 USD = rate[code]
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs' },
  { code: 'NPR', name: 'Nepalese Rupee', symbol: '₨' },
];

/**
 * Bundled snapshot. Pegged currencies (AED, SAR, QAR, HKD) are fixed by law;
 * free-floating rates are approximate mid-market values of that date and
 * WILL have drifted. The effective date is displayed everywhere rates are
 * used so the user can judge staleness.
 */
export const BUNDLED_RATES: RatesTable = {
  base: 'USD',
  asOf: '2025-01-01',
  source: 'Bundled offline snapshot (approximate mid-market reference rates)',
  rates: {
    USD: 1,
    INR: 84.0,
    EUR: 0.92,
    GBP: 0.79,
    AED: 3.6725, // pegged to USD
    SAR: 3.75,   // pegged to USD
    QAR: 3.64,   // pegged to USD
    KWD: 0.3065,
    JPY: 149.0,
    CNY: 7.10,
    CHF: 0.88,
    AUD: 1.52,
    CAD: 1.37,
    NZD: 1.66,
    SGD: 1.34,
    HKD: 7.79,   // pegged band to USD
    MYR: 4.45,
    THB: 36.0,
    IDR: 15800.0,
    VND: 24500.0,
    BDT: 118.0,
    PKR: 278.0,
    LKR: 295.0,
    NPR: 134.0,
  },
};

// ---- manual overrides (localStorage) ----------------------------------
const MANUAL_KEY = 'bc-manual-fx-rates';

interface ManualRate {
  from: string;
  to: string;
  rate: number;   // 1 from = rate to
  savedAt: string;
}

function readManual(): ManualRate[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MANUAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isValidManualRate) : [];
  } catch {
    return [];
  }
}

function isValidManualRate(r: unknown): r is ManualRate {
  const m = r as ManualRate;
  return (
    typeof m === 'object' && m !== null &&
    typeof m.from === 'string' && typeof m.to === 'string' &&
    Number.isFinite(m.rate) && m.rate > 0
  );
}

function writeManual(list: ManualRate[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(MANUAL_KEY, JSON.stringify(list));
  } catch { /* private mode / quota — manual rates just won't persist */ }
}

export function getManualRates(): ManualRate[] {
  return readManual();
}

/** Save one manual rate (1 from = rate to). Replaces any previous pair rate. */
export function setManualRate(from: string, to: string, rate: number, savedAt = new Date().toISOString()): void {
  if (!Number.isFinite(rate) || rate <= 0 || !from || !to || from === to) return;
  const list = readManual().filter((r) => !(r.from === from && r.to === to));
  list.push({ from, to, rate, savedAt });
  writeManual(list);
}

export function clearManualRate(from: string, to: string): void {
  writeManual(readManual().filter((r) => !(r.from === from && r.to === to)));
}

export function getManualRate(from: string, to: string): ManualRate | undefined {
  return readManual().find((r) => r.from === from && r.to === to);
}

// ---- conversion --------------------------------------------------------

export interface ConversionResult {
  ok: boolean;
  error?: string;
  amount: number;
  rateUsed: number;      // 1 from = rateUsed to
  isManual: boolean;     // true when a user-entered rate was used
  asOf: string;          // effective date of the rate used
  converted: number;
}

export function getActiveTable(): RatesTable {
  return BUNDLED_RATES; // seam for a future "updated rates" feature
}

/**
 * Convert `amount` from one currency to another.
 * Priority: manual user-entered pair rate > bundled cross-rate via USD.
 */
export function convertCurrency(amount: number, from: string, to: string): ConversionResult {
  if (!Number.isFinite(amount)) return fail('Enter a valid amount');
  if (amount < 0) return fail('Amount cannot be negative');
  if (amount > 1e12) return fail('Amount is too large');
  if (from === to) {
    return { ok: true, amount, rateUsed: 1, isManual: false, asOf: BUNDLED_RATES.asOf, converted: round2(amount) };
  }
  const manual = getManualRate(from, to);
  if (manual) {
    return {
      ok: true, amount, rateUsed: manual.rate, isManual: true,
      asOf: manual.savedAt.slice(0, 10), converted: round2(amount * manual.rate),
    };
  }
  const table = getActiveTable();
  const rFrom = table.rates[from];
  const rTo = table.rates[to];
  if (!rFrom || !rTo) return fail(`No offline rate available for ${from} or ${to}`);
  // cross rate via USD: (1 from in USD) x (USD in to)
  const cross = (1 / rFrom) * rTo;
  return {
    ok: true, amount, rateUsed: round6(cross), isManual: false,
    asOf: table.asOf, converted: round2(amount * cross),
  };
}

/** The bundled rate for a pair (no manual override), or null. */
export function getBundledRate(from: string, to: string): number | null {
  if (from === to) return 1;
  const table = getActiveTable();
  const rFrom = table.rates[from];
  const rTo = table.rates[to];
  if (!rFrom || !rTo) return null;
  return round6((1 / rFrom) * rTo);
}

export function searchCurrencies(list: CurrencyInfo[], q: string): CurrencyInfo[] {
  const t = (q || '').trim().toLowerCase();
  if (!t) return list;
  return list.filter((c) => c.code.toLowerCase().includes(t) || c.name.toLowerCase().includes(t));
}

function fail(error: string): ConversionResult {
  return { ok: false, error, amount: 0, rateUsed: 0, isManual: false, asOf: '', converted: 0 };
}
function round2(n: number): number { return Math.round((n + Number.EPSILON) * 100) / 100; }
function round6(n: number): number { return Math.round((n + Number.EPSILON) * 1e6) / 1e6; }
