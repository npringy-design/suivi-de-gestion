import type {
  Shift,
  ShiftAbsence,
  ShiftPlanningSettings,
  ShiftPosition,
  ShiftStaffMember,
  ShiftUnmet,
} from '@/types/dataTypes';

import {
  computeLegalAlerts,
  dayRevenue,
  ELEARNING_ROLE_ID,
  findAbsence,
  HARD_LEGAL_RULES,
  inferShiftService,
  productiveHours,
  shiftDurationHours,
  totalHours,
  type DayBudget,
} from './shiftCalculations';
import { dateFromIso, weekDaysIso } from './shiftDates';
import { chooseRestDays, type DayRoleNeed } from './shiftGeneratorRest';
import { isClosing, type PeriodInfo } from './shiftPeriod';
import { dayPositions, othersShapeOf, shapesForDay } from './shiftShapes';
import { openServices, spanOf } from './shiftStaffing';

// Moteur de génération d'une semaine (fonctions pures). Les horaires viennent UNIQUEMENT de shiftShapes.ts
// (et des créneaux d'e-learning des paramètres). Priorités : légal > heures de contrat (obligatoires) > effectif > repos > équilibre.
// A repos décidés en premier · B besoins (couverts ÷ ratio) et formes de shifts · C affectation par contraintes
// (le poste qui a le moins de candidats d'abord) · D heures de contrat (renforts « autres ») · E e-learning · F contrôle légal final.

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

type Meta = { kind: 'need' | 'elearning' | 'topup'; order: number; position?: ShiftPosition };
type Candidate = { member: ShiftStaffMember; shift: Shift };

