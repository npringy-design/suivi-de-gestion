import { describe, expect, it } from 'vitest';

import type { PayrollStoredLine } from '@/types/dataTypes';

import { analyzePayrollVariance } from './payrollVarianceAnalysis';

const line = (key: string, nom: string, heures: number, coutGlobal: number, exitDate?: string, forfaitJour?: boolean): PayrollStoredLine =>
  ({ key, nom, heures, coutGlobal, ...(exitDate ? { exitDate } : {}), ...(forfaitJour ? { forfaitJour } : {}) });

const previous = [
  line('1', 'DUPONT Jean', 100, 1000), // heures +10 en N
  line('2', 'MARTIN Paul', 100, 1000), // coût horaire 10 → 11 en N
  line('3', 'DURAND Anne', 100, 1000), // inchangée
  line('4', 'BERNARD Luc', 50, 500), // départ
  line('5', 'PETIT Sam', 20, 300, '15/09/2025'), // sortant de N-1 (STC)
  line('6', 'PRINGY Nico', 151.67, 5000, undefined, true), // forfait jour
];
const current = [
  line('1', 'DUPONT Jean', 110, 1100),
  line('2', 'MARTIN Paul', 100, 1100),
  line('3', 'DURAND Anne', 100, 1000),
  line('7', 'LEROY Emma', 80, 800), // arrivée
  line('8', 'MOREL Tom', 30, 900, '22/09/2026'), // sortant de N (STC)
  line('6', 'PRINGY Nico', 151.67, 5200, undefined, true),
];

const cause = (analysis: ReturnType<typeof analyzePayrollVariance>, kind: string) => analysis.causes.find(c => c.kind === kind);

describe('analyzePayrollVariance', () => {
  const analysis = analyzePayrollVariance({ current, previous, currentTotal: 10100, previousTotal: 8800 });

  it('causes sans absences ici, chaque personne dans une seule cause', () => {
    expect(analysis.causes.map(c => c.kind)).toEqual(['entriesExits', 'hours', 'rate']);
    expect(cause(analysis, 'entriesExits')!.amount).toBe(900); // +800 arrivée − 500 départ + 900 STC N − 300 STC N-1
    expect(cause(analysis, 'hours')!.amount).toBe(100); // (110 − 100) × 10
    expect(cause(analysis, 'rate')!.amount).toBe(300); // (11 − 10) × 100 + 200 de rémunération du forfait jour
  });

  it('entrées / sorties : un signe et un tag par personne', () => {
    const tags = Object.fromEntries(cause(analysis, 'entriesExits')!.people.map(p => [p.nom, [p.tag!.label, p.amount]]));
    expect(tags).toEqual({
      'MOREL Tom': ['STC 2026', 900],
      'LEROY Emma': ['Arrivée', 800],
      'BERNARD Luc': ['Départ', -500],
      'PETIT Sam': ['STC 2025', -300],
    });
  });

  it('heures et taux : phrases de détail disponibles, forfait jour = rémunération', () => {
    expect(cause(analysis, 'hours')!.people).toMatchObject([{ nom: 'DUPONT Jean', hours: { from: 100, to: 110 } }]);
    const rate = cause(analysis, 'rate')!.people;
    expect(rate.find(p => p.nom === 'PRINGY Nico')).toMatchObject({ forfait: true, amount: 200 });
    expect(rate.find(p => p.nom === 'MARTIN Paul')).toMatchObject({ rate: { from: 10, to: 11 }, amount: 100 });
  });

  it('total expliqué = écart total, résiduel nul avec des lignes complètes', () => {
    expect(analysis.totalDiff).toBe(1300);
    expect(analysis.residual).toBe(0);
  });

  it('un écart de totaux non expliqué par les lignes va dans le résiduel, somme exacte', () => {
    const withGap = analyzePayrollVariance({ current, previous, currentTotal: 10150.37, previousTotal: 8800 });
    expect(withGap.residual).toBe(50.37);
    const cents = withGap.causes.reduce((sum, c) => sum + Math.round(c.amount * 100), 0) + Math.round(withGap.residual * 100);
    expect(cents).toBe(Math.round(withGap.totalDiff * 100));
  });

  it('résiduel sous 1 € : conservé dans la sortie pour que la somme reste exacte (masqué par l\'UI)', () => {
    const small = analyzePayrollVariance({ current, previous, currentTotal: 10100.4, previousTotal: 8800 });
    expect(Math.abs(small.residual)).toBeLessThan(1);
    expect(small.residual).toBe(0.4);
  });

  it('heures nulles d\'un seul côté : tout l\'écart de la personne va dans « Heures travaillées »', () => {
    const result = analyzePayrollVariance({
      current: [line('1', 'DUPONT Jean', 0, 400)],
      previous: [line('1', 'DUPONT Jean', 100, 1000)],
      currentTotal: 400,
      previousTotal: 1000,
    });
    expect(cause(result, 'hours')!.amount).toBe(-600);
    expect(cause(result, 'rate')).toBeUndefined();
  });

  it('absences : heures nulles des deux côtés (hors forfait jour) → cause dédiée, somme des causes + résiduel = écart', () => {
    const result = analyzePayrollVariance({
      current: [line('1', 'DUPONT Jean', 110, 1210), { ...line('9', 'SOW MOHAMED AL MUSTAFA', 0, 43.25), costOnly: true }],
      previous: [line('1', 'DUPONT Jean', 100, 1000), { ...line('9', 'SOW MOHAMED AL MUSTAFA', 0, 39), costOnly: true }],
      currentTotal: 1253.25,
      previousTotal: 1039,
    });
    expect(result.causes.map(c => c.kind)).toEqual(['hours', 'rate', 'absences']);
    expect(cause(result, 'absences')!.amount).toBe(4.25);
    expect(cause(result, 'absences')!.people).toMatchObject([{ nom: 'SOW MOHAMED AL MUSTAFA', amount: 4.25, costs: { from: 39, to: 43.25 } }]);
    expect(cause(result, 'rate')!.people.map(p => p.nom)).toEqual(['DUPONT Jean']);
    expect(result.residual).toBe(0);
    const cents = result.causes.reduce((sum, c) => sum + Math.round(c.amount * 100), 0) + Math.round(result.residual * 100);
    expect(cents).toBe(Math.round(result.totalDiff * 100));
  });

  it('appariement : repli sur le nom quand les clés diffèrent (matricule d\'un côté seulement)', () => {
    const result = analyzePayrollVariance({
      current: [line('00042', 'Jean DUPONT', 100, 1000)],
      previous: [line('DUPONT JEAN', 'DUPONT Jean', 100, 900)],
      currentTotal: 1000,
      previousTotal: 900,
    });
    expect(cause(result, 'entriesExits')).toBeUndefined();
    expect(cause(result, 'rate')!.amount).toBe(100);
  });
});
