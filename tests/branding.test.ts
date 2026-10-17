import { describe, test, expect } from 'bun:test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Official branding regression suite — Phase: Official Publication (#06).
 *
 * Pins the complete official BillCraft lockup (emblem + "BillCraft" wordmark +
 * "CREATE • CALCULATE • SHARE" tagline) on every launcher/PWA icon surface.
 * The supplied official artwork is the single source of truth:
 *   - Complete lockup content aspect ≈ 1.07 (taller than wide — emblem,
 *     wordmark and tagline stacked). An emblem-only or wordmark-only crop
 *     would read ≈ 0.78 / ≈ 1.00 respectively.
 *   - The maskable icon must fit entirely inside the 66/108 safe circle so
 *     launcher masks can never crop the wordmark or tagline.
 *   - The manifest must expose a dedicated maskable entry pointing at the
 *     padded safe-circle variant, and `any` entries showing the complete
 *     lockup.
 *
 * The PNG checks use the minimal builtin decoder only (no test deps added):
 * PNG IHDR width/height at fixed byte offsets + zlib IDAT decompression via
 * node:zlib (native), so the suite stays dependency-free.
 */
import { inflateSync } from 'node:zlib';

const PUB = join(import.meta.dir, '..', 'public');

type Png = { width: number; height: number; rgba: Uint8Array };

function decodePng(file: string): Png {
  const buf = readFileSync(file);
  // PNG signature
  expect(buf.slice(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  // IHDR
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const bitDepth = buf[24];
  const colorType = buf[25];
  if (bitDepth !== 8 || colorType !== 2) {
    throw new Error(`${file}: expected 8-bit RGB PNG (bitDepth=${bitDepth}, colorType=${colorType})`);
  }
  // Collect IDAT chunks
  let idat = Buffer.alloc(0);
  let off = 8;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.slice(off + 4, off + 8).toString('ascii');
    if (type === 'IDAT') idat = Buffer.concat([idat, buf.slice(off + 8, off + 8 + len)]);
    if (type === 'IEND') break;
    off += 12 + len;
  }
  // Unfilter scanlines (filter byte per row)
  const raw = inflateSync(idat);
  const bpp = 3; // RGB
  const stride = width * bpp;
  const out = new Uint8Array(width * height * bpp);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    const row = raw.subarray(pos, pos + stride);
    pos += stride;
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : new Uint8Array(stride);
    const cur = out.subarray(y * stride, (y + 1) * stride); // VIEW, not copy
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let v = row[i];
      switch (filter) {
        case 0: break;
        case 1: v = (v + a) & 0xff; break;
        case 2: v = (v + b) & 0xff; break;
        case 3: v = (v + ((a + b) >> 1)) & 0xff; break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
          break;
        }
        default: throw new Error(`${file}: unknown filter ${filter}`);
      }
      cur[i] = v;
    }
  }
  return { width, height, rgba: out };
}

/** True when a pixel deviates from pure white (with tolerance). */
function isContent(r: number, g: number, b: number): boolean {
  return Math.abs(r - 255) + Math.abs(g - 255) + Math.abs(b - 255) > 18;
}

type ContentBox = {
  left: number; top: number; width: number; height: number;
  halfDiagonal: number; aspect: number; hasGold: boolean; hasViolet: boolean; hasTeal: boolean;
};

function contentBox(png: Png): ContentBox {
  const { width: w, height: h, rgba } = png;
  let left = w, right = -1, top = h, bottom = -1;
  let gold = 0, violet = 0, teal = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
      if (isContent(r, g, b)) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
      // official palette accents
      if (r > 180 && g > 130 && b < 120) gold++;
      if (Math.abs(r - 75) + Math.abs(g - 0) + Math.abs(b - 130) < 60) violet++;
      if (Math.abs(r - 0) + Math.abs(g - 201) + Math.abs(b - 167) < 70) teal++;
    }
  }
  if (right < 0) throw new Error('no content found');
  const cw = right - left + 1, ch = bottom - top + 1;
  return {
    left, top, width: cw, height: ch,
    halfDiagonal: Math.hypot(cw, ch) / 2,
    aspect: ch / cw,
    hasGold: gold > 20,
    hasViolet: violet > 20,
    hasTeal: teal > 20,
  };
}

