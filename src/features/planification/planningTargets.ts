import type { AnalyseDaySample, PlanDay, PlanLimonadeDay, PlanServiceProposal } from '@/types/dataTypes';

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
const limoCa: CaPicker = sample => sample.reel.caLimo;

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

// --- CA mensuel proposé : niveau du même mois en N-1 corrigé du calendrier de l'année cible ---

type SchoolStatus = 'hors_vacances' | 'vacances' | 'ete';

// Lecture du calendrier fournie par le moteur (statuts scolaires, fériés) : planningTargets reste pur.
export type CalendarModel = {
  describe: (isoDate: string) => { weekday: number; baseStatus: SchoolStatus; holiday: boolean };
  // Ratio de CA (couverts × TM) d'un jour férié par rapport à un jour normal du même jour de semaine.
  holidayFactor: (weekday: number) => number;
};

const typeKey = (weekday: number, status: SchoolStatus): string => `${weekday}|${status}`;

type LearnedWeights = { byMonth: Map<string, number[]>; overall: Map<string, number[]> };

// Ratios « CA moyen du type de jour (jour de semaine × statut scolaire) / CA journalier moyen », par année puis
// moyennés sur les années d'historique : par mois, et tous mois confondus (repli). Fériés exclus (ratio à part).
function learnTypeWeights(samples: AnalyseDaySample[], model: CalendarModel): LearnedWeights {
  const partialKey = partialMonthKey(samples);
  const learned: LearnedWeights = { byMonth: new Map(), overall: new Map() };
  const push = (map: Map<string, number[]>, key: string, ratio: number) => map.set(key, [...(map.get(key) ?? []), ratio]);

  const ratiosOf = (group: AnalyseDaySample[]): Map<string, number> => {
    const dailyMean = mean(group.map(restaurantCa));
    const byType = new Map<string, number[]>();
    group.forEach(sample => {
      const day = model.describe(sample.date);
      if (day.holiday) return;
      const key = typeKey(day.weekday, day.baseStatus);
      byType.set(key, [...(byType.get(key) ?? []), restaurantCa(sample)]);
    });
    return new Map(dailyMean > 0 ? [...byType.entries()].map(([key, values]) => [key, mean(values) / dailyMean] as [string, number]) : []);
  };

  const byYear = new Map<string, AnalyseDaySample[]>();
  const byYearMonth = new Map<string, AnalyseDaySample[]>();
  samples.forEach(sample => {
    if (sample.date.slice(0, 7) === partialKey) return;
    byYear.set(sample.date.slice(0, 4), [...(byYear.get(sample.date.slice(0, 4)) ?? []), sample]);
    byYearMonth.set(sample.date.slice(0, 7), [...(byYearMonth.get(sample.date.slice(0, 7)) ?? []), sample]);
  });
  byYear.forEach(group => ratiosOf(group).forEach((ratio, key) => push(learned.overall, key, ratio)));
  byYearMonth.forEach((group, yearMonth) => {
    const month = String(Number(yearMonth.slice(5, 7)) - 1);
    ratiosOf(group).forEach((ratio, key) => push(learned.byMonth, `${month}|${key}`, ratio));
  });
  return learned;
}

// Somme des poids de type de jour des jours d'un mois (jour férié : poids du jour normal × ratio férié).
function monthWeightSum(learned: LearnedWeights, model: CalendarModel, year: number, month: number): number {
  const pad = (value: number) => String(value).padStart(2, '0');
  let total = 0;
  for (let day = 1; day <= daysInMonth(year, month); day += 1) {
    const info = model.describe(`${year}-${pad(month + 1)}-${pad(day)}`);
    const key = typeKey(info.weekday, info.baseStatus);
    const ratios = learned.byMonth.get(`${month}|${key}`) ?? learned.overall.get(key);
    const weight = ratios && ratios.length > 0 ? mean(ratios) : 1;
    total += info.holiday ? weight * model.holidayFactor(info.weekday) : weight;
  }
  return total;
}

