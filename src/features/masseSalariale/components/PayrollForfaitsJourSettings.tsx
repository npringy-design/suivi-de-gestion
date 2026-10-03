import { MONTH_NAMES } from '@/lib/constants';
import type { PayrollForfaitsJourPeriod } from '@/types/dataTypes';

type PayrollForfaitsJourSettingsProps = {
  periods: PayrollForfaitsJourPeriod[];
  onChange: (periods: PayrollForfaitsJourPeriod[]) => void;
};

const inputClass = 'rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-900 outline-none focus:border-amber-500';

const currentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const monthLabel = (key: string) => {
  const [year, month] = key.split('-').map(Number);
  return MONTH_NAMES[month - 1] ? `${MONTH_NAMES[month - 1]} ${year}` : key;
};

// Nombre de forfaits jour ajoutés à l'ETP estimé des mois importés avant l'ETP exact.
// La valeur d'un mois est celle de la dernière période dont le mois de départ lui est antérieur ou égal.
export default function PayrollForfaitsJourSettings({ periods, onChange }: PayrollForfaitsJourSettingsProps) {
  const update = (index: number, patch: Partial<PayrollForfaitsJourPeriod>) =>
    onChange(periods.map((period, i) => (i === index ? { ...period, ...patch } : period)));

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <h2 className="text-sm font-black uppercase tracking-[0.12em] text-slate-900">Forfaits jour pris en compte dans l'ETP</h2>
      <p className="mb-3 mt-1 text-xs font-semibold text-slate-600">
        Sert à estimer l'ETP des mois importés avant l'ETP exact (heures ÷ 151,67 + forfaits jour). Un nouvel import de PDF donne l'ETP exact et n'utilise pas ce réglage.
      </p>
      <div className="grid gap-2">
        {periods.map((period, index) => (
          <div key={index} className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-500">
              À partir de
              <input
                type="month"
                value={period.from}
                onChange={event => event.target.value && update(index, { from: event.target.value })}
                className={inputClass}
                aria-label={`À partir de (${monthLabel(period.from)})`}
              />
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-500">
              Forfaits jour
              <input
                type="number"
                min={0}
                step={1}
                value={period.count}
                onChange={event => update(index, { count: Math.max(0, Math.round(Number(event.target.value) || 0)) })}
                className={`${inputClass} w-20`}
              />
            </label>
            <button
              type="button"
              onClick={() => onChange(periods.filter((_, i) => i !== index))}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100"
            >
              Supprimer
            </button>
          </div>
        ))}
        {periods.length === 0 && <p className="m-0 text-xs font-semibold text-slate-400">Aucun forfait jour compté dans l'ETP estimé.</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange([...periods, { from: currentMonthKey(), count: periods.at(-1)?.count ?? 1 }])}
        className="mt-3 rounded-lg bg-amber-400 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-900"
      >
        Ajouter une période
      </button>
    </section>
  );
}
