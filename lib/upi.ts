import QRCode from 'qrcode';

export interface UPIParams {
  upiId: string;
  payeeName: string;
  amount?: number;
  transactionNote?: string;
}

/**
 * Generate standard NPCI UPI Intent URI
 * Format: upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...
 */
export function generateUPIString(params: UPIParams): string {
  if (!params.upiId) return '';

  const cleanUPI = params.upiId.trim();
  const cleanName = encodeURIComponent(params.payeeName ? params.payeeName.trim() : 'Merchant');
  let uri = `upi://pay?pa=${cleanUPI}&pn=${cleanName}&cu=INR`;

  if (params.amount && params.amount > 0) {
    uri += `&am=${params.amount.toFixed(2)}`;
  }

  if (params.transactionNote) {
    uri += `&tn=${encodeURIComponent(params.transactionNote.trim())}`;
  }

  return uri;
}

/**
 * Generate QR code data URL client-side
 */
export async function generateQRCodeDataUrl(text: string): Promise<string> {
  if (!text) return '';
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: 256,
      margin: 1,
      color: {
        dark: '#17151F',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    });
    return dataUrl;
  } catch (err) {
    console.error('Error generating QR code client-side:', err);
    return '';
  }
}