// CA restaurant proposé de chaque mois (0-11) de l'année cible : CA (réalisé, sinon budget) du même mois de la
// dernière année d'historique qui en a, × (poids des jours du mois cible / poids des jours du mois de cette année).
// Un mois sans aucun historique vaut 0 (il garde alors sa proposition jour par jour).
export function proposeMonthlyCa(samples: AnalyseDaySample[], targetYear: number, model: CalendarModel): number[] {
  const learned = learnTypeWeights(samples, model);
  const partialKey = partialMonthKey(samples);
  const years = [...new Set(samples.map(sample => Number(sample.date.slice(0, 4))))].filter(year => year < targetYear).sort((a, b) => b - a);
  return Array.from({ length: 12 }, (_, month) => {
    for (const year of years) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}`;
      if (key === partialKey) continue;
      const base = samples.filter(sample => sample.date.slice(0, 7) === key).reduce((acc, sample) => acc + restaurantCa(sample), 0);
      if (base <= 0) continue;
      const previous = monthWeightSum(learned, model, year, month);
      return previous > 0 ? base * (monthWeightSum(learned, model, targetYear, month) / previous) : base;
    }
    return 0;
  });
}

// CA à part (limonade) de chaque mois (0-11) : CA mensuel saisi, sinon CA annuel × poids
// historique du mois, sinon (sans objectif annuel) CA historique moyen du mois. Sans historique,
// répartition égale.
function planMonthlySeparate(
  samples: AnalyseDaySample[],
  pick: CaPicker,
  annual: number | null,
  monthly: Record<number, number | null>,
): Record<number, number> {
  const averages = averageMonthlyCa(samples, pick);
  const total = averages.reduce((acc, v) => acc + v, 0);
  return Object.fromEntries(averages.map((average, month) => {
    const override = monthly[month];
    if (typeof override === 'number') return [month, override];
    if (annual === null) return [month, round2(average)];
    return [month, round2(annual * (total > 0 ? average / total : 1 / 12))];
  }));
}

// --- Limonade (sites Au Bureau) : CA à part, sur le CA limonade des échantillons ---

export function proposeAnnualLimonade(samples: AnalyseDaySample[]): number {
  return Math.round(averageMonthlyCa(samples, limoCa).reduce((acc, v) => acc + v, 0));
}

export const planMonthlyLimonade = (
  samples: AnalyseDaySample[],
  annual: number | null,
  monthly: Record<number, number | null>,
): Record<number, number> => planMonthlySeparate(samples, limoCa, annual, monthly);

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

// --- Plancher de TM limonade (sites Au Bureau) : même règle que le restaurant, sur la limonade seule ---

type LimonadeTmEntry = { real: TmTotals; budget: TmTotals };

const emptyLimonadeEntry = (): LimonadeTmEntry => ({ real: { ca: 0, cv: 0 }, budget: { ca: 0, cv: 0 } });

// Plancher de TM limonade de N-1 : le plus haut du TM réalisé (jours avec CA et couverts limonade > 0) et
// du TM budgété (jours avec couverts limonade budget > 0), au total de l'année et par mois complet.
export function limonadeTmFloors(samples: AnalyseDaySample[], previousYear: number): TmFloors {
  const partialKey = partialMonthKey(samples);
  const year = emptyLimonadeEntry();
  const months = new Map<number, LimonadeTmEntry>();
  const add = (target: LimonadeTmEntry, sample: AnalyseDaySample) => {
    if (sample.reel.caLimo > 0 && sample.reel.cvLimo > 0) {
      target.real.ca += sample.reel.caLimo;
      target.real.cv += sample.reel.cvLimo;
    }
    if (sample.budget.cvLimo > 0) {
      target.budget.ca += sample.budget.caLimo;
      target.budget.cv += sample.budget.cvLimo;
    }
  };
  const highest = (entry: LimonadeTmEntry): number | null => {
    const values = [tmOfTotals(entry.real), tmOfTotals(entry.budget)].filter((v): v is number => v !== null);
    return values.length > 0 ? Math.max(...values) : null;
  };

  samples.filter(sample => Number(sample.date.slice(0, 4)) === previousYear).forEach(sample => {
    add(year, sample);
    if (sample.date.slice(0, 7) === partialKey) return;
    const month = Number(sample.date.slice(5, 7)) - 1;
    const entry = months.get(month) ?? emptyLimonadeEntry();
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

type LimonadeDayEntry = PlanLimonadeDay & { date: string };

const limonadeTmOf = (days: LimonadeDayEntry[]): number => {
  const cv = days.reduce((acc, day) => acc + day.cv, 0);
  return cv > 0 ? days.reduce((acc, day) => acc + day.ca, 0) / cv : 0;
};

// Relève les TM de `factor` en gardant le CA : les couverts baissent, l'arrondi est reporté de jour en jour.
function raiseLimonadeTm(days: LimonadeDayEntry[], factor: number): LimonadeDayEntry[] {
  let carry = 0;
  return days.map(day => {
    if (day.cv <= 0 || day.tm <= 0) return day;
    const tm = round2(day.tm * factor);
    const wanted = day.ca + carry;
    const cv = Math.max(0, Math.round(wanted / tm));
    const ca = round2(cv * tm);
    carry = wanted - ca;
    return { ...day, cv, tm, ca };
  });
}

// TM limonade mensuel puis annuel au moins égaux à ceux de N-1 : jamais de baisse de TM, seuls les
// couverts diminuent, le CA limonade du mois (la cible) est conservé.
export function enforceLimonadeTmFloors(
  daysByDate: Record<string, PlanLimonadeDay>,
  floors: TmFloors,
): Record<string, PlanLimonadeDay> {
  const entries: LimonadeDayEntry[] = Object.entries(daysByDate)
    .map(([date, day]) => ({ date, ...day }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const byMonth = Array.from({ length: 12 }, (_, month) => {
    const days = entries.filter(day => Number(day.date.slice(5, 7)) - 1 === month);
    const floor = floors.byMonth[month];
    const tm = limonadeTmOf(days);
    return floor !== undefined && tm > 0 && tm < floor ? raiseLimonadeTm(days, floor / tm) : days;
  });
  const yearTm = limonadeTmOf(byMonth.flat());
  const raised = floors.year !== null && yearTm > 0 && yearTm < floors.year
    ? byMonth.flatMap(days => raiseLimonadeTm(days, floors.year! / yearTm))
    : byMonth.flat();
  return Object.fromEntries(raised.map(({ date, ...day }) => [date, day]));
}
