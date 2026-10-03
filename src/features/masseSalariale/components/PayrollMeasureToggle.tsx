import { PAYROLL_MEASURES } from '../payrollMeasures';
import type { PayrollMeasure } from '../payrollMeasures';

type PayrollMeasureToggleProps = {
  measure: PayrollMeasure;
  onChange: (measure: PayrollMeasure) => void;
};

const MEASURES = Object.keys(PAYROLL_MEASURES) as PayrollMeasure[];

export default function PayrollMeasureToggle({ measure, onChange }: PayrollMeasureToggleProps) {
  return (
    <div role="group" aria-label="Grandeur affichée" className="flex w-fit items-center gap-1 rounded-xl border border-white/20 bg-white/10 p-1">
      {MEASURES.map(key => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-pressed={key === measure}
          className={`rounded-lg px-4 py-1.5 text-xs font-black uppercase tracking-wider ${key === measure ? 'bg-amber-400 text-slate-900' : 'text-cyan-50/80 hover:text-white'}`}
        >
          {PAYROLL_MEASURES[key].label}
        </button>
      ))}
    </div>
  );
}
