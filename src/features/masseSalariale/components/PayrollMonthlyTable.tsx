import { MONTH_NAMES } from '@/lib/constants';
import { formatEuroSymbol, formatPercent } from '@/lib/formatters';
import type { PayrollAlertThresholds } from '@/types/dataTypes';

import type { PayrollYearRow } from '../payrollCalculations';

type PayrollMonthlyTableProps = {
  year: number;
  rows: PayrollYearRow[];
  thresholds: PayrollAlertThresholds;
  selectedMonth: number;
  onSelectMonth: (month: number) => void;
};

const euro = (value: number | null) => (value === null ? '—' : formatEuroSymbol(value));

const sumOf = (values: Array<number | null>): number | null => {
  const present = values.filter((value): value is number => value !== null);
  return present.length === 0 ? null : present.reduce((total, value) => total + value, 0);
};

const cellClass = 'px-3 py-2 text-right tabular-nums';

export default function PayrollMonthlyTable({ year, rows, thresholds, selectedMonth, onSelectMonth }: PayrollMonthlyTableProps) {
  // Le ratio annuel ne compare que les mois ayant à la fois un coût et un CA (sinon il serait faussé).
  const comparable = rows.filter(row => row.totalCost !== null && row.revenue !== null);
  const comparableCost = sumOf(comparable.map(row => row.totalCost));
  const comparableRevenue = sumOf(comparable.map(row => row.revenue));
  const yearRatio = comparableCost !== null && comparableRevenue ? (comparableCost / comparableRevenue) * 100 : null;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
      <h3 className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-amber-50">Synthèse mensuelle {year}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-[11px] font-bold uppercase tracking-wider text-cyan-100/70">
              <th className="px-3 py-2 text-left">Mois</th>
              <th className="px-3 py-2 text-right">Coût global</th>
              <th className="px-3 py-2 text-right">Brut</th>
              <th className="px-3 py-2 text-right">CA réel</th>
              <th className="px-3 py-2 text-right">Coût global / CA</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const over = row.totalCostToRevenuePct !== null && row.totalCostToRevenuePct > thresholds.totalCostToRevenuePct;
              return (
                <tr
                  key={row.month}
                  onClick={() => onSelectMonth(row.month)}
                  className={`cursor-pointer border-t border-white/10 hover:bg-white/10 ${row.month === selectedMonth ? 'bg-amber-300/10' : ''}`}
                >
                  <td className="px-3 py-2 text-left font-bold text-cyan-50">{MONTH_NAMES[row.month]}</td>
                  <td className={`${cellClass} font-bold text-amber-50`}>{euro(row.totalCost)}</td>
                  <td className={`${cellClass} text-cyan-50`}>{euro(row.gross)}</td>
                  <td className={`${cellClass} text-cyan-50`}>{euro(row.revenue)}</td>
                  <td className={`${cellClass} font-bold ${over ? 'text-amber-300' : 'text-cyan-50'}`}>
                    {row.totalCostToRevenuePct === null ? '—' : `${over ? '▲ ' : ''}${formatPercent(row.totalCostToRevenuePct)}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-white/20 font-black text-amber-50">
              <td className="px-3 py-2 text-left">Total</td>
              <td className={cellClass}>{euro(sumOf(rows.map(row => row.totalCost)))}</td>
              <td className={cellClass}>{euro(sumOf(rows.map(row => row.gross)))}</td>
              <td className={cellClass}>{euro(sumOf(rows.map(row => row.revenue)))}</td>
              <td className={cellClass}>{yearRatio === null ? '—' : formatPercent(yearRatio)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-cyan-50/50">
        Cliquez sur un mois pour afficher son détail et ses comparaisons. Le ratio du total ne porte que sur les mois ayant à la fois un coût et un CA.
      </p>
    </section>
  );
}
