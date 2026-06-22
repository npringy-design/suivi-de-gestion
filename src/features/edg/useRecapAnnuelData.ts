import { useMemo } from 'react';

import type { MonthData } from '@/types/dataTypes';
import { buildMonthRows } from '@/features/dashboard/dashboardRows';
import { buildDynamicColumns } from '@/features/dashboard/dashboardColumns';
import { computeDashboardData } from '@/features/dashboard/dashboardCalculations';
import { parseMoneyValue } from '@/lib/money';

export function useRecapAnnuelData(data: Record<number, MonthData>, year: number) {
  return useMemo(() => {
    const monthCalcData: Record<string, string>[] = [];
    const monthTotalIndices: number[] = [];

    for (let mi = 0; mi <= 11; mi++) {
      const rows = buildMonthRows(year, mi);
      const dynamicColumns = buildDynamicColumns(
        data[mi]?.salariesConfig?.categories,
        {} as Record<number, string>,
      );
      const cellData = data[mi]?.dashboard ?? {};
      const calculatedData = computeDashboardData(
        cellData,
        rows,
        dynamicColumns,
        data[mi]?.salariesConfig?.categories,
        data[mi]?.personnelSchema,
      );
      monthCalcData.push(calculatedData);
      monthTotalIndices.push(rows.findIndex(r => r.type === 'month_total'));
    }

    const getVal = (mi: number, col: number): number => {
      const idx = monthTotalIndices[mi];
      if (idx < 0) return 0;
      return parseMoneyValue(monthCalcData[mi][`${idx}-${col}`]);
    };

    const caByMonth = Array.from({ length: 12 }, (_, mi) => getVal(mi, 21));
    const totalCA = caByMonth.reduce((s, v) => s + v, 0);

    return { getVal, caByMonth, totalCA };
  }, [data, year]);
}
