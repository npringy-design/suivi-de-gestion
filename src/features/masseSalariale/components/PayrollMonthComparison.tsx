import { MONTH_NAMES } from '@/lib/constants';
import { formatDecimal, formatEuroSymbol, formatPercent } from '@/lib/formatters';

import type { PayrollComparison, PayrollIndicatorKey, PayrollMetrics } from '../payrollCalculations';

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

type BadgeTone = 'better' | 'worse' | 'flat';

const TONE_CLASS: Record<BadgeTone, string> = {
  better: 'bg-emerald-700/10 text-emerald-700',
  worse: 'bg-pink-700/10 text-pink-700',
  flat: 'bg-slate-900/10 text-slate-500',
};

// Une baisse du coût est affichée en vert, une hausse en rose.
function Badge({ pct, label }: { pct: number | null | undefined; label: string }) {
  if (pct == null) return <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-extrabold ${TONE_CLASS.flat}`}>{label} —</span>;
  const tone: BadgeTone = Math.abs(pct) < 0.05 ? 'flat' : pct < 0 ? 'better' : 'worse';
  return (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11.5px] font-extrabold ${TONE_CLASS[tone]}`}>
      {label} {pct > 0 ? '+' : ''}{pct.toFixed(1).replace('.', ',')} %
    </span>
  );
}

const ESTIMATE_HINT = 'estimation : forfaits jour selon le réglage, réimporter le PDF pour l\'exact';

// Une valeur estimée (ETP des mois importés avant l'ETP exact) s'affiche avec « ~ » et une infobulle.
const withEstimate = (value: number | null | undefined, estimated: boolean | undefined, format: (v: number) => string) =>
  value == null ? { text: '—' } : { text: `${estimated ? '~' : ''}${format(value)}`, hint: estimated ? ESTIMATE_HINT : undefined };

function Side({ title, metrics }: { title: string; metrics: PayrollMetrics | null }) {
  const rows: Array<{ label: string; text: string; hint?: string }> = [
    { label: 'Coût salarial global', text: euro(metrics?.totalCost) },
    { label: 'Brut', text: euro(metrics?.gross) },
    { label: 'Charges patronales', text: euro(metrics?.employerCharges) },
    { label: '% charges patronales', text: metrics?.chargesRatePct == null ? '—' : formatPercent(metrics.chargesRatePct) },
    { label: 'ETP', ...withEstimate(metrics?.etp, metrics?.etpEstimated, value => formatDecimal(value, 2)) },
    { label: 'Coût par ETP', ...withEstimate(metrics?.costPerEtp, metrics?.etpEstimated, formatEuroSymbol) },
  ];
  return (
    <div className="grid gap-2">
      <div className="text-sm font-black uppercase tracking-wide text-slate-500">{title}</div>
      {rows.map(({ label, text, hint }) => (
        <div key={label} className="flex justify-between gap-3 text-[12.5px]">
          <span className="font-bold text-slate-400">{label}</span>
          <span title={hint} className={`font-extrabold tabular-nums text-slate-900 ${hint ? 'cursor-help' : ''}`}>{text}</span>
        </div>
      ))}
    </div>
  );
}

export default function PayrollMonthComparison({ year, month, detail }: PayrollMonthComparisonProps) {
  const { current, lastYear, vsLastYear } = detail;
  const monthName = MONTH_NAMES[month];
  const pctOf = (key: PayrollIndicatorKey) => vsLastYear[key]?.pct;

  if (!current) {
    return <p className="m-0 text-[11.5px] font-bold text-slate-400">Aucun coût salarial pour ce mois : comparatif disponible une fois le coût importé.</p>;
  }

  return (
    <div className="grid items-center gap-3.5 sm:grid-cols-[1fr_auto_1fr]">
      <Side title={`${monthName} ${year - 1} (N-1)`} metrics={lastYear} />
      <div className="grid justify-items-center gap-2.5 text-center">
        <div className="text-xl font-black text-slate-400">→</div>
        <div className="grid gap-1">
          <Badge pct={pctOf('totalCost')} label="coût global" />
          <Badge pct={pctOf('gross')} label="brut" />
          <Badge pct={pctOf('employerCharges')} label="charges" />
          <Badge pct={pctOf('etp')} label="ETP" />
          <Badge pct={pctOf('costPerEtp')} label="coût/ETP" />
        </div>
      </div>
      <Side title={`${monthName} ${year}`} metrics={current} />
    </div>
  );
}
