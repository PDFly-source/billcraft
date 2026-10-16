'use client';

import React from 'react';
import { Sparkles, Layers, Zap, Heart, CheckCircle2 } from 'lucide-react';
import { BillCraftLogo } from '@/components/ui/BillCraftLogo';

export const AboutView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <div className="text-center space-y-3 max-w-xl mx-auto">
        <span className="text-xs uppercase font-extrabold tracking-widest text-[#593C8F] dark:text-[#A8D5BA]">
          ABOUT BILLCRAFT
        </span>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Professional business documents. Made simple.
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          BillCraft was built to solve the frustration of bloated invoice SaaS that require endless logins,
          paywalls, and cloud tracking just to generate a simple professional billing document.
        </p>
      </div>

      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Core Principles</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-[#593C8F] dark:text-[#A8D5BA] flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Speed & Fluidity</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Real-time calculation updates on every stroke, smart inline arithmetic, and zero loading delays.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-[#593C8F] dark:text-[#A8D5BA] flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Statutory Precision</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Correct mathematical tax breakdowns, dual CGST/SGST splitting, IGST, HSN/SAC codes, and Indian numbering words.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-[#593C8F] dark:text-[#A8D5BA] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Design Integrity</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              10 tailored typographic templates suitable for corporations, freelancers, GST vendors, and retailers.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center pt-4 space-y-2">
        <BillCraftLogo variant="full" width={200} />
      </div>
    </div>
  );
};
