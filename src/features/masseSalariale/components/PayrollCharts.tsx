import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { MONTH_NAMES_SHORT } from '@/lib/constants';
import { formatEuroSymbol, formatPercent } from '@/lib/formatters';
import type { PayrollAlertThresholds } from '@/types/dataTypes';

import type { PayrollSeriesPoint } from '../payrollCalculations';

type PayrollChartsProps = {
  series: PayrollSeriesPoint[];
  thresholds: PayrollAlertThresholds;
};

const AXIS_STYLE = { fontSize: 11, fill: 'rgba(207,250,254,0.7)' };
const TOOLTIP_STYLE = { background: '#0a2430', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, fontSize: 12 };

const toChartData = (series: PayrollSeriesPoint[]) =>
  series.map(point => ({ ...point, label: `${MONTH_NAMES_SHORT[point.month]} ${String(point.year).slice(2)}` }));

const formatAxisEuro = (value: number) => `${Math.round(value / 1000)} k€`;

export default function PayrollCharts({ series, thresholds }: PayrollChartsProps) {
  const data = toChartData(series);
  const hasData = series.some(point => point.gross !== null);

  if (!hasData) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 text-center text-sm font-semibold text-cyan-50/60">
        Aucune saisie sur les 12 derniers mois : les graphiques apparaîtront dès le premier mois enregistré.
      </section>
    );
  }

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
        <h3 className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-amber-50">Évolution mensuelle (12 mois glissants)</h3>
        <div className="h-64 sm:h-72" role="img" aria-label="Courbes brut, charges patronales et coût global sur 12 mois">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="label" tick={AXIS_STYLE} interval="preserveStartEnd" />
              <YAxis tick={AXIS_STYLE} tickFormatter={formatAxisEuro} width={48} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={value => formatEuroSymbol(Number(value))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="gross" name="Brut" stroke="#fbbf24" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
              <Line type="monotone" dataKey="employerCharges" name="Charges patronales" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
              <Line type="monotone" dataKey="totalCost" name="Coût global" stroke="#f472b6" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
        <h3 className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-amber-50">Ratios sur CA réel</h3>
        <div className="h-64 sm:h-72" role="img" aria-label="Courbes des ratios brut sur CA et coût global sur CA, avec seuils d'alerte">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="label" tick={AXIS_STYLE} interval="preserveStartEnd" />
              <YAxis tick={AXIS_STYLE} tickFormatter={value => `${Math.round(value)} %`} width={44} domain={['auto', 'auto']} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={value => formatPercent(Number(value))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine y={thresholds.grossToRevenuePct} stroke="#fbbf24" strokeDasharray="4 4" />
              <ReferenceLine y={thresholds.totalCostToRevenuePct} stroke="#f472b6" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="grossToRevenuePct" name="Brut / CA" stroke="#fbbf24" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
              <Line type="monotone" dataKey="totalCostToRevenuePct" name="Coût global / CA" stroke="#f472b6" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-[11px] text-cyan-50/50">Traits pointillés : seuils d'alerte configurés.</p>
      </div>
    </section>
  );
}
