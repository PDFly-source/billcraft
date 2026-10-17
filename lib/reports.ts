/**
 * Phase 4 reports: pure, dependency-free aggregations over the saved local
 * documents. Everything here is testable without IndexedDB — callers pass
 * the SavedDocument[] they already have from useLocalData().
 *
 * Sales-reporting rules (mirrors lib/finance.ts):
 *  - Revenue docs   = invoices + debit notes (sales adjustments up)
 *  - Credit notes   reduce revenue/tax (sales returns)
 *  - Cancelled docs never count
 *  - Quotations/estimates/POs/challans are NOT sales
 *  - Money is aggregated in paise (amountMinor) and converted for display
 *    by the caller to avoid float drift.
 */
import { SavedDocument } from '@/types/local';

export interface DateRange {
  from?: string; // YYYY-MM-DD inclusive
  to?: string;   // YYYY-MM-DD inclusive
}

/** Sign of a document for revenue purposes: +1 invoice/debit note, -1 credit note. */
function revenueSign(doc: SavedDocument): number {
  if (doc.type === 'credit_note') return -1;
  return 1;
}

/** Docs that belong in sales reports: invoices + credit/debit notes, non-cancelled. */
export function revenueDocs(docs: SavedDocument[], range: DateRange = {}): SavedDocument[] {
  return docs.filter((d) => {
    if (d.type !== 'invoice' && d.type !== 'credit_note' && d.type !== 'debit_note') return false;
    if (d.status === 'cancelled') return false;
    if (range.from && d.issueDate < range.from) return false;
    if (range.to && d.issueDate > range.to) return false;
    return true;
  });
}

export interface ClientRevenueRow {
  clientId: string | null;
  name: string;
  docCount: number;
  invoicedMinor: number;   // net revenue (credit notes subtract)
  paidMinor: number;
  outstandingMinor: number;
}

/** Revenue grouped by client (unlinked docs fall under "(No client)"). */
export function revenueByClient(docs: SavedDocument[]): ClientRevenueRow[] {
  const rows = new Map<string, ClientRevenueRow>();
  for (const d of revenueDocs(docs)) {
    const key = d.clientId || `name:${d.clientName.toLowerCase()}`;
    const name = d.clientName || '(No client)';
    let row = rows.get(key);
    if (!row) {
      row = { clientId: d.clientId, name, docCount: 0, invoicedMinor: 0, paidMinor: 0, outstandingMinor: 0 };
      rows.set(key, row);
    }
    row.docCount += 1;
    row.invoicedMinor += revenueSign(d) * d.totalMinor;
    // payments on cancelled/credited docs still count as collected money
    row.paidMinor += d.amountPaidMinor;
  }
  const out = Array.from(rows.values());
  for (const r of out) r.outstandingMinor = r.invoicedMinor - r.paidMinor;
  return out.sort((a, b) => b.invoicedMinor - a.invoicedMinor);
}

export interface GstRateRow {
  rate: number;             // tax rate % (0, 5, 12, 18, 28, ...)
  taxableMinor: number;      // net of credit notes
  cgstMinor: number;
  sgstMinor: number;
  igstMinor: number;
  invoiceCount: number;
}

export interface GstSummary {
  taxableMinor: number;
  cgstMinor: number;
  sgstMinor: number;
  igstMinor: number;
  totalTaxMinor: number;
  b2bCount: number;          // docs with a customer GSTIN
  b2cCount: number;          // docs without
  byRate: GstRateRow[];
  creditNoteMinor: number;   // total value of credit notes (absolute)
  invoiceMinor: number;      // total value of invoices + debit notes
}

/** Item-level GST extraction. Returns per-rate aggregates from calc + items.
 *  A doc's calc gives CGST/SGST/IGST totals; items give the rate split. */
