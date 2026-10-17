'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { TemplateId, ColorThemeId, DocFontFamily, TaxMode, DocumentModel } from '@/types/document';
import { BillCraftIcon } from '@/components/ui/BillCraftIcons';
import { COLOR_THEMES, FONT_OPTIONS } from '@/lib/themes';
import { createSampleDocument } from '@/lib/sample-data';
import { DocumentRenderer } from '@/components/templates/DocumentRenderer';
import { Check, X, Eye, RotateCcw } from 'lucide-react';

interface TemplatesGalleryProps {
  currentTemplate: TemplateId;
  currentColorTheme: ColorThemeId;
  customColor: string;
  currentFontFamily?: DocFontFamily;
  docTaxMode?: TaxMode;
  onSelectTemplate: (templateId: TemplateId) => void;
  onSelectColorTheme: (themeId: ColorThemeId, customHex?: string) => void;
  onSelectFontFamily?: (font: DocFontFamily) => void;
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

const HEX_RE = /^#([0-9a-fA-F]{6})$/;

export const TemplatesGallery: React.FC<TemplatesGalleryProps> = ({
  currentTemplate,
  currentColorTheme,
  customColor,
  currentFontFamily,
  docTaxMode,
  onSelectTemplate,
  onSelectColorTheme,
  onSelectFontFamily,
  onNavigateToEditor,
  onBack,
}) => {
  const [filter, setFilter] = useState<'All' | 'Business' | 'GST' | 'Minimal' | 'Creative'>('All');
  const [previewTemplate, setPreviewTemplate] = useState<TemplateMeta | null>(null);

  // custom accent colour state (local, validated before applying)
  const isCustomActive = currentColorTheme === 'custom';
  const [hexInput, setHexInput] = useState<string>(isCustomActive ? customColor : '');
  const [hexError, setHexError] = useState<string>('');

  // deterministic recommendation: GST tax mode -> GST Professional template
  const recommended: TemplateId | null = docTaxMode === 'gst' ? 'gst_pro' : null;

  const filtered = filter === 'All' ? TEMPLATES : TEMPLATES.filter((t) => t.category === filter);
  const activeTemplateName = TEMPLATES.find((t) => t.id === currentTemplate)?.name || 'Modern';

  const applyHex = (raw: string) => {
    const hex = raw.trim().toLowerCase();
    if (!HEX_RE.test(hex)) {
      setHexError('Use 6-digit hex, e.g. #593c8f');
      return;
    }
    setHexError('');
    onSelectColorTheme('custom', hex);
  };

  return (
    <div className="max-w-[420px] mx-auto space-y-3.5 py-1 px-1 animate-in fade-in duration-200">
      {/* Nav */}
      <div className="nav">
        <div onClick={onBack || onNavigateToEditor} className="row cursor-pointer">
          <BillCraftIcon name="back" />
          <b>Templates</b>
        </div>
      </div>

      {/* Heading */}
      <div>
        <div className="h" style={{ color: 'var(--ink)' }}>Invoice Templates</div>
        <div className="m" style={{ marginTop: '3px', color: 'var(--mut)' }}>
          Preview, personalise and apply a style.
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
          const isRecommended = recommended === t.id;
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
                {isRecommended && !isSelected && (
                  <span
                    className="bdg"
                    title="Recommended for GST (CGST/SGST) documents"
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      left: '6px',
                      background: '#2E7D5B',
                      color: '#fff',
                    }}
                  >
                    Recommended
                  </span>
                )}

