import { normalizePersonnelText } from '@/features/dashboard/importHelpers/personnelSalaryImport';
import { MONTH_NAMES } from '@/lib/constants';
import { parseMoneyValue } from '@/lib/money';
import { parseHourInputToDecimal } from '@/lib/utils';
import type { MonthData, PayrollStoredLine } from '@/types/dataTypes';

import { analyzePayrollVariance } from './payrollVarianceAnalysis';
import type { PayrollVarianceAnalysis } from './payrollVarianceAnalysis';

export type PayrollVarianceView = PayrollVarianceAnalysis & {
  // Mois (« Septembre 2026 ») dont les lignes viennent du repli sur `categories` : sortants et STC absents.
  fallbackLabels: string[];
};

type PayrollMonthLines = { lines: PayrollStoredLine[]; isFallback: boolean };

// Lignes du mois réel (year, month), lues au même endroit que les totaux : le PDF du mois M est rangé sur M+1
// (cf. getRealPayrollFromConfig). Sans `payrollLines` (import ancien), repli sur les salariés de `categories`.
const getPayrollLinesForMonth = (
  allData: Record<number, Record<number, MonthData>>,
  year: number,
  month: number,
): PayrollMonthLines => {
  const config = allData[month === 11 ? year + 1 : year]?.[month === 11 ? 0 : month + 1]?.salariesConfig;
  if (config?.payrollLines && config.payrollLines.length > 0) return { lines: config.payrollLines, isFallback: false };

  const lines: PayrollStoredLine[] = [];
  Object.values(config?.categories ?? {}).forEach(rows => {
    rows.forEach(row => {
      const coutGlobal = parseMoneyValue(row.coutGlobal);
      const heures = parseHourInputToDecimal(row.heures);
      const key = normalizePersonnelText(row.nom);
      if (key && (coutGlobal !== 0 || heures !== 0)) lines.push({ key, nom: row.nom, heures, coutGlobal });
    });
  });
  return { lines, isFallback: true };
};

// Analyse de l'écart de coût global du mois (year, month) vs même mois N-1. Null si un des deux mois n'a aucune ligne.
export const buildPayrollVarianceView = (
  allData: Record<number, Record<number, MonthData>>,
  year: number,
  month: number,
  currentTotal: number,
  previousTotal: number,
): PayrollVarianceView | null => {
  const current = getPayrollLinesForMonth(allData, year, month);
  const previous = getPayrollLinesForMonth(allData, year - 1, month);
  if (current.lines.length === 0 || previous.lines.length === 0) return null;

  const fallbackLabels = [
    ...(current.isFallback ? [`${MONTH_NAMES[month]} ${year}`] : []),
    ...(previous.isFallback ? [`${MONTH_NAMES[month]} ${year - 1}`] : []),
  ];
  return {
    ...analyzePayrollVariance({ current: current.lines, previous: previous.lines, currentTotal, previousTotal }),
    fallbackLabels,
  };
};