export function gstSummary(docs: SavedDocument[]): GstSummary {
  const s: GstSummary = {
    taxableMinor: 0, cgstMinor: 0, sgstMinor: 0, igstMinor: 0, totalTaxMinor: 0,
    b2bCount: 0, b2cCount: 0, byRate: [], creditNoteMinor: 0, invoiceMinor: 0,
  };
  const rates = new Map<number, GstRateRow>();
  const minor = (n: number) => Math.round(n * 100);

  for (const d of revenueDocs(docs)) {
    const sign = revenueSign(d);
    const gstin = (d.document.customer?.gstin || '').trim();
    if (gstin) s.b2bCount += 1; else s.b2cCount += 1;

    if (d.type === 'credit_note') s.creditNoteMinor += d.totalMinor;
    else s.invoiceMinor += d.totalMinor;

    s.taxableMinor += sign * minor(d.calc.taxableAmount);
    s.cgstMinor += sign * minor(d.calc.cgst);
    s.sgstMinor += sign * minor(d.calc.sgst);
    s.igstMinor += sign * minor(d.calc.igst);

    // Per-rate split from items (rate x taxable share). Approximate: use the
    // doc-level IGST flag to decide intra vs inter state per item.
    const isInter = minor(d.calc.igst) > 0;
    for (const it of d.document.items || []) {
      const rate = Number(it.taxRate) || 0;
      const qty = Number(it.quantity) || 0;
      const rateNum = Number(it.rate) || 0;
      const gross = qty * rateNum;
      const disc = it.discountType === 'percent'
        ? gross * ((Number(it.discountValue) || 0) / 100)
        : Math.min(gross, Number(it.discountValue) || 0);
      const taxable = Math.max(0, gross - disc);
      let row = rates.get(rate);
      if (!row) { row = { rate, taxableMinor: 0, cgstMinor: 0, sgstMinor: 0, igstMinor: 0, invoiceCount: 0 }; rates.set(rate, row); }
      row.invoiceCount += 1;
      row.taxableMinor += sign * minor(taxable);
      const taxAmt = taxable * (rate / 100);
      if (isInter) row.igstMinor += sign * minor(taxAmt);
      else { row.cgstMinor += sign * minor(taxAmt / 2); row.sgstMinor += sign * minor(taxAmt / 2); }
    }
  }
  s.totalTaxMinor = s.cgstMinor + s.sgstMinor + s.igstMinor;
  s.byRate = Array.from(rates.values()).sort((a, b) => a.rate - b.rate);
  return s;
}

export interface TopItemRow {
  name: string;
  qty: number;
  revenueMinor: number; // gross line amount (taxable + tax), net of credit notes
  kind: 'product' | 'service' | 'other';
}

/** Best-selling items by revenue across the range. */
export function topItems(docs: SavedDocument[], limit = 10): TopItemRow[] {
  const rows = new Map<string, TopItemRow>();
  const minor = (n: number) => Math.round(n * 100);
  for (const d of revenueDocs(docs)) {
    const sign = revenueSign(d);
    const taxFactor = minor(d.calc.taxableAmount) > 0
      ? (minor(d.calc.rawTotal) + minor(d.calc.totalTax)) / Math.max(1, minor(d.calc.taxableAmount))
      : 1;
    for (const it of d.document.items || []) {
      const key = (it.name || '').trim() || '(unnamed)';
      let row = rows.get(key);
      if (!row) {
        row = { name: key, qty: 0, revenueMinor: 0, kind: it.kind === 'product' || it.kind === 'service' ? it.kind : 'other' };
        rows.set(key, row);
      }
      const qty = Number(it.quantity) || 0;
      const rateNum = Number(it.rate) || 0;
      const gross = qty * rateNum;
      const disc = it.discountType === 'percent'
        ? gross * ((Number(it.discountValue) || 0) / 100)
        : Math.min(gross, Number(it.discountValue) || 0);
      const taxable = Math.max(0, gross - disc);
      row.qty += sign * qty;
      row.revenueMinor += sign * minor(taxable * taxFactor);
    }
  }
  return Array.from(rows.values()).sort((a, b) => b.revenueMinor - a.revenueMinor).slice(0, limit);
}

