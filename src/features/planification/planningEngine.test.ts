import { describe, expect, it } from 'vitest';

import { getSchoolHolidayCalendar } from '@/lib/schoolHolidays';
import { getDashboardRowIndices } from '@/lib/utils';
import type { AnalyseDaySample, PlanSettings, SchoolHolidayCalendar } from '@/types/dataTypes';

import {
  applyOverrides,
  buildBudgetWrites,
  DEFAULT_PLAN_SETTINGS,
  detectExistingBudget,
  estimateEntries,
  generatePlan,
  planToCsv,
  vacationStatusOf,
} from './planningEngine';

const emptyValues = { caMidi: 0, caSoir: 0, caLimo: 0, cvMidi: 0, cvSoir: 0, cvLimo: 0 };

const sample = (date: string, cvMidi: number, tmMidi: number, cvSoir = 0, tmSoir = 0): AnalyseDaySample => ({
  date,
  weekday: new Date(`${date}T12:00:00`).getDay(),
  budget: emptyValues,
  reel: { ...emptyValues, vae: 0, cvMidi, caMidi: cvMidi * tmMidi, cvSoir, caSoir: cvSoir * tmSoir },
});

const noHolidays: SchoolHolidayCalendar = { zone: 'B', periods: [] };
const settings = (over: Partial<PlanSettings> = {}): PlanSettings => ({ ...DEFAULT_PLAN_SETTINGS(2027), ...over });

// Lundis 2025 (dates réelles) : 6, 13, 20, 27 janvier.
const mondays2025 = ['2025-01-06', '2025-01-13', '2025-01-20', '2025-01-27'];
const mondays2026 = ['2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26'];

describe('vacationStatusOf', () => {
  it('distingue vacances, été et hors vacances selon la zone', () => {
    const zoneB = getSchoolHolidayCalendar('B');
    expect(vacationStatusOf('2027-02-22', zoneB)).toBe('vacances');
    expect(vacationStatusOf('2027-02-22', getSchoolHolidayCalendar('A'))).toBe('vacances');
    expect(vacationStatusOf('2027-02-05', getSchoolHolidayCalendar('C'))).toBe('hors_vacances');
    expect(vacationStatusOf('2027-08-10', zoneB)).toBe('ete');
    expect(vacationStatusOf('2027-10-22', zoneB)).toBe('hors_vacances');
    expect(vacationStatusOf('2027-10-23', zoneB)).toBe('vacances');
    expect(vacationStatusOf('2027-12-31', zoneB)).toBe('vacances');
  });
});

describe('estimateEntries', () => {
  const entry = (year: number, cv: number, tm: number) => ({ year, cv, tm, ca: cv * tm });

  it('utilise la médiane pondérée sous 5 échantillons', () => {
    const result = estimateEntries([entry(2025, 20, 20), entry(2026, 40, 30)], 2026, 60);
    expect(result.estimator).toBe('mediane');
    expect(result.cv).toBe(40);
  });

  it('utilise la moyenne pondérée 40/60 quand les données sont régulières', () => {
    const entries = [
      ...[20, 20, 20].map(cv => entry(2025, cv, 20)),
      ...[40, 40, 40].map(cv => entry(2026, cv, 20)),
    ];
    const result = estimateEntries(entries, 2026, 60);
    expect(result.estimator).toBe('moyenne');
    expect(result.cv).toBeCloseTo(0.4 * 20 + 0.6 * 40);
  });

  it('bascule sur la médiane en présence d\'un outlier', () => {
    const entries = [24, 25, 25, 26, 25, 90].map(cv => entry(2026, cv, 20));
    const result = estimateEntries(entries, 2026, 60);
    expect(result.estimator).toBe('mediane');
    expect(result.cv).toBeLessThanOrEqual(26);
  });

  it('reporte tout le poids sur l\'année disponible', () => {
    const result = estimateEntries([entry(2026, 30, 20), entry(2026, 30, 20), entry(2026, 30, 20), entry(2026, 30, 20), entry(2026, 30, 20)], 2026, 60);
    expect(result.cv).toBeCloseTo(30);
  });
});

