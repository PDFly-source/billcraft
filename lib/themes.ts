import { ColorThemeId } from '@/types/document';

export interface ThemeColorDefinition {
  id: ColorThemeId;
  name: string;
  primary: string;
  lightBg: string;
  border: string;
  badgeBg: string;
}

export const COLOR_THEMES: Record<ColorThemeId, ThemeColorDefinition> = {
  plum: {
    id: 'plum',
    name: 'Royal Plum',
    primary: '#593C8F',
    lightBg: '#F5F0FF',
    border: '#E3D7FA',
    badgeBg: '#EDE4FC',
  },
  mint: {
    id: 'mint',
    name: 'Mint Mist',
    primary: '#2B7A5D',
    lightBg: '#EFF8F3',
    border: '#CBE5D7',
    badgeBg: '#DFF1E7',
  },
  coral: {
    id: 'coral',
    name: 'Coral Red',
    primary: '#D93838',
    lightBg: '#FDF2F2',
    border: '#F8CECE',
    badgeBg: '#FBE4E4',
  },
  cornflower: {
    id: 'cornflower',
    name: 'Cornflower Blue',
    primary: '#2563EB',
    lightBg: '#EFF6FF',
    border: '#BFDBFE',
    badgeBg: '#DBEAFE',
  },
  golden: {
    id: 'golden',
    name: 'Honey Gold',
    primary: '#B45309',
    lightBg: '#FFFBEB',
    border: '#FDE68A',
    badgeBg: '#FEF3C7',
  },
  emerald: {
    id: 'emerald',
    name: 'Deep Emerald',
    primary: '#203D43',
    lightBg: '#F0F5F6',
    border: '#CBD9DB',
    badgeBg: '#DEEAEC',
  },
  navy: {
    id: 'navy',
    name: 'Deep Navy',
    primary: '#0F172A',
    lightBg: '#F8FAFC',
    border: '#CBD5E1',
    badgeBg: '#E2E8F0',
  },
  blush: {
    id: 'blush',
    name: 'Rose Blush',
    primary: '#BE185D',
    lightBg: '#FDF2F8',
    border: '#FBCFE8',
    badgeBg: '#FCE7F3',
  },
  electric: {
    id: 'electric',
    name: 'Electric Violet',
    primary: '#7C3AED',
    lightBg: '#F5F3FF',
    border: '#DDD6FE',
    badgeBg: '#EDE9FE',
  },
  custom: {
    id: 'custom',
    name: 'Custom Accent',
    primary: '#593C8F',
    lightBg: '#F5F0FF',
    border: '#E3D7FA',
    badgeBg: '#EDE4FC',
  },
};

export function getThemeColor(themeId: ColorThemeId, customHex?: string): ThemeColorDefinition {
  if (themeId === 'custom' && customHex) {
    return {
      id: 'custom',
      name: 'Custom',
      primary: customHex,
      lightBg: '#F8F8FA',
      border: '#E2E2E8',
      badgeBg: '#EFEFF5',
    };
  }
  return COLOR_THEMES[themeId] || COLOR_THEMES.plum;
}

// ------------------------- document fonts -------------------------

import { DocFontFamily } from '@/types/document';

export interface FontOption {
  id: DocFontFamily;
  name: string;
  stack: string; // locally available system font stacks — no network requests
  hint: string;
}

export const FONT_OPTIONS: FontOption[] = [
  {
    id: 'sans',
    name: 'Modern Sans',
    stack: "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif",
    hint: 'Clean default look',
  },
  {
    id: 'serif',
    name: 'Professional Serif',
    stack: "Georgia, 'Times New Roman', 'Noto Serif', serif",
    hint: 'Classic, formal documents',
  },
  {
    id: 'mono',
    name: 'Monospace',
    stack: "'Cascadia Code', 'SF Mono', Consolas, 'DejaVu Sans Mono', monospace",
    hint: 'Technical / engineering style',
  },
];

export function getFontStack(id?: DocFontFamily): string {
  return FONT_OPTIONS.find((f) => f.id === id)?.stack || FONT_OPTIONS[0].stack;
}
