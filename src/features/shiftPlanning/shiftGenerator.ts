import type {
  Shift,
  ShiftAbsence,
  ShiftPlanningSettings,
  ShiftService,
  ShiftStaffMember,
  ShiftTemplate,
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
import { chooseRestDays } from './shiftGeneratorRest';
import { isClosing, type PeriodInfo } from './shiftPeriod';
import { pickTemplate, templatesFor } from './shiftTemplates';

// Moteur de génération d'une semaine (fonctions pures), raisonnant d'abord sur la semaine entière.
// Priorités strictes : légal > minimums > productivité > heures de contrat lissées > repos > équilibre.
// A besoins → modèles · B repos décidés en premier · C objectifs d'heures · D affectation (le plus contraint d'abord)
// · E productivité · F complément d'heures · G contrôle légal final.

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

type Need = { demand: Demand; template: ShiftTemplate };
type Meta = { kind: 'need' | 'elearning' | 'topup'; need?: Need; order: number };

const TOP_UP_TOLERANCE_HOURS = 0.5;
const MIN_REMAINING_FOR_TOP_UP = 1.5;
const MAX_FINAL_PASSES = 40;

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

const round1 = (value: number) => Math.round(value * 10) / 10;

export function generateWeek(input: GenerateInput): GenerateResult {
  const { mondayIso, staff, absences, settings, budgetOf, periodInfo } = input;
  const weekDates = weekDaysIso(mondayIso);
  // Les shifts proposés sont régénérés ; les shifts validés et les absences sont des contraintes fixes.
  const kept = input.existingShifts.filter(shift => shift.status === 'validated');
  const assigned: Shift[] = [...kept];
  const unmet: ShiftUnmet[] = [];
  const meta = new Map<string, Meta>();
  let order = 0;

  const staffShifts = (member: ShiftStaffMember) => assigned.filter(shift => shift.staffKey === member.key);
  const hoursOf = (member: ShiftStaffMember) => totalHours(staffShifts(member));
  const weekdayOf = (date: string) => dateFromIso(date).getDay();
  const dayShifts = (date: string) => assigned.filter(shift => shift.date === date);
  const dayHours = (date: string) => productiveHours(dayShifts(date), settings.elearningInProductivity);
  const revenueOf = (date: string) => dayRevenue(budgetOf(date));
  const productivityOk = (date: string, extraHours: number) =>
    revenueOf(date) >= settings.minProductivity * (dayHours(date) + extraHours);

  // ── A. Besoins de la semaine, convertis en besoins de modèles (jamais d'horaire inventé).
  const demands = buildDemands(weekDates, settings, budgetOf, kept);
  const needs: Need[] = [];
  const reported = new Set<string>();
  demands.forEach(demand => {
    const weekday = weekdayOf(demand.date);
    const window = windowOf(settings, demand.service, weekday);
    if (!window) return;
    const pick = pickTemplate(demand, settings, window, weekday);
    if (pick.template) {
      needs.push({ demand, template: pick.template });
    } else if (!reported.has(`${demand.date}|${pick.reason}`)) {
      reported.add(`${demand.date}|${pick.reason}`);
      unmet.push({ date: demand.date, kind: 'modele', message: `${demand.date} : ${pick.reason}` });
    }
  });

  // ── B. Repos décidés EN PREMIER : jours ensuite interdits (contrainte dure).
  const restResult = chooseRestDays({ weekDates, staff, absences, keptShifts: kept, demands, periodInfo });
  unmet.push(...restResult.unmet);
  const isAvailable = (member: ShiftStaffMember, date: string) =>
    !findAbsence(absences, member.key, date) && !restResult.rest.get(member.key)?.has(date);

  // a) Règles légales toujours respectées (hors heures de contrat, traitées en F).
  const canAdd = (member: ShiftStaffMember, candidate: Shift): boolean => {
    if (!isAvailable(member, candidate.date)) return false;
    const own = staffShifts(member);
    if (own.some(shift => shift.date === candidate.date && overlaps(shift, candidate))) return false;
    return computeLegalAlerts([...own, candidate], [member], mondayIso, HARD_LEGAL_RULES).length === 0;
  };

  // ── C. Objectif d'heures de la semaine : contrat lissé sur la période, réparti sur les jours travaillables.
  const targetOf = (member: ShiftStaffMember): number => {
    if (member.forfaitJour || member.contractHours <= 0) return 0;
    const info = periodInfo?.[member.key];
    if (!info) return member.contractHours;
    return Math.max(0, member.contractHours - info.balance / info.weeksLeft);
  };
  const perDayTarget = (member: ShiftStaffMember): number => {
    const days = weekDates.filter(date => isAvailable(member, date)).length;
    return days > 0 ? targetOf(member) / days : 0;
  };

  const shiftOf = (member: ShiftStaffMember, date: string, template: ShiftTemplate, roleId: string, service: ShiftService): Shift => ({
    id: idOf(date, member.key, roleId, service, template.start),
    staffKey: member.key, date, start: template.start, end: template.end, roleId, service, status: 'proposed',
  });

  // ── D. Affectation sur la semaine entière : les besoins les plus contraints d'abord.
  const rankCandidate = (member: ShiftStaffMember, demand: Demand): number[] => {
    const info = periodInfo?.[member.key];
    const weekday = weekdayOf(demand.date);
    const own = staffShifts(member);
    const weekendLoad = (weekday === 6 ? (info?.saturdays ?? 0) + own.filter(s => weekdayOf(s.date) === 6).length : 0)
      + (weekday === 0 ? (info?.sundays ?? 0) + own.filter(s => weekdayOf(s.date) === 0).length : 0);
    const closingLoad = demand.closing ? (info?.closings ?? 0) + own.filter(s => isClosing(s, settings)).length : 0;
    return [
      member.roles.indexOf(demand.roleId), // rang du rôle dans les préférences
      -Math.round((targetOf(member) - totalHours(own)) / 2), // plus grand écart objectif / heures (paliers de 2 h)
      weekendLoad,
      closingLoad,
    ];
  };
  const compareRanks = (a: number[], b: number[]): number => {
    for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return a[i] - b[i];
    return 0;
  };

  const assignNeed = (need: Need, excludeKey?: string): boolean => {
    const { demand, template } = need;
    const eligible = staff
      .filter(member => member.key !== excludeKey && member.roles.includes(demand.roleId))
      .map(member => ({ member, shift: shiftOf(member, demand.date, template, demand.roleId, demand.service) }))
      .filter(({ member, shift }) => canAdd(member, shift));
    if (eligible.length === 0) return false;
    const best = eligible
      .map(entry => ({ ...entry, rank: rankCandidate(entry.member, demand) }))
      .sort((a, b) => compareRanks(a.rank, b.rank) || a.member.nom.localeCompare(b.member.nom, 'fr'))[0];
    assigned.push(best.shift);
    order += 1;
    meta.set(best.shift.id, { kind: 'need', need, order });
    return true;
  };

  const pending = [...needs];
  while (pending.length > 0) {
    const scored = pending.map((need, index) => ({
      index,
      need,
      count: staff.filter(member => member.roles.includes(need.demand.roleId) && isAvailable(member, need.demand.date)
        && !staffShifts(member).some(shift => shift.date === need.demand.date && shift.service === need.demand.service)).length,
    }));
    scored.sort((a, b) => a.count - b.count || a.need.demand.rank - b.need.demand.rank || a.need.demand.date.localeCompare(b.need.demand.date));
    const [next] = scored;
    pending.splice(next.index, 1);
    if (!assignNeed(next.need)) {
      const { demand, template } = next.need;
      unmet.push({ date: demand.date, kind: 'besoin', message: `${demand.date} ${demand.service} : aucun ${demand.roleId} disponible (${template.start} – ${template.end})` });
    }
  }

  // E-learning des apprentis : un jour de faible activité, jamais sur un repos.
  const placeElearning = (member: ShiftStaffMember, dayOk: (date: string) => boolean): boolean => {
    const hours = settings.elearningHours;
    const days = weekDates
      .filter(date => isAvailable(member, date) && dayOk(date))
      .sort((a, b) => revenueOf(a) - revenueOf(b)
        || staffShifts(member).filter(s => s.date === a).length - staffShifts(member).filter(s => s.date === b).length);
    const make = (date: string, start: number, service: ShiftService): Shift => ({
      id: idOf(date, member.key, ELEARNING_ROLE_ID, service, formatShiftTime(start)),
      staffKey: member.key, date, start: formatShiftTime(start), end: formatShiftTime(start + hours * 60),
      roleId: ELEARNING_ROLE_ID, service, status: 'proposed',
    });
    const place = (shift: Shift) => {
      if (!canAdd(member, shift)) return false;
      assigned.push(shift);
      order += 1;
      meta.set(shift.id, { kind: 'elearning', order });
      return true;
    };
    const before = days.some(date => {
      const own = staffShifts(member).filter(shift => shift.date === date);
      const start = own.length === 1 ? parseShiftTime(own[0].start) : null;
      return start !== null && start - hours * 60 >= 0 && place(make(date, start - hours * 60, own[0].service));
    });
    if (before) return true;
    return days.some(date => {
      const startText = windowOf(settings, 'midi', weekdayOf(date))?.start;
      const start = startText ? parseShiftTime(startText) : null;
      return start !== null && !staffShifts(member).some(shift => shift.date === date) && place(make(date, start, 'midi'));
    });
  };

  if (settings.elearningHours > 0) {
    staff.filter(member => member.apprenti).forEach(member => {
      if (!placeElearning(member, () => true)) {
        unmet.push({ date: weekDates[0], kind: 'contrat', message: `${member.nom} : ${settings.elearningHours} h d'e-learning non placées` });
      }
    });
  }

  // ── E. Productivité : un jour sous le minimum perd d'abord les shifts proposés au-delà des minimums
  // (e-learning relogé ailleurs, puis excédent d'un rôle, en commençant par qui est au-dessus de son objectif).
  const underTarget = (date: string) => revenueOf(date) > 0 && dayHours(date) > 0 && revenueOf(date) / dayHours(date) < settings.minProductivity;
  const surplusOf = (key: string) => {
    const member = staff.find(candidate => candidate.key === key);
    return member ? hoursOf(member) - targetOf(member) : 0;
  };
  weekDates.filter(underTarget).forEach(date => {
    dayShifts(date).filter(shift => meta.get(shift.id)?.kind === 'elearning').forEach(shift => {
      const member = staff.find(candidate => candidate.key === shift.staffKey);
      if (!member || !settings.elearningInProductivity) return;
      assigned.splice(assigned.indexOf(shift), 1);
      meta.delete(shift.id);
      if (!placeElearning(member, other => other !== date && productivityOk(other, settings.elearningHours))) {
        unmet.push({ date, kind: 'productivite', message: `${date} : e-learning de ${member.nom} retiré (productivité sous le minimum), non replacé` });
      }
    });
    SERVICES.forEach(service => [...new Set(dayShifts(date).map(shift => shift.roleId))].forEach(roleId => {
      const required = needs.filter(n => n.demand.date === date && n.demand.service === service && n.demand.roleId === roleId).length;
      const excess = dayShifts(date)
        .filter(shift => shift.service === service && shift.roleId === roleId && meta.get(shift.id)?.kind === 'need')
        .sort((a, b) => surplusOf(b.staffKey) - surplusOf(a.staffKey));
      excess.slice(0, Math.max(0, excess.length - required)).forEach(shift => {
        assigned.splice(assigned.indexOf(shift), 1);
        meta.delete(shift.id);
      });
    }));
  });

  // ── F. Complément d'heures de contrat : modèles uniquement, jours non au repos uniquement, productivité du jour préservée,
  // jours à plus grande marge d'abord ; une seule coupure par jour et amplitude de 13 h (via canAdd).
  staff.filter(member => !member.forfaitJour && member.contractHours > 0).forEach(member => {
    const roleIds = member.roles.filter(id => id !== ELEARNING_ROLE_ID);
    if (roleIds.length === 0) return;
    let remaining = targetOf(member) - hoursOf(member);
    const share = perDayTarget(member);
    const margin = (date: string) => revenueOf(date) - settings.minProductivity * dayHours(date);

    const tryPlace = (respectDailyShare: boolean): boolean => {
      const days = weekDates.filter(date => isAvailable(member, date)).sort((a, b) => margin(b) - margin(a));
      return days.some(date => {
        if (respectDailyShare && totalHours(staffShifts(member).filter(shift => shift.date === date)) >= share) return false;
        return roleIds.some(roleId => SERVICES.some(service => templatesFor(settings.templates, roleId, service, weekdayOf(date))
          .filter(template => shiftDurationHours(template.start, template.end) <= remaining + TOP_UP_TOLERANCE_HOURS)
          .sort((a, b) => shiftDurationHours(b.start, b.end) - shiftDurationHours(a.start, a.end))
          .some(template => {
            const length = shiftDurationHours(template.start, template.end);
            const shift = shiftOf(member, date, template, roleId, service);
            if (!productivityOk(date, length) || !canAdd(member, shift)) return false;
            assigned.push(shift);
            order += 1;
            meta.set(shift.id, { kind: 'topup', order });
            remaining -= length;
            return true;
          })));
      });
    };

    while (remaining >= MIN_REMAINING_FOR_TOP_UP && (tryPlace(true) || tryPlace(false))) {
      // un modèle placé par tour
    }

    const info = periodInfo?.[member.key];
    if (info && info.weeksLeft === 1) {
      // Dernière semaine à planifier de la période : le compteur de fin de période doit revenir à 0.
      const endCounter = info.balance + hoursOf(member) - member.contractHours;
      if (Math.abs(endCounter) >= 1) {
        unmet.push({ date: weekDates[0], kind: 'contrat', message: `${member.nom} : compteur de fin de période impossible à remettre à 0 (${endCounter > 0 ? '+' : '−'}${Math.abs(round1(endCounter))} h)` });
      }
    } else if (remaining >= MIN_REMAINING_FOR_TOP_UP) {
      unmet.push({ date: weekDates[0], kind: 'contrat', message: `${member.nom} : ${round1(remaining)} h de contrat non placées sur la semaine` });
    }
  });

  // ── G. Contrôle légal final : tout shift proposé en infraction est retiré, puis son besoin est reproposé à un autre.
  const removalPriority = (shift: Shift) => ({ topup: 0, elearning: 1, need: 2 })[meta.get(shift.id)?.kind ?? 'need'];
  for (let pass = 0; pass < MAX_FINAL_PASSES; pass += 1) {
    const alerts = computeLegalAlerts(assigned, staff, mondayIso, HARD_LEGAL_RULES);
    const culprits = assigned.filter(shift => meta.has(shift.id) && alerts.some(alert => alert.shiftIds.includes(shift.id)));
    if (culprits.length === 0) break;
    culprits.sort((a, b) => removalPriority(a) - removalPriority(b) || (meta.get(b.id)?.order ?? 0) - (meta.get(a.id)?.order ?? 0));
    const removed = culprits[0];
    const removedMeta = meta.get(removed.id);
    assigned.splice(assigned.indexOf(removed), 1);
    meta.delete(removed.id);
    if (removedMeta?.kind === 'need' && removedMeta.need && !assignNeed(removedMeta.need, removed.staffKey)) {
      const { demand } = removedMeta.need;
      unmet.push({ date: demand.date, kind: 'besoin', message: `${demand.date} ${demand.service} : aucun ${demand.roleId} disponible après contrôle légal` });
    }
  }

  // Jours restés sous la productivité minimum avec les seuls minimums de personnel.
  weekDates.filter(underTarget).forEach(date => {
    unmet.push({ date, kind: 'productivite', message: `${date} : productivité de ${Math.round(revenueOf(date) / dayHours(date))} €/h sous le minimum de ${settings.minProductivity} €/h` });
  });

  return { shifts: assigned, unmet };
}
