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
  resolvePayroll,
} from '../payrollCalculations';
import { payrollMonthKey } from '../payrollDefaults';
import { getAutoPayrollFromConfig } from '../payrollSources';

export function usePayrollCosts() {
  const { allData, loadYearFromCloud, payrollCosts, updatePayrollCosts } = useData();
  const now = new Date();
  // Par défaut le mois précédent : c'est celui dont la paie vient d'être clôturée.
  const initialPeriod = previousMonth(now.getFullYear(), now.getMonth());
  const [year, setYear] = useState(initialPeriod.year);
  const [month, setMonth] = useState(initialPeriod.month);
  const requestedYearsRef = useRef(new Set<number>());

  // Le CA réel vient du Suivi Quotidien : on charge depuis Supabase les années nécessaires
  // aux 12 mois glissants et au N-1. Demandé une fois par année même si l'année est partiellement
  // en local (seule l'année sélectionnée est chargée en entier au démarrage).
  useEffect(() => {
    [year - 1, year].forEach(y => {
      if (requestedYearsRef.current.has(y)) return;
      requestedYearsRef.current.add(y);
      void loadYearFromCloud(y);
    });
  }, [year, loadYearFromCloud]);

  const getRevenue = useCallback((y: number, m: number): number | null => {
    const monthData = allData[y]?.[m];
    if (!monthData?.dashboard) return null;
    const revenue = getCaRealiseMonth(computeMonthDashboard(monthData, m, y), m, y);
    return revenue > 0 ? revenue : null;
  }, [allData]);

  const getAuto = useCallback((y: number, m: number) => getAutoPayrollFromConfig(allData[y]?.[m]), [allData]);

  const entries = payrollCosts.months;
  const key = payrollMonthKey(year, month);
  const entry = entries[key];

  const view = useMemo(() => {
    const resolvedAt = (y: number, m: number) => resolvePayroll(entries[payrollMonthKey(y, m)], getAuto(y, m));
    const metricsAt = (y: number, m: number) => computePayrollMetrics(resolvedAt(y, m), getRevenue(y, m));
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
      hasPrevious: resolvedAt(prev.year, prev.month) !== null,
      hasLastYear: resolvedAt(year - 1, month) !== null,
      // 12 mois glissants se terminant en décembre = janvier→décembre de l'année affichée.
      series: buildRollingSeries(year, 11, resolvedAt, getRevenue),
      yearRows: Array.from({ length: 12 }, (_, m) => {
        const metrics = metricsAt(year, m);
        return {
          month: m,
          totalCost: metrics?.totalCost ?? null,
          gross: metrics?.gross ?? null,
          revenue: metrics?.revenue ?? null,
          totalCostToRevenuePct: metrics?.totalCostToRevenuePct ?? null,
        };
      }),
    };
  }, [entries, entry, getAuto, getRevenue, year, month]);

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
    auto: getAuto(year, month),
    thresholds: payrollCosts.alertThresholds,
    setThresholds,
    saveEntry,
    deleteEntry,
    ...view,
  };
}