                {/* Preview action — opens the real document preview modal */}
                <button
                  type="button"
                  aria-label={`Preview ${t.name} template`}
                  onClick={(e) => {
                    e.stopPropagation(); // clicking preview must not select
                    setPreviewTemplate(t);
                  }}
                  className="absolute top-1 right-1 z-10 w-6 h-6 rounded-lg bg-white/90 dark:bg-[#1B1820]/90 border border-[#E7E0EE] dark:border-[#302B38] flex items-center justify-center hover:border-[#593C8F] transition"
                  style={{ opacity: 0.9 }}
                >
                  <Eye className="w-3.5 h-3.5 text-[#593C8F]" />
                </button>

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
                aria-label={`Use ${th.name} accent`}
              >
                {isThemeSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
              </button>
            );
          })}
        </div>

        {/* Custom accent: native picker + hex input + live swatch + reset */}
        <div
          className={`card mt-2 p-2.5 ${isCustomActive ? 'border-[#593C8F]' : ''}`}
          aria-label="Custom accent colour"
        >
          <div className="row items-center gap-2">
            <label
              className="w-8 h-8 rounded-lg border border-[#E7E0EE] dark:border-[#302B38] shrink-0 cursor-pointer flex items-center justify-center"
              style={{
                backgroundColor: isCustomActive && HEX_RE.test(customColor) ? customColor : '#593C8F',
              }}
              title="Native colour picker"
            >
              <input
                type="color"
                className="w-0 h-0 opacity-0"
                value={isCustomActive && HEX_RE.test(customColor) ? customColor : '#593C8F'}
                onChange={(e) => {
                  setHexInput(e.target.value);
                  applyHex(e.target.value);
                }}
                aria-label="Pick custom accent colour"
              />
            </label>
            <input
              type="text"
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              onBlur={() => hexInput && applyHex(hexInput)}
              onKeyDown={(e) => { if (e.key === 'Enter') applyHex(hexInput); }}
              placeholder="#593c8f"
              aria-label="Custom accent hex colour"
              className="flex-1 min-w-0 rounded-xl border border-[#E7E0EE] dark:border-[#302B38] bg-white dark:bg-[#17141D] px-2.5 py-1.5 text-[11px] font-mono text-[#17151F] dark:text-[#F8F5FC]"
            />
            <button
              type="button"
              onClick={() => applyHex(hexInput)}
              className="btn o shrink-0"
              style={{ fontSize: 10.5 }}
            >
              Apply
            </button>
            <button
              type="button"
              onClick={() => { setHexInput(''); setHexError(''); onSelectColorTheme('plum'); }}
              title="Reset to default accent"
              aria-label="Reset accent colour to default"
              className="p-1.5 rounded-lg hover:bg-[#F1ECF8] dark:hover:bg-[#281E36] shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#6D6879]" />
            </button>
          </div>
          {isCustomActive && HEX_RE.test(customColor) && (
            <div className="row items-center gap-1.5 mt-1.5">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: customColor }} />
              <span className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0]">
                Live: {customColor} applied to document &amp; PDF
              </span>
            </div>
          )}
          {hexError && <p className="text-[9.5px] text-red-500 mt-1">{hexError}</p>}
        </div>
      </div>

      {/* Font selection */}
      {onSelectFontFamily && (
        <div className="pt-1">
          <div className="lab" style={{ marginBottom: '8px' }}>DOCUMENT FONT</div>
          <div className="grid grid-cols-3 gap-1.5">
            {FONT_OPTIONS.map((f) => {
              const active = (currentFontFamily || 'sans') === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onSelectFontFamily(f.id)}
                  className={`rounded-xl border px-2 py-1.5 text-center transition cursor-pointer ${
                    active
                      ? 'border-[#593C8F] bg-[#FAF6EE] dark:bg-[#281E36]'
                      : 'border-[#E7E0EE] dark:border-[#302B38] hover:border-[#593C8F]/50'
                  }`}
                  aria-pressed={active}
                >
                  <b className="block text-[11px] text-[#17151F] dark:text-[#F8F5FC]" style={{ fontFamily: f.stack }}>
                    {f.name}
                  </b>
                  <span className="text-[8.5px] text-[#6D6879] dark:text-[#A39BB0]">{f.hint}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0] mt-1">
            Uses fonts installed on your device — no network needed. Applied to preview and PDF export.
          </p>
        </div>
      )}

      {/* Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onNavigateToEditor}
          className="btn w-full"
        >
          Use {activeTemplateName} Template
        </button>
        {isCustomActive && (
          <p className="text-center text-[9.5px] text-[#6D6879] dark:text-[#A39BB0] mt-1.5">
            Custom accent saved with your preferences and applied to new documents.
          </p>
        )}
      </div>

      {/* Real preview modal */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          colorTheme={currentColorTheme}
          customColor={customColor}
          fontFamily={currentFontFamily}
          recommended={recommended === previewTemplate.id}
          onClose={() => setPreviewTemplate(null)}
          onUse={() => {
            onSelectTemplate(previewTemplate.id);
            setPreviewTemplate(null);
          }}
        />
      )}
    </div>
  );
};

