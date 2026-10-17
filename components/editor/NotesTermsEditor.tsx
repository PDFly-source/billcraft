'use client';

import React, { useEffect, useState } from 'react';
import { TERMS_PRESETS, NOTE_PRESETS } from '@/lib/sample-data';
import { listClauses, saveClause, deleteClause } from '@/lib/db/repository';
import { ClauseRecord } from '@/types/local';
import { Sparkles, BookmarkPlus, Pencil, Trash2, X, Plus } from 'lucide-react';

interface NotesTermsEditorProps {
  notes: string;
  terms: string;
  onNotesChange: (val: string) => void;
  onTermsChange: (val: string) => void;
  onShowToast?: (msg: string) => void;
}

export const NotesTermsEditor: React.FC<NotesTermsEditorProps> = ({
  notes,
  terms,
  onNotesChange,
  onTermsChange,
  onShowToast,
}) => {
  const [clauses, setClauses] = useState<ClauseRecord[]>([]);
  const [editingClause, setEditingClause] = useState<ClauseRecord | null>(null);
  const [showClauseForm, setShowClauseForm] = useState(false);
  const [clauseTitle, setClauseTitle] = useState('');
  const [clauseText, setClauseText] = useState('');

  useEffect(() => {
    void listClauses().then(setClauses);
  }, []);

  const refresh = async () => setClauses(await listClauses());

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

  // ---- My Clauses (reusable, locally saved; edits never touch saved documents) ----

  const startSaveClause = () => {
    setEditingClause(null);
    setClauseTitle('');
    setClauseText('');
    setShowClauseForm(true);
  };

  const startEditClause = (c: ClauseRecord) => {
    setEditingClause(c);
    setClauseTitle(c.title);
    setClauseText(c.text);
    setShowClauseForm(true);
  };

  const cancelClauseForm = () => {
    setEditingClause(null);
    setClauseTitle('');
    setClauseText('');
    setShowClauseForm(false);
  };

  const saveClauseForm = async () => {
    const title = clauseTitle.trim();
    const text = clauseText.trim();
    if (!text) {
      onShowToast?.('Write the clause text first');
      return;
    }
    await saveClause({
      id: editingClause?.id,
      title: title || (editingClause?.title ?? 'My clause'),
      text,
    });
    await refresh();
    cancelClauseForm();
    onShowToast?.(editingClause ? 'Clause updated — existing documents keep their own text' : 'Clause saved to My Clauses');
  };

  const removeClause = async (c: ClauseRecord) => {
    if (!window.confirm(`Delete the saved clause "${c.title}"?\n\nDocuments already using this clause keep their own copied text.`)) return;
    await deleteClause(c.id);
    await refresh();
    onShowToast?.('Clause deleted');
  };

  /** Insert a saved clause into THIS document only. Duplicate insertion guard. */
  const insertClause = (c: ClauseRecord) => {
    if (terms.includes(c.text)) {
      onShowToast?.('This clause is already in the current terms');
      return;
    }
    onTermsChange(terms.trim() ? `${terms.trim()}\n${c.text}` : c.text);
  };

  /** Save the CURRENT terms text as a new reusable clause. */
  const saveCurrentTerms = async () => {
    const text = terms.trim();
    if (!text) {
      onShowToast?.('Write your terms first, then save them as a clause');
      return;
    }
    const title = window.prompt('Name this clause (e.g. "Late payment policy")', terms.trim().split('\n')[0].slice(0, 40));
    if (title === null) return;
    await saveClause({ title: (title || 'My clause').slice(0, 60), text });
    await refresh();
    onShowToast?.('Saved to My Clauses');
  };

  return (
    <div className="space-y-5">
      {/* Customer Notes */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label htmlFor="doc-notes" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Notes / Message to Customer
          </label>
        </div>
        <textarea
          id="doc-notes"
          rows={2}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="e.g. Thank you for your business. It was a pleasure working with you."
          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F]"
        />
        <div className="flex flex-wrap gap-1.5">
          {NOTE_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPresetNote(p)}
              className="text-[10px] font-medium px-2 py-1 rounded-full bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/60 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60"
            >
              <Sparkles className="w-2.5 h-2.5 inline mr-0.5" />
              {p.length > 34 ? `${p.slice(0, 34)}…` : p}
            </button>
          ))}
        </div>
      </div>

      {/* Terms & Clauses */}
      <div className="space-y-2">
        <div className="flex justify-between items-center flex-wrap gap-1">
          <label htmlFor="doc-terms" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Terms &amp; Clauses
          </label>
          <button
            type="button"
            onClick={saveCurrentTerms}
            className="inline-flex items-center gap-1 text-[10px] font-bold text-[#593C8F] dark:text-[#A8D5BA] hover:underline"
          >
            <BookmarkPlus className="w-3 h-3" /> Save current terms as clause
          </button>
        </div>
        <textarea
          id="doc-terms"
          rows={4}
          value={terms}
          onChange={(e) => onTermsChange(e.target.value)}
          placeholder="e.g. Payment due within 14 days of invoice date."
          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F]"
        />
        <div className="flex flex-wrap gap-1.5">
          {TERMS_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => appendPresetTerm(p)}
              className="text-[10px] font-medium px-2 py-1 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              + {p.length > 34 ? `${p.slice(0, 34)}…` : p}
            </button>
          ))}
        </div>
      </div>

      {/* My Clauses library */}
      <div className="rounded-xl border border-[#593C8F]/25 dark:border-[#7B5BB8]/30 bg-[#593C8F]/[0.04] dark:bg-[#7B5BB8]/[0.08] p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wide text-[#593C8F] dark:text-[#A8D5BA]">
            My Clauses (saved on this device)
          </span>
          <button
            type="button"
            onClick={startSaveClause}
            className="inline-flex items-center gap-1 text-[10px] font-bold text-[#593C8F] dark:text-[#A8D5BA] hover:underline"
          >
            <Plus className="w-3 h-3" /> New clause
          </button>
        </div>

        {clauses.length === 0 && !showClauseForm && (
          <p className="text-[10px] text-slate-400">
            No saved clauses yet. Save a clause once and insert it into any document later — editing a saved clause never changes documents already created.
          </p>
        )}

        {/* clause editor form (add / edit) */}
        {showClauseForm && (
            <div className="space-y-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-2.5">
              <input
                type="text"
                value={clauseTitle}
                onChange={(e) => setClauseTitle(e.target.value)}
                placeholder="Clause name (e.g. Late payment policy)"
                maxLength={60}
                aria-label="Clause name"
                className="w-full px-2 py-1.5 text-[11px] font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
              />
              <textarea
                rows={3}
                value={clauseText}
                onChange={(e) => setClauseText(e.target.value)}
                placeholder="Clause text…"
                maxLength={500}
                aria-label="Clause text"
                className="w-full px-2 py-1.5 text-[11px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
              />
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={cancelClauseForm} className="px-2.5 py-1 text-[10px] font-bold text-slate-500 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <X className="w-3 h-3 inline" /> Cancel
                </button>
                <button type="button" onClick={saveClauseForm} className="px-2.5 py-1 text-[10px] font-bold text-white bg-[#593C8F] rounded-lg hover:bg-[#452b6e]">
                  {editingClause ? 'Update clause' : 'Save clause'}
                </button>
              </div>
            </div>
        )}

        {/* saved clauses list */}
        {clauses.length > 0 && (
          <ul className="space-y-1">
            {clauses.map((c) => (
              <li key={c.id} className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">{c.title}</div>
                  <div className="text-[10px] text-slate-400 truncate">{c.text.split('\n')[0]}</div>
                </div>
                <button
                  type="button"
                  onClick={() => insertClause(c)}
                  title="Insert into this document's terms"
                  aria-label={`Insert clause ${c.title}`}
                  className="px-1.5 py-1 rounded text-[10px] font-bold text-[#593C8F] dark:text-[#A8D5BA] hover:bg-[#593C8F]/10"
                >
                  Insert
                </button>
                <button
                  type="button"
                  onClick={() => startEditClause(c)}
                  aria-label={`Edit clause ${c.title}`}
                  title="Edit saved clause"
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => removeClause(c)}
                  aria-label={`Delete clause ${c.title}`}
                  title="Delete saved clause"
                  className="p-1 rounded text-slate-400 hover:text-rose-500"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
