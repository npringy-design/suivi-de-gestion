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

// Les blocs Frais Généraux ne sont pas indexés par jour : on additionne toutes les cellules
// du mois portant ce numéro de colonne, quel que soit le rIdx.
const sumAnyRowColumn = (monthData: DashboardData, col: number): number => {
  const suffix = `-${col}`;
  let total = 0;
  Object.entries(monthData).forEach(([key, value]) => {
    if (key.endsWith(suffix) && /^\d+-\d+$/.test(key)) {
      total += parseMoneyValue(value);
    }
  });
  return total;
};

const hasAnyRowColumnValue = (monthData: DashboardData, col: number): boolean => {
  const suffix = `-${col}`;
  return Object.entries(monthData).some(([key, value]) =>
    key.endsWith(suffix) && /^\d+-\d+$/.test(key) && (value ?? '').trim() !== '');
};

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
  if (hasAnyRowColumnValue(monthData, 97)) {
    values.entretien_locaux = -sumAnyRowColumn(monthData, 97);
  }
  if (hasAnyRowColumnValue(monthData, 101)) {
    values.produits_entretien = -sumAnyRowColumn(monthData, 101);
  }
  if (hasAnyRowColumnValue(monthData, 105)) {
    values.pub_locale = -sumAnyRowColumn(monthData, 105);
  }
  if (hasAnyRowColumnValue(monthData, 107)) {
    values.contrats_maintenance = -sumAnyRowColumn(monthData, 107);
  }

  return values;
};
