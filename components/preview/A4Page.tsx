'use client';

import React, { useEffect, useRef, useState } from 'react';
import { DocumentModel } from '@/types/document';
import { DocumentRenderer } from '@/components/templates/DocumentRenderer';

/**
 * True A4 preview surface (Phase 4.1).
 *
 * The DocumentRenderer sheet always renders at its REAL physical width
 * (210mm ≈ 794px). This wrapper scales that fixed sheet UNIFORMLY to fit
 * whatever horizontal space is available — 390px phones included — so:
 *
 * - the 210:297 page aspect ratio is preserved at every screen width;
 * - document columns are never compressed or reflowed to the viewport;
 * - the bottom navigation / sticky bars cannot affect the document layout;
 * - what you see on screen is geometrically identical to the exported PDF.
 *
 * The scale is a pure presentation transform: the PDF exporter captures the
 * inner sheet at its true 210mm width, never this scaled rendering.
 */

/** 96 CSS pixels per 25.4mm — the unit browsers use for mm in styles. */
export const MM_TO_PX = 96 / 25.4;

function paperWidthMm(doc: DocumentModel): number {
  return doc.paperSize === 'a5' ? 148 : doc.paperSize === 'letter' ? 216 : 210;
}

interface A4PageProps {
  document: DocumentModel;
  /** Unique sheet id — each mounted preview must have its own. */
  sheetId: string;
  /** Extra multiplier on top of the computed fit scale (e.g. modal zoom). */
  zoom?: number;
  /** Neutral surrounding surface class. */
  className?: string;
  /** Render a subtle guide at every 297mm page boundary. */
  showPageBreakGuides?: boolean;
  /**
   * When set, ALSO render an off-screen, true-size copy of the sheet for
   * PDF export. Exports must never capture the scaled on-screen visual:
   * a CSS transform on the visual's ancestor can stall html2canvas and
   * produces device-dependent captures. The export sheet is outside the
   * transform chain, always exactly paperWidthMm wide, and hidden until
   * the exporter temporarily un-hides it (see generatePDFBlob).
   */
  exportSheetId?: string;
}

export const A4Page: React.FC<A4PageProps> = ({
  document: doc,
  sheetId,
  zoom = 1,
  className = '',
  showPageBreakGuides = true,
  exportSheetId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sheetHolderRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<number | null>(null);
  const [sheetHeight, setSheetHeight] = useState<number | null>(null);
  const paperW = paperWidthMm(doc);
  const paperWpx = paperW * MM_TO_PX;

  // Uniform scale-to-fit: watch BOTH the available width (scale factor) and
  // the rendered sheet height (multi-page documents grow past 297mm).
  useEffect(() => {
    const container = containerRef.current;
    const holder = sheetHolderRef.current;
    if (!container || !holder) return;

    const measure = () => {
      const available = container.clientWidth;
      if (available > 0) {
        const raw = available / paperWpx;
        setFit(Math.min(1, Math.max(0.15, raw)));
      }
      setSheetHeight(holder.scrollHeight);
    };

    measure();
    const roContainer = new ResizeObserver(measure);
    roContainer.observe(container);
    const roHolder = new ResizeObserver(measure);
    roHolder.observe(holder);
    return () => {
      roContainer.disconnect();
      roHolder.disconnect();
    };
  }, [paperWpx, doc]);

  const scale = (fit ?? 1) * zoom;
  const displayW = paperWpx * scale;
  const displayH = sheetHeight !== null ? sheetHeight * scale : null;
  const pageCount = sheetHeight ? Math.max(1, Math.ceil(sheetHeight / (297 * MM_TO_PX) - 0.02)) : 1;

  return (
    <>
    <div
      ref={containerRef}
      className={`doc-preview-scaler rounded-xl bg-[#EFEAF5] dark:bg-[#111015] overflow-hidden ${className}`}
      role="img"
      aria-label={`${doc.type} preview — A4 page scaled to fit`}
    >
      <div
        className="doc-scale-frame relative mx-auto"
        style={{ width: displayW || undefined, height: displayH ?? undefined }}
      >
        <div
          ref={sheetHolderRef}
          className="doc-scale-inner origin-top-left"
          style={{ transform: `scale(${scale})`, width: `${paperWpx}px` }}
        >
          <DocumentRenderer document={doc} sheetId={sheetId} />
        </div>

        {/* Page-boundary guides: where the PDF exporter will slice pages. */}
        {showPageBreakGuides && pageCount > 1 &&
          Array.from({ length: pageCount - 1 }, (_, i) => (
            <div
              key={i}
              aria-hidden
              className="absolute left-0 right-0 border-t border-dashed border-[#593C8F]/25 pointer-events-none"
              style={{ top: (i + 1) * 297 * MM_TO_PX * scale }}
            />
          ))}
      </div>
    </div>

      {/* Off-screen true-size export sheet — OUTSIDE the scale transform
          chain (sibling of the scaler), so exports are deterministic and
          identical on every viewport. */}
      {exportSheetId ? (
        <div className="hidden" aria-hidden>
          <DocumentRenderer document={doc} sheetId={exportSheetId} />
        </div>
      ) : null}
    </>
  );
};
