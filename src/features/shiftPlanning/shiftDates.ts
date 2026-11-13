// Dates ISO (YYYY-MM-DD) calculées en calendrier local : jamais de conversion UTC (décalage d'un jour sinon).

export const isoFromDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const dateFromIso = (iso: string): Date => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const addDaysIso = (iso: string, days: number): string => {
  const date = dateFromIso(iso);
  date.setDate(date.getDate() + days);
  return isoFromDate(date);
};

// Lundi de la semaine contenant la date.
export const mondayOfIso = (iso: string): string => {
  const date = dateFromIso(iso);
  const offset = (date.getDay() + 6) % 7;
  return addDaysIso(iso, -offset);
};

export const weekDaysIso = (mondayIso: string): string[] => Array.from({ length: 7 }, (_, i) => addDaysIso(mondayIso, i));

// Numéro de semaine ISO 8601.
export const isoWeekNumber = (iso: string): number => {
  const date = dateFromIso(iso);
  const thursday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  const diffDays = Math.round((thursday.getTime() - firstThursday.getTime()) / 86400000);
  return 1 + Math.floor((diffDays + ((firstThursday.getDay() + 6) % 7)) / 7);
};

export const formatShortDate = (iso: string): string => {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
};

// Mois (année + index 0-11) couverts par une liste de dates ISO.
export const monthsOfDates = (dates: string[]): Array<{ year: number; month: number }> => {
  const seen = new Map<string, { year: number; month: number }>();
  dates.forEach(iso => {
    const date = dateFromIso(iso);
    seen.set(`${date.getFullYear()}-${date.getMonth()}`, { year: date.getFullYear(), month: date.getMonth() });
  });
  return [...seen.values()];
};
