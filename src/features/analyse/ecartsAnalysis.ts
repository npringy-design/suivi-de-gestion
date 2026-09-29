import { parseMoneyValue } from '@/lib/money';
import { getDashboardRowIndices } from '@/lib/utils';
import { computeMonthDashboard } from '@/features/edg/edgRealtimeSources';
import type {
  AnalyseAggregate,
  AnalyseAlertLevel,
  AnalyseDaySample,
  AnalyseDetail,
  AnalyseFilters,
  AnalyseService,
  AnalyseThresholds,
  AnalyseVacationMode,
  AnalyseWeekdayRow,
  MonthData,
  SchoolHolidayCalendar,
} from '@/types/dataTypes';

export type AnalyseMonthRef = { year: number; month: number };

// Ordre d'affichage : lundi → dimanche (getDay() : 0 = dimanche).
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export const toIsoDate = (year: number, month: number, day: number): string =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

export const monthKey = (year: number, month: number): string => `${year}-${month}`;

export const parseMonthKey = (key: string): AnalyseMonthRef | null => {
  const [year, month] = key.split('-').map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 0 || month > 11) return null;
  return { year, month };
};

const NO_LOWER_BOUND = '0000-01-01';
const NO_UPPER_BOUND = '9999-12-31';

// Liste des mois à charger + bornes ISO inclusives de la période filtrée.
export function resolvePeriod(filters: AnalyseFilters): { months: AnalyseMonthRef[]; startIso: string; endIso: string } {
  if (filters.periodMode === 'mois') {
    const months = filters.monthKeys
      .map(parseMonthKey)
      .filter((ref): ref is AnalyseMonthRef => ref !== null)
      .sort((a, b) => a.year - b.year || a.month - b.month);
    return { months, startIso: NO_LOWER_BOUND, endIso: NO_UPPER_BOUND };
  }

  const start = parseIsoParts(filters.startDate);
  const end = parseIsoParts(filters.endDate);
  if (!start || !end || filters.startDate > filters.endDate) return { months: [], startIso: filters.startDate, endIso: filters.endDate };

  const months: AnalyseMonthRef[] = [];
  let year = start.year;
  let month = start.month;
  while (year < end.year || (year === end.year && month <= end.month)) {
    months.push({ year, month });
    month += 1;
    if (month > 11) { month = 0; year += 1; }
  }
  return { months, startIso: filters.startDate, endIso: filters.endDate };
}

const parseIsoParts = (iso: string): { year: number; month: number; day: number } | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) };
};

// Une entrée par jour réellement réalisé (col 21 > 0) et strictement antérieur à aujourd'hui :
// aujourd'hui peut n'avoir qu'un service saisi, les jours futurs n'ont que du budget.
export function collectDailySamples(
  allData: Record<number, Record<number, MonthData>>,
  months: AnalyseMonthRef[],
  startIso: string,
  endIso: string,
  todayIso: string,
): AnalyseDaySample[] {
  const samples: AnalyseDaySample[] = [];

  months.forEach(({ year, month }) => {
    const monthData = allData[year]?.[month];
    const computed = computeMonthDashboard(monthData, month, year);
    if (Object.keys(computed).length === 0) return;

    const indices = getDashboardRowIndices(month, year);
    Object.entries(indices).forEach(([dayKey, rIdx]) => {
      const day = Number(dayKey);
      const date = toIsoDate(year, month, day);
      if (date < startIso || date > endIso || date >= todayIso) return;

      const cell = (col: number) => parseMoneyValue(computed[`${rIdx}-${col}`]);
      if (cell(21) <= 0) return;

      samples.push({
        date,
        weekday: new Date(year, month, day).getDay(),
        budget: {
          caMidi: cell(0), caSoir: cell(1), caLimo: cell(2),
          cvMidi: cell(6), cvSoir: cell(8), cvLimo: cell(14),
        },
        reel: {
          caMidi: cell(18), caSoir: cell(19), caLimo: cell(20), vae: cell(17),
          cvMidi: cell(25), cvSoir: cell(27), cvLimo: cell(34),
        },
      });
    });
  });

  return samples;
}

export function matchesVacationMode(
  date: string,
  calendar: SchoolHolidayCalendar,
  mode: AnalyseVacationMode,
): boolean {
  if (mode === 'all') return true;
  const inAny = calendar.periods.some(p => date >= p.start && date <= p.end);
  const inNonSummer = calendar.periods.some(p => !p.summer && date >= p.start && date <= p.end);
  if (mode === 'vacances') return inAny;
  if (mode === 'hors_vacances') return !inAny;
  return !inNonSummer;
}

export function filterSamples(
  samples: AnalyseDaySample[],
  filters: Pick<AnalyseFilters, 'weekdays' | 'vacationMode'>,
  calendar: SchoolHolidayCalendar,
): AnalyseDaySample[] {
  return samples.filter(sample =>
    (filters.weekdays.length === 0 || filters.weekdays.includes(sample.weekday))
    && matchesVacationMode(sample.date, calendar, filters.vacationMode));
}

const emptyAggregate = (): AnalyseAggregate => ({
  n: 0, cvReel: 0, cvBudget: 0, cvEcart: 0, cvEcartPct: null,
  caReel: 0, caBudget: 0, caEcart: 0, caEcartPct: null, impactCa: 0,
});

