'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { PaymentDetails, PaymentMethod, DocumentPayment } from '@/types/document';
import { generateUPIString, generateQRCodeDataUrl } from '@/lib/upi';
import { validatePaymentLink, isValidUpiId } from '@/lib/validation';
import { paymentSummary, validateDocPayment, isDuplicatePayment } from '@/lib/finance';
import { listBankAccounts, saveBankAccount, deleteBankAccount } from '@/lib/db/repository';
import { BankAccountRecord } from '@/types/local';
import { QrCode, Landmark, Banknote, CreditCard, FileCheck, Layers, Link2, Copy, Check, Plus, Trash2, Save } from 'lucide-react';
import Image from 'next/image';

interface PaymentEditorProps {
  payment: PaymentDetails;
  grandTotal: number;
  businessName: string;
  /** paise-precise grand total (falls back to rounding grandTotal) */
  grandTotalMinor?: number;
  currencySymbol?: string;
  onChange: (updated: Partial<PaymentDetails>) => void;
  /** Payments recorded against THIS document (advance + additional). */
  payments?: DocumentPayment[];
  onPaymentsChange?: (payments: DocumentPayment[]) => void;
  /** Only invoice-family documents track collected payments. */
  paymentsEnabled?: boolean;
  onShowToast?: (msg: string) => void;
}

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'upi', label: 'UPI / QR', icon: QrCode },
  { id: 'bank', label: 'Bank Wire', icon: Landmark },
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'card', label: 'Card', icon: CreditCard },
  { id: 'cheque', label: 'Cheque', icon: FileCheck },
  { id: 'other', label: 'Other', icon: Layers },
];

