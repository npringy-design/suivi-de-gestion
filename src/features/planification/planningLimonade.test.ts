import { describe, expect, it } from 'vitest';

import { getDashboardRowIndices } from '@/lib/utils';
import type { AnalyseDaySample, SchoolHolidayCalendar } from '@/types/dataTypes';

import {
  buildBudgetWrites,
  DEFAULT_PLAN_SETTINGS,
  generatePlan,
  planLimonadeDays,
  planMonthlyLimonade,
  planToCsv,
  proposeAnnualLimonade,
  withLimonadeDays,
} from './planningEngine';

const noHolidays: SchoolHolidayCalendar = { zone: 'B', periods: [] };

// Un échantillon par jour de janvier-février 2025 et 2026 : restaurant constant (20 cvts à 20 €),
// limonade selon le jour de semaine (vendredi et samedi à 40 cvts / 8 €, sinon 10 cvts / 10 €).
const buildSamples = (withLimonade: boolean): AnalyseDaySample[] => {
  const samples: AnalyseDaySample[] = [];
  [2025, 2026].forEach(year => {
    [0, 1].forEach(month => {
      const numDays = new Date(year, month + 1, 0).getDate();
      for (let day = 1; day <= numDays; day++) {
        const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const weekday = new Date(`${date}T12:00:00`).getDay();
        const weekend = weekday === 5 || weekday === 6;
        const cvLimo = withLimonade ? (weekend ? 40 : 10) : 0;
        const tmLimo = weekend ? 8 : 10;
        samples.push({
          date, weekday,
          budget: { caMidi: 0, caSoir: 0, caLimo: 0, cvMidi: 0, cvSoir: 0, cvLimo: 0 },
          reel: { caMidi: 400, caSoir: 400, caLimo: cvLimo * tmLimo, vae: 0, cvMidi: 20, cvSoir: 20, cvLimo },
        });
      }
    });
  });
  return samples;
};

const monthSum = (days: Record<string, { cv: number; ca: number }>, key: string) =>
  Object.entries(days).filter(([date]) => date.startsWith(key)).reduce((acc, [, d]) => ({ cv: acc.cv + d.cv, ca: acc.ca + d.ca }), { cv: 0, ca: 0 });

describe('objectifs limonade', () => {
  const samples = buildSamples(true);

  it('propose la moyenne des CA limonade mensuels, comme la VAE', () => {
    const jan2025 = samples.filter(s => s.date.startsWith('2025-01')).reduce((acc, s) => acc + s.reel.caLimo, 0);
    const jan2026 = samples.filter(s => s.date.startsWith('2026-01')).reduce((acc, s) => acc + s.reel.caLimo, 0);
    const feb2025 = samples.filter(s => s.date.startsWith('2025-02')).reduce((acc, s) => acc + s.reel.caLimo, 0);
    const feb2026 = samples.filter(s => s.date.startsWith('2026-02')).reduce((acc, s) => acc + s.reel.caLimo, 0);
    expect(proposeAnnualLimonade(samples)).toBe(Math.round((jan2025 + jan2026) / 2 + (feb2025 + feb2026) / 2));
  });

  it('applique la priorité : mois saisi, sinon annuel × poids, sinon historique', () => {
    const history = planMonthlyLimonade(samples, null, {});
    expect(history[0]).toBeGreaterThan(0);
    expect(history[5]).toBe(0);
    const annual = planMonthlyLimonade(samples, 10000, {});
    expect(annual[0] + annual[1]).toBeCloseTo(10000, 1);
    const typed = planMonthlyLimonade(samples, 10000, { 0: 8000 });
    expect(typed[0]).toBe(8000);
    expect(typed[1]).toBe(annual[1]);
  });
});

describe('planLimonadeDays', () => {
  const samples = buildSamples(true);

  it('répartit le CA du mois sur les jours, à moins d\'un demi-TM de la cible', () => {
    const days = planLimonadeDays(samples, noHolidays, 2027, { 0: 8000 });
    const january = monthSum(days, '2027-01');
    expect(Math.abs(january.ca - 8000)).toBeLessThan(5);
    expect(monthSum(days, '2027-03')).toEqual({ cv: 0, ca: 0 });
  });

  it('pèse davantage les jours de semaine à fort CA limonade, avec le TM de leur groupe', () => {
    const days = planLimonadeDays(samples, noHolidays, 2027, { 0: 8000 });
    expect(days['2027-01-01'].ca).toBeGreaterThan(0);
    // 2027-01-08 est un vendredi (TM groupe 8 €), 2027-01-04 un lundi (TM groupe 10 €)
    expect(days['2027-01-08'].tm).toBe(8);
    expect(days['2027-01-04'].tm).toBe(10);
    expect(days['2027-01-08'].ca).toBeGreaterThan(days['2027-01-04'].ca);
    expect(days['2027-01-08'].ca).toBeCloseTo(days['2027-01-08'].cv * 8, 2);
  });

  it('n\'influence jamais le plan restaurant', () => {
    const settings = DEFAULT_PLAN_SETTINGS(2027);
    expect(JSON.stringify(generatePlan(buildSamples(true), noHolidays, settings)))
      .toBe(JSON.stringify(generatePlan(buildSamples(false), noHolidays, settings)));
  });
});

describe('écriture et exports limonade', () => {
  const samples = buildSamples(true);
  const plan = generatePlan(samples, noHolidays, DEFAULT_PLAN_SETTINGS(2027));
  const monthly = planMonthlyLimonade(samples, null, {});
  const withLimo = withLimonadeDays(plan, planLimonadeDays(samples, noHolidays, 2027, monthly));
  const rIdx = getDashboardRowIndices(0, 2027)[8];

  it('écrit couverts et TM limonade (cols 14/15) mais jamais le CA limonade (col 2)', () => {
    const writes = buildBudgetWrites(2027, withLimo, {}, 'ecraser');
    const cells = writes.valuesByMonth[0];
    expect(Number(cells[`${rIdx}-14`])).toBeGreaterThan(0);
    expect(cells[`${rIdx}-15`]).toBe('8.00');
    expect(cells[`${rIdx}-2`]).toBeUndefined();
    // mars : aucun historique limonade -> cellules vides (effacement en mode écraser)
    const marchIdx = getDashboardRowIndices(2, 2027)[8];
    expect(writes.valuesByMonth[2][`${marchIdx}-14`]).toBe('');
    expect(writes.valuesByMonth[2][`${marchIdx}-15`]).toBe('');
  });

  it('sans limonade (Hippo), aucune cellule limonade n\'est écrite et le CSV est inchangé', () => {
    const writes = buildBudgetWrites(2027, plan, {}, 'ecraser');
    expect(writes.valuesByMonth[0][`${rIdx}-14`]).toBeUndefined();
    expect(writes.valuesByMonth[0][`${rIdx}-15`]).toBeUndefined();
    expect(planToCsv(plan).split('\r\n')[0]).toBe('﻿Date;Jour;Statut;Service;Couverts;TM;CA;Confiance;Échantillons;Source;Estimateur;Modifié');
    expect(planToCsv(withLimo).split('\r\n')[0]).toContain(';Cvts limo;TM limo;CA limo');
  });
});
