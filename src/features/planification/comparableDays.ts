import { getPublicHolidays } from '@/lib/publicHolidays';
import type { AnalyseDaySample, PlanConfidence, PlanService, PlanServiceProposal } from '@/types/dataTypes';

// Méthode du jour comparable : chaque jour de l'année cible reprend son jour équivalent N-1 (même jour de
// semaine, 364 jours avant) et N-2 (728 jours avant, remis au niveau de N-1). Logique pure : le calendrier
// scolaire et le ratio férié sont fournis par le moteur.

export type SchoolStatus = 'hors_vacances' | 'vacances' | 'ete';

export type ComparableContext = {
  samplesByDate: Map<string, AnalyseDaySample>;
  schoolStatusOf: (isoDate: string) => SchoolStatus;
  // Ratio férié / jour normal du même jour de semaine (couverts, TM) ; 1 sans historique de férié.
  holidayRatio: (service: PlanService, weekday: number) => { cv: number; tm: number };
};

export type ComparableDay = {
  sample: AnalyseDaySample;
  // Jour normal pris à la place d'un férié sans équivalent exact : le ratio férié s'applique.
  needsHolidayRatio: boolean;
  // Même férié de l'année passée, tombé le même jour de semaine : repris tel quel.
  sameHoliday: boolean;
};

// Écart de CA (après remise à niveau) au-delà duquel deux exemples ne se confirment plus.
export const COMPARABLE_MAX_GAP = 0.4;
// Décalages (en jours, multiples de 7 donc même jour de semaine) essayés dans l'ordre quand le candidat est invalide.
const SEARCH_OFFSETS = [0, -7, 7, -14, 14, -21, 21];

const DAY_MS = 86400000;
const toUtc = (iso: string): number => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
export const shiftIso = (iso: string, days: number): string => new Date(toUtc(iso) + days * DAY_MS).toISOString().slice(0, 10);
const weekdayOf = (iso: string): number => new Date(toUtc(iso)).getUTCDay();
const yearOf = (iso: string): number => Number(iso.slice(0, 4));

const holidayNameOn = (iso: string): string | null =>
  getPublicHolidays(yearOf(iso)).find(holiday => holiday.date === iso)?.name ?? null;

const holidayDateOf = (year: number, name: string): string | null =>
  getPublicHolidays(year).find(holiday => holiday.name === name)?.date ?? null;

// Date de l'année cible - 364 × back jours, ramenée dans l'année voulue (le 31 décembre tombe sinon en janvier de N).
const baseCandidate = (targetIso: string, back: number): string => {
  const wantedYear = yearOf(targetIso) - back;
  let candidate = shiftIso(targetIso, -364 * back);
  while (yearOf(candidate) > wantedYear) candidate = shiftIso(candidate, -7);
  while (yearOf(candidate) < wantedYear) candidate = shiftIso(candidate, 7);
  return candidate;
};

// Jour comparable de `back` année(s) avant la date cible (1 = N-1, 2 = N-2), null s'il n'en existe aucun.
export function findComparableDay(ctx: ComparableContext, targetIso: string, back: number): ComparableDay | null {
  const wantedYear = yearOf(targetIso) - back;
  const holiday = holidayNameOn(targetIso);

  if (holiday) {
    const sameDate = holidayDateOf(wantedYear, holiday);
    const sample = sameDate && weekdayOf(sameDate) === weekdayOf(targetIso) ? ctx.samplesByDate.get(sameDate) : undefined;
    if (sample) return { sample, needsHolidayRatio: false, sameHoliday: true };
  }

  const status = ctx.schoolStatusOf(targetIso);
  const base = baseCandidate(targetIso, back);
  for (const offset of SEARCH_OFFSETS) {
    const date = shiftIso(base, offset);
    if (yearOf(date) !== wantedYear || holidayNameOn(date) !== null || ctx.schoolStatusOf(date) !== status) continue;
    const sample = ctx.samplesByDate.get(date);
    if (sample) return { sample, needsHolidayRatio: holiday !== null, sameHoliday: false };
  }
  return null;
}

type ServiceFigures = { cv: number; ca: number };

const figuresOf = (sample: AnalyseDaySample, service: PlanService): ServiceFigures =>
  service === 'midi'
    ? { cv: sample.reel.cvMidi, ca: sample.reel.caMidi }
    : { cv: sample.reel.cvSoir, ca: sample.reel.caSoir };

