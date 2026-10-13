import type { AnalyseDaySample, PlanDay, PlanServiceProposal } from '@/types/dataTypes';

const mean = (values: number[]): number => values.reduce((acc, v) => acc + v, 0) / values.length;
const round2 = (value: number): number => Math.round(value * 100) / 100;

const dayCa = (day: PlanDay): number => day.midi.ca + day.soir.ca;

const daysInMonth = (year: number, month: number): number => new Date(year, month + 1, 0).getDate();

// Mois en cours de saisie (AAAA-MM) : celui du dernier jour réalisé, s'il s'arrête à plus de 3 jours
// de la fin du mois. Partiel, il fausserait les poids et les planchers de TM.
function partialMonthKey(samples: AnalyseDaySample[]): string | null {
  const lastDate = samples.reduce((max, s) => (s.date > max ? s.date : max), '');
  const isPartial = lastDate !== ''
    && Number(lastDate.slice(8, 10)) < daysInMonth(Number(lastDate.slice(0, 4)), Number(lastDate.slice(5, 7)) - 1) - 3;
  return isPartial ? lastDate.slice(0, 7) : null;
}

type CaPicker = (sample: AnalyseDaySample) => number;

const restaurantCa: CaPicker = sample => sample.reel.caMidi + sample.reel.caSoir;
const vaeCa: CaPicker = sample => sample.reel.vae;

// CA (restaurant ou VAE) par mois de l'historique, hors mois partiel. Sans aucun mois complet,
// tous les mois sont conservés.
function completeMonthTotals(samples: AnalyseDaySample[], pick: CaPicker): Map<number, number[]> {
  const totals = new Map<string, { month: number; ca: number }>();
  samples.forEach(sample => {
    const key = sample.date.slice(0, 7);
    const entry = totals.get(key) ?? { month: Number(sample.date.slice(5, 7)) - 1, ca: 0 };
    entry.ca += pick(sample);
    totals.set(key, entry);
  });

  const partialKey = partialMonthKey(samples);
  const keys = [...totals.keys()].filter(key => key !== partialKey);
  const used = keys.length > 0 ? keys : [...totals.keys()];

  const byMonth = new Map<number, number[]>();
  used.forEach(key => {
    const { month, ca } = totals.get(key)!;
    byMonth.set(month, [...(byMonth.get(month) ?? []), ca]);
  });
  return byMonth;
}

// CA moyen de chaque mois (0-11) sur les années d'historique où il est complet.
function averageMonthlyCa(samples: AnalyseDaySample[], pick: CaPicker = restaurantCa): number[] {
  const byMonth = completeMonthTotals(samples, pick);
  return Array.from({ length: 12 }, (_, month) => {
    const values = byMonth.get(month);
    return values && values.length > 0 ? mean(values) : 0;
  });
}

// Proposition de CA annuel : moyenne des CA annuels réalisés des années d'historique, sans
// extrapolation de tendance (= somme des CA mensuels moyens ; un mois manquant ou partiel d'une
// année, typiquement l'année en cours, est repris de l'autre année).
export function proposeAnnualCA(samples: AnalyseDaySample[]): number {
  return Math.round(averageMonthlyCa(samples).reduce((acc, ca) => acc + ca, 0));
}

// Poids de chaque mois (0-11) dans le CA annuel, moyenné sur les années d'historique.
export function monthlyWeights(samples: AnalyseDaySample[]): Record<number, number> {
  const averages = averageMonthlyCa(samples);
  const total = averages.reduce((acc, ca) => acc + ca, 0);
  return Object.fromEntries(averages.map((ca, month) => [month, total > 0 ? ca / total : 0]));
}

// --- VAE : même logique que le CA annuel, mais à part (aucun couvert, aucun TM) ---

// Proposition de VAE annuel : moyenne des VAE annuels réalisés, mois manquants repris de l'autre année.
export function proposeAnnualVAE(samples: AnalyseDaySample[]): number {
  return Math.round(averageMonthlyCa(samples, vaeCa).reduce((acc, v) => acc + v, 0));
}

// VAE de chaque mois (0-11) : VAE mensuel saisi, sinon VAE annuel × poids historique du mois, sinon
// (sans objectif annuel) VAE historique moyen du mois. Sans historique, répartition égale.
export function planMonthlyVae(
  samples: AnalyseDaySample[],
  annual: number | null,
  monthly: Record<number, number | null>,
): Record<number, number> {
  const averages = averageMonthlyCa(samples, vaeCa);
  const total = averages.reduce((acc, v) => acc + v, 0);
  return Object.fromEntries(averages.map((average, month) => {
    const override = monthly[month];
    if (typeof override === 'number') return [month, override];
    if (annual === null) return [month, round2(average)];
    return [month, round2(annual * (total > 0 ? average / total : 1 / 12))];
  }));
}

// Poids de chaque jour du mois dans le CA du mois (somme = 1) : CA historique moyen de son groupe
// (jour de semaine × vacances / férié), c'est-à-dire la proposition de CA du jour hors croissance.
export const normalizedDayWeights = (days: PlanDay[]): Record<string, number> => {
  const total = days.reduce((acc, day) => acc + dayCa(day), 0);
  return Object.fromEntries(days.map(day => [day.date, total > 0 ? dayCa(day) / total : 0]));
};

