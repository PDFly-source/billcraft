'use client';

import React, { useState } from 'react';
import { TemplateId, ColorThemeId } from '@/types/document';
import { BillCraftIcon } from '@/components/ui/BillCraftIcons';
import { COLOR_THEMES } from '@/lib/themes';
import { Check } from 'lucide-react';

interface TemplatesGalleryProps {
  currentTemplate: TemplateId;
  currentColorTheme: ColorThemeId;
  customColor: string;
  onSelectTemplate: (templateId: TemplateId) => void;
  onSelectColorTheme: (themeId: ColorThemeId, customHex?: string) => void;
  onNavigateToEditor: () => void;
  onBack?: () => void;
}

interface TemplateMeta {
  id: TemplateId;
  name: string;
  category: 'Business' | 'GST' | 'Minimal' | 'Creative';
}

const TEMPLATES: TemplateMeta[] = [
  { id: 'modern', name: 'Modern', category: 'Business' },
  { id: 'classic', name: 'Classic', category: 'Business' },
  { id: 'minimal', name: 'Minimal', category: 'Minimal' },
  { id: 'corporate', name: 'Corporate', category: 'Business' },
  { id: 'elegant', name: 'Elegant', category: 'Creative' },
  { id: 'gst_pro', name: 'GST Professional', category: 'GST' },
  { id: 'bold', name: 'Bold', category: 'Creative' },
  { id: 'freelancer', name: 'Freelancer', category: 'Creative' },
  { id: 'service', name: 'Service', category: 'Business' },
  { id: 'retail', name: 'Retail', category: 'Minimal' },
];

