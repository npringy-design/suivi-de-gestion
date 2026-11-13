import type { Shift, ShiftAbsence, ShiftStaffMember, ShiftUnmet } from '@/types/dataTypes';

import { ELEARNING_ROLE_ID, findAbsence } from './shiftCalculations';
import { dateFromIso } from './shiftDates';
import type { Demand } from './shiftGeneratorDemands';
import type { PeriodInfo } from './shiftPeriod';

// Phase B du moteur : les repos de la semaine sont décidés EN PREMIER, collaborateur par collaborateur,
// avant toute affectation. Les jours retenus sont ensuite interdits (contrainte dure).

const PREFERRED_WEIGHT = 100;
const VIOLATION_WEIGHT = 200;
const OK_WEIGHT = 20;
const CONSECUTIVE_BONUS = 30;
const WEEKEND_WEIGHT = 10;

export type RestInput = {
  weekDates: string[];
  staff: ShiftStaffMember[];
  absences: ShiftAbsence[];
  keptShifts: Shift[]; // shifts validés : jours travaillés, contraintes fixes
  demands: Demand[];
  periodInfo: Record<string, PeriodInfo> | null;
};

export type RestResult = { rest: Map<string, Set<string>>; unmet: ShiftUnmet[] };

type Option = { days: string[]; consecutive: boolean };

const presenceRoles = (member: ShiftStaffMember) => member.roles.filter(id => id !== ELEARNING_ROLE_ID);

