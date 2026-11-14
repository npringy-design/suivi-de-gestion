import type { Shift, ShiftPlanningSettings, ShiftService, ShiftServiceWindow } from '@/types/dataTypes';

import { ELEARNING_ROLE_ID, inferShiftService, parseShiftTime, type DayBudget } from './shiftCalculations';

// Effectif par couverts, heures de référence et couverture des services (règles simples) :
// besoin d'un rôle = ⌈couverts budgétés du service ÷ couverts par personne⌉, l'encadrement tient lieu d'effectif salle,
// et un shift « couvre » un service si le collaborateur est présent à l'heure de référence de ce service.

export const MANAGER_ROLE_ID = 'encadrement';
export const SALLE_ROLE_ID = 'salle';
export const SERVICES: ShiftService[] = ['midi', 'soir'];

export type StaffingSettings = Pick<
  ShiftPlanningSettings,
  'staffingRules' | 'serviceWindows' | 'midiReferenceTime' | 'soirReferenceTime' | 'managerCountsInSalle'
>;

type TimeSpan = { start: string; end: string };

// Début et fin en minutes ; une fin ≤ début passe minuit (fin ramenée au-dessus de 24 h).
export const spanOf = (item: TimeSpan): [number, number] => {
  const start = parseShiftTime(item.start) ?? 0;
  const end = parseShiftTime(item.end) ?? 0;
  return [start, end <= start ? end + 1440 : end];
};

export const referenceOf = (settings: Pick<ShiftPlanningSettings, 'midiReferenceTime' | 'soirReferenceTime'>, service: ShiftService): number =>
  parseShiftTime(service === 'midi' ? settings.midiReferenceTime : settings.soirReferenceTime) ?? (service === 'midi' ? 12 * 60 + 30 : 20 * 60);

// Présent à l'heure de référence (bornes incluses).
export const coversReference = (item: TimeSpan, reference: number): boolean => {
  const [start, end] = spanOf(item);
  return start <= reference && reference <= end;
};

export const coveredServices = (item: TimeSpan, settings: Pick<ShiftPlanningSettings, 'midiReferenceTime' | 'soirReferenceTime'>): ShiftService[] =>
  SERVICES.filter(service => coversReference(item, referenceOf(settings, service)));

// Libellé des services couverts par un horaire : « midi », « soir », « midi + soir » ou « aucun service ».
export const coveredServicesLabel = (item: TimeSpan, settings: Pick<ShiftPlanningSettings, 'midiReferenceTime' | 'soirReferenceTime'>): string => {
  const services = coveredServices(item, settings);
  return services.length === 0 ? 'aucun service' : services.join(' + ');
};

// Service porté par un shift (champ Shift.service, repris pour l'affichage et les fermetures) : le soir seul → « soir », sinon « midi ».
export const serviceOfShift = (item: TimeSpan, settings: Pick<ShiftPlanningSettings, 'midiReferenceTime' | 'soirReferenceTime'>): ShiftService => {
  const services = coveredServices(item, settings);
  if (services.length === 0) return inferShiftService(item.start);
  return services.includes('midi') ? 'midi' : 'soir';
};

// Un service est ouvert un jour si une fenêtre de service du jour contient son heure de référence
// (ce qui couvre aussi les jours en continu : une seule fenêtre contient les deux heures de référence).
export const openServices = (settings: StaffingSettings, weekday: number): ShiftService[] =>
  SERVICES.filter(service => settings.serviceWindows.some(window => window.days.includes(weekday) && coversReference(window, referenceOf(settings, service))));

export const windowFor = (settings: StaffingSettings, service: ShiftService, weekday: number): ShiftServiceWindow | undefined =>
  settings.serviceWindows.find(window => window.days.includes(weekday) && coversReference(window, referenceOf(settings, service)));

// Fenêtre en continu : une seule fenêtre du jour couvre les deux heures de référence.
export const continuousWindow = (settings: StaffingSettings, weekday: number): ServiceWindowLike | null =>
  settings.serviceWindows.find(window => window.days.includes(weekday)
    && coversReference(window, referenceOf(settings, 'midi')) && coversReference(window, referenceOf(settings, 'soir'))) ?? null;

type ServiceWindowLike = ShiftServiceWindow;

export type RoleNeed = { roleId: string; service: ShiftService; need: number };

// Besoin d'un rôle sur un service : ⌈couverts ÷ couverts par personne⌉, au moins 1 si les couverts sont > 0.
export const staffNeed = (covers: number, coversPerPerson: number): number =>
  covers > 0 ? (coversPerPerson > 0 ? Math.max(1, Math.ceil(covers / coversPerPerson)) : 1) : 0;

// Besoins d'un jour : par rôle et par service ouvert (couverts du midi et du soir lus séparément) ;
// l'encadrement compte pour exactement 1 présent à chaque heure de référence d'un service ouvert.
export function computeDayNeeds(settings: StaffingSettings, weekday: number, budget: DayBudget): RoleNeed[] {
  const needs: RoleNeed[] = [];
  openServices(settings, weekday).forEach(service => {
    const covers = service === 'midi' ? budget.cvMidi : budget.cvSoir;
    if (covers <= 0) return;
    settings.staffingRules.forEach(rule => needs.push({ roleId: rule.roleId, service, need: staffNeed(covers, rule.coversPerPerson) }));
    needs.push({ roleId: MANAGER_ROLE_ID, service, need: 1 });
  });
  return needs;
}

// Un shift d'encadrement compte aussi pour la salle si l'option est active.
export const countsForRole = (shiftRoleId: string, needRoleId: string, settings: Pick<ShiftPlanningSettings, 'managerCountsInSalle'>): boolean =>
  shiftRoleId === needRoleId || (needRoleId === SALLE_ROLE_ID && settings.managerCountsInSalle && shiftRoleId === MANAGER_ROLE_ID);

// Personnes présentes à l'heure de référence d'un service pour un rôle (e-learning exclu).
export const coverageCount = (
  shifts: Shift[],
  settings: StaffingSettings,
  date: string,
  service: ShiftService,
  needRoleId: string,
): number => {
  const reference = referenceOf(settings, service);
  return shifts.filter(shift => shift.date === date && shift.roleId !== ELEARNING_ROLE_ID
    && countsForRole(shift.roleId, needRoleId, settings) && coversReference(shift, reference)).length;
};

export type RoleShortage = { roleId: string; missing: number };

export const computeDayShortages = (needs: RoleNeed[], dayShifts: Shift[], settings: StaffingSettings, date: string): RoleShortage[] => {
  const missingByRole = new Map<string, number>();
  needs.forEach(({ roleId, service, need }) => {
    const covered = coverageCount(dayShifts, settings, date, service, roleId);
    if (need > covered) missingByRole.set(roleId, (missingByRole.get(roleId) ?? 0) + (need - covered));
  });
  return [...missingByRole.entries()].map(([roleId, missing]) => ({ roleId, missing }));
};

// Parties d'une fenêtre [from, to] (minutes) non couvertes par les intervalles donnés.
export const uncoveredParts = (intervals: Array<[number, number]>, from: number, to: number): Array<[number, number]> => {
  const gaps: Array<[number, number]> = [];
  let cursor = from;
  [...intervals].sort((a, b) => a[0] - b[0]).forEach(([start, end]) => {
    if (start > cursor) gaps.push([cursor, Math.min(start, to)]);
    cursor = Math.max(cursor, end);
  });
  if (cursor < to) gaps.push([cursor, to]);
  return gaps.filter(([start, end]) => end > start);
};
