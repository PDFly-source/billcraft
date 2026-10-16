'use client';

import React from 'react';
import {
  Search,
  Moon,
  Sun,
  Plus,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useIsMounted } from '@/hooks/useIsMounted';
import { BillCraftLogo } from '@/components/ui/BillCraftLogo';

export type NavTab =
  | 'home'
  | 'create'
  | 'editor'
  | 'preview'
  | 'templates'
  | 'tools'
  | 'settings'
  | 'privacy'
  | 'about'
  | 'welcome';

interface HeaderProps {
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  onOpenCommandPalette: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  hasActiveDocument?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onNavigate,
  onOpenCommandPalette,
  isDarkMode,
  onToggleTheme,
}) => {
  const mounted = useIsMounted();
  const isOnline = useOnlineStatus();

  return (
    <header className="no-print sticky top-0 z-40 bg-white/95 dark:bg-[#1B1820]/95 backdrop-blur-md border-b border-[#E7E0EE] dark:border-[#302B38] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo and Tagline */}
        <div
          onClick={() => onNavigate('home')}
          className="flex items-center cursor-pointer select-none group"
        >
          <BillCraftLogo variant="compact" width={52} priority />
        </div>

        {/* Center Navigation Links (Desktop: All 6 tabs in exact order) */}
        <nav className="hidden md:flex items-center gap-1 bg-[#F6F2FA] dark:bg-[#20192C] p-1 rounded-xl border border-[#E7E0EE] dark:border-[#302B38]">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'home'
                ? 'bg-white dark:bg-[#1B1820] text-[#593C8F] dark:text-[#A8D5BA] shadow-xs'
                : 'text-[#6D6879] dark:text-[#A39BB0] hover:text-[#17151F] dark:hover:text-[#F8F5FC]'
            }`}
          >
            Home
          </button>

          <button
            type="button"
            onClick={() => onNavigate('create')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'create'
                ? 'bg-white dark:bg-[#1B1820] text-[#593C8F] dark:text-[#A8D5BA] shadow-xs'
                : 'text-[#6D6879] dark:text-[#A39BB0] hover:text-[#17151F] dark:hover:text-[#F8F5FC]'
            }`}
          >
            Create
          </button>

          <button
            type="button"
            onClick={() => onNavigate('editor')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'editor'
                ? 'bg-white dark:bg-[#1B1820] text-[#593C8F] dark:text-[#A8D5BA] shadow-xs'
                : 'text-[#6D6879] dark:text-[#A39BB0] hover:text-[#17151F] dark:hover:text-[#F8F5FC]'
            }`}
          >
            Editor
          </button>

          <button
            type="button"
            onClick={() => onNavigate('templates')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'templates'
                ? 'bg-white dark:bg-[#1B1820] text-[#593C8F] dark:text-[#A8D5BA] shadow-xs'
                : 'text-[#6D6879] dark:text-[#A39BB0] hover:text-[#17151F] dark:hover:text-[#F8F5FC]'
            }`}
          >
            Templates
          </button>

          <button
            type="button"
            onClick={() => onNavigate('tools')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'tools'
                ? 'bg-white dark:bg-[#1B1820] text-[#593C8F] dark:text-[#A8D5BA] shadow-xs'
                : 'text-[#6D6879] dark:text-[#A39BB0] hover:text-[#17151F] dark:hover:text-[#F8F5FC]'
            }`}
          >
            Tools
          </button>

          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'settings'
                ? 'bg-white dark:bg-[#1B1820] text-[#593C8F] dark:text-[#A8D5BA] shadow-xs'
                : 'text-[#6D6879] dark:text-[#A39BB0] hover:text-[#17151F] dark:hover:text-[#F8F5FC]'
            }`}
          >
            Settings
          </button>
        </nav>

        {/* Right Tools & Palette */}
        <div className="flex items-center gap-2">
          {/* Online/Offline status badge */}
          <div suppressHydrationWarning className="hidden sm:flex items-center">
            {mounted ? (
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                  isOnline
                    ? 'bg-[#E4F2E9] text-[#203D43] dark:bg-[#1b3530] dark:text-[#A8D5BA] border border-[#A8D5BA]/40'
                    : 'bg-[#FBE6A8]/60 text-[#6D4D0A] dark:bg-[#342812] dark:text-[#F0B83A] border border-[#F0B83A]/40'
                }`}
                title={isOnline ? 'Online mode' : 'Offline local mode'}
              >
                {isOnline ? (
                  <Wifi className="w-3 h-3 text-[#203D43] dark:text-[#A8D5BA]" />
                ) : (
                  <WifiOff className="w-3 h-3 text-[#8A6414] dark:text-[#F0B83A]" />
                )}
                <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
              </div>
            ) : (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#F1ECF8] text-[#593C8F] dark:bg-[#20192C] dark:text-[#A8D5BA] border border-[#E7E0EE] dark:border-[#302B38]"
                title="Local session"
              >
                <Wifi className="w-3 h-3 text-[#593C8F] dark:text-[#A8D5BA]" />
                <span>LOCAL</span>
              </div>
            )}
          </div>

          {/* Command Palette Button */}
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#1B1820] hover:bg-[#F1ECF8] dark:hover:bg-[#281E36] border border-[#E7E0EE] dark:border-[#302B38] text-[#17151F] dark:text-[#F8F5FC] text-xs font-semibold transition"
            title="Command Palette (Ctrl + K)"
          >
            <Search className="w-3.5 h-3.5 text-[#6D6879] dark:text-[#A39BB0]" />
            <span className="hidden lg:inline text-[11px]">Command</span>
            <kbd className="hidden sm:inline px-1 py-0.5 text-[9px] font-mono bg-[#FAF6EE] dark:bg-[#111015] border border-[#E7E0EE] dark:border-[#302B38] rounded text-[#6D6879] dark:text-[#A39BB0]">
              ⌘K
            </kbd>
          </button>

          {/* Dark / Light Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-xl bg-white dark:bg-[#1B1820] hover:bg-[#F1ECF8] dark:hover:bg-[#281E36] border border-[#E7E0EE] dark:border-[#302B38] text-[#17151F] dark:text-[#F8F5FC] transition"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-[#F0B83A]" />
            ) : (
              <Moon className="w-4 h-4 text-[#593C8F]" />
            )}
          </button>

          {/* Quick Create CTA */}
          <button
            type="button"
            onClick={() => onNavigate('create')}
            className="px-3.5 py-2 rounded-xl bg-[#593C8F] hover:bg-[#483076] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Document</span>
          </button>
        </div>
      </div>
    </header>
  );
};
