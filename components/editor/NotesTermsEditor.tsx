'use client';

import React from 'react';
import { TERMS_PRESETS, NOTE_PRESETS } from '@/lib/sample-data';
import { Sparkles } from 'lucide-react';

interface NotesTermsEditorProps {
  notes: string;
  terms: string;
  onNotesChange: (val: string) => void;
  onTermsChange: (val: string) => void;
}

export const NotesTermsEditor: React.FC<NotesTermsEditorProps> = ({
  notes,
  terms,
  onNotesChange,
  onTermsChange,
}) => {
  const appendPresetTerm = (preset: string) => {
    if (!terms.trim()) {
      onTermsChange(preset);
    } else {
      onTermsChange(`${terms.trim()}\n${preset}`);
    }
  };

  const setPresetNote = (preset: string) => {
    if (!notes.trim()) {
      onNotesChange(preset);
    } else {
      onNotesChange(`${notes.trim()} ${preset}`);
    }
  };

  return (
    <div className="space-y-5">
      {/* Customer Notes */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Notes / Message to Customer
          </label>
        </div>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="e.g. Thank you for your business. It was a pleasure working with you."
          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F]"
        />

        {/* Note Presets */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" /> Quick suggestions:
          </span>
          {NOTE_PRESETS.slice(0, 3).map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setPresetNote(p)}
              className="text-[10px] py-0.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 transition truncate max-w-xs"
            >
              + {p.substring(0, 30)}...
            </button>
          ))}
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          Terms & Conditions
        </label>
        <textarea
          rows={3}
          value={terms}
          onChange={(e) => onTermsChange(e.target.value)}
          placeholder="List terms of service, payment policies, warranties, or return policies..."
          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F]"
        />

        {/* Terms Presets */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
            Click to add standard clauses:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {TERMS_PRESETS.map((clause, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => appendPresetTerm(clause)}
                className="text-[10px] py-1 px-2.5 bg-slate-50 dark:bg-slate-800/80 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-purple-300 transition text-left"
              >
                + {clause}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
