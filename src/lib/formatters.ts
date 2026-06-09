export const formatEuro = (v: number): string =>
  v === 0 ? '0' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v);

export const formatPercent = (v: number): string =>
  isFinite(v) && !isNaN(v) ? `${v.toFixed(2)}%` : '';
