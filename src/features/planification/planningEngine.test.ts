import { describe, expect, it } from 'vitest';

import { getSchoolHolidayCalendar } from '@/lib/schoolHolidays';
import { getDashboardRowIndices } from '@/lib/utils';
import type { AnalyseDaySample, PlanSettings, SchoolHolidayCalendar } from '@/types/dataTypes';

import { findComparableDay, type ComparableContext } from './comparableDays';
import { enforceTmFloors, tmFloors } from './planningTargets';
import {
  applyOverrides,
  buildBudgetWrites,
  dailyWeights,
  DEFAULT_PLAN_SETTINGS,
  detectExistingBudget,
  estimateEntries,
  generatePlan,
  holidayRatio,
  planToCsv,
  proposeAnnualCA,
  proposeMonthlyCaByMonth,
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
    sample('2026-12-28', 0, 0), // lundi fermé en fin d'année : l'historique ne s'arrête pas en cours de mois
  ];

  it('génère 365 jours pour 2027 avec le jour de semaine réel', () => {
    const plan = generatePlan(samples, noHolidays, settings());
    expect(plan).toHaveLength(365);
    const jan4 = plan.find(d => d.date === '2027-01-04')!;
    expect(jan4.weekday).toBe(1);
    // jour comparable : lundi 5/01/2026 (30 cv à 25 €) ; N-2 (20 cv à 20 €) remis au niveau de N-1 : même valeur
    expect(jan4.midi.cv).toBe(30);
    expect(jan4.midi.tm).toBeCloseTo(25, 0); // relevé au plancher annuel de TM (N-1)
    expect(jan4.midi.ca).toBeCloseTo(30 * 25, -1);
    expect(jan4.midi.n).toBe(2); // deux exemples : N-1 et N-2
    expect(jan4.midi.confidence).toBe('fiable');
  });

  it('applique des croissances distinctes couverts / TM avec surcharge mensuelle', () => {
    const plan = generatePlan(samples, noHolidays, settings({
      cvGrowthPct: 10, tmIncreaseEur: 0.2, cvGrowthByMonth: { 0: 0 },
    }));
    const jan = plan.find(d => d.date === '2027-01-04')!;
    expect(jan.midi.cv).toBe(30); // surcharge janvier : 0 %
    expect(jan.midi.tm).toBeCloseTo(25.2, 0); // plancher N-1 (25) + 0,20 €
    const feb = plan.find(d => d.date === '2027-02-01')!;
    expect(feb.midi.source).toBe('groupe');
  });

  it('signale un repli (rouge) quand le statut vacances n\'a pas d\'historique', () => {
    const plan = generatePlan(samples.slice(0, -1), getSchoolHolidayCalendar('B'), settings());
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

  const annual = 2 * proposeAnnualCA(history, noHolidays, 2027); // objectif : le double du CA proposé, chaque mois double

  it('le CA annuel proposé est la somme des jours, les mois la somme de leurs jours', () => {
    const plan = generatePlan(history, noHolidays, settings());
    const sum = plan.reduce((acc, d) => acc + d.midi.ca + d.soir.ca, 0);
    expect(proposeAnnualCA(history, noHolidays, 2027)).toBe(Math.round(sum));
    const months = proposeMonthlyCaByMonth(history, noHolidays, 2027);
    expect(months[0]).toBeCloseTo(summarizeByMonth(plan)[0].caMidi, 0);
    expect(months[0]).toBeCloseTo(2000); // 4 lundis de janvier 2027 repris de janvier 2026 : 25 cv × 20 €
    expect(months[1]).toBeCloseTo(4000); // février : 50 cv × 20 € par lundi
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
    // chaque mois repart de son niveau N-1 : janvier 25 couverts par lundi (février : 50)
    expect(plan.find(d => d.date === '2027-01-04')!.midi.cv).toBe(25);
    expect(plan.find(d => d.date === '2027-02-01')!.midi.cv).toBe(50);
  });

  it('répartit le CA annuel en mois puis en jours, TM historique inchangé', () => {
    const plan = generatePlan(history, noHolidays, settings({ targetAnnualCA: annual }));
    const months = summarizeByMonth(plan);
    expect(Math.abs(months[0].caMidi - 4000)).toBeLessThan(40); // même ratio sur tous les mois : janvier 2 × 2 000
    expect(Math.abs(months[1].caMidi - 8000)).toBeLessThan(40);
    const monday = plan.find(d => d.date === '2027-01-04')!;
    expect(monday.midi.tm).toBe(20);
    expect(monday.midi.cv).toBeGreaterThan(25);
  });

  it('la croissance couverts et la hausse de TM s\'ajoutent au CA cible', () => {
    const target = { targetAnnualCA: annual };
    const base = summarizeByMonth(generatePlan(history, noHolidays, settings(target)));
    const grown = summarizeByMonth(generatePlan(history, noHolidays, settings({ ...target, cvGrowthPct: 5 })));
    expect(grown[0].caMidi / base[0].caMidi).toBeCloseTo(1.05, 1); // arrondi des couverts par jour
    expect(grown[1].caMidi / base[1].caMidi).toBeCloseTo(1.05, 1); // arrondi des couverts par jour
    const withTm = summarizeByMonth(generatePlan(history, noHolidays, settings({ ...target, tmIncreaseEur: 1 })));
    expect(withTm[0].caMidi / base[0].caMidi).toBeCloseTo(21 / 20, 2); // TM 20 → 21 à couverts constants
    expect(withTm[0].cvMidi).toBe(base[0].cvMidi);
  });

  it('un CA mensuel saisi écrase ce mois sans toucher aux autres', () => {
    const base = generatePlan(history, noHolidays, settings({ targetAnnualCA: annual }));
    const plan = generatePlan(history, noHolidays, settings({ targetAnnualCA: annual, targetMonthlyCA: { 0: 2000 } }));
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

describe('méthode du jour comparable', () => {
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const allDays = (year: number, month: number, cv: (date: Date) => number, tm = 25) => {
    const count = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: count }, (_, i) => {
      const date = new Date(year, month, i + 1);
      return sample(iso(date), cv(date), tm);
    });
  };
  // Vacances d'hiver 2026 (9 au 22 février) pour le statut scolaire ; tout le reste hors vacances.
  const statusOf = (date: string) => (date >= '2026-02-09' && date <= '2026-02-22' ? 'vacances' as const : 'hors_vacances' as const);
  const contextOf = (samples: AnalyseDaySample[], schoolStatusOf = statusOf): ComparableContext => ({
    samplesByDate: new Map(samples.map(s => [s.date, s])),
    schoolStatusOf,
    holidayRatio: () => ({ cv: 1, tm: 1 }),
  });
  const feb2026 = allDays(2026, 1, () => 20);

  it('le jour comparable est la date cible moins 364 jours (même jour de semaine)', () => {
    const ctx = contextOf(allDays(2026, 0, () => 20));
    const found = findComparableDay(ctx, '2027-01-22', 1);
    expect(found?.sample.date).toBe('2026-01-23'); // vendredi → vendredi
    expect(new Date('2027-01-22T12:00:00').getDay()).toBe(new Date('2026-01-23T12:00:00').getDay());
  });

  it('un candidat en vacances pour un jour hors vacances : jour hors vacances le plus proche', () => {
    const ctx = contextOf(feb2026);
    // 12/02/2027 (hors vacances) → candidat 13/02/2026 en vacances → 6/02/2026, le vendredi hors vacances le plus proche
    expect(statusOf('2026-02-13')).toBe('vacances');
    expect(findComparableDay(ctx, '2027-02-12', 1)?.sample.date).toBe('2026-02-06');
  });

  it('un férié mobile reprend le même férié de l\'an passé, un férié sans équivalent exact passe par le ratio férié', () => {
    const may = [...allDays(2026, 4, () => 20), ...allDays(2026, 6, () => 20)];
    const ctx = contextOf(may);
    const ascension = findComparableDay(ctx, '2027-05-06', 1); // Ascension 2027 (jeudi) → Ascension 2026 (jeudi 14 mai)
    expect(ascension?.sample.date).toBe('2026-05-14');
    expect(ascension?.sameHoliday).toBe(true);
    const bastille = findComparableDay(ctx, '2027-07-14', 1); // mercredi, le 14 juillet 2026 tombait un mardi
    expect(bastille?.needsHolidayRatio).toBe(true);
    expect(bastille?.sample.date).toBe('2026-07-15');
  });

  it('N-2 plus faible de 20 % : la proposition reste au niveau de N-1', () => {
    const history = [...allDays(2025, 1, () => 16), ...allDays(2026, 1, () => 20), sample('2026-12-31', 0, 0)];
    const plan = generatePlan(history, noHolidays, settings());
    const day = plan.find(d => d.date === '2027-02-10')!;
    expect(day.midi.cv).toBe(20);
    expect(day.midi.tm).toBeCloseTo(25, 2);
    expect(day.midi.confidence).toBe('fiable'); // remis au niveau de N-1 : écart nul
  });

  it('un seul exemple ou un écart de plus de 40 % : confiance faible', () => {
    const single = generatePlan([...feb2026, sample('2026-12-31', 0, 0)], noHolidays, settings());
    expect(single.find(d => d.date === '2027-02-10')!.midi.confidence).toBe('faible');
    const apart = generatePlan([...allDays(2025, 1, d => (d.getDate() === 10 ? 5 : 20)), ...allDays(2026, 1, () => 20)], noHolidays, settings());
    // N-2 du 10/02/2027 : le 12/02/2025, mais le niveau du mois est recalé ; le jour reste dans l'écart toléré s'il est proche
    expect(['fiable', 'faible']).toContain(apart.find(d => d.date === '2027-02-10')!.midi.confidence);
  });

  it('un jour sans aucun historique est en confiance critique', () => {
    const plan = generatePlan([...feb2026, sample('2026-12-31', 0, 0)], noHolidays, settings());
    expect(plan.find(d => d.date === '2027-06-15')!.midi.confidence).toBe('critique');
  });

  it('un service fermé le jour comparable reste fermé', () => {
    const history = [...allDays(2026, 1, d => (d.getDay() === 1 ? 0 : 20)), sample('2026-12-31', 0, 0)];
    const monday = generatePlan(history, noHolidays, settings()).find(d => d.date === '2027-02-08')!;
    expect(monday.midi.cv).toBe(0);
    expect(monday.midi.source).toBe('ferme');
  });

  it('février 2027 avec moins de vacances que février 2026 reprend les jours hors vacances de N-1', () => {
    // 2026 : vacances 9-22 février (CA 40 cv), le reste 20 cv ; 2027 : aucune vacance en calendrier cible vide.
    const history = [...allDays(2026, 1, d => (d.getDate() >= 9 && d.getDate() <= 22 ? 40 : 20)), sample('2026-12-31', 0, 0)];
    const calendar: SchoolHolidayCalendar = { zone: 'B', periods: [{ name: 'Hiver', schoolYear: 'test', start: '2026-02-09', end: '2026-02-22' }, { name: 'Hiver', schoolYear: 'test', start: '2027-02-15', end: '2027-02-21' }] };
    const plan = generatePlan(history, calendar, settings());
    const feb = summarizeByMonth(plan)[1];
    expect(feb.caMidi).toBeLessThan(28 * 20 * 25 + 14 * 20 * 25); // inférieur à février 2026 (14 jours de vacances)
    expect(feb.caMidi).toBeGreaterThan(28 * 20 * 25); // mais au moins le niveau d'un mois sans vacances
  });
});

describe('VAE à part du TM restaurant', () => {
  const withVae = (date: string, vae: number): AnalyseDaySample => {
    const base = sample(date, 25, 20);
    return { ...base, reel: { ...base.reel, vae } };
  };
  const january = ['2025-01-06', '2025-01-13', '2025-01-20', '2025-01-27', '2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26'];
  const february = ['2025-02-03', '2025-02-10', '2025-02-17', '2025-02-24', '2026-02-02', '2026-02-09', '2026-02-16', '2026-02-23'];
  const history = [...january.map(d => withVae(d, 100)), ...february.map(d => withVae(d, 300))];

  it('le VAE n\'influence ni le CA ni le TM restaurant du plan', () => {
    const noVae = history.map(h => ({ ...h, reel: { ...h.reel, vae: 0 } }));
    expect(generatePlan(history, noHolidays, settings())).toEqual(generatePlan(noVae, noHolidays, settings()));
  });
});

describe('plancher de TM (N-1)', () => {
  // 2025 : TM 20 ; 2026 : TM 24 → moyenne 22, plancher 24.
  const history = [
    ...mondays2025.map(d => sample(d, 30, 20)),
    ...mondays2026.map(d => sample(d, 30, 24)),
  ];

  it('ne descend jamais sous le TM de N-1, même avec une croissance TM négative', () => {
    const plan = generatePlan(history, noHolidays, settings({ tmIncreaseEur: -2 }));
    expect(plan.find(d => d.date === '2027-01-04')!.midi.tm).toBeGreaterThanOrEqual(24);
  });

  it('ajoute la hausse en euros au TM de N-1, au global et par mois', () => {
    const plan = generatePlan(history, noHolidays, settings({ tmIncreaseEur: 0.25, tmIncreaseEurByMonth: { 1: 0.1 } }));
    expect(plan.find(d => d.date === '2027-01-04')!.midi.tm).toBeGreaterThanOrEqual(24.25);
    const total = plan.reduce((acc, d) => ({ cv: acc.cv + d.midi.cv, ca: acc.ca + d.midi.ca }), { cv: 0, ca: 0 });
    expect(total.ca / total.cv).toBeGreaterThan(24.1); // le plancher ne l'absorbe pas
  });

  it('un objectif de CA plus bas fait baisser les couverts, pas le TM', () => {
    const base = generatePlan(history, noHolidays, settings());
    const plan = generatePlan(history, noHolidays, settings({ targetMonthlyCA: { 0: 1000 } }));
    const monday = plan.find(d => d.date === '2027-01-04')!;
    expect(monday.midi.tm).toBeGreaterThanOrEqual(24);
    expect(monday.midi.cv).toBeLessThan(base.find(d => d.date === '2027-01-04')!.midi.cv);
  });
});

describe('plancher de TM mensuel et annuel (N-1)', () => {
  const history = [
    ...mondays2025.map(d => sample(d, 30, 20)),
    ...mondays2026.map(d => sample(d, 30, 24)),
  ];
  const plan = generatePlan(history, noHolidays, settings());
  const totals = (days: typeof plan) => {
    const cv = days.reduce((acc, d) => acc + d.midi.cv + d.soir.cv, 0);
    const ca = days.reduce((acc, d) => acc + d.midi.ca + d.soir.ca, 0);
    return { cv, ca, tm: ca / cv };
  };

  it('calcule le TM réalisé de N-1, au total et par mois', () => {
    const floors = tmFloors([...history, sample('2026-01-30', 30, 24)], 2026); // le mois n'est plus partiel
    expect(floors.year).toBeCloseTo(24);
    expect(floors.byMonth[0]).toBeCloseTo(24);
  });

  it('prend le plus haut du TM réalisé et du TM budgété de N-1', () => {
    const withBudget = { ...sample('2026-01-30', 30, 24), budget: { ...emptyValues, caMidi: 30 * 26, cvMidi: 30 } };
    expect(tmFloors([withBudget], 2026).year).toBeCloseTo(26); // budget 26 > réalisé 24
    expect(tmFloors([sample('2026-01-30', 30, 24)], 2026).year).toBeCloseTo(24); // pas de budget : réalisé
  });

  it('relève le TM annuel au plancher en baissant les couverts, CA conservé', () => {
    const before = totals(plan);
    const after = totals(enforceTmFloors(plan, { byMonth: {}, year: before.tm * 1.1 }));
    expect(after.tm).toBeGreaterThanOrEqual(before.tm * 1.1 - 0.01);
    expect(after.cv).toBeLessThan(before.cv);
    expect(Math.abs(after.ca - before.ca)).toBeLessThan(before.ca * 0.005); // arrondi des couverts par jour
  });

  it('ne touche à rien quand le TM dépasse déjà le plancher', () => {
    expect(enforceTmFloors(plan, { byMonth: { 0: 1 }, year: 1 })).toEqual(plan);
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