// Niveau d'un mois N-1 / N-2 pour un service : totaux du mois (réalisé, sinon budget : mêmes échantillons).
export type MonthLevel = { cv: number; ca: number };

export function monthLevels(samples: AnalyseDaySample[], service: PlanService): Map<string, MonthLevel> {
  const levels = new Map<string, MonthLevel>();
  samples.forEach(sample => {
    const key = sample.date.slice(0, 7);
    const figures = figuresOf(sample, service);
    const level = levels.get(key) ?? { cv: 0, ca: 0 };
    level.cv += figures.cv;
    level.ca += figures.ca;
    levels.set(key, level);
  });
  return levels;
}

// Remise à niveau de N-2 sur N-1 pour le mois : couverts N-1 / couverts N-2 et TM N-1 / TM N-2.
export function levelRatios(levels: Map<string, MonthLevel>, targetYear: number, month: number): { cv: number; tm: number } {
  const key = (year: number) => `${year}-${String(month + 1).padStart(2, '0')}`;
  const n1 = levels.get(key(targetYear - 1));
  const n2 = levels.get(key(targetYear - 2));
  if (!n1 || !n2 || n1.cv <= 0 || n2.cv <= 0 || n1.ca <= 0 || n2.ca <= 0) return { cv: 1, tm: 1 };
  return { cv: n1.cv / n2.cv, tm: (n1.ca / n1.cv) / (n2.ca / n2.cv) };
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

const closedProposal = (examples: number): PlanServiceProposal => ({
  cv: 0, tm: 0, ca: 0, n: examples, confidence: examples >= 2 ? 'fiable' : 'faible', source: 'ferme', estimator: 'moyenne', manual: false,
});

// Proposition d'un service pour un jour cible à partir de ses jours comparables N-1 et N-2 ; null si aucun
// exemple (le moteur retombe alors sur la proposition par groupes, en confiance critique).
// - service fermé le jour comparable N-1 (couverts à 0) : 0 conservé ; N-2 seul fermé et N-1 absent : 0 aussi ;
// - N-2 est remis au niveau de N-1 (ratios du mois) avant la moyenne ;
// - fiable : N-1 et N-2 disponibles, CA des deux à moins de 40 % d'écart ; faible : un seul exemple ou écart > 40 %.
export function comparableProposal(
  service: PlanService,
  n1: ComparableDay | null,
  n2: ComparableDay | null,
  ratios: { cv: number; tm: number },
  holidayRatio: { cv: number; tm: number },
): PlanServiceProposal | null {
  const raw1 = n1 ? figuresOf(n1.sample, service) : null;
  const raw2 = n2 ? figuresOf(n2.sample, service) : null;
  if (raw1 && raw1.cv <= 0) return closedProposal(raw2 && raw2.cv <= 0 ? 2 : 1);
  if (!raw1 && raw2 && raw2.cv <= 0) return closedProposal(1);

  const example1 = raw1 && raw1.ca > 0 ? { cv: raw1.cv, tm: raw1.ca / raw1.cv } : null;
  const example2 = raw2 && raw2.cv > 0 && raw2.ca > 0 ? { cv: raw2.cv * ratios.cv, tm: (raw2.ca / raw2.cv) * ratios.tm } : null;
  const examples = [example1, example2].filter((example): example is { cv: number; tm: number } => example !== null);
  if (examples.length === 0) return null;

  // Férié sans équivalent exact : le jour normal comparable est corrigé du ratio férié historique.
  const factor = (n1?.needsHolidayRatio || n2?.needsHolidayRatio) ? holidayRatio : { cv: 1, tm: 1 };
  const cv = Math.round((examples.reduce((acc, e) => acc + e.cv, 0) / examples.length) * factor.cv);
  const tm = round2((examples.reduce((acc, e) => acc + e.tm, 0) / examples.length) * factor.tm);

  let confidence: PlanConfidence = 'faible';
  if (examples.length === 2) {
    const [ca1, ca2] = examples.map(e => e.cv * e.tm);
    confidence = Math.abs(ca1 - ca2) / Math.max(ca1, ca2) <= COMPARABLE_MAX_GAP ? 'fiable' : 'faible';
  }
  const holiday = Boolean(n1?.sameHoliday || n2?.sameHoliday || n1?.needsHolidayRatio || n2?.needsHolidayRatio);
  return { cv, tm, ca: round2(cv * tm), n: examples.length, confidence, source: holiday ? 'ferie' : 'groupe', estimator: 'moyenne', manual: false };
}
