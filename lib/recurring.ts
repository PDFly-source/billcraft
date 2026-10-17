/**
 * Phase 4 recurring invoices: pure scheduling + materialization logic.
 * No IndexedDB here — callers (repository / useLocalData) own persistence.
 */
import { RecurringSeriesRecord } from '@/types/local';
import { DocumentModel } from '@/types/document';

export type Frequency = RecurringSeriesRecord['frequency'];

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

const FREQUENCY_MONTHS: Record<Frequency, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

/* --------------------------- date helpers ------------------------------ */

/** Parses YYYY-MM-DD into a local Date at midnight (no UTC drift). */
export function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function toYmd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Add calendar months, clamping the day (Jan 31 + 1m = Feb 28/29). */
export function addMonthsYmd(s: string, months: number): string {
  const d = parseYmd(s);
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const daysInTarget = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d.getDate(), daysInTarget));
  return toYmd(target);
}

/** Add days to a YYYY-MM-DD string. */
export function addDaysYmd(s: string, days: number): string {
  const d = parseYmd(s);
  d.setDate(d.getDate() + days);
  return toYmd(d);
}

/** Days between two YYYY-MM-DD strings (b - a), local dates. */
export function daysBetweenYmd(a: string, b: string): number {
  const ms = parseYmd(b).getTime() - parseYmd(a).getTime();
  return Math.round(ms / 86400000);
}

/* ---------------------------- scheduling ------------------------------- */

/** The due date one period after the current one. */
export function nextPeriodDate(series: RecurringSeriesRecord): string {
  return addMonthsYmd(series.nextDueDate, FREQUENCY_MONTHS[series.frequency]);
}

/** True when the series is active and its due date has arrived/passed. */
export function isDue(series: RecurringSeriesRecord, today = toYmd(new Date())): boolean {
  return series.active && !!series.nextDueDate && series.nextDueDate <= today;
}

/** Suggest the first due date for a new series (same day next month). */
export function suggestFirstDue(today = toYmd(new Date())): string {
  return addMonthsYmd(today, 1);
}

/* -------------------------- materialization ---------------------------- */

/**
 * Build a fresh editable document from a series template:
 * - new id, today's issue date, supplied document number
 * - due date keeps the template's payment window (dueDate - date offset)
 * - editor payments and conversion links are cleared
 * - everything else (items, customer, business, style) is copied as-is
 */
export function materializeFromSeries(
  series: RecurringSeriesRecord,
  docNumber: string,
  today = toYmd(new Date()),
): DocumentModel {
  const t = series.document;
  const doc: DocumentModel = structuredClone(t);
  doc.id = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  doc.type = series.type;
  doc.meta.documentNumber = docNumber;
  doc.meta.date = today;
  doc.meta.validUntil = t.meta.validUntil ? addDaysYmd(today, daysBetweenYmd(t.meta.date, t.meta.validUntil)) : '';
  doc.meta.dueDate = t.meta.dueDate
    ? addDaysYmd(today, Math.max(0, daysBetweenYmd(t.meta.date, t.meta.dueDate)))
    : addDaysYmd(today, 30);
  doc.payments = [];
  return doc;
}

/**
 * Post-generation bookkeeping: advance the due date past today (catching up
 * missed periods without back-filling) and record the last generation.
 */
export function advanceAfterGeneration(
  series: RecurringSeriesRecord,
  generatedDocId: string,
  today = toYmd(new Date()),
): RecurringSeriesRecord {
  let next = series.nextDueDate;
  // advance until the due date is in the future again (handles catch-up runs)
  let guard = 0;
  while (next <= today && guard < 1200) {
    next = addMonthsYmd(next, FREQUENCY_MONTHS[series.frequency]);
    guard += 1;
  }
  return {
    ...series,
    nextDueDate: next,
    lastGeneratedId: generatedDocId,
    lastGeneratedDate: today,
  };
}
