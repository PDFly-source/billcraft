/**
 * Phase 4 — display formatting preferences.
 *
 * Numbers: grouping preference ('auto' | 'indian' | 'international').
 * Dates:   display preference ('ddmmyyyy' | 'mmddyyyy' | 'iso').
 *
 * CRITICAL RULES for dates:
 *  - Documents store dates internally as unambiguous 'YYYY-MM-DD' strings.
 *  - formatDate() NEVER parses stored dates into a Date object, so there is
 *    no timezone interpretation and no off-by-one-day error. A stored
 *    '2026-03-05' is displayed as 05/03/2026, 03/05/2026 or 2026-03-05
 *    depending on preference — the underlying value never changes.
 *  - Changing the display preference re-renders the SAME stored dates; it
 *    never reinterprets or migrates them.
 *
 * The preferences are mirrored in module-level state so that non-React code
 * (PDF export, WhatsApp share builder, calculators) formats identically.
 * AppShell pushes the persisted values here on load and on every change.
 */

export type NumberGroupingPref = 'auto' | 'indian' | 'international';
export type DateFormatPref = 'ddmmyyyy' | 'mmddyyyy' | 'iso';

export const NUMBER_GROUPING_OPTIONS: { id: NumberGroupingPref; label: string; hint: string }[] = [
  { id: 'auto', label: 'Auto (by currency)', hint: 'Indian grouping for ₹, international for others' },
  { id: 'indian', label: 'Indian (1,00,000)', hint: 'Lakh / crore grouping everywhere' },
  { id: 'international', label: 'International (100,000)', hint: 'Thousands grouping everywhere' },
];

export const DATE_FORMAT_OPTIONS: { id: DateFormatPref; label: string }[] = [
  { id: 'ddmmyyyy', label: 'DD/MM/YYYY' },
  { id: 'mmddyyyy', label: 'MM/DD/YYYY' },
  { id: 'iso', label: 'YYYY-MM-DD' },
];

let groupingPref: NumberGroupingPref = 'auto';
let datePref: DateFormatPref = 'ddmmyyyy';

export function setNumberGroupingPref(pref: NumberGroupingPref): void {
  groupingPref = pref;
}

export function getNumberGroupingPref(): NumberGroupingPref {
  return groupingPref;
}

export function setDateFormatPref(pref: DateFormatPref): void {
  datePref = pref;
}

export function getDateFormatPref(): DateFormatPref {
  return datePref;
}

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Format a stored 'YYYY-MM-DD' date for display. Invalid or empty values are
 * returned untouched (never fabricated). No Date object is involved, so the
 * output can never shift across timezones.
 */
export function formatDate(ymd: string | undefined | null, pref: DateFormatPref = datePref): string {
  if (!ymd) return '';
  const m = YMD_RE.exec(ymd);
  if (!m) return ymd;
  const [, y, mo, d] = m;
  switch (pref) {
    case 'ddmmyyyy': return `${d}/${mo}/${y}`;
    case 'mmddyyyy': return `${mo}/${d}/${y}`;
    case 'iso': default: return ymd;
  }
}

/** Locale tag whose Intl grouping matches the requested preference. */
export function localeForGrouping(pref: NumberGroupingPref, isIndianCurrency: boolean): string {
  if (pref === 'indian') return 'en-IN';
  if (pref === 'international') return 'en-US';
  return isIndianCurrency ? 'en-IN' : 'en-US';
}

/**
 * Format a plain number with the preferred grouping. Never changes the
 * underlying amount — display only.
 */
export function formatNumber(value: number, pref: NumberGroupingPref = groupingPref, isIndianCurrency = true): string {
  const n = Number.isFinite(value) ? value : 0;
  try {
    return new Intl.NumberFormat(localeForGrouping(pref, isIndianCurrency)).format(n);
  } catch {
    return String(n);
  }
}
