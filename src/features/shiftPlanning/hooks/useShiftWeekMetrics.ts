import { useMemo } from 'react';

import type { Shift, ShiftPlanningSettings, ShiftStaffMember } from '@/types/dataTypes';
import {
  computeDayNeeds,
  computeDayShortages,
  computeLegalAlerts,
  dayRevenue,
  overtimeHours,
  payrollPct,
  productivity,
  totalCost,
  totalHours,
  type DayBudget,
  type LegalAlert,
  type RoleShortage,
} from '../shiftCalculations';

export type DayMetrics = {
  date: string;
  budget: DayBudget;
  covers: number;
  hours: number;
  productivity: number | null;
  shortages: RoleShortage[];
};

export type WeekMetrics = {
  days: DayMetrics[];
  weekHours: number;
  weekCost: number;
  weekRevenue: number;
  weekProductivity: number | null;
  weekPayrollPct: number | null;
  overtime: number;
  alerts: LegalAlert[];
  alertShiftIds: Set<string>;
  hoursByStaff: Record<string, number>;
  proposedCount: number;
};

// Tous les indicateurs de la semaine affichée (calculs purs de shiftCalculations.ts).
export function useShiftWeekMetrics(
  weekDates: string[],
  shifts: Shift[],
  staff: ShiftStaffMember[],
  hourlyRates: Record<string, number>,
  settings: ShiftPlanningSettings,
  budgetOf: (date: string) => DayBudget,
): WeekMetrics {
  return useMemo(() => {
    const days = weekDates.map<DayMetrics>(date => {
      const budget = budgetOf(date);
      const dayShifts = shifts.filter(shift => shift.date === date);
      const hours = totalHours(dayShifts);
      return {
        date,
        budget,
        covers: budget.cvMidi + budget.cvSoir,
        hours,
        productivity: productivity(dayRevenue(budget), hours),
        shortages: computeDayShortages(computeDayNeeds(settings.guardRules, budget), dayShifts),
      };
    });

    const weekHours = totalHours(shifts);
    const weekCost = totalCost(shifts, hourlyRates);
    const weekRevenue = days.reduce((sum, day) => sum + dayRevenue(day.budget), 0);
    const alerts = computeLegalAlerts(shifts, staff, weekDates[0], settings.legalRules.map(rule => rule.id));

    return {
      days,
      weekHours,
      weekCost,
      weekRevenue,
      weekProductivity: productivity(weekRevenue, weekHours),
      weekPayrollPct: payrollPct(weekCost, weekRevenue),
      overtime: overtimeHours(shifts, staff),
      alerts,
      alertShiftIds: new Set(alerts.flatMap(alert => alert.shiftIds)),
      hoursByStaff: Object.fromEntries(staff.map(member => [member.key, totalHours(shifts.filter(s => s.staffKey === member.key))])),
      proposedCount: shifts.filter(shift => shift.status === 'proposed').length,
    };
  },[weekDates, shifts, staff, hourlyRates, settings.guardRules, settings.legalRules, budgetOf]);
}
