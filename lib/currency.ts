import { CurrencyCode, CurrencyConfig } from '@/types/document';

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    decimals: 2,
    isIndianNumbering: true,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    decimals: 2,
    isIndianNumbering: false,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    decimals: 2,
    isIndianNumbering: false,
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    decimals: 2,
    isIndianNumbering: false,
  },
  AED: {
    code: 'AED',
    symbol: 'د.إ',
    name: 'UAE Dirham',
    decimals: 2,
    isIndianNumbering: false,
  },
  AUD: {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar',
    decimals: 2,
    isIndianNumbering: false,
  },
  CAD: {
    code: 'CAD',
    symbol: 'C$',
    name: 'Canadian Dollar',
    decimals: 2,
    isIndianNumbering: false,
  },
  SGD: {
    code: 'SGD',
    symbol: 'S$',
    name: 'Singapore Dollar',
    decimals: 2,
    isIndianNumbering: false,
  },
};

/**
 * Format number into currency string with symbol
 */
export function formatCurrency(amount: number, currencyCode: CurrencyCode = 'INR'): string {
  const config = CURRENCIES[currencyCode] || CURRENCIES.INR;
  const num = isNaN(amount) ? 0 : amount;

  if (config.isIndianNumbering) {
    // Format with Indian lakhs & crores system
    const isNegative = num < 0;
    const absVal = Math.abs(num);
    const parts = absVal.toFixed(config.decimals).split('.');
    let integerPart = parts[0];
    const decimalPart = parts[1];

    if (integerPart.length > 3) {
      const last3 = integerPart.substring(integerPart.length - 3);
      const otherNumbers = integerPart.substring(0, integerPart.length - 3);
      integerPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
    }

    const formatted = `${config.symbol}${integerPart}${config.decimals > 0 ? '.' + decimalPart : ''}`;
    return isNegative ? `-${formatted}` : formatted;
  }

  // Standard International formatting
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals,
    }).format(num);
  } catch {
    return `${config.symbol}${num.toFixed(config.decimals)}`;
  }
}

// Number to Words for Indian numbering (Lakhs, Crores)
const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertLessThanOneThousand(n: number): string {
  let str = '';
  if (n >= 100) {
    str += ONES[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  if (n >= 20) {
    str += TENS[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ONES[n % 10] : '');
  } else if (n > 0) {
    str += ONES[n];
  }
  return str.trim();
}

export function numberToIndianWords(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Zero Rupees Only';

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const rupees = Math.floor(absAmount);
  const paise = Math.round((absAmount - rupees) * 100);

  let result = '';

  let rem = rupees;
  const crores = Math.floor(rem / 10000000);
  rem %= 10000000;
  const lakhs = Math.floor(rem / 100000);
  rem %= 100000;
  const thousands = Math.floor(rem / 1000);
  rem %= 1000;
  const hundreds = rem;

  if (crores > 0) {
    result += convertLessThanOneThousand(crores) + ' Crore ';
  }
  if (lakhs > 0) {
    result += convertLessThanOneThousand(lakhs) + ' Lakh ';
  }
  if (thousands > 0) {
    result += convertLessThanOneThousand(thousands) + ' Thousand ';
  }
  if (hundreds > 0) {
    result += convertLessThanOneThousand(hundreds) + ' ';
  }

  result = result.trim();
  if (!result) {
    result = 'Zero';
  }

  result += ' Rupees';

  if (paise > 0) {
    result += ' and ' + convertLessThanOneThousand(paise) + ' Paise';
  }

  result += ' Only';

  return (isNegative ? 'Minus ' : '') + result.replace(/\s+/g, ' ');
}

export function numberToInternationalWords(amount: number, currencyCode: CurrencyCode = 'USD'): string {
  if (isNaN(amount) || amount === 0) {
    const curName = CURRENCIES[currencyCode]?.name || 'Dollars';
    return `Zero ${curName} Only`;
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const whole = Math.floor(absAmount);
  const cents = Math.round((absAmount - whole) * 100);

  const scales = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];
  let current = whole;
  let scaleIndex = 0;
  const parts: string[] = [];

  while (current > 0) {
    const chunk = current % 1000;
    if (chunk > 0) {
      const chunkStr = convertLessThanOneThousand(chunk);
      const scaleStr = scales[scaleIndex];
      parts.unshift(scaleStr ? `${chunkStr} ${scaleStr}` : chunkStr);
    }
    current = Math.floor(current / 1000);
    scaleIndex++;
  }

  let result = parts.join(' ').trim() || 'Zero';

  let unitName = 'Dollars';
  let subunitName = 'Cents';

  if (currencyCode === 'EUR') {
    unitName = 'Euros';
    subunitName = 'Cents';
  } else if (currencyCode === 'GBP') {
    unitName = 'Pounds';
    subunitName = 'Pence';
  } else if (currencyCode === 'AED') {
    unitName = 'Dirhams';
    subunitName = 'Fils';
  }

  result += ` ${unitName}`;

  if (cents > 0) {
    result += ` and ${convertLessThanOneThousand(cents)} ${subunitName}`;
  }

  result += ' Only';

  return (isNegative ? 'Minus ' : '') + result.replace(/\s+/g, ' ');
}

export function amountToWords(amount: number, currencyCode: CurrencyCode = 'INR'): string {
  if (currencyCode === 'INR') {
    return numberToIndianWords(amount);
  }
  return numberToInternationalWords(amount, currencyCode);
}
