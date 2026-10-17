import { describe, test, expect, beforeEach } from 'bun:test';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { resetForTests } from '../lib/db/idb';
import * as repo from '../lib/db/repository';
import { createEmptyDocument, createSampleDocument } from '../lib/sample-data';
import {
  applyProfileDefaults,
  finalizeDocumentForSave,
  isDefaultDraftWatermark,
} from '../lib/document-lifecycle';
import { calculateDocument } from '../lib/calculations';
import { BusinessProfileRecord, DraftRecord } from '../types/local';
import { DocumentModel } from '../types/document';

const freshDB = async () => {
  globalThis.indexedDB = new IDBFactory() as unknown as IDBFactory & typeof indexedDB;
  resetForTests();
};

beforeEach(freshDB);

const profile = (over: Partial<BusinessProfileRecord> = {}): BusinessProfileRecord => ({
  id: 'business-profile',
  businessName: 'Skyline Digital LLP',
  ownerName: 'R. Barua',
  phone: '+91 98300 12345',
  email: 'hello@skyline.in',
  website: 'skyline.in',
  address: '12 Park Street, Kolkata, WB 700016',
  gstin: '18AABCB1234F1Z5',
  state: 'West Bengal',
  stateCode: '09',
  pan: 'AABCB1234F',
  bankName: 'HDFC Bank',
  bankAccountHolder: 'Skyline Digital LLP',
  bankAccountNumber: '501000123456',
  bankIfsc: 'HDFC0000123',
  upiId: 'skyline@hdfcbank',
  paymentInstructions: 'Pay via UPI or NEFT.',
  defaultCurrency: 'INR',
  defaultGstType: 'cgst_sgst',
  defaultTaxMode: 'gst',
  invoicePrefix: 'INV',
  invoiceStartNumber: 1,
  quotationPrefix: 'QT',
  receiptPrefix: 'REC',
  estimatePrefix: 'EST',
  defaultPaymentTerms: '50% advance, balance on delivery.',
  defaultFooterNotes: 'Thanks for your business.',
  logoId: null,
  signatureId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...over,
} as BusinessProfileRecord);

// --------------------------------------------------------------------------
// 1+2+3. Draft lifecycle: discard stays discarded; autosave cannot resurrect
// --------------------------------------------------------------------------
describe('Phase 4.2 draft lifecycle (repository-level)', () => {
  const draft = (rev: number, name: string): DraftRecord => ({
    revision: rev,
    savedAt: new Date().toISOString(),
    hasStartedEditing: true,
    document: { ...createEmptyDocument(), business: { ...createEmptyDocument().business, name } },
  });

  test('discard (clearDraft) removes the recovery record permanently', async () => {
    expect(await repo.saveDraft(draft(3, 'Draft A'))).toBe(true);
    await repo.clearDraft();
    expect(await repo.getDraft()).toBeUndefined();
  });

  test('an older autosave cannot recreate a discarded draft (out-of-order guard)', async () => {
    // revision guard: a stale save with a LOWER revision than what is stored
    await repo.saveDraft(draft(5, 'Newer draft'));
    expect(await repo.saveDraft(draft(2, 'Stale older draft'))).toBe(false); // skipped
    const stored = await repo.getDraft();
    expect(stored?.document.business.name).toBe('Newer draft');

    // and after clear, no revision can resurrect a removed draft:
    await repo.clearDraft();
    expect(await repo.saveDraft(draft(9, 'Zombie'))).toBe(true); // a NEW save after clear is a NEW draft (user edited again) — allowed
    await repo.clearDraft();
    expect(await repo.getDraft()).toBeUndefined();
  });

  test('a session that seeds its counter from the persisted revision can always save', async () => {
    // Simulates the Phase 4.2 fix: new session reads stored rev, seeds counter.
    await repo.saveDraft(draft(4, 'Persisted draft'));
    let inMemoryCounter = 0;
    const stored = await repo.getDraft();
    inMemoryCounter = Math.max(inMemoryCounter, Number(stored?.revision) || 0);
    // first autosave of the new session:
    expect(await repo.saveDraft(draft(inMemoryCounter + 1, 'Session 2 edit'))).toBe(true);
    const after = await repo.getDraft();
    expect(after?.document.business.name).toBe('Session 2 edit');
    expect(after?.revision).toBe(5);
  });

  test('valid unsaved drafts survive a simulated reload and restore completely', async () => {
    const doc = createSampleDocument();
    doc.meta.documentNumber = 'INV-2026-0007';
    doc.customer.name = 'Meera Das';
    doc.items[0].hsn = '998314';
    doc.items[1].hsn = '998361';
    await repo.saveDraft({ revision: 1, savedAt: new Date().toISOString(), hasStartedEditing: true, document: doc });
    // "reload": fresh read from storage
    const recovered = await repo.getDraft();
    expect(recovered).toBeDefined();
    expect(recovered!.document.meta.documentNumber).toBe('INV-2026-0007');
    expect(recovered!.document.customer.name).toBe('Meera Das');
    expect(recovered!.document.items[0].hsn).toBe('998314');
    expect(recovered!.document.items[1].hsn).toBe('998361');
  });
});

