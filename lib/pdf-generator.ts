import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { DocumentModel } from '@/types/document';

export interface PDFExportOptions {
  paperSize?: 'a4' | 'a5' | 'letter';
  orientation?: 'portrait' | 'landscape';
}

/**
 * Generate sanitized filename based on document number and customer name
 * Example: INV-2026-001-Acme-Solutions.pdf
 */
export function generatePDFFilename(doc: DocumentModel): string {
  const typeLabel = doc.type.charAt(0).toUpperCase() + doc.type.slice(1);
  const docNum = doc.meta.documentNumber || typeLabel;
  const customer = doc.customer.company || doc.customer.name || 'Client';

  const rawName = `${docNum}-${customer}`.trim();
  const sanitized = rawName
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  return `${sanitized}.pdf`;
}

/**
 * Parse OKLCH coordinate value (handling %, deg, rad, turn, none)
 */
function parseCoord(val: string): number {
  if (!val || val === 'none') return 0;
  if (val.endsWith('%')) return parseFloat(val) / 100;
  if (val.endsWith('deg')) return parseFloat(val);
  if (val.endsWith('rad')) return (parseFloat(val) * 180) / Math.PI;
  if (val.endsWith('turn')) return parseFloat(val) * 360;
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
}

/**
 * Convert OKLCH parameters to standard rgb/rgba color string
 * html2canvas only supports rgb, rgba, hsl, hsla, and hex.
 */
function oklchToRgb(lStr: string, cStr: string, hStr: string, aStr?: string): string {
  const l = Math.max(0, Math.min(1, parseCoord(lStr)));
  const c = Math.max(0, parseCoord(cStr));
  const h = parseCoord(hStr);

  const hRad = (h * Math.PI) / 180;
  const aLab = c * Math.cos(hRad);
  const bLab = c * Math.sin(hRad);
  return oklabToRgbString(l, aLab, bLab, aStr);
}

/**
 * Convert OKLAB parameters (L, a, b, alpha) to a standard rgb/rgba color string.
 * Shared pipeline used by both oklch() and oklab() conversion.
 */
function oklabToRgbString(l: number, aLab: number, bLab: number, aStr?: string): string {
  let a = 1;
  if (aStr) {
    a = Math.max(0, Math.min(1, parseCoord(aStr)));
  }
  const l_ = l + 0.3963377774 * aLab + 0.2158037573 * bLab;
  const m_ = l - 0.1055613458 * aLab - 0.0638541728 * bLab;
  const s_ = l - 0.0894841775 * aLab - 1.2914855480 * bLab;
  const lLin = l_ * l_ * l_;
  const mLin = m_ * m_ * m_;
  const sLin = s_ * s_ * s_;
  const rLin = +4.0767416621 * lLin - 3.3077115913 * mLin + 0.2309699292 * sLin;
  const gLin = -1.2684380046 * lLin + 2.6097574011 * mLin - 0.3413193965 * sLin;
  const bLin = -0.0041960863 * lLin - 0.7034186147 * mLin + 1.7076147010 * sLin;
  const toSrgb = (x: number) => {
    const cl = Math.max(0, Math.min(1, x));
    return cl <= 0.0031308 ? 12.92 * cl : 1.055 * Math.pow(cl, 1 / 2.4) - 0.055;
  };
  const r = Math.round(toSrgb(rLin) * 255);
  const g = Math.round(toSrgb(gLin) * 255);
  const b = Math.round(toSrgb(bLin) * 255);
  return a < 1 ? `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(3))})` : `rgb(${r}, ${g}, ${b})`;
}

/**
 * Whether a string contains CSS color functions html2canvas cannot parse.
 */
function hasUnsupportedColorFunction(value: string): boolean {
  return (
    value.includes('oklch') ||
    value.includes('oklab') ||
    value.includes('color-mix') ||
    value.includes('color(')
  );
}

/**
 * Convert a single color(srgb R G B / A) component to a 0-255 channel value.
 * Components can be numbers (0-1) or percentages.
 */
