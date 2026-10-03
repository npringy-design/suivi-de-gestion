import { useState } from 'react';

import { formatDecimal, formatEuroSymbol, formatPercent } from '@/lib/formatters';
import { parseMoneyValue, sanitizeMoneyInput } from '@/lib/money';
import type { PayrollMonthEntry } from '@/types/dataTypes';

import { computePayrollMetrics, resolvePayroll } from '../payrollCalculations';
import type { AutoPayroll } from '../payrollCalculations';

type PayrollEntryFormProps = {
  entry: PayrollMonthEntry | undefined;
  auto: AutoPayroll | null;
  monthLabel: string;
  onSave: (entry: PayrollMonthEntry) => void;
  onDelete: () => void;
};

const toInput = (value: number | undefined): string => (value === undefined ? '' : String(value).replace('.', ','));
const toOptional = (raw: string): number | undefined => (raw.trim() === '' ? undefined : parseMoneyValue(raw));

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-amber-500';

function Field({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <input
        inputMode="decimal"
        value={value}
        onChange={event => onChange(sanitizeMoneyInput(event.target.value))}
        placeholder="0,00"
        className={inputClass}
      />
      {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

function Computed({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-sm font-black text-slate-900">{value}</div>
    </div>
  );
}

const pct = (value: number | null) => (value === null ? '—' : formatPercent(value));

export default function PayrollEntryForm({ entry, auto, monthLabel, onSave, onDelete }: PayrollEntryFormProps) {
  const [gross, setGross] = useState(toInput(entry?.gross));
  const [charges, setCharges] = useState(toInput(entry?.employerCharges));
  const [hours, setHours] = useState(toInput(entry?.hours));
  const [budgetGross, setBudgetGross] = useState(toInput(entry?.budgetGross));
  const [budgetCharges, setBudgetCharges] = useState(toInput(entry?.budgetEmployerCharges));
  const [note, setNote] = useState(entry?.note ?? '');
  const [saved, setSaved] = useState(false);

  const draft: PayrollMonthEntry = {
    gross: toOptional(gross),
    employerCharges: toOptional(charges),
    hours: toOptional(hours),
  };
  // Aperçu en direct (avant enregistrement), avec reprise de Config Salaires pour ce qui manque.
  const preview = computePayrollMetrics(resolvePayroll(draft, auto), null);
  const canSave = [gross, charges, hours, budgetGross, budgetCharges, note].some(value => value.trim() !== '');

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      // Les lignes par salarié (futur) sont conservées telles quelles à l'enregistrement.
      ...entry,
      gross: draft.gross,
      employerCharges: draft.employerCharges,
      hours: draft.hours,
      budgetGross: toOptional(budgetGross),
      budgetEmployerCharges: toOptional(budgetCharges),
      note: note.trim() === '' ? undefined : note.trim(),
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-slate-900">Saisie · {monthLabel}</h2>
      </div>

      <p className="mb-3 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600">
        {auto
          ? <>Repris de Config Salaires : coût global <strong className="text-slate-900">{formatEuroSymbol(auto.totalCost)}</strong> · <strong className="text-slate-900">{formatDecimal(auto.hours, 2)} h</strong>. Saisissez le brut : les charges patronales en sont déduites (ou saisissez-les pour forcer une valeur).</>
          : 'Aucun coût salarial dans Config Salaires pour ce mois : saisissez le brut et les charges.'}
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Masse salariale brute (€)" value={gross} onChange={setGross} />
        <Field label="Charges patronales (€)" value={charges} onChange={setCharges} hint={charges === '' && preview?.employerCharges != null ? `Déduit : ${formatEuroSymbol(preview.employerCharges)}` : undefined} />
        <Field label="Heures totales (optionnel)" value={hours} onChange={setHours} hint={hours === '' && auto?.hours ? `Config Salaires : ${formatDecimal(auto.hours, 2)} h` : 'Normales + majorées'} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Computed label="% charges patronales" value={pct(preview?.chargesRatePct ?? null)} />
        <Computed label="Coût salarial global" value={preview?.totalCost == null ? '—' : formatEuroSymbol(preview.totalCost)} />
        <Computed label="Coût horaire moyen" value={preview?.hourlyCost == null ? '—' : `${formatDecimal(preview.hourlyCost, 2)} €/h`} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Budget brut (optionnel, €)" value={budgetGross} onChange={setBudgetGross} />
        <Field label="Budget charges (optionnel, €)" value={budgetCharges} onChange={setBudgetCharges} hint="Requis pour comparer charges et coût global au budget" />
      </div>

      <label className="mt-4 grid gap-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Note du mois</span>
        <textarea
          value={note}
          onChange={event => setNote(event.target.value)}
          rows={2}
          placeholder="Ex. salarié en arrêt quasi tout le mois, apprenti en moins…"
          className={inputClass}
        />
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="rounded-lg bg-amber-400 px-5 py-2.5 text-sm font-black uppercase tracking-wider text-slate-900 transition-opacity disabled:opacity-40"
        >
          Enregistrer
        </button>
        {entry && (
          <button
            type="button"
            onClick={() => { if (window.confirm(`Supprimer la saisie de ${monthLabel} ?`)) onDelete(); }}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100"
          >
            Supprimer
          </button>
        )}
        {saved && <span role="status" className="text-xs font-bold text-emerald-700">Enregistré</span>}
      </div>
    </section>
  );
}
