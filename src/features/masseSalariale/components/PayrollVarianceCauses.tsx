import { MONTH_NAMES } from '@/lib/constants';
import { formatEuroSigned, formatEuroSymbol, formatPercentSigned } from '@/lib/formatters';

import { buildPayrollCascade } from '../payrollVarianceCascade';
import type { CascadeBar } from '../payrollVarianceCascade';
import type { PayrollCause, PayrollPersonTag } from '../payrollVarianceAnalysis';
import type { PayrollVarianceView } from '../payrollVarianceSources';
import PayrollCausePeople, { toneText } from './PayrollCausePeople';

type PayrollVarianceCausesProps = {
  variance: PayrollVarianceView;
  year: number;
  month: number;
  previousCost: number;
  currentCost: number;
};

const toneBar = (amount: number) => (amount > 0 ? 'bg-pink-700' : 'bg-emerald-700');

function Track({ bar, className }: { bar: CascadeBar; className: string }) {
  return (
    <span className="relative block h-2 w-full rounded-full bg-slate-200/70">
      <span className={`absolute top-0 h-full rounded-full ${className}`} style={{ left: `${bar.left}%`, width: `${bar.width}%` }} />
    </span>
  );
}

function EndRow({ label, cost, bar }: { label: string; cost: number; bar: CascadeBar }) {
  return (
    <div className="grid gap-1">
      <div className="flex items-baseline justify-between gap-3 font-black text-slate-900">
        <span>{label}</span>
        <span className="tabular-nums">{formatEuroSymbol(cost)}</span>
      </div>
      <Track bar={bar} className="bg-slate-400" />
    </div>
  );
}

// Sous-titre de la cause « Entrées / sorties » : nombre d'arrivées, de départs et de sorties STC.
const entriesExitsSubtitle = (cause: PayrollCause): string => {
  const count = (kind: PayrollPersonTag['kind']) => cause.people.filter(person => person.tag?.kind === kind).length;
  const parts: Array<[number, string, string]> = [
    [count('arrival'), 'arrivée', 'arrivées'],
    [count('departure'), 'départ', 'départs'],
    [count('stc'), 'sortie STC', 'sorties STC'],
  ];
  return parts.filter(([n]) => n > 0).map(([n, one, many]) => `${n} ${n > 1 ? many : one}`).join(' · ');
};

function summarySentence(variance: PayrollVarianceView, year: number, month: number, previousCost: number): string {
  const { totalDiff } = variance;
  const monthName = MONTH_NAMES[month];
  const pct = previousCost !== 0 ? (totalDiff / Math.abs(previousCost)) * 100 : null;
  const gap = totalDiff === 0
    ? 'autant que'
    : `${formatEuroSymbol(Math.abs(totalDiff))}${pct === null ? '' : ` (${formatPercentSigned(pct)})`} de ${totalDiff > 0 ? 'plus' : 'moins'} que`;
  return `${monthName} ${year} coûte ${gap} ${monthName.toLowerCase()} ${year - 1}.`;
}

export default function PayrollVarianceCauses({ variance, year, month, previousCost, currentCost }: PayrollVarianceCausesProps) {
  const { causes, residual, fallbackLabels } = variance;
  const showResidual = Math.abs(residual) >= 1;
  const stepAmounts = [...causes.map(cause => cause.amount), ...(showResidual ? [residual] : [])];
  const cascade = buildPayrollCascade(previousCost, stepAmounts);
  const monthName = MONTH_NAMES[month];
  const mainCauses = [...causes].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

  return (
    <div className="grid min-w-0 content-start gap-3 text-[12px]">
      <div className="text-sm font-black text-slate-700">
        Comment on passe de {formatEuroSymbol(previousCost)} à {formatEuroSymbol(currentCost)}
      </div>

      <p className="m-0 text-[12.5px] font-semibold leading-relaxed text-slate-600">
        {summarySentence(variance, year, month, previousCost)}
        {mainCauses.length > 0 && (
          <> Principales causes : {mainCauses.map(cause => `${cause.label} ${formatEuroSigned(cause.amount)}`).join(', ')}.</>
        )}
      </p>

      <EndRow label={`${monthName} ${year - 1}`} cost={previousCost} bar={cascade.start} />

      {causes.map((cause, index) => (
        <div key={cause.kind} className="grid gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 font-bold text-slate-700">
              <span className={`mr-1 ${toneText(cause.amount)}`} aria-hidden="true">{cause.amount > 0 ? '▲' : '▼'}</span>
              {cause.label}
              {cause.kind === 'entriesExits' && <span className="block pl-4 text-[11px] font-semibold text-slate-400">{entriesExitsSubtitle(cause)}</span>}
            </span>
            <span className={`shrink-0 font-extrabold tabular-nums ${toneText(cause.amount)}`}>{formatEuroSigned(cause.amount)}</span>
          </div>
          <Track bar={cascade.steps[index]} className={toneBar(cause.amount)} />
          <PayrollCausePeople cause={cause} />
        </div>
      ))}

      {showResidual && (
        <div className="grid gap-1 rounded-lg bg-amber-50 px-2 py-1.5">
          <div className="flex items-baseline justify-between gap-3 font-bold text-amber-800">
            <span>Lignes du PDF non détaillées</span>
            <span className="shrink-0 font-extrabold tabular-nums">{formatEuroSigned(residual)}</span>
          </div>
          <Track bar={cascade.steps[causes.length]} className="bg-amber-500" />
          <span className="text-[11px] font-semibold text-amber-800/80">Alerte : lignes manquantes dans le PDF, pas une cause de coût.</span>
        </div>
      )}

      <EndRow label={`${monthName} ${year}`} cost={currentCost} bar={cascade.end} />

      <p className="m-0 text-[11px] font-semibold text-slate-400">
        Les barres démarrent à {formatEuroSymbol(cascade.min)} pour que les écarts soient visibles.
      </p>

      {fallbackLabels.length > 0 && (
        <p className="m-0 text-[11px] font-semibold text-slate-400">
          Détail par personne incomplet : réimporte le PDF de {fallbackLabels.join(' et ')} pour isoler les sortants et STC.
        </p>
      )}
    </div>
  );
}
