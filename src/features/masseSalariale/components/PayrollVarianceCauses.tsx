import { useState } from 'react';

import { formatEuroSigned } from '@/lib/formatters';

import type { PayrollCauseKind } from '../payrollVarianceAnalysis';
import type { PayrollVarianceView } from '../payrollVarianceSources';

type PayrollVarianceCausesProps = {
  variance: PayrollVarianceView;
};

// Hausse du coût = rose, baisse = vert.
const toneBar = (amount: number) => (amount > 0 ? 'bg-pink-700' : 'bg-emerald-700');
const toneText = (amount: number) => (amount > 0 ? 'text-pink-700' : 'text-emerald-700');

export default function PayrollVarianceCauses({ variance }: PayrollVarianceCausesProps) {
  const [openKind, setOpenKind] = useState<PayrollCauseKind | null>(null);
  const { totalDiff, causes, residual, fallbackLabels } = variance;
  const showResidual = Math.abs(residual) >= 1;
  const maxAmount = Math.max(...causes.map(cause => Math.abs(cause.amount)), showResidual ? Math.abs(residual) : 0, 1);
  const barWidth = (amount: number) => `${Math.max(2, (Math.abs(amount) / maxAmount) * 100)}%`;

  return (
    <div className="grid content-start gap-2 text-[12px]">
      <div className="text-sm font-black text-slate-700">D'où vient l'écart de {formatEuroSigned(totalDiff)} ?</div>

      {causes.map(cause => {
        const isOpen = openKind === cause.kind;
        return (
          <div key={cause.kind} className="grid gap-1">
            <button
              type="button"
              onClick={() => setOpenKind(isOpen ? null : cause.kind)}
              aria-expanded={isOpen}
              className="grid gap-1 rounded-lg px-1 py-1 text-left hover:bg-white/70"
            >
              <span className="flex items-baseline justify-between gap-3 font-bold text-slate-700">
                <span><span className={`mr-1.5 inline-block text-[10px] transition-transform ${isOpen ? 'rotate-90' : ''}`}>▸</span>{cause.label}</span>
                <span className={`font-extrabold tabular-nums ${toneText(cause.amount)}`}>{formatEuroSigned(cause.amount)}</span>
              </span>
              <span className="h-1.5 w-full rounded-full bg-slate-200">
                <span className={`block h-full rounded-full ${toneBar(cause.amount)}`} style={{ width: barWidth(cause.amount) }} />
              </span>
            </button>
            {isOpen && (
              <ul className="m-0 grid list-none gap-0.5 pb-1 pl-5 pr-1">
                {cause.people.map(person => (
                  <li key={person.key} className="flex justify-between gap-3 text-[11.5px] font-semibold text-slate-500">
                    <span>{person.nom}</span>
                    <span className={`font-bold tabular-nums ${toneText(person.amount)}`}>{formatEuroSigned(person.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}

      {showResidual && (
        <div className="grid gap-1 px-1 py-1">
          <span className="flex items-baseline justify-between gap-3 font-bold text-slate-500">
            <span>Non détaillé</span>
            <span className="font-extrabold tabular-nums">{formatEuroSigned(residual)}</span>
          </span>
          <span className="h-1.5 w-full rounded-full bg-slate-200">
            <span className="block h-full rounded-full bg-slate-400" style={{ width: barWidth(residual) }} />
          </span>
        </div>
      )}

      <div className="flex justify-between gap-3 border-t border-slate-900/20 px-1 pt-1.5 font-black text-slate-900">
        <span>Total expliqué</span>
        <span className="tabular-nums">{formatEuroSigned(totalDiff)}</span>
      </div>

      {fallbackLabels.length > 0 && (
        <p className="m-0 text-[11px] font-semibold text-slate-400">
          Détail par personne incomplet : réimporte le PDF de {fallbackLabels.join(' et ')} pour isoler les sortants et STC.
        </p>
      )}
    </div>
  );
}