describe('generatePlan', () => {
  const samples = [
    ...mondays2025.map(d => sample(d, 20, 20, 30, 30)),
    ...mondays2026.map(d => sample(d, 30, 25, 40, 35)),
  ];

  it('génère 365 jours pour 2027 avec le jour de semaine réel', () => {
    const plan = generatePlan(samples, noHolidays, settings());
    expect(plan).toHaveLength(365);
    const jan4 = plan.find(d => d.date === '2027-01-04')!;
    expect(jan4.weekday).toBe(1);
    expect(jan4.midi.cv).toBe(26); // moyenne pondérée 40 % × 20 + 60 % × 30
    expect(jan4.midi.tm).toBeCloseTo(23.46, 2);
    expect(jan4.midi.ca).toBeCloseTo(26 * 23.46, 0);
    expect(jan4.midi.n).toBe(8);
    expect(jan4.midi.confidence).toBe('fiable');
  });

  it('applique des croissances distinctes couverts / TM avec surcharge mensuelle', () => {
    const plan = generatePlan(samples, noHolidays, settings({
      cvGrowthPct: 10, tmGrowthPct: 4, cvGrowthByMonth: { 0: 0 },
    }));
    const jan = plan.find(d => d.date === '2027-01-04')!;
    expect(jan.midi.cv).toBe(26); // surcharge janvier : 0 %
    expect(jan.midi.tm).toBeCloseTo(24.4, 1); // 23,46 × 1,04
    const feb = plan.find(d => d.date === '2027-02-01')!;
    expect(feb.midi.source).toBe('groupe');
  });

  it('signale un repli (rouge) quand le statut vacances n\'a pas d\'historique', () => {
    const plan = generatePlan(samples, getSchoolHolidayCalendar('B'), settings());
    const vacancesMonday = plan.find(d => d.date === '2027-02-22')!; // lundi, vacances d'hiver zone B
    expect(vacancesMonday.status).toBe('vacances');
    expect(vacancesMonday.midi.source).toBe('repli');
    expect(vacancesMonday.midi.confidence).toBe('critique');
  });

  it('renvoie « aucune » et 0 sans historique pour le jour de semaine', () => {
    const plan = generatePlan(samples, noHolidays, settings());
    const tuesday = plan.find(d => d.date === '2027-01-05')!;
    expect(tuesday.midi.source).toBe('aucune');
    expect(tuesday.midi.cv).toBe(0);
  });

  it('marque un service fermé la plupart du temps', () => {
    const closedSoir = [...mondays2025, ...mondays2026].map(d => sample(d, 25, 20, 0, 0));
    const plan = generatePlan(closedSoir, noHolidays, settings());
    const monday = plan.find(d => d.date === '2027-01-04')!;
    expect(monday.soir.source).toBe('ferme');
    expect(monday.soir.cv).toBe(0);
    expect(monday.midi.cv).toBeGreaterThan(0);
  });
});

describe('applyOverrides', () => {
  it('remplace la proposition et marque le jour comme modifié', () => {
    const plan = generatePlan([sample('2026-01-05', 30, 25)], noHolidays, settings());
    const [edited] = applyOverrides(plan.slice(0, 1), { '2027-01-01': { midi: { cv: 10, tm: 12.5 } } });
    expect(edited.midi).toMatchObject({ cv: 10, tm: 12.5, ca: 125, manual: true, confidence: 'fiable' });
  });
});

describe('écriture dans les prévisions', () => {
  const ROW = getDashboardRowIndices(0, 2027)[4]; // lundi 4 janvier 2027
  const plan = generatePlan(
    [...mondays2025, ...mondays2026].map(d => sample(d, 25, 20, 30, 30)),
    noHolidays,
    settings(),
  ).filter(d => d.month === 0 && d.weekday === 1);

  it('détecte les prévisions existantes par mois', () => {
    
    expect(detectExistingBudget(2027, { 0: { [ROW + '-6']: '20' } })).toEqual({ 0: 1 });
    expect(detectExistingBudget(2027, { 0: { [ROW + '-6']: '' } })).toEqual({});
  });

  it('écrase ou complète selon le mode et n\'écrit que les colonnes 6 à 9', () => {
    const existing = { 0: { [ROW + '-6']: '99' } };
    const overwrite = buildBudgetWrites(2027, plan, existing, 'ecraser');
    expect(overwrite.daysWritten).toBe(plan.length);
    expect(overwrite.daysOverwritten).toBe(1);
    expect(overwrite.valuesByMonth[0][ROW + '-6']).toBe('25');
    expect(Object.keys(overwrite.valuesByMonth[0]).every(key => /-(6|7|8|9)$/.test(key))).toBe(true);

    const fill = buildBudgetWrites(2027, plan, existing, 'completer');
    expect(fill.daysSkipped).toBe(1);
    expect(fill.valuesByMonth[0][ROW + '-6']).toBeUndefined();
    expect(fill.daysWritten).toBe(plan.length - 1);
  });
});

describe('planToCsv', () => {
  it('produit deux lignes (midi, soir) par jour avec décimale virgule', () => {
    const plan = generatePlan([sample('2026-01-05', 30, 25.5)], noHolidays, settings()).slice(0, 1);
    const lines = planToCsv(plan).split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('Confiance');
    expect(lines[1].split(';')[0]).toBe('2027-01-01');
  });
});
