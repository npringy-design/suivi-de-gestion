import { MONTH_NAMES, MONTH_NAMES_SHORT } from '@/lib/constants';

import { computeVariation } from '../payrollCalculations';
import type { PayrollComparison, PayrollMetrics } from '../payrollCalculations';
import { ESTIMATE_HINT, PAYROLL_MEASURES } from '../payrollMeasures';
import type { PayrollDetailRow, PayrollMeasure } from '../payrollMeasures';
import type { PayrollVarianceView } from '../payrollVarianceSources';
import PayrollVarianceCauses from './PayrollVarianceCauses';
import PayrollVariation from './PayrollVariation';

export type PayrollMonthDetail = {
  current: PayrollMetrics | null;
  lastYear: PayrollMetrics | null;
  vsLastYear: PayrollComparison;
  variance: PayrollVarianceView | null; // causes de l'écart de coût vs N-1 (onglet Coût)
};

type PayrollMonthComparisonProps = {
  year: number;
  month: number;
  measure: PayrollMeasure;
  detail: PayrollMonthDetail;
};

const cell = 'px-2 py-1.5 text-right tabular-nums';

const valueOf = (row: PayrollDetailRow, metrics: PayrollMetrics | null) => (metrics ? row.value(metrics) : null);
const isEmpty = (value: number | null) => value === null || Math.abs(value) < 0.005;

function DetailCell({ row, metrics, className }: { row: PayrollDetailRow; metrics: PayrollMetrics | null; className: string }) {
  const value = valueOf(row, metrics);
  const estimated = value !== null && metrics !== null && row.isEstimated?.(metrics) === true;
  return (
    <td className={className} title={estimated ? ESTIMATE_HINT : undefined}>
      {value === null ? '—' : `${estimated ? '~' : ''}${row.formatValue(value)}`}
    </td>
  );
}

// Détail du mois : N-1 face à N, lignes définies par grandeur (PAYROLL_MEASURES[measure].detailRows).
export default function PayrollMonthComparison({ year, month, measure, detail }: PayrollMonthComparisonProps) {
  const { current, lastYear } = detail;

  if (!current) {
    return <p className="m-0 text-[11.5px] font-bold text-slate-400">Aucun coût salarial pour ce mois : comparatif disponible une fois le coût importé.</p>;
  }

  const rows = PAYROLL_MEASURES[measure].detailRows.filter(
    row => !row.hideWhenEmpty || !(isEmpty(valueOf(row, current)) && isEmpty(valueOf(row, lastYear))),
  );
  const shortMonth = MONTH_NAMES_SHORT[month];
  const variance = measure === 'cost' ? detail.variance : null;

  return (
    <div className={variance ? 'grid gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]' : undefined}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-400">
              <th className="px-2 pb-1.5 text-left">{MONTH_NAMES[month]}</th>
              <th className="px-2 pb-1.5 text-right">{shortMonth} {year - 1}</th>
              <th className="px-2 pb-1.5 text-right">{shortMonth} {year}</th>
              <th className="px-2 pb-1.5 text-right">Écart</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const variation = computeVariation(valueOf(row, current), valueOf(row, lastYear), row.kind === 'ratio');
              return (
                <tr key={row.key} className="border-t border-slate-900/10 font-bold text-slate-900">
                  <td className={`px-2 py-1.5 text-left font-bold text-slate-500 ${row.hint ? 'cursor-help' : ''}`} title={row.hint}>
                    {row.label}{row.hint ? ' ⓘ' : ''}
                  </td>
                  {/* computeVariation(courant, référence) : l'écart est courant − N-1 */}
                  <DetailCell row={row} metrics={lastYear} className={`${cell} text-slate-500`} />
                  <DetailCell row={row} metrics={current} className={`${cell} font-extrabold`} />
                  <td className={cell}>
                    <PayrollVariation delta={variation?.delta ?? null} pct={variation?.pct ?? null} formatDelta={row.formatDelta} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {variance && lastYear?.totalCost != null && current.totalCost !== null && (
        <PayrollVarianceCauses key={`${year}-${month}`} variance={variance} year={year} month={month} previousCost={lastYear.totalCost} currentCost={current.totalCost} />
      )}
    </div>
  );
}
