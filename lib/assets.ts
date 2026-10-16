/**
 * Prefixes a public asset path with the deployment base path.
 *
 * GitHub Pages project sites are served from a sub-path (e.g. /billcraft/),
 * so absolute paths like "/assets/logo.png" must be rewritten to
 * "/billcraft/assets/logo.png". The deploy workflow injects
 * NEXT_PUBLIC_BASE_PATH at build time; it is empty for local development.
 */
export function asset(path: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  return `${basePath}${path}`;
}
