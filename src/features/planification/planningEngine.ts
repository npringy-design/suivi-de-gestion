import { parseMoneyValue } from '@/lib/money';
import { getDashboardRowIndices } from '@/lib/utils';
import type {
  AnalyseDaySample,
  PlanConfidence,
  PlanDay,
  PlanEstimator,
  PlanManualOverride,
  PlanService,
  PlanServiceProposal,
  PlanSettings,
  PlanSource,
  PlanVacationStatus,
  PlanWriteMode,
  SchoolHolidayCalendar,
} from '@/types/dataTypes';

import { toIsoDate } from '../analyse/ecartsAnalysis';

export const PLAN_SERVICES: readonly PlanService[] = ['midi', 'soir'];

// Seuils de confiance (nombre d'échantillons du groupe).
export const CONFIDENCE_FAIBLE_BELOW = 8;
export const CONFIDENCE_CRITIQUE_BELOW = 3;

// Heuristique moyenne / médiane :
// - moins de 5 échantillons : une moyenne est trop sensible à un jour atypique → médiane pondérée ;
// - sinon, si un échantillon s'écarte de plus de 3 écarts absolus médians (MAD, échelle normale
//   1,4826) de la médiane (jour d'événement, fermeture partielle, coup de sous-effectif) → médiane ;
// - sinon moyenne pondérée, plus fine quand les données sont régulières.
// Les jours où le service est fermé (0 couvert) sont retirés avant, ils ne sont pas des outliers mais
// une information « fermé » traitée à part (voir CLOSED_RATIO).
export const MIN_SAMPLES_FOR_MEAN = 5;
const MAD_OUTLIER_FACTOR = 3 * 1.4826;
// Service considéré fermé si moins de la moitié des jours du groupe l'ont ouvert.
const CLOSED_OPEN_RATIO = 0.5;

export const DEFAULT_PLAN_SETTINGS = (targetYear: number): PlanSettings => ({
  targetYear,
  recentWeightPct: 60,
  cvGrowthPct: 0,
  tmGrowthPct: 0,
  cvGrowthByMonth: {},
  tmGrowthByMonth: {},
});

export const vacationStatusOf = (date: string, calendar: SchoolHolidayCalendar): PlanVacationStatus => {
  const containing = calendar.periods.filter(p => date >= p.start && date <= p.end);
  if (containing.length === 0) return 'hors_vacances';
  return containing.some(p => !p.summer) ? 'vacances' : 'ete';
};

type ServiceEntry = { year: number; cv: number; ca: number; tm: number };

type GroupData = { entries: ServiceEntry[]; days: number };

const groupKey = (weekday: number, status: PlanVacationStatus | 'any', service: PlanService) =>
  `${weekday}|${status}|${service}`;

// Un service est ouvert un jour donné s'il y a eu des couverts ET du CA réalisés.
const serviceEntryOf = (sample: AnalyseDaySample, service: PlanService): ServiceEntry | null => {
  const cv = service === 'midi' ? sample.reel.cvMidi : sample.reel.cvSoir;
  const ca = service === 'midi' ? sample.reel.caMidi : sample.reel.caSoir;
  if (cv <= 0 || ca <= 0) return null;
  return { year: Number(sample.date.slice(0, 4)), cv, ca, tm: ca / cv };
};

export function buildGroups(samples: AnalyseDaySample[], calendar: SchoolHolidayCalendar): Map<string, GroupData> {
  const groups = new Map<string, GroupData>();
  const bucket = (key: string): GroupData => {
    let group = groups.get(key);
    if (!group) { group = { entries: [], days: 0 }; groups.set(key, group); }
    return group;
  };

  samples.forEach(sample => {
    const status = vacationStatusOf(sample.date, calendar);
    PLAN_SERVICES.forEach(service => {
      const entry = serviceEntryOf(sample, service);
      [groupKey(sample.weekday, status, service), groupKey(sample.weekday, 'any', service)].forEach(key => {
        const group = bucket(key);
        group.days += 1;
        if (entry) group.entries.push(entry);
      });
    });
  });
  return groups;
}

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

