'use client';

import { asset } from '@/lib/assets';
import React from 'react';
import Image from 'next/image';

/**
 * Official BillCraft brand assets — generated directly from the supplied
 * official logo artwork (do not substitute or redraw):
 *   /assets/billcraft-logo.png   full lockup: emblem + wordmark + tagline (871 x 930)
 *   /assets/billcraft-emblem.png emblem square (512 x 512)
 */
const LOGO_WIDTH = 871;
const LOGO_HEIGHT = 930;
const LOGO_ASPECT = LOGO_HEIGHT / LOGO_WIDTH;

export interface BillCraftLogoProps {
  /**
   * 'emblem' = Emblem-only square (compact icon contexts)
   * 'full' = Full official lockup with emblem, BillCraft wordmark, and tagline
   * 'responsive' = Full logo on desktop (sm+), emblem + brand text on mobile
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
          width={LOGO_WIDTH}
          height={LOGO_HEIGHT}
          className="w-full h-auto object-contain rounded-lg"
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
          <Image
            src={asset("/assets/billcraft-emblem.png")}
            alt="BillCraft Emblem"
            width={size || 32}
            height={size || 32}
            className="shrink-0 rounded-md object-contain"
            priority={priority}
            referrerPolicy="no-referrer"
          />
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
            width={LOGO_WIDTH}
            height={LOGO_HEIGHT}
            style={{ height: height || 52, width: 'auto' }}
            className="object-contain rounded-lg"
            priority={priority}
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    );
  }

  // Default: Official emblem square
  const emblemDim = width || size || 32;
  return (
    <Image
      src={asset("/assets/billcraft-emblem.png")}
      alt="BillCraft Emblem"
      width={emblemDim}
      height={height || emblemDim}
      className={`shrink-0 rounded-md object-contain ${className}`}
      style={style}
      priority={priority}
      referrerPolicy="no-referrer"
    />
  );
};
