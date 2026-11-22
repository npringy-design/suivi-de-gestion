import { describe, expect, it } from 'vitest';

import { getDashboardRowIndices } from '@/lib/utils';

import { getBudgetVaeDay, getBudgetVaeMonth, matchingPreviousYearDate, weekNumberMonday } from './budgetVae';
import { COL } from './dashboardColumnIndex';

const withVae = (year: number, month: number, day: number, vae: string) => ({
  [year]: { [month]: { dashboard: { [`${getDashboardRowIndices(month, year)[day]}-${COL.REALISE_CA_VAE}`]: vae } } },
});

describe('VAE budget = VAE réalisée N-1 de la même semaine', () => {
  it('numérote les semaines comme WEEKNUM(date; 2)', () => {
    expect(weekNumberMonday(new Date(2026, 0, 1))).toBe(1); // jeudi
    expect(weekNumberMonday(new Date(2026, 0, 4))).toBe(1); // dimanche
    expect(weekNumberMonday(new Date(2026, 0, 5))).toBe(2); // lundi
    expect(weekNumberMonday(new Date(2027, 0, 1))).toBe(1); // vendredi
    expect(weekNumberMonday(new Date(2026, 11, 31))).toBe(53);
  });

  it('1er janv. 2027 (vendredi, semaine 1) → vendredi de la semaine 1 de 2026', () => {
    const match = matchingPreviousYearDate(2027, 0, 1);
    expect(match && [match.getFullYear(), match.getMonth(), match.getDate()]).toEqual([2026, 0, 2]);
    expect(getBudgetVaeDay(withVae(2026, 0, 2, '1 250'), 2027, 0, 1)).toBe(1250);
  });

  it('un jour sans équivalent en N-1 ou sans VAE saisie vaut 0', () => {
    expect(matchingPreviousYearDate(2026, 11, 31)).toBeNull(); // semaine 53 absente de 2025
    expect(getBudgetVaeDay(withVae(2025, 11, 31, '500'), 2026, 11, 31)).toBe(0);
    expect(getBudgetVaeDay({}, 2027, 0, 1)).toBe(0);
    expect(getBudgetVaeDay(withVae(2026, 0, 2, ''), 2027, 0, 1)).toBe(0);
  });

  it('somme les jours du mois', () => {
    const data = { ...withVae(2026, 0, 2, '100'), 2026: { 0: { dashboard: {
      [`${getDashboardRowIndices(0, 2026)[2]}-${COL.REALISE_CA_VAE}`]: '100',
      [`${getDashboardRowIndices(0, 2026)[9]}-${COL.REALISE_CA_VAE}`]: '50',
    } } } };
    expect(getBudgetVaeMonth(data, 2027, 0)).toBe(150);
  });
});
