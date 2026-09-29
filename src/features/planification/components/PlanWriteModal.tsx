import { useState } from 'react';

import { MONTH_NAMES } from '@/lib/constants';
import type { PlanDay, PlanWriteMode } from '@/types/dataTypes';

import { analyseLabel } from '../../analyse/components/analyseStyles';
import { dayConfidence } from '../planningEngine';

type PlanWriteModalProps = {
  year: number;
  plan: PlanDay[];
  existingByMonth: Record<number, number>;
  onCancel: () => void;
  onConfirm: (mode: PlanWriteMode) => Promise<void>;
};

export default function PlanWriteModal({ year, plan, existingByMonth, onCancel, onConfirm }: PlanWriteModalProps) {
  const existingMonths = Object.entries(existingByMonth).map(([month, days]) => ({ month: Number(month), days }));
  const existingDays = existingMonths.reduce((acc, m) => acc + m.days, 0);
  const critical = plan.filter(day => dayConfidence(day) === 'critique').length;
  const [mode, setMode] = useState<PlanWriteMode>('completer');
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try { await onConfirm(mode); } finally { setBusy(false); }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Confirmer l'écriture dans les Prévisions" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="grid w-full max-w-lg gap-4 rounded-2xl border border-amber-200/30 bg-[#0a2430] p-5 shadow-2xl">
        <div className="text-base font-black uppercase tracking-[0.12em] text-amber-50">Écrire dans les Prévisions {year}</div>
        <p className="text-sm font-semibold text-cyan-50/80">
          Vous allez écrire couverts et ticket moyen (midi et soir) pour {plan.length} jours de {year}. Le CA budgété est recalculé automatiquement (couverts × TM).
          {critical > 0 && <span className="mt-1 block text-rose-300">{critical} jour(s) sont en confiance critique (repli ou n &lt; 3).</span>}
        </p>

        {existingDays > 0 ? (
          <div className="grid gap-2 rounded-xl border border-amber-300/40 bg-amber-400/10 p-3">
            <div className={`${analyseLabel} text-amber-200`}>Des prévisions {year} existent déjà : {existingDays} jour(s)</div>
            <ul className="text-xs font-semibold text-amber-100/90">
              {existingMonths.map(m => <li key={m.month}>{MONTH_NAMES[m.month]} : {m.days} jour(s)</li>)}
            </ul>
            {([
              ['completer', 'Compléter uniquement', 'Les jours déjà renseignés sont conservés, seuls les jours vides sont remplis.'],
              ['ecraser', 'Écraser', 'Les prévisions existantes de ces jours sont remplacées par la proposition.'],
            ] as const).map(([value, title, hint]) => (
              <label key={value} className="flex cursor-pointer items-start gap-2 text-xs text-white">
                <input type="radio" name="write-mode" checked={mode === value} onChange={() => setMode(value)} className="mt-0.5" />
                <span><span className="font-black">{title}</span> — {hint}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-xs font-semibold text-emerald-300">Aucune prévision {year} existante : rien ne sera écrasé.</p>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className="rounded-lg border border-white/20 px-4 py-2 text-xs font-black uppercase tracking-wide text-cyan-50 hover:bg-white/10">
            Annuler
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className={`rounded-lg px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-900 ${mode === 'ecraser' && existingDays > 0 ? 'bg-rose-300 hover:bg-rose-200' : 'bg-amber-300 hover:bg-amber-200'}`}
          >
            {busy ? 'Écriture…' : mode === 'ecraser' && existingDays > 0 ? 'Écraser et écrire' : 'Confirmer l\'écriture'}
          </button>
        </div>
      </div>
    </div>
  );
}
