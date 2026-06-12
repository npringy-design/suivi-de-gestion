import { describe, it, expect } from 'vitest';

import {
  parseHistoricalPayrollHourCell,
  historicalPayrollHourToDecimal,
  findHistoricalPayrollTargetColumn,
} from '@/features/dashboard/importHelpers/payrollImport';

const makeCell = (value: unknown, text?: string) => ({
  value,
  text: text ?? (value instanceof Date ? '' : String(value ?? '')),
}) as unknown as Parameters<typeof parseHistoricalPayrollHourCell>[0];

describe('parseHistoricalPayrollHourCell', () => {
  it('parse une cellule texte au format HH:MM', () => {
    expect(parseHistoricalPayrollHourCell(makeCell('8:30', '8:30'))).toBe('8:30');
  });

  it('parse une cellule Date (timedelta Excel) de moins de 24h', () => {
    const date = new Date(Date.UTC(1899, 11, 30, 7, 45, 0));
    expect(parseHistoricalPayrollHourCell(makeCell(date))).toBe('7:45');
  });

  it('parse une cellule Date (timedelta Excel) cumulee de plus de 24h', () => {
    // un peu plus de 26h depuis l'epoque Excel (1899-12-30 00:00 UTC)
    const date = new Date(Date.UTC(1899, 11, 31, 2, 30, 0));
    const result = parseHistoricalPayrollHourCell(makeCell(date));
    expect(result).toMatch(/^26:\d{2}$/);
  });

  it('parse une cellule string decimale type "24.25"', () => {
    expect(parseHistoricalPayrollHourCell(makeCell('24.25', '24.25'))).toBe('24:15');
  });
});

describe('historicalPayrollHourToDecimal', () => {
  it('convertit un format H:MM valide en decimal', () => {
    expect(historicalPayrollHourToDecimal('8:30')).toBe(8.5);
  });

  it('retourne 0 pour un format invalide', () => {
    expect(historicalPayrollHourToDecimal('abc')).toBe(0);
  });
});

describe('findHistoricalPayrollTargetColumn - schema global vs cuisine/salle', () => {
  it('detecte une colonne cuisine/salle quand le suffixe est present', () => {
    expect(findHistoricalPayrollTargetColumn('CADRE CUISINE', 62, 130)).toBe(62);
    expect(findHistoricalPayrollTargetColumn('CADRE SALLE', 62, 130)).toBe(63);
  });

  it('redirige vers les colonnes globales quand aucun suffixe cuisine/salle', () => {
    expect(findHistoricalPayrollTargetColumn('CADRE', 62, 130)).toBe(130);
    expect(findHistoricalPayrollTargetColumn('MAITRISE', 62, 130)).toBe(131);
    expect(findHistoricalPayrollTargetColumn('NIV I ET II', 62, 130)).toBe(132);
    expect(findHistoricalPayrollTargetColumn('NIV III', 62, 130)).toBe(133);
    expect(findHistoricalPayrollTargetColumn('APPRENTI', 62, 130)).toBe(134);
  });
});
