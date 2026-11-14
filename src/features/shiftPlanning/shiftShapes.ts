import type { ShiftPlanningSettings, ShiftPosition, ShiftService, ShiftShape, ShiftShapeKind, ShiftWeekday } from '@/types/dataTypes';

import { formatShiftTime, parseShiftTime, type DayBudget } from './shiftCalculations';
import { computeDayNeeds, dayLayout, MANAGER_ROLE_ID, SALLE_ROLE_ID, SERVICES, type StaffingSettings } from './shiftStaffing';

// Formes de shifts (fonctions pures) : TOUS les horaires proposés par le moteur sont calculés ici,
// à partir des horaires du restaurant (serviceWindows) et de quelques réglages simples.
//   Jour coupé : midi (ouverture salle / cuisine → fin du midi + décalage), soir (début → fermeture + extra).
//   Jour en continu : équipe du midi jusqu'à la relève + chevauchement, équipe du soir de la relève à la fermeture.

export const CUISINE_ROLE_ID = 'cuisine';

// Un rôle dans un service : 1 poste « premier » (ouverture ou fermeture, s'il existe) puis des postes « autres ».
type RoleRecipe = { first: ShiftShape | null; others: ShiftShape | null };
export type ServiceShapes = Record<string, RoleRecipe>;
export type DayShapes = Partial<Record<ShiftService, ServiceShapes>>;

export type ShapeSettings = StaffingSettings & Pick<
  ShiftPlanningSettings,
  'salleOpenTime' | 'kitchenOpenTimes' | 'defaultArrival' | 'midiEndOffsetMin' | 'closeExtraMin' | 'reliefOverlapMin'
>;

const minutesOf = (time: string, fallback: number): number => parseShiftTime(time) ?? fallback;

// Fin d'une fenêtre en minutes ; une fin ≤ début passe minuit.
const windowEnd = (start: string, end: string, fallbackStart: number): number => {
  const startMin = minutesOf(start, fallbackStart);
  const endMin = minutesOf(end, 0);
  return endMin <= startMin ? endMin + 1440 : endMin;
};

const toWeekday = (weekday: number): ShiftWeekday => (((weekday % 7) + 7) % 7) as ShiftWeekday;

const shape = (roleId: string, service: ShiftService, kind: ShiftShapeKind, start: number, end: number): ShiftShape =>
  ({ roleId, service, kind, start: formatShiftTime(start), end: formatShiftTime(end) });

// Formes du midi : encadrant et 1 serveur à l'ouverture salle, 1 cuisinier à l'ouverture cuisine, les autres à l'arrivée par défaut.
const middayShapes = (settings: ShapeSettings, weekday: number, end: number): ServiceShapes => {
  const salleOpen = minutesOf(settings.salleOpenTime, 10 * 60);
  const kitchenOpen = minutesOf(settings.kitchenOpenTimes[toWeekday(weekday)], 10 * 60);
  const arrival = minutesOf(settings.defaultArrival, 11 * 60 + 45);
  return {
    [MANAGER_ROLE_ID]: { first: shape(MANAGER_ROLE_ID, 'midi', 'ouverture', salleOpen, end), others: null },
    [SALLE_ROLE_ID]: { first: shape(SALLE_ROLE_ID, 'midi', 'ouverture', salleOpen, end), others: shape(SALLE_ROLE_ID, 'midi', 'autres', arrival, end) },
    [CUISINE_ROLE_ID]: { first: shape(CUISINE_ROLE_ID, 'midi', 'ouverture', kitchenOpen, end), others: shape(CUISINE_ROLE_ID, 'midi', 'autres', arrival, end) },
  };
};

