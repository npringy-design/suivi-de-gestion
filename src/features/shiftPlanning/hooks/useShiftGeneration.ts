import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Shift, ShiftAbsence, ShiftPlanningSettings, ShiftStaffMember, ShiftUnmet } from '@/types/dataTypes';

import type { DayBudget } from '../shiftCalculations';
import { generateWeek } from '../shiftGenerator';
import { weekDaysIso } from '../shiftDates';
import type { PeriodInfo } from '../shiftPeriod';

type Params = {
  mondayIso: string;
  staff: ShiftStaffMember[];
  absences: ShiftAbsence[];
  settings: ShiftPlanningSettings;
  budgetOf: (date: string) => DayBudget;
  periodInfo: Record<string, PeriodInfo> | null;
  shifts: Shift[];
  updateShifts: (updater: (shifts: Shift[]) => Shift[]) => void;
  isLoading: boolean;
};

const AUTO_REGENERATE_DEBOUNCE_MS = 800;

// Génération de la semaine : les shifts proposés sont recalculés, les shifts validés sont conservés.
export function useShiftGeneration({ mondayIso, staff, absences, settings, budgetOf, periodInfo, shifts, updateShifts, isLoading }: Params) {
  // Le résultat n'est affiché que pour la semaine générée.
  const [result, setResult] = useState<{ monday: string; unmet: ShiftUnmet[] } | null>(null);

  const run = useCallback((base: Shift[]) => {
    const generated = generateWeek({ mondayIso, staff, absences, settings, budgetOf, existingShifts: base, periodInfo });
    updateShifts(() => generated.shifts);
    setResult({ monday: mondayIso, unmet: generated.unmet });
  }, [mondayIso, staff, absences, settings, budgetOf, periodInfo, updateShifts]);

  const generate = useCallback(() => run(shifts), [run, shifts]);

  // Après une saisie manuelle : recalcul automatique si activé et si la semaine contient déjà des shifts proposés.
  const applyManualShifts = useCallback((next: Shift[]) => {
    if (settings.autoRegenerate && shifts.some(shift => shift.status === 'proposed')) {
      run(next);
    } else {
      updateShifts(() => next);
    }
  }, [run, settings.autoRegenerate, shifts, updateShifts]);

  // Recalcul automatique (avec debounce) quand les réglages, le personnel, les absences ou le budget changent.
  // Seuls les shifts proposés sont recalculés ; rien ne se lance à l'ouverture de la page ni sans shifts proposés.
  const shiftsRef = useRef(shifts);
  useEffect(() => { shiftsRef.current = shifts; }, [shifts]);
  const signature = useMemo(
    () => JSON.stringify({ settings, staff, absences, budget: weekDaysIso(mondayIso).map(budgetOf) }),
    [settings, staff, absences, mondayIso, budgetOf],
  );
  const lastRun = useRef<{ monday: string; signature: string } | null>(null);

  useEffect(() => {
    if (isLoading) return undefined;
    if (!lastRun.current || lastRun.current.monday !== mondayIso) {
      lastRun.current = { monday: mondayIso, signature };
      return undefined;
    }
    if (lastRun.current.signature === signature || !settings.autoRegenerate) return undefined;
    const timer = setTimeout(() => {
      lastRun.current = { monday: mondayIso, signature };
      if (shiftsRef.current.some(shift => shift.status === 'proposed')) run(shiftsRef.current);
    }, AUTO_REGENERATE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [isLoading, mondayIso, signature, settings.autoRegenerate, run]);

  return { generate, applyManualShifts, resetUnmet: () => setResult(null), unmet: result?.monday === mondayIso ? result.unmet : [] };
}
