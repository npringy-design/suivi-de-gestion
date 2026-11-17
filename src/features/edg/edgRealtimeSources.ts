import { getDashboardRowIndices } from '@/lib/utils';
import { parseMoneyValue } from '@/lib/money';
import type { MonthData } from '@/types/dataTypes';
import { buildMonthRows } from '@/features/dashboard/dashboardRows';
import { buildDynamicColumns } from '@/features/dashboard/dashboardColumns';
import { computeDashboardData } from '@/features/dashboard/dashboardCalculations';

type DashboardData = Record<string, string>;

// Les données stockées dans DataContext ne contiennent que les cellules de
// saisie : les colonnes dérivées (CA réalisé jour, coûts matière/personnel
// jour, etc.) ne sont calculées que par computeDashboardData. Les fonctions
// d'agrégation ci-dessous ont besoin de ce résultat calculé, pas des données
// brutes — voir Dashboard.tsx / useRecapAnnuelData pour le même pattern.
export const computeMonthDashboard = (
  monthData: MonthData | undefined,
  month: number,
  year: number,
  hasLimonade = false,
): DashboardData => {
  const cellData = monthData?.dashboard;
  if (!cellData || Object.keys(cellData).length === 0) return {};

  const rows = buildMonthRows(year, month);
  const dynamicColumns = buildDynamicColumns(monthData?.salariesConfig?.categories, {});

  return computeDashboardData(
    cellData,
    rows,
    dynamicColumns,
    monthData?.salariesConfig?.categories,
    monthData?.personnelSchema ?? 'global',
    undefined,
    monthData?.salariesConfig?.tauxCibles,
    hasLimonade,
  );
};

const sumDayColumn = (monthData: DashboardData, month: number, year: number, col: number): number => {
  const indices = getDashboardRowIndices(month, year);
  let total = 0;
  Object.values(indices).forEach(rIdx => {
    total += parseMoneyValue(monthData[`${rIdx}-${col}`]);
  });
  return total;
};

const hasDayColumnValue = (monthData: DashboardData, month: number, year: number, col: number): boolean => {
  const indices = getDashboardRowIndices(month, year);
  return Object.values(indices).some(rIdx => (monthData[`${rIdx}-${col}`] ?? '').trim() !== '');
};

// Colonnes saisies hors grille jour (contrats mensualisés, anciennes cellules Frais Généraux) : on
// additionne les cellules de ce numéro de colonne sur toutes les lignes de saisie, en excluant les lignes
// de totaux (semaine, box FG, mois) que computeDashboardData remplit avec la somme des autres lignes.
const totalRowIndices = (month: number, year: number): Set<number> =>
  new Set(buildMonthRows(year, month).flatMap((row, idx) => (row.type === 'day' ? [] : [idx])));

const anyRowColumnEntries = (monthData: DashboardData, month: number, year: number, col: number): string[] => {
  const excluded = totalRowIndices(month, year);
  const suffix = `-${col}`;
  return Object.entries(monthData)
    .filter(([key]) => key.endsWith(suffix) && /^\d+-\d+$/.test(key) && !excluded.has(Number(key.split('-')[0])))
    .map(([, value]) => value ?? '');
};

const sumAnyRowColumn = (monthData: DashboardData, month: number, year: number, col: number): number =>
  anyRowColumnEntries(monthData, month, year, col).reduce((total, value) => total + parseMoneyValue(value), 0);

const hasAnyRowColumnValue = (monthData: DashboardData, month: number, year: number, col: number): boolean =>
  anyRowColumnEntries(monthData, month, year, col).some(value => value.trim() !== '');

export const getCaRealiseMonth = (monthData: DashboardData, month: number, year: number): number =>
  sumDayColumn(monthData, month, year, 21);

export const getCaBudgetMonth = (monthData: DashboardData, month: number, year: number): number =>
  sumDayColumn(monthData, month, year, 3);

