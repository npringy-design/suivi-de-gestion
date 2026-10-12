import { describe, expect, it } from 'vitest';

import { getSchoolHolidayCalendar } from '@/lib/schoolHolidays';
import { getDashboardRowIndices } from '@/lib/utils';
import type { AnalyseDaySample, PlanSettings, SchoolHolidayCalendar } from '@/types/dataTypes';

import {
  applyOverrides,
  buildBudgetWrites,
  dailyWeights,
  DEFAULT_PLAN_SETTINGS,
  detectExistingBudget,
  estimateEntries,
  generatePlan,
  holidayRatio,
  monthlyWeights,
  planToCsv,
  proposeAnnualCA,
  summarizeByMonth,
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

  it('donne la priorité au jour férié sur les vacances scolaires', () => {
    const zoneB = getSchoolHolidayCalendar('B');
    expect(vacationStatusOf('2027-12-25', zoneB)).toBe('ferie'); // pendant les vacances de Noël
    expect(vacationStatusOf('2027-05-06', zoneB)).toBe('ferie'); // Ascension
  });
});

describe('estimateEntries', () => {
  const entry = (year: number, cv: number, tm: number) => ({ year, cv, tm, ca: cv * tm });

  it('utilise la médiane sous 5 échantillons, années à parts égales', () => {
    const result = estimateEntries([entry(2025, 20, 20), entry(2026, 40, 30)]);
    expect(result.estimator).toBe('mediane');
    expect(result.cv).toBe(30);
  });

  it('utilise la moyenne à parts égales entre années quand les données sont régulières', () => {
    const entries = [
      ...[20, 20, 20].map(cv => entry(2025, cv, 20)),
      ...[40, 40, 40].map(cv => entry(2026, cv, 20)),
    ];
    const result = estimateEntries(entries);
    expect(result.estimator).toBe('moyenne');
    expect(result.cv).toBeCloseTo(30);
  });

  it('bascule sur la médiane en présence d\'un outlier', () => {
    const entries = [24, 25, 25, 26, 25, 90].map(cv => entry(2026, cv, 20));
    const result = estimateEntries(entries);
    expect(result.estimator).toBe('mediane');
    expect(result.cv).toBeLessThanOrEqual(26);
  });

  it('reporte tout le poids sur l\'année disponible', () => {
    const result = estimateEntries([entry(2026, 30, 20), entry(2026, 30, 20), entry(2026, 30, 20), entry(2026, 30, 20), entry(2026, 30, 20)]);
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
    expect(jan4.midi.cv).toBe(25); // moyenne à parts égales : (20 + 30) / 2
    expect(jan4.midi.tm).toBeCloseTo(23, 2);
    expect(jan4.midi.ca).toBeCloseTo(25 * 23, 0);
    expect(jan4.midi.n).toBe(8);
    expect(jan4.midi.confidence).toBe('fiable');
  });

  it('applique des croissances distinctes couverts / TM avec surcharge mensuelle', () => {
    const plan = generatePlan(samples, noHolidays, settings({
      cvGrowthPct: 10, tmGrowthPct: 4, cvGrowthByMonth: { 0: 0 },
    }));
    const jan = plan.find(d => d.date === '2027-01-04')!;
    expect(jan.midi.cv).toBe(25); // surcharge janvier : 0 %
    expect(jan.midi.tm).toBeCloseTo(23.92, 1); // 23 × 1,04
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

// Lundis ordinaires de 2025/2026 + un lundi férié par année (lundi de Pâques).
describe('jours fériés', () => {
  const normal = [...mondays2025, ...mondays2026].map(d => sample(d, 40, 20));
  const holidays = [sample('2025-04-21', 60, 24), sample('2026-04-06', 80, 20)]; // ratios cv 1,5 et 2 ; tm 1,2 et 1
  const withHolidays = [...normal, ...holidays];

  it('calcule le ratio férié / jour normal du même jour de semaine, moyenné', () => {
    const ratio = holidayRatio(withHolidays, noHolidays, 'midi', 1);
    expect(ratio.cv).toBeCloseTo(1.75);
    expect(ratio.tm).toBeCloseTo(1.1);
  });

  it('replie sur tous les jours de semaine, puis sur 1 sans aucun férié', () => {
    expect(holidayRatio(withHolidays, noHolidays, 'midi', 3).cv).toBeCloseTo(1.75);
    expect(holidayRatio(normal, noHolidays, 'midi', 1)).toEqual({ cv: 1, tm: 1 });
  });

  it('applique le ratio à la proposition du jour normal avec la source « ferie »', () => {
    const plan = generatePlan(withHolidays, noHolidays, settings());
    const easterMonday = plan.find(d => d.date === '2027-03-29')!;
    expect(easterMonday.status).toBe('ferie');
    expect(easterMonday.holiday).toBe('Lundi de Pâques');
    expect(easterMonday.midi.source).toBe('ferie');
    expect(easterMonday.midi.cv).toBe(70); // 40 × 1,75
    expect(easterMonday.midi.tm).toBeCloseTo(22, 1); // 20 × 1,1
    const normalMonday = plan.find(d => d.date === '2027-03-22')!;
    expect(normalMonday.midi.source).toBe('groupe');
    expect(normalMonday.midi.cv).toBe(40);
  });
});

describe('pilotage par CA', () => {
  const january = ['2025-01-06', '2025-01-13', '2025-01-20', '2025-01-27', '2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26'];
  const february = ['2025-02-03', '2025-02-10', '2025-02-17', '2025-02-24', '2026-02-02', '2026-02-09', '2026-02-16', '2026-02-23'];
  const history = [
    ...january.map(d => sample(d, 25, 20)), // 500 € par lundi
    ...february.map(d => sample(d, 50, 20)), // 1 000 € par lundi
  ];

  it('propose la moyenne des CA annuels et les poids de mois', () => {
    expect(proposeAnnualCA(history)).toBe(6000); // 2 000 + 4 000 par an
    const weights = monthlyWeights(history);
    expect(weights[0]).toBeCloseTo(1 / 3);
    expect(weights[1]).toBeCloseTo(2 / 3);
    expect(weights[5]).toBe(0);
  });

  it('normalise les poids de jours à 1 sur le mois cible', () => {
    const weights = dailyWeights(history, noHolidays, 2027, 0);
    expect(Object.keys(weights)).toHaveLength(31);
    expect(Object.values(weights).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(weights['2027-01-05']).toBe(0); // mardi : aucun historique
    expect(weights['2027-01-04']).toBeGreaterThan(0);
  });

  it('sans objectif, la proposition reste historique', () => {
    const plan = generatePlan(history, noHolidays, settings());
    // le groupe « lundi » mêle janvier et février : (25 + 50) / 2
    expect(plan.find(d => d.date === '2027-01-04')!.midi.cv).toBe(38);
  });

  it('répartit le CA annuel en mois puis en jours, TM historique inchangé', () => {
    const plan = generatePlan(history, noHolidays, settings({ targetAnnualCA: 12000 }));
    const months = summarizeByMonth(plan);
    expect(Math.abs(months[0].caMidi - 4000)).toBeLessThan(20); // 12 000 × 1/3, à moins d'un TM près
    expect(Math.abs(months[1].caMidi - 8000)).toBeLessThan(20);
    const monday = plan.find(d => d.date === '2027-01-04')!;
    expect(monday.midi.tm).toBe(20);
    expect(monday.midi.cv).toBeGreaterThan(25);
  });

  it('un CA mensuel saisi écrase ce mois sans toucher aux autres', () => {
    const base = generatePlan(history, noHolidays, settings({ targetAnnualCA: 12000 }));
    const plan = generatePlan(history, noHolidays, settings({ targetAnnualCA: 12000, targetMonthlyCA: { 0: 2000 } }));
    const months = summarizeByMonth(plan);
    expect(Math.abs(months[0].caMidi - 2000)).toBeLessThan(20);
    expect(months[1]).toEqual(summarizeByMonth(base)[1]);
  });

  it('un CA mensuel seul pilote ce mois, les autres restent historiques', () => {
    const plan = generatePlan(history, noHolidays, settings({ targetMonthlyCA: { 0: 2000 } }));
    const months = summarizeByMonth(plan);
    expect(Math.abs(months[0].caMidi - 2000)).toBeLessThan(20);
    expect(months[1]).toEqual(summarizeByMonth(generatePlan(history, noHolidays, settings()))[1]);
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
