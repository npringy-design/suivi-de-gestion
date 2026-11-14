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
import { chooseRestDays, type DayRoleNeed } from './shiftGeneratorRest';
import { isClosing, type PeriodInfo } from './shiftPeriod';
import {
  computeDayNeeds,
  continuousWindow,
  coverageCount,
  coversReference,
  coveredServices,
  MANAGER_ROLE_ID,
  referenceOf,
  serviceOfShift,
  SERVICES,
  spanOf,
  uncoveredParts,
  windowFor,
  type RoleNeed,
} from './shiftStaffing';
import { closingEndOf, templatesFor, WEEKDAY_NAMES } from './shiftTemplates';

// Moteur de génération d'une semaine (fonctions pures). Règles de base :
// besoin d'un rôle = ⌈couverts du service ÷ couverts par personne⌉, l'encadrement compte dans l'effectif salle,
// un shift couvre un service s'il est présent à son heure de référence, et les horaires viennent UNIQUEMENT des modèles.
// Priorités strictes : légal > heures de contrat (obligatoires) > effectif > productivité (objectif) > repos > équilibre.
// A besoins par jour · B repos décidés en premier · C objectifs d'heures · D remplissage jour par jour (encadrement,
// puis chaque rôle dans l'ordre des modèles) · E-learning · F heures de contrat · G contrôle légal final.

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

type Meta = { kind: 'need' | 'elearning' | 'topup'; order: number; date?: string; roleId?: string; template?: ShiftTemplate };

const TOP_UP_TOLERANCE_HOURS = 0.5;
const MIN_REMAINING_FOR_TOP_UP = 1.5;
const MIN_MANDATORY_SHORTFALL_HOURS = 0.5;
const MAX_FINAL_PASSES = 40;
const MAX_FILL_ROUNDS = 30;

const idOf = (date: string, staffKey: string, roleId: string, start: string, end: string): string =>
  `auto-${date}-${staffKey.replace(/\s+/g, '_')}-${roleId}-${start}-${end}`;

