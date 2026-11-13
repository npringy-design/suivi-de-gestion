import { Plus, Trash2 } from 'lucide-react';

import type { ShiftService, ShiftServiceWindow } from '@/types/dataTypes';

import ShiftDaysPicker from './ShiftDaysPicker';

type Props = { windows: ShiftServiceWindow[]; onChange: (windows: ShiftServiceWindow[]) => void };

const field = 'rounded-lg border border-slate-300 px-2 py-1 text-sm';

export default function ShiftServiceWindowsEditor({ windows, onChange }: Props) {
  const patch = (index: number, change: Partial<ShiftServiceWindow>) =>
    onChange(windows.map((window, i) => (i === index ? { ...window, ...change } : window)));

  return (
    <div className="space-y-2">
      {windows.length === 0 && <p className="text-sm text-slate-500">Aucun service défini : la génération ne place aucun shift.</p>}
      {windows.map((window, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2 text-sm">
          <select className={field} value={window.service} aria-label="Service" onChange={event => patch(index, { service: event.target.value as ShiftService })}>
            <option value="midi">Midi</option>
            <option value="soir">Soir</option>
          </select>
          <ShiftDaysPicker days={window.days} label="Jours du service" onChange={days => patch(index, { days })} />
          <input className={`${field} w-20`} value={window.start} aria-label="Début du service" onChange={event => patch(index, { start: event.target.value })} />
          <span className="text-slate-400">→</span>
          <input className={`${field} w-20`} value={window.end} aria-label="Fin du service" onChange={event => patch(index, { end: event.target.value })} />
          <button type="button" onClick={() => onChange(windows.filter((_, i) => i !== index))} aria-label="Supprimer l'horaire" className="ml-auto rounded-lg p-1 text-red-600 hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...windows, { service: 'midi', days: [1, 2, 3, 4, 5], start: '11h30', end: '15h00' }])}
        className="flex items-center gap-1 text-sm font-bold text-cyan-700"
      >
        <Plus className="h-4 w-4" /> Ajouter un horaire
      </button>
    </div>
  );
}
