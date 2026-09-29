import { MONTH_NAMES } from '@/lib/constants';
import { formatEuroSymbol } from '@/lib/formatters';

import type { MonthPlanSummary } from '../planningEngine';
import { analyseGlass, analyseLabel } from '../../analyse/components/analyseStyles';

type PlanMonthTableProps = {
  summaries: MonthPlanSummary[];
  existingByMonth: Record<number, number>;
  onOpenMonth: (month: number) => void;
};

const th = `px-2 py-2 text-right ${analyseLabel}`;
const td = 'px-2 py-1.5 text-right text-xs font-semibold tabular-nums text-cyan-50';

export default function PlanMonthTable({ summaries, existingByMonth, onOpenMonth }: PlanMonthTableProps) {
  const total = summaries.reduce((acc, s) => ({
    cv: acc.cv + s.cvMidi + s.cvSoir, ca: acc.ca + s.caMidi + s.caSoir,
  }), { cv: 0, ca: 0 });

  return (
    <div className={`${analyseGlass} overflow-x-auto`}>
      <table className="w-full min-w-[820px] border-collapse">
        <thead>
          <tr className="border-b border-white/10">
            <th className={`${th} text-left`}>Mois</th>
            <th className={th}>Couverts midi</th>
            <th className={th}>Couverts soir</th>
            <th className={th}>CA midi</th>
            <th className={th}>CA soir</th>
            <th className={th}>CA total</th>
            <th className={th}>TM</th>
            <th className={th}>Jours à vérifier</th>
            <th className={th}>Prévisions existantes</th>
          </tr>
        </thead>
        <tbody>
          {summaries.map(s => (
            <tr key={s.month} className="cursor-pointer border-b border-white/5 hover:bg-white/[0.05]" onClick={() => onOpenMonth(s.month)}>
              <td className={`${td} text-left font-black text-amber-50`}>{MONTH_NAMES[s.month]}</td>
              <td className={td}>{s.cvMidi}</td>
              <td className={td}>{s.cvSoir}</td>
              <td className={td}>{formatEuroSymbol(s.caMidi)}</td>
              <td className={td}>{formatEuroSymbol(s.caSoir)}</td>
              <td className={`${td} font-black text-white`}>{formatEuroSymbol(s.caMidi + s.caSoir)}</td>
              <td className={td}>{s.tm === null ? '—' : formatEuroSymbol(s.tm)}</td>
              <td className={td}>
                {s.daysCritique > 0 && <span className="mr-1 rounded-full bg-rose-500/25 px-2 py-0.5 text-[10px] font-black text-rose-200">{s.daysCritique} critique(s)</span>}
                {s.daysFaible > 0 && <span className="mr-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-black text-amber-200">{s.daysFaible} faible(s)</span>}
                {s.daysManual > 0 && <span className="rounded-full bg-cyan-400/15 px-2 py-0.5 text-[10px] font-black text-cyan-200">{s.daysManual} modifié(s)</span>}
              </td>
              <td className={`${td} ${existingByMonth[s.month] ? 'text-amber-300' : 'text-cyan-50/40'}`}>
                {existingByMonth[s.month] ? `${existingByMonth[s.month]} jour(s)` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className={`${td} text-left font-black text-amber-50`}>Année</td>
            <td className={td} colSpan={2}>{total.cv} couverts</td>
            <td className={`${td} font-black text-white`} colSpan={3}>{formatEuroSymbol(total.ca)}</td>
            <td className={td}>{total.cv > 0 ? formatEuroSymbol(total.ca / total.cv) : '—'}</td>
            <td className={td} colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
