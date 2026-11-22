import { getDashboardRowIndices } from '@/lib/utils';
import { parseMoneyValue } from '@/lib/money';

import { COL } from './dashboardColumnIndex';

// VAE budget d'un jour : le budget n'a pas de VAE saisie, il reprend la VAE réalisée N-1 du même jour de
// semaine de la même semaine (règle du suivi Excel V27). Valeur calculée à la lecture, jamais stockée.

type BudgetVaeSource = Record<number, Record<number, { dashboard?: Record<string, string> } | undefined> | undefined>;

// Date (année, mois, jour) → numéro de semaine : semaine commençant le lundi, semaine 1 = celle du 1er janvier
// (équivalent Excel WEEKNUM(date; 2)).
export const weekNumberMonday = (date: Date): number => {
  const jan1 = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 1)) / 86400000);
  const jan1Offset = (jan1.getDay() + 6) % 7; // 0 = lundi
  return Math.floor((dayOfYear + jan1Offset) / 7) + 1;
};

// Jour de l'année N-1 de même numéro de semaine et même jour de semaine ; null s'il tombe hors de N-1
// (semaine 1 débordant sur décembre N-2, semaine 53 absente de N-1).
export const matchingPreviousYearDate = (year: number, month: number, day: number): Date | null => {
  const date = new Date(year, month, day);
  const week = weekNumberMonday(date);
  const weekday = (date.getDay() + 6) % 7;
  const previousJan1 = new Date(year - 1, 0, 1);
  const firstMonday = 1 - ((previousJan1.getDay() + 6) % 7);
  const match = new Date(year - 1, 0, firstMonday + (week - 1) * 7 + weekday);
  return match.getFullYear() === year - 1 ? match : null;
};

export type BudgetVaeLookup = (date: Date) => number;

// Lecteur mis en cache par année : les index de lignes des mois N-1 ne sont calculés qu'une fois.
export const createBudgetVaeLookup = (allData: BudgetVaeSource, year: number): BudgetVaeLookup => {
  const indicesByMonth = new Map<number, Record<number, number>>();
  return date => {
    const match = matchingPreviousYearDate(date.getFullYear(), date.getMonth(), date.getDate());
    if (!match) return 0;
    const dashboard = allData[match.getFullYear()]?.[match.getMonth()]?.dashboard;
    if (!dashboard) return 0;
    let indices = indicesByMonth.get(match.getMonth());
    if (!indices) {
      indices = getDashboardRowIndices(match.getMonth(), match.getFullYear());
      indicesByMonth.set(match.getMonth(), indices);
    }
    const rowIndex = indices[match.getDate()];
    return rowIndex === undefined ? 0 : parseMoneyValue(dashboard[`${rowIndex}-${COL.REALISE_CA_VAE}`]);
  };
};

export const getBudgetVaeDay = (allData: BudgetVaeSource, year: number, month: number, day: number): number =>
  createBudgetVaeLookup(allData, year)(new Date(year, month, day));

export const getBudgetVaeMonth = (allData: BudgetVaeSource, year: number, month: number): number => {
  const lookup = createBudgetVaeLookup(allData, year);
  const days = new Date(year, month + 1, 0).getDate();
  let total = 0;
  for (let day = 1; day <= days; day += 1) total += lookup(new Date(year, month, day));
  return total;
};
