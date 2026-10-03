import { ArrowLeft } from 'lucide-react';

import { MONTH_NAMES } from '@/lib/constants';

import PayrollCharts from './components/PayrollCharts';
import PayrollComparisonCards from './components/PayrollComparisonCards';
import PayrollCorrectionSection from './components/PayrollCorrectionSection';
import PayrollMonthlyTable from './components/PayrollMonthlyTable';
import PayrollThresholdsPanel from './components/PayrollThresholdsPanel';
import { usePayrollCosts } from './hooks/usePayrollCosts';

type MasseSalarialeProps = {
  onBack: () => void;
};

export default function MasseSalariale({ onBack }: MasseSalarialeProps) {
  const payroll = usePayrollCosts();
  const { year, month, entry, thresholds, current } = payroll;
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
            <div className="text-xs font-semibold text-cyan-50/60">Coût salarial importé vs CA réel · analyse annuelle</div>
          </div>
          <div className="w-24" />
        </header>

        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] p-3">
          <select
            aria-label="Année"
            value={year}
            onChange={event => payroll.setYear(Number(event.target.value))}
            className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm font-bold text-white"
          >
            {years.map(y => <option key={y} value={y} className="text-slate-900">{y}</option>)}
          </select>
          <span className="text-xs font-semibold text-cyan-50/60">Janvier → décembre {year}</span>
        </div>

        <PayrollCharts series={payroll.series} thresholds={thresholds} />

        <PayrollMonthlyTable
          year={year}
          rows={payroll.yearRows}
          thresholds={thresholds}
          selectedMonth={month}
          onSelectMonth={payroll.setMonth}
        />

        {current && (
          <div className="grid gap-3">
            <h3 className="text-xs font-black uppercase tracking-[0.12em] text-amber-50">Détail · {MONTH_NAMES[month]} {year}</h3>
            {entry?.note && (
              <div className="rounded-xl border border-sky-300/30 bg-sky-400/10 px-4 py-2.5 text-xs font-semibold text-sky-100">
                <span className="font-black uppercase tracking-wider">Note · </span>{entry.note}
              </div>
            )}
            <PayrollComparisonCards
              metrics={current}
              vsPrevious={payroll.vsPrevious}
              vsLastYear={payroll.vsLastYear}
              vsBudget={payroll.vsBudget}
              hasPrevious={payroll.hasPrevious}
              hasLastYear={payroll.hasLastYear}
              thresholds={thresholds}
            />
          </div>
        )}

        <PayrollCorrectionSection
          year={year}
          month={month}
          onSelectMonth={payroll.setMonth}
          entry={entry}
          auto={payroll.auto}
          revenue={payroll.revenue}
          onSave={payroll.saveEntry}
          onDelete={payroll.deleteEntry}
        />

        <PayrollThresholdsPanel thresholds={thresholds} onChange={payroll.setThresholds} />
      </div>
    </div>
  );
}