export const getMonthProgress = (monthData: DashboardData, month: number, year: number): number => {
  const indices = getDashboardRowIndices(month, year);
  const dayNumbers = Object.keys(indices).map(Number);
  const numDays = dayNumbers.length;
  if (numDays === 0) return 0;

  const filledDayNumbers = dayNumbers.filter(day => (monthData[`${indices[day]}-21`] ?? '').trim() !== '');
  if (filledDayNumbers.length === 0) return 0;

  const budgetCaMonth = sumDayColumn(monthData, month, year, 3);
  if (budgetCaMonth > 0) {
    const filledBudgetCa = filledDayNumbers.reduce(
      (sum, day) => sum + parseMoneyValue(monthData[`${indices[day]}-3`]),
      0,
    );
    return Math.min(1, Math.max(0, filledBudgetCa / budgetCaMonth));
  }

  return Math.min(1, Math.max(0, filledDayNumbers.length / numDays));
};

export const getAutoRealiseValues = (
  monthData: DashboardData,
  month: number,
  year: number,
): Record<string, number> => {
  const values: Record<string, number> = {};

  if (hasDayColumnValue(monthData, month, year, 58)) {
    values.achats_food = -sumDayColumn(monthData, month, year, 58);
  }
  if (hasDayColumnValue(monthData, month, year, 87)) {
    values.cout_salaires = -sumDayColumn(monthData, month, year, 87);
  }
  if (hasAnyRowColumnValue(monthData, month, year, 97)) {
    values.entretien_locaux = -sumAnyRowColumn(monthData, month, year, 97);
  }
  if (hasAnyRowColumnValue(monthData, month, year, 101)) {
    values.produits_entretien = -sumAnyRowColumn(monthData, month, year, 101);
  }
  if (hasAnyRowColumnValue(monthData, month, year, 105)) {
    values.pub_locale = -sumAnyRowColumn(monthData, month, year, 105);
  }
  if (hasAnyRowColumnValue(monthData, month, year, 107)) {
    values.contrats_maintenance = -sumAnyRowColumn(monthData, month, year, 107);
  }

  return values;
};

// ─── Limonade (sites Au Bureau) ──────────────────────────────────────────────
// Budget : CA col 2 (= cvts col 14 × TM col 15), couverts col 14.
// Réalisé : CA col 20, couverts col 34. Aucune formule nouvelle : sommes de colonnes existantes.
export type LimonadeFigures = { ca: number; cvts: number };
export type LimonadeStats = { budget: LimonadeFigures; realise: LimonadeFigures };

export const EMPTY_LIMONADE_STATS: LimonadeStats = {
  budget: { ca: 0, cvts: 0 },
  realise: { ca: 0, cvts: 0 },
};

export const getLimonadeMonthStats = (monthData: DashboardData, month: number, year: number): LimonadeStats => {
  if (!monthData || Object.keys(monthData).length === 0) return EMPTY_LIMONADE_STATS;
  return {
    budget: { ca: sumDayColumn(monthData, month, year, 2), cvts: sumDayColumn(monthData, month, year, 14) },
    realise: { ca: sumDayColumn(monthData, month, year, 20), cvts: sumDayColumn(monthData, month, year, 34) },
  };
};

export const sumLimonadeStats = (list: readonly LimonadeStats[]): LimonadeStats =>
  list.reduce<LimonadeStats>((acc, s) => ({
    budget: { ca: acc.budget.ca + s.budget.ca, cvts: acc.budget.cvts + s.budget.cvts },
    realise: { ca: acc.realise.ca + s.realise.ca, cvts: acc.realise.cvts + s.realise.cvts },
  }), EMPTY_LIMONADE_STATS);

// TM limonade = CA / couverts (0 si aucun couvert).
export const getLimonadeTm = (figures: LimonadeFigures): number => (figures.cvts > 0 ? figures.ca / figures.cvts : 0);
