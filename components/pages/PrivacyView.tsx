'use client';

import React from 'react';
import { ShieldCheck, Lock, AlertTriangle, Cpu, HardDriveDownload } from 'lucide-react';

export const PrivacyView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold mb-3 uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          PRIVACY & LOCAL ARCHITECTURE
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Privacy Technical Policy
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          How BillCraft handles your business figures, client records, and documents.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-[#593C8F] dark:text-[#A8D5BA] flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Zero Server Storage</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            BillCraft has no database, no remote server, and no cloud backups. All inputs you type into the
            editor exist solely within the active memory state of your web browser.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-[#593C8F] dark:text-[#A8D5BA] flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Local-Only Processing</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Calculations, tax rules, arithmetic evaluations, and UPI QR codes are executed strictly via
            client-side JavaScript. No information is transmitted to analytics servers or third-party APIs.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-[#593C8F] dark:text-[#A8D5BA] flex items-center justify-center">
            <HardDriveDownload className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Client-Side PDF Generation</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            PDF files are rendered on your device canvas and outputted directly to your filesystem via the
            browser download pipeline. No document uploads happen at any time.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2">
          <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-amber-900 dark:text-amber-200">Session Limitation Note</h3>
          <p className="text-xs text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
            Because there is intentionally no persistent server storage, your current document can be lost
            if you refresh or close your browser tab before exporting it. Always download your PDF when finished.
          </p>
        </div>
      </div>
    </div>
  );
};