const overlaps = (a: Pick<Shift, 'start' | 'end'>, b: Pick<Shift, 'start' | 'end'>): boolean => {
  const [aStart, aEnd] = spanOf(a);
  const [bStart, bEnd] = spanOf(b);
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
  const roleLabelOf = (roleId: string) => settings.roles.find(role => role.id === roleId)?.label ?? roleId;

  // ── A. Besoins de chaque jour : ⌈couverts du service ÷ couverts par personne⌉ par rôle, 1 encadrant par service ouvert.
  const needsByDate = new Map<string, RoleNeed[]>(weekDates.map(date => [date, computeDayNeeds(settings, weekdayOf(date), budgetOf(date))]));
  const dayRoleNeeds: DayRoleNeed[] = weekDates.flatMap(date => {
    const byRole = new Map<string, number>();
    (needsByDate.get(date) ?? []).forEach(need => byRole.set(need.roleId, Math.max(byRole.get(need.roleId) ?? 0, need.need)));
    return [...byRole.entries()].map(([roleId, count]) => ({ date, roleId, count }));
  });
  const reportedTemplates = new Set<string>();
  const missingTemplate = (date: string, roleId: string) => {
    if (reportedTemplates.has(`${date}|${roleId}`)) return;
    reportedTemplates.add(`${date}|${roleId}`);
    unmet.push({ date, kind: 'modele', message: `${date} : aucun modèle ${roleLabelOf(roleId).toLowerCase()} le ${WEEKDAY_NAMES[weekdayOf(date)]}` });
  };

  // ── B. Repos décidés EN PREMIER : jours ensuite interdits (contrainte dure).
  const restResult = chooseRestDays({ weekDates, staff, absences, keptShifts: kept, needs: dayRoleNeeds, periodInfo });
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

  // Tout horaire proposé reprend exactement le début et la fin d'un modèle.
  const shiftOf = (member: ShiftStaffMember, date: string, template: ShiftTemplate, roleId: string): Shift => ({
    id: idOf(date, member.key, roleId, template.start, template.end),
    staffKey: member.key, date, start: template.start, end: template.end, roleId,
    service: serviceOfShift(template, settings), status: 'proposed',
  });

  // Le contrat passe avant l'effectif : pas d'affectation au-delà de l'objectif d'heures (un besoin laissé vide est repris en F).
  const withinContract = (member: ShiftStaffMember, shift: Shift): boolean =>
    member.forfaitJour || member.contractHours <= 0
    || hoursOf(member) + shiftDurationHours(shift.start, shift.end) <= targetOf(member) + TOP_UP_TOLERANCE_HOURS;

  const rankCandidate = (member: ShiftStaffMember, date: string, template: ShiftTemplate, roleId: string): number[] => {
    const info = periodInfo?.[member.key];
    const weekday = weekdayOf(date);
    const own = staffShifts(member);
    const weekendLoad = (weekday === 6 ? (info?.saturdays ?? 0) + own.filter(s => weekdayOf(s.date) === 6).length : 0)
      + (weekday === 0 ? (info?.sundays ?? 0) + own.filter(s => weekdayOf(s.date) === 0).length : 0);
    const closing = coveredServices(template, settings).includes('soir') && template.end === closingEndOf(settings, weekday);
    const closingLoad = closing ? (info?.closings ?? 0) + own.filter(s => isClosing(s, settings)).length : 0;
    return [
      member.roles.indexOf(roleId), // rang du rôle dans les préférences
      -Math.round((targetOf(member) - totalHours(own)) / 2), // plus grand écart objectif / heures (paliers de 2 h)
      weekendLoad,
      closingLoad,
    ];
  };
  const compareRanks = (a: number[], b: number[]): number => {
    for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return a[i] - b[i];
    return 0;
  };

  // Pose un shift de ce modèle pour le meilleur candidat disponible.
  const assignTemplate = (date: string, roleId: string, template: ShiftTemplate, excludeKey?: string): boolean => {
    const eligible = staff
      .filter(member => member.key !== excludeKey && member.roles.includes(roleId))
      .map(member => ({ member, shift: shiftOf(member, date, template, roleId) }))
      .filter(({ member, shift }) => withinContract(member, shift) && canAdd(member, shift));
    if (eligible.length === 0) return false;
    const best = eligible
      .map(entry => ({ ...entry, rank: rankCandidate(entry.member, date, template, roleId) }))
      .sort((a, b) => compareRanks(a.rank, b.rank) || a.member.nom.localeCompare(b.member.nom, 'fr'))[0];
    assigned.push(best.shift);
    order += 1;
    meta.set(best.shift.id, { kind: 'need', order, date, roleId, template });
    return true;
  };

  const needOf = (date: string, service: ShiftService, roleId: string) =>
    (needsByDate.get(date) ?? []).find(need => need.roleId === roleId && need.service === service)?.need ?? 0;
  const coverageOf = (date: string, service: ShiftService, roleId: string) => coverageCount(assigned, settings, date, service, roleId);

  // a) Encadrement : 1 présent à chaque heure de référence d'un service ouvert, sans interruption les jours en continu.
  const fillManager = (date: string) => {
    const weekday = weekdayOf(date);
    const services = SERVICES.filter(service => needOf(date, service, MANAGER_ROLE_ID) > 0);
    if (services.length === 0) return;
    const templates = templatesFor(settings.templates, MANAGER_ROLE_ID, weekday);
    if (templates.length === 0) { missingTemplate(date, MANAGER_ROLE_ID); return; }
    const continuous = continuousWindow(settings, weekday);
    const managerShifts = () => assigned.filter(shift => shift.date === date && shift.roleId === MANAGER_ROLE_ID);
    const gaps = (): Array<[number, number]> => {
      if (continuous) return uncoveredParts(managerShifts().map(spanOf), ...spanOf(continuous));
      return services
        .map(service => referenceOf(settings, service))
        .filter(reference => !managerShifts().some(shift => coversReference(shift, reference)))
        .map<[number, number]>(reference => [reference, reference]);
    };
    const contributes = (template: ShiftTemplate) => {
      const [start, end] = spanOf(template);
      return gaps().some(([from, to]) => (from === to ? start <= from && from <= end : Math.min(end, to) > Math.max(start, from)));
    };
    for (let round = 0; round < MAX_FILL_ROUNDS && gaps().length > 0; round += 1) {
      const next = templates.find(template => contributes(template) && assignTemplate(date, MANAGER_ROLE_ID, template));
      if (!next) break;
    }
  };

  // b) Un rôle : des shifts posés dans l'ordre des modèles (un par modèle utile et par tour) jusqu'à couvrir
  // le besoin du midi ET du soir ; un shift qui couvre les deux services compte pour les deux.
  const fillRole = (date: string, roleId: string) => {
    const services = SERVICES.filter(service => needOf(date, service, roleId) > 0);
    if (services.length === 0) return;
    const templates = templatesFor(settings.templates, roleId, weekdayOf(date));
    if (templates.length === 0) { missingTemplate(date, roleId); return; }
    const deficit = (service: ShiftService) => needOf(date, service, roleId) - coverageOf(date, service, roleId);
    for (let round = 0; round < MAX_FILL_ROUNDS; round += 1) {
      let placed = false;
      templates.forEach(template => {
        if (!coveredServices(template, settings).some(service => deficit(service) > 0)) return;
        if (assignTemplate(date, roleId, template)) placed = true;
      });
      if (!placed) break;
    }
  };

  // Jours les plus chargés d'abord : les collaborateurs rares vont là où il y a le plus de couverts.
  const covers = (date: string) => budgetOf(date).cvMidi + budgetOf(date).cvSoir;
  // L'encadrement de TOUTE la semaine est posé d'abord : ses heures ne doivent pas être consommées par des shifts salle.
  const busiestFirst = [...weekDates].sort((x, y) => covers(y) - covers(x) || x.localeCompare(y));
  busiestFirst.forEach(fillManager);
  busiestFirst.forEach(date => settings.staffingRules.forEach(rule => fillRole(date, rule.roleId)));

  // E-learning des apprentis : un jour de faible activité, jamais sur un repos.
  const placeElearning = (member: ShiftStaffMember): boolean => {
    const hours = settings.elearningHours;
    const days = weekDates
      .filter(date => isAvailable(member, date))
      .sort((a, b) => revenueOf(a) - revenueOf(b)
        || staffShifts(member).filter(s => s.date === a).length - staffShifts(member).filter(s => s.date === b).length);
    const make = (date: string, start: number, service: ShiftService): Shift => ({
      id: idOf(date, member.key, ELEARNING_ROLE_ID, formatShiftTime(start), formatShiftTime(start + hours * 60)),
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
      const startText = windowFor(settings, 'midi', weekdayOf(date))?.start;
      const start = startText ? parseShiftTime(startText) : null;
      return start !== null && !staffShifts(member).some(shift => shift.date === date) && place(make(date, start, 'midi'));
    });
  };

  if (settings.elearningHours > 0) {
    staff.filter(member => member.apprenti).forEach(member => {
      if (!placeElearning(member)) {
        unmet.push({ date: weekDates[0], kind: 'contrat', message: `${member.nom} : ${settings.elearningHours} h d'e-learning non placées` });
      }
    });
  }

  // ── E. Productivité = objectif, plus un blocage : aucun shift n'est retiré pour la remonter (un shift nécessaire
  // au contrat ne l'est jamais). Elle oriente seulement le choix des services en F et est signalée dans unmet.

  // ── F. Heures de contrat OBLIGATOIRES : le compteur de fin de période doit revenir à 0 (sans période : contrat de la semaine),
  // tant qu'il reste un jour non au repos et un modèle compatible. Les heures qui restent vont d'abord à un effectif manquant,
  // puis aux services où la productivité souffre le moins (couverts par personne présente les plus élevés, puis CA le plus élevé).
  const servicePeople = (date: string, service: ShiftService) => {
    const reference = referenceOf(settings, service);
    return assigned.filter(shift => shift.date === date && shift.roleId !== ELEARNING_ROLE_ID && coversReference(shift, reference)).length;
  };
  const serviceCovers = (date: string, service: ShiftService) => (service === 'midi' ? budgetOf(date).cvMidi : budgetOf(date).cvSoir);
  const serviceRevenue = (date: string, service: ShiftService) => (service === 'midi' ? budgetOf(date).caMidi : budgetOf(date).caSoir);

  type Slot = { date: string; hours: number; shift: Shift; services: ShiftService[]; coversNeed: boolean };

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
    // Écart final estimé après un reste donné : 0 si comblable exactement, sinon le plus petit dépassement (un déficit pèse double).
    const gapAfter = (restHours: number) => {
      if (canFill(restHours)) return 0;
      const overshoots = durations.map(minutes => minutes / 60).filter(hours => hours >= restHours).map(hours => hours - restHours);
      return overshoots.length > 0 ? Math.min(...overshoots) : Math.abs(restHours) * 2;
    };

    const slotsFor = (): Slot[] => {
      const slots: Slot[] = [];
      weekDates.filter(date => isAvailable(member, date)).forEach(date => roleIds.forEach(roleId => {
        templatesFor(settings.templates, roleId, weekdayOf(date)).forEach(template => {
          const shift = shiftOf(member, date, template, roleId);
          if (!canAdd(member, shift)) return;
          const services = coveredServices(template, settings);
          slots.push({
            date, shift, services, hours: shiftDurationHours(template.start, template.end),
            coversNeed: services.some(service => needOf(date, service, roleId) > coverageOf(date, service, roleId)),
          });
        });
      }));
      return slots;
    };
    const coversPerPerson = (slot: Slot) => Math.max(0, ...slot.services.map(service => serviceCovers(slot.date, service) / Math.max(1, servicePeople(slot.date, service))));
    const revenue = (slot: Slot) => slot.services.reduce((sum, service) => sum + serviceRevenue(slot.date, service), 0);
    const byImpact = (a: Slot, b: Slot) => Number(b.coversNeed) - Number(a.coversNeed) // d'abord un effectif manquant
      || coversPerPerson(b) - coversPerPerson(a)
      || revenue(b) - revenue(a)
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
    if (removedMeta?.kind === 'need' && removedMeta.date && removedMeta.roleId && removedMeta.template) {
      assignTemplate(removedMeta.date, removedMeta.roleId, removedMeta.template, removed.staffKey);
    }
  }

  // Effectif resté insuffisant : le contrat l'a emporté (heures déjà atteintes) ou personne n'est disponible.
  weekDates.forEach(date => {
    const weekday = weekdayOf(date);
    const continuous = continuousWindow(settings, weekday);
    (needsByDate.get(date) ?? []).forEach(need => {
      if (need.roleId === MANAGER_ROLE_ID) {
        const reference = referenceOf(settings, need.service);
        const present = assigned.some(shift => shift.date === date && shift.roleId === MANAGER_ROLE_ID && coversReference(shift, reference));
        if (!present && !continuous) unmet.push({ date, kind: 'besoin', message: `${date} ${need.service} : aucun encadrant présent à ${formatShiftTime(reference)}` });
        return;
      }
      const missing = need.need - coverageOf(date, need.service, need.roleId);
      if (missing > 0) {
        unmet.push({ date, kind: 'besoin', message: `${date} ${need.service} : ${missing} ${roleLabelOf(need.roleId).toLowerCase()} manquant (contrat atteint ou personne de disponible)` });
      }
    });
    if (continuous && (needsByDate.get(date) ?? []).some(need => need.roleId === MANAGER_ROLE_ID)) {
      const gaps = uncoveredParts(assigned.filter(shift => shift.date === date && shift.roleId === MANAGER_ROLE_ID).map(spanOf), ...spanOf(continuous));
      if (gaps.length > 0) unmet.push({ date, kind: 'besoin', message: `${date} : présence de l'encadrement non continue de ${continuous.start} à ${continuous.end}` });
    }
  });

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
        : `Productivité semaine ${productivity} €/h sous l'objectif de ${settings.minProductivity} €/h : effectif minimum seul`,
    });
  }

  return { shifts: assigned, unmet };
}
