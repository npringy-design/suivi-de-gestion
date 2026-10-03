import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';

import { MONTH_NAMES, MONTH_NAMES_SHORT } from '@/lib/constants';
import { sanitizeMoneyInput, parseMoneyValue } from '@/lib/money';

import PayrollCharts from './components/PayrollCharts';
import PayrollComparisonCards from './components/PayrollComparisonCards';
import PayrollEntryForm from './components/PayrollEntryForm';
import { usePayrollCosts } from './hooks/usePayrollCosts';

type MasseSalarialeProps = {
  onBack: () => void;
};

export default function MasseSalariale({ onBack }: MasseSalarialeProps) {
  const payroll = usePayrollCosts();
  const { year, month, entry, thresholds, current } = payroll;
  const [grossThreshold, setGrossThreshold] = useState(String(thresholds.grossToRevenuePct).replace('.', ','));
  const [totalThreshold, setTotalThreshold] = useState(String(thresholds.totalCostToRevenuePct).replace('.', ','));

  const commitThresholds = () => {
    const gross = parseMoneyValue(grossThreshold);
    const total = parseMoneyValue(totalThreshold);
    if (gross > 0 && total > 0) payroll.setThresholds({ grossToRevenuePct: gross, totalCostToRevenuePct: total });
  };

  const years = [year - 2, year - 1, year, year + 1];

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
            <div className="text-base font-black uppercase tracking-[0.14em] text-amber-50">Masse salariale & charges</div>
            <div className="text-xs font-semibold text-cyan-50/60">Suivi mensuel · ratios sur CA réel · comparaisons</div>
          </div>
          <div className="w-24" />
        </header>

        <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.06] p-3">
          <div className="flex items-center gap-2">
            <select
              aria-label="Année"
              value={year}
              onChange={event => payroll.setYear(Number(event.target.value))}
              className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm font-bold text-white"
            >
              {years.map(y => <option key={y} value={y} className="text-slate-900">{y}</option>)}
            </select>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {MONTH_NAMES_SHORT.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => payroll.setMonth(index)}
                aria-pressed={index === month}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wider ${index === month ? 'bg-amber-400 text-slate-900' : 'bg-white/10 text-cyan-50/80 hover:bg-white/20'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <PayrollEntryForm
          key={`${year}-${month}-${entry ? 'saisi' : 'vide'}`}
          entry={entry}
          revenue={payroll.revenue}
          monthLabel={`${MONTH_NAMES[month]} ${year}`}
          onSave={payroll.saveEntry}
          onDelete={payroll.deleteEntry}
        />

        {entry?.note && (
          <div className="rounded-xl border border-sky-300/30 bg-sky-400/10 px-4 py-2.5 text-xs font-semibold text-sky-100">
            <span className="font-black uppercase tracking-wider">Note · </span>{entry.note}
          </div>
        )}

        {current ? (
          <PayrollComparisonCards
            metrics={current}
            vsPrevious={payroll.vsPrevious}
            vsLastYear={payroll.vsLastYear}
            vsBudget={payroll.vsBudget}
            hasPrevious={payroll.hasPrevious}
            hasLastYear={payroll.hasLastYear}
            thresholds={thresholds}
          />
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-center text-sm font-semibold text-cyan-50/60">
            Saisissez le brut et les charges du mois pour afficher les indicateurs et comparaisons.
          </div>
        )}

        <PayrollCharts series={payroll.series} thresholds={thresholds} />

        <section className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
          <h3 className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-amber-50">Seuils d'alerte (% du CA)</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-[11px] font-bold uppercase tracking-wider text-cyan-100/70">
              Brut / CA
              <input
                inputMode="decimal"
                value={grossThreshold}
                onChange={event => setGrossThreshold(sanitizeMoneyInput(event.target.value))}
                onBlur={commitThresholds}
                className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-base font-semibold text-white outline-none focus:border-amber-300/70"
              />
            </label>
            <label className="grid gap-1 text-[11px] font-bold uppercase tracking-wider text-cyan-100/70">
              Coût global / CA
              <input
                inputMode="decimal"
                value={totalThreshold}
                onChange={event => setTotalThreshold(sanitizeMoneyInput(event.target.value))}
                onBlur={commitThresholds}
                className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-base font-semibold text-white outline-none focus:border-amber-300/70"
              />
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}