function srgbComponentTo255(val: string): number {
  const v = val.trim();
  const num = v.endsWith('%') ? (parseFloat(v) / 100) * 255 : parseFloat(v) * 255;
  return Math.max(0, Math.min(255, Math.round(num)));
}

function srgbAlphaToUnit(val: string | undefined): number {
  if (!val) return 1;
  const v = val.trim();
  const num = v.endsWith('%') ? parseFloat(v) / 100 : parseFloat(v);
  return Math.max(0, Math.min(1, isNaN(num) ? 1 : num));
}

/**
 * Convert color(srgb R G B / A) to rgb/rgba.
 */
function colorSrgbToRgb(rStr: string, gStr: string, bStr: string, aStr?: string): string {
  const r = srgbComponentTo255(rStr);
  const g = srgbComponentTo255(gStr);
  const b = srgbComponentTo255(bStr);
  const a = srgbAlphaToUnit(aStr);
  return a < 1 ? `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(3))})` : `rgb(${r}, ${g}, ${b})`;
}

interface ParsedColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Parse rgb(), rgba() (comma or space separated), #hex and the transparent
 * keyword into RGBA channels. Returns null when the value cannot be resolved
 * statically (e.g. var(), currentcolor, oklch leftovers).
 */
function parseStaticColor(input: string): ParsedColor | null {
  const s = input.trim().toLowerCase();
  if (!s || s === 'none') return null;
  if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  if (s === 'currentcolor' || s.includes('var(') || s.includes('oklab') || s.includes('oklch')) return null;

  const hex = s.match(/^#([0-9a-f]{3,8})$/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map((ch) => ch + ch).join('');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }

  const fn = s.match(/^(rgba?)\s*\(([^)]*)\)$/);
  if (fn) {
    const parts = fn[2].replace(/\//g, ' ').replace(/,/g, ' ').split(/\s+/).filter(Boolean);
    if (parts.length >= 3) {
      const ch = (v: string, scale255 = true) => {
        const n = v.endsWith('%') ? (parseFloat(v) / 100) * (scale255 ? 255 : 1) : parseFloat(v);
        return Math.max(0, Math.min(scale255 ? 255 : 1, isNaN(n) ? 0 : n));
      };
      return {
        r: Math.round(ch(parts[0])),
        g: Math.round(ch(parts[1])),
        b: Math.round(ch(parts[2])),
        a: parts[3] !== undefined ? ch(parts[3], false) : 1,
      };
    }
  }
  return null;
}

/**
 * Split a string on commas at parenthesis depth 0.
 */
function splitTopLevelArgs(input: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of input) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      out.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) out.push(current);
  return out.map((a) => a.trim());
}

/**
 * Approximate color-mix(in <space>, <colorA> [pA%], <colorB> [pB%]) in sRGB.
 * Returns the first statically parseable color when mixing is impossible.
 */
function mixColorArgs(aRaw: string, bRaw: string): string {
  const stripPct = (raw: string): { color: string; pct?: number } => {
    const m = raw.match(/^(.*?)(?:\s+([\d.]+)%)?$/);
    const color = (m?.[1] ?? raw).trim();
    const pct = m?.[2] !== undefined ? parseFloat(m[2]) : undefined;
    return { color, pct };
  };
  const A = stripPct(aRaw);
  const B = stripPct(bRaw);
  const ca = parseStaticColor(A.color);
  const cb = parseStaticColor(B.color);

  if (ca && cb) {
    const pa = A.pct ?? (B.pct !== undefined ? 100 - B.pct : undefined);
    const pb = B.pct ?? (A.pct !== undefined ? 100 - A.pct : undefined);
    let t = 0.5;
    if (pa !== undefined && pb !== undefined && pa + pb > 0) t = pa / (pa + pb);
    else if (pa !== undefined) t = pa / 100;
    else if (pb !== undefined) t = 1 - pb / 100;
    const mix = (x: number, y: number) => Math.round(x + (y - x) * t);
    const a = Number((ca.a + (cb.a - ca.a) * t).toFixed(3));
    const rgb = `rgb(${mix(ca.r, cb.r)}, ${mix(ca.g, cb.g)}, ${mix(ca.b, cb.b)})`;
    return a < 1 ? rgb.replace('rgb', 'rgba').replace(')', `, ${a})`) : rgb;
  }
  if (ca) {
    const s = ca.a < 1 ? `rgba(${ca.r}, ${ca.g}, ${ca.b}, ${Number(ca.a.toFixed(3))})` : `rgb(${ca.r}, ${ca.g}, ${ca.b})`;
    return s;
  }
  if (cb) {
    const s = cb.a < 1 ? `rgba(${cb.r}, ${cb.g}, ${cb.b}, ${Number(cb.a.toFixed(3))})` : `rgb(${cb.r}, ${cb.g}, ${cb.b})`;
    return s;
  }
  return '#17151F';
}

