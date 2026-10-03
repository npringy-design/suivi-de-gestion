import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useData } from '@/contexts/DataContext';
import type { PayrollForfaitsJourPeriod, PayrollMonthEntry } from '@/types/dataTypes';

import {
  buildYearSeries,
  compareMetrics,
  compareToBudget,
  computePayrollMetrics,
  previousMonth,
  resolvePayroll,
} from '../payrollCalculations';
import { computeCostEvolution } from '../payrollCostEvolution';
import { payrollMonthKey } from '../payrollDefaults';
import { getRealPayrollFromConfig } from '../payrollSources';
import { buildPayrollVarianceView } from '../payrollVarianceSources';

// L'analyse porte sur le seul coût salarial : le CA n'est volontairement pas rapproché
// (provisions de congés payés, aides apprentis et autres frais de personnel absents du coût importé).
const noRevenue = (): number | null => null;

export function usePayrollCosts() {
  const { allData, loadYearFromCloud, payrollCosts, updatePayrollCosts } = useData();
  const now = new Date();
  // Par défaut le mois précédent : c'est celui dont la paie vient d'être clôturée.
  const initialPeriod = previousMonth(now.getFullYear(), now.getMonth());
  const [year, setYear] = useState(initialPeriod.year);
  const [month, setMonth] = useState(initialPeriod.month);
  const requestedYearsRef = useRef(new Set<number>());

  // Config Salaires (coûts importés) de N-1, de l'année affichée et de N+1 (le réel de décembre est
  // rangé sur janvier N+1, cf. getRealPayrollFromConfig) : chargées depuis Supabase une fois par
  // année, même si l'année est partiellement en local (seule l'année sélectionnée est chargée en
  // entier au démarrage).
  useEffect(() => {
    [year - 1, year, year + 1].forEach(y => {
      if (requestedYearsRef.current.has(y)) return;
      requestedYearsRef.current.add(y);
      void loadYearFromCloud(y);
    });
  }, [year, loadYearFromCloud]);

  const forfaitsJourPeriods = payrollCosts.forfaitsJourPeriods;
  const getAuto = useCallback(
    (y: number, m: number) => getRealPayrollFromConfig(allData, y, m, forfaitsJourPeriods),
    [allData, forfaitsJourPeriods],
  );

  const entries = payrollCosts.months;
  const key = payrollMonthKey(year, month);
  const entry = entries[key];

  const view = useMemo(() => {
    const resolvedAt = (y: number, m: number) => resolvePayroll(entries[payrollMonthKey(y, m)], getAuto(y, m));
    const metricsAt = (y: number, m: number) => computePayrollMetrics(resolvedAt(y, m), null);
    const current = metricsAt(year, month);
    const prev = previousMonth(year, month);
    const series = buildYearSeries(year, resolvedAt, noRevenue);
    const lastYearSeries = buildYearSeries(year - 1, resolvedAt, noRevenue);
    return {
      current,
      vsPrevious: current ? compareMetrics(current, metricsAt(prev.year, prev.month)) : {},
      vsLastYear: current ? compareMetrics(current, metricsAt(year - 1, month)) : {},
      vsBudget: current ? compareToBudget(current, entry) : {},
      hasPrevious: resolvedAt(prev.year, prev.month) !== null,
      hasLastYear: resolvedAt(year - 1, month) !== null,
      series,
      lastYearSeries,
      evolution: computeCostEvolution(series, lastYearSeries),
      // Comparaison au même mois de l'année précédente, calculable pour chaque mois de la série.
      monthDetails: series.map(point => {
        const monthCurrent = metricsAt(year, point.month);
        const monthLastYear = metricsAt(year - 1, point.month);
        const currentTotal = monthCurrent?.totalCost ?? null;
        const lastYearTotal = monthLastYear?.totalCost ?? null;
        return {
          current: monthCurrent,
          lastYear: monthLastYear,
          vsLastYear: monthCurrent ? compareMetrics(monthCurrent, monthLastYear) : {},
          variance: currentTotal !== null && lastYearTotal !== null
            ? buildPayrollVarianceView(allData, year, point.month, currentTotal, lastYearTotal)
            : null,
        };
      }),
    };
  }, [allData, entries, entry, getAuto, year, month]);

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

  const saveForfaitsJourPeriods = useCallback((next: PayrollForfaitsJourPeriod[]) => {
    updatePayrollCosts(prev => ({ ...prev, forfaitsJourPeriods: next }));
  }, [updatePayrollCosts]);

  return {
    year,
    forfaitsJourPeriods,
    saveForfaitsJourPeriods,
    month,
    setYear,
    setMonth,
    entry,
    auto: getAuto(year, month),
    saveEntry,
    deleteEntry,
    ...view,
  };
}
