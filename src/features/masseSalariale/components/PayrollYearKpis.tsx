import type { ReactNode } from 'react';

import { MONTH_NAMES } from '@/lib/constants';
import { formatEuro, formatPercentSigned } from '@/lib/formatters';

import type { PayrollCostEvolution } from '../payrollCostEvolution';

type PayrollYearKpisProps = {
  year: number;
  evolution: PayrollCostEvolution;
};

const euro = (value: number) => `${formatEuro(Math.round(value))} €`;
const signedEuro = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${euro(Math.abs(value))}`;

// Hausse du coût = rose, baisse = vert ; variation quasi nulle = neutre.
const toneClass = (pct: number | null) =>
  pct === null || Math.abs(pct) < 0.05 ? 'text-slate-400' : pct < 0 ? 'text-emerald-700' : 'text-pink-700';

function Tile({ label, children, footer }: { label: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-w-0 content-start gap-1.5 rounded-2xl border border-slate-900/10 bg-white p-4 shadow-lg shadow-black/20">
      <div className="text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-slate-400">{label}</div>
      <div className="text-2xl font-black tabular-nums text-slate-900">{children}</div>
      {footer}
    </div>
  );
}

export default function PayrollYearKpis({ year, evolution }: PayrollYearKpisProps) {
  const { vsLastYearDelta, vsLastYearPct, vsPreviousDelta, vsPreviousPct, latestMonth } = evolution;

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile
        label={`Coût salarial cumulé ${year}`}
        footer={<div className="text-[11.5px] font-bold text-slate-400">{evolution.costMonths} mois renseigné{evolution.costMonths > 1 ? 's' : ''}</div>}
      >
        {evolution.costMonths ? euro(evolution.costTotal) : '—'}
      </Tile>

      <Tile
        label={`Mêmes mois en ${year - 1}`}
        footer={<div className="text-[11.5px] font-bold text-slate-400">{evolution.comparableMonths} mois comparable{evolution.comparableMonths > 1 ? 's' : ''}</div>}
      >
        {evolution.comparableMonths ? euro(evolution.comparableLastYearCost) : '—'}
      </Tile>

      <Tile
        label={`Évolution vs ${year - 1} (mois comparables)`}
        footer={vsLastYearDelta !== null && (
          <div className={`text-[11.5px] font-extrabold ${toneClass(vsLastYearPct)}`}>
            {signedEuro(vsLastYearDelta)} sur {euro(evolution.comparableCost)}
          </div>
        )}
      >
        <span className={toneClass(vsLastYearPct)}>{vsLastYearPct === null ? '—' : formatPercentSigned(vsLastYearPct)}</span>
      </Tile>

      <Tile
        label={latestMonth === null ? 'Dernier mois vs précédent' : `${MONTH_NAMES[latestMonth]} vs mois précédent`}
        footer={vsPreviousDelta !== null && (
          <div className={`text-[11.5px] font-extrabold ${toneClass(vsPreviousPct)}`}>{signedEuro(vsPreviousDelta)}</div>
        )}
      >
        <span className={toneClass(vsPreviousPct)}>{vsPreviousPct === null ? '—' : formatPercentSigned(vsPreviousPct)}</span>
      </Tile>
    </section>
  );
}