/**
 * Replace color-mix(...) calls (including nested ones) with static rgb colors.
 */
function replaceColorMixCalls(value: string): string {
  let out = value;
  for (let pass = 0; pass < 6; pass++) {
    const idx = out.toLowerCase().indexOf('color-mix(');
    if (idx === -1) break;
    let depth = 0;
    let end = -1;
    for (let i = idx + 'color-mix('.length - 1; i < out.length; i++) {
      if (out[i] === '(') depth++;
      else if (out[i] === ')') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) break;
    const inner = out.slice(idx + 'color-mix('.length, end);
    const args = splitTopLevelArgs(inner);
    // args: ["in <space>", "<colorA> [pA%]", "<colorB> [pB%]", ...normalizer args ignored]
    const replacement =
      args.length >= 3 ? mixColorArgs(args[1], args[2]) : '#17151F';
    out = out.slice(0, idx) + replacement + out.slice(end + 1);
  }
  return out;
}

/**
 * Replace all occurrences of oklch(), oklab(), color(srgb) and color-mix()
 * in a CSS string with rgb/rgba colors that html2canvas supports.
 */
export function sanitizeOklchString(value: string): string {
  if (!value || typeof value !== 'string' || !hasUnsupportedColorFunction(value)) {
    return value;
  }

  let out = value;

  // oklch(L C H / A)
  out = out.replace(/oklch\(\s*([^/)]+?)(?:\s*\/\s*([^)]+?))?\s*\)/gi, (_match, coords, alpha) => {
    try {
      const parts = coords.trim().split(/\s+/);
      if (parts.length >= 3) {
        return oklchToRgb(parts[0], parts[1], parts[2], alpha?.trim());
      }
    } catch {
      // Fallback safe value
    }
    return '#17151F';
  });

  // oklab(L A B / A)
  out = out.replace(/oklab\(\s*([^/)]+?)(?:\s*\/\s*([^)]+?))?\s*\)/gi, (_match, coords, alpha) => {
    try {
      const parts = coords.trim().split(/\s+/);
      if (parts.length >= 3) {
        const l = Math.max(0, Math.min(1, parseCoord(parts[0])));
        return oklabToRgbString(l, parseCoord(parts[1]), parseCoord(parts[2]), alpha?.trim());
      }
    } catch {
      // Fallback safe value
    }
    return '#17151F';
  });

  // color(srgb R G B / A)
  out = out.replace(/color\(\s*srgb\s+([^/)]+?)(?:\s*\/\s*([^)]+?))?\s*\)/gi, (_match, coords, alpha) => {
    try {
      const parts = coords.trim().split(/\s+/);
      if (parts.length >= 3) {
        return colorSrgbToRgb(parts[0], parts[1], parts[2], alpha?.trim());
      }
    } catch {
      // Fallback safe value
    }
    return '#17151F';
  });

  // color-mix(in <space>, A, B) — innermost conversions happen first
  out = replaceColorMixCalls(out);

  return out;
}

/**
 * Creates a Proxy around CSSStyleDeclaration that intercepts any property returning oklch
 */
