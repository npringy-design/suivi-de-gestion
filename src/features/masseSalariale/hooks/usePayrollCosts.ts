import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useData } from '@/contexts/DataContext';
import { computeMonthDashboard, getCaRealiseMonth } from '@/features/edg/edgRealtimeSources';
import type { PayrollAlertThresholds, PayrollMonthEntry } from '@/types/dataTypes';

import {
  buildRollingSeries,
  compareMetrics,
  compareToBudget,
  computePayrollMetrics,
  previousMonth,
} from '../payrollCalculations';
import { payrollMonthKey } from '../payrollDefaults';

export function usePayrollCosts() {
  const { allData, loadYearFromCloud, payrollCosts, updatePayrollCosts } = useData();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const requestedYearsRef = useRef(new Set<number>());

  // Le CA réel vient du Suivi Quotidien : on charge depuis Supabase les années nécessaires
  // aux 12 mois glissants et au N-1 (même mécanisme que Analyse des écarts).
  useEffect(() => {
    [year - 1, year].forEach(y => {
      if (allData[y] || requestedYearsRef.current.has(y)) return;
      requestedYearsRef.current.add(y);
      void loadYearFromCloud(y);
    });
  }, [year, allData, loadYearFromCloud]);

  const getRevenue = useCallback((y: number, m: number): number | null => {
    const monthData = allData[y]?.[m];
    if (!monthData?.dashboard) return null;
    const revenue = getCaRealiseMonth(computeMonthDashboard(monthData, m, y), m, y);
    return revenue > 0 ? revenue : null;
  }, [allData]);

  const entries = payrollCosts.months;
  const key = payrollMonthKey(year, month);
  const entry = entries[key];

  const view = useMemo(() => {
    const metricsAt = (y: number, m: number) => computePayrollMetrics(entries[payrollMonthKey(y, m)], getRevenue(y, m));
    const current = metricsAt(year, month);
    const prev = previousMonth(year, month);
    const vsPrevious = current ? compareMetrics(current, metricsAt(prev.year, prev.month)) : {};
    const vsLastYear = current ? compareMetrics(current, metricsAt(year - 1, month)) : {};
    const vsBudget = current ? compareToBudget(current, entry) : {};
    return {
      current,
      revenue: getRevenue(year, month),
      vsPrevious,
      vsLastYear,
      vsBudget,
      hasPrevious: Boolean(entries[payrollMonthKey(prev.year, prev.month)]),
      hasLastYear: Boolean(entries[payrollMonthKey(year - 1, month)]),
      series: buildRollingSeries(year, month, entries, getRevenue),
    };
  }, [entries, entry, getRevenue, year, month]);

  const saveEntry = useCallback((next: PayrollMonthEntry) => {
    updatePayrollCosts(prev => ({ ...prev, months: { ...prev.months, [key]: next } }));
  }, [key, updatePayrollCosts]);

  const deleteEntry = useCallback(() => {
    updatePayrollCosts(prev => {
      const months = { ...prev.months };
      delete months[key];
      return { ...prev, months };
    });
  }, [key, updatePayrollCosts]);

  const setThresholds = useCallback((alertThresholds: PayrollAlertThresholds) => {
    updatePayrollCosts(prev => ({ ...prev, alertThresholds }));
  }, [updatePayrollCosts]);

  return {
    year,
    month,
    setYear,
    setMonth,
    entry,
    thresholds: payrollCosts.alertThresholds,
    setThresholds,
    saveEntry,
    deleteEntry,
    ...view,
  };
}
