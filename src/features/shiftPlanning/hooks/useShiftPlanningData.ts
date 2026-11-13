import { useCallback, useEffect, useMemo, useState } from 'react';

import { useData } from '@/contexts/DataContext';
import type { ShiftStaffMember } from '@/types/dataTypes';
import { EMPTY_DAY_BUDGET, type DayBudget } from '../shiftCalculations';
import { dateFromIso, monthsOfDates } from '../shiftDates';
import { getSchoolHolidayCalendar } from '@/lib/schoolHolidays';
import { buildStaffMembers, buildWeekDayContext, collectWeekBudget, deriveStaffCandidates, staffSourceLabel } from '../shiftSources';

// Données existantes lues en lecture seule : personnel + taux horaire chargé (salariesConfig),
// couverts et CA budgétés par jour (collectDailySamples).
export function useShiftPlanningData(weekDates: string[], storedStaff: ShiftStaffMember[], roleIds: string[]) {
  const { allData, loadYearFromCloud, customEvents, companySettings } = useData();
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
    () => buildStaffMembers(staffSource?.candidates ?? [], storedStaff, roleIds),
    [staffSource, storedStaff, roleIds],
  );

  const hourlyRates = useMemo(
    () => Object.fromEntries((staffSource?.candidates ?? []).map(c => [c.key, c.hourlyRate])),
    [staffSource],
  );

  const budgetByDate = useMemo<Record<string, DayBudget>>(() => collectWeekBudget(allData, weekDates), [allData, weekDates]);

  const budgetOf = useCallback((date: string): DayBudget => budgetByDate[date] ?? EMPTY_DAY_BUDGET, [budgetByDate]);

  const staffSourceLabels = useMemo<Record<string, string>>(
    () => Object.fromEntries((staffSource?.candidates ?? []).map(c => [c.key, staffSourceLabel(c)])),
    [staffSource],
  );

  const dayContext = useMemo(
    () => buildWeekDayContext(weekDates, getSchoolHolidayCalendar(companySettings.schoolZone), customEvents),
    [weekDates, companySettings.schoolZone, customEvents],
  );

  return {
    staff,
    staffSourceLabels,
    dayContext,
    hourlyRates,
    staffSource,
    budgetOf,
    isLoading: !years.every(year => loadedYears.includes(year)),
  };
}
