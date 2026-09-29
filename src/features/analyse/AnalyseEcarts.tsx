import { ArrowLeft } from 'lucide-react';

import AnalyseCrossTable from './components/AnalyseCrossTable';
import AnalyseFiltersPanel from './components/AnalyseFiltersPanel';
import AnalyseSummary from './components/AnalyseSummary';
import { useAnalyseEcarts } from './hooks/useAnalyseEcarts';

type AnalyseEcartsProps = {
  onBack: () => void;
};

export default function AnalyseEcarts({ onBack }: AnalyseEcartsProps) {
  const { filters, updateFilters, thresholds, setThresholds, results, availableYears, holidayCalendar } = useAnalyseEcarts();
  const showCrossTable = filters.weekdays.length !== 1;

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
            <div className="text-base font-black uppercase tracking-[0.14em] text-amber-50">Analyse des écarts</div>
            <div className="text-xs font-semibold text-cyan-50/60">Réalisé vs budget · moyennes par jour, service et période</div>
          </div>
          <div className="w-24" />
        </header>

        <AnalyseFiltersPanel
          filters={filters}
          onChange={updateFilters}
          thresholds={thresholds}
          onThresholdsChange={setThresholds}
          availableYears={availableYears}
          holidayZone={holidayCalendar.zone}
        />

        <AnalyseSummary service={filters.service} summary={results.summary} detail={results.detail} thresholds={thresholds} />

        {showCrossTable && results.sampleCount > 0 && (
          <AnalyseCrossTable rows={results.weekdayRows} thresholds={thresholds} />
        )}

        <p className="text-[11px] font-semibold text-cyan-50/40">
          Seuls les jours antérieurs à aujourd&apos;hui avec du réalisé saisi sont comptés : aujourd&apos;hui, les jours futurs et les mois sans saisie sont exclus, du réel comme du budget.
        </p>
      </div>
    </div>
  );
}