const weightedMedian = (values: number[], weights: number[]): number => {
  const pairs = values.map((value, i) => ({ value, weight: weights[i] })).sort((a, b) => a.value - b.value);
  const half = pairs.reduce((acc, p) => acc + p.weight, 0) / 2;
  let cumulated = 0;
  for (const pair of pairs) {
    cumulated += pair.weight;
    if (cumulated >= half) return pair.value;
  }
  return pairs[pairs.length - 1].value;
};

const hasOutlier = (values: number[]): boolean => {
  const center = median(values);
  const mad = median(values.map(v => Math.abs(v - center)));
  return mad > 0 && values.some(v => Math.abs(v - center) > MAD_OUTLIER_FACTOR * mad);
};

// Poids par échantillon : chaque année pèse son poids global réparti à parts égales entre ses
// échantillons ; si une année n'a aucun échantillon, l'autre porte tout le poids.
const sampleWeights = (entries: ServiceEntry[], recentYear: number, recentWeightPct: number): number[] => {
  const recentCount = entries.filter(e => e.year === recentYear).length;
  const olderCount = entries.length - recentCount;
  const recentShare = recentCount === 0 ? 0 : olderCount === 0 ? 1 : recentWeightPct / 100;
  return entries.map(e => (e.year === recentYear
    ? recentShare / recentCount
    : (1 - recentShare) / olderCount));
};

export type Estimate = { cv: number; tm: number; estimator: PlanEstimator };

export function estimateEntries(entries: ServiceEntry[], recentYear: number, recentWeightPct: number): Estimate {
  const weights = sampleWeights(entries, recentYear, recentWeightPct);
  const cvs = entries.map(e => e.cv);
  const useMedian = entries.length < MIN_SAMPLES_FOR_MEAN || hasOutlier(cvs);
  if (useMedian) {
    return {
      cv: weightedMedian(cvs, weights),
      tm: weightedMedian(entries.map(e => e.tm), weights),
      estimator: 'mediane',
    };
  }
  const totalCv = entries.reduce((acc, e, i) => acc + e.cv * weights[i], 0);
  const totalCa = entries.reduce((acc, e, i) => acc + e.ca * weights[i], 0);
  return { cv: totalCv, tm: totalCv > 0 ? totalCa / totalCv : 0, estimator: 'moyenne' };
}

const confidenceOf = (n: number, source: PlanSource): PlanConfidence => {
  if (source === 'repli' || source === 'aucune' || n < CONFIDENCE_CRITIQUE_BELOW) return 'critique';
  return n < CONFIDENCE_FAIBLE_BELOW ? 'faible' : 'fiable';
};

const round2 = (value: number): number => Math.round(value * 100) / 100;

const closedProposal = (n: number): PlanServiceProposal => ({
  cv: 0, tm: 0, ca: 0, n, confidence: confidenceOf(n, 'ferme'), source: 'ferme', estimator: 'mediane', manual: false,
});

export function buildProposal(
  groups: Map<string, GroupData>,
  weekday: number,
  status: PlanVacationStatus,
  service: PlanService,
  month: number,
  settings: PlanSettings,
): PlanServiceProposal {
  const recentYear = settings.targetYear - 1;
  const exact = groups.get(groupKey(weekday, status, service));
  let source: PlanSource = 'groupe';
  let group = exact;

  if (exact && exact.days > 0 && exact.entries.length < exact.days * CLOSED_OPEN_RATIO) return closedProposal(exact.days);

  if (!group || group.entries.length === 0) {
    source = 'repli';
    group = groups.get(groupKey(weekday, 'any', service));
  }
  if (!group || group.entries.length === 0) {
    return { cv: 0, tm: 0, ca: 0, n: 0, confidence: 'critique', source: 'aucune', estimator: 'mediane', manual: false };
  }

  const estimate = estimateEntries(group.entries, recentYear, settings.recentWeightPct);
  const cvGrowth = settings.cvGrowthByMonth[month] ?? settings.cvGrowthPct;
  const tmGrowth = settings.tmGrowthByMonth[month] ?? settings.tmGrowthPct;
  const cv = Math.round(estimate.cv * (1 + cvGrowth / 100));
  const tm = round2(estimate.tm * (1 + tmGrowth / 100));
  const n = group.entries.length;
  return { cv, tm, ca: round2(cv * tm), n, confidence: confidenceOf(n, source), source, estimator: estimate.estimator, manual: false };
}

