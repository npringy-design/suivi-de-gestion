import type { PayrollAlertThresholds, PayrollCostsData, PayrollForfaitsJourPeriod, PayrollMonthEntry } from '@/types/dataTypes';

export const DEFAULT_PAYROLL_THRESHOLDS: PayrollAlertThresholds = {
  grossToRevenuePct: 35,
  totalCostToRevenuePct: 45,
};

// Forfaits jour comptés dans l'ETP estimé des mois importés avant l'ETP exact (modifiable dans la page).
export const DEFAULT_FORFAITS_JOUR_PERIODS: PayrollForfaitsJourPeriod[] = [
  { from: '2000-01', count: 1 },
  { from: '2025-09', count: 2 },
];

const finiteOr = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

// Liste absente ou invalide : valeurs par défaut. Liste vide : volontaire (aucun forfait jour compté).
const normalizeForfaitsJourPeriods = (raw: unknown): PayrollForfaitsJourPeriod[] => {
  if (!Array.isArray(raw)) return DEFAULT_FORFAITS_JOUR_PERIODS.map(period => ({ ...period }));
  return raw
    .filter((period): period is PayrollForfaitsJourPeriod =>
      !!period && typeof period.from === 'string' && /^\d{4}-\d{2}$/.test(period.from) && typeof period.count === 'number' && Number.isFinite(period.count) && period.count >= 0)
    .map(period => ({ from: period.from, count: period.count }))
    .sort((a, b) => a.from.localeCompare(b.from));
};

// Tolère un contenu partiel ou ancien (localStorage / cloud) : valeurs par défaut pour les seuils,
// entrées mensuelles invalides ignorées.
export const normalizePayrollCosts = (raw: Partial<PayrollCostsData> | null | undefined): PayrollCostsData => {
  const months: Record<string, PayrollMonthEntry> = {};
  if (raw?.months && typeof raw.months === 'object') {
    Object.entries(raw.months).forEach(([key, entry]) => {
      if (/^\d{4}-\d{2}$/.test(key) && entry && typeof entry === 'object') months[key] = entry;
    });
  }
  return {
    months,
    alertThresholds: {
      grossToRevenuePct: finiteOr(raw?.alertThresholds?.grossToRevenuePct, DEFAULT_PAYROLL_THRESHOLDS.grossToRevenuePct),
      totalCostToRevenuePct: finiteOr(raw?.alertThresholds?.totalCostToRevenuePct, DEFAULT_PAYROLL_THRESHOLDS.totalCostToRevenuePct),
    },
    forfaitsJourPeriods: normalizeForfaitsJourPeriods(raw?.forfaitsJourPeriods),
  };
};

// month : index 0-11 (comme partout dans l'appli).
export const payrollMonthKey = (year: number, month: number): string =>
  `${year}-${String(month + 1).padStart(2, '0')}`;
