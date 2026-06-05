// SmartFinance — shared currency & date formatting helpers.

export const CURRENCIES = {
  USD: { symbol: '$',  code: 'USD', locale: 'en-US' },
  EUR: { symbol: '€',  code: 'EUR', locale: 'de-DE' },
  GBP: { symbol: '£',  code: 'GBP', locale: 'en-GB' },
  CAD: { symbol: 'C$', code: 'CAD', locale: 'en-CA' },
  AUD: { symbol: 'A$', code: 'AUD', locale: 'en-AU' },
  JPY: { symbol: '¥',  code: 'JPY', locale: 'ja-JP' },
  CHF: { symbol: 'Fr', code: 'CHF', locale: 'de-CH' },
  INR: { symbol: '₹',  code: 'INR', locale: 'en-IN' },
  MAD: { symbol: 'DH', code: 'MAD', locale: 'fr-MA' },
  SAR: { symbol: '﷼',  code: 'SAR', locale: 'ar-SA' },
  AED: { symbol: 'AED', code: 'AED', locale: 'ar-AE' },
};

const symbolOf = (cur) => (CURRENCIES[cur] || CURRENCIES.USD).symbol;
export { symbolOf as currencySymbol };

/**
 * Format a number as money. Renders its own sign so negatives use a true
 * minus glyph (−) consistent across the app.
 * @param {number} n        amount (may be negative)
 * @param {string} cur      ISO currency code (defaults USD)
 * @param {object} [opts]   { compact: true } drops fraction digits
 */
export function fmtMoney(n, cur = 'USD', opts = {}) {
  const c = CURRENCIES[cur] || CURRENCIES.USD;
  const max = c.code === 'JPY' ? 0 : 2;
  const v = new Intl.NumberFormat(c.locale, {
    minimumFractionDigits: opts.compact ? 0 : max,
    maximumFractionDigits: max,
  }).format(Math.abs(n ?? 0));
  const sign = (n ?? 0) < 0 ? '−' : '';
  return `${sign}${c.symbol}${v}`;
}

/**
 * Format a date.
 * @param {Date|string|number} d
 * @param {'med'|'long'|'rel'} style  'rel' gives Today / Yesterday / N days ago
 */
export function fmtDate(d, style = 'med') {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  if (style === 'rel') {
    const today = new Date();
    const days = Math.round((today.setHours(0, 0, 0, 0) - new Date(dt).setHours(0, 0, 0, 0)) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days > 1 && days < 7) return days + ' days ago';
  }
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: style === 'long' ? 'numeric' : undefined,
  });
}
