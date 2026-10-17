'use client';

import React from 'react';
import { NavTab } from './Header';
import { BillCraftLogo } from '@/components/ui/BillCraftLogo';

interface FooterProps {
  onNavigate: (tab: NavTab) => void;
}

/**
 * Premium developer-signature footer (same signature layout as NexDrop,
 * PDFMiniFly and AppMintly) rendered in official BillCraft branding:
 * brand purple #5B3A8C, soft lavender #B99AEF, warm ivory #F6F0E8,
 * muted secondary #A9A2AE, dark band #111014.
 *
 * Official artwork only — the lockup carries the emblem, the BillCraft
 * wordmark and the CREATE • CALCULATE • SHARE tagline. No redrawn or
 * duplicated branding, no demo data.
 */
export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const links: { label: string; tab: NavTab }[] = [
    { label: 'Templates', tab: 'templates' },
    { label: 'Tools', tab: 'tools' },
    { label: 'Privacy', tab: 'privacy' },
    { label: 'About', tab: 'about' },
  ];

  return (
    <footer
      // Dark band per the brand palette; warm ivory in light mode.
      // Bottom margin clears the fixed 64px mobile tab bar + safe area.
      className="no-print mt-16 bg-[#F6F0E8] dark:bg-[#111014] border-t border-[#5B3A8C]/10 dark:border-[#B99AEF]/10 mb-[calc(64px+env(safe-area-inset-bottom))] md:mb-0"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-7 md:py-12 flex flex-col items-center text-center gap-3.5 md:gap-7">
        {/* Official lockup: emblem + BillCraft wordmark + CREATE • CALCULATE • SHARE */}
        <BillCraftLogo variant="lockup" size={42} />

        {/* Working footer navigation — unchanged behaviour, restyled */}
        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2"
        >
          {links.map(({ label, tab }) => (
            <button
              key={tab}
              type="button"
              onClick={() => onNavigate(tab)}
              className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#6D6879] dark:text-[#A9A2AE] hover:text-[#5B3A8C] dark:hover:text-[#B99AEF] transition-colors"
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Developer signature with flanking hairlines */}
        <div className="flex items-center justify-center gap-3 w-full max-w-md">
          <span
            aria-hidden
            className="h-px flex-1 max-w-[72px] bg-gradient-to-r from-transparent to-[#5B3A8C]/60 dark:to-[#B99AEF]/60"
          />
          <p className="text-xs text-[#6D6879] dark:text-[#A9A2AE] whitespace-nowrap">
            Crafted &amp; Developed by{' '}
            <span className="font-bold text-[#5B3A8C] dark:text-[#F6F0E8]">PKD</span>
          </p>
          <span
            aria-hidden
            className="h-px flex-1 max-w-[72px] bg-gradient-to-l from-transparent to-[#5B3A8C]/60 dark:to-[#B99AEF]/60"
          />
        </div>

        {/* Copyright */}
        <p className="text-[10.5px] text-[#6D6879]/80 dark:text-[#A9A2AE]/70">
          © 2026 BillCraft. All rights reserved.
        </p>
      </div>
    </footer>
  );
};
