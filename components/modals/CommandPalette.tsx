'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  FilePlus,
  FileCheck,
  Printer,
  Download,
  Share2,
  LayoutTemplate,
  Moon,
  Sun,
  Settings,
  RotateCcw,
  Sparkles,
  Plus,
  Eye,
  ShieldCheck,
  Wrench,
  User,
  Package,
  History,
} from 'lucide-react';
import { DocumentType } from '@/types/document';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (actionId: string, payload?: unknown) => void;
  isDarkMode: boolean;
}

interface CommandItem {
  id: string;
  title: string;
  category: string;
  shortcut?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onAction,
  isDarkMode,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        setQuery('');
        setSelectedIndex(0);
      }, 50);
    }
  }, [isOpen]);

  const commands: CommandItem[] = [
    {
      id: 'create-invoice',
      title: 'Create New Invoice',
      category: 'Document Creation',
      icon: FilePlus,
      action: () => onAction('create-doc', 'invoice'),
    },
    {
      id: 'create-quotation',
      title: 'Create Quotation / Estimate',
      category: 'Document Creation',
      icon: FilePlus,
      action: () => onAction('create-doc', 'quotation'),
    },
    {
      id: 'create-receipt',
      title: 'Create Payment Receipt',
      category: 'Document Creation',
      icon: FilePlus,
      action: () => onAction('create-doc', 'receipt'),
    },
    {
      id: 'create-estimate',
      title: 'Create Project Estimate',
      category: 'Document Creation',
      icon: FilePlus,
      action: () => onAction('create-doc', 'estimate'),
    },
    {
      id: 'create-proforma',
      title: 'Create Proforma Invoice',
      category: 'Document Creation',
      icon: FilePlus,
      action: () => onAction('create-doc', 'proforma'),
    },
    {
      id: 'add-item',
      title: 'Add Line Item',
      category: 'Editor',
      shortcut: 'Alt + I',
      icon: Plus,
      action: () => onAction('add-item'),
    },
    {
      id: 'preview',
      title: 'Open Fullscreen Preview',
      category: 'Actions',
      shortcut: '⌘ / Ctrl + Enter',
      icon: Eye,
      action: () => onAction('open-preview'),
    },
    {
      id: 'export-pdf',
      title: 'Download PDF Document',
      category: 'Export',
      shortcut: '⌘ / Ctrl + E',
      icon: Download,
      action: () => onAction('export-pdf'),
    },
    {
      id: 'print',
      title: 'Print Document',
      category: 'Export',
      shortcut: '⌘ / Ctrl + P',
      icon: Printer,
      action: () => onAction('print'),
    },
    {
      id: 'share',
      title: 'Share Document via Web Share',
      category: 'Export',
      icon: Share2,
      action: () => onAction('share'),
    },
    {
      id: 'health-check',
      title: 'Run Document Health Check',
      category: 'Audit',
      icon: ShieldCheck,
      action: () => onAction('open-health-check'),
    },
    {
      id: 'templates',
      title: 'Browse Templates Gallery',
      category: 'Design',
      icon: LayoutTemplate,
      action: () => onAction('navigate', 'templates'),
    },
    {
      id: 'tools',
      title: 'Open Business Utilities & Calculators',
      category: 'Tools',
      icon: Wrench,
      action: () => onAction('navigate', 'tools'),
    },
    {
      id: 'clients',
      title: 'Open Saved Clients',
      category: 'Your Data',
      icon: User,
      action: () => onAction('navigate', 'clients'),
    },
    {
      id: 'products',
      title: 'Open Product Catalogue',
      category: 'Your Data',
      icon: Package,
      action: () => onAction('navigate', 'products'),
    },
    {
      id: 'history',
      title: 'Open Document History & Payments',
      category: 'Your Data',
      icon: History,
      action: () => onAction('navigate', 'history'),
    },
    {
      id: 'toggle-theme',
      title: isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      category: 'Appearance',
      icon: isDarkMode ? Sun : Moon,
      action: () => onAction('toggle-theme'),
    },
    {
      id: 'settings',
      title: 'Application Settings',
      category: 'Preferences',
      icon: Settings,
      action: () => onAction('navigate', 'settings'),
    },
    {
      id: 'reset',
      title: 'Reset / Clear Document',
      category: 'Danger',
      icon: RotateCcw,
      action: () => onAction('reset-document'),
    },
  ];

  const filtered = commands.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="command-palette-overlay fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search action (e.g. invoice, pdf, print, dark)..."
            className="w-full text-sm bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No commands matching &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = selectedIndex === idx;
              return (
                <div
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition ${
                    isSelected
                      ? 'bg-purple-50 dark:bg-purple-950/50 text-[#593C8F] dark:text-[#A8D5BA]'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-1.5 rounded-lg ${
                        isSelected
                          ? 'bg-[#593C8F] text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block font-semibold text-slate-900 dark:text-slate-100">
                        {cmd.title}
                      </span>
                      <span className="text-[10px] text-slate-400">{cmd.category}</span>
                    </div>
                  </div>

                  {cmd.shortcut && (
                    <kbd className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500">
                      {cmd.shortcut}
                    </kbd>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>Use ↑ ↓ to navigate, Enter to select</span>
          <span>BillCraft Palette</span>
        </div>
      </div>
    </div>
  );
};
