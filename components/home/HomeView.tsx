'use client';

import React from 'react';
import { DocumentType } from '@/types/document';
import { BillCraftIcon } from '@/components/ui/BillCraftIcons';
import { BillCraftLogo } from '@/components/ui/BillCraftLogo';

export interface HomeViewProps {
  onCreateDocument: (type: DocumentType) => void;
  onNavigateToCreate?: () => void;
  onOpenTemplates?: () => void;
  onOpenTools?: () => void;
  onOpenTool?: (toolId: string) => void;
  onLoadDemo?: () => void;
  onViewWelcome?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onCreateDocument,
  onNavigateToCreate,
  onOpenTemplates,
  onOpenTools,
  onOpenTool,
  onLoadDemo,
  onViewWelcome,
}) => {
  const handleOpenTool = (toolId: string) => {
    if (onOpenTool) {
      onOpenTool(toolId);
    } else if (onOpenTools) {
      onOpenTools();
    }
  };

  const handleCreate = onNavigateToCreate || (() => onCreateDocument('invoice'));

  return (
    <div className="max-w-[420px] mx-auto space-y-3.5 py-1 px-1 animate-in fade-in duration-200">
      {/* Top Header Row */}
      <div className="row sp">
        <div className="row">
          <BillCraftLogo size={30} />
          <b style={{ letterSpacing: '.04em', fontSize: '16px' }} className="text-[#17151F] dark:text-[#F8F5FC]">
            BILLCRAFT
          </b>
        </div>
        <div className="row" style={{ gap: '6px' }}>
          {onViewWelcome && (
            <button
              type="button"
              onClick={onViewWelcome}
              className="text-[11px] font-bold text-[#593C8F] dark:text-[#A8D5BA] px-2 py-1 rounded-lg hover:bg-[#F1ECF8] dark:hover:bg-[#281E36] transition cursor-pointer"
            >
              Intro
            </button>
          )}
          <span className="ic" style={{ background: '#fff', border: '1px solid var(--bd)' }}>
            <BillCraftIcon name="bell" />
          </span>
        </div>
      </div>

      {/* Greeting */}
      <div>
        <div className="m" style={{ color: 'var(--mut)' }}>Good afternoon</div>
        <div className="h" style={{ color: 'var(--ink)' }}>Welcome back</div>
      </div>

      {/* Hero Plum Card */}
      <div className="card card-plum p-4">
        <div
          style={{
            position: 'absolute',
            right: '-20px',
            top: '-20px',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'rgba(168,213,186,.25)',
            pointerEvents: 'none',
          }}
        />
        <span className="bdg g">PREMIUM</span>
        <div
          style={{
            fontSize: '19px',
            fontWeight: 800,
            margin: '8px 0 4px',
            lineHeight: 1.2,
            color: '#FFFFFF',
          }}
        >
          Create professional documents.
        </div>
        <div
          style={{
            fontSize: '11px',
            opacity: 0.9,
            lineHeight: 1.4,
            marginBottom: '12px',
            color: '#F1ECF8',
          }}
        >
          Invoices, quotations, receipts and estimates — all in one place.
        </div>
        <button
          type="button"
          onClick={handleCreate}
          className="w-full bg-white hover:bg-[#FAF6EE] text-[#593C8F] cursor-pointer"
          style={{
            height: '42px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontWeight: 700,
            fontSize: '13px',
            border: 'none',
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
          }}
        >
          <BillCraftIcon name="plus" />
          <span>Create Document</span>
        </button>
      </div>

      {/* Quick Actions */}
      <div className="lab">QUICK ACTIONS</div>
      <div className="row sp" style={{ textAlign: 'center', fontSize: '10.5px', fontWeight: 600 }}>
        <div
          onClick={() => onCreateDocument('invoice')}
          className="cursor-pointer group flex-1"
        >
          <div
            className="ic group-hover:scale-105 transition"
            style={{ width: '52px', height: '52px', margin: 'auto auto 4px' }}
          >
            <BillCraftIcon name="doc" style={{ width: '22px', height: '22px' }} />
          </div>
          <span className="text-[#17151F] dark:text-[#F8F5FC] font-bold">Invoice</span>
        </div>

        <div
          onClick={() => onCreateDocument('quotation')}
          className="cursor-pointer group flex-1"
        >
          <div
            className="ic group-hover:scale-105 transition"
            style={{ width: '52px', height: '52px', margin: 'auto auto 4px' }}
          >
            <BillCraftIcon name="clip" style={{ width: '22px', height: '22px' }} />
          </div>
          <span className="text-[#17151F] dark:text-[#F8F5FC] font-bold">Quotation</span>
        </div>

        <div
          onClick={() => onCreateDocument('receipt')}
          className="cursor-pointer group flex-1"
        >
          <div
            className="ic group-hover:scale-105 transition"
            style={{ width: '52px', height: '52px', margin: 'auto auto 4px' }}
          >
            <BillCraftIcon name="rec" style={{ width: '22px', height: '22px' }} />
          </div>
          <span className="text-[#17151F] dark:text-[#F8F5FC] font-bold">Receipt</span>
        </div>

        <div
          onClick={() => onCreateDocument('estimate')}
          className="cursor-pointer group flex-1"
        >
          <div
            className="ic group-hover:scale-105 transition"
            style={{ width: '52px', height: '52px', margin: 'auto auto 4px' }}
          >
            <BillCraftIcon name="calc" style={{ width: '22px', height: '22px' }} />
          </div>
          <span className="text-[#17151F] dark:text-[#F8F5FC] font-bold">Estimate</span>
        </div>
      </div>

      {/* Demo Invoice & Templates Shortcut Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {onLoadDemo && (
          <div
            onClick={onLoadDemo}
            className="card p-2.5 cursor-pointer hover:border-[#593C8F] transition group"
          >
            <div className="row sp">
              <span className="ic mt" style={{ width: '26px', height: '26px', borderRadius: '8px' }}>
                <BillCraftIcon name="doc" style={{ width: '14px', height: '14px' }} />
              </span>
              <span className="bdg g text-[8px]">DEMO</span>
            </div>
            <b style={{ display: 'block', marginTop: '6px', fontSize: '11px', color: 'var(--ink)' }}>
              Sample Invoice
            </b>
            <span className="m" style={{ fontSize: '9.5px', color: 'var(--mut)' }}>
              Interactive pre-filled data
            </span>
          </div>
        )}

        {onOpenTemplates && (
          <div
            onClick={onOpenTemplates}
            className="card p-2.5 cursor-pointer hover:border-[#593C8F] transition group"
          >
            <div className="row sp">
              <span className="ic" style={{ width: '26px', height: '26px', borderRadius: '8px' }}>
                <BillCraftIcon name="grid" style={{ width: '14px', height: '14px' }} />
              </span>
              <span className="bdg text-[8px]">10 STYLES</span>
            </div>
            <b style={{ display: 'block', marginTop: '6px', fontSize: '11px', color: 'var(--ink)' }}>
              Templates Gallery
            </b>
            <span className="m" style={{ fontSize: '9.5px', color: 'var(--mut)' }}>
              Modern, Swiss & GST
            </span>
          </div>
        )}
      </div>

      {/* Quick Tools */}
      <div className="lab">QUICK TOOLS</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div
          onClick={() => handleOpenTool('gst')}
          className="card p-2.5 cursor-pointer hover:border-[#593C8F] transition group"
        >
          <span className="ic mt" style={{ width: '28px', height: '28px' }}>
            <BillCraftIcon name="pct" style={{ width: '15px', height: '15px' }} />
          </span>
          <b style={{ display: 'block', marginTop: '6px', fontSize: '11px', color: 'var(--ink)' }}>
            GST Calculator
          </b>
          <span className="m" style={{ fontSize: '9.5px', color: 'var(--mut)' }}>
            CGST, SGST & IGST
          </span>
        </div>

        <div
          onClick={() => handleOpenTool('discount')}
          className="card p-2.5 cursor-pointer hover:border-[#593C8F] transition group"
        >
          <span className="ic mt" style={{ width: '28px', height: '28px' }}>
            <BillCraftIcon name="calc" style={{ width: '15px', height: '15px' }} />
          </span>
          <b style={{ display: 'block', marginTop: '6px', fontSize: '11px', color: 'var(--ink)' }}>
            Discount Calculator
          </b>
          <span className="m" style={{ fontSize: '9.5px', color: 'var(--mut)' }}>
            Percentages & savings
          </span>
        </div>

        <div
          onClick={() => handleOpenTool('words')}
          className="card p-2.5 cursor-pointer hover:border-[#593C8F] transition group"
        >
          <span className="ic mt" style={{ width: '28px', height: '28px' }}>
            <BillCraftIcon name="abc" style={{ width: '15px', height: '15px' }} />
          </span>
          <b style={{ display: 'block', marginTop: '6px', fontSize: '11px', color: 'var(--ink)' }}>
            Amount in Words
          </b>
          <span className="m" style={{ fontSize: '9.5px', color: 'var(--mut)' }}>
            Lakhs, Crores & Millions
          </span>
        </div>

        <div
          onClick={() => handleOpenTool('upi_qr')}
          className="card p-2.5 cursor-pointer hover:border-[#593C8F] transition group"
        >
          <span className="ic mt" style={{ width: '28px', height: '28px' }}>
            <BillCraftIcon name="qr" style={{ width: '15px', height: '15px' }} />
          </span>
          <b style={{ display: 'block', marginTop: '6px', fontSize: '11px', color: 'var(--ink)' }}>
            UPI QR
          </b>
          <span className="m" style={{ fontSize: '9.5px', color: 'var(--mut)' }}>
            Scan to pay instantly
          </span>
        </div>
      </div>

      {/* Local-First guarantee line */}
      <div className="row" style={{ justifyContent: 'center', color: 'var(--em)', paddingTop: '6px' }}>
        <BillCraftIcon name="lock" style={{ width: '13px' }} />
        <span className="lab" style={{ color: 'var(--em)', letterSpacing: '.12em' }}>
          LOCAL • PRIVATE • NO ACCOUNT
        </span>
      </div>
    </div>
  );
};
