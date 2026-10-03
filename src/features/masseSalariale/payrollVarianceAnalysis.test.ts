import { describe, expect, it } from 'vitest';

import type { PayrollStoredLine } from '@/types/dataTypes';

import { analyzePayrollVariance } from './payrollVarianceAnalysis';

const line = (key: string, nom: string, heures: number, coutGlobal: number, exitDate?: string): PayrollStoredLine =>
  ({ key, nom, heures, coutGlobal, ...(exitDate ? { exitDate } : {}) });

const previous = [
  line('1', 'DUPONT Jean', 100, 1000), // heures +10 en N
  line('2', 'MARTIN Paul', 100, 1000), // coût horaire 10 → 11 en N
  line('3', 'DURAND Anne', 100, 1000), // inchangée
  line('4', 'BERNARD Luc', 50, 500), // départ
  line('5', 'PETIT Sam', 20, 300, '15/09/2025'), // sortant de N-1 (STC)
];
const current = [
  line('1', 'DUPONT Jean', 110, 1100),
  line('2', 'MARTIN Paul', 100, 1100),
  line('3', 'DURAND Anne', 100, 1000),
  line('6', 'LEROY Emma', 80, 800), // arrivée
  line('7', 'MOREL Tom', 30, 900, '22/09/2026'), // sortant de N (STC)
];

const amountOf = (analysis: ReturnType<typeof analyzePayrollVariance>, kind: string) =>
  analysis.causes.find(cause => cause.kind === kind)?.amount;

describe('analyzePayrollVariance', () => {
  const analysis = analyzePayrollVariance({ current, previous, currentTotal: 4900, previousTotal: 3800 });

  it('décompose chaque cause, une personne dans une seule cause', () => {
    expect(amountOf(analysis, 'leavers')).toBe(600); // +900 (N) − 300 (N-1)
    expect(amountOf(analysis, 'arrivals')).toBe(800);
    expect(amountOf(analysis, 'departures')).toBe(-500);
    expect(amountOf(analysis, 'hours')).toBe(100); // (110 − 100) × 10
    expect(amountOf(analysis, 'hourlyRate')).toBe(100); // (11 − 10) × 100
    expect(analysis.causes.find(cause => cause.kind === 'arrivals')!.people).toEqual([{ key: '6', nom: 'LEROY Emma', amount: 800 }]);
    expect(analysis.causes.find(cause => cause.kind === 'leavers')!.people.map(person => person.nom)).toEqual(['MOREL Tom', 'PETIT Sam']);
  });

  it('total expliqué = écart total, résiduel nul avec des lignes complètes', () => {
    expect(analysis.totalDiff).toBe(1100);
    expect(analysis.residual).toBe(0);
    expect(analysis.causes.reduce((sum, cause) => sum + cause.amount, 0) + analysis.residual).toBeCloseTo(analysis.totalDiff, 2);
  });

  it('un écart de totaux non expliqué par les lignes va dans le résiduel, somme exacte', () => {
    const withGap = analyzePayrollVariance({ current, previous, currentTotal: 4950.37, previousTotal: 3800 });
    expect(withGap.residual).toBe(50.37);
    expect(withGap.causes.reduce((sum, cause) => sum + Math.round(cause.amount * 100), 0) + Math.round(withGap.residual * 100)).toBe(Math.round(withGap.totalDiff * 100));
  });

  it('heures nulles d\'un côté : tout l\'écart de la personne va dans « Heures / contrat »', () => {
    const result = analyzePayrollVariance({
      current: [line('1', 'DUPONT Jean', 0, 400)],
      previous: [line('1', 'DUPONT Jean', 100, 1000)],
      currentTotal: 400,
      previousTotal: 1000,
    });
    expect(amountOf(result, 'hours')).toBe(-600);
    expect(amountOf(result, 'hourlyRate')).toBeUndefined();
  });

  it('appariement : repli sur le nom quand les clés diffèrent (matricule d\'un côté seulement)', () => {
    const result = analyzePayrollVariance({
      current: [line('00042', 'Jean DUPONT', 100, 1000)],
      previous: [line('DUPONT JEAN', 'DUPONT Jean', 100, 900)],
      currentTotal: 1000,
      previousTotal: 900,
    });
    expect(amountOf(result, 'arrivals')).toBeUndefined();
    expect(amountOf(result, 'departures')).toBeUndefined();
    expect(amountOf(result, 'hourlyRate')).toBe(100);
  });
});
