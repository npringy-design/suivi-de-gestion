// Jours fériés français (métropole) : 8 dates fixes + 3 dates mobiles dépendant de Pâques.
// Complète schoolHolidays.ts (vacances scolaires) pour la Planification budgétaire.

export type PublicHoliday = { date: string; name: string };

const FIXED_HOLIDAYS: readonly { month: number; day: number; name: string }[] = [
  { month: 1, day: 1, name: 'Jour de l\'an' },
  { month: 5, day: 1, name: 'Fête du travail' },
  { month: 5, day: 8, name: 'Victoire 1945' },
  { month: 7, day: 14, name: 'Fête nationale' },
  { month: 8, day: 15, name: 'Assomption' },
  { month: 11, day: 1, name: 'Toussaint' },
  { month: 11, day: 11, name: 'Armistice 1918' },
  { month: 12, day: 25, name: 'Noël' },
];

const pad = (value: number): string => String(value).padStart(2, '0');

const toIso = (date: Date): string =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

// Algorithme de Meeus/Jones/Butcher (calendrier grégorien).
const easterSunday = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
};

const addDays = (date: Date, days: number): Date => new Date(date.getTime() + days * 86_400_000);

const cache = new Map<number, PublicHoliday[]>();

export function getPublicHolidays(year: number): PublicHoliday[] {
  const cached = cache.get(year);
  if (cached) return cached;
  const easter = easterSunday(year);
  const holidays: PublicHoliday[] = [
    ...FIXED_HOLIDAYS.map(h => ({ date: `${year}-${pad(h.month)}-${pad(h.day)}`, name: h.name })),
    { date: toIso(addDays(easter, 1)), name: 'Lundi de Pâques' },
    { date: toIso(addDays(easter, 39)), name: 'Ascension' },
    { date: toIso(addDays(easter, 50)), name: 'Lundi de Pentecôte' },
  ].sort((a, b) => a.date.localeCompare(b.date));
  cache.set(year, holidays);
  return holidays;
}

// Renvoie le nom du férié, ou null si la date (YYYY-MM-DD) n'est pas fériée dans l'année donnée.
export const isPublicHoliday = (date: string, year: number): string | null =>
  getPublicHolidays(year).find(holiday => holiday.date === date)?.name ?? null;
