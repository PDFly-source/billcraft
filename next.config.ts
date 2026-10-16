import type {NextConfig} from 'next';

// Base path for GitHub Pages project sites (e.g. /billcraft).
// The GitHub Actions deploy workflow injects the real repository name.
// Leave empty for local development (http://localhost:3000).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Static export: BillCraft is a browser-only app with no server runtime.
  // Required for GitHub Pages hosting.
  output: 'export',
  basePath,
  // Directory-style URLs so page refreshes work on static hosts.
  trailingSlash: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // next/image is not available as an optimization service on static hosts.
  images: {
    unoptimized: true,
  },
  transpilePackages: ['motion'],
};

export default nextConfig;
