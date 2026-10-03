import { formatPercentSigned } from '@/lib/formatters';

type PayrollVariationProps = {
  delta: number | null;
  pct: number | null; // null pour un ratio (écart en points) ou une référence nulle
  formatDelta: (value: number) => string;
};

// Hausse = rose, baisse = vert, quasi nul = gris.
const toneClass = (change: number) =>
  Math.abs(change) < 0.05 ? 'text-slate-400' : change < 0 ? 'text-emerald-700' : 'text-pink-700';

export default function PayrollVariation({ delta, pct, formatDelta }: PayrollVariationProps) {
  if (delta === null) return <>—</>;
  return (
    <span className={`font-extrabold ${toneClass(pct ?? delta)}`}>
      {formatDelta(delta)}
      {pct !== null && <span className="ml-1 text-[11px] font-bold opacity-80">({formatPercentSigned(pct)})</span>}
    </span>
  );
}