// Ramène le CA du mois sur la cible : le TM reste celui de l'historique, seuls les couverts
// bougent. L'arrondi des couverts est reporté de service en service pour que le total du mois
// reste à moins d'un demi-TM de la cible.
export function applyMonthTarget(days: PlanDay[], target: number): PlanDay[] {
  const weights = normalizedDayWeights(days);
  let carry = 0;
  return days.map(day => {
    const dayShare = dayCa(day);
    const retarget = (proposal: PlanServiceProposal): PlanServiceProposal => {
      if (proposal.tm <= 0 || dayShare <= 0) return proposal;
      const wanted = target * weights[day.date] * (proposal.ca / dayShare) + carry;
      const cv = Math.max(0, Math.round(wanted / proposal.tm));
      const ca = round2(cv * proposal.tm);
      carry = wanted - ca;
      return { ...proposal, cv, ca };
    };
    const midi = retarget(day.midi);
    return { ...day, midi, soir: retarget(day.soir) };
  });
}


// --- Plancher de TM : jamais sous le TM réalisé de N-1 ---

const tmOfDays = (days: PlanDay[]): number => {
  const cv = days.reduce((acc, d) => acc + d.midi.cv + d.soir.cv, 0);
  return cv > 0 ? days.reduce((acc, d) => acc + dayCa(d), 0) / cv : 0;
};

export type TmFloors = { byMonth: Record<number, number>; year: number | null };

type TmTotals = { ca: number; cv: number };

const tmOfTotals = ({ ca, cv }: TmTotals): number | null => (cv > 0 ? ca / cv : null);

// Plancher de TM de l'année N-1 : le plus haut du TM réalisé et du TM budgété (CA midi + soir /
// couverts, jours réalisés), au total et par mois complet. On ne propose jamais un TM inférieur à
// ce que le restaurant a réalisé ni à ce qu'il avait budgété.
export function tmFloors(samples: AnalyseDaySample[], previousYear: number): TmFloors {
  const partialKey = partialMonthKey(samples);
  const empty = (): { real: TmTotals; budget: TmTotals } => ({ real: { ca: 0, cv: 0 }, budget: { ca: 0, cv: 0 } });
  const year = empty();
  const months = new Map<number, ReturnType<typeof empty>>();
  const add = (target: ReturnType<typeof empty>, sample: AnalyseDaySample) => {
    target.real.ca += sample.reel.caMidi + sample.reel.caSoir;
    target.real.cv += sample.reel.cvMidi + sample.reel.cvSoir;
    target.budget.ca += sample.budget.caMidi + sample.budget.caSoir;
    target.budget.cv += sample.budget.cvMidi + sample.budget.cvSoir;
  };
  const highest = (entry: ReturnType<typeof empty>): number | null => {
    const values = [tmOfTotals(entry.real), tmOfTotals(entry.budget)].filter((v): v is number => v !== null);
    return values.length > 0 ? Math.max(...values) : null;
  };

  samples.filter(sample => Number(sample.date.slice(0, 4)) === previousYear).forEach(sample => {
    add(year, sample);
    if (sample.date.slice(0, 7) === partialKey) return;
    const month = Number(sample.date.slice(5, 7)) - 1;
    const entry = months.get(month) ?? empty();
    add(entry, sample);
    months.set(month, entry);
  });

  const byMonth: Record<number, number> = {};
  months.forEach((entry, month) => {
    const floor = highest(entry);
    if (floor !== null) byMonth[month] = floor;
  });
  return { byMonth, year: highest(year) };
}

// Relève les TM de `factor` en gardant le CA : ce sont les couverts qui baissent. L'arrondi des
// couverts est reporté de service en service pour que le CA du lot reste inchangé à un TM près.
function raiseTm(days: PlanDay[], factor: number): PlanDay[] {
  let carry = 0;
  const raise = (proposal: PlanServiceProposal): PlanServiceProposal => {
    if (proposal.tm <= 0 || proposal.cv <= 0) return proposal;
    const tm = round2(proposal.tm * factor);
    const wanted = proposal.ca + carry;
    const cv = Math.max(0, Math.round(wanted / tm));
    const ca = round2(cv * tm);
    carry = wanted - ca;
    return { ...proposal, cv, tm, ca };
  };
  return days.map(day => ({ ...day, midi: raise(day.midi), soir: raise(day.soir) }));
}

// Garantit un TM mensuel >= TM du même mois de N-1 (mois complets), puis un TM annuel >= TM annuel
// de N-1. Jamais de baisse de TM : seuls les couverts diminuent, le CA est conservé.
export function enforceTmFloors(plan: PlanDay[], floors: TmFloors): PlanDay[] {
  const byMonth = Array.from({ length: 12 }, (_, month) => {
    const days = plan.filter(day => day.month === month);
    const floor = floors.byMonth[month];
    const tm = tmOfDays(days);
    return floor !== undefined && tm > 0 && tm < floor ? raiseTm(days, floor / tm) : days;
  });
  const yearTm = tmOfDays(byMonth.flat());
  if (floors.year === null || yearTm <= 0 || yearTm >= floors.year) return byMonth.flat();
  return byMonth.flatMap(days => raiseTm(days, floors.year! / yearTm));
}
