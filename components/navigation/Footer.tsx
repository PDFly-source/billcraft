'use client';

import React from 'react';
import { NavTab } from './Header';
import { ShieldCheck, Lock } from 'lucide-react';
import { BillCraftLogo } from '@/components/ui/BillCraftLogo';

interface FooterProps {
  onNavigate: (tab: NavTab) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="no-print border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 py-10 mt-16 text-xs text-slate-500 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <BillCraftLogo variant="lockup" size={30} />
          </div>
          <p className="text-[11px] text-slate-400">
            Local-first business document studio. No accounts • No servers • No cloud databases.
          </p>
        </div>

        {/* Working Footer Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 font-semibold">
          <button
            onClick={() => onNavigate('templates')}
            className="hover:text-[#593C8F] dark:hover:text-[#A8D5BA] transition"
          >
            Templates
          </button>
          <button
            onClick={() => onNavigate('tools')}
            className="hover:text-[#593C8F] dark:hover:text-[#A8D5BA] transition"
          >
            Tools
          </button>
          <button
            onClick={() => onNavigate('privacy')}
            className="hover:text-[#593C8F] dark:hover:text-[#A8D5BA] transition"
          >
            Privacy
          </button>
          <button
            onClick={() => onNavigate('about')}
            className="hover:text-[#593C8F] dark:hover:text-[#A8D5BA] transition"
          >
            About
          </button>
        </div>
      </div>
    </footer>
  );
};
