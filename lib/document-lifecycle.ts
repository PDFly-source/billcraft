/**
 * Pure document lifecycle helpers (Phase 4.2).
 *
 * A document being edited is a DRAFT; saving it to History finalizes a
 * snapshot. These helpers keep that lifecycle honest without touching
 * storage, so they are unit-testable and shared by editor + save flow.
 */
import { DocumentModel } from '@/types/document';
import { BusinessProfileRecord } from '@/types/local';

/**
 * True only for the untouched default text watermark "DRAFT" that the editor
 * seeds when watermarking is enabled on a brand-new document. A user-typed
 * watermark (even the word DRAFT if they changed position/opacity? no —
 * only the exact default text) is respected as intentional content.
 *
 * Rule: enabled text watermark whose text is exactly "DRAFT"
 * (case/whitespace-insensitive). Logo watermarks are never considered drafts.
 */
export function isDefaultDraftWatermark(doc: DocumentModel): boolean {
  const w = doc.watermark;
  if (!w || !w.enabled) return false;
  if (w.source === 'logo') return false;
  const text = w.text || '';
  return text.trim().toUpperCase() === 'DRAFT';
}

/**
 * The snapshot saved to History (and therefore shown in History / exported
 * PDFs) must never carry the default DRAFT watermark once finalized.
 * Custom watermarks (e.g. "PAID", "COPY") pass through untouched.
 */
export function finalizeDocumentForSave(doc: DocumentModel): DocumentModel {
  if (!isDefaultDraftWatermark(doc)) return doc;
  return { ...doc, watermark: { ...doc.watermark!, enabled: false } };
}

/**
 * Apply the saved business profile to a BRAND-NEW document at creation time
 * (defaults are copied once; later profile edits never mutate existing
 * documents). Payment-terms consistency (Phase 4.2): the profile's default
 * terms feed BOTH `meta.paymentTerms` (the document summary line) and
 * `terms` (the full terms section), so the two can never contradict each
 * other on a fresh document. Explicit per-document edits always win later.
 *
 * The logo/signature image URLs cannot be resolved here (async image store);
 * the caller resolves `profile.logoId` / `profile.signatureId` itself.
 */
export function applyProfileDefaults(
  doc: DocumentModel,
  profile: BusinessProfileRecord
): DocumentModel {
  const next: DocumentModel = {
    ...doc,
    business: {
      ...doc.business,
      name: profile.businessName || doc.business.name,
      tagline: doc.business.tagline,
      phone: profile.phone,
      email: profile.email,
      website: profile.website || doc.business.website,
      address: profile.address || doc.business.address,
      gstin: profile.gstin,
      pan: profile.pan || doc.business.pan,
      state: profile.state || doc.business.state,
      stateCode: profile.stateCode || doc.business.stateCode,
    },
    payment: {
      ...doc.payment,
      bankName: profile.bankName || doc.payment.bankName,
      accountHolder: profile.bankAccountHolder || doc.payment.accountHolder,
      accountNumber: profile.bankAccountNumber || doc.payment.accountNumber,
      ifsc: profile.bankIfsc || doc.payment.ifsc,
      upiId: profile.upiId || doc.payment.upiId,
      notes: profile.paymentInstructions || doc.payment.notes,
    },
    terms: profile.defaultPaymentTerms || doc.terms,
    meta: {
      ...doc.meta,
      paymentTerms: profile.defaultPaymentTerms || doc.meta.paymentTerms,
    },
    tax: { ...doc.tax, gstType: profile.defaultGstType },
  };
  return next;
}
