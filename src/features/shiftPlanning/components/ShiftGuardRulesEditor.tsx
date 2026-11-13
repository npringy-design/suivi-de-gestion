import { Plus, Trash2 } from 'lucide-react';

import type { ShiftGuardRule, ShiftRoleDef, ShiftService } from '@/types/dataTypes';

import { requiredStaff, type DayBudget } from '../shiftCalculations';

type Props = {
  rules: ShiftGuardRule[];
  roles: ShiftRoleDef[];
  weekDates: string[];
  budgetOf: (date: string) => DayBudget;
  onChange: (rules: ShiftGuardRule[]) => void;
};

const cell = 'rounded-lg border border-slate-300 px-2 py-1 text-sm';

type ServicePreview = { service: ShiftService; low: number; high: number; uncappedHigh: number };

// Effectif calculé cette semaine pour une règle, à partir des couverts budgétés (requiredStaff, sans autre formule).
const previewRule = (rule: ShiftGuardRule, weekDates: string[], budgetOf: (date: string) => DayBudget): ServicePreview[] => {
  const services: ShiftService[] = rule.service === 'both' ? ['midi', 'soir'] : [rule.service];
  return services.map(service => {
    const covers = weekDates.map(date => (service === 'midi' ? budgetOf(date).cvMidi : budgetOf(date).cvSoir));
    const capped = covers.map(count => requiredStaff(rule, count));
    const uncapped = covers.map(count => requiredStaff({ ...rule, max: Number.POSITIVE_INFINITY }, count));
    return { service, low: Math.min(...capped), high: Math.max(...capped), uncappedHigh: Math.max(...uncapped) };
  });
};

const range = (low: number, high: number) => (low === high ? `${low}` : `${low} à ${high}`);

export default function ShiftGuardRulesEditor({ rules, roles, weekDates, budgetOf, onChange }: Props) {
  const patch = (index: number, change: Partial<ShiftGuardRule>) =>
    onChange(rules.map((rule, i) => (i === index ? { ...rule, ...change } : rule)));

  const addRule = () => onChange([...rules, { roleId: roles[0]?.id ?? '', service: 'both', coversPerPerson: null, min: 1, max: 1 }]);

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-600">
        Le nombre de personnes est calculé à partir des couverts budgétés du service, puis borné entre le minimum et le maximum.
      </p>
      {rules.length === 0 && <p className="text-sm text-slate-500">Aucune règle : aucun besoin n'est calculé.</p>}
      {rules.map((rule, index) => {
        const previews = previewRule(rule, weekDates, budgetOf);
        const low = Math.min(...previews.map(p => p.low));
        const high = Math.max(...previews.map(p => p.high));
        const capped = previews.reduce((max, p) => Math.max(max, p.uncappedHigh), 0);
        return (
          <div key={index} className="rounded-xl bg-slate-50 p-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <select className={cell} value={rule.roleId} aria-label="Rôle" onChange={event => patch(index, { roleId: event.target.value })}>
                {roles.map(role => <option key={role.id} value={role.id}>{role.label}</option>)}
              </select>
              <span className="text-slate-400">·</span>
              <select className={cell} value={rule.service} aria-label="Service" onChange={event => patch(index, { service: event.target.value as ShiftGuardRule['service'] })}>
                <option value="both">Midi et soir</option>
                <option value="midi">Midi</option>
                <option value="soir">Soir</option>
              </select>
              <span className="text-slate-400">·</span>
              <label className="flex items-center gap-1 text-slate-600">1 personne pour
                <input
                  type="number"
                  min={0}
                  className={`${cell} w-20`}
                  value={rule.coversPerPerson ?? ''}
                  placeholder="—"
                  aria-label="Couverts par personne"
                  onChange={event => patch(index, { coversPerPerson: event.target.value === '' ? null : Number(event.target.value) })}
                />
                couverts
              </label>
              <label className="flex items-center gap-1 text-slate-600">Minimum présent
                <input type="number" min={0} className={`${cell} w-16`} value={rule.min} aria-label="Minimum présent" onChange={event => patch(index, { min: Number(event.target.value) })} />
              </label>
              <label className="flex items-center gap-1 text-slate-600">Maximum souhaité
                <input type="number" min={0} className={`${cell} w-16`} value={rule.max} aria-label="Maximum souhaité" onChange={event => patch(index, { max: Number(event.target.value) })} />
              </label>
              <span className="ml-auto text-xs font-semibold text-slate-700">
                Cette semaine : {range(low, high)} personne{high > 1 ? 's' : ''} ({previews.map(p => `${p.service} ${range(p.low, p.high)}`).join(', ')})
              </span>
              <button
                type="button"
                onClick={() => onChange(rules.filter((_, i) => i !== index))}
                aria-label="Supprimer la règle"
                className="rounded-lg p-1 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {capped > rule.max && (
              <p className="mt-1 text-xs font-semibold" style={{ color: '#ea580c' }}>
                Le maximum ({rule.max}) plafonne un besoin calculé de {capped}
              </p>
            )}
          </div>
        );
      })}
      <button type="button" onClick={addRule} className="flex items-center gap-1 text-sm font-bold text-cyan-700">
        <Plus className="h-4 w-4" /> Ajouter une règle
      </button>
      <p className="text-xs text-slate-500">Conseil : créez une ligne Midi et une ligne Soir par rôle si les besoins diffèrent.</p>
    </div>
  );
}
