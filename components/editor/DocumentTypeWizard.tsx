'use client';

import React, { useState } from 'react';
import { DocumentType } from '@/types/document';
import { BillCraftIcon, IconName } from '@/components/ui/BillCraftIcons';
import { BillCraftLogo } from '@/components/ui/BillCraftLogo';

interface DocumentTypeWizardProps {
  onSelectType: (type: DocumentType) => void;
  onLoadDemo?: () => void;
}

interface DocOption {
  id: DocumentType;
  title: string;
  subtitle: string;
  icon: IconName;
}

const DOC_OPTIONS: DocOption[] = [
  {
    id: 'invoice',
    title: 'INVOICE',
    subtitle: 'Professional billing documents',
    icon: 'doc',
  },
  {
    id: 'quotation',
    title: 'QUOTATION',
    subtitle: 'Send clear project quotes',
    icon: 'clip',
  },
  {
    id: 'receipt',
    title: 'RECEIPT',
    subtitle: 'Record received payments',
    icon: 'rec',
  },
  {
    id: 'estimate',
    title: 'ESTIMATE',
    subtitle: 'Plan project costs',
    icon: 'calc',
  },
  {
    id: 'proforma',
    title: 'PROFORMA',
    subtitle: 'Preliminary business invoice',
    icon: 'doc',
  },
];

export const DocumentTypeWizard: React.FC<DocumentTypeWizardProps> = ({
  onSelectType,
  onLoadDemo,
}) => {
  const [selectedType, setSelectedType] = useState<DocumentType>('invoice');

  return (
    <div className="max-w-[420px] mx-auto space-y-3 py-1 px-1 animate-in fade-in duration-200">
      {/* Brand Header */}
      <div className="row sp">
        <div className="row">
          <BillCraftLogo variant="lockup" size={40} />
        </div>
      </div>

      {/* Title */}
      <div>
        <div className="h" style={{ color: 'var(--ink)' }}>Create a document</div>
        <div className="m" style={{ marginTop: '3px', color: 'var(--mut)' }}>
          Choose what you need.
        </div>
      </div>

      {/* Selectable Cards */}
      <div className="space-y-2 pt-1">
        {DOC_OPTIONS.map((item) => {
          const isSelected = selectedType === item.id;
          return (
            <div
              key={item.id}
              onClick={() => setSelectedType(item.id)}
              className={`card row pk cursor-pointer select-none transition ${
                isSelected ? 'sel' : 'hover:border-slate-300 dark:hover:border-slate-700'
              }`}
              style={{ padding: '11px' }}
            >
              <span
                className="ic"
                style={
                  isSelected
                    ? { background: 'var(--pl)', color: '#fff' }
                    : undefined
                }
              >
                <BillCraftIcon name={item.icon} />
              </span>

              <div className="flex-1 min-w-0">
                <b
                  style={{ fontSize: '12px', letterSpacing: '.05em' }}
                  className="block text-[#17151F] dark:text-[#F8F5FC]"
                >
                  {item.title}
                </b>
                <div className="m truncate" style={{ fontSize: '10.5px', color: 'var(--mut)' }}>
                  {item.subtitle}
                </div>
              </div>

              {isSelected && (
                <span className="ck">
                  <BillCraftIcon name="ok" />
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Continue CTA */}
      <div className="pt-3 space-y-2">
        <button
          type="button"
          onClick={() => onSelectType(selectedType)}
          className="btn w-full"
        >
          <span>Continue</span>
          <BillCraftIcon name="ar" />
        </button>

        {onLoadDemo && (
          <button
            type="button"
            onClick={onLoadDemo}
            className="w-full text-center text-xs text-[#593C8F] dark:text-[#A8D5BA] hover:underline font-bold py-1 cursor-pointer"
          >
            Or populate with sample demo invoice
          </button>
        )}
      </div>
    </div>
  );
};
