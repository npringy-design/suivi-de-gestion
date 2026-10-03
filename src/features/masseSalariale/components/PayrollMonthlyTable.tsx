import { Fragment, useState } from 'react';

import { MONTH_NAMES } from '@/lib/constants';

import { computeVariation } from '../payrollCalculations';
import type { PayrollSeriesPoint } from '../payrollCalculations';
import { computeComparableTotals } from '../payrollCostEvolution';
import { ESTIMATE_HINT, PAYROLL_MEASURES, formatMeasurePoint } from '../payrollMeasures';
import type { PayrollMeasure } from '../payrollMeasures';
import PayrollMonthComparison from './PayrollMonthComparison';
import type { PayrollMonthDetail } from './PayrollMonthComparison';
import PayrollVariation from './PayrollVariation';

type PayrollMonthlyTableProps = {
  year: number;
  measure: PayrollMeasure;
  series: PayrollSeriesPoint[];
  lastYearSeries: PayrollSeriesPoint[];
  details: PayrollMonthDetail[];
};

const cell = 'px-2 py-2.5 text-right tabular-nums';

export default function PayrollMonthlyTable({ year, measure, series, lastYearSeries, details }: PayrollMonthlyTableProps) {
  const [openMonth, setOpenMonth] = useState<number | null>(null);
  const config = PAYROLL_MEASURES[measure];
  const valueOf = (point: PayrollSeriesPoint | undefined) => (point ? config.pick(point) : null);
  const comparable = computeComparableTotals(series.map(valueOf), lastYearSeries.map(valueOf), config.aggregate);
  const formatTotal = (value: number | null) => (value === null ? '—' : config.formatValue(value));

  return (
    <section className="rounded-2xl border border-slate-900/10 bg-white p-4 shadow-lg shadow-black/20">
      <h2 className="text-xs font-extrabold uppercase tracking-[0.1em] text-slate-900">Détail par mois</h2>
      <p className="mb-3 text-[11.5px] font-bold text-slate-400">
        {measure === 'cost'
          ? 'Cliquez un mois pour le comparer en détail (brut, charges patronales, % de charges) au même mois de l\'année précédente'
          : 'Cliquez un mois pour le comparer en détail (ETP, coût par ETP, heures) au même mois de l\'année précédente'}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-[12.5px]">
          <thead>
            <tr className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-400">
              <th className="px-2 pb-2 text-left">Mois</th>
              <th className="px-2 pb-2 text-right">{config.columnLabel} {year}</th>
              <th className="px-2 pb-2 text-right">{year - 1}</th>
              <th className="px-2 pb-2 text-right">Écart</th>
            </tr>
          </thead>
          <tbody>
            {series.map((point, index) => {
              const isOpen = openMonth === point.month;
              const value = valueOf(point);
              const lastYearPoint = lastYearSeries[index];
              const vsLastYear = computeVariation(value, valueOf(lastYearPoint));
              const empty = value === null;
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
                    <td className={cell} title={config.isEstimated(point) ? ESTIMATE_HINT : undefined}>{formatMeasurePoint(measure, point)}</td>
                    <td className={`${cell} text-slate-500`} title={lastYearPoint && config.isEstimated(lastYearPoint) ? ESTIMATE_HINT : undefined}>{formatMeasurePoint(measure, lastYearPoint)}</td>
                    <td className={cell}><PayrollVariation delta={vsLastYear?.delta ?? null} pct={vsLastYear?.pct ?? null} formatDelta={config.formatDelta} /></td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={4} className="p-0">
                        <div className="m-0.5 mb-2.5 rounded-xl bg-slate-100 p-3 sm:p-4">
                          <PayrollMonthComparison year={year} month={point.month} measure={measure} detail={details[point.month]} />
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
              <td className="px-2 py-2.5 text-left">Mois comparables ({comparable.months}){measure === 'etp' && comparable.months > 0 ? ' · moyenne' : ''}</td>
              <td className={cell}>{formatTotal(comparable.current)}</td>
              <td className={`${cell} text-slate-500`}>{formatTotal(comparable.lastYear)}</td>
              <td className={cell}><PayrollVariation delta={comparable.delta} pct={comparable.pct} formatDelta={config.formatDelta} /></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-2 text-[11px] font-semibold text-slate-400">
        {measure === 'cost' && 'Le coût importé n\'inclut ni la reprise des provisions de congés payés, ni les aides apprentis : il se lit en évolution, pas en rapport au CA. '}
        {measure === 'etp'
          ? 'La ligne « mois comparables » donne la moyenne des ETP des mois renseignés les deux années ; « ~ » = ETP estimé.'
          : 'La ligne « mois comparables » ne compte que les mois renseignés les deux années.'}
      </p>
    </section>
  );
}
