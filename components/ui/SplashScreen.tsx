'use client';

import React from 'react';
import { BillCraftLogo } from '@/components/ui/BillCraftLogo';

/**
 * Official BillCraft in-app splash screen.
 *
 * Android/iOS generate the native launch splash from the PWA manifest (name +
 * square icon + background color) and do not support arbitrary full-logo
 * artwork there, so this in-app splash presents the complete official brand —
 * emblem, BillCraft wordmark and CREATE • CALCULATE • SHARE tagline — on every
 * cold launch and refresh, including the installed PWA. All assets are local,
 * so it renders fully offline.
 */
export const SplashScreen: React.FC<{ fading: boolean }> = ({ fading }) => {
  return (
    <div
      aria-hidden={fading}
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-[#FAF6EE] dark:bg-[#111015] transition-opacity duration-400 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-500">
        <BillCraftLogo variant="full" width={210} priority />
        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="w-1.5 h-1.5 rounded-full bg-[#593C8F] animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#A8D5BA] animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#F0B83A] animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
};
