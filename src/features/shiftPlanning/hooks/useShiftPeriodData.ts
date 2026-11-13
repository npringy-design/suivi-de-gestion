import { useEffect, useMemo, useState } from 'react';

import type { SiteId } from '@/lib/sites';
import { loadShiftDoc, weekDocKey } from '@/services/supabaseShiftPlanning';
import type { Shift, ShiftPlanningSettings, ShiftStaffMember } from '@/types/dataTypes';
import { computePeriodInfo, findPayPeriod, periodCounter, periodMondays, type PeriodInfo } from '../shiftPeriod';
import { readArray } from '../shiftSources';

// Semaines déjà enregistrées de la période de paie qui contient la semaine affichée (lecture seule),
// compteurs de période par collaborateur et situation de départ pour la génération.
export function useShiftPeriodData(
  siteId: SiteId,
  mondayIso: string,
  settings: ShiftPlanningSettings,
  staff: ShiftStaffMember[],
  currentShifts: Shift[],
) {
  const period = useMemo(() => findPayPeriod(settings.payPeriods, mondayIso), [settings.payPeriods, mondayIso]);
  const [otherWeeks, setOtherWeeks] = useState<Record<string, Shift[]>>({});

  const periodStart = period?.start;
  const periodEnd = period?.end;

  useEffect(() => {
    if (!periodStart || !periodEnd) return;
    let cancelled = false;
    const mondays = periodMondays({ start: periodStart, end: periodEnd }).filter(monday => monday !== mondayIso);
    void Promise.all(mondays.map(async monday => {
      const raw = await loadShiftDoc<unknown>(siteId, weekDocKey(monday)).catch(() => null);
      return [monday, readArray<Shift>(raw, 'shifts')] as const;
    })).then(entries => {
      if (!cancelled) setOtherWeeks(Object.fromEntries(entries));
    });
    return () => { cancelled = true; };
  }, [siteId, mondayIso, periodStart, periodEnd]);

  const periodInfo = useMemo<Record<string, PeriodInfo> | null>(
    () => (period ? computePeriodInfo(period, mondayIso, staff, otherWeeks, settings) : null),
    [period, mondayIso, staff, otherWeeks, settings],
  );

  const counters = useMemo<Record<string, number | null>>(() => {
    if (!period) return {};
    const byMonday = { ...otherWeeks, [mondayIso]: currentShifts };
    return Object.fromEntries(staff.map(member => [member.key, periodCounter(member, period, byMonday)]));
  }, [period, otherWeeks, mondayIso, currentShifts, staff]);

  return { period, periodInfo, counters };
}