function createStyleProxy(realStyle: CSSStyleDeclaration): CSSStyleDeclaration {
  return new Proxy(realStyle, {
    get(target, prop, receiver) {
      if (prop === 'getPropertyValue') {
        return (propName: string) => {
          const val = target.getPropertyValue(propName);
          const sanitized = sanitizeOklchString(val);
          const w = (typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : {}) as Record<string, unknown>;
          if (w.__BC_DEBUG__ && typeof sanitized === 'string' && sanitized.includes('gradient')) {
            console.log('[BCDBG]', propName, '=>', sanitized);
          }
          return sanitized;
        };
      }
      // NOTE: pass `target` (not the proxy) as receiver — native
      // CSSStyleDeclaration accessors throw "Illegal invocation" when
      // invoked with a Proxy as `this`.
      const val = Reflect.get(target, prop, target);
      if (typeof val === 'function') {
        return (...args: unknown[]) => {
          const res = (val as (...a: unknown[]) => unknown).apply(target, args);
          if (typeof res === 'string') {
            return sanitizeOklchString(res);
          }
          return res;
        };
      }
      if (typeof val === 'string') {
        return sanitizeOklchString(val);
      }
      return val;
    },
  });
}

/**
 * Generate PDF Blob from an HTML element
 */
export async function generatePDFBlob(
  element: HTMLElement,
  options: PDFExportOptions = { paperSize: 'a4', orientation: 'portrait' }
): Promise<Blob> {
  const paper = options.paperSize || 'a4';
  const orientation = options.orientation || 'portrait';

  // Standard dimensions in mm
  let pageWidth = 210;
  let pageHeight = 297;
  if (paper === 'a5') {
    pageWidth = 148;
    pageHeight = 210;
  } else if (paper === 'letter') {
    pageWidth = 215.9;
    pageHeight = 279.4;
  }

  if (orientation === 'landscape') {
    const tmp = pageWidth;
    pageWidth = pageHeight;
    pageHeight = tmp;
  }

  // Intercept window.getComputedStyle to prevent html2canvas crashing on Tailwind v4 oklch()
  const origWindowGetComputedStyle = typeof window !== 'undefined' ? window.getComputedStyle : null;
  const patchedGetComputedStyle = function (elt: Element, pseudoElt?: string | null) {
    if (!origWindowGetComputedStyle) return {} as CSSStyleDeclaration;
    const realStyle = origWindowGetComputedStyle.call(window, elt, pseudoElt);
    const proxied = createStyleProxy(realStyle);
    try {
      const w = (typeof window !== 'undefined' ? (window as unknown as Record<string, unknown>) : {}) as Record<string, unknown>;
      if (w.__BC_DEBUG__) {
        console.log('[BCDBG-EL]', elt.tagName, ((elt as HTMLElement).className + '').slice(0, 60), 'pseudo:', pseudoElt || '-');
      }
    } catch { /* ignore */ }
    return proxied;
  } as typeof window.getComputedStyle;

  if (typeof window !== 'undefined') {
    window.getComputedStyle = patchedGetComputedStyle;
  }

  // On narrow layouts the target element can live inside a display:none
  // container (the live preview pane is desktop-only), e.g. when the user
  // taps Export PDF from the editor on mobile. html2canvas cannot render a
  // zero-size element, so temporarily un-hide the ancestor chain and stack
  // the host behind the app UI for the duration of the render.
  const forceRenderable = (): (() => void) => {
    if (typeof window === 'undefined' || element.getClientRects().length > 0) {
      return () => undefined;
    }
    const doc = element.ownerDocument;
    const win = doc?.defaultView;
    if (!win) return () => undefined;
    const restores: Array<() => void> = [];
    const hiddenChain: HTMLElement[] = [];
    let node: HTMLElement | null = element;
    while (node && node !== doc.body) {
      if (win.getComputedStyle(node).display === 'none') {
        hiddenChain.push(node);
      }
      node = node.parentElement;
    }
    hiddenChain.forEach((n) => {
      const prev = n.style.display;
      n.style.display = 'block';
      restores.push(() => {
        n.style.display = prev;
      });
    });
    const host = hiddenChain.length ? hiddenChain[hiddenChain.length - 1] : element;
    const s = host.style;
    const prev = { position: s.position, top: s.top, left: s.left, zIndex: s.zIndex, width: s.width, pointerEvents: s.pointerEvents };
    s.position = 'fixed';
    s.top = '0';
    s.left = '0';
    s.zIndex = '-2147483647';
    s.width = `${pageWidth}mm`;
    s.pointerEvents = 'none';
    restores.push(() => {
      s.position = prev.position;
      s.top = prev.top;
      s.left = prev.left;
      s.zIndex = prev.zIndex;
      s.width = prev.width;
      s.pointerEvents = prev.pointerEvents;
    });
    return () => {
      for (let i = restores.length - 1; i >= 0; i--) restores[i]();
    };
  };
  const restoreRenderable = forceRenderable();

  // Guard against html2canvas computing non-finite gradient color-stop offsets
  // for zero-size elements (e.g. collapsed flex/absolute decoration lines in the
  // cloned window layout). Those elements are invisible anyway, so skipping
  // their stops has no visual effect but prevents the whole export from crashing
  // with "Failed to execute 'addColorStop' ... non-finite".
  const proto = typeof CanvasGradient !== 'undefined' ? (CanvasGradient.prototype as unknown as {
    addColorStop: (this: CanvasGradient, offset: number, color: string) => void;
  }) : null;
  const origAddColorStop = proto?.addColorStop;
  if (proto && origAddColorStop) {
    proto.addColorStop = function (offset: number, color: string) {
      if (!Number.isFinite(offset)) return;
      return origAddColorStop.call(this, offset, color);
    };
  }

  let canvas: HTMLCanvasElement;
  try {
    // Render to canvas with high resolution
    canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      // Deterministic DESKTOP-width clone viewport (Phase 4.1). The A4
      // sheet is a fixed 210mm (≈794px) canvas, so a 1000px clone window
      // guarantees: (a) sm:+ breakpoints inside the sheet behave the same
      // on a phone and on a desktop, (b) the sheet is never reflowed to a
      // 390px "mobile" layout that would then be stretched onto an A4
      // page, and (c) hidden export hosts render at full width. The PDF
      // is therefore identical no matter which device exports it.
      windowWidth: 1000,
      windowHeight: 1400,
      onclone: (clonedDoc: Document, clonedElement: HTMLElement) => {
        // 1. Patch iframe window getComputedStyle
        if (clonedDoc.defaultView) {
          clonedDoc.defaultView.getComputedStyle = patchedGetComputedStyle;
        }

        // 1b. Neutralize ancestor clipping in the CLONE (Phase 4.1).
        // The sheet may live inside a display:none preview pane (mobile) or a
        // transform-scaled / overflow-clipped / max-height container. The
        // live DOM is un-hidden by forceRenderable(), but overflow clipping,
        // max-height and ancestor transforms still apply in the clone and
        // would either truncate the capture (missing bottom pages) or stall
        // the renderer. The export sheet is a fixed-width true-size sheet, so
        // removing these constraints on the clone's ancestors cannot change
        // its layout width — only lets it render at its full natural height.
        try {
          let anc = clonedElement.parentElement;
          while (anc && anc !== clonedDoc.body) {
            const cs = clonedDoc.defaultView
              ? clonedDoc.defaultView.getComputedStyle(anc)
              : null;
            if (cs && cs.display === 'none') anc.style.display = 'block';
            anc.style.overflow = 'visible';
            anc.style.maxHeight = 'none';
            anc.style.height = 'auto';
            anc.style.transform = 'none';
            anc = anc.parentElement;
          }
        } catch {
          // ignore — best-effort sanitization
        }

        // 2. Sanitize all stylesheet/style tag content inside cloned document
        try {
          const styles = clonedDoc.querySelectorAll('style');
          styles.forEach((st) => {
            if (st.textContent && st.textContent.includes('oklch')) {
              st.textContent = sanitizeOklchString(st.textContent);
            }
          });
        } catch {
          // ignore
        }

        // 3. Sanitize inline style attributes on cloned elements
        try {
          const elementsWithStyle = clonedElement.querySelectorAll('*');
          elementsWithStyle.forEach((el) => {
            const s = el.getAttribute('style');
            if (s && s.includes('oklch')) {
              el.setAttribute('style', sanitizeOklchString(s));
            }
          });
          const rootStyle = clonedElement.getAttribute('style');
          if (rootStyle && rootStyle.includes('oklch')) {
            clonedElement.setAttribute('style', sanitizeOklchString(rootStyle));
          }
        } catch {
          // ignore
        }
      },
    });
  } finally {
    restoreRenderable();
    if (typeof window !== 'undefined' && origWindowGetComputedStyle) {
      window.getComputedStyle = origWindowGetComputedStyle;
    }
    if (proto && origAddColorStop) {
      proto.addColorStop = origAddColorStop;
    }
  }

  // Optional capture telemetry for automated verification (off by default).
  if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__BC_PDF_DEBUG__) {
    console.log(`[BCPDF] canvas=${canvas.width}x${canvas.height} paper=${paper} orient=${orientation}`);
  }

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: paper,
    compress: true,
  });

  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  // Scale factor to fit canvas width into PDF page width
  const imgWidth = pageWidth;
  const imgHeight = (canvasHeight * pageWidth) / canvasWidth;

  let heightLeft = imgHeight;
  let position = 0;

  // First page
  pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
  heightLeft -= pageHeight;

  // Multi-page pagination if content overflows single page.
  // EPSILON: html2canvas rounds the capture to whole device pixels, so a
  // full single-page sheet can measure a few tenths of a mm over 297mm.
  // That rounding residue must NOT spill a nearly-empty second page —
  // only a real overflow (more than 2mm) continues onto the next page.
  const PAGE_EPSILON_MM = 2;
  while (heightLeft > PAGE_EPSILON_MM) {
    position = -(imgHeight - heightLeft);
    pdf.addPage(paper, orientation);
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;
  }

  return pdf.output('blob');
}


