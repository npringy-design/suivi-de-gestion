import { useState } from 'react';

import { MONTH_NAMES, MONTH_NAMES_SHORT } from '@/lib/constants';
import type { PayrollMonthEntry } from '@/types/dataTypes';

import type { AutoPayroll } from '../payrollCalculations';
import PayrollEntryForm from './PayrollEntryForm';

type PayrollCorrectionSectionProps = {
  year: number;
  month: number;
  onSelectMonth: (month: number) => void;
  entry: PayrollMonthEntry | undefined;
  auto: AutoPayroll | null;
  revenue: number | null;
  onSave: (entry: PayrollMonthEntry) => void;
  onDelete: () => void;
};

// Section secondaire repliée par défaut : l'analyse se lit sans aucune saisie, ce formulaire
// sert uniquement à corriger un mois, saisir un budget ou annoter.
export default function PayrollCorrectionSection({
  year,
  month,
  onSelectMonth,
  entry,
  auto,
  revenue,
  onSave,
  onDelete,
}: PayrollCorrectionSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04]">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="text-xs font-black uppercase tracking-[0.12em] text-amber-50">Correction manuelle / budget du mois</span>
        <span className="text-xs font-bold text-cyan-50/70">{open ? 'Replier ▲' : 'Déplier ▼'}</span>
      </button>

      {open && (
        <div className="grid gap-3 border-t border-white/10 p-3 sm:p-4">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {MONTH_NAMES_SHORT.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => onSelectMonth(index)}
                aria-pressed={index === month}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wider ${index === month ? 'bg-amber-400 text-slate-900' : 'bg-white/10 text-cyan-50/80 hover:bg-white/20'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <PayrollEntryForm
            key={`${year}-${month}-${entry ? 'saisi' : 'vide'}`}
            entry={entry}
            auto={auto}
            revenue={revenue}
            monthLabel={`${MONTH_NAMES[month]} ${year}`}
            onSave={onSave}
            onDelete={onDelete}
          />
        </div>
      )}
    </section>
  );
}
