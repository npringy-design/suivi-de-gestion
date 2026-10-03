import { formatEuroSigned, formatEuroSymbol, formatPercent, formatPercentSigned } from '@/lib/formatters';

import type { PayrollComparison, PayrollIndicatorKey, PayrollMetrics, PayrollVariation } from '../payrollCalculations';

type PayrollComparisonCardsProps = {
  metrics: PayrollMetrics;
  vsPrevious: PayrollComparison;
  vsLastYear: PayrollComparison;
  vsBudget: PayrollComparison;
  hasPrevious: boolean;
  hasLastYear: boolean;
};

type IndicatorDef = {
  key: PayrollIndicatorKey;
  label: string;
  value: (m: PayrollMetrics) => number | null;
};

const INDICATORS: IndicatorDef[] = [
  { key: 'gross', label: 'Masse salariale brute', value: m => m.gross },
  { key: 'employerCharges', label: 'Charges patronales', value: m => m.employerCharges },
  { key: 'totalCost', label: 'Coût salarial global', value: m => m.totalCost },
];

// Écart affiché sans jugement de couleur : une hausse n'est pas forcément un problème
// (apprentis, promotions, forfait jour, absences…).
const formatVariation = (variation: PayrollVariation | undefined): string => {
  if (!variation) return '—';
  const euro = formatEuroSigned(variation.delta);
  return variation.pct === null ? euro : `${euro} (${formatPercentSigned(variation.pct)})`;
};

function Line({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="text-right font-bold tabular-nums text-slate-800">{text}</span>
    </div>
  );
}

export default function PayrollComparisonCards({
  metrics,
  vsPrevious,
  vsLastYear,
  vsBudget,
  hasPrevious,
  hasLastYear,
}: PayrollComparisonCardsProps) {
  return (
    <section className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {INDICATORS.map(def => {
          const value = def.value(metrics);
          return (
            <div key={def.key} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{def.label}</div>
              <div className="mt-1 text-xl font-black tabular-nums text-slate-900">{value === null ? '—' : formatEuroSymbol(value)}</div>
              <div className="mt-3 grid gap-1 border-t border-slate-200 pt-2">
                <Line label="vs mois précédent" text={hasPrevious ? formatVariation(vsPrevious[def.key]) : 'pas de saisie'} />
                <Line label="vs N-1" text={hasLastYear ? formatVariation(vsLastYear[def.key]) : 'pas de saisie'} />
                <Line label="vs budget" text={formatVariation(vsBudget[def.key])} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs leading-relaxed text-slate-500">
        % de charges patronales du mois : <strong className="text-slate-900">{metrics.chargesRatePct === null ? '—' : formatPercent(metrics.chargesRatePct)}</strong>.
        Il peut varier sensiblement d'un mois à l'autre sans anomalie (apprentis, CDI, promotions, forfait jour…) : lisez les montants avant le pourcentage.
      </p>
    </section>
  );
}
