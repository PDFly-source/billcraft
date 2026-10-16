'use client';

import React, { useState } from 'react';
import { roundTo2 } from '@/lib/calculations';
import { formatCurrency, amountToWords } from '@/lib/currency';
import { generateUPIString, generateQRCodeDataUrl } from '@/lib/upi';
import { CurrencyCode } from '@/types/document';
import { BillCraftIcon, IconName } from '@/components/ui/BillCraftIcons';
import { BillCraftLogo } from '@/components/ui/BillCraftLogo';
import { Download, Copy, Check, ChevronLeft } from 'lucide-react';
import Image from 'next/image';

export type ToolId = 'gst' | 'discount' | 'words' | 'upi_qr' | 'tax' | 'percentage';

interface BusinessToolsProps {
  initialTool?: ToolId;
}

interface ToolCardMeta {
  id: ToolId;
  name: string;
  desc: string;
  icon: IconName;
}

const TOOLS: ToolCardMeta[] = [
  {
    id: 'gst',
    name: 'GST Calculator',
    desc: 'Calculate GST, CGST, SGST and IGST instantly.',
    icon: 'pct',
  },
  {
    id: 'discount',
    name: 'Discount Calculator',
    desc: 'Work out savings and final price.',
    icon: 'calc',
  },
  {
    id: 'words',
    name: 'Amount in Words',
    desc: 'Convert numbers to written amounts.',
    icon: 'abc',
  },
  {
    id: 'upi_qr',
    name: 'UPI QR Generator',
    desc: 'Create payment QR codes.',
    icon: 'qr',
  },
  {
    id: 'tax',
    name: 'Tax Calculator',
    desc: 'Estimate tax on any amount.',
    icon: 'doc',
  },
  {
    id: 'percentage',
    name: 'Percentage Calculator',
    desc: 'Quick percentage maths.',
    icon: 'pct',
  },
];

