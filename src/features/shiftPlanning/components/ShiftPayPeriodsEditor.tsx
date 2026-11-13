import { useState } from 'react';
import { Trash2 } from 'lucide-react';

import type { ShiftPayPeriod } from '@/types/dataTypes';
import { formatShortDate } from '../shiftDates';

type Props = { periods: ShiftPayPeriod[]; onChange: (periods: ShiftPayPeriod[]) => void };

const field = 'rounded-lg border border-slate-300 px-2 py-1 text-sm';

export default function ShiftPayPeriodsEditor({ periods, onChange }: Props) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const canAdd = start !== '' && end !== '' && start <= end;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="text-slate-500">du <input type="date" className={field} value={start} onChange={event => setStart(event.target.value)} /></label>
        <label className="text-slate-500">au <input type="date" className={field} value={end} onChange={event => setEnd(event.target.value)} /></label>
        <button
          type="button"
          disabled={!canAdd}
          onClick={() => {
            onChange([...periods, { start, end }].sort((a, b) => a.start.localeCompare(b.start)));
            setStart('');
            setEnd('');
          }}
          className="rounded-lg px-3 py-1.5 text-sm font-bold text-slate-900 disabled:opacity-40"
          style={{ background: '#f59e0b' }}
        >
          Ajouter
        </button>
      </div>
      {periods.length === 0 && <p className="text-sm text-slate-500">Aucune période : la génération vise les heures de contrat de la semaine.</p>}
      {periods.map((period, index) => (
        <div key={`${period.start}-${period.end}`} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-1.5 text-sm">
          <span className="font-bold text-slate-800">{formatShortDate(period.start)}/{period.start.slice(0, 4)} → {formatShortDate(period.end)}/{period.end.slice(0, 4)}</span>
          <button type="button" onClick={() => onChange(periods.filter((_, i) => i !== index))} aria-label="Supprimer la période" className="ml-auto rounded-lg p-1 text-red-600 hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
