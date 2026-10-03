import { Fragment, useState } from 'react';

import { MONTH_NAMES } from '@/lib/constants';
import { formatEuroSymbol, formatPercent } from '@/lib/formatters';

import type { PayrollSeriesPoint } from '../payrollCalculations';
import type { PayrollYearSummary } from '../payrollYearSummary';
import PayrollMonthComparison from './PayrollMonthComparison';
import type { PayrollMonthDetail } from './PayrollMonthComparison';

type PayrollMonthlyTableProps = {
  year: number;
  series: PayrollSeriesPoint[];
  details: PayrollMonthDetail[];
  summary: PayrollYearSummary;
  thresholdPct: number;
};

type Status = 'ok' | 'alert' | 'upcoming' | 'missing';

const STATUS_LABEL: Record<Status, string> = { ok: 'ok', alert: 'au-dessus', upcoming: 'à venir', missing: 'sans données' };
const STATUS_CLASS: Record<Status, string> = {
  ok: 'bg-emerald-700/10 text-emerald-700',
  alert: 'bg-pink-700/10 text-pink-700',
  upcoming: 'bg-slate-100 text-slate-400',
  missing: 'bg-slate-100 text-slate-400',
};

const euro = (value: number | null) => (value === null ? '—' : formatEuroSymbol(value));

const getStatus = (point: PayrollSeriesPoint, thresholdPct: number, now: Date): Status => {
  if (point.totalCostToRevenuePct !== null) return point.totalCostToRevenuePct > thresholdPct ? 'alert' : 'ok';
  const isFuture = point.year > now.getFullYear() || (point.year === now.getFullYear() && point.month > now.getMonth());
  return isFuture ? 'upcoming' : 'missing';
};

const cell = 'px-2 py-2.5 text-right tabular-nums';

export default function PayrollMonthlyTable({ year, series, details, summary, thresholdPct }: PayrollMonthlyTableProps) {
  const [openMonth, setOpenMonth] = useState<number | null>(null);
  const now = new Date();

  return (
    <section className="rounded-2xl border border-slate-900/10 bg-white p-4 shadow-lg shadow-black/20">
      <h2 className="text-xs font-extrabold uppercase tracking-[0.1em] text-slate-900">Détail par mois</h2>
      <p className="mb-3 text-[11.5px] font-bold text-slate-400">Cliquez un mois pour le comparer au même mois de l'année précédente</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
          <thead>
            <tr className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-400">
              <th className="px-2 pb-2 text-left">Mois</th>
              <th className="px-2 pb-2 text-right">CA réalisé</th>
              <th className="px-2 pb-2 text-right">Coût salarial</th>
              <th className="px-2 pb-2 text-right">Ratio</th>
              <th className="px-2 pb-2 text-right">Statut</th>
            </tr>
          </thead>
          <tbody>
            {series.map(point => {
              const status = getStatus(point, thresholdPct, now);
              const isOpen = openMonth === point.month;
              const dim = status === 'upcoming';
              return (
                <Fragment key={point.month}>
                  <tr
                    onClick={() => setOpenMonth(isOpen ? null : point.month)}
                    aria-expanded={isOpen}
                    className={`cursor-pointer border-t border-slate-900/10 font-bold ${isOpen ? 'bg-amber-50' : 'hover:bg-slate-50'} ${dim ? 'font-semibold italic text-slate-400' : 'text-slate-900'}`}
                  >
                    <td className="px-2 py-2.5 text-left font-extrabold">
                      <span className={`mr-1.5 inline-block text-[10px] transition-transform ${isOpen ? 'rotate-90 text-amber-700' : 'text-slate-400'}`}>▸</span>
                      {MONTH_NAMES[point.month]} {year}
                    </td>
                    <td className={cell}>{euro(point.revenue)}</td>
                    <td className={cell}>{euro(point.totalCost)}</td>
                    <td className={cell}>{point.totalCostToRevenuePct === null ? '—' : formatPercent(point.totalCostToRevenuePct)}</td>
                    <td className={cell}>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-extrabold not-italic ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>
                    </td>
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
              <td className="px-2 py-2.5 text-left">Cumul</td>
              <td className={cell}>{summary.revenueMonths ? euro(summary.revenueTotal) : '—'}</td>
              <td className={cell}>{summary.costMonths ? euro(summary.costTotal) : '—'}</td>
              <td className={cell}>{summary.ratioPct === null ? '—' : formatPercent(summary.ratioPct)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-2 text-[11px] font-semibold text-slate-400">
        Le ratio du cumul ne porte que sur les mois ayant à la fois un coût et un CA ({summary.comparableMonths} mois).
      </p>
    </section>
  );
}
