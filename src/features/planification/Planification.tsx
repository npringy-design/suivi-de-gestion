import { useState } from 'react';
import { ArrowLeft, Download, PenLine } from 'lucide-react';

import PlanDayTable from './components/PlanDayTable';
import PlanMonthTable from './components/PlanMonthTable';
import PlanSettingsPanel from './components/PlanSettingsPanel';
import PlanWriteModal from './components/PlanWriteModal';
import { usePlanification } from './hooks/usePlanification';

type PlanificationProps = {
  onBack: () => void;
};

type View = 'mois' | 'jour';

export default function Planification({ onBack }: PlanificationProps) {
  const planning = usePlanification();
  const { settings, plan, isLoading } = planning;
  const [view, setView] = useState<View>('mois');
  const [dayMonth, setDayMonth] = useState(0);
  const [onlyToCheck, setOnlyToCheck] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const openMonth = (month: number) => { setDayMonth(month); setView('jour'); };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#07111f_0%,#0a2430_48%,#073d43_100%)] px-4 pb-10 pt-4 text-white sm:px-6">
      <div className="mx-auto grid max-w-[1400px] gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-100/70 transition-colors hover:text-white"
          >
            <ArrowLeft size={15} />
            Retour Accueil
          </button>
          <div className="text-center">
            <div className="text-base font-black uppercase tracking-[0.14em] text-amber-50">Planification {settings.targetYear}</div>
            <div className="text-xs font-semibold text-cyan-50/60">Proposition de prévisions à partir des réalisés {planning.baseYears.join(' et ')}</div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={planning.exportCsv}
              className="flex items-center gap-2 rounded-lg border border-cyan-200/30 bg-white/[0.06] px-3 py-2 text-xs font-black uppercase tracking-wide text-cyan-50 hover:bg-white/15"
            >
              <Download size={14} />
              Exporter CSV
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-lg bg-amber-300 px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-900 hover:bg-amber-200 disabled:cursor-wait disabled:opacity-50"
            >
              <PenLine size={14} />
              Écrire dans les Prévisions {settings.targetYear}
            </button>
          </div>
        </header>

        <PlanSettingsPanel
          settings={settings}
          targetYearOptions={planning.targetYearOptions}
          baseYears={planning.baseYears}
          holidayZone={planning.holidayZone}
          sampleCount={planning.sampleCount}
          onChange={planning.updateSettings}
          onMonthGrowth={planning.setMonthGrowth}
        />

        {planning.status && (
          <div role="status" className="rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-xs font-bold text-emerald-200">{planning.status}</div>
        )}
        {isLoading && <div className="text-xs font-semibold text-cyan-50/60">Chargement des données {planning.baseYears.join(', ')} et {settings.targetYear}…</div>}

        <div className="flex gap-1">
          {([['mois', 'Vue mensuelle'], ['jour', 'Vue jour par jour']] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setView(value)}
              className={`rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-wide ${view === value ? 'bg-amber-300 text-slate-900' : 'bg-white/[0.07] text-cyan-100/70 hover:bg-white/15'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {view === 'mois' ? (
          <PlanMonthTable summaries={planning.monthSummaries} existingByMonth={planning.existingByMonth} onOpenMonth={openMonth} />
        ) : (
          <PlanDayTable
            plan={plan}
            month={dayMonth}
            onMonthChange={setDayMonth}
            onlyToCheck={onlyToCheck}
            onOnlyToCheckChange={setOnlyToCheck}
            overrides={planning.overrides}
            onEdit={planning.editService}
            onReset={planning.clearOverride}
          />
        )}

        <p className="text-[11px] font-semibold text-cyan-50/40">
          Confiance : rouge = moins de 3 échantillons ou repli sur le jour de semaine seul ; orange = moins de 8 échantillons. Les valeurs modifiées à la main sont surlignées et conservées jusqu&apos;au changement d&apos;année cible.
        </p>
      </div>

      {confirming && (
        <PlanWriteModal
          year={settings.targetYear}
          plan={plan}
          existingByMonth={planning.existingByMonth}
          onCancel={() => setConfirming(false)}
          onConfirm={async mode => { await planning.confirmWrite(mode); setConfirming(false); }}
        />
      )}
    </div>
  );
}
