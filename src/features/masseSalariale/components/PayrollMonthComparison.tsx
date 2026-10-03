import { MONTH_NAMES } from '@/lib/constants';
import { formatEuroSymbol, formatPercent } from '@/lib/formatters';

import { computeVariation } from '../payrollCalculations';
import type { PayrollComparison, PayrollMetrics } from '../payrollCalculations';

export type PayrollMonthDetail = {
  current: PayrollMetrics | null;
  lastYear: PayrollMetrics | null;
  vsLastYear: PayrollComparison;
};

type PayrollMonthComparisonProps = {
  year: number;
  month: number;
  detail: PayrollMonthDetail;
};

const euro = (value: number | null | undefined) => (value == null ? '—' : formatEuroSymbol(value));
const pct = (value: number | null | undefined) => (value == null ? '—' : formatPercent(value));

type BadgeTone = 'better' | 'worse' | 'flat';

const TONE_CLASS: Record<BadgeTone, string> = {
  better: 'bg-emerald-700/10 text-emerald-700',
  worse: 'bg-pink-700/10 text-pink-700',
  flat: 'bg-slate-900/10 text-slate-500',
};

// Pour le coût et le ratio, une baisse est une amélioration ; le CA reste neutre.
function Badge({ delta, unit, label, lowerIsBetter }: { delta: number | null | undefined; unit: '%' | 'pt'; label: string; lowerIsBetter: boolean }) {
  if (delta == null) return <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-extrabold ${TONE_CLASS.flat}`}>—</span>;
  const tone: BadgeTone = Math.abs(delta) < 0.05 || !lowerIsBetter ? 'flat' : delta < 0 ? 'better' : 'worse';
  const text = `${delta > 0 ? '+' : ''}${delta.toFixed(1).replace('.', ',')} ${unit} ${label}`;
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11.5px] font-extrabold ${TONE_CLASS[tone]}`}>{text}</span>;
}

function Side({ title, metrics }: { title: string; metrics: PayrollMetrics | null }) {
  const rows: Array<[string, string]> = [
    ['CA réalisé', euro(metrics?.revenue)],
    ['Coût salarial', euro(metrics?.totalCost)],
    ['Ratio coût / CA', pct(metrics?.totalCostToRevenuePct)],
  ];
  return (
    <div className="grid gap-2">
      <div className="text-sm font-black uppercase tracking-wide text-slate-500">{title}</div>
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3 text-[12.5px]">
          <span className="font-bold text-slate-400">{label}</span>
          <span className="font-extrabold tabular-nums text-slate-900">{value}</span>
        </div>
      ))}
    </div>
  );
}

export default function PayrollMonthComparison({ year, month, detail }: PayrollMonthComparisonProps) {
  const { current, lastYear, vsLastYear } = detail;
  const monthName = MONTH_NAMES[month];
  const revenueVariation = computeVariation(current?.revenue ?? null, lastYear?.revenue ?? null);

  if (!current) {
    return <p className="m-0 text-[11.5px] font-bold text-slate-400">Aucun coût salarial pour ce mois : comparatif disponible une fois le coût importé.</p>;
  }

  return (
    <div className="grid items-center gap-3.5 sm:grid-cols-[1fr_auto_1fr]">
      <Side title={`${monthName} ${year - 1} (N-1)`} metrics={lastYear} />
      <div className="grid justify-items-center gap-2.5 text-center">
        <div className="text-xl font-black text-slate-400">→</div>
        <div className="grid gap-1">
          <Badge delta={revenueVariation?.pct} unit="%" label="CA" lowerIsBetter={false} />
          <Badge delta={vsLastYear.totalCost?.pct} unit="%" label="coût" lowerIsBetter />
          <Badge delta={vsLastYear.totalCostToRevenuePct?.delta} unit="pt" label="ratio" lowerIsBetter />
        </div>
      </div>
      <Side title={`${monthName} ${year}`} metrics={current} />
    </div>
  );
}