// Formes du soir : encadrant et 1 cuisinier jusqu'à la fermeture + extra, les autres jusqu'à la fermeture.
const eveningShapes = (settings: ShapeSettings, start: number, end: number): ServiceShapes => {
  const closeEnd = end + settings.closeExtraMin;
  return {
    [MANAGER_ROLE_ID]: { first: shape(MANAGER_ROLE_ID, 'soir', 'fermeture', start, closeEnd), others: null },
    [SALLE_ROLE_ID]: { first: null, others: shape(SALLE_ROLE_ID, 'soir', 'autres', start, end) },
    [CUISINE_ROLE_ID]: { first: shape(CUISINE_ROLE_ID, 'soir', 'fermeture', start, closeEnd), others: shape(CUISINE_ROLE_ID, 'soir', 'autres', start, end) },
  };
};

// Formes d'un jour de la semaine (jour fermé : aucune forme).
export function shapesForDay(settings: ShapeSettings, weekday: number): DayShapes {
  const layout = dayLayout(settings, weekday);
  if (layout.mode === 'closed') return {};
  if (layout.mode === 'continuous') {
    const relief = minutesOf(settings.reliefTime, 16 * 60);
    return {
      midi: middayShapes(settings, weekday, relief + settings.reliefOverlapMin),
      soir: eveningShapes(settings, relief, windowEnd(layout.start, layout.end, 0)),
    };
  }
  const shapes: DayShapes = {};
  if (layout.midi) shapes.midi = middayShapes(settings, weekday, minutesOf(layout.midi.end, 15 * 60) + settings.midiEndOffsetMin);
  if (layout.soir) {
    shapes.soir = eveningShapes(settings, minutesOf(layout.soir.start, 18 * 60 + 30), windowEnd(layout.soir.start, layout.soir.end, 18 * 60 + 30));
  }
  return shapes;
}

// Forme « autres » d'un rôle dans un service : sert aux renforts de contrat (l'encadrement et les rôles sans forme propre prennent celle de la salle).
export const othersShapeOf = (shapes: DayShapes, service: ShiftService, roleId: string): ShiftShape | null => {
  const serviceShapes = shapes[service];
  if (!serviceShapes) return null;
  const own = serviceShapes[roleId]?.others;
  if (own) return own;
  const salle = serviceShapes[SALLE_ROLE_ID]?.others ?? null;
  return salle ? { ...salle, roleId } : null;
};

// Postes à pourvoir un jour (besoins seuls) : l'encadrant, puis par rôle d'effectif les postes « premier » et « autres ».
// Le besoin salle compte l'encadrant si managerCountsInSalle : il y a alors un serveur de moins.
export function dayPositions(settings: ShapeSettings, date: string, weekday: number, budget: DayBudget): ShiftPosition[] {
  const shapes = shapesForDay(settings, weekday);
  const needs = computeDayNeeds(settings, weekday, budget);
  const positions: ShiftPosition[] = [];
  SERVICES.forEach(service => {
    const serviceShapes = shapes[service];
    if (!serviceShapes) return;
    const push = (item: ShiftShape, index: number) => positions.push({ ...item, date, id: `${date}|${service}|${item.roleId}|${index}` });
    const manager = serviceShapes[MANAGER_ROLE_ID]?.first;
    if (manager && needs.some(need => need.service === service && need.roleId === MANAGER_ROLE_ID)) push(manager, 0);
    needs.filter(need => need.service === service && need.roleId !== MANAGER_ROLE_ID).forEach(need => {
      const count = need.roleId === SALLE_ROLE_ID && settings.managerCountsInSalle ? Math.max(0, need.need - 1) : need.need;
      const recipe = serviceShapes[need.roleId] ?? serviceShapes[SALLE_ROLE_ID];
      if (!recipe) return;
      for (let index = 0; index < count; index += 1) {
        const item = index === 0 && recipe.first ? { ...recipe.first, roleId: need.roleId } : recipe.others ? { ...recipe.others, roleId: need.roleId } : null;
        if (item) push(item, index);
      }
    });
  });
  return positions;
}

// Heure de fermeture d'un jour (fin des formes « fermeture ») : sert à équilibrer les fermetures entre collaborateurs.
export const closingEndOfDay = (settings: ShapeSettings, weekday: number): string | null =>
  shapesForDay(settings, weekday).soir?.[MANAGER_ROLE_ID]?.first?.end ?? null;
