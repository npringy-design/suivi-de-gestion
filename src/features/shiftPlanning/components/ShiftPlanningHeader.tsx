import { ArrowLeft, ChevronLeft, ChevronRight, Settings } from 'lucide-react';

import type { ShiftSaveStatus } from '../hooks/useShiftPlanningDocs';
import { BEBAS_FONT } from '../shiftRoleStyle';

type Props = {
  weekLabel: string;
  proposedCount: number;
  saveStatus: ShiftSaveStatus;
  onBack: () => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onOpenSettings: () => void;
  onValidate: () => void;
  onGenerate: () => void;
};

const SAVE_LABELS: Record<ShiftSaveStatus, string> = {
  idle: '',
  saving: 'Enregistrement…',
  saved: 'Enregistré',
  error: 'Erreur d\'enregistrement',
};

export default function ShiftPlanningHeader({
  weekLabel, proposedCount, saveStatus, onBack, onPrevWeek, onNextWeek, onOpenSettings, onValidate, onGenerate,
}: Props) {
  return (
    <header
      className="flex flex-wrap items-center gap-4 px-6 py-5 text-white"
      style={{ background: 'linear-gradient(135deg, #07111f, #073d43)' }}
    >
      <button type="button" onClick={onBack} aria-label="Retour" className="rounded-lg p-2 text-white/70 hover:bg-white/10">
        <ArrowLeft className="h-5 w-5" />
      </button>
      <h1 className="text-4xl tracking-wide" style={{ fontFamily: BEBAS_FONT }}>Planning</h1>

      <div className="flex items-center gap-2">
        <button type="button" onClick={onPrevWeek} aria-label="Semaine précédente" className="rounded-lg p-2 hover:bg-white/10">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="min-w-[170px] text-center text-sm font-bold">{weekLabel}</span>
        <button type="button" onClick={onNextWeek} aria-label="Semaine suivante" className="rounded-lg p-2 hover:bg-white/10">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <span className={`text-xs ${saveStatus === 'error' ? 'text-red-300' : 'text-white/60'}`}>{SAVE_LABELS[saveStatus]}</span>

      <div className="ml-auto flex items-center gap-3">
        <button type="button" onClick={onOpenSettings} aria-label="Paramètres" title="Paramètres" className="rounded-lg p-2 hover:bg-white/10">
          <Settings className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onGenerate}
          title="Génère les shifts proposés de la semaine (les shifts validés sont conservés)"
          className="rounded-xl border border-white/30 px-4 py-2 text-sm font-bold text-white hover:bg-white/10"
        >
          Générer
        </button>
        <button
          type="button"
          onClick={onValidate}
          disabled={proposedCount === 0}
          className="rounded-xl px-4 py-2 text-sm font-bold text-slate-900 disabled:opacity-50"
          style={{ background: '#f59e0b' }}
        >
          Valider la planification
        </button>
      </div>
    </header>
  );
}
