import type { ReactNode } from 'react';
import { Plus, Trash2, X } from 'lucide-react';

import type { ShiftAbsence, ShiftLegalRule, ShiftPlanningSettings as Settings, ShiftRoleDef, ShiftStaffMember } from '@/types/dataTypes';

import type { ShiftSaveStatus } from '../hooks/useShiftPlanningDocs';
import { ELEARNING_ROLE_ID, LEGAL_RULE_LABELS, type DayBudget } from '../shiftCalculations';
import { BEBAS_FONT } from '../shiftRoleStyle';

import ShiftGuardRulesEditor from './ShiftGuardRulesEditor';
import ShiftPayPeriodsEditor from './ShiftPayPeriodsEditor';
import ShiftServiceWindowsEditor from './ShiftServiceWindowsEditor';
import ShiftSlotRulesEditor from './ShiftSlotRulesEditor';
import ShiftTemplatesEditor from './ShiftTemplatesEditor';
import { ShiftAbsencesEditor, ShiftStaffEditor } from './ShiftStaffEditor';

type Props = {
  settings: Settings;
  staff: ShiftStaffMember[];
  staffSourceLabels: Record<string, string>;
  weekDates: string[];
  budgetOf: (date: string) => DayBudget;
  absences: ShiftAbsence[];
  onSettingsChange: (settings: Settings) => void;
  onStaffChange: (staff: ShiftStaffMember[]) => void;
  onAbsencesChange: (absences: ShiftAbsence[]) => void;
  saveStatus: ShiftSaveStatus;
  lastSavedAt: Date | null;
  saveError: string | null;
  onClose: () => void;
};

const field = 'rounded-lg border border-slate-300 px-2 py-1 text-sm';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-2xl text-slate-900" style={{ fontFamily: BEBAS_FONT }}>{title}</h2>
      {children}
    </section>
  );
}