export function generatePlan(
  samples: AnalyseDaySample[],
  calendar: SchoolHolidayCalendar,
  settings: PlanSettings,
): PlanDay[] {
  const groups = buildGroups(samples, calendar);
  const days: PlanDay[] = [];
  for (let month = 0; month < 12; month++) {
    const numDays = new Date(settings.targetYear, month + 1, 0).getDate();
    for (let day = 1; day <= numDays; day++) {
      const date = toIsoDate(settings.targetYear, month, day);
      const weekday = new Date(settings.targetYear, month, day).getDay();
      const status = vacationStatusOf(date, calendar);
      days.push({
        date, month, day, weekday, status,
        midi: buildProposal(groups, weekday, status, 'midi', month, settings),
        soir: buildProposal(groups, weekday, status, 'soir', month, settings),
      });
    }
  }
  return days;
}

// Applique les ajustements manuels : la valeur saisie remplace la proposition, la confiance est
// alors « fiable » (choix explicite de l'utilisateur) mais le drapeau `manual` reste visible.
export function applyOverrides(plan: PlanDay[], overrides: Record<string, PlanManualOverride>): PlanDay[] {
  return plan.map(day => {
    const override = overrides[day.date];
    if (!override) return day;
    const withOverride = (service: PlanService): PlanServiceProposal => {
      const manual = override[service];
      const base = day[service];
      if (!manual) return base;
      return {
        ...base,
        cv: manual.cv,
        tm: manual.tm,
        ca: round2(manual.cv * manual.tm),
        confidence: 'fiable',
        manual: true,
      };
    };
    return { ...day, midi: withOverride('midi'), soir: withOverride('soir') };
  });
}

export type MonthPlanSummary = {
  month: number;
  cvMidi: number; cvSoir: number; caMidi: number; caSoir: number;
  tm: number | null;
  daysCritique: number; daysFaible: number; daysManual: number;
};

// Pire niveau des deux services : un jour n'est fiable que si midi et soir le sont.
export const dayConfidence = (day: PlanDay): PlanConfidence => {
  const levels = [day.midi.confidence, day.soir.confidence];
  if (levels.includes('critique')) return 'critique';
  return levels.includes('faible') ? 'faible' : 'fiable';
};

export function summarizeByMonth(plan: PlanDay[]): MonthPlanSummary[] {
  return Array.from({ length: 12 }, (_, month) => {
    const days = plan.filter(day => day.month === month);
    const sum = (pick: (d: PlanDay) => number) => days.reduce((acc, d) => acc + pick(d), 0);
    const cvMidi = sum(d => d.midi.cv);
    const cvSoir = sum(d => d.soir.cv);
    const caMidi = sum(d => d.midi.ca);
    const caSoir = sum(d => d.soir.ca);
    return {
      month, cvMidi, cvSoir, caMidi, caSoir,
      tm: cvMidi + cvSoir > 0 ? (caMidi + caSoir) / (cvMidi + cvSoir) : null,
      daysCritique: days.filter(d => dayConfidence(d) === 'critique').length,
      daysFaible: days.filter(d => dayConfidence(d) === 'faible').length,
      daysManual: days.filter(d => d.midi.manual || d.soir.manual).length,
    };
  });
}

// --- Écriture dans les Prévisions (cellules dashboard cols 6 à 9) ---

type DashboardByMonth = Record<number, Record<string, string> | undefined>;

const BUDGET_COLUMNS = [6, 7, 8, 9] as const;

