'use client';

import React, { useRef, useState, useEffect } from 'react';
import { SignatureDetails, SignatureType } from '@/types/document';
import { PenTool, Upload, Type, Eraser, Trash2 } from 'lucide-react';
import Image from 'next/image';

interface SignatureEditorProps {
  signature: SignatureDetails;
  businessName: string;
  onChange: (updated: Partial<SignatureDetails>) => void;
}

export const SignatureEditor: React.FC<SignatureEditorProps> = ({
  signature,
  businessName,
  onChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      onChange({ image: event.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      {/* Signature Type Switcher */}
      <div className="grid grid-cols-4 gap-2">
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
          {signature.image ? (
            <div className="space-y-2">
              <div className="relative w-48 h-20 mx-auto bg-white p-2 rounded border border-slate-200">
                <Image src={signature.image} alt="Signature" fill className="object-contain" referrerPolicy="no-referrer" unoptimized />
              </div>
              <button
                type="button"
                onClick={() => onChange({ image: '' })}
                className="text-xs text-rose-500 hover:underline"
              >
                Remove Signature
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer py-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Upload className="w-6 h-6 mx-auto text-slate-400 mb-1" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                Upload Signature (PNG or JPG)
              </span>
              <span className="text-[10px] text-slate-400">Transparent PNG recommended</span>
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
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Signatory Full Name
          </label>
          <input
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
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Designation / Role
          </label>
          <input
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
