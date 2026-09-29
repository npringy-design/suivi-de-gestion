import { describe, expect, it } from 'vitest';

import { getDashboardRowIndices } from '@/lib/utils';
import type { AnalyseDaySample, AnalyseFilters, MonthData, SchoolHolidayCalendar } from '@/types/dataTypes';

import {
  aggregateByWeekday,
  aggregateDetail,
  aggregateService,
  alertLevel,
  collectDailySamples,
  filterSamples,
  matchesVacationMode,
  resolvePeriod,
} from './ecartsAnalysis';

const YEAR = 2026;
const MONTH = 0; // janvier 2026

type DayInput = Partial<Record<number, string>>;

const buildMonth = (days: Record<number, DayInput>): Record<number, Record<number, MonthData>> => {
  const indices = getDashboardRowIndices(MONTH, YEAR);
  const dashboard: Record<string, string> = {};
  Object.entries(days).forEach(([day, cols]) => {
    Object.entries(cols).forEach(([col, value]) => {
      dashboard[`${indices[Number(day)]}-${col}`] = value as string;
    });
  });
  return { [YEAR]: { [MONTH]: { dashboard } as MonthData } };
};

const sample = (over: Partial<AnalyseDaySample> & { date: string; weekday: number }): AnalyseDaySample => ({
  budget: { caMidi: 0, caSoir: 0, caLimo: 0, cvMidi: 0, cvSoir: 0, cvLimo: 0 },
  reel: { caMidi: 0, caSoir: 0, caLimo: 0, vae: 0, cvMidi: 0, cvSoir: 0, cvLimo: 0 },
  ...over,
});

const calendar: SchoolHolidayCalendar = {
  zone: 'B' as const,
  periods: [
    { name: 'Noël', schoolYear: '2025-2026', start: '2025-12-20', end: '2026-01-04' },
    { name: 'Été', schoolYear: '2025-2026', start: '2026-07-04', end: '2026-08-31', summer: true },
  ],
};

describe('collectDailySamples', () => {
  const data = buildMonth({
    // budget : 10 cvts midi à 20 € = 200 ; 20 cvts soir à 30 € = 600
    5: { 6: '10', 7: '20', 8: '20', 9: '30', 18: '150', 19: '700', 25: '9', 27: '22', 17: '40' },
    6: { 6: '10', 7: '20', 8: '20', 9: '30' }, // budget seul : pas de réalisé
  });

  it('ne retient que les jours réalisés antérieurs à aujourd\'hui, avec budget et réalisé', () => {
    const { months, startIso, endIso } = resolvePeriod({
      periodMode: 'plage', startDate: '2026-01-01', endDate: '2026-12-31', monthKeys: [],
      weekdays: [], service: 'journee', vacationMode: 'all',
    });
    const samples = collectDailySamples(data, months, startIso, endIso, '2026-01-20');

    expect(samples).toHaveLength(1);
    expect(samples[0].date).toBe('2026-01-05');
    expect(samples[0].weekday).toBe(1);
    expect(samples[0].budget.caMidi).toBe(200);
    expect(samples[0].budget.caSoir).toBe(600);
    expect(samples[0].reel.caMidi).toBe(150);
    expect(samples[0].reel.vae).toBe(40);
    expect(samples[0].reel.cvSoir).toBe(22);
  });

  it('exclut aujourd\'hui et les jours futurs même avec du réalisé partiel', () => {
    const { months, startIso, endIso } = resolvePeriod({
      periodMode: 'plage', startDate: '2026-01-01', endDate: '2026-01-31', monthKeys: [],
      weekdays: [], service: 'journee', vacationMode: 'all',
    });
    expect(collectDailySamples(data, months, startIso, endIso, '2026-01-05')).toHaveLength(0);
  });

  it('ignore un mois sans aucune donnée', () => {
    expect(collectDailySamples({}, [{ year: 2026, month: 3 }], '2026-01-01', '2026-12-31', '2026-09-01')).toEqual([]);
  });
});

