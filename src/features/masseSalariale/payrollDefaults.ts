import type { PayrollAlertThresholds, PayrollCostsData, PayrollMonthEntry } from '@/types/dataTypes';

export const DEFAULT_PAYROLL_THRESHOLDS: PayrollAlertThresholds = {
  grossToRevenuePct: 35,
  totalCostToRevenuePct: 45,
};

const finiteOr = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

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
  };
};

// month : index 0-11 (comme partout dans l'appli).
export const payrollMonthKey = (year: number, month: number): string =>
  `${year}-${String(month + 1).padStart(2, '0')}`;