export function chooseRestDays({ weekDates, staff, absences, keptShifts, demands, periodInfo }: RestInput): RestResult {
  const rest = new Map<string, Set<string>>();
  const unmet: ShiftUnmet[] = [];
  const active = staff.filter(member => presenceRoles(member).length > 0);

  // Besoin de présence par jour et rôle : un même collaborateur peut tenir midi et soir, donc max des deux services.
  const needBy = new Map<string, number>();
  const perService = new Map<string, number>();
  demands.forEach(d => perService.set(`${d.date}|${d.roleId}|${d.service}`, (perService.get(`${d.date}|${d.roleId}|${d.service}`) ?? 0) + 1));
  perService.forEach((count, key) => {
    const [date, roleId] = key.split('|');
    needBy.set(`${date}|${roleId}`, Math.max(needBy.get(`${date}|${roleId}`) ?? 0, count));
  });

  // Capacité restante : collaborateurs disponibles (ni absents, ni déjà au repos) par jour et rôle.
  const capacity = new Map<string, number>();
  weekDates.forEach(date => active.forEach(member => {
    if (findAbsence(absences, member.key, date)) return;
    presenceRoles(member).forEach(roleId => capacity.set(`${date}|${roleId}`, (capacity.get(`${date}|${roleId}`) ?? 0) + 1));
  }));

  const weekendLoadOf = (member: ShiftStaffMember) => (periodInfo?.[member.key]?.saturdays ?? 0) + (periodInfo?.[member.key]?.sundays ?? 0);
  const averageWeekendLoad = (member: ShiftStaffMember) => {
    const peers = active.filter(other => other.roles[0] === member.roles[0]);
    return peers.reduce((sum, peer) => sum + weekendLoadOf(peer), 0) / Math.max(1, peers.length);
  };

  const absenceDaysOf = (member: ShiftStaffMember) => weekDates.filter(date => findAbsence(absences, member.key, date));
  // Le moins flexible d'abord : le moins de rôles, puis le plus d'absences.
  const ordered = [...active].sort((a, b) =>
    presenceRoles(a).length - presenceRoles(b).length
    || absenceDaysOf(b).length - absenceDaysOf(a).length
    || a.nom.localeCompare(b.nom, 'fr'));

  ordered.forEach(member => {
    const absenceDays = absenceDaysOf(member);
    const needed = Math.max(0, 2 - absenceDays.length);
    if (needed === 0) return; // les absences tiennent déjà lieu de repos

    const worked = new Set(keptShifts.filter(shift => shift.staffKey === member.key).map(shift => shift.date));
    const free = weekDates.filter(date => !absenceDays.includes(date) && !worked.has(date));
    const isAdjacent = (a: string, b: string) => Math.abs(weekDates.indexOf(a) - weekDates.indexOf(b)) === 1;

    const consecutive: Option[] = [];
    const scattered: Option[] = [];
    if (needed === 2) {
      free.forEach((a, i) => free.slice(i + 1).forEach(b => (isAdjacent(a, b) ? consecutive : scattered).push({ days: [a, b], consecutive: isAdjacent(a, b) })));
    } else {
      free.forEach(day => (absenceDays.some(abs => isAdjacent(abs, day)) ? consecutive : scattered).push({ days: [day], consecutive: absenceDays.some(abs => isAdjacent(abs, day)) }));
    }
    if (consecutive.length === 0 && scattered.length === 0) return;

    const roles = presenceRoles(member);
    const average = averageWeekendLoad(member);
    const evaluate = (option: Option) => {
      let violations = 0;
      let oks = 0;
      option.days.forEach(day => roles.forEach(roleId => {
        const remaining = (capacity.get(`${day}|${roleId}`) ?? 0) - 1;
        if (remaining < (needBy.get(`${day}|${roleId}`) ?? 0)) violations += 1; else oks += 1;
      }));
      const preferred = option.days.filter(day => member.preferredRestDays.includes(dateFromIso(day).getDay())).length;
      const weekend = option.days.filter(day => [0, 6].includes(dateFromIso(day).getDay())).length;
      const score = preferred * PREFERRED_WEIGHT - violations * VIOLATION_WEIGHT + oks * OK_WEIGHT
        + (option.consecutive ? CONSECUTIVE_BONUS : 0) + weekend * (weekendLoadOf(member) - average) * WEEKEND_WEIGHT;
      return { option, violations, score };
    };
    const best = (options: Option[]) => options.map(evaluate).sort((a, b) => b.score - a.score);

    const consecutiveOk = best(consecutive).filter(entry => entry.violations === 0)[0];
    const scatteredOk = best(scattered).filter(entry => entry.violations === 0)[0];
    let chosen = consecutiveOk;
    if (!chosen && scatteredOk) {
      chosen = scatteredOk;
      unmet.push({ date: weekDates[0], kind: 'repos', message: `repos non consécutifs pour ${member.nom} (la capacité du jour ne permet pas deux jours de suite)` });
    }
    if (!chosen) {
      chosen = best([...consecutive, ...scattered])[0];
      unmet.push({ date: weekDates[0], kind: 'repos', message: `capacité insuffisante pour poser les repos de ${member.nom} sans manquer de personnel` });
    }

    rest.set(member.key, new Set(chosen.option.days));
    chosen.option.days.forEach(day => roles.forEach(roleId => capacity.set(`${day}|${roleId}`, (capacity.get(`${day}|${roleId}`) ?? 0) - 1)));
  });

  return { rest, unmet };
}

export type RestSummary = {
  days: string[]; // jours de repos effectifs (sans shift ni absence)
  consecutive: boolean;
  onPreferred: boolean; // au moins un jour de repos préféré obtenu (vrai si aucune préférence)
};

// Repos effectifs d'un collaborateur sur la semaine, pour l'affichage (null s'il n'a aucun shift).
export function restSummary(
  member: ShiftStaffMember,
  shifts: Shift[],
  absences: ShiftAbsence[],
  weekDates: string[],
): RestSummary | null {
  const own = shifts.filter(shift => shift.staffKey === member.key);
  if (own.length === 0) return null;
  const noWork = weekDates.filter(date => !own.some(shift => shift.date === date));
  const days = noWork.filter(date => !findAbsence(absences, member.key, date));
  const consecutive = noWork.some((date, index) => noWork.some((other, otherIndex) => otherIndex > index && Math.abs(weekDates.indexOf(other) - weekDates.indexOf(date)) === 1));
  const onPreferred = member.preferredRestDays.length === 0 || noWork.some(date => member.preferredRestDays.includes(dateFromIso(date).getDay()));
  return { days, consecutive, onPreferred };
}
