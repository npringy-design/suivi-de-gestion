import { formatEuroSigned, formatEuroSymbol, formatPercent, formatPercentSigned } from '@/lib/formatters';
import type { PayrollAlertThresholds } from '@/types/dataTypes';

import type { PayrollComparison, PayrollIndicatorKey, PayrollMetrics, PayrollVariation } from '../payrollCalculations';

type PayrollComparisonCardsProps = {
  metrics: PayrollMetrics;
  vsPrevious: PayrollComparison;
  vsLastYear: PayrollComparison;
  vsBudget: PayrollComparison;
  hasPrevious: boolean;
  hasLastYear: boolean;
  thresholds: PayrollAlertThresholds;
};

type IndicatorDef = {
  key: PayrollIndicatorKey;
  label: string;
  isRatio: boolean;
  value: (m: PayrollMetrics) => number | null;
  threshold?: (t: PayrollAlertThresholds) => number;
};

const INDICATORS: IndicatorDef[] = [
  { key: 'gross', label: 'Masse salariale brute', isRatio: false, value: m => m.gross },
  { key: 'employerCharges', label: 'Charges patronales', isRatio: false, value: m => m.employerCharges },
  { key: 'totalCost', label: 'Coût salarial global', isRatio: false, value: m => m.totalCost },
  { key: 'grossToRevenuePct', label: 'Brut / CA', isRatio: true, value: m => m.grossToRevenuePct, threshold: t => t.grossToRevenuePct },
  { key: 'totalCostToRevenuePct', label: 'Coût global / CA', isRatio: true, value: m => m.totalCostToRevenuePct, threshold: t => t.totalCostToRevenuePct },
];

// Écart affiché sans jugement de couleur : une hausse n'est pas forcément un problème
// (apprentis, promotions, forfait jour…), seul le dépassement de seuil est signalé.
const formatVariation = (variation: PayrollVariation | undefined, isRatio: boolean): string => {
  if (!variation) return '—';
  if (isRatio) return `${variation.delta > 0 ? '+' : ''}${variation.delta.toFixed(2)} pt`;
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
  thresholds,
}: PayrollComparisonCardsProps) {
  return (
    <section className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {INDICATORS.map(def => {
          const value = def.value(metrics);
          const threshold = def.threshold?.(thresholds);
          const overThreshold = value !== null && threshold !== undefined && value > threshold;
          return (
            <div
              key={def.key}
              className={`rounded-2xl border p-4 ${overThreshold ? 'border-amber-500/60 bg-amber-50' : 'border-slate-200 bg-white'}`}
            >
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{def.label}</div>
              <div className="mt-1 text-xl font-black tabular-nums text-slate-900">
                {value === null ? '—' : def.isRatio ? formatPercent(value) : formatEuroSymbol(value)}
              </div>
              {overThreshold && (
                <div className="mt-1 text-[11px] font-black text-amber-700">▲ Au-dessus du seuil ({formatPercent(threshold)})</div>
              )}
              <div className="mt-3 grid gap-1 border-t border-slate-200 pt-2">
                <Line label="vs mois précédent" text={hasPrevious ? formatVariation(vsPrevious[def.key], def.isRatio) : 'pas de saisie'} />
                <Line label="vs N-1" text={hasLastYear ? formatVariation(vsLastYear[def.key], def.isRatio) : 'pas de saisie'} />
                {!def.isRatio && <Line label="vs budget" text={formatVariation(vsBudget[def.key], false)} />}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs leading-relaxed text-slate-500">
        % de charges patronales du mois : <strong className="text-slate-900">{metrics.chargesRatePct === null ? '—' : formatPercent(metrics.chargesRatePct)}</strong>.
        Il peut varier sensiblement d'un mois à l'autre sans anomalie (apprentis, CDI, promotions, forfait jour…) :
        lisez les montants avant les ratios. Les écarts de ratio sont exprimés en points (pt).
      </p>
    </section>
  );
}
