import { formatDecimal, formatDecimalSigned, formatEuroSigned, formatEuroSymbol } from '@/lib/formatters';

import type { PayrollIndicatorKey, PayrollSeriesPoint } from './payrollCalculations';

// Grandeur affichée dans le graphique d'écart et le tableau mensuel : mêmes composants, grandeur en paramètre.
export type PayrollMeasure = 'cost' | 'etp';

type PayrollMeasureConfig = {
  label: string;
  indicator: PayrollIndicatorKey; // clé de PayrollComparison portant la variation de cette grandeur
  aggregate: 'sum' | 'mean'; // consolidation des mois comparables : somme pour le coût, moyenne pour l'ETP
  pick: (point: PayrollSeriesPoint) => number | null;
  isEstimated: (point: PayrollSeriesPoint) => boolean;
  formatValue: (value: number) => string;
  formatDelta: (value: number) => string;
  formatAxis: (value: number) => string;
};

export const PAYROLL_MEASURES: Record<PayrollMeasure, PayrollMeasureConfig> = {
  cost: {
    label: 'Coût',
    indicator: 'totalCost',
    aggregate: 'sum',
    pick: point => point.totalCost,
    isEstimated: () => false,
    formatValue: formatEuroSymbol,
    formatDelta: formatEuroSigned,
    formatAxis: value => `${Math.round(value / 1000)} k€`,
  },
  etp: {
    label: 'ETP',
    indicator: 'etp',
    aggregate: 'mean',
    pick: point => point.etp,
    isEstimated: point => point.etpEstimated,
    formatValue: value => formatDecimal(value, 2),
    formatDelta: value => formatDecimalSigned(value, 2),
    formatAxis: value => formatDecimal(value, 1),
  },
};

// Valeur formatée d'un point de série ; « ~ » devant une estimation, « — » si absent.
export const formatMeasurePoint = (measure: PayrollMeasure, point: PayrollSeriesPoint | undefined): string => {
  const config = PAYROLL_MEASURES[measure];
  const value = point ? config.pick(point) : null;
  if (value === null || !point) return '—';
  return `${config.isEstimated(point) ? '~' : ''}${config.formatValue(value)}`;
};