export default function ShiftPlanningSettings({
  settings, staff, staffSourceLabels, weekDates, budgetOf, absences, onSettingsChange, onStaffChange, onAbsencesChange, saveStatus, lastSavedAt, saveError, onClose,
}: Props) {
  const patch = (change: Partial<Settings>) => onSettingsChange({ ...settings, ...change });
  // Le rôle technique e-learning n'entre jamais dans les besoins de présence ni dans les rôles du personnel.
  const presenceRoles = settings.roles.filter(role => role.id !== ELEARNING_ROLE_ID);

  const patchRole = (id: string, change: Partial<ShiftRoleDef>) =>
    patch({ roles: settings.roles.map(role => (role.id === id ? { ...role, ...change } : role)) });

  const addRole = () => {
    const taken = new Set(settings.roles.map(role => role.id));
    let id = 'nouveau-role';
    for (let n = 2; taken.has(id); n += 1) id = `nouveau-role-${n}`;
    patch({ roles: [...settings.roles, { id, label: 'Nouveau rôle', couleur: '#0e7490' }] });
  };

  const patchLegal = (id: ShiftLegalRule['id'], mode: ShiftLegalRule['mode']) =>
    patch({ legalRules: settings.legalRules.map(rule => (rule.id === id ? { ...rule, mode } : rule)) });

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl text-slate-900" style={{ fontFamily: BEBAS_FONT }}>Paramètres du planning</h1>
        <button type="button" onClick={onClose} className="flex items-center gap-1 rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-white">
          <X className="h-4 w-4" /> Fermer
        </button>
      </div>

      <p
        className={`text-sm font-semibold ${saveStatus === 'error' ? 'text-red-600' : saveStatus === 'saving' ? 'text-slate-500' : 'text-green-700'}`}
        role="status"
      >
        {saveStatus === 'saving' && 'Enregistrement…'}
        {saveStatus === 'saved' && `Enregistré à ${(lastSavedAt ?? new Date()).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
        {saveStatus === 'error' && `Erreur : ${saveError ?? 'enregistrement impossible'}`}
      </p>

      <Section title="Objectifs">
        <div className="grid gap-4 sm:grid-cols-2 text-sm text-slate-700">
          <label className="flex items-center justify-between gap-2">Productivité minimum (€/h)
            <input type="number" min={0} className={`${field} w-24`} value={settings.minProductivity} onChange={event => patch({ minProductivity: Number(event.target.value) })} />
          </label>
          <label className="flex items-center justify-between gap-2">Masse salariale cible (% du CA)
            <input type="number" min={0} className={`${field} w-24`} value={settings.targetPayrollPct} onChange={event => patch({ targetPayrollPct: Number(event.target.value) })} />
          </label>
          <label className="flex items-center justify-between gap-2">Heures sup
            <select className={field} value={settings.avoidOvertime ? 'eviter' : 'autoriser'} onChange={event => patch({ avoidOvertime: event.target.value === 'eviter' })}>
              <option value="eviter">Éviter</option>
              <option value="autoriser">Autoriser</option>
            </select>
          </label>
          <label className="flex items-center justify-between gap-2">Recalcul automatique après saisie
            <select className={field} value={settings.autoRegenerate ? 'oui' : 'non'} onChange={event => patch({ autoRegenerate: event.target.value === 'oui' })}>
              <option value="oui">Oui</option>
              <option value="non">Non</option>
            </select>
          </label>
        </div>
      </Section>

      <Section title="Effectif par service selon les couverts">
        <ShiftGuardRulesEditor rules={settings.guardRules} roles={presenceRoles} weekDates={weekDates} budgetOf={budgetOf} onChange={guardRules => patch({ guardRules })} />
      </Section>

      <Section title="Horaires des services">
        <ShiftServiceWindowsEditor windows={settings.serviceWindows} onChange={serviceWindows => patch({ serviceWindows })} />
      </Section>

      <Section title="Modèles de shifts">
        <ShiftTemplatesEditor templates={settings.templates} roles={presenceRoles} onChange={templates => patch({ templates })} />
      </Section>

      <Section title="Besoins par créneau">
        <label className="mb-3 flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={settings.managerOpenToClose} onChange={event => patch({ managerOpenToClose: event.target.checked })} />
          1 encadrement présent de l'ouverture à la fermeture, chaque jour
        </label>
        <ShiftSlotRulesEditor rules={settings.slotRules} roles={presenceRoles} onChange={slotRules => patch({ slotRules })} />
      </Section>

      <Section title="Périodes de paie">
        <ShiftPayPeriodsEditor periods={settings.payPeriods} onChange={payPeriods => patch({ payPeriods })} />
      </Section>

      <Section title="E-learning apprentis">
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-700">
          <label className="flex items-center gap-2">Heures par semaine
            <input type="number" min={0} className={`${field} w-20`} value={settings.elearningHours} onChange={event => patch({ elearningHours: Number(event.target.value) })} />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={settings.elearningInProductivity} onChange={event => patch({ elearningInProductivity: event.target.checked })} />
            Inclure dans la productivité
          </label>
        </div>
      </Section>

      <Section title="Règles légales">
        <div className="space-y-2">
          {settings.legalRules.map(rule => (
            <div key={rule.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
              <span className="text-slate-700">{LEGAL_RULE_LABELS[rule.id]}</span>
              <select className={field} value={rule.mode} aria-label={LEGAL_RULE_LABELS[rule.id]} onChange={event => patchLegal(rule.id, event.target.value === 'block' ? 'block' : 'alert')}>
                <option value="alert">Alerte</option>
                <option value="block">Bloquer</option>
              </select>
            </div>
          ))}
          <p className="text-xs text-slate-500">En mode « Bloquer », la saisie d'un shift qui enfreint la règle est refusée.</p>
        </div>
      </Section>

      <Section title="Rôles">
        <div className="space-y-2">
          {settings.roles.map(role => (
            <div key={role.id} className="flex items-center gap-2 text-sm">
              <input type="color" value={role.couleur} aria-label={`Couleur ${role.label}`} onChange={event => patchRole(role.id, { couleur: event.target.value })} className="h-8 w-10 rounded" />
              <input className={`${field} w-56`} value={role.label} aria-label="Libellé du rôle" onChange={event => patchRole(role.id, { label: event.target.value })} />
              <button type="button" hidden={role.id === ELEARNING_ROLE_ID} onClick={() => patch({ roles: settings.roles.filter(r => r.id !== role.id) })} aria-label="Supprimer le rôle" className="rounded-lg p-1 text-red-600 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={addRole} className="flex items-center gap-1 text-sm font-bold text-cyan-700"><Plus className="h-4 w-4" /> Ajouter un rôle</button>
        </div>
      </Section>

      <Section title="Personnel">
        <ShiftStaffEditor staff={staff} roles={presenceRoles} sourceLabels={staffSourceLabels} onChange={onStaffChange} />
      </Section>

      <Section title="Absences">
        <ShiftAbsencesEditor staff={staff} absences={absences} onChange={onAbsencesChange} />
      </Section>
    </div>
  );
}
