import type { Currency } from './types';

/** USD value of 1 unit of each currency. Updated from the daily rates feed. */
export type Rates = Record<Currency, number>;

export const DEFAULT_RATES: Rates = {
  USD: 1,
  USDT: 1,
  EUR: 1.08,
  GBP: 1.27,
  AED: 0.2723,
  SAR: 0.2667,
  TRY: 1 / 45.5,
};

export const CURRENCY_LABEL: Record<Currency, { en: string; ar: string; symbol: string }> = {
  USD:  { en: 'US Dollar',      ar: 'دولار أمريكي',   symbol: '$' },
  USDT: { en: 'Tether (USDT)',  ar: 'تيثر (USDT)',     symbol: '₮' },
  EUR:  { en: 'Euro',           ar: 'يورو',           symbol: '€' },
  GBP:  { en: 'British Pound',  ar: 'جنيه إسترليني',  symbol: '£' },
  AED:  { en: 'UAE Dirham',     ar: 'درهم إماراتي',    symbol: 'AED ' },
  SAR:  { en: 'Saudi Riyal',    ar: 'ريال سعودي',     symbol: 'SAR ' },
  TRY:  { en: 'Turkish Lira',   ar: 'ليرة تركية',      symbol: '₺' },
};

export const toUSD = (amount: number, currency: Currency, rates: Rates) =>
  amount * (rates[currency] ?? 1);

/** How many units of `to` you get for 1 unit of `from`. */
export const crossRate = (from: Currency, to: Currency, rates: Rates) =>
  (rates[from] ?? 1) / (rates[to] ?? 1);

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function fmtMoney(amount: number, currency: Currency | string = 'USD', opts: { decimals?: number } = {}) {
  const decimals = opts.decimals ?? 2;
  const safe = Number.isFinite(amount) ? amount : 0;
  if (currency === 'USDT') {
    return `${safe.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} USDT`;
  }
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency, minimumFractionDigits: decimals, maximumFractionDigits: decimals,
    }).format(safe);
  } catch {
    return `${safe.toFixed(decimals)} ${currency}`;
  }
}

export const fmtUSD = (n: number, decimals = 0) => fmtMoney(n, 'USD', { decimals });

/** Short form for big numbers on cards: $1.2M, $84k. */
export function fmtShort(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 10_000) return `${sign}$${Math.round(abs / 1000)}k`;
  return fmtUSD(n);
}
