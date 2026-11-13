import { useCallback, useState } from 'react';

import type { Shift, ShiftAbsence, ShiftPlanningSettings, ShiftStaffMember, ShiftUnmet } from '@/types/dataTypes';
import type { DayBudget } from '../shiftCalculations';
import { generateWeek } from '../shiftGenerator';
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
};

// Génération de la semaine : les shifts proposés sont recalculés, les shifts validés sont conservés.
export function useShiftGeneration({ mondayIso, staff, absences, settings, budgetOf, periodInfo, shifts, updateShifts }: Params) {
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

  return { generate, applyManualShifts, unmet: result?.monday === mondayIso ? result.unmet : [] };
}
