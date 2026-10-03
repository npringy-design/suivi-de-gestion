import type { PayrollMonthEntry } from '@/types/dataTypes';

import { payrollMonthKey } from './payrollDefaults';

// Valeurs reprises automatiquement de Config Salaires (somme des salariés du mois).
export type AutoPayroll = { totalCost: number; hours: number };

export type ResolvedPayroll = {
  gross: number | null;
  employerCharges: number | null;
  totalCost: number | null;
  hours: number | null;
};

export type PayrollMetrics = {
  gross: number | null;
  employerCharges: number | null;
  totalCost: number | null; // brut + charges patronales
  chargesRatePct: number | null; // charges / brut
  hourlyCost: number | null; // coût global / heures
  revenue: number | null; // CA réel du mois (null si indisponible)
  grossToRevenuePct: number | null;
  totalCostToRevenuePct: number | null;
};

export type PayrollIndicatorKey = 'gross' | 'employerCharges' | 'totalCost' | 'grossToRevenuePct' | 'totalCostToRevenuePct';

export type PayrollVariation = {
  delta: number; // € pour les montants, points de % pour les ratios
  pct: number | null; // variation relative en % (montants uniquement)
};

export type PayrollComparison = Partial<Record<PayrollIndicatorKey, PayrollVariation>>;

const ratioPct = (numerator: number, denominator: number | null | undefined): number | null =>
  denominator && denominator > 0 ? (numerator / denominator) * 100 : null;

// Priorité à la saisie manuelle ; le coût global de Config Salaires complète ce qui manque
// (charges = coût global − brut, ou brut = coût global − charges).
export const resolvePayroll = (entry: PayrollMonthEntry | undefined, auto: AutoPayroll | null): ResolvedPayroll | null => {
  const autoTotal = auto && auto.totalCost > 0 ? auto.totalCost : null;
  const hours = entry?.hours ?? (auto && auto.hours > 0 ? auto.hours : null);
  let gross = entry?.gross ?? null;
  let employerCharges = entry?.employerCharges ?? null;
  let totalCost: number | null = null;

  if (gross !== null && employerCharges !== null) {
    totalCost = gross + employerCharges;
  } else if (autoTotal !== null) {
    totalCost = autoTotal;
    if (gross !== null) employerCharges = autoTotal - gross;
    else if (employerCharges !== null) gross = autoTotal - employerCharges;
  }

  if (gross === null && employerCharges === null && totalCost === null) return null;
  return { gross, employerCharges, totalCost, hours };
};

export const computePayrollMetrics = (resolved: ResolvedPayroll | null, revenue: number | null): PayrollMetrics | null => {
  if (!resolved) return null;
  const { gross, employerCharges, totalCost, hours } = resolved;
  const safeRevenue = revenue && revenue > 0 ? revenue : null;
  return {
    gross,
    employerCharges,
    totalCost,
    chargesRatePct: gross !== null && employerCharges !== null ? ratioPct(employerCharges, gross) : null,
    hourlyCost: totalCost !== null && hours && hours > 0 ? totalCost / hours : null,
    revenue: safeRevenue,
    grossToRevenuePct: gross !== null ? ratioPct(gross, safeRevenue) : null,
    totalCostToRevenuePct: totalCost !== null ? ratioPct(totalCost, safeRevenue) : null,
  };
};

export const computeVariation = (current: number | null, reference: number | null, isRatio = false): PayrollVariation | undefined => {
  if (current === null || reference === null) return undefined;
  const delta = current - reference;
  if (isRatio) return { delta, pct: null };
  return { delta, pct: reference !== 0 ? (delta / Math.abs(reference)) * 100 : null };
};

export const compareMetrics = (current: PayrollMetrics, reference: PayrollMetrics | null): PayrollComparison => {
  if (!reference) return {};
  const result: PayrollComparison = {};
  const set = (key: PayrollIndicatorKey, value: PayrollVariation | undefined) => {
    if (value) result[key] = value;
  };
  set('gross', computeVariation(current.gross, reference.gross));
  set('employerCharges', computeVariation(current.employerCharges, reference.employerCharges));
  set('totalCost', computeVariation(current.totalCost, reference.totalCost));
  set('grossToRevenuePct', computeVariation(current.grossToRevenuePct, reference.grossToRevenuePct, true));
  set('totalCostToRevenuePct', computeVariation(current.totalCostToRevenuePct, reference.totalCostToRevenuePct, true));
  return result;
};

// Budget optionnel : brut comparable dès qu'il est saisi ; charges et coût global seulement si le budget charges l'est aussi.
export const compareToBudget = (current: PayrollMetrics, entry: PayrollMonthEntry | undefined): PayrollComparison => {
  if (!entry || entry.budgetGross === undefined) return {};
  const result: PayrollComparison = {};
  const gross = computeVariation(current.gross, entry.budgetGross);
  if (gross) result.gross = gross;
  if (entry.budgetEmployerCharges !== undefined) {
    const charges = computeVariation(current.employerCharges, entry.budgetEmployerCharges);
    const total = computeVariation(current.totalCost, entry.budgetGross + entry.budgetEmployerCharges);
    if (charges) result.employerCharges = charges;
    if (total) result.totalCost = total;
  }
  return result;
};

export type PayrollSeriesPoint = {
  key: string;
  year: number;
  month: number; // 0-11
  gross: number | null;
  employerCharges: number | null;
  totalCost: number | null;
  grossToRevenuePct: number | null;
  totalCostToRevenuePct: number | null;
};

// 12 derniers mois glissants se terminant au mois donné (inclus), du plus ancien au plus récent.
export const buildRollingSeries = (
  endYear: number,
  endMonth: number,
  getResolved: (year: number, month: number) => ResolvedPayroll | null,
  getRevenue: (year: number, month: number) => number | null,
): PayrollSeriesPoint[] => {
  const points: PayrollSeriesPoint[] = [];
  for (let offset = 11; offset >= 0; offset -= 1) {
    const index = endYear * 12 + endMonth - offset;
    const year = Math.floor(index / 12);
    const month = index % 12;
    const key = payrollMonthKey(year, month);
    const metrics = computePayrollMetrics(getResolved(year, month), getRevenue(year, month));
    points.push({
      key,
      year,
      month,
      gross: metrics?.gross ?? null,
      employerCharges: metrics?.employerCharges ?? null,
      totalCost: metrics?.totalCost ?? null,
      grossToRevenuePct: metrics?.grossToRevenuePct ?? null,
      totalCostToRevenuePct: metrics?.totalCostToRevenuePct ?? null,
    });
  }
  return points;
};

export const previousMonth = (year: number, month: number): { year: number; month: number } =>
  month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
