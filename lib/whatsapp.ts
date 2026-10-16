/**
 * Share via WhatsApp — real file sharing when the browser supports it,
 * honest fallback when it does not.
 *
 * Capabilities:
 *  - navigator.canShare({ files: [pdfFile] }) true  -> Web Share API with the
 *    generated PDF attached (Android Chrome, most mobile browsers).
 *  - false -> we download the PDF AND open WhatsApp with the prepared text
 *    message (wa.me link). The user attaches the downloaded file themselves;
 *    the UI says exactly that.
 * We never claim an attachment was sent when only text sharing was possible.
 */
import { DocumentModel, DocumentCalculations } from '@/types/document';

export function normalizePhone(raw: string, defaultCountry = '91'): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return defaultCountry + digits;
  if (digits.length === 11 && digits.startsWith('0')) return defaultCountry + digits.slice(1);
  if (digits.length === 12 && digits.startsWith(defaultCountry)) return digits;
  return digits; // already international form or unknown country
}

export function buildShareMessage(doc: DocumentModel, calc: DocumentCalculations, currencySymbol = '₹'): string {
  const typeLabel =
    doc.type === 'invoice' ? 'Invoice' :
    doc.type === 'quotation' ? 'Quotation' :
    doc.type === 'receipt' ? 'Receipt' : 'Estimate';
  const name = (doc.customer.company || doc.customer.name || 'Valued Customer').trim();
  const amount = calc.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const business = (doc.business.name || 'BillCraft').trim();
  const lines = [
    `Dear ${name},`,
    ``,
    `Please find attached ${typeLabel} *${doc.meta.documentNumber}* dated ${doc.meta.date}.`,
    `Total amount: ${currencySymbol}${amount}.`,
  ];
  if (doc.type === 'quotation' && doc.meta.validUntil) {
    lines.push(`Valid until: ${doc.meta.validUntil}.`);
  }
  if (doc.type === 'invoice' && doc.meta.dueDate) {
    lines.push(`Payment due by: ${doc.meta.dueDate}.`);
  }
  lines.push(``, `Thank you for your business!`, ``, `— ${business}`);
  return lines.join('\n');
}

export function whatsappTextUrl(phone: string, message: string): string {
  const encoded = encodeURIComponent(message);
  return phone
    ? `https://wa.me/${phone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
}

export interface WhatsAppShareResult {
  mode: 'native-share' | 'download-and-text';
  message: string;
  pdfFilename: string;
  instructions: string | null;
}

export async function shareViaWhatsApp(
  doc: DocumentModel,
  calc: DocumentCalculations,
  phone: string,
  pdf: Blob,
  currencySymbol = '₹',
  messageOverride?: string,
): Promise<WhatsAppShareResult> {
  const message = (messageOverride && messageOverride.trim()) || buildShareMessage(doc, calc, currencySymbol);
  const pdfFilename = `${doc.meta.documentNumber || 'BillCraft-document'}.pdf`;
  const file = new File([pdf], pdfFilename, { type: 'application/pdf' });

  const canShareFiles =
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] });

  if (canShareFiles) {
    await navigator.share({
      files: [file],
      title: pdfFilename,
      text: message,
    });
    return { mode: 'native-share', message, pdfFilename, instructions: null };
  }

  // Fallback: download the PDF so the user can attach it, then open WhatsApp
  // with the prepared message already typed.
  const url = URL.createObjectURL(pdf);
  const a = document.createElement('a');
  a.href = url;
  a.download = pdfFilename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 8000);

  window.open(whatsappTextUrl(phone, message), '_blank', 'noopener');

  return {
    mode: 'download-and-text',
    message,
    pdfFilename,
    instructions:
      'Your PDF was downloaded and WhatsApp opened with the message ready. ' +
      'WhatsApp does not allow web pages to attach files in this browser — ' +
      'please attach the downloaded PDF in the WhatsApp chat using the 📎 attachment button.',
  };
}
