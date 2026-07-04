import { describe, it, expect } from 'vitest';
import type { Worksheet } from 'exceljs';

import { parseHistoricalBudgetDate, isHistoricalBudgetTotalRow } from './historicalBudgetImport';

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

  it('détecte une ligne Total Semaine dont le libellé formule est en erreur', () => {
    // Feuille mensuelle réelle : la ligne total a pour col 0 la formule
    // '"Total Semaine "&WEEKNUM(A16,2)' dont le résultat est null et le texte "Invalid Date".
    const makeSheet = (row1Values: Record<number, { value: unknown; text: string }>) => ({
      getCell: (_row: number, col: number) => row1Values[col] ?? { value: null, text: '' },
    } as unknown as Worksheet);

    const totalRowSheet = makeSheet({
      1: { value: { formula: '"Total Semaine "&WEEKNUM(A16,2)', result: null }, text: 'Invalid Date' },
    });
    expect(isHistoricalBudgetTotalRow(totalRowSheet, 0)).toBe(true);

    // Une ligne jour (date par formule arithmétique) ne doit pas être détectée comme total.
    const dayRowSheet = makeSheet({
      1: { value: { formula: 'A16+1', result: new Date(2026, 6, 6) }, text: 'Mon Jul 06 2026' },
    });
    expect(isHistoricalBudgetTotalRow(dayRowSheet, 0)).toBe(false);
  });

  it('distingue une date statique d\'en-tête et une date formule identiques', () => {
    const staticValue = new Date(2026, 0, 1);
    const formulaValue = { formula: '+A12+1', result: new Date(2026, 0, 1), sharedFormula: 'A12' };

    expect(parseHistoricalBudgetDate(staticValue)).toEqual(new Date(2026, 0, 1));
    expect(parseHistoricalBudgetDate(formulaValue)).toEqual(new Date(2026, 0, 1));

    const isFormulaCell = (value: unknown) => value != null && typeof value === 'object' && 'result' in (value as object);
    expect(isFormulaCell(staticValue)).toBe(false);
    expect(isFormulaCell(formulaValue)).toBe(true);
  });
});
