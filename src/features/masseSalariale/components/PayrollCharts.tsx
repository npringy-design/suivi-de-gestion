import { Bar, CartesianGrid, ComposedChart, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { MONTH_NAMES_SHORT } from '@/lib/constants';
import { formatEuroSymbol, formatPercent } from '@/lib/formatters';
import type { PayrollAlertThresholds } from '@/types/dataTypes';

import type { PayrollSeriesPoint } from '../payrollCalculations';

type PayrollChartsProps = {
  year: number;
  series: PayrollSeriesPoint[];
  thresholds: PayrollAlertThresholds;
};

const COLORS = { cost: '#fbbf24', revenue: '#0369a1', alert: '#be185d', good: '#047857', ink: '#5c6d75', faint: '#93a2a9' };
const AXIS_STYLE = { fontSize: 11, fill: COLORS.ink, fontWeight: 700 };
const GRID_STROKE = 'rgba(19,32,38,0.08)';
const PANEL = 'rounded-2xl border border-slate-900/10 bg-white p-4 shadow-lg shadow-black/20';

const formatAxisEuro = (value: number) => `${Math.round(value / 1000)} k€`;

type DotProps = { cx?: number; cy?: number; value?: number | null; index?: number };

export default function PayrollCharts({ year, series, thresholds }: PayrollChartsProps) {
  const data = series.map(point => ({ ...point, label: MONTH_NAMES_SHORT[point.month] }));
  const threshold = thresholds.totalCostToRevenuePct;

  const renderRatioDot = ({ cx, cy, value, index }: DotProps) => {
    if (cx === undefined || cy === undefined || value === null || value === undefined) return <g key={`dot-${index}`} />;
    return <circle key={`dot-${index}`} cx={cx} cy={cy} r={3.5} fill={value > threshold ? COLORS.alert : COLORS.good} stroke="#fff" strokeWidth={1.5} />;
  };

  return (
    <section className="grid gap-3 lg:grid-cols-[1.3fr_1fr]">
      <div className={PANEL}>
        <h2 className="text-xs font-extrabold uppercase tracking-[0.1em] text-slate-900">Évolution mensuelle</h2>
        <p className="mb-3 text-[11.5px] font-bold text-slate-400">Coût salarial importé vs CA réalisé — janvier à décembre {year}</p>
        <div className="h-64" role="img" aria-label="Coût salarial en barres et CA réalisé en courbe, par mois">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="label" tick={{ ...AXIS_STYLE, fontSize: 10 }} interval={0} />
              <YAxis tick={{ ...AXIS_STYLE, fontSize: 10 }} tickFormatter={formatAxisEuro} width={46} />
              <Tooltip formatter={value => formatEuroSymbol(Number(value))} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 800 }} />
              <Bar dataKey="totalCost" name="Coût salarial (importé)" fill={COLORS.cost} radius={[3, 3, 0, 0]} maxBarSize={22} />
              <Line
                type="monotone"
                dataKey="revenue"
                name="CA réalisé"
                stroke={COLORS.revenue}
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: COLORS.revenue, stroke: '#fff', strokeWidth: 1.5 }}
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={PANEL}>
        <h2 className="text-xs font-extrabold uppercase tracking-[0.1em] text-slate-900">Ratio coût / CA</h2>
        <p className="mb-3 text-[11.5px] font-bold text-slate-400">Pointillé = seuil d'alerte configuré ({formatPercent(threshold)})</p>
        <div className="h-64" role="img" aria-label="Ratio du coût salarial sur le CA par mois, avec seuil d'alerte">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="label" tick={{ ...AXIS_STYLE, fontSize: 10 }} interval={0} />
              <YAxis
                tick={{ ...AXIS_STYLE, fontSize: 10 }}
                tickFormatter={value => `${Math.round(value)} %`}
                width={40}
                domain={[0, (max: number) => Math.max(Math.ceil(max / 5) * 5, Math.ceil(threshold / 5) * 5 + 5)]}
              />
              <Tooltip formatter={value => formatPercent(Number(value))} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <ReferenceLine
                y={threshold}
                stroke={COLORS.alert}
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{ value: `seuil ${threshold} %`, position: 'insideTopRight', fill: COLORS.alert, fontSize: 10, fontWeight: 700 }}
              />
              <Line
                type="monotone"
                dataKey="totalCostToRevenuePct"
                name="Coût global / CA"
                stroke={COLORS.faint}
                strokeWidth={2}
                connectNulls={false}
                dot={props => renderRatioDot(props as DotProps)}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
