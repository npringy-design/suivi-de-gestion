import { Fragment, useState } from 'react';

import { MONTH_NAMES } from '@/lib/constants';
import { formatEuroSigned, formatEuroSymbol, formatPercentSigned } from '@/lib/formatters';

import { computeVariation } from '../payrollCalculations';
import type { PayrollSeriesPoint } from '../payrollCalculations';
import type { PayrollCostEvolution } from '../payrollCostEvolution';
import PayrollMonthComparison from './PayrollMonthComparison';
import type { PayrollMonthDetail } from './PayrollMonthComparison';

type PayrollMonthlyTableProps = {
  year: number;
  series: PayrollSeriesPoint[];
  lastYearSeries: PayrollSeriesPoint[];
  details: PayrollMonthDetail[];
  evolution: PayrollCostEvolution;
};

const euro = (value: number | null) => (value === null ? '—' : formatEuroSymbol(value));
const cell = 'px-2 py-2.5 text-right tabular-nums';

// Hausse du coût = rose, baisse = vert.
const toneClass = (pct: number | null) =>
  pct === null || Math.abs(pct) < 0.05 ? 'text-slate-400' : pct < 0 ? 'text-emerald-700' : 'text-pink-700';

function Variation({ delta, pct }: { delta: number | null; pct: number | null }) {
  if (delta === null) return <>—</>;
  return (
    <span className={`font-extrabold ${toneClass(pct)}`}>
      {pct === null ? formatEuroSigned(delta) : formatPercentSigned(pct)}
      {pct !== null && <span className="ml-1.5 hidden text-[11px] font-bold opacity-80 sm:inline">({formatEuroSigned(delta)})</span>}
    </span>
  );
}

export default function PayrollMonthlyTable({ year, series, lastYearSeries, details, evolution }: PayrollMonthlyTableProps) {
  const [openMonth, setOpenMonth] = useState<number | null>(null);

  return (
    <section className="rounded-2xl border border-slate-900/10 bg-white p-4 shadow-lg shadow-black/20">
      <h2 className="text-xs font-extrabold uppercase tracking-[0.1em] text-slate-900">Détail par mois</h2>
      <p className="mb-3 text-[11.5px] font-bold text-slate-400">
        Cliquez un mois pour le comparer en détail (brut, charges, coût horaire) au même mois de l'année précédente
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse text-[12.5px]">
          <thead>
            <tr className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-400">
              <th className="px-2 pb-2 text-left">Mois</th>
              <th className="px-2 pb-2 text-right">Coût salarial</th>
              <th className="px-2 pb-2 text-right">vs mois précédent</th>
              <th className="px-2 pb-2 text-right">Même mois {year - 1}</th>
              <th className="px-2 pb-2 text-right">Écart vs {year - 1}</th>
            </tr>
          </thead>
          <tbody>
            {series.map((point, index) => {
              const isOpen = openMonth === point.month;
              const previousCost = index === 0 ? lastYearSeries[11]?.totalCost ?? null : series[index - 1].totalCost;
              const vsPrevious = computeVariation(point.totalCost, previousCost);
              const lastYearCost = lastYearSeries[index]?.totalCost ?? null;
              const vsLastYear = computeVariation(point.totalCost, lastYearCost);
              const empty = point.totalCost === null;
              return (
                <Fragment key={point.month}>
                  <tr
                    onClick={() => setOpenMonth(isOpen ? null : point.month)}
                    aria-expanded={isOpen}
                    className={`cursor-pointer border-t border-slate-900/10 font-bold ${isOpen ? 'bg-amber-50' : 'hover:bg-slate-50'} ${empty ? 'font-semibold text-slate-400' : 'text-slate-900'}`}
                  >
                    <td className="px-2 py-2.5 text-left font-extrabold">
                      <span className={`mr-1.5 inline-block text-[10px] transition-transform ${isOpen ? 'rotate-90 text-amber-700' : 'text-slate-400'}`}>▸</span>
                      {MONTH_NAMES[point.month]} {year}
                    </td>
                    <td className={cell}>{euro(point.totalCost)}</td>
                    <td className={cell}><Variation delta={vsPrevious?.delta ?? null} pct={vsPrevious?.pct ?? null} /></td>
                    <td className={`${cell} text-slate-500`}>{euro(lastYearCost)}</td>
                    <td className={cell}><Variation delta={vsLastYear?.delta ?? null} pct={vsLastYear?.pct ?? null} /></td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={5} className="p-0">
                        <div className="m-0.5 mb-2.5 rounded-xl bg-slate-100 p-4">
                          <PayrollMonthComparison year={year} month={point.month} detail={details[point.month]} />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-900/20 font-black text-slate-900">
              <td className="px-2 py-2.5 text-left">Mois comparables ({evolution.comparableMonths})</td>
              <td className={cell}>{evolution.comparableMonths ? euro(evolution.comparableCost) : '—'}</td>
              <td />
              <td className={`${cell} text-slate-500`}>{evolution.comparableMonths ? euro(evolution.comparableLastYearCost) : '—'}</td>
              <td className={cell}><Variation delta={evolution.vsLastYearDelta} pct={evolution.vsLastYearPct} /></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-2 text-[11px] font-semibold text-slate-400">
        Le coût importé n'inclut ni la reprise des provisions de congés payés, ni les aides apprentis : il se lit en évolution, pas en rapport au CA.
        La ligne « mois comparables » ne compte que les mois renseignés les deux années.
      </p>
    </section>
  );
}
