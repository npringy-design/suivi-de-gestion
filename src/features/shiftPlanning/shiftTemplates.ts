import type { Shift, ShiftPlanningSettings, ShiftTemplate } from '@/types/dataTypes';

import { windowFor } from './shiftStaffing';

export const WEEKDAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

// Modèles compatibles (même rôle, jour coché), dans leur ordre d'utilisation.
export const templatesFor = (templates: ShiftTemplate[], roleId: string, weekday: number): ShiftTemplate[] =>
  templates
    .filter(template => template.roleId === roleId && template.days.includes(weekday))
    .sort((a, b) => a.order - b.order || a.start.localeCompare(b.start));

// Un shift est « dans un modèle » s'il reprend exactement les heures d'un modèle de son rôle et de son jour.
export const matchesTemplate = (shift: Pick<Shift, 'roleId' | 'start' | 'end'>, templates: ShiftTemplate[], weekday: number): boolean =>
  templatesFor(templates, shift.roleId, weekday).some(template => template.start === shift.start && template.end === shift.end);

// Heure de fermeture du jour : fin de la fenêtre de service qui contient l'heure de référence du soir.
export const closingEndOf = (settings: ShiftPlanningSettings, weekday: number): string | null =>
  windowFor(settings, 'soir', weekday)?.end ?? null;