const fmt = (minor: number) => (minor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const PaymentEditor: React.FC<PaymentEditorProps> = ({
  payment,
  grandTotal,
  grandTotalMinor,
  currencySymbol = '₹',
  businessName,
  onChange,
  payments = [],
  onPaymentsChange,
  paymentsEnabled = false,
  onShowToast,
}) => {
  const [qrPreview, setQrPreview] = useState<string>('');
  const [accounts, setAccounts] = useState<BankAccountRecord[]>([]);
  const [linkCopied, setLinkCopied] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);

  // ---- payments panel state ----
  const [pAmount, setPAmount] = useState('');
  const [pDate, setPDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [pMethod, setPMethod] = useState<PaymentMethod>('upi');
  const [pRef, setPRef] = useState('');
  const [pError, setPError] = useState<string | null>(null);

  const totalMinor = useMemo(
    () => (typeof grandTotalMinor === 'number' && isFinite(grandTotalMinor) ? Math.round(grandTotalMinor) : Math.round(grandTotal * 100)),
    [grandTotalMinor, grandTotal],
  );
  const summary = paymentSummary(totalMinor, payments);

  useEffect(() => {
    void listBankAccounts().then(setAccounts);
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (payment.method === 'upi' && payment.upiId) {
      const uri = generateUPIString({
        upiId: payment.upiId,
        payeeName: payment.upiPayeeName || businessName,
        amount: grandTotal,
      });
      generateQRCodeDataUrl(uri).then((url) => {
        if (isMounted) setQrPreview(url);
      });
    } else {
      Promise.resolve().then(() => {
        if (isMounted) setQrPreview('');
      });
    }
    return () => {
      isMounted = false;
    };
  }, [payment.method, payment.upiId, payment.upiPayeeName, businessName, grandTotal]);

  const upiInvalid = payment.method === 'upi' && payment.upiId.trim() !== '' && !isValidUpiId(payment.upiId);
  const linkCheck = validatePaymentLink(payment.paymentLink || '');
  const linkInvalid = !linkCheck.valid;

  const applyAccount = (acc: BankAccountRecord) => {
    onChange({
      bankName: acc.bankName,
      accountHolder: acc.accountHolder,
      accountNumber: acc.accountNumber,
      ifsc: acc.ifsc,
      branch: acc.branch,
      notes: acc.paymentInstructions || payment.notes,
    });
    onShowToast?.(`Loaded bank account "${acc.nickname}" into this document`);
  };

  const saveCurrentAccount = async () => {
    if (!payment.bankName && !payment.accountNumber) {
      onShowToast?.('Fill bank name or account number first');
      return;
    }
    const nickname = window.prompt('Nickname for this bank account (e.g. "HDFC Current")', payment.bankName || 'My Account');
    if (nickname === null) return;
    setSavingAccount(true);
    try {
      const saved = await saveBankAccount({
        nickname: (nickname || 'My Account').trim() || 'My Account',
        accountHolder: payment.accountHolder,
        bankName: payment.bankName,
        accountNumber: payment.accountNumber,
        ifsc: payment.ifsc,
        branch: payment.branch,
        paymentInstructions: payment.notes,
      });
      setAccounts(await listBankAccounts());
      onShowToast?.(`Bank account "${saved.nickname}" saved locally`);
    } catch {
      onShowToast?.('Could not save bank account (storage error)');
    } finally {
      setSavingAccount(false);
    }
  };

  const removeAccount = async (acc: BankAccountRecord) => {
    if (!window.confirm(`Delete saved bank account "${acc.nickname}"?\n\nDocuments already created keep their own bank details — only the saved account is removed.`)) return;
    await deleteBankAccount(acc.id);
    setAccounts(await listBankAccounts());
    onShowToast?.('Bank account deleted');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText((payment.paymentLink || '').trim());
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
    } catch {
      onShowToast?.('Copy failed — long-press the link to copy manually');
    }
  };

  // ---- payments (advance / additional) ----
  const addPayment = () => {
    setPError(null);
    if (!onPaymentsChange) return;
    const amount = parseFloat(pAmount);
    const check = validateDocPayment(totalMinor, payments, amount);
    if (!check.valid) { setPError(check.error || 'Invalid payment'); return; }
    if (isDuplicatePayment(payments, check.amountMinor!, pDate, pRef.trim())) {
      setPError('This payment (same amount, date and reference) is already recorded');
      return;
    }
    const rec: DocumentPayment = {
      id: `pay_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      date: pDate,
      amountMinor: check.amountMinor!,
      method: pMethod,
      reference: pRef.trim(),
    };
    onPaymentsChange([...payments, rec]);
    setPAmount('');
    setPRef('');
  };

  const removePayment = (id: string) => {
    if (!onPaymentsChange) return;
    const p = payments.find((x) => x.id === id);
    if (!p) return;
    if (!window.confirm(`Remove the recorded payment of ${currencySymbol}${fmt(p.amountMinor)} dated ${p.date}?`)) return;
    onPaymentsChange(payments.filter((x) => x.id !== id));
  };

  return (
    <div id="payment-section" className="space-y-4">
      {/* Method selector */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          Primary Payment Method
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {PAYMENT_METHODS.map((m) => {
            const Icon = m.icon;
            const isSelected = payment.method === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onChange({ method: m.id })}
                aria-pressed={isSelected}
                className={`py-2 px-2 rounded-lg border text-center flex flex-col items-center gap-1 transition ${
                  isSelected
                    ? 'bg-[#593C8F] text-white border-[#593C8F] shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[11px] font-medium">{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* UPI Details & Live QR preview */}
      {payment.method === 'upi' && (
        <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="flex-1 w-full space-y-3">
              <div>
                <label htmlFor="upi-id-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  UPI ID (VPA) <span className="text-rose-500">*</span>
                </label>
                <input
                  id="upi-id-input"
                  type="text"
                  value={payment.upiId}
                  onChange={(e) => onChange({ upiId: e.target.value })}
                  placeholder="e.g. username@okhdfcbank, business@upi"
                  aria-invalid={upiInvalid}
                  className={`w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-2 ${
                    upiInvalid
                      ? 'border-rose-400 focus:ring-rose-400 text-rose-700 dark:text-rose-300'
                      : 'border-slate-200 dark:border-slate-700 focus:ring-[#593C8F]'
                  }`}
                />
                {upiInvalid && (
                  <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400" role="alert">
                    Enter a valid UPI ID (e.g. name@okhdfcbank)
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="upi-payee-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payee Display Name
                </label>
                <input
                  id="upi-payee-input"
                  type="text"
                  value={payment.upiPayeeName}
                  onChange={(e) => onChange({ upiPayeeName: e.target.value })}
                  placeholder={businessName || 'Business Name'}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="showUPIQR"
                  type="checkbox"
                  checked={payment.showUPIQR}
                  onChange={(e) => onChange({ showUPIQR: e.target.checked })}
                  className="rounded text-[#593C8F] focus:ring-[#593C8F]"
                />
                <label htmlFor="showUPIQR" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  Display printable QR code on document
                </label>
              </div>
              <p className="text-[10px] text-slate-400">
                A UPI QR lets the payer scan and pay — it is a payment <b>request</b>, not proof that payment succeeded.
              </p>
            </div>

            {/* Live QR Preview Box */}
            <div className="w-full sm:w-36 text-center bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                Live QR Preview
              </span>
              {qrPreview && payment.showUPIQR ? (
                <div className="relative w-24 h-24 mx-auto">
                  <Image src={qrPreview} alt="Live UPI QR" fill className="object-contain" referrerPolicy="no-referrer" unoptimized />
                </div>
              ) : (
                <div className="w-24 h-24 mx-auto border-2 border-dashed border-slate-200 dark:border-slate-800 rounded flex items-center justify-center text-slate-300 dark:text-slate-600">
                  <QrCode className="w-8 h-8 opacity-40" />
                </div>
              )}
              <span className="text-[10px] text-slate-400 block mt-1">100% Client-side</span>
            </div>
          </div>
        </div>
      )}

      {/* Bank Details + saved accounts */}
      {(payment.method === 'bank' || payment.method === 'other') && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
          {/* Saved accounts quick-apply */}
          {accounts.length > 0 && (
            <div>
              <label htmlFor="saved-account-select" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Load a saved bank account (stored only on this device)
              </label>
              <div className="flex gap-2">
                <select
                  id="saved-account-select"
                  value=""
                  onChange={(e) => {
                    const acc = accounts.find((a) => a.id === e.target.value);
                    if (acc) applyAccount(acc);
                  }}
                  className="flex-1 px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value="">Choose account…</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nickname} — {a.bankName} {a.accountNumber ? `•••• ${a.accountNumber.slice(-4)}` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={saveCurrentAccount}
                  disabled={savingAccount}
                  title="Save the details below as a reusable account"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-[#593C8F] dark:text-[#A8D5BA] border border-[#593C8F]/40 dark:border-[#7B5BB8]/40 rounded-lg hover:bg-[#593C8F]/10 dark:hover:bg-[#7B5BB8]/20 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" /> Save current
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {accounts.map((a) => (
                  <span key={a.id} className="inline-flex items-center gap-1 text-[10px] font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full pl-2 pr-1 py-0.5">
                    <Landmark className="w-3 h-3 text-slate-400" />
                    {a.nickname}
                    <button
                      type="button"
                      onClick={() => removeAccount(a)}
                      aria-label={`Delete saved account ${a.nickname}`}
                      className="p-0.5 rounded-full text-slate-400 hover:text-rose-500"
                      title="Delete saved account"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="bank-name-input" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Bank Name
              </label>
              <input
                id="bank-name-input"
                type="text"
                value={payment.bankName}
                onChange={(e) => onChange({ bankName: e.target.value })}
                placeholder="e.g. HDFC Bank, Chase, Barclays"
                className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label htmlFor="bank-holder-input" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Account Holder Name
              </label>
              <input
                id="bank-holder-input"
                type="text"
                value={payment.accountHolder}
                onChange={(e) => onChange({ accountHolder: e.target.value })}
                placeholder={businessName || 'Account Holder'}
                className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="bank-number-input" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Account Number / IBAN
              </label>
              <input
                id="bank-number-input"
                type="text"
                value={payment.accountNumber}
                onChange={(e) => onChange({ accountNumber: e.target.value })}
                placeholder="000000000000"
                className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label htmlFor="bank-ifsc-input" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                IFSC / SWIFT / Sort Code
              </label>
              <input
                id="bank-ifsc-input"
                type="text"
                value={payment.ifsc}
                onChange={(e) => onChange({ ifsc: e.target.value.toUpperCase() })}
                placeholder="HDFC0001234"
                className="w-full px-2.5 py-1.5 text-xs font-mono uppercase bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label htmlFor="bank-branch-input" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Branch Name
              </label>
              <input
                id="bank-branch-input"
                type="text"
                value={payment.branch}
                onChange={(e) => onChange({ branch: e.target.value })}
                placeholder="e.g. Central City Branch"
                className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* External payment link */}
      <div className="p-4 rounded-xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 space-y-2">
        <label htmlFor="payment-link-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          Payment Link (optional — e.g. your UPI/merchant payment page)
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
            <input
              id="payment-link-input"
              type="url"
              inputMode="url"
              value={payment.paymentLink || ''}
              onChange={(e) => onChange({ paymentLink: e.target.value })}
              placeholder="https://pay.example.com/your-link"
              aria-invalid={linkInvalid}
              className={`w-full pl-8 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border rounded-lg focus:outline-none focus:ring-2 ${
                linkInvalid
                  ? 'border-rose-400 focus:ring-rose-400 text-rose-700 dark:text-rose-300'
                  : 'border-slate-200 dark:border-slate-700 focus:ring-[#593C8F]'
              }`}
            />
          </div>
          {(payment.paymentLink || '').trim() !== '' && !linkInvalid && (
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center gap-1 px-3 py-2 text-[11px] font-bold text-[#593C8F] dark:text-[#A8D5BA] border border-[#593C8F]/40 rounded-lg hover:bg-[#593C8F]/10"
              aria-label="Copy payment link"
            >
              {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {linkCopied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
        {linkInvalid && (
          <p className="text-[11px] text-rose-600 dark:text-rose-400" role="alert">{linkCheck.error}</p>
        )}
        <label className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={payment.showPaymentLink || false}
            onChange={(e) => onChange({ showPaymentLink: e.target.checked })}
            className="rounded text-[#593C8F] focus:ring-[#593C8F]"
          />
          Include this link on the document PDF (share it with the payer)
        </label>
        <p className="text-[10px] text-slate-400">
          A link is only a way to pay — BillCraft never marks the document as paid automatically.
        </p>
      </div>

      {/* Payments / advance received against this document */}
      {paymentsEnabled && onPaymentsChange && (
        <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Payments / Advance Received
            </span>
            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                summary.status === 'PAID'
                  ? 'bg-emerald-100 dark:bg-emerald-900/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : summary.status === 'PARTIAL'
                    ? 'bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              {summary.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-2">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Amount Paid</div>
              <div className="font-bold text-emerald-700 dark:text-emerald-400 font-mono">{currencySymbol}{fmt(summary.paidMinor)}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-2">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Balance Due</div>
              <div className="font-bold text-slate-800 dark:text-slate-100 font-mono">{currencySymbol}{fmt(summary.balanceMinor)}</div>
            </div>
          </div>

          {/* recorded payments list */}
          {payments.length > 0 && (
            <ul className="space-y-1">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px]">
                  <div className="min-w-0">
                    <b className="font-mono">{currencySymbol}{fmt(p.amountMinor)}</b>
                    <span className="text-slate-400"> · {p.date} · {p.method}</span>
                    {p.reference && <span className="text-slate-400"> · ref {p.reference}</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => removePayment(p.id)}
                    aria-label={`Remove payment of ${fmt(p.amountMinor)}`}
                    className="p-1 rounded text-slate-400 hover:text-rose-500 shrink-0"
                    title="Remove this payment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* add payment row */}
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <input
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={pAmount}
                onChange={(e) => { setPAmount(e.target.value); setPError(null); }}
                placeholder="Amount"
                aria-label="Payment amount"
                className="px-2 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
              <input
                type="date"
                value={pDate}
                onChange={(e) => setPDate(e.target.value)}
                aria-label="Payment date"
                className="px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
              <select
                value={pMethod}
                onChange={(e) => setPMethod(e.target.value as PaymentMethod)}
                aria-label="Payment method"
                className="px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <option value="upi">UPI</option>
                <option value="bank">Bank</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
              <input
                type="text"
                value={pRef}
                onChange={(e) => { setPRef(e.target.value); setPError(null); }}
                placeholder="Ref (optional)"
                aria-label="Transaction reference"
                maxLength={40}
                className="px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            {pError && <p className="text-[11px] text-rose-600 dark:text-rose-400" role="alert">{pError}</p>}
            <button
              type="button"
              onClick={addPayment}
              disabled={summary.balanceMinor <= 0}
              className="w-full min-h-[36px] inline-flex items-center justify-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-900/40 border border-emerald-300/60 dark:border-emerald-800 rounded-lg hover:bg-emerald-200/70 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-3.5 h-3.5" /> Record payment / advance
            </button>
          </div>
        </div>
      )}

      {/* Payment Instructions / Notes */}
      <div>
        <label htmlFor="payment-notes-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          Payment Instructions or Reference Note
        </label>
        <input
          id="payment-notes-input"
          type="text"
          value={payment.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="e.g. Please quote invoice number when transferring"
          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
        />
      </div>
    </div>
  );
};
