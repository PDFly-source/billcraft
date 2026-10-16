'use client';

import React from 'react';
import { HealthCheckResult } from '@/lib/validation';
import { CheckCircle2, AlertCircle, X, ArrowRight, ShieldCheck } from 'lucide-react';

interface HealthCheckModalProps {
  isOpen: boolean;
  health: HealthCheckResult;
  onClose: () => void;
  onFocusField: (fieldTarget: string) => void;
}

export const HealthCheckModal: React.FC<HealthCheckModalProps> = ({
  isOpen,
  health,
  onClose,
  onFocusField,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                health.isReady
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Document Health Check
              </h3>
              <p className="text-xs text-slate-500">Pre-flight export audit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Health Score Banner */}
        <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Audit Status
            </span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                health.isReady
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
              }`}
            >
              {health.isReady ? 'READY TO EXPORT' : `${health.blockingErrors.length} NEED ATTENTION`}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                health.score === 100
                  ? 'bg-emerald-500'
                  : health.score >= 70
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${health.score}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1.5">
            <span>{health.passedCount} of {health.totalCount} parameters verified</span>
            <span className="font-bold">{health.score}% score</span>
          </div>
        </div>

        {/* Checklist */}
        <div className="p-5 space-y-2.5 max-h-72 overflow-y-auto">
          {health.items.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                onFocusField(item.fieldTarget);
                onClose();
              }}
              className="flex items-start justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition group"
            >
              <div className="flex items-start gap-2.5">
                {item.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${item.isWarningOnly ? 'text-amber-500' : 'text-rose-500'}`} />
                )}
                <div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                    {item.label}
                  </span>
                  <span className="text-[11px] text-slate-500 block">{item.message}</span>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-purple-600 transition shrink-0 mt-1" />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
