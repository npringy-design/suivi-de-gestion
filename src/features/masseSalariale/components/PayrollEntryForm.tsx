import { useState } from 'react';

import { formatDecimal, formatEuroSymbol, formatPercent } from '@/lib/formatters';
import { parseMoneyValue, sanitizeMoneyInput } from '@/lib/money';
import type { PayrollMonthEntry } from '@/types/dataTypes';

import type { PayrollMetrics } from '../payrollCalculations';

type PayrollEntryFormProps = {
  entry: PayrollMonthEntry | undefined;
  revenue: number | null;
  monthLabel: string;
  onSave: (entry: PayrollMonthEntry) => void;
  onDelete: () => void;
};

const toInput = (value: number | undefined): string => (value === undefined ? '' : String(value).replace('.', ','));
const toOptional = (raw: string): number | undefined => (raw.trim() === '' ? undefined : parseMoneyValue(raw));

const inputClass =
  'w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2.5 text-base font-semibold text-white outline-none placeholder:text-white/30 focus:border-amber-300/70';

function Field({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-100/70">{label}</span>
      <input
        inputMode="decimal"
        value={value}
        onChange={event => onChange(sanitizeMoneyInput(event.target.value))}
        placeholder="0,00"
        className={inputClass}
      />
      {hint && <span className="text-[11px] text-cyan-50/50">{hint}</span>}
    </label>
  );
}

function Computed({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/5 px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-100/60">{label}</div>
      <div className="text-sm font-black text-amber-50">{value}</div>
    </div>
  );
}

// Aperçu en direct, calculé à partir des champs saisis (avant enregistrement).
const previewMetrics = (gross: number, charges: number, hours: number | undefined, revenue: number | null): PayrollMetrics => {
  const totalCost = gross + charges;
  const safeRevenue = revenue && revenue > 0 ? revenue : null;
  return {
    gross,
    employerCharges: charges,
    totalCost,
    chargesRatePct: gross > 0 ? (charges / gross) * 100 : null,
    hourlyCost: hours && hours > 0 ? totalCost / hours : null,
    revenue: safeRevenue,
    grossToRevenuePct: safeRevenue ? (gross / safeRevenue) * 100 : null,
    totalCostToRevenuePct: safeRevenue ? (totalCost / safeRevenue) * 100 : null,
  };
};

const pct = (value: number | null) => (value === null ? '—' : formatPercent(value));

export default function PayrollEntryForm({ entry, revenue, monthLabel, onSave, onDelete }: PayrollEntryFormProps) {
  const [gross, setGross] = useState(toInput(entry?.gross));
  const [charges, setCharges] = useState(toInput(entry?.employerCharges));
  const [hours, setHours] = useState(toInput(entry?.hours));
  const [budgetGross, setBudgetGross] = useState(toInput(entry?.budgetGross));
  const [budgetCharges, setBudgetCharges] = useState(toInput(entry?.budgetEmployerCharges));
  const [note, setNote] = useState(entry?.note ?? '');
  const [saved, setSaved] = useState(false);

  const grossValue = parseMoneyValue(gross);
  const chargesValue = parseMoneyValue(charges);
  const hoursValue = toOptional(hours);
  const preview = previewMetrics(grossValue, chargesValue, hoursValue, revenue);
  const canSave = gross.trim() !== '' && charges.trim() !== '';

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      // Les lignes par salarié (futur) sont conservées telles quelles à l'enregistrement.
      ...entry,
      gross: grossValue,
      employerCharges: chargesValue,
      hours: hoursValue,
      budgetGross: toOptional(budgetGross),
      budgetEmployerCharges: toOptional(budgetCharges),
      note: note.trim() === '' ? undefined : note.trim(),
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-black uppercase tracking-[0.12em] text-amber-50">Saisie · {monthLabel}</h2>
        <div className="text-xs font-semibold text-cyan-50/70">
          CA réel du mois (Suivi Quotidien) : <span className="font-black text-amber-50">{revenue === null ? 'non disponible' : formatEuroSymbol(revenue)}</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Masse salariale brute (€)" value={gross} onChange={setGross} />
        <Field label="Charges patronales (€)" value={charges} onChange={setCharges} />
        <Field label="Heures totales (optionnel)" value={hours} onChange={setHours} hint="Normales + majorées" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Computed label="% charges patronales" value={pct(preview.chargesRatePct)} />
        <Computed label="Coût salarial global" value={formatEuroSymbol(preview.totalCost)} />
        <Computed label="Brut / CA" value={pct(preview.grossToRevenuePct)} />
        <Computed label="Coût global / CA" value={pct(preview.totalCostToRevenuePct)} />
        <Computed label="Coût horaire moyen" value={preview.hourlyCost === null ? '—' : `${formatDecimal(preview.hourlyCost, 2)} €/h`} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Budget brut (optionnel, €)" value={budgetGross} onChange={setBudgetGross} />
        <Field label="Budget charges (optionnel, €)" value={budgetCharges} onChange={setBudgetCharges} hint="Requis pour comparer charges et coût global au budget" />
      </div>

      <label className="mt-4 grid gap-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-100/70">Note du mois</span>
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
            className="rounded-lg border border-white/20 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-cyan-50/80 hover:bg-white/10"
          >
            Supprimer
          </button>
        )}
        {saved && <span role="status" className="text-xs font-bold text-emerald-300">Enregistré</span>}
      </div>
    </section>
  );
}
