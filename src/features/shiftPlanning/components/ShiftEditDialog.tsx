import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';

import type { Shift, ShiftRoleDef, ShiftService, ShiftStaffMember } from '@/types/dataTypes';
import { ELEARNING_ROLE_ID, inferShiftService, parseShiftTime } from '../shiftCalculations';
import { formatShortDate } from '../shiftDates';

type Props = {
  member: ShiftStaffMember;
  date: string;
  cellShifts: Shift[];
  roles: ShiftRoleDef[];
  // Raisons du refus si les shifts saisis enfreignent une règle légale en mode « bloquer ».
  getBlockingReasons: (shifts: Shift[]) => string[];
  onSave: (shifts: Shift[]) => void;
  onClose: () => void;
};

const newShiftId = () => `shift-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function ShiftEditDialog({ member, date, cellShifts, roles, getBlockingReasons, onSave, onClose }: Props) {
  const roleOptions = member.roles.length > 0
    ? member.roles.map(id => roles.find(r => r.id === id)).filter((role): role is ShiftRoleDef => role !== undefined)
    : roles;
  // L'e-learning peut toujours être saisi à la main.
  const elearningRole = roles.find(role => role.id === ELEARNING_ROLE_ID);
  const selectableRoles = elearningRole && !roleOptions.includes(elearningRole) ? [...roleOptions, elearningRole] : roleOptions;
  const defaultRoleId = roleOptions[0]?.id ?? '';

  const [drafts, setDrafts] = useState<Shift[]>(cellShifts);
  const [errors, setErrors] = useState<string[]>([]);

  const patch = (id: string, change: Partial<Shift>) =>
    setDrafts(list => list.map(shift => (shift.id === id ? { ...shift, ...change } : shift)));

  const addDraft = () => setDrafts(list => [...list, {
    id: newShiftId(), staffKey: member.key, date, start: '11h30', end: '15h00',
    roleId: defaultRoleId, service: 'midi', status: 'validated',
  }]);

  const handleSave = () => {
    const invalid = drafts.some(shift => parseShiftTime(shift.start) === null || parseShiftTime(shift.end) === null || !shift.roleId);
    if (invalid) {
      setErrors(['Horaires au format 11h30 et rôle obligatoires.']);
      return;
    }
    // Un shift saisi à la main est validé.
    const validated = drafts.map<Shift>(shift => ({ ...shift, status: 'validated' }));
    const reasons = getBlockingReasons(validated);
    if (reasons.length > 0) {
      setErrors(reasons.map(reason => `Enregistrement refusé : ${reason}`));
      return;
    }
    onSave(validated);
  };

  const inputClass = 'w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900">{member.nom} · {formatShortDate(date)}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-lg p-1 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-4 space-y-3">
          {drafts.length === 0 && <p className="text-sm text-slate-500">Aucun shift ce jour.</p>}
          {drafts.map(shift => (
            <div key={shift.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2">
              <input
                className={inputClass}
                value={shift.start}
                aria-label="Heure de début"
                onChange={event => patch(shift.id, { start: event.target.value, service: inferShiftService(event.target.value) })}
              />
              <span className="text-slate-400">→</span>
              <input className={inputClass} value={shift.end} aria-label="Heure de fin" onChange={event => patch(shift.id, { end: event.target.value })} />
              <select
                className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                value={shift.roleId}
                aria-label="Rôle"
                onChange={event => patch(shift.id, { roleId: event.target.value })}
              >
                {selectableRoles.map(role => <option key={role.id} value={role.id}>{role.label}</option>)}
              </select>
              <select
                className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                value={shift.service}
                aria-label="Service"
                onChange={event => patch(shift.id, { service: event.target.value as ShiftService })}
              >
                <option value="midi">Midi</option>
                <option value="soir">Soir</option>
              </select>
              <button
                type="button"
                onClick={() => setDrafts(list => list.filter(item => item.id !== shift.id))}
                aria-label="Supprimer le shift"
                className="ml-auto rounded-lg p-1 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={addDraft} className="flex items-center gap-1 text-sm font-bold text-cyan-700">
            <Plus className="h-4 w-4" /> Ajouter un shift
          </button>
        </div>

        {errors.map(message => <p key={message} className="mt-3 text-sm text-red-600">{message}</p>)}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">Annuler</button>
          <button type="button" onClick={handleSave} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-900" style={{ background: '#f59e0b' }}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
