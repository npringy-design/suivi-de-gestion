import { useCallback, useEffect, useMemo, useState } from 'react';

import { useData } from '@/contexts/DataContext';
import type { ShiftStaffMember } from '@/types/dataTypes';
import { EMPTY_DAY_BUDGET, type DayBudget } from '../shiftCalculations';
import { dateFromIso, monthsOfDates } from '../shiftDates';
import { buildStaffMembers, collectWeekBudget, deriveStaffCandidates } from '../shiftSources';

// Données existantes lues en lecture seule : personnel + taux horaire chargé (salariesConfig),
// couverts et CA budgétés par jour (collectDailySamples).
export function useShiftPlanningData(weekDates: string[], storedStaff: ShiftStaffMember[]) {
  const { allData, loadYearFromCloud } = useData();
  const [loadedYears, setLoadedYears] = useState<number[]>([]);

  const years = useMemo(
    () => [...new Set(monthsOfDates(weekDates).map(ref => ref.year))],
    [weekDates],
  );
  const monday = weekDates[0];

  useEffect(() => {
    let cancelled = false;
    void Promise.all(years.map(year => loadYearFromCloud(year))).then(() => {
      if (!cancelled) setLoadedYears(years);
    });
    return () => { cancelled = true; };
  }, [years, loadYearFromCloud]);

  const staffSource = useMemo(() => {
    const date = dateFromIso(monday);
    return deriveStaffCandidates(allData, date.getFullYear(), date.getMonth());
  }, [allData, monday]);

  const staff = useMemo(
    () => buildStaffMembers(staffSource?.candidates ?? [], storedStaff),
    [staffSource, storedStaff],
  );

  const hourlyRates = useMemo(
    () => Object.fromEntries((staffSource?.candidates ?? []).map(c => [c.key, c.hourlyRate])),
    [staffSource],
  );

  const budgetByDate = useMemo<Record<string, DayBudget>>(() => collectWeekBudget(allData, weekDates), [allData, weekDates]);

  const budgetOf = useCallback((date: string): DayBudget => budgetByDate[date] ?? EMPTY_DAY_BUDGET, [budgetByDate]);

  return {
    staff,
    hourlyRates,
    staffSource,
    budgetOf,
    isLoading: !years.every(year => loadedYears.includes(year)),
  };
}
