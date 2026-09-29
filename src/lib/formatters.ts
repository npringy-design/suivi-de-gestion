export const formatEuro = (v: number): string =>
  v === 0 ? '0' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v);

export const formatPercent = (v: number): string =>
  isFinite(v) && !isNaN(v) ? `${v.toFixed(2)}%` : '';

export const formatEuroSymbol = (v: number): string =>
  v === 0 ? '0,00 €' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v);

export const formatPercentSigned = (v: number): string =>
  isFinite(v) && !isNaN(v) ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '—';

export const formatDecimal = (v: number, digits = 1): string =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);

export const formatDecimalSigned = (v: number, digits = 1): string =>
  `${v > 0 ? '+' : ''}${formatDecimal(v, digits)}`;

export const formatEuroSigned = (v: number): string =>
  `${v > 0 ? '+' : ''}${formatEuroSymbol(v)}`;