describe('resolvePeriod', () => {
  const base: AnalyseFilters = {
    periodMode: 'plage', startDate: '2025-11-15', endDate: '2026-02-03', monthKeys: [],
    weekdays: [], service: 'journee', vacationMode: 'all',
  };

  it('liste les mois à cheval sur deux années', () => {
    expect(resolvePeriod(base).months).toEqual([
      { year: 2025, month: 10 }, { year: 2025, month: 11 }, { year: 2026, month: 0 }, { year: 2026, month: 1 },
    ]);
  });

  it('retourne aucun mois si la plage est inversée', () => {
    expect(resolvePeriod({ ...base, startDate: '2026-03-01', endDate: '2026-01-01' }).months).toEqual([]);
  });

  it('trie les mois sélectionnés en mode mois', () => {
    const { months } = resolvePeriod({ ...base, periodMode: 'mois', monthKeys: ['2026-3', '2025-11', '2026-0'] });
    expect(months).toEqual([{ year: 2025, month: 11 }, { year: 2026, month: 0 }, { year: 2026, month: 3 }]);
  });
});

describe('matchesVacationMode', () => {
  it('inclut le premier et le dernier jour de la période', () => {
    expect(matchesVacationMode('2025-12-20', calendar, 'vacances')).toBe(true);
    expect(matchesVacationMode('2026-01-04', calendar, 'vacances')).toBe(true);
    expect(matchesVacationMode('2026-01-05', calendar, 'vacances')).toBe(false);
  });

  it('traite l\'été selon le mode choisi', () => {
    const summerDay = '2026-07-20';
    expect(matchesVacationMode(summerDay, calendar, 'vacances')).toBe(true);
    expect(matchesVacationMode(summerDay, calendar, 'hors_vacances')).toBe(false);
    expect(matchesVacationMode(summerDay, calendar, 'hors_vacances_avec_ete')).toBe(true);
    expect(matchesVacationMode('2026-01-01', calendar, 'hors_vacances_avec_ete')).toBe(false);
    expect(matchesVacationMode('2026-03-10', calendar, 'hors_vacances')).toBe(true);
  });
});

describe('filterSamples', () => {
  it('filtre par jour de semaine et vacances', () => {
    const samples = [
      sample({ date: '2026-01-02', weekday: 5 }),
      sample({ date: '2026-03-06', weekday: 5 }),
      sample({ date: '2026-03-10', weekday: 2 }),
    ];
    const result = filterSamples(samples, { weekdays: [5], vacationMode: 'hors_vacances' }, calendar);
    expect(result.map(s => s.date)).toEqual(['2026-03-06']);
  });
});

