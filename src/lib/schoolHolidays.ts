import type { SchoolHolidayCalendar, SchoolHolidayPeriod, SchoolZone } from '@/types/dataTypes';

import calendarByZone from './schoolHolidays.json';

// Source unique des vacances scolaires de l'appli (Suivi Quotidien, Analyse des écarts).
// Données : src/lib/schoolHolidays.json, à compléter chaque rentrée (arrêté du calendrier scolaire).
// Convention : `end` = dernier jour de vacances inclus (la veille de la reprise des cours).

export const SCHOOL_ZONES: readonly SchoolZone[] = ['A', 'B', 'C'];

export const DEFAULT_SCHOOL_ZONE: SchoolZone = 'B';

const calendars = calendarByZone as Record<SchoolZone, { periods: SchoolHolidayPeriod[] }>;

export const resolveSchoolZone = (zone: string | undefined): SchoolZone =>
  SCHOOL_ZONES.find(candidate => candidate === zone) ?? DEFAULT_SCHOOL_ZONE;

export const getSchoolHolidayCalendar = (zone: string | undefined): SchoolHolidayCalendar => {
  const resolved = resolveSchoolZone(zone);
  return { zone: resolved, periods: calendars[resolved].periods };
};
