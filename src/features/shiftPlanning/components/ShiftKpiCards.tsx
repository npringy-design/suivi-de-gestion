import { formatDecimal } from '@/lib/formatters';
import type { ShiftPlanningSettings } from '@/types/dataTypes';
import type { WeekMetrics } from '../hooks/useShiftWeekMetrics';
import { BEBAS_FONT } from '../shiftRoleStyle';

type CardProps = { label: string; value: string; detail: string; progress: number | null };

function KpiCard({ label, value, detail, progress }: CardProps) {
  return (
    <div className="rounded-2xl p-4 text-white shadow-md" style={{ background: 'linear-gradient(135deg, #0b1f33, #073d43)' }}>
      <div className="text-xs font-bold uppercase tracking-wider text-white/60">{label}</div>
      <div className="mt-1 text-4xl" style={{ fontFamily: BEBAS_FONT, color: '#fbbf24' }}>{value}</div>
      <div className="mt-1 text-xs text-white/70">{detail}</div>
      {progress !== null && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, progress))}%`, background: '#fbbf24' }} />
        </div>
      )}
    </div>
  );
}

export default function ShiftKpiCards({ metrics, settings }: { metrics: WeekMetrics; settings: ShiftPlanningSettings }) {
  const { weekProductivity, weekPayrollPct, weekHours, overtime, proposedCount, alerts } = metrics;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Productivité semaine"
        value={weekProductivity === null ? '—' : `${formatDecimal(weekProductivity, 1)} €/h`}
        detail={`Minimum ${settings.minProductivity} €/h`}
        progress={weekProductivity === null || settings.minProductivity <= 0 ? null : (weekProductivity / settings.minProductivity) * 100}
      />
      <KpiCard
        label="Masse salariale / CA"
        value={weekPayrollPct === null ? '—' : `${formatDecimal(weekPayrollPct, 1)} %`}
        detail={`Cible ${settings.targetPayrollPct} %`}
        progress={weekPayrollPct === null || settings.targetPayrollPct <= 0 ? null : (weekPayrollPct / settings.targetPayrollPct) * 100}
      />
      <KpiCard
        label="Heures planifiées"
        value={`${formatDecimal(weekHours, 1)} h`}
        detail={`${formatDecimal(overtime, 1)} h sup${settings.avoidOvertime ? ' (à éviter)' : ''}`}
        progress={null}
      />
      <KpiCard
        label="Statut"
        value={proposedCount === 0 ? 'Validée' : `${proposedCount} proposé${proposedCount > 1 ? 's' : ''}`}
        detail={`${alerts.length} alerte${alerts.length > 1 ? 's' : ''} légale${alerts.length > 1 ? 's' : ''}`}
        progress={null}
      />
    </div>
  );
}
