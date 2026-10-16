import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#593C8F',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'BillCraft — Professional Invoice & Business Document Creator',
  description: 'Create professional invoices, quotations, receipts, estimates, and proformas directly in your browser. Local, private, zero account required.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '64x64', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'BillCraft — Professional Invoice & Business Document Creator',
    description: 'Create professional business documents in minutes. Privacy-first, local-only, zero account required.',
    type: 'website',
    siteName: 'BillCraft',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BillCraft — Professional Invoice & Business Document Creator',
    description: 'Create professional business documents in minutes. Privacy-first, local-only, zero account required.',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BillCraft',
  },
};

import { BillCraftSvgSprite } from '@/components/ui/BillCraftIcons';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] antialiased transition-colors duration-200">
        <BillCraftSvgSprite />
        {children}
      </body>
    </html>
  );
}
