'use client';

import React from 'react';
import { BillCraftIcon } from '@/components/ui/BillCraftIcons';
import { BillCraftLogo } from '@/components/ui/BillCraftLogo';

interface WelcomeViewProps {
  onGetStarted: () => void;
  onExplore: () => void;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({ onGetStarted, onExplore }) => {
  return (
    <div className="max-w-[420px] mx-auto py-2 px-1 flex flex-col min-h-[580px] justify-between animate-in fade-in duration-200">
      {/* Brand Header */}
      <div className="flex items-center justify-between">
        <BillCraftLogo variant="full" width={240} priority />
        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#F1ECF8] dark:bg-[#281E36] text-[#593C8F] dark:text-[#A8D5BA]">
          v2.0
        </span>
      </div>

      {/* 3D Floating Mockup Cards */}
      <div style={{ height: '210px', position: 'relative', margin: '10px 0' }}>
        <div
          className="card"
          style={{
            position: 'absolute',
            left: '36px',
            top: '6px',
            width: '170px',
            height: '150px',
            transform: 'rotate(-8deg)',
            background: '#E4F2E9',
          }}
        />
        <div
          className="card"
          style={{
            position: 'absolute',
            left: '62px',
            top: '18px',
            width: '170px',
            height: '150px',
            transform: 'rotate(5deg)',
            background: 'var(--tint)',
          }}
        />
        <div
          className="card"
          style={{
            position: 'absolute',
            left: '44px',
            top: '26px',
            width: '180px',
            height: '165px',
            padding: '12px',
            borderTop: '4px solid var(--pl)',
          }}
        >
          <div className="row sp">
            <b style={{ fontSize: '10px', color: 'var(--pl)' }}>INVOICE</b>
            <span className="bdg">PAID</span>
          </div>
          <div className="m" style={{ fontSize: '8px', margin: '2px 0 8px', color: 'var(--mut)' }}>
            #INV-2026-001
          </div>
          <i style={{ display: 'block', height: '4px', background: '#e4def0', margin: '5px 0', borderRadius: '2px' }} />
          <i style={{ display: 'block', height: '4px', background: '#e4def0', margin: '5px 0', width: '70%', borderRadius: '2px' }} />
          <i style={{ display: 'block', height: '4px', background: '#e4def0', margin: '5px 0', width: '85%', borderRadius: '2px' }} />
          <div className="row sp" style={{ marginTop: '12px', borderTop: '1px solid var(--bd)', paddingTop: '8px' }}>
            <span className="m" style={{ fontSize: '8px', color: 'var(--mut)' }}>TOTAL</span>
            <span className="tot" style={{ fontSize: '16px' }}>₹10,030</span>
          </div>
        </div>
        <div
          className="card"
          style={{
            position: 'absolute',
            right: '6px',
            top: '140px',
            padding: '6px 10px',
            display: 'flex',
            gap: '6px',
            alignItems: 'center',
            fontWeight: 700,
            fontSize: '11px',
            color: 'var(--ink)',
          }}
        >
          <span className="ic mt" style={{ width: '24px', height: '24px', borderRadius: '8px' }}>
            <BillCraftIcon name="pct" style={{ width: '13px', height: '13px' }} />
          </span>
          <span>GST 18%</span>
        </div>
      </div>

      {/* Main Copy */}
      <div className="space-y-1.5 text-left">
        <div className="h" style={{ fontSize: '25px', color: 'var(--ink)' }}>
          Business documents, beautifully simple.
        </div>
        <div className="m" style={{ fontSize: '12.5px', color: 'var(--mut)' }}>
          Create invoices, quotes and receipts without an account.
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5 pt-4">
        <button
          type="button"
          onClick={onGetStarted}
          className="btn w-full"
        >
          <span>Get Started</span>
          <BillCraftIcon name="ar" />
        </button>

        <button
          type="button"
          onClick={onExplore}
          className="btn o w-full"
        >
          Explore BillCraft
        </button>

        <div className="row" style={{ justifyContent: 'center', color: 'var(--em)', paddingTop: '4px' }}>
          <BillCraftIcon name="lock" style={{ width: '13px' }} />
          <span className="lab" style={{ color: 'var(--em)', letterSpacing: '.12em' }}>
            LOCAL • PRIVATE • NO ACCOUNT
          </span>
        </div>
      </div>
    </div>
  );
};
