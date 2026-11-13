import { Plus, Trash2 } from 'lucide-react';

import type { ShiftRoleDef, ShiftService, ShiftSlotRule } from '@/types/dataTypes';

import ShiftDaysPicker from './ShiftDaysPicker';

type Props = { rules: ShiftSlotRule[]; roles: ShiftRoleDef[]; onChange: (rules: ShiftSlotRule[]) => void };

const field = 'rounded-lg border border-slate-300 px-2 py-1 text-sm';

export default function ShiftSlotRulesEditor({ rules, roles, onChange }: Props) {
  const patch = (id: string, change: Partial<ShiftSlotRule>) =>
    onChange(rules.map(rule => (rule.id === id ? { ...rule, ...change } : rule)));

  const addRule = () => onChange([...rules, {
    id: `slot-${Date.now().toString(36)}`, label: 'Nouveau besoin', roleId: roles[0]?.id ?? '', service: 'midi',
    days: [0, 1, 2, 3, 4, 5, 6], count: 1, startEarliest: '10h00', startLatest: '10h00', untilClose: false,
  }]);

  return (
    <div className="space-y-2">
      {rules.length === 0 && <p className="text-sm text-slate-500">Aucun besoin par créneau.</p>}
      {rules.map(rule => (
        <div key={rule.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2 text-sm">
          <input className={`${field} w-44`} value={rule.label} aria-label="Libellé" onChange={event => patch(rule.id, { label: event.target.value })} />
          <select className={field} value={rule.roleId} aria-label="Rôle" onChange={event => patch(rule.id, { roleId: event.target.value })}>
            {roles.map(role => <option key={role.id} value={role.id}>{role.label}</option>)}
          </select>
          <select className={field} value={rule.service} aria-label="Service" onChange={event => patch(rule.id, { service: event.target.value as ShiftService })}>
            <option value="midi">Midi</option>
            <option value="soir">Soir</option>
          </select>
          <ShiftDaysPicker days={rule.days} label="Jours" onChange={days => patch(rule.id, { days })} />
          <input type="number" min={1} className={`${field} w-16`} value={rule.count} aria-label="Nombre" onChange={event => patch(rule.id, { count: Number(event.target.value) })} />
          <span className="text-slate-500">début de</span>
          <input className={`${field} w-20`} value={rule.startEarliest} aria-label="Début au plus tôt" onChange={event => patch(rule.id, { startEarliest: event.target.value })} />
          <span className="text-slate-500">à</span>
          <input className={`${field} w-20`} value={rule.startLatest} aria-label="Début au plus tard" onChange={event => patch(rule.id, { startLatest: event.target.value })} />
          <label className="flex items-center gap-1 text-slate-600">
            <input type="checkbox" checked={rule.untilClose} onChange={event => patch(rule.id, { untilClose: event.target.checked })} />
            Jusqu'à la fermeture
          </label>
          <button type="button" onClick={() => onChange(rules.filter(item => item.id !== rule.id))} aria-label="Supprimer le besoin" className="ml-auto rounded-lg p-1 text-red-600 hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={addRule} className="flex items-center gap-1 text-sm font-bold text-cyan-700">
        <Plus className="h-4 w-4" /> Ajouter un besoin
      </button>
    </div>
  );
}
