import { useMemo } from 'react';

import type { MonthData } from '@/types/dataTypes';
import { buildMonthRows } from '@/features/dashboard/dashboardRows';
import { buildDynamicColumns } from '@/features/dashboard/dashboardColumns';
import { computeDashboardData, parsePayrollHourForCalculation } from '@/features/dashboard/dashboardCalculations';
import { parseMoneyValue } from '@/lib/money';

// Colonnes par niveau (index 0-4 = Cadre, Maîtrise, NIV I-II, NIV III, Apprenti)
// Mode global : une colonne par niveau (135-139 pour réel, 130-134 pour proj)
// Mode cuisine/salle : deux colonnes par niveau (77+78, 79+80, … pour réel ; 62+63, … pour proj)
const REAL_COLS_GLOBAL  = [[135], [136], [137], [138], [139]];
const REAL_COLS_CS      = [[77, 78], [79, 80], [81, 82], [83, 84], [85, 86]];
const PROJ_COLS_GLOBAL  = [[130], [131], [132], [133], [134]];
const PROJ_COLS_CS      = [[62, 63], [64, 65], [66, 67], [68, 69], [70, 71]];

export function useRecapAnnuelData(data: Record<number, MonthData>, year: number) {
  return useMemo(() => {
    const monthCalcData: Record<string, string>[] = [];
    const monthTotalIndices: number[] = [];
    const monthLastDayIndices: number[] = [];
    const monthDayIndicesArr: number[][] = [];
    const monthSchemas: string[] = [];

    for (let mi = 0; mi <= 11; mi++) {
      const monthData = data[mi];
      const cellData = monthData?.dashboard ?? {};
      const schema = monthData?.personnelSchema ?? 'global';
      monthSchemas.push(schema);
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
        schema,
      );
      monthCalcData.push(calculatedData);
      monthTotalIndices.push(rows.findIndex(r => r.type === 'month_total'));
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

    const getLastDayVal = (mi: number, col: number): number => {
      const idx = monthLastDayIndices[mi];
      if (idx < 0) return 0;
      return parseMoneyValue(monthCalcData[mi][`${idx}-${col}`] ?? '0');
    };

    // Somme des heures jour par jour pour une ou plusieurs colonnes
    const sumHoursCols = (mi: number, cols: number[]): number => {
      const days = monthDayIndicesArr[mi] ?? [];
      return days.reduce((sum, idx) => {
        return sum + cols.reduce((s, col) =>
          s + parsePayrollHourForCalculation(monthCalcData[mi][`${idx}-${col}`] ?? ''), 0);
      }, 0);
    };

    // Heures réalisées par niveau (0=Cadre, 1=Maîtrise, 2=NIV I-II, 3=NIV III, 4=Apprenti)
    // Adapté automatiquement selon le schéma du mois
    const getRealLevelHours = (mi: number, levelIdx: number): number => {
      const cols = monthSchemas[mi] === 'global'
        ? REAL_COLS_GLOBAL[levelIdx]
        : REAL_COLS_CS[levelIdx];
      return sumHoursCols(mi, cols);
    };

    // Heures de projection par niveau
    const getProjLevelHours = (mi: number, levelIdx: number): number => {
      const cols = monthSchemas[mi] === 'global'
        ? PROJ_COLS_GLOBAL[levelIdx]
        : PROJ_COLS_CS[levelIdx];
      return sumHoursCols(mi, cols);
    };

    // Total heures réalisées (col 76 en décimal, calculé par computeDashboardData)
    const getRealTotalHours = (mi: number): number => {
      const days = monthDayIndicesArr[mi] ?? [];
      return days.reduce((sum, idx) => {
        const v = parseFloat(monthCalcData[mi][`${idx}-76`] ?? '0');
        return sum + (isFinite(v) ? v : 0);
      }, 0);
    };

    // Total heures projection (col 61 en décimal)
    const getProjTotalHours = (mi: number): number => {
      const days = monthDayIndicesArr[mi] ?? [];
      return days.reduce((sum, idx) => {
        const v = parseFloat(monthCalcData[mi][`${idx}-61`] ?? '0');
        return sum + (isFinite(v) ? v : 0);
      }, 0);
    };

    // Somme annuelle par niveau
    const sumRealLevel  = (levelIdx: number) =>
      Array.from({ length: 12 }, (_, mi) => getRealLevelHours(mi, levelIdx)).reduce((a, b) => a + b, 0);
    const sumProjLevel  = (levelIdx: number) =>
      Array.from({ length: 12 }, (_, mi) => getProjLevelHours(mi, levelIdx)).reduce((a, b) => a + b, 0);
    const sumRealTotal  = () =>
      Array.from({ length: 12 }, (_, mi) => getRealTotalHours(mi)).reduce((a, b) => a + b, 0);
    const sumProjTotal  = () =>
      Array.from({ length: 12 }, (_, mi) => getProjTotalHours(mi)).reduce((a, b) => a + b, 0);

    // Somme annuelle d'une colonne décimale via month_total
    const sumCol = (col: number) =>
      Array.from({ length: 12 }, (_, mi) => getVal(mi, col)).reduce((a, b) => a + b, 0);

    // Somme annuelle d'heures (col décimale jour par jour)
    const sumHoursCol = (col: number) =>
      Array.from({ length: 12 }, (_, mi) =>
        (monthDayIndicesArr[mi] ?? []).reduce((sum, idx) => {
          const v = parseFloat(monthCalcData[mi][`${idx}-${col}`] ?? '0');
          return sum + (isFinite(v) ? v : 0);
        }, 0)
      ).reduce((a, b) => a + b, 0);

    const caByMonth = Array.from({ length: 12 }, (_, mi) => getVal(mi, 21));
    const totalCA = caByMonth.reduce((s, v) => s + v, 0);

    return {
      getVal, getFgTotal, getRaw, getLastDayVal,
      getRealLevelHours, getProjLevelHours,
      getRealTotalHours, getProjTotalHours,
      sumRealLevel, sumProjLevel, sumRealTotal, sumProjTotal,
      sumCol, sumHoursCol,
      caByMonth, totalCA,
    };
  }, [data, year]);
}
