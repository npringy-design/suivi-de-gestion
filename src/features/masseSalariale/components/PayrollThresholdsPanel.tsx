import { useState } from 'react';

import { parseMoneyValue, sanitizeMoneyInput } from '@/lib/money';
import type { PayrollAlertThresholds } from '@/types/dataTypes';

type PayrollThresholdsPanelProps = {
  thresholds: PayrollAlertThresholds;
  onChange: (thresholds: PayrollAlertThresholds) => void;
};

const toInput = (value: number) => String(value).replace('.', ',');

const inputClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-base font-semibold text-slate-900 outline-none focus:border-amber-500';

export default function PayrollThresholdsPanel({ thresholds, onChange }: PayrollThresholdsPanelProps) {
  const [grossThreshold, setGrossThreshold] = useState(toInput(thresholds.grossToRevenuePct));
  const [totalThreshold, setTotalThreshold] = useState(toInput(thresholds.totalCostToRevenuePct));

  const commit = () => {
    const gross = parseMoneyValue(grossThreshold);
    const total = parseMoneyValue(totalThreshold);
    if (gross > 0 && total > 0) onChange({ grossToRevenuePct: gross, totalCostToRevenuePct: total });
  };

  return (
    <section className="rounded-2xl border border-slate-900/10 bg-white shadow-lg shadow-black/20 p-4">
      <h3 className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-900">Seuils d'alerte (% du CA)</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Brut / CA
          <input inputMode="decimal" value={grossThreshold} onChange={event => setGrossThreshold(sanitizeMoneyInput(event.target.value))} onBlur={commit} className={inputClass} />
        </label>
        <label className="grid gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Coût global / CA
          <input inputMode="decimal" value={totalThreshold} onChange={event => setTotalThreshold(sanitizeMoneyInput(event.target.value))} onBlur={commit} className={inputClass} />
        </label>
      </div>
    </section>
  );
}
