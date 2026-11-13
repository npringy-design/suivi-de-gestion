import { Plus, Trash2 } from 'lucide-react';

import type { ShiftGuardRule, ShiftRoleDef } from '@/types/dataTypes';

type Props = {
  rules: ShiftGuardRule[];
  roles: ShiftRoleDef[];
  onChange: (rules: ShiftGuardRule[]) => void;
};

const cell = 'rounded-lg border border-slate-300 px-2 py-1 text-sm';

export default function ShiftGuardRulesEditor({ rules, roles, onChange }: Props) {
  const patch = (index: number, change: Partial<ShiftGuardRule>) =>
    onChange(rules.map((rule, i) => (i === index ? { ...rule, ...change } : rule)));

  const addRule = () => onChange([...rules, { roleId: roles[0]?.id ?? '', service: 'both', coversPerPerson: null, min: 1, max: 1 }]);

  return (
    <div className="space-y-2">
      {rules.length === 0 && <p className="text-sm text-slate-500">Aucune règle : aucun besoin n'est calculé.</p>}
      {rules.map((rule, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2 text-sm">
          <select className={cell} value={rule.roleId} aria-label="Rôle" onChange={event => patch(index, { roleId: event.target.value })}>
            {roles.map(role => <option key={role.id} value={role.id}>{role.label}</option>)}
          </select>
          <select
            className={cell}
            value={rule.service}
            aria-label="Service"
            onChange={event => patch(index, { service: event.target.value as ShiftGuardRule['service'] })}
          >
            <option value="both">Midi et soir</option>
            <option value="midi">Midi</option>
            <option value="soir">Soir</option>
          </select>
          <span className="text-slate-500">1 personne pour</span>
          <input
            type="number"
            min={0}
            className={`${cell} w-20`}
            value={rule.coversPerPerson ?? ''}
            placeholder="—"
            aria-label="Couverts par personne"
            onChange={event => patch(index, { coversPerPerson: event.target.value === '' ? null : Number(event.target.value) })}
          />
          <span className="text-slate-500">couverts · min</span>
          <input type="number" min={0} className={`${cell} w-16`} value={rule.min} aria-label="Minimum" onChange={event => patch(index, { min: Number(event.target.value) })} />
          <span className="text-slate-500">max</span>
          <input type="number" min={0} className={`${cell} w-16`} value={rule.max} aria-label="Maximum" onChange={event => patch(index, { max: Number(event.target.value) })} />
          <button
            type="button"
            onClick={() => onChange(rules.filter((_, i) => i !== index))}
            aria-label="Supprimer la règle"
            className="ml-auto rounded-lg p-1 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={addRule} className="flex items-center gap-1 text-sm font-bold text-cyan-700">
        <Plus className="h-4 w-4" /> Ajouter une règle
      </button>
    </div>
  );
}
