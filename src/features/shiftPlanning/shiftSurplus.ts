import type { Shift, ShiftPlanningSettings, ShiftService, ShiftStaffMember } from '@/types/dataTypes';

import { dayRevenue, productiveHours, productivity, shiftCost, shiftDurationHours, type DayBudget } from './shiftCalculations';
import { dateFromIso } from './shiftDates';
import { dayPositions } from './shiftShapes';

// Récapitulatif du surplus : heures nécessaires (besoins seuls, postes de shiftShapes) contre heures planifiées.
// Le surplus est la somme des renforts posés pour atteindre les heures de contrat.

export type SurplusLine = {
  neededHours: number;
  plannedHours: number;
  surplusHours: number;
  surplusCost: number;
  productivityWithoutSurplus: number | null; // CA ÷ heures nécessaires
  productivityWithSurplus: number | null; // CA ÷ heures planifiées
};

export type ReinforcementDetail = { staffKey: string; name: string; service: ShiftService; start: string; end: string; hours: number };

export type DaySurplus = SurplusLine & { date: string; reinforcements: ReinforcementDetail[] };

export type WeekSurplus = { week: SurplusLine; days: DaySurplus[] };

export function computeWeekSurplus(
  weekDates: string[],
  shifts: Shift[],
  staff: ShiftStaffMember[],
  hourlyRates: Record<string, number>,
  settings: ShiftPlanningSettings,
  budgetOf: (date: string) => DayBudget,
): WeekSurplus {
  const nameOf = (staffKey: string) => staff.find(member => member.key === staffKey)?.nom ?? staffKey;

  const days = weekDates.map<DaySurplus>(date => {
    const budget = budgetOf(date);
    const dayShifts = shifts.filter(shift => shift.date === date);
    const reinforcements = dayShifts
      .filter(shift => shift.reinforcement)
      .map<ReinforcementDetail>(shift => ({
        staffKey: shift.staffKey, name: nameOf(shift.staffKey), service: shift.service, start: shift.start, end: shift.end,
        hours: shiftDurationHours(shift.start, shift.end),
      }))
      .sort((a, b) => a.service.localeCompare(b.service) || a.start.localeCompare(b.start));
    const neededHours = dayPositions(settings, date, dateFromIso(date).getDay(), budget)
      .reduce((sum, position) => sum + shiftDurationHours(position.start, position.end), 0);
    const plannedHours = productiveHours(dayShifts, settings.elearningInProductivity);
    return {
      date, reinforcements, neededHours, plannedHours,
      surplusHours: reinforcements.reduce((sum, item) => sum + item.hours, 0),
      surplusCost: dayShifts.filter(shift => shift.reinforcement).reduce((sum, shift) => sum + shiftCost(shift, hourlyRates[shift.staffKey] ?? 0), 0),
      productivityWithoutSurplus: productivity(dayRevenue(budget), neededHours),
      productivityWithSurplus: productivity(dayRevenue(budget), plannedHours),
    };
  });

  const sum = (pick: (day: DaySurplus) => number) => days.reduce((total, day) => total + pick(day), 0);
  const revenue = weekDates.reduce((total, date) => total + dayRevenue(budgetOf(date)), 0);
  const neededHours = sum(day => day.neededHours);
  const plannedHours = sum(day => day.plannedHours);
  return {
    days,
    week: {
      neededHours, plannedHours,
      surplusHours: sum(day => day.surplusHours),
      surplusCost: sum(day => day.surplusCost),
      productivityWithoutSurplus: productivity(revenue, neededHours),
      productivityWithSurplus: productivity(revenue, plannedHours),
    },
  };
}
