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
import { pickTemplate, templatesFor, WEEKDAY_NAMES } from './shiftTemplates';

// Moteur de génération d'une semaine (fonctions pures), raisonnant d'abord sur la semaine entière.
// Priorités strictes : légal > heures de contrat (obligatoires) > minimums de personnel > productivité (objectif) > repos > équilibre.
// A besoins → modèles · B repos décidés en premier · C objectifs d'heures · D affectation (le plus contraint d'abord)
// · E productivité (objectif) · F heures de contrat obligatoires · G contrôle légal final.

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
const MIN_MANDATORY_SHORTFALL_HOURS = 0.5;
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
  const revenueOf = (date: string) => dayRevenue(budgetOf(date));

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

  // ── C. Objectif d'heures de la semaine : contrat lissé sur la période de paie.
  const targetOf = (member: ShiftStaffMember): number => {
    if (member.forfaitJour || member.contractHours <= 0) return 0;
    const info = periodInfo?.[member.key];
    if (!info) return member.contractHours;
    return Math.max(0, member.contractHours - info.balance / info.weeksLeft);
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

  // Le contrat passe avant les minimums : un collaborateur n'est pas affecté au-delà de son objectif d'heures
  // (un besoin resté sans personne est repris en F avec les heures de contrat, sinon signalé).
  const withinContract = (member: ShiftStaffMember, shift: Shift): boolean =>
    member.forfaitJour || member.contractHours <= 0
    || hoursOf(member) + shiftDurationHours(shift.start, shift.end) <= targetOf(member) + TOP_UP_TOLERANCE_HOURS;

  const assignNeed = (need: Need, excludeKey?: string): boolean => {
    const { demand, template } = need;
    const eligible = staff
      .filter(member => member.key !== excludeKey && member.roles.includes(demand.roleId))
      .map(member => ({ member, shift: shiftOf(member, demand.date, template, demand.roleId, demand.service) }))
      .filter(({ member, shift }) => withinContract(member, shift) && canAdd(member, shift));
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
    assignNeed(next.need); // un échec est repris en F (heures de contrat) puis signalé s'il reste non couvert
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

  // ── E. Productivité = objectif, plus un blocage : aucun shift n'est retiré pour la remonter (un shift nécessaire
  // au contrat ne l'est jamais). Elle oriente seulement le choix des services en F et est signalée dans unmet.

  // ── F. Heures de contrat OBLIGATOIRES : le compteur de fin de période doit revenir à 0 (sans période : contrat de la semaine),
  // tant qu'il reste un jour non au repos et un modèle compatible. Les heures qui restent après les minimums vont d'abord
  // aux services où la productivité souffre le moins (couverts par personne présente les plus élevés, puis CA le plus élevé).
  // Le maximum des garde-fous est un plafond souhaité : dépassable uniquement ici, et signalé.
  const guardMaxOf = (roleId: string, service: ShiftService): number => {
    const rules = settings.guardRules.filter(rule => rule.roleId === roleId && (rule.service === 'both' || rule.service === service));
    return rules.length > 0 ? Math.max(...rules.map(rule => rule.max)) : Number.POSITIVE_INFINITY;
  };
  const presentCount = (date: string, service: ShiftService, roleId: string) =>
    assigned.filter(shift => shift.date === date && shift.service === service && shift.roleId === roleId).length;
  const servicePeople = (date: string, service: ShiftService) =>
    assigned.filter(shift => shift.date === date && shift.service === service && shift.roleId !== ELEARNING_ROLE_ID).length;
  const serviceCovers = (date: string, service: ShiftService) => (service === 'midi' ? budgetOf(date).cvMidi : budgetOf(date).cvSoir);
  const serviceRevenue = (date: string, service: ShiftService) => (service === 'midi' ? budgetOf(date).caMidi : budgetOf(date).caSoir);
  const exceeded = new Map<string, { date: string; service: ShiftService; roleId: string }>();

  type Slot = { date: string; service: ShiftService; roleId: string; hours: number; shift: Shift; overMax: boolean; coversNeed: boolean };
  const requiredBy = new Map<string, number>();
  const requiredKey = (date: string, service: ShiftService, roleId: string) => `${date}|${service}|${roleId}`;
  needs.forEach(({ demand }) => requiredBy.set(requiredKey(demand.date, demand.service, demand.roleId), (requiredBy.get(requiredKey(demand.date, demand.service, demand.roleId)) ?? 0) + 1));
  kept.forEach(shift => requiredBy.set(requiredKey(shift.date, shift.service, shift.roleId), (requiredBy.get(requiredKey(shift.date, shift.service, shift.roleId)) ?? 0) + 1));

  staff.filter(member => !member.forfaitJour && member.contractHours > 0).forEach(member => {
    const roleIds = member.roles.filter(id => id !== ELEARNING_ROLE_ID);
    if (roleIds.length === 0) return;
    const info = periodInfo?.[member.key];
    const mandatory = !info || info.weeksLeft === 1; // dernière semaine à planifier : le compteur doit tomber à 0
    const targetMinutes = Math.round(targetOf(member) * 60);
    let remaining = targetOf(member) - hoursOf(member);

    // Durées réalisables avec les modèles du collaborateur : sert à viser un compte exact (sac à dos en minutes).
    const durations = [...new Set(settings.templates
      .filter(template => roleIds.includes(template.roleId))
      .map(template => Math.round(shiftDurationHours(template.start, template.end) * 60)))].filter(minutes => minutes > 0);
    const reach: boolean[] = Array.from({ length: Math.max(0, targetMinutes) + 1 }, (_, minutes) => minutes === 0);
    for (let minutes = 1; minutes < reach.length; minutes += 1) reach[minutes] = durations.some(duration => minutes >= duration && reach[minutes - duration]);
    const canFill = (restHours: number) => {
      const minutes = Math.round(restHours * 60);
      return minutes <= 1 || (minutes < reach.length && reach[minutes]);
    };

    // Écart final estimé si l'on s'arrête après un reste donné : 0 si les modèles permettent de le combler exactement,
    // sinon le plus petit dépassement possible avec un modèle de plus (un déficit pèse double).
    const gapAfter = (restHours: number) => {
      if (canFill(restHours)) return 0;
      const overshoots = durations.map(minutes => minutes / 60).filter(hours => hours >= restHours).map(hours => hours - restHours);
      return overshoots.length > 0 ? Math.min(...overshoots) : Math.abs(restHours) * 2;
    };

    const slotsFor = (): Slot[] => {
      const slots: Slot[] = [];
      weekDates.filter(date => isAvailable(member, date)).forEach(date => roleIds.forEach(roleId => SERVICES.forEach(service => {
        templatesFor(settings.templates, roleId, service, weekdayOf(date)).forEach(template => {
          const shift = shiftOf(member, date, template, roleId, service);
          if (!canAdd(member, shift)) return;
          slots.push({ date, service, roleId, hours: shiftDurationHours(template.start, template.end), shift, overMax: presentCount(date, service, roleId) >= guardMaxOf(roleId, service), coversNeed: presentCount(date, service, roleId) < (requiredBy.get(requiredKey(date, service, roleId)) ?? 0) });
        });
      })));
      return slots;
    };
    const coversPerPerson = (slot: Slot) => serviceCovers(slot.date, slot.service) / Math.max(1, servicePeople(slot.date, slot.service));
    const byImpact = (a: Slot, b: Slot) => Number(b.coversNeed) - Number(a.coversNeed) // d'abord un minimum de personnel manquant
      || Number(a.overMax) - Number(b.overMax)
      || coversPerPerson(b) - coversPerPerson(a)
      || serviceRevenue(b.date, b.service) - serviceRevenue(a.date, a.service)
      || b.hours - a.hours;

    while (remaining > (mandatory ? 0.25 : MIN_REMAINING_FOR_TOP_UP - 0.01)) {
      const slots = slotsFor();
      if (slots.length === 0) break;
      const fitting = slots.filter(slot => slot.hours <= remaining + TOP_UP_TOLERANCE_HOURS);
      // Parmi les modèles qui tiennent, on garde ceux qui laissent le plus petit écart final au contrat.
      const lowestGap = Math.min(...fitting.map(slot => gapAfter(remaining - slot.hours)));
      let pool = fitting.filter(slot => gapAfter(remaining - slot.hours) <= lowestGap + 1e-6);
      // Aucun modèle ne tient dans le reste : sur une semaine obligatoire, on prend le plus court plutôt que de finir
      // sous le contrat (compteur négatif = régularisation de paie) ; le dépassement éventuel est signalé dans unmet.
      if (pool.length === 0 && mandatory && remaining >= MIN_MANDATORY_SHORTFALL_HOURS) {
        const shortest = Math.min(...slots.map(slot => slot.hours));
        pool = slots.filter(slot => slot.hours === shortest);
      }
      if (pool.length === 0) break;
      const best = [...pool].sort(byImpact)[0];
      assigned.push(best.shift);
      order += 1;
      meta.set(best.shift.id, { kind: 'topup', order });
      remaining -= best.hours;
      if (best.overMax) exceeded.set(`${best.date}|${best.service}|${best.roleId}`, { date: best.date, service: best.service, roleId: best.roleId });
    }

    if (mandatory) {
      const endCounter = (info?.balance ?? 0) + hoursOf(member) - member.contractHours;
      if (Math.abs(endCounter) >= 0.25) {
        unmet.push({ date: weekDates[0], kind: 'contrat', message: `${member.nom} : compteur de ${info ? 'fin de période' : 'la semaine'} à ${endCounter > 0 ? '+' : '−'}${Math.abs(round1(endCounter))} h au lieu de 0` });
      }
    } else if (remaining >= MIN_REMAINING_FOR_TOP_UP) {
      unmet.push({ date: weekDates[0], kind: 'contrat', message: `${member.nom} : ${round1(remaining)} h de contrat non placées sur la semaine` });
    }
  });

  // Minimums restés non couverts : le contrat l'a emporté (heures déjà atteintes) ou personne n'est disponible.
  requiredBy.forEach((required, key) => {
    const [date, service, roleId] = key.split('|');
    const present = assigned.filter(shift => shift.date === date && shift.service === service && shift.roleId === roleId).length;
    if (present >= required) return;
    const roleLabel = settings.roles.find(role => role.id === roleId)?.label ?? roleId;
    unmet.push({ date, kind: 'besoin', message: `${date} ${service} : ${required - present} ${roleLabel.toLowerCase()} manquant (contrat atteint ou personne de disponible)` });
  });

  exceeded.forEach(({ date, service, roleId }) => {
    const present = presentCount(date, service, roleId);
    const max = guardMaxOf(roleId, service);
    if (present <= max) return;
    const roleLabel = settings.roles.find(role => role.id === roleId)?.label ?? roleId;
    unmet.push({ date, kind: 'contrat', message: `${roleLabel} ${WEEKDAY_NAMES[weekdayOf(date)]} ${service} : ${present} présents pour un maximum de ${max}, heures de contrat à placer` });
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

  // Productivité de la semaine : objectif, signalé s'il n'est pas tenu.
  const weekRevenue = weekDates.reduce((sum, date) => sum + revenueOf(date), 0);
  const weekHours = productiveHours(assigned, settings.elearningInProductivity);
  if (weekRevenue > 0 && weekHours > 0 && weekRevenue / weekHours < settings.minProductivity) {
    const extra = assigned.filter(shift => meta.get(shift.id)?.kind === 'topup').reduce((sum, shift) => sum + shiftDurationHours(shift.start, shift.end), 0);
    const productivity = Math.round(weekRevenue / weekHours);
    unmet.push({
      date: weekDates[0],
      kind: 'productivite',
      message: extra > 0
        ? `Productivité semaine ${productivity} €/h sous l'objectif de ${settings.minProductivity} €/h : ${round1(extra)} h de contrat au-delà du besoin`
        : `Productivité semaine ${productivity} €/h sous l'objectif de ${settings.minProductivity} €/h : minimums de personnel seuls`,
    });
  }

  return { shifts: assigned, unmet };
}