/* ----------------------------- CSV export ------------------------------ */

/** RFC-4180-ish CSV field escaping (quotes doubled, wrapped when needed). */
export function csvField(v: string | number): string {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvLine(fields: (string | number)[]): string {
  return fields.map(csvField).join(',');
}

/** Trigger a client-side CSV download (no network — stays local-first). */
export function downloadCsv(filename: string, rows: string[]): void {
  const blob = new Blob(['\ufeff' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * GSTR-1-style export (offline summary aid — NOT a filing tool).
 * Two sections: B2B (registered customers) and B2CS-lite (unregistered),
 * with one row per document. Values are net of credit notes only in the
 * totals helpers — CSV rows show each document as issued.
 */
export function toGstr1Csv(docs: SavedDocument[]): string[] {
  const rows: string[] = [];
  const money = (n: number) => (n / 100).toFixed(2);
  const minor = (n: number) => Math.round(n * 100);

  rows.push(csvLine(['BillCraft offline export — GSTR-1 style summary (not a government filing)']));
  rows.push(csvLine(['Generated', new Date().toISOString()]));
  rows.push('');

  const rev = revenueDocs(docs);
  const b2b = rev.filter((d) => (d.document.customer?.gstin || '').trim());
  const b2c = rev.filter((d) => !(d.document.customer?.gstin || '').trim());

  rows.push(csvLine(['B2B INVOICES (registered customers)']));
  rows.push(csvLine([
    'GSTIN/UIN of receiver', 'Receiver name', 'Invoice number', 'Invoice date',
    'Invoice value', 'Place of supply', 'Reverse charge', 'Applicable tax rate',
    'Invoice type', 'Taxable value', 'CGST', 'SGST', 'IGST',
  ]));
  for (const d of b2b) {
    const rates = Array.from(new Set((d.document.items || []).map((i) => Number(i.taxRate) || 0))).sort((a, b) => a - b);
    const pos = d.document.meta?.placeOfSupply || '';
    rows.push(csvLine([
      (d.document.customer?.gstin || '').trim(),
      d.clientName || '',
      d.documentNumber,
      d.issueDate,
      money(d.totalMinor),
      pos,
      'N',
      rates.join(' | '),
      d.type === 'invoice' ? 'Regular' : d.type === 'credit_note' ? 'Credit Note' : 'Debit Note',
      money(minor(d.calc.taxableAmount)),
      money(minor(d.calc.cgst)),
      money(minor(d.calc.sgst)),
      money(minor(d.calc.igst)),
    ]));
  }
  rows.push('');

  rows.push(csvLine(['B2C (unregistered customers)']));
  rows.push(csvLine([
    'Type', 'Document number', 'Date', 'Place of supply', 'Document value',
    'Taxable value', 'CGST', 'SGST', 'IGST',
  ]));
  for (const d of b2c) {
    rows.push(csvLine([
      d.type === 'invoice' ? 'Invoice' : d.type === 'credit_note' ? 'Credit Note' : 'Debit Note',
      d.documentNumber,
      d.issueDate,
      d.document.meta?.placeOfSupply || '',
      money(d.totalMinor),
      money(minor(d.calc.taxableAmount)),
      money(minor(d.calc.cgst)),
      money(minor(d.calc.sgst)),
      money(minor(d.calc.igst)),
    ]));
  }
  return rows;
}

/** Client-revenue CSV (revenueByClient rows as a spreadsheet). */
export function toClientRevenueCsv(rows: ClientRevenueRow[]): string[] {
  const money = (n: number) => (n / 100).toFixed(2);
  const out: string[] = [];
  out.push(csvLine(['Client', 'Documents', 'Revenue', 'Collected', 'Outstanding']));
  for (const r of rows) {
    out.push(csvLine([r.name, r.docCount, money(r.invoicedMinor), money(r.paidMinor), money(r.outstandingMinor)]));
  }
  return out;
}
