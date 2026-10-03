import { formatEuro, formatPercent } from '@/lib/formatters';

import type { PayrollYearSummary } from '../payrollYearSummary';

type PayrollYearKpisProps = {
  year: number;
  summary: PayrollYearSummary;
  thresholdPct: number;
};

const euroK = (value: number) => `${formatEuro(Math.round(value / 1000))} k€`;

function Tile({ label, children, footer }: { label: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="grid min-w-0 gap-1.5 rounded-2xl border border-slate-900/10 bg-white p-4 shadow-lg shadow-black/20">
      <div className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-slate-400">{label}</div>
      <div className="text-3xl font-black tabular-nums text-slate-900">{children}</div>
      {footer}
    </div>
  );
}

export default function PayrollYearKpis({ year, summary, thresholdPct }: PayrollYearKpisProps) {
  const delta = summary.ratioDeltaVsLastYearPt;
  const deltaClass = delta === null || Math.abs(delta) < 0.05 ? 'text-slate-400' : delta < 0 ? 'text-emerald-700' : 'text-pink-700';

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile label={`CA réalisé (${summary.revenueMonths} mois)`}>{summary.revenueMonths ? euroK(summary.revenueTotal) : '—'}</Tile>
      <Tile label={`Coût salarial importé (${summary.costMonths} mois)`}>{summary.costMonths ? euroK(summary.costTotal) : '—'}</Tile>
      <Tile
        label="Ratio moyen coût / CA"
        footer={delta !== null && (
          <div className={`text-[11.5px] font-extrabold ${deltaClass}`}>
            {delta > 0 ? '+' : delta < 0 ? '− ' : ''}{Math.abs(delta).toFixed(1).replace('.', ',')} pt vs {year - 1}
          </div>
        )}
      >
        {summary.ratioPct === null ? '—' : formatPercent(summary.ratioPct)}
      </Tile>
      <Tile label={`Mois au-dessus du seuil (${formatPercent(thresholdPct)})`}>
        {summary.monthsOverThreshold}
        <small className="ml-1.5 text-[13px] font-extrabold text-slate-500">/ {summary.comparableMonths} mois comparables</small>
      </Tile>
    </section>
  );
}