export const BusinessTools: React.FC<BusinessToolsProps> = ({ initialTool }) => {
  const [activeTool, setActiveTool] = useState<ToolId | null>(initialTool || null);

  return (
    <div className="max-w-[420px] mx-auto space-y-3.5 py-1 px-1 animate-in fade-in duration-200">
      {/* Brand Header */}
      <div className="row sp">
        <div className="row">
          <BillCraftLogo variant="lockup" size={40} />
        </div>
      </div>

      {/* Screen Title */}
      <div>
        <div className="h" style={{ color: 'var(--ink)' }}>Business Tools</div>
        <div className="m" style={{ marginTop: '3px', color: 'var(--mut)' }}>
          Small tools. Big time savings.
        </div>
      </div>

      {/* Hero Emerald Card */}
      <div
        className="card card-emerald p-3.5"
        style={{ color: '#fff' }}
      >
        <b style={{ fontSize: '13px', display: 'block', color: '#fff' }}>Need a quick calculation?</b>
        <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '2px', color: '#E4F2E9' }}>
          Do it without leaving BillCraft.
        </div>
      </div>

      {/* 2-Column Tool Grid from Reference Mockup */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '9px' }}>
        {TOOLS.map((t) => {
          const isSelected = activeTool === t.id;
          return (
            <div
              key={t.id}
              onClick={() => setActiveTool(t.id)}
              className={`card cursor-pointer select-none transition group ${
                isSelected ? 'border-2 !border-[#593C8F] bg-[#FAF6EE] dark:bg-[#281E36]' : 'hover:border-slate-300'
              }`}
              style={{ padding: '11px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div>
                <span className="ic" style={{ width: '32px', height: '32px', borderRadius: '10px' }}>
                  <BillCraftIcon name={t.icon} style={{ width: '16px', height: '16px' }} />
                </span>
                <b
                  style={{
                    display: 'block',
                    margin: '7px 0 2px',
                    fontSize: '11.5px',
                    color: 'var(--ink)',
                  }}
                >
                  {t.name}
                </b>
                <div className="m" style={{ fontSize: '9.5px', color: 'var(--mut)', lineHeight: 1.3 }}>
                  {t.desc}
                </div>
              </div>
              <div className="row sp" style={{ marginTop: '6px' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--pl)' }}>
                  {isSelected ? 'Active' : 'Open'}
                </span>
                <BillCraftIcon name="ar" style={{ width: '13px', color: 'var(--pl)' }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Interactive Calculator View */}
      {activeTool && (
        <div className="card p-4 space-y-4 pt-3 mt-2 shadow-md">
          <div className="row sp border-b border-[#E7E0EE] dark:border-slate-800 pb-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#593C8F] dark:text-[#A8D5BA] flex items-center gap-1.5">
              <span>{TOOLS.find((t) => t.id === activeTool)?.name}</span>
            </span>
            <button
              type="button"
              onClick={() => setActiveTool(null)}
              className="text-[11px] font-bold text-[#6D6879] hover:text-[#17151F] cursor-pointer"
            >
              Close ✕
            </button>
          </div>

          {activeTool === 'gst' && <GSTCalculatorTool />}
          {activeTool === 'discount' && <DiscountCalculatorTool />}
          {activeTool === 'words' && <AmountInWordsTool />}
          {activeTool === 'upi_qr' && <UPIQRGeneratorTool />}
          {activeTool === 'tax' && <TaxCalculatorTool />}
          {activeTool === 'percentage' && <PercentageCalculatorTool />}
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// 1. GST Calculator
// ----------------------------------------------------------------------
function GSTCalculatorTool() {
  const [amount, setAmount] = useState<number>(10000);
  const [rate, setRate] = useState<number>(18);
  const [isInclusive, setIsInclusive] = useState<boolean>(false);

  let taxable = 0;
  let gstAmount = 0;
  let total = 0;

  if (isInclusive) {
    taxable = roundTo2((amount * 100) / (100 + rate));
    gstAmount = roundTo2(amount - taxable);
    total = amount;
  } else {
    taxable = amount;
    gstAmount = roundTo2((amount * rate) / 100);
    total = roundTo2(taxable + gstAmount);
  }

  const cgst = roundTo2(gstAmount / 2);
  const sgst = roundTo2(gstAmount / 2);

  return (
    <div className="space-y-3.5 text-xs text-[#17151F] dark:text-[#F8F5FC]">
      <div>
        <label className="block text-[11px] font-bold text-[#17151F] dark:text-[#F8F5FC] mb-1">
          Base / Bill Amount (₹)
        </label>
        <input
          type="number"
          value={amount || ''}
          onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          className="w-full px-3 py-2 text-xs font-bold bg-[#FAF6EE] dark:bg-[#111015] border border-[#E7E0EE] dark:border-[#302B38] rounded-xl text-[#17151F] dark:text-[#F8F5FC]"
        />
      </div>

      <div>
        <label className="block text-[11px] font-bold text-[#17151F] dark:text-[#F8F5FC] mb-1">
          GST Rate (%)
        </label>
        <div className="grid grid-cols-5 gap-1.5">
          {[0, 5, 12, 18, 28].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRate(r)}
              className={`py-1.5 text-xs font-bold rounded-lg border transition cursor-pointer ${
                rate === r
                  ? 'bg-[#593C8F] text-white border-[#593C8F]'
                  : 'bg-white dark:bg-[#1B1820] border-[#E7E0EE] dark:border-[#302B38] text-[#17151F] dark:text-[#F8F5FC]'
              }`}
            >
              {r}%
            </button>
          ))}
        </div>
      </div>

      <div className="row sp pt-1">
        <label className="row cursor-pointer text-[11px] font-semibold text-[#17151F] dark:text-[#F8F5FC]">
          <input
            type="radio"
            name="gstMode"
            checked={!isInclusive}
            onChange={() => setIsInclusive(false)}
            className="text-[#593C8F]"
          />
          <span>Exclusive (Add GST)</span>
        </label>
        <label className="row cursor-pointer text-[11px] font-semibold text-[#17151F] dark:text-[#F8F5FC]">
          <input
            type="radio"
            name="gstMode"
            checked={isInclusive}
            onChange={() => setIsInclusive(true)}
            className="text-[#593C8F]"
          />
          <span>Inclusive (Extract GST)</span>
        </label>
      </div>

      {/* Results */}
      <div className="p-3.5 rounded-xl bg-[#FAF6EE] dark:bg-[#111015] border border-[#E7E0EE] dark:border-[#302B38] space-y-2">
        <div className="row sp text-[11px]">
          <span className="text-[#6D6879] dark:text-[#A39BB0] font-medium">Taxable Value:</span>
          <b className="text-[#17151F] dark:text-[#F8F5FC]">{formatCurrency(taxable, 'INR')}</b>
        </div>
        <div className="row sp text-[11px]">
          <span className="text-[#6D6879] dark:text-[#A39BB0] font-medium">Total GST ({rate}%):</span>
          <b className="text-[#203D43] dark:text-[#A8D5BA]">{formatCurrency(gstAmount, 'INR')}</b>
        </div>
        <div className="row sp text-[10px] text-[#6D6879] dark:text-[#A39BB0] pl-2">
          <span>• CGST ({(rate / 2).toFixed(1)}%):</span>
          <span>{formatCurrency(cgst, 'INR')}</span>
        </div>
        <div className="row sp text-[10px] text-[#6D6879] dark:text-[#A39BB0] pl-2">
          <span>• SGST ({(rate / 2).toFixed(1)}%):</span>
          <span>{formatCurrency(sgst, 'INR')}</span>
        </div>
        <div className="row sp text-[10px] text-[#6D6879] dark:text-[#A39BB0] pl-2">
          <span>• IGST ({rate}%):</span>
          <span>{formatCurrency(gstAmount, 'INR')}</span>
        </div>
        <div className="row sp border-t border-[#E7E0EE] dark:border-[#302B38] pt-2 text-xs">
          <b className="text-[#17151F] dark:text-[#F8F5FC]">Grand Total:</b>
          <span className="tot" style={{ fontSize: '18px' }}>
            {formatCurrency(total, 'INR')}
          </span>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 2. Discount Calculator
// ----------------------------------------------------------------------
function DiscountCalculatorTool() {
  const [originalPrice, setOriginalPrice] = useState<number>(1000);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountVal, setDiscountVal] = useState<number>(15);

  let discountAmount = 0;
  if (discountType === 'percent') {
    discountAmount = (originalPrice * discountVal) / 100;
  } else {
    discountAmount = Math.min(originalPrice, discountVal);
  }
  discountAmount = roundTo2(discountAmount);
  const finalPrice = Math.max(0, roundTo2(originalPrice - discountAmount));

  return (
    <div className="space-y-3.5 text-xs text-[#17151F] dark:text-[#F8F5FC]">
      <div>
        <label className="block text-[11px] font-bold text-[#17151F] dark:text-[#F8F5FC] mb-1">
          Original Price (₹)
        </label>
        <input
          type="number"
          value={originalPrice || ''}
          onChange={(e) => setOriginalPrice(parseFloat(e.target.value) || 0)}
          className="w-full px-3 py-2 text-xs font-bold bg-[#FAF6EE] dark:bg-[#111015] border border-[#E7E0EE] dark:border-[#302B38] rounded-xl text-[#17151F] dark:text-[#F8F5FC]"
        />
      </div>

      <div className="row" style={{ gap: '6px' }}>
        <button
          type="button"
          onClick={() => setDiscountType('percent')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition cursor-pointer ${
            discountType === 'percent'
              ? 'bg-[#593C8F] text-white border-[#593C8F]'
              : 'bg-white dark:bg-[#1B1820] border-[#E7E0EE] dark:border-[#302B38] text-[#17151F] dark:text-[#F8F5FC]'
          }`}
        >
          Percentage (%)
        </button>
        <button
          type="button"
          onClick={() => setDiscountType('fixed')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition cursor-pointer ${
            discountType === 'fixed'
              ? 'bg-[#593C8F] text-white border-[#593C8F]'
              : 'bg-white dark:bg-[#1B1820] border-[#E7E0EE] dark:border-[#302B38] text-[#17151F] dark:text-[#F8F5FC]'
          }`}
        >
          Fixed Amount (₹)
        </button>
      </div>

      <div>
        <label className="block text-[11px] font-bold text-[#17151F] dark:text-[#F8F5FC] mb-1">
          {discountType === 'percent' ? 'Discount Percentage (%)' : 'Fixed Discount Value (₹)'}
        </label>
        <input
          type="number"
          value={discountVal || ''}
          onChange={(e) => setDiscountVal(parseFloat(e.target.value) || 0)}
          className="w-full px-3 py-2 text-xs font-bold bg-[#FAF6EE] dark:bg-[#111015] border border-[#E7E0EE] dark:border-[#302B38] rounded-xl text-[#17151F] dark:text-[#F8F5FC]"
        />
      </div>

      <div className="p-3.5 rounded-xl bg-[#FAF6EE] dark:bg-[#111015] border border-[#E7E0EE] dark:border-[#302B38] space-y-2">
        <div className="row sp text-[11px]">
          <span className="text-[#6D6879] dark:text-[#A39BB0] font-medium">Original Price:</span>
          <b className="text-[#17151F] dark:text-[#F8F5FC]">{formatCurrency(originalPrice, 'INR')}</b>
        </div>
        <div className="row sp text-[11px]">
          <span className="text-[#E94B4B] font-bold">You Save:</span>
          <b className="text-[#E94B4B]">-{formatCurrency(discountAmount, 'INR')}</b>
        </div>
        <div className="row sp border-t border-[#E7E0EE] dark:border-[#302B38] pt-2 text-xs">
          <b className="text-[#17151F] dark:text-[#F8F5FC]">Final Price:</b>
          <span className="tot" style={{ fontSize: '18px' }}>
            {formatCurrency(finalPrice, 'INR')}
          </span>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 3. Amount in Words Tool
// ----------------------------------------------------------------------
function AmountInWordsTool() {
  const [val, setVal] = useState<number>(125000);
  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [copied, setCopied] = useState(false);

  const words = amountToWords(val, currency);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(words);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3.5 text-xs text-[#17151F] dark:text-[#F8F5FC]">
      <div>
        <label className="block text-[11px] font-bold text-[#17151F] dark:text-[#F8F5FC] mb-1">
          Number / Amount
        </label>
        <input
          type="number"
          value={val || ''}
          onChange={(e) => setVal(parseFloat(e.target.value) || 0)}
          className="w-full px-3 py-2 text-xs font-mono font-bold bg-[#FAF6EE] dark:bg-[#111015] border border-[#E7E0EE] dark:border-[#302B38] rounded-xl text-[#17151F] dark:text-[#F8F5FC]"
        />
      </div>

      <div>
        <label className="block text-[11px] font-bold text-[#17151F] dark:text-[#F8F5FC] mb-1">
          Currency Standard
        </label>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
          className="w-full px-3 py-2 text-xs font-bold bg-[#FAF6EE] dark:bg-[#111015] border border-[#E7E0EE] dark:border-[#302B38] rounded-xl text-[#17151F] dark:text-[#F8F5FC]"
        >
          <option value="INR">INR (₹ - Indian Lakhs / Crores)</option>
          <option value="USD">USD ($ - Millions / Billions)</option>
          <option value="EUR">EUR (€ - Euro)</option>
          <option value="GBP">GBP (£ - British Pound)</option>
          <option value="AED">AED (د.إ - Dirham)</option>
        </select>
      </div>

      <div className="p-3.5 rounded-xl bg-[#F1ECF8] dark:bg-[#20192C] border border-[#E7E0EE] dark:border-[#302B38] relative">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#593C8F] dark:text-[#A8D5BA] block mb-1">
          Written Expression
        </span>
        <p className="text-[13px] font-serif italic text-[#17151F] dark:text-[#F8F5FC] pr-10 leading-snug">
          &ldquo;{words}&rdquo;
        </p>
        <button
          type="button"
          onClick={copyToClipboard}
          className="absolute right-3 top-3 p-1.5 rounded-lg bg-white dark:bg-[#1B1820] border border-[#E7E0EE] dark:border-[#302B38] text-[#593C8F] dark:text-[#A8D5BA] hover:bg-[#FAF6EE] cursor-pointer"
          title="Copy Words"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 4. UPI QR Generator Tool
// ----------------------------------------------------------------------
function UPIQRGeneratorTool() {
  const [upiId, setUpiId] = useState('billcraft@upi');
  const [payeeName, setPayeeName] = useState('BillCraft Studio');
  const [amount, setAmount] = useState<number>(1000);
  const [note, setNote] = useState('Invoice Payment');
  const [qrUrl, setQrUrl] = useState('');

  React.useEffect(() => {
    if (upiId) {
      const uri = generateUPIString({
        upiId,
        payeeName,
        amount,
        transactionNote: note,
      });
      generateQRCodeDataUrl(uri).then((url) => setQrUrl(url));
    }
  }, [upiId, payeeName, amount, note]);

  const downloadQR = () => {
    if (!qrUrl) return;
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `UPI-QR-${upiId}.png`;
    link.click();
  };

  return (
    <div className="space-y-3.5 text-xs text-[#17151F] dark:text-[#F8F5FC]">
      <div className="space-y-2">
        <div>
          <label className="block text-[11px] font-bold text-[#17151F] dark:text-[#F8F5FC] mb-1">
            UPI ID (VPA)
          </label>
          <input
            type="text"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder="name@okhdfcbank"
            className="w-full px-3 py-2 text-xs font-mono font-bold bg-[#FAF6EE] dark:bg-[#111015] border border-[#E7E0EE] dark:border-[#302B38] rounded-xl text-[#17151F] dark:text-[#F8F5FC]"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-[#17151F] dark:text-[#F8F5FC] mb-1">
            Payee Name
          </label>
          <input
            type="text"
            value={payeeName}
            onChange={(e) => setPayeeName(e.target.value)}
            className="w-full px-3 py-2 text-xs font-bold bg-[#FAF6EE] dark:bg-[#111015] border border-[#E7E0EE] dark:border-[#302B38] rounded-xl text-[#17151F] dark:text-[#F8F5FC]"
          />
        </div>
        <div className="row" style={{ gap: '6px' }}>
          <div className="flex-1">
            <label className="block text-[11px] font-bold text-[#17151F] dark:text-[#F8F5FC] mb-1">
              Amount (₹)
            </label>
            <input
              type="number"
              value={amount || ''}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 text-xs font-bold bg-[#FAF6EE] dark:bg-[#111015] border border-[#E7E0EE] dark:border-[#302B38] rounded-xl text-[#17151F] dark:text-[#F8F5FC]"
            />
          </div>
          <div className="flex-1">
            <label className="block text-[11px] font-bold text-[#17151F] dark:text-[#F8F5FC] mb-1">
              Remark
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold bg-[#FAF6EE] dark:bg-[#111015] border border-[#E7E0EE] dark:border-[#302B38] rounded-xl text-[#17151F] dark:text-[#F8F5FC]"
            />
          </div>
        </div>
      </div>

      {/* QR Display */}
      <div className="p-4 rounded-xl bg-[#FAF6EE] dark:bg-[#111015] border border-[#E7E0EE] dark:border-[#302B38] text-center space-y-3">
        <div className="bg-white p-3 rounded-xl border border-[#E7E0EE] inline-block shadow-sm">
          {qrUrl ? (
            <div className="relative w-40 h-40 mx-auto">
              <Image src={qrUrl} alt="UPI QR" fill className="object-contain" referrerPolicy="no-referrer" unoptimized />
            </div>
          ) : (
            <div className="w-40 h-40 flex items-center justify-center text-slate-300">
              <BillCraftIcon name="qr" style={{ width: '40px', height: '40px' }} />
            </div>
          )}
        </div>
        <div className="text-xs">
          <b className="block text-[#17151F] dark:text-[#F8F5FC]">{payeeName}</b>
          <span className="font-mono text-[#6D6879] dark:text-[#A39BB0] text-[11px]">{upiId}</span>
          {amount > 0 && <span className="block font-extrabold text-[#203D43] dark:text-[#A8D5BA] mt-1">₹{amount}</span>}
        </div>
        <button
          type="button"
          onClick={downloadQR}
          className="btn w-full"
        >
          <Download className="w-4 h-4" />
          <span>Download QR (PNG)</span>
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 5. Tax Calculator Tool
// ----------------------------------------------------------------------
function TaxCalculatorTool() {
  const [base, setBase] = useState(5000);
  const [taxRate, setTaxRate] = useState(10);
  const tax = roundTo2((base * taxRate) / 100);
  const total = roundTo2(base + tax);

  return (
    <div className="space-y-3.5 text-xs text-[#17151F] dark:text-[#F8F5FC]">
      <div className="row" style={{ gap: '8px' }}>
        <div className="flex-1">
          <label className="block text-[11px] font-bold text-[#17151F] dark:text-[#F8F5FC] mb-1">
            Base Amount (₹)
          </label>
          <input
            type="number"
            value={base || ''}
            onChange={(e) => setBase(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 text-xs font-bold bg-[#FAF6EE] dark:bg-[#111015] border border-[#E7E0EE] dark:border-[#302B38] rounded-xl text-[#17151F] dark:text-[#F8F5FC]"
          />
        </div>
        <div className="flex-1">
          <label className="block text-[11px] font-bold text-[#17151F] dark:text-[#F8F5FC] mb-1">
            Tax Rate (%)
          </label>
          <input
            type="number"
            value={taxRate || ''}
            onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 text-xs font-bold bg-[#FAF6EE] dark:bg-[#111015] border border-[#E7E0EE] dark:border-[#302B38] rounded-xl text-[#17151F] dark:text-[#F8F5FC]"
          />
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-[#FAF6EE] dark:bg-[#111015] border border-[#E7E0EE] dark:border-[#302B38] space-y-2">
        <div className="row sp text-[11px]">
          <span className="text-[#6D6879] dark:text-[#A39BB0] font-medium">Base:</span>
          <b className="text-[#17151F] dark:text-[#F8F5FC]">{formatCurrency(base, 'INR')}</b>
        </div>
        <div className="row sp text-[11px]">
          <span className="text-[#203D43] dark:text-[#A8D5BA] font-bold">Tax ({taxRate}%):</span>
          <b className="text-[#203D43] dark:text-[#A8D5BA]">+{formatCurrency(tax, 'INR')}</b>
        </div>
        <div className="row sp border-t border-[#E7E0EE] dark:border-[#302B38] pt-2 text-xs">
          <b className="text-[#17151F] dark:text-[#F8F5FC]">Total with Tax:</b>
          <span className="tot" style={{ fontSize: '18px' }}>
            {formatCurrency(total, 'INR')}
          </span>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 6. Percentage Calculator Tool
// ----------------------------------------------------------------------
function PercentageCalculatorTool() {
  const [valA, setValA] = useState(25);
  const [valB, setValB] = useState(200);

  const percentOf = roundTo2((valA * valB) / 100);
  const isWhatPercent = valB !== 0 ? roundTo2((valA / valB) * 100) : 0;
  const pctChange = valA !== 0 ? roundTo2(((valB - valA) / valA) * 100) : 0;

  return (
    <div className="space-y-3.5 text-xs text-[#17151F] dark:text-[#F8F5FC]">
      <div className="row" style={{ gap: '8px' }}>
        <div className="flex-1">
          <label className="block text-[11px] font-bold text-[#17151F] dark:text-[#F8F5FC] mb-1">
            Value A
          </label>
          <input
            type="number"
            value={valA || ''}
            onChange={(e) => setValA(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 text-xs font-bold bg-[#FAF6EE] dark:bg-[#111015] border border-[#E7E0EE] dark:border-[#302B38] rounded-xl text-[#17151F] dark:text-[#F8F5FC]"
          />
        </div>
        <div className="flex-1">
          <label className="block text-[11px] font-bold text-[#17151F] dark:text-[#F8F5FC] mb-1">
            Value B
          </label>
          <input
            type="number"
            value={valB || ''}
            onChange={(e) => setValB(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 text-xs font-bold bg-[#FAF6EE] dark:bg-[#111015] border border-[#E7E0EE] dark:border-[#302B38] rounded-xl text-[#17151F] dark:text-[#F8F5FC]"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="p-2.5 rounded-xl bg-[#FAF6EE] dark:bg-[#111015] border border-[#E7E0EE] dark:border-[#302B38] text-center">
          <span className="text-[9px] font-bold text-[#6D6879] uppercase block mb-0.5">{valA}% of {valB}</span>
          <b className="text-sm text-[#593C8F] dark:text-[#A8D5BA]">{percentOf}</b>
        </div>
        <div className="p-2.5 rounded-xl bg-[#FAF6EE] dark:bg-[#111015] border border-[#E7E0EE] dark:border-[#302B38] text-center">
          <span className="text-[9px] font-bold text-[#6D6879] uppercase block mb-0.5">{valA} in {valB}</span>
          <b className="text-sm text-[#593C8F] dark:text-[#A8D5BA]">{isWhatPercent}%</b>
        </div>
        <div className="p-2.5 rounded-xl bg-[#FAF6EE] dark:bg-[#111015] border border-[#E7E0EE] dark:border-[#302B38] text-center">
          <span className="text-[9px] font-bold text-[#6D6879] uppercase block mb-0.5">Change</span>
          <b className={`text-sm ${pctChange >= 0 ? 'text-[#203D43] dark:text-[#A8D5BA]' : 'text-[#E94B4B]'}`}>
            {pctChange >= 0 ? `+${pctChange}%` : `${pctChange}%`}
          </b>
        </div>
      </div>
    </div>
  );
}
