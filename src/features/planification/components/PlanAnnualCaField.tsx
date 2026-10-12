import { useEffect, useState } from 'react';

import { formatEuroSymbol } from '@/lib/formatters';
import { parseMoneyValue } from '@/lib/money';

import { analyseLabel } from '../../analyse/components/analyseStyles';

type PlanAnnualCaFieldProps = {
  year: number;
  value: number | null;
  proposal: number;
  onApply: (value: number | null) => void;
};

const toText = (value: number | null): string => (value === null ? '' : String(value));

const link = 'font-black text-amber-200 underline hover:text-amber-100';

// Saisie explicite : rien n'est appliqué tant que « Appliquer » (ou Entrée) n'est pas validé, et le
// champ n'est jamais rempli à la place de l'utilisateur. Champ vide + Appliquer = retrait de l'objectif.
export default function PlanAnnualCaField({ year, value, proposal, onApply }: PlanAnnualCaFieldProps) {
  const [draft, setDraft] = useState(toText(value));
  useEffect(() => setDraft(toText(value)), [value]);

  const parsed = draft.trim() === '' ? null : parseMoneyValue(draft);
  const pending = parsed !== value;
  const apply = () => onApply(parsed !== null && parsed > 0 ? parsed : null);

  return (
    <div className="grid gap-1">
      <span className={analyseLabel}>CA annuel {year}</span>
      <div className="flex gap-1.5">
        <input
          type="text"
          inputMode="numeric"
          aria-label={`CA annuel ${year}`}
          value={draft}
          placeholder="Aucun objectif"
          onChange={event => setDraft(event.target.value)}
          onKeyDown={event => { if (event.key === 'Enter') apply(); }}
          className={`w-full min-w-0 rounded-md border bg-white/[0.06] px-2 py-1.5 text-right text-sm font-bold text-white outline-none focus:border-cyan-300 ${value !== null ? 'border-cyan-300/60 bg-cyan-400/10' : 'border-white/10'}`}
        />
        <button
          type="button"
          onClick={apply}
          disabled={!pending}
          className="shrink-0 rounded-md bg-amber-300 px-3 text-xs font-black uppercase text-slate-900 hover:bg-amber-200 disabled:cursor-default disabled:opacity-40"
        >
          Appliquer
        </button>
      </div>
      <span className="text-[11px] font-semibold text-cyan-50/60">
        {value === null ? 'Aucun objectif : prévision purement historique. ' : ''}
        Proposition {formatEuroSymbol(proposal)} :{' '}
        <button type="button" onClick={() => setDraft(String(proposal))} className={link}>pré-remplir</button>
        {value !== null && (
          <> · <button type="button" onClick={() => onApply(null)} className={link}>retirer l&apos;objectif</button></>
        )}
      </span>
    </div>
  );
}
