import type { Shift, ShiftPayPeriod, ShiftPlanningSettings, ShiftStaffMember } from '@/types/dataTypes';

import { shiftDurationHours, totalHours } from './shiftCalculations';
import { addDaysIso, dateFromIso, mondayOfIso } from './shiftDates';
import { coveredServices } from './shiftStaffing';
import { closingEndOf } from './shiftTemplates';

// Période de paie contenant la semaine : celle qui chevauche la semaine (lundi → dimanche), le lundi en priorité.
export const findPayPeriod = (periods: ShiftPayPeriod[], mondayIso: string): ShiftPayPeriod | null => {
  const sunday = addDaysIso(mondayIso, 6);
  return periods.find(p => p.start <= mondayIso && p.end >= mondayIso)
    ?? periods.find(p => p.start <= sunday && p.end >= mondayIso)
    ?? null;
};

// Lundis des semaines couvertes par la période.
export const periodMondays = (period: ShiftPayPeriod): string[] => {
  const mondays: string[] = [];
  for (let monday = mondayOfIso(period.start); monday <= period.end; monday = addDaysIso(monday, 7)) mondays.push(monday);
  return mondays;
};

// Nombre de semaines de la période (jours inclus ÷ 7, arrondi, au moins 1).
export const periodWeekCount = (period: ShiftPayPeriod): number => {
  const days = Math.round((dateFromIso(period.end).getTime() - dateFromIso(period.start).getTime()) / 86400000) + 1;
  return Math.max(1, Math.round(days / 7));
};

// Compteur de période : heures planifiées sur toutes les semaines enregistrées de la période
// − heures de contrat × nombre de semaines. Positif = heures en trop, négatif = heures en moins.
export const periodCounter = (
  member: ShiftStaffMember,
  period: ShiftPayPeriod,
  shiftsByMonday: Record<string, Shift[]>,
): number | null => {
  if (member.forfaitJour || member.contractHours <= 0) return null;
  const planned = periodMondays(period).reduce(
    (sum, monday) => sum + totalHours((shiftsByMonday[monday] ?? []).filter(shift => shift.staffKey === member.key)),
    0,
  );
  return planned - member.contractHours * periodWeekCount(period);
};

// Situation d'un collaborateur avant la semaine à générer (les autres semaines de la période, déjà enregistrées).
export type PeriodInfo = {
  balance: number; // heures des autres semaines planifiées − contrat × nombre de ces semaines
  weeksLeft: number; // semaine courante + semaines futures de la période non encore planifiées
  saturdays: number;
  sundays: number;
  closings: number;
};

export const isClosing = (shift: Shift, settings: ShiftPlanningSettings): boolean => {
  if (!coveredServices(shift, settings).includes('soir')) return false;
  const weekday = dateFromIso(shift.date).getDay();
  return closingEndOf(settings, weekday) === shift.end;
};

export function computePeriodInfo(
  period: ShiftPayPeriod,
  mondayIso: string,
  staff: ShiftStaffMember[],
  otherWeeks: Record<string, Shift[]>,
  settings: ShiftPlanningSettings,
): Record<string, PeriodInfo> {
  const mondays = periodMondays(period);
  const plannedOthers = mondays.filter(monday => monday !== mondayIso && (otherWeeks[monday]?.length ?? 0) > 0);
  const weeksLeft = 1 + mondays.filter(monday => monday > mondayIso && !plannedOthers.includes(monday)).length;

  return Object.fromEntries(staff.map(member => {
    const own = plannedOthers.flatMap(monday => (otherWeeks[monday] ?? []).filter(shift => shift.staffKey === member.key));
    const hours = own.reduce((sum, shift) => sum + shiftDurationHours(shift.start, shift.end), 0);
    return [member.key, {
      balance: member.forfaitJour ? 0 : hours - member.contractHours * plannedOthers.length,
      weeksLeft,
      saturdays: own.filter(shift => dateFromIso(shift.date).getDay() === 6).length,
      sundays: own.filter(shift => dateFromIso(shift.date).getDay() === 0).length,
      closings: own.filter(shift => isClosing(shift, settings)).length,
    }];
  }));
}