const hasBudget = (dashboard: Record<string, string> | undefined, rIdx: number): boolean =>
  BUDGET_COLUMNS.some(col => parseMoneyValue(dashboard?.[`${rIdx}-${col}`]) > 0);

// Nombre de jours de chaque mois qui ont déjà des prévisions couverts/TM saisies.
export function detectExistingBudget(year: number, dashboardByMonth: DashboardByMonth): Record<number, number> {
  const existing: Record<number, number> = {};
  for (let month = 0; month < 12; month++) {
    const dashboard = dashboardByMonth[month];
    if (!dashboard) continue;
    const count = Object.values(getDashboardRowIndices(month, year)).filter(rIdx => hasBudget(dashboard, rIdx)).length;
    if (count > 0) existing[month] = count;
  }
  return existing;
}

export type BudgetWrites = {
  valuesByMonth: Record<number, Record<string, string>>;
  daysWritten: number;
  daysOverwritten: number;
  daysSkipped: number;
};

const cvCell = (value: number): string => (value > 0 ? String(Math.round(value)) : '');
const tmCell = (value: number): string => (value > 0 ? value.toFixed(2) : '');

// Le CA budget (cols 0/1) n'est pas écrit : il est recalculé (couverts × TM) par dashboardCalculations.
// Un service fermé écrit des cellules vides, ce qui efface une ancienne prévision en mode « écraser ».
export function buildBudgetWrites(
  year: number,
  plan: PlanDay[],
  dashboardByMonth: DashboardByMonth,
  mode: PlanWriteMode,
): BudgetWrites {
  const writes: BudgetWrites = { valuesByMonth: {}, daysWritten: 0, daysOverwritten: 0, daysSkipped: 0 };
  const rowIndicesByMonth = new Map<number, Record<number, number>>();

  plan.forEach(day => {
    if (!rowIndicesByMonth.has(day.month)) rowIndicesByMonth.set(day.month, getDashboardRowIndices(day.month, year));
    const rIdx = rowIndicesByMonth.get(day.month)![day.day];
    const already = hasBudget(dashboardByMonth[day.month], rIdx);
    if (already && mode === 'completer') { writes.daysSkipped += 1; return; }

    const cells = writes.valuesByMonth[day.month] ?? (writes.valuesByMonth[day.month] = {});
    cells[`${rIdx}-6`] = cvCell(day.midi.cv);
    cells[`${rIdx}-7`] = tmCell(day.midi.tm);
    cells[`${rIdx}-8`] = cvCell(day.soir.cv);
    cells[`${rIdx}-9`] = tmCell(day.soir.tm);
    writes.daysWritten += 1;
    if (already) writes.daysOverwritten += 1;
  });
  return writes;
}

// --- Export CSV (relecture) ---

const CONFIDENCE_LABEL: Record<PlanConfidence, string> = { fiable: 'fiable', faible: 'faible', critique: 'critique' };
const STATUS_LABEL: Record<PlanVacationStatus, string> = { vacances: 'vacances', hors_vacances: 'hors vacances', ete: 'été' };
const WEEKDAY_LABEL = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const csvNumber = (value: number): string => String(value).replace('.', ',');

export function planToCsv(plan: PlanDay[]): string {
  const header = ['Date', 'Jour', 'Statut', 'Service', 'Couverts', 'TM', 'CA', 'Confiance', 'Échantillons', 'Source', 'Estimateur', 'Modifié'];
  const lines = [header.join(';')];
  plan.forEach(day => {
    PLAN_SERVICES.forEach(service => {
      const p = day[service];
      lines.push([
        day.date, WEEKDAY_LABEL[day.weekday], STATUS_LABEL[day.status], service,
        p.cv, csvNumber(p.tm), csvNumber(p.ca),
        CONFIDENCE_LABEL[p.confidence], p.n, p.source, p.estimator, p.manual ? 'oui' : 'non',
      ].join(';'));
    });
  });
  return '﻿' + lines.join('\r\n');
}
