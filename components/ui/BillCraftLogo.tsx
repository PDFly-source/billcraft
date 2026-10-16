'use client';

import { asset } from '@/lib/assets';
import React from 'react';
import Image from 'next/image';

export interface BillCraftLogoProps {
  /**
   * 'emblem' = Just the document emblem with purple document, mint checkmark, and golden fold
   * 'full' = Full official lockup with emblem, BillCraft wordmark, and tagline
   * 'responsive' = Full logo on desktop (sm+), compact lockup on mobile
   */
  variant?: 'emblem' | 'full' | 'responsive';
  size?: number;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
}

export const BillCraftLogo: React.FC<BillCraftLogoProps> = ({
  variant = 'emblem',
  size = 36,
  width,
  height,
  className = '',
  style,
  priority = false,
}) => {
  if (variant === 'full') {
    const targetWidth = width || 220;
    return (
      <div
        className={`inline-flex items-center shrink-0 ${className}`}
        style={{ ...style, width: targetWidth, height: 'auto' }}
      >
        <Image
          src={asset("/assets/billcraft-logo.png")}
          alt="BillCraft — Create • Calculate • Share"
          width={targetWidth}
          height={Math.round((targetWidth * 120) / 500)}
          className="w-full h-auto object-contain dark:hidden"
          priority={priority}
          referrerPolicy="no-referrer"
        />
        <Image
          src={asset("/assets/billcraft-logo-dark.png")}
          alt="BillCraft — Create • Calculate • Share"
          width={targetWidth}
          height={Math.round((targetWidth * 120) / 500)}
          className="w-full h-auto object-contain hidden dark:block"
          priority={priority}
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  if (variant === 'responsive') {
    return (
      <div className={`inline-flex items-center shrink-0 ${className}`} style={style}>
        {/* Mobile View: Compact Emblem + Brand Name */}
        <div className="flex sm:hidden items-center gap-2">
          <svg
            width={size || 32}
            height={size || 32}
            viewBox="0 0 48 48"
            className="shrink-0"
            aria-label="BillCraft Emblem"
            role="img"
          >
            <use href="#logo" />
          </svg>
          <div className="flex flex-col">
            <span className="font-extrabold text-[15px] tracking-[0.04em] text-[#17151F] dark:text-[#F8F5FC] leading-tight">
              BILL<span className="text-[#593C8F] dark:text-[#A8D5BA]">CRAFT</span>
            </span>
            <span className="text-[8px] font-bold text-[#6D6879] dark:text-[#A39BB0] uppercase tracking-wider">
              STUDIO
            </span>
          </div>
        </div>

        {/* Desktop View: Full Official Logo with Tagline */}
        <div className="hidden sm:block">
          <Image
            src={asset("/assets/billcraft-logo.png")}
            alt="BillCraft — Create • Calculate • Share"
            width={width || 180}
            height={Math.round(((width || 180) * 120) / 500)}
            className="w-full h-auto object-contain dark:hidden"
            priority={priority}
            referrerPolicy="no-referrer"
          />
          <Image
            src={asset("/assets/billcraft-logo-dark.png")}
            alt="BillCraft — Create • Calculate • Share"
            width={width || 180}
            height={Math.round(((width || 180) * 120) / 500)}
            className="w-full h-auto object-contain hidden dark:block"
            priority={priority}
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    );
  }

  // Default: SVG Emblem using the official symbol definition (#logo)
  const emblemDim = width || size || 32;
  return (
    <svg
      width={emblemDim}
      height={height || emblemDim}
      viewBox="0 0 48 48"
      className={`shrink-0 ${className}`}
      style={style}
      aria-label="BillCraft Emblem"
      role="img"
    >
      <use href="#logo" />
    </svg>
  );
};