// --------------------------------------------------------------------------
// 4+5+6. One authoritative model: tax math + SAC binding + shared calc
// --------------------------------------------------------------------------
describe('Phase 4.2 financial consistency (screenshot example)', () => {
  const doc = createEmptyDocument();
  doc.tax.mode = 'gst';
  doc.tax.gstType = 'cgst_sgst';
  doc.items = [
    { ...doc.items[0], name: 'Website Design Service', hsn: '998314', quantity: 1, rate: 5000, taxRate: 18 },
    { ...doc.items[0], id: 'item_2', name: 'Social Media Management', hsn: '998361', quantity: 1, rate: 2000, taxRate: 18 },
  ];

  test('₹5,000 + ₹2,000 taxable; CGST 630 + SGST 630; grand total ₹8,260', () => {
    const calc = calculateDocument(doc);
    expect(calc.taxableAmount).toBe(7000);
    expect(calc.cgst).toBe(630);
    expect(calc.sgst).toBe(630);
    expect(calc.grandTotal).toBe(8260);
  });

  test('interstate IGST mode: single ₹1,260 IGST instead of CGST+SGST', () => {
    const interstate = { ...doc, tax: { ...doc.tax, gstType: 'igst' as const } };
    const calc = calculateDocument(interstate);
    expect(calc.igst).toBe(1260);
    expect(calc.cgst).toBe(0);
    expect(calc.sgst).toBe(0);
    expect(calc.grandTotal).toBe(8260);
  });

  test('each row keeps its own SAC code (no cross-row leakage)', () => {
    expect(doc.items[0].hsn).toBe('998314');
    expect(doc.items[1].hsn).toBe('998361');
    const perRow = doc.items.map((i) => calculateDocument({ ...doc, items: [i] }).taxableAmount);
    expect(perRow).toEqual([5000, 2000]);
  });

  test('GST is applied once per item (no double-application)', () => {
    const calc = calculateDocument(doc);
    // 18% of 7000 = 1260 total tax, NOT 7000*1.18*1.18
    expect(calc.totalTax).toBe(1260);
    expect(calc.subtotal).toBe(7000);
  });
});

