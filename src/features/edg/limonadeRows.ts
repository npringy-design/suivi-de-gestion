import { sumLimonadeStats, type LimonadeStats } from '@/features/edg/edgRealtimeSources';
import type { LimonadeSectionRow } from '@/features/edg/LimonadeSection';

export type LimonadeRowsMode = 'vsBudget' | 'vsN1' | 'budget' | 'realise';

type BuildOptions = {
  statsByMonth: readonly LimonadeStats[];
  monthLabels: readonly string[];
  mode: LimonadeRowsMode;
  // Mois N-1 alignés sur statsByMonth (mode 'vsN1' uniquement).
  statsN1ByMonth?: readonly LimonadeStats[];
  // Logique « à date » : le total ne cumule que les mois clos (comme les autres pages EDG).
  isMonthComplete?: (monthIndex: number) => boolean;
};

const EMPTY: LimonadeStats = { budget: { ca: 0, cvts: 0 }, realise: { ca: 0, cvts: 0 } };

const toRow = (label: string, stats: LimonadeStats, n1: LimonadeStats | undefined, mode: LimonadeRowsMode): LimonadeSectionRow => {
  if (mode === 'vsBudget') return { label, ref: stats.budget, actual: stats.realise };
  if (mode === 'vsN1') return { label, ref: (n1 ?? EMPTY).realise, actual: stats.realise };
  if (mode === 'budget') return { label, ref: stats.budget };
  return { label, ref: stats.realise };
};

export const buildLimonadeRows = ({ statsByMonth, monthLabels, mode, statsN1ByMonth, isMonthComplete }: BuildOptions) => {
  const rows = statsByMonth.map((stats, i) => toRow(monthLabels[i] ?? String(i + 1), stats, statsN1ByMonth?.[i], mode));
  const toDate = isMonthComplete !== undefined && (mode === 'vsBudget' || mode === 'vsN1');
  const included = (i: number) => !toDate || isMonthComplete(i);
  const totalStats = sumLimonadeStats(statsByMonth.filter((_, i) => included(i)));
  const totalN1 = statsN1ByMonth ? sumLimonadeStats(statsN1ByMonth.filter((_, i) => included(i))) : undefined;
  const total = toRow(toDate ? 'Total à date (mois clos)' : 'Total', totalStats, totalN1, mode);
  return { rows, total };
};
