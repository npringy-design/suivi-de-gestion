import { Plus, Trash2 } from 'lucide-react';

import type { ShiftRoleDef, ShiftService, ShiftTemplate } from '@/types/dataTypes';

import ShiftDaysPicker from './ShiftDaysPicker';

type Props = { templates: ShiftTemplate[]; roles: ShiftRoleDef[]; onChange: (templates: ShiftTemplate[]) => void };

const field = 'rounded-lg border border-slate-300 px-2 py-1 text-sm';

export default function ShiftTemplatesEditor({ templates, roles, onChange }: Props) {
  const patch = (id: string, change: Partial<ShiftTemplate>) =>
    onChange(templates.map(template => (template.id === id ? { ...template, ...change } : template)));

  const addTemplate = () => onChange([...templates, {
    id: `tpl-${Date.now().toString(36)}`, label: 'Nouveau modèle', roleId: roles[0]?.id ?? '', service: 'midi',
    days: [0, 1, 2, 3, 4, 5, 6], start: '11h30', end: '15h00',
  }]);

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">Le moteur ne crée que des shifts issus d'un modèle : arrivée = heure de début, fin = fermeture maximum.</p>
      {templates.length === 0 && <p className="text-sm text-slate-500">Aucun modèle : la génération ne place aucun shift.</p>}
      {templates.map(template => (
        <div key={template.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2 text-sm">
          <input className={`${field} w-44`} value={template.label} aria-label="Libellé" onChange={event => patch(template.id, { label: event.target.value })} />
          <select className={field} value={template.roleId} aria-label="Rôle" onChange={event => patch(template.id, { roleId: event.target.value })}>
            {roles.map(role => <option key={role.id} value={role.id}>{role.label}</option>)}
          </select>
          <select className={field} value={template.service} aria-label="Service" onChange={event => patch(template.id, { service: event.target.value as ShiftService })}>
            <option value="midi">Midi</option>
            <option value="soir">Soir</option>
          </select>
          <ShiftDaysPicker days={template.days} label="Jours" onChange={days => patch(template.id, { days })} />
          <input className={`${field} w-20`} value={template.start} aria-label="Arrivée" onChange={event => patch(template.id, { start: event.target.value })} />
          <span className="text-slate-400">→</span>
          <input className={`${field} w-20`} value={template.end} aria-label="Fin (fermeture maximum)" onChange={event => patch(template.id, { end: event.target.value })} />
          <button type="button" onClick={() => onChange(templates.filter(item => item.id !== template.id))} aria-label="Supprimer le modèle" className="ml-auto rounded-lg p-1 text-red-600 hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={addTemplate} className="flex items-center gap-1 text-sm font-bold text-cyan-700">
        <Plus className="h-4 w-4" /> Ajouter un modèle
      </button>
    </div>
  );
}
