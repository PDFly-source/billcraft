'use client';

import { asset } from '@/lib/assets';
import React from 'react';
import Image from 'next/image';

/**
 * OFFICIAL BillCraft branding system — single source of truth.
 *
 * All assets are derived from the exact official logo artwork supplied by the
 * owner (do not redraw, recolor, or substitute):
 *   /assets/billcraft-logo.png          full lockup: emblem + "BillCraft"
 *                                       wordmark + "CREATE • CALCULATE • SHARE"
 *                                       tagline (797 x 853, transparent bg)
 *   /assets/billcraft-logo-compact.png compact lockup: emblem + wordmark,
 *                                       no tagline (797 x 799, transparent bg)
 *   /assets/billcraft-emblem.png        emblem square only (580 x 580, white bg)
 *
 * Variants:
 *   'full'    complete official artwork — welcome, about, brand/hero sections
 *   'compact' emblem + wordmark — header and space-limited branding rows
 *   'icon'    emblem only — favicon/PWA-sized and other square icon contexts
 *
 * The artwork uses the official light-on-white presentation. In dark mode the
 * logo is placed on a white rounded surface chip so the official colors stay
 * legible without modifying the artwork.
 */
const FULL_WIDTH = 797;
const FULL_HEIGHT = 853;
const COMPACT_WIDTH = 797;
const COMPACT_HEIGHT = 799;

export interface BillCraftLogoProps {
  variant?: 'full' | 'compact' | 'icon' | 'emblem' | 'responsive';
  /** Width in px for the full/compact lockups (height follows aspect ratio). */
  width?: number;
  /** Square icon size in px (icon variant only). */
  size?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
}

/** Official-color text fallback shown only if the artwork asset fails to load. */
const LogoTextFallback: React.FC<{ withTagline: boolean; className?: string }> = ({
  withTagline,
  className = '',
}) => (
  <div className={`flex flex-col items-center leading-none ${className}`} aria-label="BillCraft">
    <span className="font-black tracking-tight" style={{ color: '#4A008F' }}>
      Bill
      <span style={{ color: '#1C1C2E' }}>Craft</span>
    </span>
    {withTagline && (
      <span
        className="font-semibold tracking-[0.28em]"
        style={{ color: '#5B5B6E', fontSize: '0.32em', marginTop: '0.35em' }}
      >
        CREATE <span style={{ color: '#F6B837' }}>•</span> CALCULATE{' '}
        <span style={{ color: '#F6B837' }}>•</span> SHARE
      </span>
    )}
  </div>
);

export const BillCraftLogo: React.FC<BillCraftLogoProps> = ({
  variant = 'icon',
  width,
  size,
  height,
  className = '',
  style,
  priority = false,
}) => {
  const [failed, setFailed] = React.useState(false);

  const surface = 'dark:bg-white dark:rounded-md dark:px-1.5 dark:py-1';

  // 'emblem' and 'responsive' kept as aliases so no call site silently loses
  // branding: both now resolve to the official artwork variants.
  const resolved: 'full' | 'compact' | 'icon' =
    variant === 'full' ? 'full'
    : variant === 'compact' || variant === 'responsive' ? 'compact'
    : 'icon';

  if (resolved === 'full') {
    const targetWidth = width || 240;
    if (failed) {
      return (
        <div
          className={`inline-flex items-center justify-center shrink-0 rounded-lg ${surface} ${className}`}
          style={{ ...style, width: targetWidth, height: (targetWidth * FULL_HEIGHT) / FULL_WIDTH }}
        >
          <LogoTextFallback withTagline className="text-[2.2rem]" />
        </div>
      );
    }
    return (
      <div
        className={`inline-flex items-center justify-center shrink-0 rounded-lg ${surface} ${className}`}
        style={{ ...style, width: targetWidth, height: (targetWidth * FULL_HEIGHT) / FULL_WIDTH }}
      >
        <Image
          src={asset('/assets/billcraft-logo.png')}
          alt="BillCraft — CREATE • CALCULATE • SHARE"
          width={FULL_WIDTH}
          height={FULL_HEIGHT}
          className="w-full h-auto object-contain"
          style={{ maxWidth: '100%', height: 'auto' }}
          priority={priority}
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  if (resolved === 'compact') {
    const targetWidth = width || 52;
    if (failed) {
      return (
        <div
          className={`inline-flex items-center justify-center shrink-0 rounded-md ${surface} ${className}`}
          style={{ ...style, width: targetWidth, height: (targetWidth * COMPACT_HEIGHT) / COMPACT_WIDTH }}
        >
          <LogoTextFallback withTagline={false} className="text-[0.95rem]" />
        </div>
      );
    }
    return (
      <div
        className={`inline-flex items-center justify-center shrink-0 rounded-md ${surface} ${className}`}
        style={{ ...style, width: targetWidth, height: (targetWidth * COMPACT_HEIGHT) / COMPACT_WIDTH }}
      >
        <Image
          src={asset('/assets/billcraft-logo-compact.png')}
          alt="BillCraft"
          width={COMPACT_WIDTH}
          height={COMPACT_HEIGHT}
          className="w-full h-auto object-contain"
          style={{ maxWidth: '100%', height: 'auto' }}
          priority={priority}
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  // icon variant: official emblem square only
  const dim = size || width || 32;
  if (failed) {
    return (
      <div
        className={`inline-flex items-center justify-center shrink-0 rounded-md ${surface} ${className}`}
        style={{ ...style, width: dim, height }}
      >
        <LogoTextFallback withTagline={false} className="text-[0.8rem]" />
      </div>
    );
  }
  return (
    <Image
      src={asset('/assets/billcraft-emblem.png')}
      alt="BillCraft Emblem"
      width={dim}
      height={height || dim}
      className={`shrink-0 rounded-md object-contain ${className}`}
      style={style}
      priority={priority}
      onError={() => setFailed(true)}
    />
  );
};
