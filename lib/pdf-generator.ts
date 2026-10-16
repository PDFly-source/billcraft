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
  let a = 1;
  if (aStr) {
    a = Math.max(0, Math.min(1, parseCoord(aStr)));
  }

  const hRad = (h * Math.PI) / 180;
  const aLab = c * Math.cos(hRad);
  const bLab = c * Math.sin(hRad);
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
 * Replace all occurrences of oklch(...) in a CSS string with compatible rgb/rgba
 */
export function sanitizeOklchString(value: string): string {
  if (!value || typeof value !== 'string' || !value.includes('oklch')) {
    return value;
  }
  return value.replace(/oklch\(\s*([^/)]+?)(?:\s*\/\s*([^)]+?))?\s*\)/gi, (_match, coords, alpha) => {
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
          return sanitizeOklchString(val);
        };
      }
      const val = Reflect.get(target, prop, receiver);
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
    return createStyleProxy(realStyle);
  } as typeof window.getComputedStyle;

  if (typeof window !== 'undefined') {
    window.getComputedStyle = patchedGetComputedStyle;
  }

  let canvas: HTMLCanvasElement;
  try {
    // Render to canvas with high resolution
    canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      onclone: (clonedDoc: Document, clonedElement: HTMLElement) => {
        // 1. Patch iframe window getComputedStyle
        if (clonedDoc.defaultView) {
          clonedDoc.defaultView.getComputedStyle = patchedGetComputedStyle;
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
    if (typeof window !== 'undefined' && origWindowGetComputedStyle) {
      window.getComputedStyle = origWindowGetComputedStyle;
    }
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

  // Multi-page pagination if content overflows single page
  while (heightLeft > 0) {
    position = -(imgHeight - heightLeft);
    pdf.addPage(paper, orientation);
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;
  }

  return pdf.output('blob');
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
