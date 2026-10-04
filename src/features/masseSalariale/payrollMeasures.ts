import { formatDecimal, formatDecimalSigned, formatEuroSigned, formatEuroSymbol } from '@/lib/formatters';

import type { PayrollIndicatorKey, PayrollMetrics, PayrollSeriesPoint } from './payrollCalculations';

export const ESTIMATE_HINT = 'estimation : forfaits jour selon le réglage, réimporter le PDF pour l\'exact';

// Grandeur affichée dans le graphique d'écart, le tableau mensuel et son détail : mêmes composants, grandeur en paramètre.
export type PayrollMeasure = 'cost' | 'etp';

// Ligne du détail d'un mois (N-1 face à N). 'ratio' : écart en points ; 'amount' : écart en valeur + %.
export type PayrollDetailRow = {
  key: string;
  label: string;
  kind: 'amount' | 'ratio';
  value: (metrics: PayrollMetrics) => number | null;
  formatValue: (value: number) => string;
  formatDelta: (value: number) => string;
  isEstimated?: (metrics: PayrollMetrics) => boolean;
  hideWhenEmpty?: boolean; // masquée si aucune des deux années n'a de valeur non nulle
  hint?: string; // infobulle du libellé
};

type PayrollMeasureConfig = {
  label: string;
  columnLabel: string; // en-tête des colonnes du tableau mensuel
  indicator: PayrollIndicatorKey; // clé de PayrollComparison portant la variation de cette grandeur
  aggregate: 'sum' | 'mean'; // consolidation des mois comparables : somme pour le coût, moyenne pour l'ETP
  pick: (point: PayrollSeriesPoint) => number | null;
  isEstimated: (point: PayrollSeriesPoint) => boolean;
  formatValue: (value: number) => string;
  formatDelta: (value: number) => string;
  formatAxis: (value: number) => string;
  detailRows: PayrollDetailRow[];
};

const OTHER_ADJUSTMENTS_HINT = 'Colonne « Supp. coût » du PDF, déjà comprise dans le coût global de chaque salarié.';

// Autres ajustements = coût global − brut − charges patronales (colonne « Supp. coût » du PDF).
const otherAdjustments = (m: PayrollMetrics): number | null =>
  m.totalCost !== null && m.gross !== null && m.employerCharges !== null ? m.totalCost - m.gross - m.employerCharges : null;

const euroRow = (key: string, label: string, value: PayrollDetailRow['value'], hideWhenEmpty = false, hint?: string): PayrollDetailRow => ({
  key,
  label,
  kind: 'amount',
  value,
  formatValue: formatEuroSymbol,
  formatDelta: formatEuroSigned,
  hideWhenEmpty,
  hint,
});

export const PAYROLL_MEASURES: Record<PayrollMeasure, PayrollMeasureConfig> = {
  cost: {
    label: 'Coût',
    columnLabel: 'Coût salarial',
    indicator: 'totalCost',
    aggregate: 'sum',
    pick: point => point.totalCost,
    isEstimated: () => false,
    formatValue: formatEuroSymbol,
    formatDelta: formatEuroSigned,
    formatAxis: value => `${Math.round(value / 1000)} k€`,
    detailRows: [
      euroRow('totalCost', 'Coût salarial global', m => m.totalCost),
      euroRow('gross', 'Brut', m => m.gross),
      euroRow('employerCharges', 'Charges patronales', m => m.employerCharges),
      {
        key: 'chargesRatePct',
        label: '% charges patronales',
        kind: 'ratio',
        value: m => m.chargesRatePct,
        formatValue: value => `${formatDecimal(value, 1)} %`,
        formatDelta: value => `${formatDecimalSigned(value, 1)} pt`,
      },
      euroRow('otherAdjustments', 'Autres ajustements (Supp. coût)', otherAdjustments, true, OTHER_ADJUSTMENTS_HINT),
    ],
  },
  etp: {
    label: 'ETP',
    columnLabel: 'ETP',
    indicator: 'etp',
    aggregate: 'mean',
    pick: point => point.etp,
    isEstimated: point => point.etpEstimated,
    formatValue: value => formatDecimal(value, 2),
    formatDelta: value => formatDecimalSigned(value, 2),
    formatAxis: value => formatDecimal(value, 1),
    detailRows: [
      {
        key: 'etp',
        label: 'ETP',
        kind: 'amount',
        value: m => m.etp,
        formatValue: value => formatDecimal(value, 2),
        formatDelta: value => formatDecimalSigned(value, 2),
        isEstimated: m => m.etpEstimated,
      },
      {
        ...euroRow('costPerEtp', 'Coût par ETP', m => m.costPerEtp),
        isEstimated: m => m.etpEstimated,
      },
      {
        key: 'hours',
        label: 'Heures',
        kind: 'amount',
        value: m => m.hours,
        formatValue: value => `${formatDecimal(value, 2)} h`,
        formatDelta: value => `${formatDecimalSigned(value, 2)} h`,
        hideWhenEmpty: true,
      },
    ],
  },
};

// Valeur formatée d'un point de série ; « ~ » devant une estimation, « — » si absent.
export const formatMeasurePoint = (measure: PayrollMeasure, point: PayrollSeriesPoint | undefined): string => {
  const config = PAYROLL_MEASURES[measure];
  const value = point ? config.pick(point) : null;
  if (value === null || !point) return '—';
  return `${config.isEstimated(point) ? '~' : ''}${config.formatValue(value)}`;
};
