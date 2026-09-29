import { formatDecimal, formatDecimalSigned, formatEuroSigned, formatEuroSymbol, formatPercentSigned } from '@/lib/formatters';
import type { AnalyseAggregate, AnalyseAlertLevel, AnalyseThresholds, AnalyseWeekdayRow } from '@/types/dataTypes';

import { alertLevel } from '../ecartsAnalysis';

import { alertCell, alertText, analyseGlass, analyseLabel } from './analyseStyles';

const WEEKDAY_NAMES: Record<number, string> = {
  1: 'Lundi', 2: 'Mardi', 3: 'Mercredi', 4: 'Jeudi', 5: 'Vendredi', 6: 'Samedi', 0: 'Dimanche',
};

const SERVICES = [
  { key: 'midi', label: 'Midi' },
  { key: 'soir', label: 'Soir' },
  { key: 'journee', label: 'Journée' },
] as const;

type Props = {
  rows: AnalyseWeekdayRow[];
  thresholds: AnalyseThresholds;
};

const pctLabel = (value: number | null) => (value === null ? '—' : formatPercentSigned(value));

function Cell({ aggregate, thresholds }: { aggregate: AnalyseAggregate; thresholds: AnalyseThresholds }) {
  if (aggregate.n === 0) {
    return <td className="border-b border-cyan-200/10 px-3 py-2 text-center text-cyan-50/30">—</td>;
  }

  const caLevel = alertLevel(aggregate.caEcartPct, aggregate.caEcart, thresholds, aggregate.n);
  const cvLevel = alertLevel(aggregate.cvEcartPct, null, thresholds, aggregate.n);
  const level: AnalyseAlertLevel = caLevel === 'critical' || cvLevel === 'critical' ? 'critical' : caLevel !== 'none' || cvLevel !== 'none' ? 'warning' : 'none';
  const caColor = caLevel !== 'none' ? alertText[caLevel] : aggregate.caEcart >= 0 ? 'text-emerald-300' : 'text-cyan-50';
  const cvColor = cvLevel !== 'none' ? alertText[cvLevel] : aggregate.cvEcart >= 0 ? 'text-emerald-300' : 'text-cyan-50';

  return (
    <td className={`border-b border-cyan-200/10 px-3 py-2 align-top text-xs tabular-nums ${alertCell[level]}`}>
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-cyan-50/40">n = {aggregate.n}</div>
      <div className="font-semibold text-cyan-50/70">CA {formatEuroSymbol(aggregate.caReel)} / {formatEuroSymbol(aggregate.caBudget)}</div>
      <div className={`font-black ${caColor}`}>{formatEuroSigned(aggregate.caEcart)} · {pctLabel(aggregate.caEcartPct)}</div>
      <div className="mt-1 font-semibold text-cyan-50/70">Cvts {formatDecimal(aggregate.cvReel)} / {formatDecimal(aggregate.cvBudget)}</div>
      <div className={`font-black ${cvColor}`}>{formatDecimalSigned(aggregate.cvEcart)} · {pctLabel(aggregate.cvEcartPct)}</div>
      <div className="mt-1 text-[10px] font-semibold text-cyan-50/50">Impact {formatEuroSigned(aggregate.impactCa)}</div>
    </td>
  );
}

export default function AnalyseCrossTable({ rows, thresholds }: Props) {
  return (
    <section className={`${analyseGlass} overflow-hidden`}>
      <div className="border-b border-cyan-200/15 px-4 py-3">
        <div className={analyseLabel}>Jour de semaine × service</div>
        <div className="mt-1 text-xs font-semibold text-cyan-50/60">Moyenne réel / budget par jour, écart moyen et impact cumulé. Orange / rouge selon les seuils d&apos;alerte.</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="border-b border-cyan-200/15 px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-cyan-100/70">Jour</th>
              {SERVICES.map(service => (
                <th key={service.key} className="border-b border-cyan-200/15 px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-cyan-100/70">{service.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.weekday}>
                <td className="border-b border-cyan-200/10 px-3 py-2 text-sm font-black text-white">{WEEKDAY_NAMES[row.weekday]}</td>
                {SERVICES.map(service => (
                  <Cell key={service.key} aggregate={row[service.key]} thresholds={thresholds} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