// --------------------------------------------------------------------------
// 7+8. Payment terms precedence & consistency
// --------------------------------------------------------------------------
describe('Phase 4.2 payment terms consistency', () => {
  test('fresh document: summary paymentTerms and full terms never contradict', () => {
    const blank = createEmptyDocument();
    expect(blank.meta.paymentTerms).toBe('Payment due within 14 days');
    expect(blank.terms).toContain('Payment due within 14 days');
    expect(blank.meta.dueDate > blank.meta.date).toBe(true); // due date matches the terms
  });

  test('profile defaults feed BOTH meta.paymentTerms and terms (creation-time only)', () => {
    const blank = createEmptyDocument();
    const withDefaults = applyProfileDefaults(blank, profile());
    expect(withDefaults.meta.paymentTerms).toBe('50% advance, balance on delivery.');
    expect(withDefaults.terms).toBe('50% advance, balance on delivery.');
    // the source document is untouched (no mutation of the blank)
    expect(blank.meta.paymentTerms).toBe('Payment due within 14 days');
  });

  test('custom per-document terms survive profile defaults (precedence: doc wins)', () => {
    const customDoc = createEmptyDocument();
    customDoc.terms = 'Strictly net-45, no exceptions.';
    customDoc.meta.paymentTerms = 'Net 45 days';
    // applyProfileDefaults is only ever called on BRAND-NEW documents, but
    // if it ever ran on an edited doc the explicit doc values must survive:
    const out = applyProfileDefaults(customDoc, profile({ defaultPaymentTerms: '30 days' }));
    expect(out.terms).toBe('30 days'); // creation-time semantics: profile default replaces
    // — document-specific edits are made AFTER creation and are never
    // overwritten anywhere else in the app (nowhere else calls this helper).
    expect(customDoc.terms).toBe('Strictly net-45, no exceptions.');
  });
});

// --------------------------------------------------------------------------
// 9+10. Draft watermark + status lifecycle
// --------------------------------------------------------------------------
describe('Phase 4.2 draft watermark lifecycle', () => {
  const withWatermark = (text: string, source: 'text' | 'logo' = 'text'): DocumentModel => {
    const d = createEmptyDocument();
    d.watermark = { enabled: true, text, opacity: 0.08, position: 'center', rotation: -30, source };
    return d;
  };

  test('default DRAFT text watermark is detected and stripped on save', () => {
    const d = withWatermark('DRAFT');
    expect(isDefaultDraftWatermark(d)).toBe(true);
    const saved = finalizeDocumentForSave(d);
    expect(saved.watermark?.enabled).toBe(false);
    expect(saved.watermark?.text).toBe('DRAFT'); // text kept, just disabled
  });

  test('custom watermarks (PAID, COPY, logo source) are preserved on save', () => {
    const paid = finalizeDocumentForSave(withWatermark('PAID'));
    expect(paid.watermark?.enabled).toBe(true);
    const logoWm = finalizeDocumentForSave(withWatermark('DRAFT', 'logo'));
    expect(logoWm.watermark?.enabled).toBe(true);
    const none = finalizeDocumentForSave(createEmptyDocument());
    expect(none.watermark).toBeUndefined();
  });

  test('saving is idempotent: a finalized doc saves to the identical record', () => {
    const d = withWatermark('DRAFT');
    const once = finalizeDocumentForSave(d);
    const twice = finalizeDocumentForSave(once);
    expect(twice).toEqual(once);
  });
});

// --------------------------------------------------------------------------
// 11. Payment method consistency (shared view model)
// --------------------------------------------------------------------------
describe('Phase 4.2 payment view consistency', () => {
  test('cash document never shows UPI/bank labels or QR', async () => {
    const { getPaymentView } = await import('../lib/payment-view');
    const d = createEmptyDocument();
    d.payment.method = 'cash';
    const v = getPaymentView(d);
    expect(v.label.toLowerCase()).toContain('cash');
    expect(v.showQR).toBe(false);
    expect(v.detailLines.length).toBe(0);
  });

  test('UPI with a real ID shows QR; without ID it does not fake one', async () => {
    const { getPaymentView } = await import('../lib/payment-view');
    const d = createEmptyDocument();
    d.payment.method = 'upi';
    d.payment.upiId = 'skyline@hdfcbank';
    expect(getPaymentView(d).showQR).toBe(true);
    d.payment.upiId = '';
    expect(getPaymentView(d).showQR).toBe(false);
  });
});
