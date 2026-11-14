import { useMemo } from 'react';

import type { Shift, ShiftPlanningSettings, ShiftStaffMember } from '@/types/dataTypes';

import {
  computeLegalAlerts,
  dayRevenue,
  ELEARNING_ROLE_ID,
  overtimeHours,
  payrollPct,
  productiveHours,
  productivity,
  totalCost,
  totalHours,
  type DayBudget,
  type LegalAlert,
} from '../shiftCalculations';
import { dateFromIso } from '../shiftDates';
import { computeDayNeeds, computeDayShortages, type RoleShortage } from '../shiftStaffing';
import { matchesTemplate } from '../shiftTemplates';

export type DayMetrics = {
  date: string;
  budget: DayBudget;
  covers: number;
  hours: number;
  productivity: number | null;
  payrollPct: number | null; // coût planifié du jour ÷ CA budgété du jour
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
      // L'e-learning n'entre dans la productivité que si l'option est active.
      const hours = productiveHours(dayShifts, settings.elearningInProductivity);
      return {
        date,
        budget,
        covers: budget.cvMidi + budget.cvSoir,
        hours,
        productivity: productivity(dayRevenue(budget), hours),
        payrollPct: payrollPct(totalCost(dayShifts, hourlyRates), dayRevenue(budget)),
        shortages: computeDayShortages(computeDayNeeds(settings, dateFromIso(date).getDay(), budget), dayShifts, settings, date),
      };
    });

    const weekHours = totalHours(shifts);
    const weekCost = totalCost(shifts, hourlyRates);
    const weekRevenue = days.reduce((sum, day) => sum + dayRevenue(day.budget), 0);
    const legalAlerts = computeLegalAlerts(shifts, staff, weekDates[0], settings.legalRules.map(rule => rule.id));
    // Un shift hors modèle est accepté mais signalé (e-learning exclu : horaires libres).
    const templateAlerts: LegalAlert[] = settings.templates.length === 0 ? [] : shifts
      .filter(shift => shift.roleId !== ELEARNING_ROLE_ID && !matchesTemplate(shift, settings.templates, new Date(`${shift.date}T12:00:00`).getDay()))
      .map(shift => ({
        ruleId: 'outOfTemplate' as const,
        staffKey: shift.staffKey,
        shiftIds: [shift.id],
        message: `${staff.find(member => member.key === shift.staffKey)?.nom ?? shift.staffKey} : shift hors modèle le ${shift.date} (${shift.start} – ${shift.end})`,
      }));
    const alerts = [...legalAlerts, ...templateAlerts];

    return {
      days,
      weekHours,
      weekCost,
      weekRevenue,
      weekProductivity: productivity(weekRevenue, productiveHours(shifts, settings.elearningInProductivity)),
      weekPayrollPct: payrollPct(weekCost, weekRevenue),
      overtime: overtimeHours(shifts, staff),
      alerts,
      alertShiftIds: new Set(alerts.flatMap(alert => alert.shiftIds)),
      hoursByStaff: Object.fromEntries(staff.map(member => [member.key, totalHours(shifts.filter(s => s.staffKey === member.key))])),
      proposedCount: shifts.filter(shift => shift.status === 'proposed').length,
    };
  }, [weekDates, shifts, staff, hourlyRates, settings, budgetOf]);
}
