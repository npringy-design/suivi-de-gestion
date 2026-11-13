import type {
  Shift,
  ShiftAbsence,
  ShiftPlanningSettings,
  ShiftService,
  ShiftStaffMember,
  ShiftUnmet,
} from '@/types/dataTypes';
import {
  computeLegalAlerts,
  dayRevenue,
  ELEARNING_ROLE_ID,
  findAbsence,
  formatShiftTime,
  HARD_LEGAL_RULES,
  parseShiftTime,
  productiveHours,
  shiftDurationHours,
  totalHours,
  type DayBudget,
} from './shiftCalculations';
import { dateFromIso, weekDaysIso } from './shiftDates';
import { buildDemands, SERVICES, windowOf, type Demand } from './shiftGeneratorDemands';
import { isClosing, type PeriodInfo } from './shiftPeriod';

// Moteur de génération d'une semaine (fonctions pures). Priorités strictes :
// a) règles légales ; b) minimums de personnel ; c) productivité ; d) heures de contrat lissées sur la période de paie ;
// e) repos consécutifs / préférés ; f) équilibre des samedis, dimanches et fermetures.

export type GenerateInput = {
  mondayIso: string;
  staff: ShiftStaffMember[];
  absences: ShiftAbsence[];
  settings: ShiftPlanningSettings;
  budgetOf: (date: string) => DayBudget;
  existingShifts: Shift[];
  periodInfo: Record<string, PeriodInfo> | null; // null : pas de période de paie → heures de contrat de la semaine
};

export type GenerateResult = { shifts: Shift[]; unmet: ShiftUnmet[] };

const MIN_TOP_UP_HOURS = 2;

const idOf = (date: string, staffKey: string, roleId: string, service: ShiftService, start: string): string =>
  `auto-${date}-${staffKey.replace(/\s+/g, '_')}-${roleId}-${service}-${start}`;

const intervalOf = (shift: Pick<Shift, 'start' | 'end'>): [number, number] => {
  const start = parseShiftTime(shift.start) ?? 0;
  const end = parseShiftTime(shift.end) ?? 0;
  return [start, end <= start ? end + 1440 : end];
};

const overlaps = (a: Pick<Shift, 'start' | 'end'>, b: Pick<Shift, 'start' | 'end'>): boolean => {
  const [aStart, aEnd] = intervalOf(a);
  const [bStart, bEnd] = intervalOf(b);
  return aStart < bEnd && bStart < aEnd;
};

