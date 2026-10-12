import type { AnalyseDaySample, PlanDay, PlanServiceProposal } from '@/types/dataTypes';

const mean = (values: number[]): number => values.reduce((acc, v) => acc + v, 0) / values.length;
const round2 = (value: number): number => Math.round(value * 100) / 100;

const dayCa = (day: PlanDay): number => day.midi.ca + day.soir.ca;

const daysInMonth = (year: number, month: number): number => new Date(year, month + 1, 0).getDate();

// CA restaurant (midi + soir) par mois de l'historique, en écartant le mois en cours de saisie :
// celui du dernier jour réalisé, s'il s'arrête à plus de 3 jours de la fin du mois (partiel, il
// fausserait les poids). Sans aucun mois complet, tous les mois sont conservés.
function completeMonthTotals(samples: AnalyseDaySample[]): Map<number, number[]> {
  const totals = new Map<string, { month: number; ca: number }>();
  samples.forEach(sample => {
    const key = sample.date.slice(0, 7);
    const entry = totals.get(key) ?? { month: Number(sample.date.slice(5, 7)) - 1, ca: 0 };
    entry.ca += sample.reel.caMidi + sample.reel.caSoir;
    totals.set(key, entry);
  });

  const lastDate = samples.reduce((max, s) => (s.date > max ? s.date : max), '');
  const isPartial = lastDate !== ''
    && Number(lastDate.slice(8, 10)) < daysInMonth(Number(lastDate.slice(0, 4)), Number(lastDate.slice(5, 7)) - 1) - 3;
  const keys = [...totals.keys()].filter(key => !isPartial || key !== lastDate.slice(0, 7));
  const used = keys.length > 0 ? keys : [...totals.keys()];

  const byMonth = new Map<number, number[]>();
  used.forEach(key => {
    const { month, ca } = totals.get(key)!;
    byMonth.set(month, [...(byMonth.get(month) ?? []), ca]);
  });
  return byMonth;
}

// CA moyen de chaque mois (0-11) sur les années d'historique où il est complet.
function averageMonthlyCa(samples: AnalyseDaySample[]): number[] {
  const byMonth = completeMonthTotals(samples);
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