const TOP_UP_TOLERANCE_HOURS = 0.5;
const MIN_REMAINING_FOR_TOP_UP = 1.5;
const MIN_MANDATORY_SHORTFALL_HOURS = 0.5;
const MAX_FINAL_PASSES = 40;

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
  const roleLabelOf = (roleId: string) => settings.roles.find(role => role.id === roleId)?.label ?? roleId;

  // ── A. Postes à pourvoir (besoins seuls) : couverts ÷ ratio par rôle, formes de shiftShapes ; un shift validé tient lieu de poste.
  const positionsByDate = new Map<string, ShiftPosition[]>(weekDates.map(date => [date, dayPositions(settings, date, weekdayOf(date), budgetOf(date))]));
  const pending: ShiftPosition[] = [];
  const covers = (date: string) => budgetOf(date).cvMidi + budgetOf(date).cvSoir;
  // Jours les plus chargés d'abord : les collaborateurs rares vont là où il y a le plus de couverts.
  const busiestFirst = [...weekDates].sort((x, y) => covers(y) - covers(x) || x.localeCompare(y));
  busiestFirst.forEach(date => {
    const free = [...(positionsByDate.get(date) ?? [])];
    kept.filter(shift => shift.date === date).forEach(shift => {
      const index = free.findIndex(position => position.roleId === shift.roleId && overlaps(position, shift));
      if (index >= 0) free.splice(index, 1);
    });
    pending.push(...free);
  });

  const dayRoleNeeds: DayRoleNeed[] = weekDates.flatMap(date => {
    const perServiceRole = new Map<string, number>();
    (positionsByDate.get(date) ?? []).forEach(position => {
      const key = `${position.service}|${position.roleId}`;
      perServiceRole.set(key, (perServiceRole.get(key) ?? 0) + 1);
    });
    const byRole = new Map<string, number>();
    perServiceRole.forEach((count, key) => {
      const roleId = key.split('|')[1];
      byRole.set(roleId, Math.max(byRole.get(roleId) ?? 0, count));
    });
    return [...byRole.entries()].map(([roleId, count]) => ({ date, roleId, count }));
  });

  // ── B. Repos décidés EN PREMIER : jours ensuite interdits (contrainte dure).
  const restResult = chooseRestDays({ weekDates, staff, absences, keptShifts: kept, needs: dayRoleNeeds, periodInfo });
  unmet.push(...restResult.unmet);
  const isAvailable = (member: ShiftStaffMember, date: string) =>
    !findAbsence(absences, member.key, date) && !restResult.rest.get(member.key)?.has(date);

  // Règles légales toujours respectées (hors heures de contrat, traitées en D).
  const canAdd = (member: ShiftStaffMember, candidate: Shift): boolean => {
    if (!isAvailable(member, candidate.date)) return false;
    const own = staffShifts(member);
    if (own.some(shift => shift.date === candidate.date && overlaps(shift, candidate))) return false;
    return computeLegalAlerts([...own, candidate], [member], mondayIso, HARD_LEGAL_RULES).length === 0;
  };

  // E-learning prévu pour un collaborateur : créneaux de la semaine sur ses jours disponibles (apprentis pour « all »).
  const elearningFor = (member: ShiftStaffMember): Array<{ date: string; start: string; end: string }> =>
    settings.elearningSlots
      .filter(slot => slot.staffKey === member.key || (slot.staffKey === 'all' && member.apprenti))
      .flatMap(slot => weekDates.filter(date => weekdayOf(date) === slot.day && isAvailable(member, date)).map(date => ({ date, start: slot.start, end: slot.end })));

  // Objectif d'heures de la semaine : contrat lissé sur la période de paie, moins l'e-learning prévu.
  const targetOf = (member: ShiftStaffMember): number => {
    if (member.forfaitJour || member.contractHours <= 0) return 0;
    const info = periodInfo?.[member.key];
    const base = info ? member.contractHours - info.balance / info.weeksLeft : member.contractHours;
    const reserved = elearningFor(member).reduce((sum, slot) => sum + shiftDurationHours(slot.start, slot.end), 0);
    return Math.max(0, base - reserved);
  };

  const shiftOf = (member: ShiftStaffMember, position: ShiftPosition): Shift => ({
    id: idOf(position.date, member.key, position.roleId, position.start, position.end),
    staffKey: member.key, date: position.date, start: position.start, end: position.end, roleId: position.roleId,
    service: position.service, status: 'proposed',
  });

  // Le contrat passe avant l'effectif : pas d'affectation au-delà de l'objectif d'heures (un poste laissé vide est signalé).
  const withinContract = (member: ShiftStaffMember, shift: Shift): boolean =>
    member.forfaitJour || member.contractHours <= 0
    || hoursOf(member) + shiftDurationHours(shift.start, shift.end) <= targetOf(member) + TOP_UP_TOLERANCE_HOURS;

  const rankCandidate = (member: ShiftStaffMember, position: ShiftPosition): number[] => {
    const info = periodInfo?.[member.key];
    const weekday = weekdayOf(position.date);
    const own = staffShifts(member);
    const weekendLoad = (weekday === 6 ? (info?.saturdays ?? 0) + own.filter(s => weekdayOf(s.date) === 6).length : 0)
      + (weekday === 0 ? (info?.sundays ?? 0) + own.filter(s => weekdayOf(s.date) === 0).length : 0);
    const closingLoad = position.kind === 'fermeture' ? (info?.closings ?? 0) + own.filter(s => isClosing(s, settings)).length : 0;
    return [
      member.roles.indexOf(position.roleId), // rang du rôle dans les préférences
      -Math.round((targetOf(member) - totalHours(own)) / 2), // plus grand écart objectif / heures (paliers de 2 h)
      weekendLoad,
      closingLoad,
    ];
  };
  const compareRanks = (a: number[], b: number[]): number => {
    for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return a[i] - b[i];
    return 0;
  };

  const candidateOf = (member: ShiftStaffMember, position: ShiftPosition): Candidate | null => {
    if (!member.roles.includes(position.roleId)) return null;
    const shift = shiftOf(member, position);
    return withinContract(member, shift) && canAdd(member, shift) ? { member, shift } : null;
  };

  const place = (candidate: Candidate, meaning: Omit<Meta, 'order'>) => {
    assigned.push(candidate.shift);
    order += 1;
    meta.set(candidate.shift.id, { ...meaning, order });
  };

  const bestCandidate = (position: ShiftPosition, excludeKey?: string): Candidate | null => {
    const found = staff.filter(member => member.key !== excludeKey).map(member => candidateOf(member, position)).filter((c): c is Candidate => c !== null);
    if (found.length === 0) return null;
    return found
      .map(candidate => ({ candidate, rank: rankCandidate(candidate.member, position) }))
      .sort((a, b) => compareRanks(a.rank, b.rank) || a.candidate.member.nom.localeCompare(b.candidate.member.nom, 'fr'))[0].candidate;
  };

  // ── C. Affectation par contraintes : à chaque tour, le poste qui a le moins de candidats est pourvu en premier.
  const candidateCache = new Map<string, Map<string, Candidate | null>>(
    pending.map(position => [position.id, new Map(staff.map(member => [member.key, candidateOf(member, position)]))]),
  );
  const remainingPositions = [...pending];
  const unfilled: ShiftPosition[] = [];
  while (remainingPositions.length > 0) {
    let target = -1;
    let fewest = Number.POSITIVE_INFINITY;
    remainingPositions.forEach((position, index) => {
      const count = [...(candidateCache.get(position.id)?.values() ?? [])].filter(Boolean).length;
      if (count < fewest) { fewest = count; target = index; }
    });
    const [position] = remainingPositions.splice(target, 1);
    if (fewest === 0) { unfilled.push(position); continue; }
    const best = bestCandidate(position);
    if (!best) { unfilled.push(position); continue; }
    place(best, { kind: 'need', position });
    // Seules les possibilités du collaborateur choisi changent : on ne les recalcule que pour lui.
    remainingPositions.forEach(other => candidateCache.get(other.id)?.set(best.member.key, candidateOf(best.member, other)));
  }

  // ── D. Heures de contrat OBLIGATOIRES : le compteur de fin de période doit revenir à 0 (sans période : contrat de la semaine).
  // Renforts = forme « autres » d'un service ouvert, sur les jours déjà travaillés, dans les services qui ont le plus
  // de couverts par personne présente. Une coupure par jour est permise (midi + soir) dans le respect des règles légales.
  type Slot = { shift: Shift; hours: number; coversPerPerson: number; revenue: number };
  const servicePeople = (date: string, service: Shift['service']) =>
    assigned.filter(shift => shift.date === date && shift.roleId !== ELEARNING_ROLE_ID && shift.service === service).length;

  staff.filter(member => !member.forfaitJour && member.contractHours > 0).forEach(member => {
    const roleIds = member.roles.filter(id => id !== ELEARNING_ROLE_ID);
    if (roleIds.length === 0) return;
    const info = periodInfo?.[member.key];
    const mandatory = !info || info.weeksLeft === 1; // dernière semaine à planifier : le compteur doit tomber à 0
    let remaining = targetOf(member) - hoursOf(member);

    const slotsFor = (): Slot[] => {
      const slots: Slot[] = [];
      const workedDays = weekDates.filter(date => isAvailable(member, date)
        && staffShifts(member).some(shift => shift.date === date && shift.roleId !== ELEARNING_ROLE_ID));
      workedDays.forEach(date => {
        const shapes = shapesForDay(settings, weekdayOf(date));
        const budget = budgetOf(date);
        openServices(settings, weekdayOf(date)).forEach(service => roleIds.forEach(roleId => {
          const shape = othersShapeOf(shapes, service, roleId);
          if (!shape) return;
          const shift: Shift = {
            id: idOf(date, member.key, roleId, shape.start, shape.end),
            staffKey: member.key, date, start: shape.start, end: shape.end, roleId, service, status: 'proposed', reinforcement: true,
          };
          if (assigned.some(existing => existing.id === shift.id) || !canAdd(member, shift)) return;
          slots.push({
            shift,
            hours: shiftDurationHours(shape.start, shape.end),
            coversPerPerson: (service === 'midi' ? budget.cvMidi : budget.cvSoir) / Math.max(1, servicePeople(date, service)),
            revenue: service === 'midi' ? budget.caMidi : budget.caSoir,
          });
        }));
      });
      return slots;
    };
    const byImpact = (a: Slot, b: Slot) => b.coversPerPerson - a.coversPerPerson
      || b.revenue - a.revenue
      || Math.abs(remaining - a.hours) - Math.abs(remaining - b.hours);

    while (remaining > (mandatory ? 0.25 : MIN_REMAINING_FOR_TOP_UP - 0.01)) {
      const slots = slotsFor();
      if (slots.length === 0) break;
      let pool = slots.filter(slot => slot.hours <= remaining + TOP_UP_TOLERANCE_HOURS);
      // Aucun renfort ne tient dans le reste : sur une semaine obligatoire on prend le plus court plutôt que de finir
      // sous le contrat ; le dépassement éventuel est signalé ci-dessous.
      if (pool.length === 0 && mandatory && remaining >= MIN_MANDATORY_SHORTFALL_HOURS) {
        const shortest = Math.min(...slots.map(slot => slot.hours));
        pool = slots.filter(slot => slot.hours === shortest);
      }
      if (pool.length === 0) break;
      const best = [...pool].sort(byImpact)[0];
      place({ member, shift: best.shift }, { kind: 'topup' });
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

  // ── E. E-learning : uniquement sur les créneaux des paramètres, sinon un message.
  staff.forEach(member => {
    const wanted = settings.elearningSlots.filter(slot => slot.staffKey === member.key || (slot.staffKey === 'all' && member.apprenti));
    wanted.forEach(slot => {
      const date = weekDates.find(day => weekdayOf(day) === slot.day) ?? weekDates[0];
      const shift: Shift = {
        id: idOf(date, member.key, ELEARNING_ROLE_ID, slot.start, slot.end),
        staffKey: member.key, date, start: slot.start, end: slot.end, roleId: ELEARNING_ROLE_ID,
        service: inferShiftService(slot.start), status: 'proposed',
      };
      if (!canAdd(member, shift)) {
        unmet.push({ date, kind: 'contrat', message: `${member.nom} : e-learning du ${date} (${slot.start} – ${slot.end}) non placé (repos, absence ou règle légale)` });
        return;
      }
      place({ member, shift }, { kind: 'elearning' });
    });
  });

  // ── F. Contrôle légal final : tout shift proposé en infraction est retiré, puis son poste est reproposé à un autre.
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
    if (removedMeta?.kind === 'need' && removedMeta.position) {
      const replacement = bestCandidate(removedMeta.position, removed.staffKey);
      if (replacement) place(replacement, { kind: 'need', position: removedMeta.position });
      else unfilled.push(removedMeta.position);
    }
  }

  // Postes restés vides : le contrat l'a emporté (heures déjà atteintes) ou personne n'est disponible.
  const missingByKey = new Map<string, { date: string; message: string; count: number }>();
  unfilled.forEach(position => {
    const key = `${position.date}|${position.service}|${position.roleId}`;
    const entry = missingByKey.get(key) ?? { date: position.date, message: `${position.date} ${position.service} : ${roleLabelOf(position.roleId).toLowerCase()}`, count: 0 };
    entry.count += 1;
    missingByKey.set(key, entry);
  });
  missingByKey.forEach(entry => unmet.push({
    date: entry.date, kind: 'besoin',
    message: `${entry.message} manquant${entry.count > 1 ? 's' : ''} : ${entry.count} (contrat atteint ou personne de disponible)`,
  }));

  // Productivité de la semaine : objectif, signalé s'il n'est pas tenu.
  const weekRevenue = weekDates.reduce((sum, date) => sum + dayRevenue(budgetOf(date)), 0);
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
