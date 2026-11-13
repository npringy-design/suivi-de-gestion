import type { Shift, ShiftPlanningSettings, ShiftService, ShiftServiceWindow, ShiftTemplate } from '@/types/dataTypes';

import { parseShiftTime, shiftDurationHours } from './shiftCalculations';
import type { Demand } from './shiftGeneratorDemands';

export const WEEKDAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

// Début et fin en minutes ; une fin ≤ début passe minuit (fin ramenée au-dessus de 24 h).
const bounds = (start: string, end: string): [number, number] => {
  const s = parseShiftTime(start) ?? 0;
  const e = parseShiftTime(end) ?? 0;
  return [s, e <= s ? e + 1440 : e];
};

export const templatesFor = (
  templates: ShiftTemplate[],
  roleId: string,
  service: ShiftService,
  weekday: number,
): ShiftTemplate[] => templates.filter(t => t.roleId === roleId && t.service === service && t.days.includes(weekday));

const overlapMinutes = (template: ShiftTemplate, window: ServiceWindowLike): number => {
  const [ts, te] = bounds(template.start, template.end);
  const [ws, we] = bounds(window.start, window.end);
  return Math.max(0, Math.min(te, we) - Math.max(ts, ws));
};

type ServiceWindowLike = Pick<ShiftServiceWindow, 'start' | 'end'>;

export type TemplatePick = { template: ShiftTemplate | null; reason: string };

// Modèle qui honore un besoin :
// - encadrement ouverture → fermeture : modèle qui couvre toute la fenêtre du service (le plus court) ;
// - créneau : arrivée comprise entre startEarliest et startLatest ; « jusqu'à la fermeture » → fin la plus tardive ;
// - besoin des garde-fous : modèle qui recouvre le mieux la fenêtre du service, puis le plus court.
export function pickTemplate(demand: Demand, settings: ShiftPlanningSettings, window: ServiceWindowLike, weekday: number): TemplatePick {
  const roleLabel = (settings.roles.find(role => role.id === demand.roleId)?.label ?? demand.roleId).toLowerCase();
  const candidates = templatesFor(settings.templates, demand.roleId, demand.service, weekday);
  const none = (detail = '') => ({ template: null, reason: `aucun modèle ${roleLabel} ${demand.service} le ${WEEKDAY_NAMES[weekday]}${detail}` });
  if (candidates.length === 0) return none();

  const duration = (t: ShiftTemplate) => shiftDurationHours(t.start, t.end);
  const byShortest = (list: ShiftTemplate[]) => [...list].sort((a, b) => duration(a) - duration(b))[0] ?? null;

  if (demand.rank === 0) {
    const [ws, we] = bounds(window.start, window.end);
    const covering = candidates.filter(t => {
      const [ts, te] = bounds(t.start, t.end);
      return ts <= ws && te >= we;
    });
    const template = byShortest(covering);
    return template ? { template, reason: '' } : none(` couvrant ${window.start} – ${window.end}`);
  }

  if (demand.rank === 1) {
    const earliest = parseShiftTime(demand.startEarliest ?? demand.start) ?? 0;
    const latest = parseShiftTime(demand.start) ?? 0;
    const inRange = candidates.filter(t => {
      const start = parseShiftTime(t.start) ?? 0;
      return start >= earliest && start <= latest;
    });
    if (inRange.length === 0) return none(` commençant entre ${demand.startEarliest ?? demand.start} et ${demand.start}`);
    if (demand.untilClose) {
      const latestEnd = [...inRange].sort((a, b) => bounds(b.start, b.end)[1] - bounds(a.start, a.end)[1] || duration(a) - duration(b))[0];
      return { template: latestEnd, reason: '' };
    }
    return { template: byShortest(inRange), reason: '' };
  }

  const best = [...candidates].sort((a, b) => overlapMinutes(b, window) - overlapMinutes(a, window) || duration(a) - duration(b))[0];
  return { template: best, reason: '' };
}

// Un shift est « dans un modèle » s'il reprend exactement les heures d'un modèle de son rôle, service et jour.
export const matchesTemplate = (shift: Pick<Shift, 'roleId' | 'service' | 'date' | 'start' | 'end'>, templates: ShiftTemplate[], weekday: number): boolean =>
  templatesFor(templates, shift.roleId, shift.service, weekday).some(t => t.start === shift.start && t.end === shift.end);

// Heure de fermeture du jour : fin la plus tardive des modèles du soir, à défaut fin du service du soir.
export const closingEndOf = (settings: ShiftPlanningSettings, weekday: number): string | null => {
  const ends = settings.templates.filter(t => t.service === 'soir' && t.days.includes(weekday));
  if (ends.length > 0) {
    return [...ends].sort((a, b) => bounds(b.start, b.end)[1] - bounds(a.start, a.end)[1])[0].end;
  }
  return settings.serviceWindows.find(w => w.service === 'soir' && w.days.includes(weekday))?.end ?? null;
};
