import { useMemo } from 'react';

import type { MonthData } from '@/types/dataTypes';
import { buildMonthRows } from '@/features/dashboard/dashboardRows';
import { buildDynamicColumns } from '@/features/dashboard/dashboardColumns';
import { computeDashboardData, parsePayrollHourForCalculation } from '@/features/dashboard/dashboardCalculations';
import { parseMoneyValue } from '@/lib/money';

export function useRecapAnnuelData(data: Record<number, MonthData>, year: number) {
  return useMemo(() => {
    const monthCalcData: Record<string, string>[] = [];
    const monthTotalIndices: number[] = [];
    const monthLastDayIndices: number[] = [];
    const monthDayIndicesArr: number[][] = [];

    for (let mi = 0; mi <= 11; mi++) {
      const monthData = data[mi];
      const cellData = monthData?.dashboard ?? {};
      const rows = buildMonthRows(year, mi);
      const dynamicColumns = buildDynamicColumns(
        monthData?.salariesConfig?.categories,
        {} as Record<number, string>,
      );
      const calculatedData = computeDashboardData(
        cellData,
        rows,
        dynamicColumns,
        monthData?.salariesConfig?.categories,
        monthData?.personnelSchema,
      );
      monthCalcData.push(calculatedData);
      monthTotalIndices.push(rows.findIndex(r => r.type === 'month_total'));
      // Index du dernier jour du mois (type 'day')
      let lastDayIdx = -1;
      const dayIndices: number[] = [];
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].type === 'day') { dayIndices.push(i); lastDayIdx = i; }
      }
      monthLastDayIndices.push(lastDayIdx);
      monthDayIndicesArr.push(dayIndices);
    }

    const getVal = (mi: number, col: number): number => {
      const idx = monthTotalIndices[mi];
      if (idx < 0) return 0;
      return parseMoneyValue(monthCalcData[mi][`${idx}-${col}`] ?? '0');
    };

    const getFgTotal = (mi: number): number => {
      const idx = monthTotalIndices[mi];
      if (idx < 0) return 0;
      return parseMoneyValue(monthCalcData[mi][`${idx}-fraisGenerauxTotal`] ?? '0');
    };

    const getRaw = (mi: number, col: number): string => {
      const idx = monthTotalIndices[mi];
      if (idx < 0) return '—';
      return monthCalcData[mi][`${idx}-${col}`] ?? '—';
    };

    // Lit la valeur d'une colonne sur le dernier jour du mois (cumuls progressifs)
    const getLastDayVal = (mi: number, col: number): number => {
      const idx = monthLastDayIndices[mi];
      if (idx < 0) return 0;
      return parseMoneyValue(monthCalcData[mi][`${idx}-${col}`] ?? '0');
    };

    // Somme des heures (format Xh YY) jour par jour pour une colonne donnée
    const getHoursSum = (mi: number, col: number): number => {
      const days = monthDayIndicesArr[mi] ?? [];
      return days.reduce((sum, idx) => {
        return sum + parsePayrollHourForCalculation(monthCalcData[mi][`${idx}-${col}`] ?? '');
      }, 0);
    };

    // Somme annuelle des heures sur une colonne (12 mois)
    const sumHoursCol = (col: number) =>
      Array.from({ length: 12 }, (_, mi) => getHoursSum(mi, col)).reduce((a, b) => a + b, 0);

    const caByMonth = Array.from({ length: 12 }, (_, mi) => getVal(mi, 21));
    const totalCA = caByMonth.reduce((s, v) => s + v, 0);

    return { getVal, getFgTotal, getRaw, getLastDayVal, getHoursSum, sumHoursCol, caByMonth, totalCA };
  }, [data, year]);
}