describe('aggregateService', () => {
  const samples = [
    sample({
      date: '2026-03-02', weekday: 1,
      budget: { caMidi: 200, caSoir: 600, caLimo: 0, cvMidi: 10, cvSoir: 20, cvLimo: 0 },
      reel: { caMidi: 150, caSoir: 700, caLimo: 0, vae: 0, cvMidi: 8, cvSoir: 22, cvLimo: 0 },
    }),
    sample({
      date: '2026-03-09', weekday: 1,
      budget: { caMidi: 200, caSoir: 600, caLimo: 0, cvMidi: 10, cvSoir: 20, cvLimo: 0 },
      reel: { caMidi: 250, caSoir: 500, caLimo: 0, vae: 0, cvMidi: 12, cvSoir: 18, cvLimo: 0 },
    }),
  ];

  it('calcule moyennes, écarts et impact cumulé sur le midi', () => {
    const agg = aggregateService(samples, 'midi');
    expect(agg.n).toBe(2);
    expect(agg.caReel).toBe(200);
    expect(agg.caBudget).toBe(200);
    expect(agg.caEcart).toBe(0);
    expect(agg.impactCa).toBe(0);
    expect(agg.cvReel).toBe(10);
  });

  it('calcule l\'écart journée et l\'impact = écart moyen × n', () => {
    const agg = aggregateService(samples, 'journee');
    expect(agg.caReel).toBe(800);
    expect(agg.caBudget).toBe(800);
    const soir = aggregateService(samples, 'soir');
    expect(soir.caEcart).toBe(0);
    const withLoss = aggregateService([samples[0], { ...samples[1], reel: { ...samples[1].reel, caSoir: 300 } }], 'soir');
    expect(withLoss.caEcart).toBe(-100);
    expect(withLoss.caEcartPct).toBeCloseTo(-16.67, 1);
    expect(withLoss.impactCa).toBe(-200);
  });

  it('calcule le ticket moyen restaurant réel vs budget (sans limonade)', () => {
    const agg = aggregateService(samples, 'midi');
    // midi : CA réel 400 / 20 cvts = 20 ; budget 400 / 20 = 20
    expect(agg.tmReel).toBe(20);
    expect(agg.tmBudget).toBe(20);
    expect(agg.tmEcart).toBe(0);
    const journee = aggregateService(samples, 'journee');
    expect(journee.tmReel).toBeCloseTo(1600 / 60, 5);
    expect(aggregateService([], 'midi').tmReel).toBeNull();
  });

  it('inclut la limonade dans le CA journée mais pas dans les couverts', () => {
    const withLimo = [sample({
      date: '2026-03-02', weekday: 1,
      budget: { caMidi: 100, caSoir: 100, caLimo: 50, cvMidi: 5, cvSoir: 5, cvLimo: 10 },
      reel: { caMidi: 100, caSoir: 100, caLimo: 80, vae: 20, cvMidi: 5, cvSoir: 5, cvLimo: 12 },
    })];
    const agg = aggregateService(withLimo, 'journee');
    expect(agg.caReel).toBe(280);
    expect(agg.caBudget).toBe(250);
    expect(agg.cvReel).toBe(10);
    const detail = aggregateDetail(withLimo);
    expect(detail.limoCaReel).toBe(80);
    expect(detail.limoCvReel).toBe(12);
    expect(detail.vaeReel).toBe(20);
    expect(detail.caJourAvecVae).toBe(300);
  });

  it('exclut d\'un service un jour à 0 réalisé et 0 budget (service fermé)', () => {
    const closedLunch = sample({
      date: '2026-03-02', weekday: 1,
      budget: { caMidi: 0, caSoir: 600, caLimo: 0, cvMidi: 0, cvSoir: 20, cvLimo: 0 },
      reel: { caMidi: 0, caSoir: 500, caLimo: 0, vae: 0, cvMidi: 0, cvSoir: 18, cvLimo: 0 },
    });
    expect(aggregateService([closedLunch], 'midi').n).toBe(0);
    expect(aggregateService([closedLunch], 'soir').n).toBe(1);
  });

  it('garde un service budgété resté à zéro dans la moyenne', () => {
    const missed = sample({
      date: '2026-03-02', weekday: 1,
      budget: { caMidi: 300, caSoir: 600, caLimo: 0, cvMidi: 10, cvSoir: 20, cvLimo: 0 },
      reel: { caMidi: 0, caSoir: 500, caLimo: 0, vae: 0, cvMidi: 0, cvSoir: 18, cvLimo: 0 },
    });
    const agg = aggregateService([missed], 'midi');
    expect(agg.n).toBe(1);
    expect(agg.caEcart).toBe(-300);
  });

  it('retourne un agrégat vide (pourcentages null) sans échantillon', () => {
    const agg = aggregateService([], 'journee');
    expect(agg.n).toBe(0);
    expect(agg.caEcartPct).toBeNull();
    expect(aggregateDetail([]).n).toBe(0);
  });
});

describe('aggregateByWeekday', () => {
  it('ordonne lundi → dimanche et respecte la sélection', () => {
    const rows = aggregateByWeekday([sample({ date: '2026-03-08', weekday: 0 })], []);
    expect(rows.map(r => r.weekday)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(aggregateByWeekday([], [0, 5]).map(r => r.weekday)).toEqual([5, 0]);
    expect(rows[6].journee.n).toBe(1);
  });
});

describe('alertLevel', () => {
  const thresholds = { ecartPct: -15, ecartEuroJour: -100 };

  it('déclenche sur le seuil % ou le seuil €/jour', () => {
    expect(alertLevel(-10, -50, thresholds, 5)).toBe('none');
    expect(alertLevel(-16, -50, thresholds, 5)).toBe('warning');
    expect(alertLevel(-5, -120, thresholds, 5)).toBe('warning');
    expect(alertLevel(-31, -50, thresholds, 5)).toBe('critical');
    expect(alertLevel(-5, -250, thresholds, 5)).toBe('critical');
  });

  it('ignore le seuil € quand il n\'est pas fourni et les échantillons vides', () => {
    expect(alertLevel(-20, null, thresholds, 3)).toBe('warning');
    expect(alertLevel(null, null, thresholds, 3)).toBe('none');
    expect(alertLevel(-50, -500, thresholds, 0)).toBe('none');
  });
});