/**
 * Resolve the printable sheet element to export (Phase 4.1).
 * Each view registers its own sheet id; the first mounted match wins.
 * Falls back to the legacy shared id for any untouched call site.
 */
export function getPrintableElement(preferredIds: string[] = []): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  for (const id of preferredIds) {
    const el = document.getElementById(id);
    if (el) return el;
  }
  return document.getElementById('printable-document');
}

/**
 * Download PDF file to client machine
 */
export async function downloadPDF(
  element: HTMLElement,
  doc: DocumentModel,
  options?: PDFExportOptions
): Promise<string> {
  const filename = generatePDFFilename(doc);
  const blob = await generatePDFBlob(element, options);

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 10000);

  return filename;
}

/**
 * Share PDF file using Web Share API or download fallback
 */
export async function shareOrDownloadPDF(
  element: HTMLElement,
  doc: DocumentModel,
  options?: PDFExportOptions
): Promise<{ shared: boolean; downloaded: boolean; filename: string }> {
  const filename = generatePDFFilename(doc);
  const blob = await generatePDFBlob(element, options);

  if (typeof navigator !== 'undefined' && 'share' in navigator && 'canShare' in navigator) {
    try {
      const file = new File([blob], filename, { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: doc.meta.documentNumber || 'Business Document',
          text: `Here is the ${doc.type} (${doc.meta.documentNumber}) from ${doc.business.name || 'BillCraft'}.`,
        });
        return { shared: true, downloaded: false, filename };
      }
    } catch (err: unknown) {
      // User cancelled share dialog or share was aborted
      if (err instanceof Error && err.name === 'AbortError') {
        return { shared: false, downloaded: false, filename };
      }
      console.warn('Web Share failed, falling back to download:', err);
    }
  }

  // Fallback to direct download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return { shared: false, downloaded: true, filename };
}