export const TemplatesGallery: React.FC<TemplatesGalleryProps> = ({
  currentTemplate,
  currentColorTheme,
  onSelectTemplate,
  onSelectColorTheme,
  onNavigateToEditor,
  onBack,
}) => {
  const [filter, setFilter] = useState<'All' | 'Business' | 'GST' | 'Minimal' | 'Creative'>('All');

  const filtered = filter === 'All' ? TEMPLATES : TEMPLATES.filter((t) => t.category === filter);
  const activeTemplateName = TEMPLATES.find((t) => t.id === currentTemplate)?.name || 'Modern';

  return (
    <div className="max-w-[420px] mx-auto space-y-3.5 py-1 px-1 animate-in fade-in duration-200">
      {/* Nav */}
      <div className="nav">
        <div
          onClick={onBack || onNavigateToEditor}
          className="row cursor-pointer"
        >
          <BillCraftIcon name="back" />
          <b>Templates</b>
        </div>
      </div>

      {/* Heading */}
      <div>
        <div className="h" style={{ color: 'var(--ink)' }}>Invoice Templates</div>
        <div className="m" style={{ marginTop: '3px', color: 'var(--mut)' }}>
          Choose a style that fits your business.
        </div>
      </div>

      {/* Filter Chips */}
      <div className="row" style={{ gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
        {(['All', 'Business', 'GST', 'Minimal', 'Creative'] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilter(cat)}
            className={`chip ${filter === cat ? 'on' : ''}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 2-Column Template Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {filtered.map((t) => {
          const isSelected = currentTemplate === t.id;
          return (
            <div
              key={t.id}
              onClick={() => onSelectTemplate(t.id)}
              className="cursor-pointer select-none group"
            >
              <div
                className="tp"
                style={{
                  border: isSelected ? '2px solid var(--pl)' : '1px solid var(--bd)',
                  position: 'relative',
                  ...(t.id === 'corporate' ? { borderTop: '12px solid var(--em)' } : {}),
                  ...(t.id === 'elegant' ? { background: '#fffdf7' } : {}),
                }}
              >
                {isSelected && (
                  <span
                    className="bdg"
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '6px',
                      background: 'var(--pl)',
                      color: '#fff',
                    }}
                  >
                    Selected
                  </span>
                )}

                {/* Specific mini thumbnail patterns matching reference HTML */}
                {t.id === 'modern' && (
                  <>
                    <div className="row sp">
                      <i style={{ width: '30%', background: 'var(--pl)' }} />
                      <i style={{ width: '20%' }} />
                    </div>
                    <i style={{ width: '50%', marginTop: '6px' }} />
                    <i />
                    <i />
                    <i style={{ width: '70%' }} />
                    <i style={{ width: '40%', margin: 'auto 0 0 auto', background: 'var(--pl)', height: '6px' }} />
                  </>
                )}

                {t.id === 'classic' && (
                  <>
                    <i style={{ width: '40%', background: 'var(--ink)', height: '5px' }} />
                    <i style={{ width: '55%', marginTop: '6px' }} />
                    <i />
                    <i />
                    <i style={{ width: '70%' }} />
                    <i style={{ width: '35%', margin: 'auto 0 0 auto', background: 'var(--ink)' }} />
                  </>
                )}

                {t.id === 'minimal' && (
                  <>
                    <i style={{ width: '25%' }} />
                    <i style={{ marginTop: '14px' }} />
                    <i />
                    <i style={{ width: '60%' }} />
                    <i style={{ width: '30%', margin: 'auto 0 0 auto' }} />
                  </>
                )}

                {t.id === 'corporate' && (
                  <>
                    <i style={{ width: '45%' }} />
                    <i />
                    <i />
                    <i style={{ width: '75%' }} />
                    <i style={{ width: '35%', margin: 'auto 0 0 auto', background: 'var(--em)' }} />
                  </>
                )}

                {t.id === 'elegant' && (
                  <>
                    <i style={{ width: '40%', background: 'var(--gold)', margin: '0 auto' }} />
                    <i style={{ marginTop: '8px' }} />
                    <i />
                    <i style={{ width: '60%' }} />
                    <i style={{ width: '35%', margin: 'auto 0 0 auto', background: 'var(--gold)' }} />
                  </>
                )}

                {t.id === 'gst_pro' && (
                  <>
                    <div style={{ background: 'var(--mint)', height: '16px', borderRadius: '3px' }} />
                    <i />
                    <i />
                    <i style={{ width: '65%' }} />
                    <div className="row sp" style={{ marginTop: 'auto' }}>
                      <i style={{ width: '30%' }} />
                      <i style={{ width: '30%', background: 'var(--em)' }} />
                    </div>
                  </>
                )}

                {t.id === 'bold' && (
                  <>
                    <div style={{ background: 'var(--ink)', height: '14px', borderRadius: '3px' }} />
                    <i />
                    <i style={{ width: '75%' }} />
                    <i style={{ width: '40%', margin: 'auto 0 0 auto', background: 'var(--ink)' }} />
                  </>
                )}

                {t.id === 'freelancer' && (
                  <>
                    <i style={{ width: '35%', background: 'var(--pl)' }} />
                    <i style={{ width: '50%', marginTop: '6px' }} />
                    <i />
                    <i style={{ width: '60%' }} />
                    <i style={{ width: '30%', margin: 'auto 0 0 auto' }} />
                  </>
                )}

                {t.id === 'service' && (
                  <>
                    <i style={{ width: '50%' }} />
                    <i style={{ marginTop: '6px' }} />
                    <i />
                    <i style={{ width: '70%' }} />
                    <i style={{ width: '35%', margin: 'auto 0 0 auto', background: 'var(--pl)' }} />
                  </>
                )}

                {t.id === 'retail' && (
                  <>
                    <i style={{ width: '45%', margin: '0 auto' }} />
                    <i style={{ borderTop: '1px dashed #d1c7e0', marginTop: '6px' }} />
                    <i style={{ width: '80%' }} />
                    <i style={{ width: '40%', margin: 'auto 0 0 auto' }} />
                  </>
                )}
              </div>
              <div className="cap">{t.name}</div>
            </div>
          );
        })}
      </div>

      {/* Color Accent Picker */}
      <div className="pt-2">
        <div className="lab" style={{ marginBottom: '8px' }}>COLOR THEME ACCENT</div>
        <div className="row" style={{ gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {Object.values(COLOR_THEMES).map((th) => {
            if (th.id === 'custom') return null;
            const isThemeSelected = currentColorTheme === th.id;
            return (
              <button
                key={th.id}
                type="button"
                onClick={() => onSelectColorTheme(th.id)}
                className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center transition shadow-xs cursor-pointer ${
                  isThemeSelected ? 'ring-2 ring-[#593C8F] ring-offset-2' : ''
                }`}
                style={{ backgroundColor: th.primary }}
                title={th.name}
              >
                {isThemeSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onNavigateToEditor}
          className="btn w-full"
        >
          Use {activeTemplateName} Template
        </button>
      </div>
    </div>
  );
};
