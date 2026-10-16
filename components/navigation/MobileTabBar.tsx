'use client';

import React from 'react';
import { NavTab } from './Header';
import { BillCraftIcon } from '@/components/ui/BillCraftIcons';

interface MobileTabBarProps {
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  hasActiveDocument?: boolean;
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({
  activeTab,
  onNavigate,
}) => {
  return (
    <nav className="no-print md:hidden bn" aria-label="Bottom Navigation">
      <button
        type="button"
        onClick={() => onNavigate('home')}
        className={activeTab === 'home' ? 'on' : ''}
        aria-label="Home"
      >
        <BillCraftIcon name="home" />
        <span>Home</span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate('create')}
        className={activeTab === 'create' ? 'on' : ''}
        aria-label="Create Document"
      >
        <BillCraftIcon name="plus" />
        <span>Create</span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate('editor')}
        className={activeTab === 'editor' ? 'on' : ''}
        aria-label="Document Editor"
      >
        <BillCraftIcon name="doc" />
        <span>Editor</span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate('templates')}
        className={activeTab === 'templates' ? 'on' : ''}
        aria-label="Templates Gallery"
      >
        <BillCraftIcon name="grid" />
        <span>Templates</span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate('tools')}
        className={activeTab === 'tools' ? 'on' : ''}
        aria-label="Business Tools"
      >
        <BillCraftIcon name="calc" />
        <span>Tools</span>
      </button>

      <button
        type="button"
        onClick={() => onNavigate('settings')}
        className={activeTab === 'settings' ? 'on' : ''}
        aria-label="Settings"
      >
        <BillCraftIcon name="gear" />
        <span>Settings</span>
      </button>
    </nav>
  );
};