/**
 * Realistic preview: renders the ACTUAL DocumentRenderer with representative
 * sample data in the chosen template/colour/font. Read-only — it never
 * mutates the user's current document.
 */
const TemplatePreviewModal: React.FC<{
  template: TemplateMeta;
  colorTheme: ColorThemeId;
  customColor: string;
  fontFamily?: DocFontFamily;
  recommended: boolean;
  onClose: () => void;
  onUse: () => void;
}> = ({ template, colorTheme, customColor, fontFamily, recommended, onClose, onUse }) => {
  const sampleDoc = useMemo<DocumentModel>(() => {
    const doc = createSampleDocument('invoice');
    return {
      ...doc,
      template: template.id,
      colorTheme,
      customColor: colorTheme === 'custom' ? customColor : doc.customColor,
      fontFamily,
      showBillCraftBranding: true,
    };
  }, [template.id, colorTheme, customColor, fontFamily]);

  // Esc closes; focus management kept simple but keyboard-friendly
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview of ${template.name} template`}
      onClick={onClose}
    >
      <div
        className="bg-[#FAF6EE] dark:bg-[#17141D] rounded-2xl w-full max-w-[520px] max-h-[92vh] flex flex-col shadow-2xl border border-[#E7E0EE] dark:border-[#302B38]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="row sp p-3 border-b border-[#E7E0EE] dark:border-[#302B38]">
          <div className="min-w-0">
            <b className="block text-[12.5px] text-[#17151F] dark:text-[#F8F5FC] truncate">
              {template.name} <span className="text-[9.5px] font-bold text-[#6D6879]">· {template.category} style</span>
            </b>
            <span className="text-[9.5px] text-[#6D6879] dark:text-[#A39BB0]">
              Representative sample data{recommended ? ' · Recommended for GST documents' : ''}
            </span>
          </div>
          <div className="row shrink-0" style={{ gap: 6 }}>
            <button type="button" onClick={onUse} className="btn" style={{ fontSize: 10.5, padding: '6px 10px' }}>
              Use This Template
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="p-1.5 rounded-lg hover:bg-[#F1ECF8] dark:hover:bg-[#281E36]"
            >
              <X className="w-4 h-4 text-[#6D6879]" />
            </button>
          </div>
        </div>

        {/* Preview body — the real renderer at reduced scale */}
        <div className="overflow-auto p-2 flex-1 bg-[#F1ECF8]/60 dark:bg-[#100E14]" data-testid="template-preview">
          <div style={{ transform: 'scale(0.52)', transformOrigin: 'top left', width: '210mm' }}>
            <DocumentRenderer document={sampleDoc} />
          </div>
        </div>

        {/* Footer */}
        <div className="row sp p-2.5 border-t border-[#E7E0EE] dark:border-[#302B38]">
          <span className="text-[9px] text-[#6D6879] dark:text-[#A39BB0]">
            Sample preview only — your documents are never modified until you apply the template.
          </span>
          <button type="button" onClick={onUse} className="btn shrink-0" style={{ fontSize: 10 }}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};
