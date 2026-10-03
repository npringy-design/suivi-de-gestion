import { useState } from 'react';
import type { ReactNode } from 'react';

import { MONTH_NAMES_SHORT } from '@/lib/constants';

type PayrollCorrectionSectionProps = {
  month: number;
  onSelectMonth: (month: number) => void;
  children: ReactNode;
};

// Section secondaire fermée par défaut : l'analyse se lit sans aucune saisie, cette zone sert
// uniquement à corriger ou compléter un mois, saisir un budget ou annoter.
export default function PayrollCorrectionSection({ month, onSelectMonth, children }: PayrollCorrectionSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-slate-900/10 bg-white px-4 shadow-lg shadow-black/20">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 py-3 text-left text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-slate-500"
      >
        <span className="w-4 text-base font-black text-amber-700">{open ? '–' : '+'}</span>
        Corriger ou compléter un mois
      </button>

      {open && (
        <div className="grid gap-3 border-t border-slate-900/10 pb-4 pt-3">
          <p className="m-0 text-[12.5px] font-semibold leading-relaxed text-slate-500">
            Utile si un mois manque dans <b className="text-slate-900">Config Salaires</b>, ou pour saisir un <b className="text-slate-900">budget</b> à comparer.
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {MONTH_NAMES_SHORT.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => onSelectMonth(index)}
                aria-pressed={index === month}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wider ${index === month ? 'bg-amber-400 text-slate-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {label}
              </button>
            ))}
          </div>
          {children}
        </div>
      )}
    </section>
  );
}
