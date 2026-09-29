import { formatDecimal, formatDecimalSigned, formatEuroSigned, formatEuroSymbol, formatPercentSigned } from '@/lib/formatters';
import type { AnalyseAggregate, AnalyseAlertLevel, AnalyseDetail, AnalyseService, AnalyseThresholds } from '@/types/dataTypes';

import { alertLevel } from '../ecartsAnalysis';

import { alertCell, alertText, analyseGlass, analyseLabel } from './analyseStyles';

const SERVICE_LABEL: Record<AnalyseService, string> = { midi: 'Midi', soir: 'Soir', journee: 'Journée' };

type Props = {
  service: AnalyseService;
  summary: AnalyseAggregate;
  detail: AnalyseDetail;
  thresholds: AnalyseThresholds;
};

const ecartColor = (ecart: number, level: AnalyseAlertLevel): string =>
  level !== 'none' ? alertText[level] : ecart >= 0 ? 'text-emerald-300' : 'text-cyan-50';

function MetricCard({ label, level = 'none', children }: { label: string; level?: AnalyseAlertLevel; children: React.ReactNode }) {
  return (
    <div className={`${analyseGlass} ${alertCell[level]} p-4`}>
      <div className={analyseLabel}>{label}</div>
      <div className="mt-2 grid gap-1">{children}</div>
    </div>
  );
}

function Line({ label, value, className = 'text-white' }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-xs font-semibold text-cyan-50/60">{label}</span>
      <span className={`font-black tabular-nums ${className}`}>{value}</span>
    </div>
  );
}

const pctLabel = (value: number | null) => (value === null ? '—' : formatPercentSigned(value));
const euroOrDash = (value: number | null) => (value === null ? '—' : formatEuroSymbol(value));

export default function AnalyseSummary({ service, summary, detail, thresholds }: Props) {
  if (summary.n === 0) {
    return (
      <div className={`${analyseGlass} p-6 text-sm font-semibold text-cyan-50/70`}>
        Aucun jour réalisé ne correspond à cette sélection (service {SERVICE_LABEL[service].toLowerCase()}). Seuls les jours antérieurs à aujourd&apos;hui ayant du réalisé saisi sont analysés.
      </div>
    );
  }

  const caLevel = alertLevel(summary.caEcartPct, summary.caEcart, thresholds, summary.n);
  const cvLevel = alertLevel(summary.cvEcartPct, null, thresholds, summary.n);
  const limoEcart = detail.limoCaReel - detail.limoCaBudget;
  const restaurantEcart = detail.restaurantCaReel - detail.restaurantCaBudget;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label={`Échantillon · ${SERVICE_LABEL[service]}`}>
          <div className="text-3xl font-black leading-none text-amber-50">{summary.n}</div>
          <div className="text-xs font-semibold text-cyan-50/60">jour(s) réalisé(s) analysé(s)</div>
        </MetricCard>

        <MetricCard label="Couverts / jour" level={cvLevel}>
          <Line label="Réel moyen" value={formatDecimal(summary.cvReel, 0)} />
          <Line label="Budget moyen" value={formatDecimal(summary.cvBudget, 0)} />
          <Line label="Écart" value={`${formatDecimalSigned(summary.cvEcart, 0)} · ${pctLabel(summary.cvEcartPct)}`} className={ecartColor(summary.cvEcart, cvLevel)} />
        </MetricCard>

        <MetricCard label="Ticket moyen (TM)">
          <Line label="Réel" value={euroOrDash(summary.tmReel)} />
          <Line label="Budget" value={euroOrDash(summary.tmBudget)} />
          <Line
            label="Écart"
            value={summary.tmEcart === null ? '—' : `${formatEuroSigned(summary.tmEcart)} · ${pctLabel(summary.tmEcartPct)}`}
            className={summary.tmEcart === null ? 'text-cyan-50' : ecartColor(summary.tmEcart, 'none')}
          />
        </MetricCard>

        <MetricCard label="CA HT / jour" level={caLevel}>
          <Line label="Réel moyen" value={formatEuroSymbol(summary.caReel)} />
          <Line label="Budget moyen" value={formatEuroSymbol(summary.caBudget)} />
          <Line label="Écart" value={`${formatEuroSigned(summary.caEcart)} · ${pctLabel(summary.caEcartPct)}`} className={ecartColor(summary.caEcart, caLevel)} />
        </MetricCard>

        <MetricCard label="Impact cumulé" level={caLevel}>
          <div className={`text-2xl font-black leading-none ${ecartColor(summary.impactCa, caLevel)}`}>{formatEuroSigned(summary.impactCa)}</div>
          <div className="text-xs font-semibold text-cyan-50/60">écart moyen × {summary.n} jour(s)</div>
        </MetricCard>
      </div>

      <div className={`${analyseGlass} p-4`}>
        <div className={analyseLabel}>Détail journée · tous services ({detail.n} jour(s))</div>
        <div className="mt-3 grid gap-x-8 gap-y-2 md:grid-cols-2 xl:grid-cols-4">
          <div className="grid gap-1">
            <div className="text-[11px] font-black uppercase tracking-wider text-amber-200/80">Restaurant (midi + soir)</div>
            <Line label="CA réel moyen" value={formatEuroSymbol(detail.restaurantCaReel)} />
            <Line label="CA budget moyen" value={formatEuroSymbol(detail.restaurantCaBudget)} />
            <Line label="Écart" value={formatEuroSigned(restaurantEcart)} className={ecartColor(restaurantEcart, 'none')} />
          </div>
          <div className="grid gap-1">
            <div className="text-[11px] font-black uppercase tracking-wider text-amber-200/80">Limonade</div>
            <Line label="CA réel moyen" value={formatEuroSymbol(detail.limoCaReel)} />
            <Line label="CA budget moyen" value={formatEuroSymbol(detail.limoCaBudget)} />
            <Line label="Écart CA" value={formatEuroSigned(limoEcart)} className={ecartColor(limoEcart, 'none')} />
            <Line label="Couverts réel moyen" value={formatDecimal(detail.limoCvReel, 0)} />
          </div>
          <div className="grid gap-1">
            <div className="text-[11px] font-black uppercase tracking-wider text-amber-200/80">VAE (vente à emporter)</div>
            <Line label="CA réel moyen" value={formatEuroSymbol(detail.vaeReel)} />
            <div className="text-[11px] font-semibold text-cyan-50/50">Réalisé seul : pas de budget VAE, non ventilé par service.</div>
          </div>
          <div className="grid gap-1">
            <div className="text-[11px] font-black uppercase tracking-wider text-amber-200/80">CA jour incluant VAE</div>
            <Line label="Réel moyen" value={formatEuroSymbol(detail.caJourAvecVae)} className="text-amber-50" />
            <div className="text-[11px] font-semibold text-cyan-50/50">Midi + soir + limonade + VAE, sans budget comparable.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
