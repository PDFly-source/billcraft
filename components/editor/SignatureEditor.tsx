'use client';

import React, { useEffect, useRef, useState } from 'react';
import { SignatureDetails, SignatureType } from '@/types/document';
import { PenTool, Upload, Type, Eraser, Trash2, Frame, ZoomIn, RotateCcw, Check } from 'lucide-react';
import Image from 'next/image';

interface SignatureEditorProps {
  signature: SignatureDetails;
  businessName: string;
  onChange: (updated: Partial<SignatureDetails>) => void;
}

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // 4 MB guard for oversized images
/** Output frame: 600x200 (3:1) — aspect-preserved, transparency kept. */
const FRAME_W = 600;
const FRAME_H = 200;

export const SignatureEditor: React.FC<SignatureEditorProps> = ({
  signature,
  businessName,
  onChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Non-destructive framing state (original upload is kept until committed)
  const [framingOriginal, setFramingOriginal] = useState<string | null>(null);
  const [frameScale, setFrameScale] = useState(1);
  const [frameOffsetY, setFrameOffsetY] = useState(0);

  // Initialize canvas
  useEffect(() => {
    if (signature.type === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#17151F';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [signature.type]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onChange({ image: dataUrl });
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange({ image: '' });
  };

  /** Safe upload: type + size checks, then enter the framing step. */
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      window.alert('Unsupported image type. Please upload a PNG, JPG or WebP image.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      window.alert(`This image is too large (${(file.size / 1048576).toFixed(1)} MB). Please upload an image under 4 MB.`);
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setFramingOriginal((event.target?.result as string) || null);
      setFrameScale(1);
      setFrameOffsetY(0);
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // allow re-uploading the same file later
  };

  /**
   * Commit the frame: draw the original into a 3:1 canvas, aspect-preserved,
   * scaled by `frameScale`, centered with vertical offset. Transparency is
   * preserved (PNG source → PNG output). Non-destructive: the original stays
   * in `framingOriginal` until the user confirms or replaces it.
   */
  const commitFrame = () => {
    if (!framingOriginal) return;
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = FRAME_W;
      canvas.height = FRAME_H; // never zero-sized
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, FRAME_W, FRAME_H);
      // scale preserving the source aspect ratio, fit inside the frame
      const base = Math.min(FRAME_W / img.width, FRAME_H / img.height);
      const s = base * Math.max(0.2, frameScale);
      const w = img.width * s;
      const h = img.height * s;
      const x = (FRAME_W - w) / 2;
      const maxShift = Math.max(0, (h - FRAME_H) / 2);
      const y = (FRAME_H - h) / 2 - Math.max(-maxShift, Math.min(maxShift, frameOffsetY));
      ctx.drawImage(img, x, y, w, h);
      const dataUrl = canvas.toDataURL('image/png');
      onChange({ image: dataUrl });
      setFramingOriginal(null); // framing done; temp resources released
    };
    img.onerror = () => {
      window.alert('This image could not be read. Try a different file.');
      setFramingOriginal(null);
    };
    img.src = framingOriginal;
  };

  const cancelFraming = () => setFramingOriginal(null);

  const removeSignature = () => {
    if (window.confirm('Remove the signature/stamp image from this document?')) {
      onChange({ image: '' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Signature Type Switcher */}
      <div role="group" aria-label="Signature type" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(
          [
            { id: 'text', label: 'Type Name', icon: Type },
            { id: 'draw', label: 'Draw on Screen', icon: PenTool },
            { id: 'upload', label: 'Upload Image', icon: Upload },
            { id: 'none', label: 'No Signature', icon: Trash2 },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          const isSelected = signature.type === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange({ type: t.id })}
              aria-pressed={isSelected}
              className={`py-2 px-2 rounded-lg border text-center flex flex-col items-center gap-1 transition ${
                isSelected
                  ? 'bg-[#593C8F] text-white border-[#593C8F]'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mode: Draw */}
      {signature.type === 'draw' && (
        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Draw your signature below
            </span>
            <button
              type="button"
              onClick={clearCanvas}
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-rose-500"
            >
              <Eraser className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
          <div className="bg-white rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden cursor-crosshair touch-none">
            <canvas
              ref={canvasRef}
              width={380}
              height={120}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-[120px]"
            />
          </div>
        </div>
      )}

      {/* Mode: Upload */}
      {signature.type === 'upload' && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
          {/* Framing interface (non-destructive crop/framing step) */}
          {framingOriginal ? (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 justify-center">
                <Frame className="w-3.5 h-3.5 text-[#593C8F]" />
                Frame your signature (aspect preserved, no stretching)
              </div>
              <div className="relative w-full max-w-sm mx-auto h-28 bg-white rounded border-2 border-dashed border-[#593C8F]/50 overflow-hidden">
                <div className="relative w-full h-full">
                  <Image
                    src={framingOriginal}
                    alt="Signature preview"
                    fill
                    style={{
                      objectFit: 'contain',
                      transform: `scale(${frameScale}) translateY(${frameOffsetY}px)`,
                      transformOrigin: 'center',
                    }}
                    referrerPolicy="no-referrer"
                    unoptimized
                  />
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
                <ZoomIn className="w-3.5 h-3.5" />
                <label htmlFor="sig-scale" className="sr-only">Zoom</label>
                <input
                  id="sig-scale"
                  type="range"
                  min={1}
                  max={2}
                  step={0.05}
                  value={frameScale}
                  onChange={(e) => setFrameScale(parseFloat(e.target.value))}
                  className="w-36 accent-[#593C8F]"
                />
                <label htmlFor="sig-offset" className="sr-only">Vertical position</label>
                <input
                  id="sig-offset"
                  type="range"
                  min={-40}
                  max={40}
                  step={1}
                  value={frameOffsetY}
                  onChange={(e) => setFrameOffsetY(parseFloat(e.target.value))}
                  className="w-24 accent-[#593C8F]"
                />
                <RotateCcw
                  className="w-3.5 h-3.5 cursor-pointer hover:text-rose-500"
                  role="button"
                  aria-label="Reset framing"
                  onClick={() => { setFrameScale(1); setFrameOffsetY(0); }}
                />
              </div>
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  onClick={commitFrame}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold text-white bg-[#593C8F] rounded-lg hover:bg-[#452b6e]"
                >
                  <Check className="w-3.5 h-3.5" /> Use this signature
                </button>
                <button
                  type="button"
                  onClick={cancelFraming}
                  className="px-3 py-1.5 text-[11px] font-bold text-slate-500 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : signature.image ? (
            <div className="space-y-2">
              <div className="relative w-48 h-20 mx-auto bg-white p-2 rounded border border-slate-200">
                <Image src={signature.image} alt="Signature" fill className="object-contain" referrerPolicy="no-referrer" unoptimized />
              </div>
              <div className="flex justify-center gap-3">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs text-[#593C8F] dark:text-[#A8D5BA] hover:underline">
                  Replace image
                </button>
                <button
                  type="button"
                  onClick={removeSignature}
                  className="text-xs text-rose-500 hover:underline"
                >
                  Remove Signature
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
              className="cursor-pointer py-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#593C8F]"
            >
              <Upload className="w-6 h-6 mx-auto text-slate-400 mb-1" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                Upload Signature or Stamp (PNG, JPG, WebP)
              </span>
              <span className="text-[10px] text-slate-400">Transparent PNG recommended · under 4 MB · framed without stretching</span>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleSignatureUpload}
            className="hidden"
          />
        </div>
      )}

      {/* Mode: Type */}
      {signature.type === 'text' && (
        <div className="space-y-2">
          <label htmlFor="signatory-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Signatory Full Name
          </label>
          <input
            id="signatory-name"
            type="text"
            value={signature.text}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder="e.g. John Doe, Rajesh Sharma"
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#593C8F]"
          />
          {signature.text && (
            <p className="font-serif italic text-lg text-slate-800 dark:text-slate-200 p-2 bg-slate-50 dark:bg-slate-900/50 rounded border border-slate-200 dark:border-slate-800">
              {signature.text}
            </p>
          )}
        </div>
      )}

      {/* Designation */}
      {signature.type !== 'none' && (
        <div>
          <label htmlFor="signatory-designation" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Designation / Role
          </label>
          <input
            id="signatory-designation"
            type="text"
            value={signature.designation}
            onChange={(e) => onChange({ designation: e.target.value })}
            placeholder="e.g. Authorized Signatory, Managing Director"
            className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
          />
        </div>
      )}
    </div>
  );
};
