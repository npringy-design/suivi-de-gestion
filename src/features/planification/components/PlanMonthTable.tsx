import { MONTH_NAMES } from '@/lib/constants';
import { formatEuroSymbol } from '@/lib/formatters';

import { analyseGlass, analyseLabel } from '../../analyse/components/analyseStyles';
import type { MonthPlanSummary } from '../planningEngine';

import PlanNumberInput from './PlanNumberInput';

type PlanMonthTableProps = {
  summaries: MonthPlanSummary[];
  existingByMonth: Record<number, number>;
  monthTargets: Record<number, number | null>;
  baseCaByMonth: Record<number, number>;
  onMonthTarget: (month: number, value: number | null) => void;
  vaeByMonth: Record<number, number>;
  vaeTargets: Record<number, number | null>;
  onMonthVae: (month: number, value: number | null) => void;
  onOpenMonth: (month: number) => void;
};

const th = `px-2 py-2 text-right ${analyseLabel}`;
const td = 'px-2 py-1.5 text-right text-xs font-semibold tabular-nums text-cyan-50';
const footLabel = `${td} text-left font-black text-amber-50`;

// TM avec VAE : le CA VAE est ajouté au CA restaurant, divisé par les mêmes couverts restaurant.
// Le TM restaurant (colonne « TM restaurant ») ne contient jamais de VAE.
const tmWithVae = (ca: number, vae: number, cv: number): string => (cv > 0 ? formatEuroSymbol((ca + vae) / cv) : '—');

export default function PlanMonthTable({
  summaries, existingByMonth, monthTargets, baseCaByMonth, onMonthTarget, vaeByMonth, vaeTargets, onMonthVae, onOpenMonth,
}: PlanMonthTableProps) {
  const total = summaries.reduce((acc, s) => ({
    cv: acc.cv + s.cvMidi + s.cvSoir,
    ca: acc.ca + s.caMidi + s.caSoir,
    vae: acc.vae + (vaeByMonth[s.month] ?? 0),
  }), { cv: 0, ca: 0, vae: 0 });

  return (
    <div className={`${analyseGlass} overflow-x-auto`}>
      <table className="w-full min-w-[1080px] border-collapse">
        <thead>
          <tr className="border-b border-white/10">
            <th className={`${th} text-left`}>Mois</th>
            <th className={th}>Couverts midi</th>
            <th className={th}>Couverts soir</th>
            <th className={th}>CA midi</th>
            <th className={th}>CA soir</th>
            <th className={th}>CA cible avant croissance (modifiable)</th>
            <th className={th}>CA restaurant prévu</th>
            <th className={th}>TM restaurant</th>
            <th className={th}>VAE (modifiable)</th>
            <th className={th}>TM avec VAE</th>
            <th className={th}>Jours à vérifier</th>
            <th className={th}>Prévisions existantes</th>
          </tr>
        </thead>
        <tbody>
          {summaries.map(s => {
            const vae = vaeByMonth[s.month] ?? 0;
            return (
              <tr key={s.month} className="cursor-pointer border-b border-white/5 hover:bg-white/[0.05]" onClick={() => onOpenMonth(s.month)}>
                <td className={`${td} text-left font-black text-amber-50`}>{MONTH_NAMES[s.month]}</td>
                <td className={td}>{s.cvMidi}</td>
                <td className={td}>{s.cvSoir}</td>
                <td className={td}>{formatEuroSymbol(s.caMidi)}</td>
                <td className={td}>{formatEuroSymbol(s.caSoir)}</td>
                <td className={`${td} font-black text-white`} onClick={event => event.stopPropagation()}>
                  <PlanNumberInput
                    ariaLabel={`CA cible ${MONTH_NAMES[s.month]}`}
                    value={monthTargets[s.month] ?? Math.round(baseCaByMonth[s.month] ?? s.caMidi + s.caSoir)}
                    step={100}
                    allowEmpty
                    highlight={typeof monthTargets[s.month] === 'number'}
                    onCommit={value => onMonthTarget(s.month, value === null || value < 0 ? null : value)}
                  />
                </td>
                <td className={`${td} font-black text-white`}>{formatEuroSymbol(s.caMidi + s.caSoir)}</td>
                <td className={td}>{s.tm === null ? '—' : formatEuroSymbol(s.tm)}</td>
                <td className={td} onClick={event => event.stopPropagation()}>
                  <PlanNumberInput
                    ariaLabel={`VAE ${MONTH_NAMES[s.month]}`}
                    value={vaeTargets[s.month] ?? Math.round(vae)}
                    step={100}
                    allowEmpty
                    highlight={typeof vaeTargets[s.month] === 'number'}
                    onCommit={value => onMonthVae(s.month, value === null || value < 0 ? null : value)}
                  />
                </td>
                <td className={td}>{tmWithVae(s.caMidi + s.caSoir, vae, s.cvMidi + s.cvSoir)}</td>
                <td className={td}>
                  {s.daysCritique > 0 && <span className="mr-1 rounded-full bg-rose-500/25 px-2 py-0.5 text-[10px] font-black text-rose-200">{s.daysCritique} critique(s)</span>}
                  {s.daysFaible > 0 && <span className="mr-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-black text-amber-200">{s.daysFaible} faible(s)</span>}
                  {s.daysManual > 0 && <span className="rounded-full bg-cyan-400/15 px-2 py-0.5 text-[10px] font-black text-cyan-200">{s.daysManual} modifié(s)</span>}
                </td>
                <td className={`${td} ${existingByMonth[s.month] ? 'text-amber-300' : 'text-cyan-50/40'}`}>
                  {existingByMonth[s.month] ? `${existingByMonth[s.month]} jour(s)` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-white/10">
            <td className={footLabel}>Restaurant</td>
            <td className={td} colSpan={2}>{total.cv} couverts</td>
            <td className={`${td} font-black text-white`} colSpan={4}>{formatEuroSymbol(total.ca)}</td>
            <td className={`${td} font-black text-white`}>{total.cv > 0 ? formatEuroSymbol(total.ca / total.cv) : '—'}</td>
            <td className={td} colSpan={4} />
          </tr>
          <tr>
            <td className={footLabel}>VAE</td>
            <td className={td} colSpan={7} />
            <td className={`${td} font-black text-white`}>{formatEuroSymbol(total.vae)}</td>
            <td className={td} colSpan={3} />
          </tr>
          <tr className="border-t border-white/10">
            <td className={footLabel}>Total avec VAE</td>
            <td className={td} colSpan={2} />
            <td className={`${td} font-black text-white`} colSpan={4}>{formatEuroSymbol(total.ca + total.vae)}</td>
            <td className={td} colSpan={2} />
            <td className={`${td} font-black text-white`}>{tmWithVae(total.ca, total.vae, total.cv)}</td>
            <td className={td} colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
