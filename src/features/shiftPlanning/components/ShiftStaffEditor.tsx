import { useState } from 'react';
import { Trash2 } from 'lucide-react';

import type { ShiftAbsence, ShiftRoleDef, ShiftStaffMember } from '@/types/dataTypes';
import { formatShortDate } from '../shiftDates';

// Boutons L à D ; valeur = getDay() (0 = dimanche).
const REST_DAYS: Array<{ label: string; value: number }> = [
  { label: 'L', value: 1 }, { label: 'M', value: 2 }, { label: 'M', value: 3 }, { label: 'J', value: 4 },
  { label: 'V', value: 5 }, { label: 'S', value: 6 }, { label: 'D', value: 0 },
];

const field = 'rounded-lg border border-slate-300 px-2 py-1 text-sm';

type StaffProps = {
  staff: ShiftStaffMember[];
  roles: ShiftRoleDef[];
  sourceLabels: Record<string, string>;
  onChange: (staff: ShiftStaffMember[]) => void;
};

export function ShiftStaffEditor({ staff, roles, sourceLabels, onChange }: StaffProps) {
  const patch = (key: string, change: Partial<ShiftStaffMember>) =>
    onChange(staff.map(member => (member.key === key ? { ...member, ...change } : member)));

  const setRole = (member: ShiftStaffMember, slot: number, roleId: string) => {
    const next = [...member.roles];
    next[slot] = roleId;
    patch(member.key, { roles: [...new Set(next.filter(Boolean))] });
  };

  const toggleRest = (member: ShiftStaffMember, day: number) =>
    patch(member.key, {
      preferredRestDays: member.preferredRestDays.includes(day)
        ? member.preferredRestDays.filter(d => d !== day)
        : [...member.preferredRestDays, day],
    });

  if (staff.length === 0) {
    return <p className="text-sm text-slate-500">Aucun collaborateur : la configuration des salaires du mois est vide.</p>;
  }

  return (
    <div className="space-y-2">
      {staff.map(member => (
        <div key={member.key} className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2 text-sm">
          <span className="w-52 font-bold text-slate-800">
            <span className="block truncate">{member.nom}</span>
            {sourceLabels[member.key] && <span className="block truncate text-[11px] font-normal text-slate-400">{sourceLabels[member.key]}</span>}
          </span>
          {[0, 1, 2].map(slot => (
            <select
              key={slot}
              className={field}
              value={member.roles[slot] ?? ''}
              aria-label={`Rôle ${slot + 1} de ${member.nom}`}
              onChange={event => setRole(member, slot, event.target.value)}
            >
              <option value="">Rôle {slot + 1}</option>
              {roles.map(role => <option key={role.id} value={role.id}>{role.label}</option>)}
            </select>
          ))}
          <input
            type="number"
            min={0}
            className={`${field} w-16`}
            value={member.contractHours}
            aria-label={`Heures de contrat de ${member.nom}`}
            onChange={event => patch(member.key, { contractHours: Number(event.target.value) })}
          />
          <span className="text-slate-500">h</span>
          <label className="flex items-center gap-1 text-slate-600">
            <input type="checkbox" checked={member.forfaitJour} onChange={event => patch(member.key, { forfaitJour: event.target.checked })} />
            Forfait jour
          </label>
          <div className="flex gap-1" aria-label={`Jours de repos préférés de ${member.nom}`}>
            {REST_DAYS.map(day => (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleRest(member, day.value)}
                aria-pressed={member.preferredRestDays.includes(day.value)}
                className={`h-7 w-7 rounded-md text-xs font-bold ${member.preferredRestDays.includes(day.value) ? 'bg-slate-700 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

type AbsenceProps = {
  staff: ShiftStaffMember[];
  absences: ShiftAbsence[];
  onChange: (absences: ShiftAbsence[]) => void;
};

export function ShiftAbsencesEditor({ staff, absences, onChange }: AbsenceProps) {
  const [staffKey, setStaffKey] = useState('');
  const [type, setType] = useState<'cp' | 'rtt'>('cp');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const canAdd = staffKey !== '' && dateFrom !== '' && dateTo !== '' && dateFrom <= dateTo;
  const add = () => {
    onChange([...absences, { staffKey, type, dateFrom, dateTo }]);
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <select className={field} value={staffKey} aria-label="Collaborateur" onChange={event => setStaffKey(event.target.value)}>
          <option value="">Collaborateur</option>
          {staff.map(member => <option key={member.key} value={member.key}>{member.nom}</option>)}
        </select>
        <select className={field} value={type} aria-label="Type" onChange={event => setType(event.target.value === 'rtt' ? 'rtt' : 'cp')}>
          <option value="cp">CP</option>
          <option value="rtt">RTT</option>
        </select>
        <label className="text-slate-500">du <input type="date" className={field} value={dateFrom} onChange={event => setDateFrom(event.target.value)} /></label>
        <label className="text-slate-500">au <input type="date" className={field} value={dateTo} onChange={event => setDateTo(event.target.value)} /></label>
        <button type="button" disabled={!canAdd} onClick={add} className="rounded-lg px-3 py-1.5 text-sm font-bold text-slate-900 disabled:opacity-40" style={{ background: '#f59e0b' }}>
          Poser
        </button>
      </div>
      {absences.map((absence, index) => (
        <div key={index} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-1.5 text-sm">
          <span className="font-bold text-slate-800">{staff.find(m => m.key === absence.staffKey)?.nom ?? absence.staffKey}</span>
          <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: '#0e7490' }}>{absence.type.toUpperCase()}</span>
          <span className="text-slate-600">{formatShortDate(absence.dateFrom)} → {formatShortDate(absence.dateTo)}</span>
          <button
            type="button"
            onClick={() => onChange(absences.filter((_, i) => i !== index))}
            aria-label="Supprimer l'absence"
            className="ml-auto rounded-lg p-1 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
