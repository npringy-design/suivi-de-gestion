import { describe, expect, it } from 'vitest';

import type { PersonnelInfo } from '../contexts/DataContext';
import { averagePayrollRate, buildPayrollImportFromText, getPayrollTargetPeriodFromText } from '../personnelSalaryImport';

const personnel: PersonnelInfo[] = [
  { id: '1', nom: 'Pringy Nicolas', category: 'cadre', department: 'salle', aliases: 'Nicolas Pringy' },
  { id: '2', nom: 'Durand Lea', category: 'cadre', department: 'salle', aliases: '' },
  { id: '3', nom: 'Martin Samir', category: 'niv3', department: 'cuisine', aliases: '' },
];

describe('personnelSalaryImport', () => {
  it('detects the target month from the payroll PDF title', () => {
    const result = getPayrollTargetPeriodFromText('Coûts salariaux - Avril 2026');

    expect(result).toMatchObject({
      sourceMonth: 3,
      sourceYear: 2026,
      targetMonth: 4,
      targetYear: 2026,
      sourceLabel: 'avril 2026',
      targetLabel: 'mai 2026',
    });
  });

  it('moves December payroll to January of the next year', () => {
    const result = getPayrollTargetPeriodFromText('Coûts salariaux - Décembre 2026');

    expect(result).toMatchObject({
      sourceMonth: 11,
      sourceYear: 2026,
      targetMonth: 0,
      targetYear: 2027,
      sourceLabel: 'décembre 2026',
      targetLabel: 'janvier 2027',
    });
  });

  it('falls back to the most frequent numeric payroll month in table rows', () => {
    const result = getPayrollTargetPeriodFromText([
      'PRINGY NICOLAS 04/2026 151.67 6057.77',
      'MARTIAL KIESHA 04/2026 166.25 3287.74',
    ].join('\n'));

    expect(result).toMatchObject({ sourceMonth: 3, sourceYear: 2026, targetMonth: 4, targetYear: 2026 });
  });

  it('matches PDF text lines to personnel and stores their department', () => {
    const text = [
      'Pringy Nicolas heures 151,67 cout global 4500,00',
      'Martin Samir heures 140 cout global 2700,00',
    ].join('\n');

    const result = buildPayrollImportFromText(text, personnel);

    expect(result.matches).toHaveLength(2);
    expect(result.categories.cadre[0]).toMatchObject({ nom: 'Pringy Nicolas', department: 'salle', heures: '151,67', coutGlobal: '4500' });
    expect(result.categories.niv3[0]).toMatchObject({ nom: 'Martin Samir', department: 'cuisine' });
    expect(result.categories.cadre[0].importSourceLine).toBeUndefined();
    expect(result.unmatched.map(item => item.nom)).toEqual(['Durand Lea']);
  });

  it('uses aliases to match a payroll line', () => {
    const result = buildPayrollImportFromText('Nicolas Pringy heures 100 cout global 3000', personnel);

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].personnel.nom).toBe('Pringy Nicolas');
  });

  it('uses Total heures and Cout global from payroll table lines', () => {
    const text = '000014 MARTIAL KIESHA 01/11/2021 ASSISTANT MANAGER 04/2026 148.92 17.33 166.25 2672.11 740.57 27.71 -124.94 3287.74 19.78';

    const result = buildPayrollImportFromText(text, [
      { id: '4', nom: 'Martial Kiesha', category: 'maitrise', department: 'salle', aliases: '' },
    ]);

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].heures).toBeCloseTo(166.25);
    expect(result.matches[0].coutGlobal).toBeCloseTo(3287.74);
    expect(result.categories.maitrise[0]).toMatchObject({ heures: '166,25', coutGlobal: '3287,74' });
  });

  it('uses 151.67 hours for forfait jour and keeps Cout global from the payroll table', () => {
    const text = '000019 PRINGY NICOLAS (forfait jour) 01/11/2021 DIRECTEUR 04/2026 4043.35 2063.74 51.04 -49.32 6057.77 333.46';

    const result = buildPayrollImportFromText(text, personnel);

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].heures).toBeCloseTo(151.67);
    expect(result.matches[0].coutGlobal).toBeCloseTo(6057.77);
    expect(result.categories.cadre[0]).toMatchObject({ heures: '151,67', coutGlobal: '6057,77' });
  });

  it('averages rates by category and department', () => {
    const result = buildPayrollImportFromText([
      'Pringy Nicolas heures 100 cout global 3000',
      'Durand Lea heures 100 cout global 2000',
    ].join('\n'), personnel);

    expect(averagePayrollRate(result.categories.cadre, 'salle')).toBeCloseTo(27.5);
    expect(averagePayrollRate(result.categories.cadre, 'cuisine')).toBe(0);
  });
});
