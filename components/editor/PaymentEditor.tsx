'use client';

import React, { useEffect, useState } from 'react';
import { PaymentDetails, PaymentMethod } from '@/types/document';
import { generateUPIString, generateQRCodeDataUrl } from '@/lib/upi';
import { QrCode, Landmark, Banknote, CreditCard, FileCheck, Layers } from 'lucide-react';
import Image from 'next/image';

interface PaymentEditorProps {
  payment: PaymentDetails;
  grandTotal: number;
  businessName: string;
  onChange: (updated: Partial<PaymentDetails>) => void;
}

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'upi', label: 'UPI / QR', icon: QrCode },
  { id: 'bank', label: 'Bank Wire', icon: Landmark },
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'card', label: 'Card', icon: CreditCard },
  { id: 'cheque', label: 'Cheque', icon: FileCheck },
  { id: 'other', label: 'Other', icon: Layers },
];

export const PaymentEditor: React.FC<PaymentEditorProps> = ({
  payment,
  grandTotal,
  businessName,
  onChange,
}) => {
  const [qrPreview, setQrPreview] = useState<string>('');

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
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  UPI ID (VPA) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={payment.upiId}
                  onChange={(e) => onChange({ upiId: e.target.value })}
                  placeholder="e.g. username@okhdfcbank, business@upi"
                  className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payee Display Name
                </label>
                <input
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

      {/* Bank Details */}
      {(payment.method === 'bank' || payment.method === 'other') && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Bank Name
              </label>
              <input
                type="text"
                value={payment.bankName}
                onChange={(e) => onChange({ bankName: e.target.value })}
                placeholder="e.g. HDFC Bank, Chase, Barclays"
                className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Account Holder Name
              </label>
              <input
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
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Account Number / IBAN
              </label>
              <input
                type="text"
                value={payment.accountNumber}
                onChange={(e) => onChange({ accountNumber: e.target.value })}
                placeholder="000000000000"
                className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                IFSC / SWIFT / Sort Code
              </label>
              <input
                type="text"
                value={payment.ifsc}
                onChange={(e) => onChange({ ifsc: e.target.value.toUpperCase() })}
                placeholder="HDFC0001234"
                className="w-full px-2.5 py-1.5 text-xs font-mono uppercase bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Branch Name
              </label>
              <input
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

      {/* Payment Instructions / Notes */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          Payment Instructions or Reference Note
        </label>
        <input
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
