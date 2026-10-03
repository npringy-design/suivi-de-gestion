import { ArrowLeft } from 'lucide-react';

import { MONTH_NAMES } from '@/lib/constants';

import PayrollCharts from './components/PayrollCharts';
import PayrollComparisonCards from './components/PayrollComparisonCards';
import PayrollCorrectionSection from './components/PayrollCorrectionSection';
import PayrollEntryForm from './components/PayrollEntryForm';
import PayrollMonthlyTable from './components/PayrollMonthlyTable';
import PayrollThresholdsPanel from './components/PayrollThresholdsPanel';
import PayrollYearKpis from './components/PayrollYearKpis';
import { usePayrollCosts } from './hooks/usePayrollCosts';

type MasseSalarialeProps = {
  onBack: () => void;
};

const yearButtonClass = 'px-2 py-1 text-base font-extrabold text-slate-500 hover:text-slate-900';

export default function MasseSalariale({ onBack }: MasseSalarialeProps) {
  const payroll = usePayrollCosts();
  const { year, month, entry, thresholds, current } = payroll;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#07111f_0%,#0a2430_48%,#073d43_100%)] px-4 pb-10 pt-4 text-white sm:px-6">
      <div className="mx-auto grid max-w-[1180px] gap-4">
        <header className="flex flex-wrap items-end justify-between gap-3.5">
          <div className="grid gap-1">
            <button
              type="button"
              onClick={onBack}
              className="flex w-fit items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-100/70 transition-colors hover:text-white"
            >
              <ArrowLeft size={15} />
              Retour Accueil
            </button>
            <h1 className="text-2xl font-black uppercase tracking-[0.06em] text-amber-50 sm:text-3xl">Masse salariale — Analyse</h1>
            <div className="text-[13px] font-bold text-cyan-50/70">Coût salarial importé (Config Salaires) vs CA réalisé · 12 mois</div>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-slate-900/10 bg-white px-2 py-1.5 shadow-lg shadow-black/20">
            <button type="button" aria-label="Année précédente" onClick={() => payroll.setYear(year - 1)} className={yearButtonClass}>‹</button>
            <div className="min-w-[54px] text-center text-xl font-black tabular-nums text-amber-700">{year}</div>
            <button type="button" aria-label="Année suivante" onClick={() => payroll.setYear(year + 1)} className={yearButtonClass}>›</button>
          </div>
        </header>

        <PayrollYearKpis year={year} summary={payroll.summary} thresholdPct={thresholds.totalCostToRevenuePct} />
        <PayrollCharts year={year} series={payroll.series} thresholds={thresholds} />
        <PayrollMonthlyTable
          year={year}
          series={payroll.series}
          details={payroll.monthDetails}
          summary={payroll.summary}
          thresholdPct={thresholds.totalCostToRevenuePct}
        />

        <PayrollCorrectionSection month={month} onSelectMonth={payroll.setMonth}>
          {entry?.note && (
            <div className="rounded-xl border border-sky-300 bg-sky-50 px-4 py-2.5 text-xs font-semibold text-sky-900">
              <span className="font-black uppercase tracking-wider">Note · </span>{entry.note}
            </div>
          )}
          {current && (
            <PayrollComparisonCards
              metrics={current}
              vsPrevious={payroll.vsPrevious}
              vsLastYear={payroll.vsLastYear}
              vsBudget={payroll.vsBudget}
              hasPrevious={payroll.hasPrevious}
              hasLastYear={payroll.hasLastYear}
              thresholds={thresholds}
            />
          )}
          <PayrollEntryForm
            key={`${year}-${month}-${entry ? 'saisi' : 'vide'}`}
            entry={entry}
            auto={payroll.auto}
            revenue={payroll.revenue}
            monthLabel={`${MONTH_NAMES[month]} ${year}`}
            onSave={payroll.saveEntry}
            onDelete={payroll.deleteEntry}
          />
        </PayrollCorrectionSection>

        <PayrollThresholdsPanel thresholds={thresholds} onChange={payroll.setThresholds} />
      </div>
    </div>
  );
}