/** Official lockup content aspect measured from the supplied master artwork:
 * 799 x 856 px -> 1.071. Emblem-only would be 0.777; wordmark-only 1.00. */
const LOCKUP_ASPECT = 1.071;
const ASPECT_TOLERANCE = 0.02;

describe('official branding — complete lockup on every launcher icon', () => {
  test('icon-512.png carries the complete lockup (emblem + wordmark + tagline)', () => {
    const png = decodePng(join(PUB, 'icon-512.png'));
    expect(png.width).toBe(512);
    expect(png.height).toBe(512);
    const box = contentBox(png);
    // Complete stacked lockup: aspect matches the master artwork.
    expect(Math.abs(box.aspect - LOCKUP_ASPECT)).toBeLessThanOrEqual(ASPECT_TOLERANCE);
    // All three official accents present (gold tagline bullets / i-dot,
    // violet emblem, teal checkmark).
    expect(box.hasGold).toBe(true);
    expect(box.hasViolet).toBe(true);
    expect(box.hasTeal).toBe(true);
    // Uniform padding around the lockup (contain fit, never edge-to-edge).
    expect(box.left).toBeGreaterThan(8);
    expect(png.width - (box.left + box.width)).toBeGreaterThan(8);
  });

  test('icon-192.png, apple-icon.png and favicon.png carry the complete lockup', () => {
    for (const file of ['icon-192.png', 'apple-icon.png', 'favicon.png']) {
      const png = decodePng(join(PUB, file));
      const box = contentBox(png);
      expect(Math.abs(box.aspect - LOCKUP_ASPECT)).toBeLessThanOrEqual(ASPECT_TOLERANCE + 0.01);
      expect(box.hasViolet).toBe(true);
      expect(box.left).toBeGreaterThan(2);
    }
  });

  test('icon-512-maskable.png fits the complete lockup inside the 66/108 safe circle', () => {
    const png = decodePng(join(PUB, 'icon-512-maskable.png'));
    expect(png.width).toBe(512);
    const box = contentBox(png);
    const safeRadius = (png.width * 66 / 108) / 2;
    // The whole lockup — including the tagline — survives circle/squircle masks.
    expect(box.halfDiagonal).toBeLessThanOrEqual(safeRadius + 0.5);
    expect(Math.abs(box.aspect - LOCKUP_ASPECT)).toBeLessThanOrEqual(ASPECT_TOLERANCE);
    expect(box.hasGold).toBe(true);
    expect(box.hasTeal).toBe(true);
  });

  test('manifest wires the dedicated maskable variant and the complete-lockup icons', () => {
    const src = readFileSync(join(import.meta.dir, '..', 'app', 'manifest.ts'), 'utf8');
    // Dedicated maskable entry points at the safe-circle variant…
    expect(src).toContain('icon-512-maskable.png');
    expect(src).toContain("purpose: 'maskable'");
    // …and every maskable entry points ONLY at the padded variant.
    const maskableMatches = src.match(/purpose: 'maskable'/g) || [];
    expect(maskableMatches.length).toBe(1);
    // `any` icons remain the complete lockup, never emblem-only.
    expect(src).toContain("purpose: 'any'");
    // Installed-app identity keeps the full name visible.
    expect(src).toContain("short_name: 'BillCraft'");
    expect(src).toContain("name: 'BillCraft — Business Document Studio'");
  });

  test('in-app full lockup asset remains the official artwork (byte-pin)', () => {
    const file = join(PUB, 'assets', 'billcraft-logo.png');
    expect(existsSync(file)).toBe(true);
    const buf = readFileSync(file);
    // Stable content hash pins the official artwork bytes (RGBA lockup,
    // 797 x 853). Update deliberately only — never via redraw/recolor.
    const { createHash } = require('node:crypto');
    const sha = createHash('sha256').update(buf).digest('hex').slice(0, 12);
    expect(sha).toBe('76bdcb85bb82');
  });
});
