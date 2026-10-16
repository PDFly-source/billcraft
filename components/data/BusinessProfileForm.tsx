'use client';

/**
 * Settings > Business Profile: the user's own business details, prefilled into
 * new documents. Optional — BillCraft works without one. Images are resized
 * locally and stored in IndexedDB, never localStorage.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useLocalData } from '@/hooks/useLocalData';
import { BusinessProfileRecord } from '@/types/local';
import { getImage, saveImage, deleteImage, DEFAULT_PROFILE } from '@/lib/db/repository';
import { Building2, Save, Image as ImageIcon, Trash2, AlertTriangle, Check } from 'lucide-react';

/** Resize + compress an image file to a bounded square/landscape data URL. */
async function resizeImage(file: File, maxDim: number, quality = 0.85): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result as string);
    fr.onerror = () => rej(new Error('Could not read file'));
    fr.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('Not a valid image file'));
    i.src = dataUrl;
  });
  if (img.width > 4000 || img.height > 4000) throw new Error('Image is too large');
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/png', quality); // png keeps transparency for logos
}

export const BusinessProfileForm: React.FC<{ onShowToast: (m: string) => void }> = ({ onShowToast }) => {
  const { profile, saveProfile, ready } = useLocalData();
  const [form, setForm] = useState<BusinessProfileRecord>(DEFAULT_PROFILE);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [sigUrl, setSigUrl] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);
  const sigInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ready && profile) {
      setForm({ ...DEFAULT_PROFILE, ...profile });
      setDirty(false);
      Promise.all([
        profile.logoId ? getImage(profile.logoId) : Promise.resolve(''),
        profile.signatureId ? getImage(profile.signatureId) : Promise.resolve(''),
      ]).then(([l, s]) => { setLogoUrl(l || ''); setSigUrl(s || ''); });
    }
  }, [ready, profile]);

  const set = (k: keyof BusinessProfileRecord, v: string | number) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };

  const handleLogo = async (file: File) => {
    try {
      if (file.size > 8 * 1024 * 1024) throw new Error('Image is larger than 8 MB');
      const url = await resizeImage(file, 512);
      const id = `img-logo-${Date.now()}`;
      await saveImage(id, url);
      setLogoUrl(url);
      setForm((f) => ({ ...f, logoId: id }));
      setDirty(true);
      onShowToast('Logo ready — press Save profile to keep it');
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'Logo upload failed');
    }
  };

  const removeLogo = async () => {
    if (form.logoId) await deleteImage(form.logoId);
    setLogoUrl('');
    setForm((f) => ({ ...f, logoId: null }));
    setDirty(true);
  };

  const handleSig = async (file: File) => {
    try {
      if (file.size > 8 * 1024 * 1024) throw new Error('Image is larger than 8 MB');
      const url = await resizeImage(file, 384);
      const id = `img-sig-${Date.now()}`;
      await saveImage(id, url);
      setSigUrl(url);
      setForm((f) => ({ ...f, signatureId: id }));
      setDirty(true);
      onShowToast('Signature ready — press Save profile to keep it');
    } catch (err) {
      onShowToast(err instanceof Error ? err.message : 'Signature upload failed');
    }
  };

  const removeSig = async () => {
    if (form.signatureId) await deleteImage(form.signatureId);
    setSigUrl('');
    setForm((f) => ({ ...f, signatureId: null }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveProfile({ ...form, businessName: form.businessName.trim() });
      setDirty(false);
      onShowToast('Business profile saved — new documents will use these details');
    } catch (err) {
      onShowToast(`Save failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const txt = (k: keyof BusinessProfileRecord, label: string, ph?: string, area = false) => (
    <label className="block">
      <span className="lab">{label}</span>
      {area ? (
        <textarea rows={2} className="w-full rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-[#593C8F]" value={form[k] as string} placeholder={ph} onChange={(e) => set(k, e.target.value)} />
      ) : (
        <input className="w-full rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-3 py-2 text-[12px] outline-none focus:ring-2 focus:ring-[#593C8F]" value={form[k] as string} placeholder={ph} onChange={(e) => set(k, e.target.value)} />
      )}
    </label>
  );

  return (
    <div className="space-y-3">
      {/* preview */}
      <div className="card p-3 row sp items-start">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Business logo preview" className="w-12 h-12 rounded-xl object-contain border border-[#E7E0EE] dark:border-[#302B38] bg-white" />
          ) : (
            <span className="w-12 h-12 rounded-xl bg-[#F1ECF8] dark:bg-[#281E36] row inline-flex justify-center items-center"><Building2 className="w-5 h-5 text-[#B9A8D6]" /></span>
          )}
          <div className="min-w-0">
            <div className="text-[12px] font-bold text-[#17151F] dark:text-[#F8F5FC] truncate">{form.businessName || 'Your business (optional)'}</div>
            <div className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0] truncate">{[form.phone, form.email].filter(Boolean).join(' • ') || 'Add details below'}</div>
            {sigUrl && <div className="text-[9px] text-[#2E7D5B] dark:text-[#6FBF9E] mt-0.5">Signature on file</div>}
          </div>
        </div>
        <div className="row shrink-0" style={{ gap: 4 }}>
          <button type="button" onClick={() => logoInput.current?.click()} className="btn o" style={{ gap: 4 }}><ImageIcon className="w-3 h-3" />{logoUrl ? 'Replace' : 'Logo'}</button>
          {logoUrl && <button type="button" onClick={() => void removeLogo()} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition" aria-label="Remove logo"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>}
        </div>
        <input ref={logoInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" aria-label="Upload logo" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleLogo(f); e.target.value = ''; }} />
      </div>

      {txt('businessName', 'Business / company name', 'Acme Solutions Pvt Ltd')}
      {txt('ownerName', 'Owner / contact name', 'Ravi Kumar')}
      <div className="grid grid-cols-2 gap-3">
        {txt('phone', 'Phone', '98765 43210')}
        {txt('email', 'Email', 'ravi@acme.in')}
      </div>
      {txt('address', 'Business address', '12 MG Road, Bengaluru 560001', true)}
      <div className="grid grid-cols-2 gap-3">
        {txt('gstin', 'GSTIN', '29AABCU9603R1ZM')}
        {txt('pan', 'PAN', 'AABCU9603R')}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {txt('state', 'State', 'Karnataka')}
        {txt('stateCode', 'State code', '29')}
      </div>

      <div className="card p-3 space-y-2">
        <div className="text-[10.5px] font-bold text-[#17151F] dark:text-[#F8F5FC]">Bank details (for invoices)</div>
        {txt('bankAccountHolder', 'Account holder name')}
        {txt('bankName', 'Bank name', 'HDFC Bank')}
        <div className="grid grid-cols-2 gap-3">
          {txt('bankAccountNumber', 'Account number')}
          {txt('bankIfsc', 'IFSC code')}
        </div>
        {txt('upiId', 'UPI ID (optional)', 'name@upi')}
        {txt('paymentInstructions', 'Payment instructions', 'Pay via UPI or NEFT within 15 days', true)}
      </div>

      <div className="card p-3 space-y-2">
        <div className="text-[10.5px] font-bold text-[#17151F] dark:text-[#F8F5FC]">Document defaults</div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="lab">Default currency</span>
            <select className="w-full rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-2 py-1.5 text-[11px]" value={form.defaultCurrency} onChange={(e) => set('defaultCurrency', e.target.value)}>
              {['INR', 'USD', 'EUR', 'GBP', 'AED', 'AUD', 'CAD', 'SGD'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="block"><span className="lab">GST type</span>
            <select className="w-full rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-2 py-1.5 text-[11px]" value={form.defaultGstType} onChange={(e) => set('defaultGstType', e.target.value)}>
              <option value="cgst_sgst">CGST + SGST (intra-state)</option>
              <option value="igst">IGST (inter-state)</option>
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="lab">Invoice prefix</span>
            <input className="w-full rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-2 py-1.5 text-[11px]" value={form.invoicePrefix} onChange={(e) => set('invoicePrefix', e.target.value.toUpperCase())} />
          </label>
          <label className="block"><span className="lab">Starting number</span>
            <input type="number" min="1" className="w-full rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-2 py-1.5 text-[11px]" value={form.invoiceStartNumber} onChange={(e) => set('invoiceStartNumber', Math.max(1, parseInt(e.target.value) || 1))} />
          </label>
        </div>
        {txt('defaultPaymentTerms', 'Default payment terms', 'Payment due within 15 days')}
        {txt('defaultFooterNotes', 'Default footer note', 'Thank you for your business!', true)}
      </div>

      {/* signature */}
      <div className="card p-3 row sp">
        <div>
          <div className="text-[10.5px] font-bold text-[#17151F] dark:text-[#F8F5FC]">Signature image (optional)</div>
          {sigUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={sigUrl} alt="Signature preview" className="mt-1 h-10 object-contain" />
          ) : (
            <div className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0] mt-0.5">A scanned or drawn signature added to documents.</div>
          )}
        </div>
        <div className="row shrink-0" style={{ gap: 4 }}>
          <button type="button" onClick={() => sigInput.current?.click()} className="btn o" style={{ gap: 4 }}><ImageIcon className="w-3 h-3" />{sigUrl ? 'Replace' : 'Upload'}</button>
          {sigUrl && <button type="button" onClick={() => void removeSig()} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition" aria-label="Remove signature"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>}
        </div>
        <input ref={sigInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" aria-label="Upload signature" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleSig(f); e.target.value = ''; }} />
      </div>

      <button type="button" onClick={() => void handleSave()} disabled={saving} className="btn w-full justify-center inline-flex items-center gap-1.5 disabled:opacity-60">
        {saving ? 'Saving…' : dirty ? <><Save className="w-3.5 h-3.5" /> Save profile</> : <><Check className="w-3.5 h-3.5" /> Profile saved</>}
      </button>
      <p className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0] text-center">
        Saved documents keep their own snapshot of your details at issue time — editing the profile never rewrites old documents.
      </p>
      {profile === null && !dirty && (
        <div className="card row p-2.5 gap-2 items-start">
          <AlertTriangle className="w-3.5 h-3.5 text-[#B07C1E] shrink-0 mt-0.5" />
          <span className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0]">A profile is not required — BillCraft works fully without one.</span>
        </div>
      )}
    </div>
  );
};
