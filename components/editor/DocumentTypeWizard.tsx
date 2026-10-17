'use client';

import React, { useRef, useState } from 'react';
import { DocumentType } from '@/types/document';
import { BillCraftIcon, IconName } from '@/components/ui/BillCraftIcons';
import { BillCraftLogo } from '@/components/ui/BillCraftLogo';
import { FlaskConical, ArrowRight } from 'lucide-react';

interface DocumentTypeWizardProps {
  onSelectType: (type: DocumentType) => void;
  onLoadDemo?: () => void;
}

interface DocOption {
  id: DocumentType;
  title: string;
  subtitle: string;
  icon: IconName;
  hint?: string;
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
  {
    id: 'purchase_order',
    title: 'PURCHASE ORDER',
    subtitle: 'Order goods from a supplier',
    icon: 'clip',
    hint: 'NEW',
  },
  {
    id: 'delivery_challan',
    title: 'DELIVERY CHALLAN',
    subtitle: 'Dispatch & delivery of goods',
    icon: 'ar',
    hint: 'NEW',
  },
  {
    id: 'credit_note',
    title: 'CREDIT NOTE',
    subtitle: 'Reduce a previous supply',
    icon: 'ok',
    hint: 'NEW',
  },
  {
    id: 'debit_note',
    title: 'DEBIT NOTE',
    subtitle: 'Increase a previous supply',
    icon: 'plus',
    hint: 'NEW',
  },
];

export const DocumentTypeWizard: React.FC<DocumentTypeWizardProps> = ({
  onSelectType,
  onLoadDemo,
}) => {
  const [selectedType, setSelectedType] = useState<DocumentType>('invoice');
  // Guards against accidental double navigation / duplicate documents when a
  // card is clicked twice quickly (the create handler is async).
  const creatingRef = useRef<DocumentType | null>(null);

  /** One intentional action: click (or Enter) -> create this document type. */
  const createNow = (type: DocumentType) => {
    if (creatingRef.current) return; // a creation is already in flight
    creatingRef.current = type;
    setSelectedType(type);
    onSelectType(type);
  };

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
          Pick a type — it opens ready to edit in one click.
        </div>
      </div>

      {/* Prominent Sample Document card (never overwrites real data —
          it only loads a demo draft into the editor). */}
      {onLoadDemo && (
        <button
          type="button"
          onClick={() => onLoadDemo()}
          className="card w-full text-left cursor-pointer hover:border-[#593C8F] transition group"
          style={{ padding: '12px', background: 'linear-gradient(135deg, #FAF6EE, #F1EAF9)' }}
          aria-label="Load sample document with demo data"
        >
          <div className="row items-center gap-2.5">
            <span className="ic shrink-0" style={{ background: 'var(--gold)', color: '#17151F' }}>
              <FlaskConical className="w-3.5 h-3.5" />
            </span>
            <div className="flex-1 min-w-0">
              <b className="block text-[12px] text-[#17151F]" style={{ letterSpacing: '.03em' }}>
                SAMPLE DOCUMENT <span className="bdg" style={{ background: '#F0B83A', color: '#17151F', marginLeft: 4 }}>DEMO</span>
              </b>
              <div className="m" style={{ fontSize: '10.5px', color: 'var(--mut)' }}>
                Explore the editor with pre-filled demo data — clearly labelled, never saved over your records
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#593C8F] shrink-0" />
          </div>
        </button>
      )}

      {/* Selectable Cards — click = select AND proceed (single intentional action) */}
      <div className="space-y-2 pt-1">
        {DOC_OPTIONS.map((item) => {
          const isSelected = selectedType === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => createNow(item.id)}
              className={`card row pk cursor-pointer select-none transition w-full text-left ${
                isSelected ? 'sel' : 'hover:border-slate-300 dark:hover:border-slate-700'
              }`}
              style={{ padding: '11px' }}
              aria-label={`Create ${item.title}: ${item.subtitle}`}
            >
              <span
                className="ic"
                style={isSelected ? { background: 'var(--pl)', color: '#fff' } : undefined}
              >
                <BillCraftIcon name={item.icon} />
              </span>

              <div className="flex-1 min-w-0">
                <b
                  style={{ fontSize: '12px', letterSpacing: '.05em' }}
                  className="block text-[#17151F] dark:text-[#F8F5FC]"
                >
                  {item.title}
                  {item.hint && (
                    <span className="bdg" style={{ background: '#6FBF9E', color: '#17151F', marginLeft: 6 }}>
                      {item.hint}
                    </span>
                  )}
                </b>
                <div className="m truncate" style={{ fontSize: '10.5px', color: 'var(--mut)' }}>
                  {item.subtitle}
                </div>
              </div>

              <BillCraftIcon name="ar" style={{ width: '14px', color: 'var(--pl)', flexShrink: 0 }} />
            </button>
          );
        })}
      </div>

      {/* Continue CTA — kept for accessibility: change the selection above
          (click still proceeds immediately), then confirm here if preferred. */}
      <div className="pt-2 space-y-2">
        <button
          type="button"
          onClick={() => createNow(selectedType)}
          className="btn w-full"
        >
          <span>Continue with {DOC_OPTIONS.find((d) => d.id === selectedType)?.title}</span>
          <BillCraftIcon name="ar" />
        </button>
        <p className="text-center text-[9.5px] text-[#6D6879] dark:text-[#A39BB0]">
          Clicking any card opens that document immediately. One document is created per click.
        </p>
      </div>
    </div>
  );
};
