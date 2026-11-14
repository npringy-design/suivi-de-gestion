import { Plus, Trash2 } from 'lucide-react';

import type { ShiftElearningSlot, ShiftPlanningSettings, ShiftStaffMember, ShiftWeekday } from '@/types/dataTypes';

type Props = { settings: ShiftPlanningSettings; staff: ShiftStaffMember[]; onChange: (change: Partial<ShiftPlanningSettings>) => void };

const field = 'rounded-lg border border-slate-300 px-2 py-1 text-sm';
const DAY_OPTIONS: Array<{ day: ShiftWeekday; label: string }> = [
  { day: 1, label: 'Lundi' }, { day: 2, label: 'Mardi' }, { day: 3, label: 'Mercredi' }, { day: 4, label: 'Jeudi' },
  { day: 5, label: 'Vendredi' }, { day: 6, label: 'Samedi' }, { day: 0, label: 'Dimanche' },
];

const toWeekday = (value: number): ShiftWeekday => (((value % 7) + 7) % 7) as ShiftWeekday;

// E-learning des apprentis : le moteur ne le place que sur ces créneaux.
export default function ShiftElearningEditor({ settings, staff, onChange }: Props) {
  const slots = settings.elearningSlots;
  const apprentices = staff.filter(member => member.apprenti);
  const patch = (index: number, change: Partial<ShiftElearningSlot>) =>
    onChange({ elearningSlots: slots.map((slot, i) => (i === index ? { ...slot, ...change } : slot)) });

  return (
    <div className="space-y-2 text-sm text-slate-700">
      {slots.length === 0 && <p className="text-slate-500">Aucun créneau : aucune heure d'e-learning n'est planifiée.</p>}
      {slots.map((slot, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2">
          <select className={field} value={slot.staffKey} aria-label="Apprenti" onChange={event => patch(index, { staffKey: event.target.value })}>
            <option value="all">Tous les apprentis</option>
            {apprentices.map(member => <option key={member.key} value={member.key}>{member.nom}</option>)}
          </select>
          <select className={field} value={slot.day} aria-label="Jour" onChange={event => patch(index, { day: toWeekday(Number(event.target.value)) })}>
            {DAY_OPTIONS.map(option => <option key={option.day} value={option.day}>{option.label}</option>)}
          </select>
          <input className={`${field} w-20`} value={slot.start} aria-label="Début e-learning" onChange={event => patch(index, { start: event.target.value })} />
          <span className="text-slate-400">→</span>
          <input className={`${field} w-20`} value={slot.end} aria-label="Fin e-learning" onChange={event => patch(index, { end: event.target.value })} />
          <button type="button" onClick={() => onChange({ elearningSlots: slots.filter((_, i) => i !== index) })} aria-label="Supprimer le créneau" className="ml-auto rounded-lg p-1 text-red-600 hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange({ elearningSlots: [...slots, { staffKey: 'all', day: 2, start: '14h00', end: '17h00' }] })}
        className="flex items-center gap-1 font-bold text-cyan-700"
      >
        <Plus className="h-4 w-4" /> Ajouter un créneau
      </button>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={settings.elearningInProductivity} onChange={event => onChange({ elearningInProductivity: event.target.checked })} />
        Inclure dans la productivité
      </label>
    </div>
  );
}
