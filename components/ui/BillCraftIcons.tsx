import React from 'react';

export type IconName =
  | 'doc'
  | 'clip'
  | 'rec'
  | 'calc'
  | 'pct'
  | 'qr'
  | 'grid'
  | 'gear'
  | 'home'
  | 'plus'
  | 'lock'
  | 'share'
  | 'prt'
  | 'dl'
  | 'bell'
  | 'eye'
  | 'more'
  | 'back'
  | 'ok'
  | 'ar'
  | 'abc'
  | 'shield'
  | 'file-preview-outline'
  | 'file-preview';

interface BillCraftIconProps {
  name: IconName;
  className?: string;
  style?: React.CSSProperties;
}

export const BillCraftIcon: React.FC<BillCraftIconProps> = ({
  name,
  className = '',
  style,
}) => {
  return (
    <svg className={`i ${className}`} style={style} aria-hidden="true">
      <use href={`#${name}`} />
    </svg>
  );
};

export const BillCraftSvgSprite: React.FC = () => {
  return (
    <svg width="0" height="0" style={{ position: 'absolute', display: 'none' }}>
      <defs>
        <symbol id="doc" viewBox="0 0 24 24">
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5M9 13h6M9 17h4" />
        </symbol>
        <symbol id="clip" viewBox="0 0 24 24">
          <rect x="5" y="4" width="14" height="17" rx="2" />
          <path d="M9 4h6v3H9zM9 12h6M9 16h4" />
        </symbol>
        <symbol id="rec" viewBox="0 0 24 24">
          <path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6" />
        </symbol>
        <symbol id="calc" viewBox="0 0 24 24">
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M8 7h8M8 12h2M14 12h2M8 16h2M14 16h2" />
        </symbol>
        <symbol id="pct" viewBox="0 0 24 24">
          <path d="M19 5 5 19" />
          <circle cx="7" cy="7" r="2.5" />
          <circle cx="17" cy="17" r="2.5" />
        </symbol>
        <symbol id="qr" viewBox="0 0 24 24">
          <rect x="4" y="4" width="6" height="6" />
          <rect x="14" y="4" width="6" height="6" />
          <rect x="4" y="14" width="6" height="6" />
          <path d="M14 14h2v2h-2zM18 18h2M14 19h1M19 14v1" />
        </symbol>
        <symbol id="grid" viewBox="0 0 24 24">
          <rect x="4" y="4" width="7" height="7" rx="1.5" />
          <rect x="13" y="4" width="7" height="7" rx="1.5" />
          <rect x="4" y="13" width="7" height="7" rx="1.5" />
          <rect x="13" y="13" width="7" height="7" rx="1.5" />
        </symbol>
        <symbol id="gear" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
        </symbol>
        <symbol id="home" viewBox="0 0 24 24">
          <path d="M4 11 12 4l8 7v9H4zM10 20v-6h4v6" />
        </symbol>
        <symbol id="plus" viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14" />
        </symbol>
        <symbol id="lock" viewBox="0 0 24 24">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </symbol>
        <symbol id="share" viewBox="0 0 24 24">
          <circle cx="6" cy="12" r="2.5" />
          <circle cx="17" cy="6" r="2.5" />
          <circle cx="17" cy="18" r="2.5" />
          <path d="m8.2 11 6.6-3.8M8.2 13l6.6 3.8" />
        </symbol>
        <symbol id="prt" viewBox="0 0 24 24">
          <path d="M7 9V4h10v5M7 17H5v-6h14v6h-2M7 14h10v6H7z" />
        </symbol>
        <symbol id="dl" viewBox="0 0 24 24">
          <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />
        </symbol>
        <symbol id="bell" viewBox="0 0 24 24">
          <path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21h4" />
        </symbol>
        <symbol id="eye" viewBox="0 0 24 24">
          <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
        </symbol>
        <symbol id="more" viewBox="0 0 24 24">
          <circle cx="5" cy="12" r="1" />
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
        </symbol>
        <symbol id="back" viewBox="0 0 24 24">
          <path d="m14 6-6 6 6 6" />
        </symbol>
        <symbol id="ok" viewBox="0 0 24 24">
          <path d="m5 12 5 5 9-10" />
        </symbol>
        <symbol id="ar" viewBox="0 0 24 24">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </symbol>
        <symbol id="abc" viewBox="0 0 24 24">
          <path d="M4 18 8 6l4 12M5.5 14h5M15 8h5M15 12h5M15 16h3" />
        </symbol>
        <symbol id="shield" viewBox="0 0 24 24">
          <path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z" />
          <path d="m9 12 2 2 4-4" />
        </symbol>
        <symbol id="file-preview-outline" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
          <path d="M14 2v6h6" />
          <path d="M8 15s1.8-3 4-3 4 3 4 3-1.8 3-4 3-4-3-4-3z" />
          <circle cx="12" cy="15" r="1.5" />
        </symbol>
        <symbol id="file-preview" viewBox="0 0 24 24">
          <use href="#file-preview-outline" />
        </symbol>
        <symbol id="logo" viewBox="0 0 48 48">
          <defs>
            <linearGradient id="bc-badge-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FAF6EE" />
              <stop offset="100%" stopColor="#F2EBDB" />
            </linearGradient>
            <linearGradient id="bc-doc-grad" x1="0" y1="0" x2="0.8" y2="1">
              <stop offset="0%" stopColor="#6F4AB6" />
              <stop offset="50%" stopColor="#593C8F" />
              <stop offset="100%" stopColor="#42296E" />
            </linearGradient>
            <linearGradient id="bc-gold-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFE082" />
              <stop offset="100%" stopColor="#F0B83A" />
            </linearGradient>
          </defs>
          <rect width="48" height="48" rx="12" fill="url(#bc-badge-grad)" stroke="#E5DCCB" strokeWidth="1.2" />
          {/* Purple Document Icon */}
          <path
            d="M 13 9 L 27 9 L 35 17 L 35 37 A 3 3 0 0 1 32 40 L 16 40 A 3 3 0 0 1 13 37 Z"
            fill="url(#bc-doc-grad)"
          />
          {/* Golden Folded-Corner Accent */}
          <path
            d="M 27 9 L 35 17 L 28.5 17 A 1.5 1.5 0 0 1 27 15.5 Z"
            fill="url(#bc-gold-grad)"
          />
          {/* Mint/Teal Checkmark */}
          <path
            d="M 18.5 25.5 L 23 30 L 30 20.5"
            fill="none"
            stroke="#A8D5BA"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Golden Accent Line */}
          <rect x="18" y="34.5" width="12" height="1.8" rx="0.9" fill="#FFD066" opacity="0.9" />
        </symbol>
      </defs>
    </svg>
  );
};