const pct = (ecart: number, base: number): number | null => (base > 0 ? (ecart / base) * 100 : null);

type ServiceFigures = { caReel: number; caBudget: number; cvReel: number; cvBudget: number };

// La journée = midi + soir + limonade en CA (budget col 3 inclut la limonade) ;
// couverts restaurant uniquement (la limonade n'a pas d'écart de couverts comparé).
const figuresFor = (sample: AnalyseDaySample, service: AnalyseService): ServiceFigures => {
  const { reel, budget } = sample;
  if (service === 'midi') return { caReel: reel.caMidi, caBudget: budget.caMidi, cvReel: reel.cvMidi, cvBudget: budget.cvMidi };
  if (service === 'soir') return { caReel: reel.caSoir, caBudget: budget.caSoir, cvReel: reel.cvSoir, cvBudget: budget.cvSoir };
  return {
    caReel: reel.caMidi + reel.caSoir + reel.caLimo,
    caBudget: budget.caMidi + budget.caSoir + budget.caLimo,
    cvReel: reel.cvMidi + reel.cvSoir,
    cvBudget: budget.cvMidi + budget.cvSoir,
  };
};

// Un jour compte pour un service s'il y a eu du réalisé OU du budget sur ce service :
// un service fermé sans budget (0/0) ne dilue pas la moyenne, un service budgété resté à 0 pèse bien.
const isServiceIncluded = (sample: AnalyseDaySample, service: AnalyseService): boolean => {
  if (service === 'journee') return true;
  const f = figuresFor(sample, service);
  return f.caReel > 0 || f.cvReel > 0 || f.caBudget > 0 || f.cvBudget > 0;
};

export function aggregateService(samples: AnalyseDaySample[], service: AnalyseService): AnalyseAggregate {
  const included = samples.filter(sample => isServiceIncluded(sample, service));
  if (included.length === 0) return emptyAggregate();

  const totals = included.reduce((acc, sample) => {
    const f = figuresFor(sample, service);
    return {
      caReel: acc.caReel + f.caReel,
      caBudget: acc.caBudget + f.caBudget,
      cvReel: acc.cvReel + f.cvReel,
      cvBudget: acc.cvBudget + f.cvBudget,
    };
  }, { caReel: 0, caBudget: 0, cvReel: 0, cvBudget: 0 });

  const n = included.length;
  const caEcartTotal = totals.caReel - totals.caBudget;
  const cvEcartTotal = totals.cvReel - totals.cvBudget;
  return {
    n,
    cvReel: totals.cvReel / n,
    cvBudget: totals.cvBudget / n,
    cvEcart: cvEcartTotal / n,
    cvEcartPct: pct(cvEcartTotal, totals.cvBudget),
    caReel: totals.caReel / n,
    caBudget: totals.caBudget / n,
    caEcart: caEcartTotal / n,
    caEcartPct: pct(caEcartTotal, totals.caBudget),
    impactCa: caEcartTotal,
  };
}

export function aggregateDetail(samples: AnalyseDaySample[]): AnalyseDetail {
  const n = samples.length;
  if (n === 0) {
    return { n: 0, restaurantCaReel: 0, restaurantCaBudget: 0, limoCaReel: 0, limoCaBudget: 0, limoCvReel: 0, vaeReel: 0, caJourAvecVae: 0 };
  }
  const sum = (pick: (s: AnalyseDaySample) => number) => samples.reduce((acc, s) => acc + pick(s), 0) / n;
  const restaurantCaReel = sum(s => s.reel.caMidi + s.reel.caSoir);
  const limoCaReel = sum(s => s.reel.caLimo);
  const vaeReel = sum(s => s.reel.vae);
  return {
    n,
    restaurantCaReel,
    restaurantCaBudget: sum(s => s.budget.caMidi + s.budget.caSoir),
    limoCaReel,
    limoCaBudget: sum(s => s.budget.caLimo),
    limoCvReel: sum(s => s.reel.cvLimo),
    vaeReel,
    caJourAvecVae: restaurantCaReel + limoCaReel + vaeReel,
  };
}

export function aggregateByWeekday(samples: AnalyseDaySample[], weekdays: number[]): AnalyseWeekdayRow[] {
  const selected = WEEKDAY_ORDER.filter(day => weekdays.length === 0 || weekdays.includes(day));
  return selected.map(weekday => {
    const daySamples = samples.filter(sample => sample.weekday === weekday);
    return {
      weekday,
      midi: aggregateService(daySamples, 'midi'),
      soir: aggregateService(daySamples, 'soir'),
      journee: aggregateService(daySamples, 'journee'),
    };
  });
}

// Alerte : le seuil % ou le seuil €/jour (l'un des deux suffit). Critique à 2× le seuil.
// Sans seuil € (couverts), seul le % est évalué. Un échantillon vide ne déclenche rien.
export function alertLevel(
  ecartPct: number | null,
  ecartEuroJour: number | null,
  thresholds: AnalyseThresholds,
  n: number,
): AnalyseAlertLevel {
  if (n === 0) return 'none';
  const hit = (factor: number) =>
    (ecartPct !== null && ecartPct <= thresholds.ecartPct * factor)
    || (ecartEuroJour !== null && ecartEuroJour <= thresholds.ecartEuroJour * factor);
  if (hit(2)) return 'critical';
  if (hit(1)) return 'warning';
  return 'none';
}
