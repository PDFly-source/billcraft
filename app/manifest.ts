import type { MetadataRoute } from 'next';

// Base path for GitHub Pages project sites (e.g. /billcraft).
// Injected by the deploy workflow; empty for local development.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

// Required for static export (GitHub Pages).
export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: `${basePath}/`,
    name: 'BillCraft — Business Document Studio',
    short_name: 'BillCraft',
    description:
      'Create professional invoices, quotations, receipts, and estimates directly in your browser. Local, private, zero account.',
    start_url: `${basePath}/`,
    scope: `${basePath}/`,
    display: 'standalone',
    background_color: '#FAF6EE',
    theme_color: '#593C8F',
    icons: [
      {
        src: `${basePath}/icon-192.png`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: `${basePath}/icon-512.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        // Complete official lockup (emblem + wordmark + tagline) diagonally
        // fitted inside the 66/108 maskable safe circle — never cropped by
        // circle/squircle launcher masks. Generated from the official artwork.
        src: `${basePath}/icon-512-maskable.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