export function generateWeek(input: GenerateInput): GenerateResult {
  const { mondayIso, staff, absences, settings, budgetOf, periodInfo } = input;
  const weekDates = weekDaysIso(mondayIso);
  // Les shifts proposés sont régénérés ; les shifts validés (saisis ou validés) sont conservés.
  const kept = input.existingShifts.filter(shift => shift.status === 'validated');
  const assigned: Shift[] = [...kept];
  const unmet: ShiftUnmet[] = [];

  const staffShifts = (member: ShiftStaffMember) => assigned.filter(shift => shift.staffKey === member.key);
  const hoursOf = (member: ShiftStaffMember) => totalHours(staffShifts(member));
  const weekdayOf = (date: string) => dateFromIso(date).getDay();

  // a) Règles légales : toujours respectées (hors heures de contrat, traitées en d).
  const canAdd = (member: ShiftStaffMember, candidate: Shift): boolean => {
    const own = staffShifts(member);
    if (own.some(shift => shift.date === candidate.date && overlaps(shift, candidate))) return false;
    if (findAbsence(absences, member.key, candidate.date)) return false;
    return computeLegalAlerts([...own, candidate], [member], mondayIso, HARD_LEGAL_RULES).length === 0;
  };

  // d) Heures visées cette semaine : contrat lissé sur la période (le compteur de fin de période doit tendre vers 0).
  const targetOf = (member: ShiftStaffMember): number => {
    if (member.forfaitJour || member.contractHours <= 0) return 0;
    const info = periodInfo?.[member.key];
    if (!info) return member.contractHours;
    return Math.max(0, member.contractHours - info.balance / info.weeksLeft);
  };

  const dayShifts = (date: string) => assigned.filter(shift => shift.date === date);
  const dayHours = (date: string) => productiveHours(dayShifts(date), settings.elearningInProductivity);

  // b) Minimums de personnel.
  const demands = buildDemands(weekDates, settings, budgetOf, kept)
    .sort((a, b) => a.rank - b.rank || a.date.localeCompare(b.date));

  const rankCandidate = (member: ShiftStaffMember, demand: Demand) => {
    const info = periodInfo?.[member.key];
    const weekday = weekdayOf(demand.date);
    const own = staffShifts(member);
    // f) équilibre : samedis / dimanches / fermetures déjà portés (période + semaine en cours).
    const weekendLoad = (weekday === 6 ? (info?.saturdays ?? 0) + own.filter(s => weekdayOf(s.date) === 6).length : 0)
      + (weekday === 0 ? (info?.sundays ?? 0) + own.filter(s => weekdayOf(s.date) === 0).length : 0);
    const closingLoad = demand.closing ? (info?.closings ?? 0) + own.filter(s => isClosing(s, settings)).length : 0;
    return [
      member.roles.indexOf(demand.roleId), // rôles dans l'ordre de préférence
      -Math.round((targetOf(member) - totalHours(own)) / 2), // le plus en retard sur son compteur (par paliers de 2 h)
      member.preferredRestDays.includes(weekday) ? 1 : 0, // e) jours de repos préférés
      weekendLoad,
      closingLoad,
    ];
  };

  const compareRanks = (a: number[], b: number[]): number => {
    for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return a[i] - b[i];
    return 0;
  };

  demands.forEach(demand => {
    const candidate: Shift = {
      id: '', staffKey: '', date: demand.date, start: demand.start, end: demand.end,
      roleId: demand.roleId, service: demand.service, status: 'proposed',
    };
    const eligible = staff
      .filter(member => member.roles.includes(demand.roleId))
      .map(member => ({ member, shift: { ...candidate, staffKey: member.key, id: idOf(demand.date, member.key, demand.roleId, demand.service, demand.start) } }))
      .filter(({ member, shift }) => canAdd(member, shift));

    if (eligible.length === 0) {
      unmet.push({ date: demand.date, message: `${demand.date} ${demand.service} : aucun ${demand.roleId} disponible (${demand.start} – ${demand.end})` });
      return;
    }
    const best = eligible
      .map(entry => ({ ...entry, rank: rankCandidate(entry.member, demand) }))
      .sort((a, b) => compareRanks(a.rank, b.rank) || a.member.nom.localeCompare(b.member.nom, 'fr'))[0];
    assigned.push(best.shift);
  });

  // E-learning des apprentis : placé juste avant un shift du jour (sinon sur un jour libre, avant le service du midi).
  if (settings.elearningHours > 0) {
    staff.filter(member => member.apprenti).forEach(member => {
      const hours = settings.elearningHours;
      const days = [...weekDates].sort((a, b) => staffShifts(member).filter(s => s.date === a).length - staffShifts(member).filter(s => s.date === b).length);
      const makeShift = (date: string, start: number, service: ShiftService): Shift => ({
        id: idOf(date, member.key, ELEARNING_ROLE_ID, service, formatShiftTime(start)),
        staffKey: member.key, date, start: formatShiftTime(start), end: formatShiftTime(start + hours * 60),
        roleId: ELEARNING_ROLE_ID, service, status: 'proposed',
      });
      const placeBefore = days.some(date => {
        const own = staffShifts(member).filter(shift => shift.date === date);
        if (own.length !== 1) return false;
        const start = parseShiftTime(own[0].start) ?? 0;
        if (start - hours * 60 < 0) return false;
        const shift = makeShift(date, start - hours * 60, own[0].service);
        if (!canAdd(member, shift)) return false;
        assigned.push(shift);
        return true;
      });
      if (placeBefore) return;
      const placeOnFreeDay = days.some(date => {
        const window = windowOf(settings, 'midi', weekdayOf(date));
        const start = window ? parseShiftTime(window.start) : null;
        if (start === null || staffShifts(member).some(shift => shift.date === date)) return false;
        const shift = makeShift(date, start, 'midi');
        if (!canAdd(member, shift)) return false;
        assigned.push(shift);
        return true;
      });
      if (!placeOnFreeDay) unmet.push({ date: weekDates[0], message: `${member.nom} : ${hours} h d'e-learning non placées` });
    });
  }

  // c) + d) Heures de contrat manquantes, placées d'abord les jours où la marge de productivité est la plus forte.
  // Un shift ajouté ne doit jamais faire passer un jour sous la productivité minimum.
  staff.filter(member => !member.forfaitJour && member.contractHours > 0).forEach(member => {
    let remaining = targetOf(member) - hoursOf(member);
    const roleId = member.roles.find(id => id !== ELEARNING_ROLE_ID);
    if (!roleId) return;

    while (remaining >= MIN_TOP_UP_HOURS) {
      const margin = (date: string) => dayRevenue(budgetOf(date)) - settings.minProductivity * dayHours(date);
      const days = [...weekDates].sort((a, b) =>
        (member.preferredRestDays.includes(weekdayOf(a)) ? 1 : 0) - (member.preferredRestDays.includes(weekdayOf(b)) ? 1 : 0)
        || margin(b) - margin(a));

      const placed = days.some(date => SERVICES.some(service => {
        const window = windowOf(settings, service, weekdayOf(date));
        if (!window) return false;
        const windowHours = shiftDurationHours(window.start, window.end);
        const length = Math.min(windowHours, remaining);
        if (length < MIN_TOP_UP_HOURS) return false;
        const startAbs = parseShiftTime(service === 'soir' ? window.end : window.start) ?? 0;
        const start = service === 'soir' ? (startAbs <= 0 ? 1440 : startAbs) - length * 60 : startAbs;
        const shift: Shift = {
          id: idOf(date, member.key, roleId, service, formatShiftTime(start)),
          staffKey: member.key, date, start: formatShiftTime(start),
          end: service === 'soir' ? window.end : formatShiftTime(start + length * 60),
          roleId, service, status: 'proposed',
        };
        if (!canAdd(member, shift)) return false;
        const revenue = dayRevenue(budgetOf(date));
        if (revenue < settings.minProductivity * (dayHours(date) + length)) return false;
        assigned.push(shift);
        remaining -= length;
        return true;
      }));
      if (!placed) break;
    }
    if (remaining >= MIN_TOP_UP_HOURS) {
      unmet.push({ date: weekDates[0], message: `${member.nom} : ${Math.round(remaining * 10) / 10} h de contrat non placées (compteur de période négatif en fin de période)` });
    }
  });

  // c) Jours restés sous la productivité minimum (avec les seuls minimums de personnel).
  weekDates.forEach(date => {
    const revenue = dayRevenue(budgetOf(date));
    const hours = dayHours(date);
    if (revenue > 0 && hours > 0 && revenue / hours < settings.minProductivity) {
      unmet.push({ date, message: `${date} : productivité de ${Math.round(revenue / hours)} €/h sous le minimum de ${settings.minProductivity} €/h` });
    }
  });

  return { shifts: assigned, unmet };
}
