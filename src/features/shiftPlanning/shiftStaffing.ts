import type { Shift, ShiftPlanningSettings, ShiftService } from '@/types/dataTypes';

import { ELEARNING_ROLE_ID, inferShiftService, parseShiftTime, type DayBudget } from './shiftCalculations';

// Effectif par couverts, heures de référence et couverture des services (règles simples) :
// besoin d'un rôle = ⌈couverts budgétés du service ÷ couverts par personne⌉, l'encadrement tient lieu d'effectif salle,
// et un shift « couvre » un service si le collaborateur est présent à l'heure de référence de ce service.

export const MANAGER_ROLE_ID = 'encadrement';
export const SALLE_ROLE_ID = 'salle';
export const SERVICES: ShiftService[] = ['midi', 'soir'];

export type StaffingSettings = Pick<
  ShiftPlanningSettings,
  'staffingRules' | 'serviceWindows' | 'midiReferenceTime' | 'soirReferenceTime' | 'managerCountsInSalle' | 'reliefTime'
>;

export type TimeSpan = { start: string; end: string };

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

// Organisation d'un jour d'après les horaires du restaurant (serviceWindows) : fermé, coupé (midi + soir)
// ou en continu (une seule fenêtre qui contient l'heure de relève).
export type DayLayout =
  | { mode: 'closed' }
  | { mode: 'cut'; midi: TimeSpan | null; soir: TimeSpan | null }
  | { mode: 'continuous'; start: string; end: string };

export function dayLayout(settings: StaffingSettings, weekday: number): DayLayout {
  const windows = settings.serviceWindows.filter(window => window.days.includes(weekday));
  if (windows.length === 0) return { mode: 'closed' };
  const relief = parseShiftTime(settings.reliefTime) ?? 16 * 60;
  if (windows.length === 1) {
    const [start, end] = spanOf(windows[0]);
    if (start < relief && relief < end) return { mode: 'continuous', start: windows[0].start, end: windows[0].end };
  }
  const midi = windows.find(window => window.service === 'midi') ?? null;
  const soir = windows.find(window => window.service === 'soir') ?? null;
  return { mode: 'cut', midi: midi && { start: midi.start, end: midi.end }, soir: soir && { start: soir.start, end: soir.end } };
}

// Services ouverts un jour : les deux en continu, sinon ceux qui ont une fenêtre.
export const openServices = (settings: StaffingSettings, weekday: number): ShiftService[] => {
  const layout = dayLayout(settings, weekday);
  if (layout.mode === 'closed') return [];
  if (layout.mode === 'continuous') return SERVICES;
  return SERVICES.filter(service => layout[service] !== null);
};

export type RoleNeed = { roleId: string; service: ShiftService; need: number };

// Besoin d'un rôle sur un service ouvert : ⌈couverts ÷ couverts par personne⌉, au moins 1.
export const staffNeed = (covers: number, coversPerPerson: number): number =>
  covers > 0 && coversPerPerson > 0 ? Math.max(1, Math.ceil(covers / coversPerPerson)) : 1;

// Besoins d'un jour : par rôle et par service ouvert (couverts du midi et du soir lus séparément) ;
// l'encadrement compte pour 1 présent par service ouvert (et pour 1 dans le besoin salle si managerCountsInSalle).
export function computeDayNeeds(settings: StaffingSettings, weekday: number, budget: DayBudget): RoleNeed[] {
  const needs: RoleNeed[] = [];
  openServices(settings, weekday).forEach(service => {
    const covers = service === 'midi' ? budget.cvMidi : budget.cvSoir;
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

// Explication du besoin d'un jour, par exemple « Midi 55 cv → salle 3 · cuisine 2 | Soir 45 cv → salle 2 · cuisine 2 ».
export function describeDayNeeds(settings: StaffingSettings, weekday: number, budget: DayBudget, roleLabelOf: (roleId: string) => string): string {
  const needs = computeDayNeeds(settings, weekday, budget);
  return SERVICES
    .filter(service => needs.some(need => need.service === service))
    .map(service => {
      const covers = Math.round(service === 'midi' ? budget.cvMidi : budget.cvSoir);
      const roles = needs
        .filter(need => need.service === service && need.roleId !== MANAGER_ROLE_ID)
        .map(need => `${roleLabelOf(need.roleId).toLowerCase()} ${need.need}`);
      return `${service === 'midi' ? 'Midi' : 'Soir'} ${covers} cv → ${roles.join(' · ')}`;
    })
    .join(' | ');
}
