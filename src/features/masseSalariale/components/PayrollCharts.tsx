import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { MONTH_NAMES_SHORT } from '@/lib/constants';
import { formatPercentSigned } from '@/lib/formatters';

import type { PayrollSeriesPoint } from '../payrollCalculations';
import { PAYROLL_MEASURES } from '../payrollMeasures';
import type { PayrollMeasure } from '../payrollMeasures';
import type { PayrollMonthDetail } from './PayrollMonthComparison';

type PayrollChartsProps = {
  year: number;
  measure: PayrollMeasure;
  series: PayrollSeriesPoint[];
  lastYearSeries: PayrollSeriesPoint[];
  details: PayrollMonthDetail[];
};

const COLORS = { cost: '#fbbf24', lastYear: '#cbd5e1', alert: '#be185d', good: '#047857', ink: '#5c6d75' };
const AXIS_STYLE = { fontSize: 10, fill: COLORS.ink, fontWeight: 700 };
const GRID_STROKE = 'rgba(19,32,38,0.08)';
const PANEL = 'rounded-2xl border border-slate-900/10 bg-white p-4 shadow-lg shadow-black/20';

export default function PayrollCharts({ year, measure, series, lastYearSeries, details }: PayrollChartsProps) {
  const config = PAYROLL_MEASURES[measure];
  const subject = measure === 'cost' ? 'Coût salarial' : 'ETP';
  const valueData = series.map((point, index) => ({
    label: MONTH_NAMES_SHORT[point.month],
    current: config.pick(point),
    lastYear: lastYearSeries[index] ? config.pick(lastYearSeries[index]) : null,
  }));
  // Écart vs N-1 uniquement sur les mois renseignés des deux années.
  const variationData = series.map((point, index) => ({
    label: MONTH_NAMES_SHORT[point.month],
    pct: details[index]?.vsLastYear[config.indicator]?.pct ?? null,
  }));

  return (
    <section className="grid gap-3 lg:grid-cols-[1.3fr_1fr]">
      <div className={PANEL}>
        <h2 className="text-xs font-extrabold uppercase tracking-[0.1em] text-slate-900">{subject} mois par mois</h2>
        <p className="mb-3 text-[11.5px] font-bold text-slate-400">{year} comparé à {year - 1}, janvier à décembre</p>
        <div className="h-64" role="img" aria-label={`${subject} mensuel ${year} et ${year - 1}`}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={valueData} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="label" tick={AXIS_STYLE} interval={0} />
              <YAxis tick={AXIS_STYLE} tickFormatter={config.formatAxis} width={46} />
              <Tooltip formatter={value => config.formatValue(Number(value))} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 800 }} />
              <Bar dataKey="lastYear" name={String(year - 1)} fill={COLORS.lastYear} radius={[3, 3, 0, 0]} maxBarSize={14} />
              <Bar dataKey="current" name={String(year)} fill={COLORS.cost} radius={[3, 3, 0, 0]} maxBarSize={14} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={PANEL}>
        <h2 className="text-xs font-extrabold uppercase tracking-[0.1em] text-slate-900">Écart vs {year - 1}</h2>
        <p className="mb-3 text-[11.5px] font-bold text-slate-400">
          Variation {measure === 'cost' ? 'du coût' : 'de l\'ETP'} par rapport au même mois, mois comparables
        </p>
        <div className="h-64" role="img" aria-label={`Variation en pourcentage de ${measure === 'cost' ? 'du coût salarial' : 'l\'ETP'} par rapport à ${year - 1}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={variationData} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="label" tick={AXIS_STYLE} interval={0} />
              <YAxis tick={AXIS_STYLE} tickFormatter={value => `${Math.round(value)} %`} width={40} />
              <Tooltip formatter={value => formatPercentSigned(Number(value))} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <ReferenceLine y={0} stroke={COLORS.ink} />
              <Bar dataKey="pct" name={`vs ${year - 1}`} radius={[3, 3, 0, 0]} maxBarSize={22}>
                {variationData.map(point => (
                  <Cell key={point.label} fill={(point.pct ?? 0) > 0 ? COLORS.alert : COLORS.good} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
