import { Plus, Trash2 } from 'lucide-react';

import type { ShiftPlanningSettings, ShiftRoleDef, ShiftStaffingRule } from '@/types/dataTypes';

import type { DayBudget } from '../shiftCalculations';
import { dateFromIso, formatShortDate } from '../shiftDates';
import { computeDayNeeds, MANAGER_ROLE_ID } from '../shiftStaffing';

type Props = {
  settings: ShiftPlanningSettings;
  roles: ShiftRoleDef[]; // rôles de présence (hors e-learning)
  weekDates: string[];
  budgetOf: (date: string) => DayBudget;
  onChange: (change: Partial<ShiftPlanningSettings>) => void;
};

const cell = 'rounded-lg border border-slate-300 px-2 py-1 text-sm';
const DAY_SHORT = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];

export default function ShiftStaffingEditor({ settings, roles, weekDates, budgetOf, onChange }: Props) {
  const rules = settings.staffingRules;
  const staffingRoles = roles.filter(role => role.id !== MANAGER_ROLE_ID);
  const unusedRoles = staffingRoles.filter(role => !rules.some(rule => rule.roleId === role.id));

  const patchRule = (index: number, change: Partial<ShiftStaffingRule>) =>
    onChange({ staffingRules: rules.map((rule, i) => (i === index ? { ...rule, ...change } : rule)) });

  const label = (roleId: string) => roles.find(role => role.id === roleId)?.label ?? roleId;

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Le besoin d'un service est calculé par rôle : couverts budgétés du service ÷ couverts par personne, arrondi à l'entier supérieur
        (au moins 1 si le service est ouvert). Un encadrant est présent à chaque service ouvert.
      </p>

      {rules.map((rule, index) => (
        <div key={rule.roleId} className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2 text-sm">
          <select
            className={cell}
            value={rule.roleId}
            aria-label="Rôle"
            onChange={event => patchRule(index, { roleId: event.target.value })}
          >
            {staffingRoles
              .filter(role => role.id === rule.roleId || unusedRoles.some(unused => unused.id === role.id))
              .map(role => <option key={role.id} value={role.id}>{role.label}</option>)}
          </select>
          <label className="flex items-center gap-1 text-slate-600">1 personne pour
            <input
              type="number"
              min={1}
              className={`${cell} w-20`}
              value={rule.coversPerPerson}
              aria-label="Couverts par personne"
              onChange={event => patchRule(index, { coversPerPerson: Number(event.target.value) })}
            />
            couverts
          </label>
          <button
            type="button"
            onClick={() => onChange({ staffingRules: rules.filter((_, i) => i !== index) })}
            aria-label="Supprimer la ligne"
            className="ml-auto rounded-lg p-1 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      {unusedRoles.length > 0 && (
        <button
          type="button"
          onClick={() => onChange({ staffingRules: [...rules, { roleId: unusedRoles[0].id, coversPerPerson: 25 }] })}
          className="flex items-center gap-1 text-sm font-bold text-cyan-700"
        >
          <Plus className="h-4 w-4" /> Ajouter un rôle
        </button>
      )}

      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-700">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={settings.managerCountsInSalle} onChange={event => onChange({ managerCountsInSalle: event.target.checked })} />
          L'encadrant compte dans l'effectif salle
        </label>
      </div>

      <div className="rounded-xl border border-slate-200 p-3 text-xs text-slate-700">
        <div className="mb-1 font-bold">Cette semaine</div>
        <ul className="space-y-0.5">
          {weekDates.map(date => {
            const needs = computeDayNeeds(settings, dateFromIso(date).getDay(), budgetOf(date));
            const parts = rules.map(rule => {
              const midi = needs.find(need => need.roleId === rule.roleId && need.service === 'midi')?.need;
              const soir = needs.find(need => need.roleId === rule.roleId && need.service === 'soir')?.need;
              return `${label(rule.roleId)} midi ${midi ?? '—'} · soir ${soir ?? '—'}`;
            });
            return (
              <li key={date}>
                <span className="font-semibold">{DAY_SHORT[dateFromIso(date).getDay()]} {formatShortDate(date)}</span> : {parts.join(' · ') || '—'}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
