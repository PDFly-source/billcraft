'use client';

import React, { useState, useEffect } from 'react';
import { DocumentModel } from '@/types/document';
import { DocumentRenderer } from '@/components/templates/DocumentRenderer';
import { downloadPDF, shareOrDownloadPDF } from '@/lib/pdf-generator';
import { BillCraftIcon } from '@/components/ui/BillCraftIcons';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface FullscreenPreviewModalProps {
  isOpen: boolean;
  document: DocumentModel;
  onClose: () => void;
  onShowToast: (message: string) => void;
}

export const FullscreenPreviewModal: React.FC<FullscreenPreviewModalProps> = ({
  isOpen,
  document: doc,
  onClose,
  onShowToast,
}) => {
  const [scale, setScale] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.15, 1.8));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.15, 0.5));
  const handleResetZoom = () => setScale(1);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    const el = window.document.getElementById('printable-document');
    if (!el) return;

    try {
      setIsExporting(true);
      const filename = await downloadPDF(el, doc, {
        paperSize: doc.paperSize,
        orientation: doc.orientation,
      });
      setExportSuccess(true);
      onShowToast(`PDF downloaded: ${filename}`);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('PDF export failed:', err);
      onShowToast('PDF generation failed. Use browser Print → Save as PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    const el = window.document.getElementById('printable-document');
    if (!el) return;

    try {
      setIsExporting(true);
      const res = await shareOrDownloadPDF(el, doc, {
        paperSize: doc.paperSize,
        orientation: doc.orientation,
      });
      if (res.shared) {
        onShowToast('Document shared successfully!');
      } else if (res.downloaded) {
        onShowToast('PDF downloaded to your device.');
      }
    } catch (err) {
      console.error('Share failed:', err);
      onShowToast('Share action cancelled or unsupported.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/95 backdrop-blur-md animate-in fade-in duration-150">
      {/* Top Floating Toolbar matching Screen 05 nav */}
      <div className="no-print h-14 bg-white dark:bg-[#1B1820] border-b border-[#E7E0EE] dark:border-[#302B38] px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-xs">
        <div onClick={onClose} className="row cursor-pointer text-[#17151F] dark:text-[#F8F5FC]">
          <BillCraftIcon name="back" />
          <b className="text-sm tracking-tight capitalize">
            {doc.type} Preview
          </b>
          <span className="bdg text-[9px] hidden sm:inline ml-2">
            A4 · LIVE PREVIEW
          </span>
        </div>

        {/* Action Controls */}
        <div className="row" style={{ gap: '10px' }}>
          {/* Zoom controls */}
          <div className="hidden md:flex items-center bg-[#FAF6EE] dark:bg-[#111015] rounded-lg p-0.5 border border-[#E7E0EE] dark:border-[#302B38] mr-1">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1 rounded text-[#6D6879] hover:text-[#17151F] cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-1.5 text-[#17151F] dark:text-[#F8F5FC]">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1 rounded text-[#6D6879] hover:text-[#17151F] cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="p-1 rounded text-[#6D6879] hover:text-[#17151F] ml-0.5 cursor-pointer"
              title="Fit"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>

          {/* Share */}
          <button
            type="button"
            onClick={handleShare}
            disabled={isExporting}
            className="p-2 rounded-xl text-[#17151F] dark:text-[#F8F5FC] hover:bg-[#FAF6EE] dark:hover:bg-[#281E36] transition cursor-pointer"
            title="Share Document"
          >
            <BillCraftIcon name="share" />
          </button>

          {/* Print */}
          <button
            type="button"
            onClick={handlePrint}
            className="p-2 rounded-xl text-[#17151F] dark:text-[#F8F5FC] hover:bg-[#FAF6EE] dark:hover:bg-[#281E36] transition cursor-pointer"
            title="Print Document"
          >
            <BillCraftIcon name="prt" />
          </button>

          {/* Download PDF */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={isExporting}
            className="px-3.5 py-1.5 rounded-xl bg-[#593C8F] hover:bg-[#483076] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50 cursor-pointer"
            title="Download PDF"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating…</span>
              </>
            ) : exportSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Downloaded!</span>
              </>
            ) : (
              <>
                <BillCraftIcon name="file-preview-outline" style={{ width: '15px', height: '15px' }} />
                <span>Export PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Document Viewport with Zoom Container */}
      <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center items-start bg-[#EFEAF5] dark:bg-[#111015]">
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out',
          }}
          className="shadow-2xl rounded-sm my-auto"
        >
          <DocumentRenderer document={doc} />
        </div>
      </div>
    </div>
  );
};
