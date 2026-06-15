import { describe, it, expect } from 'vitest';
import { parseHistoricalBudgetDate } from './historicalBudgetImport';

describe('parseHistoricalBudgetDate', () => {
  it('lit le résultat d\'une cellule formule ExcelJS', () => {
    const value = { formula: '+A12+1', result: new Date(2026, 0, 1), sharedFormula: 'A12' };
    expect(parseHistoricalBudgetDate(value)).toEqual(new Date(2026, 0, 1));
  });

  it('lit une Date directe', () => {
    const date = new Date(2026, 0, 5);
    expect(parseHistoricalBudgetDate(date)).toEqual(date);
  });

  it('lit un texte de date en mots français', () => {
    expect(parseHistoricalBudgetDate('Jeudi 1 Janvier 2026')).toEqual(new Date(2026, 0, 1));
  });

  it('lit un texte de date au format JJ/MM/AAAA', () => {
    expect(parseHistoricalBudgetDate('01/01/2026')).toEqual(new Date(2026, 0, 1));
  });
});
