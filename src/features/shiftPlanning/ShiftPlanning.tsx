import { useCallback, useEffect, useMemo, useState } from 'react';
import { Lock } from 'lucide-react';

import { useAuthSession } from '@/AuthGate';
import { canAccessShiftPlanning } from '@/lib/suiviPermissions';
import type { Shift, ShiftStaffMember } from '@/types/dataTypes';

import ShiftEditDialog from './components/ShiftEditDialog';
import ShiftGrid, { type StaffGroup } from './components/ShiftGrid';
import ShiftKpiCards from './components/ShiftKpiCards';
import ShiftLegend from './components/ShiftLegend';
import ShiftPlanningHeader from './components/ShiftPlanningHeader';
import ShiftPlanningSettings from './components/ShiftPlanningSettings';
import ShiftUnmetList from './components/ShiftUnmetList';
import { useShiftPlanningData } from './hooks/useShiftPlanningData';
import { useShiftGeneration } from './hooks/useShiftGeneration';
import { useShiftPeriodData } from './hooks/useShiftPeriodData';
import { useShiftPlanningDocs } from './hooks/useShiftPlanningDocs';
import { useShiftWeekMetrics } from './hooks/useShiftWeekMetrics';
import { newBlockingViolations } from './shiftCalculations';
import { restSummary } from './shiftGeneratorRest';
import { coveredServicesLabel } from './shiftStaffing';
import { addDaysIso, formatShortDate, isoFromDate, isoWeekNumber, mondayOfIso, weekDaysIso } from './shiftDates';

const FONT_LINK_ID = 'shift-planning-bebas-neue';
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap';

// Regroupe les collaborateurs par rôle principal, dans l'ordre des rôles configurés.
const groupStaffByPrimaryRole = (staff: ShiftStaffMember[], roles: Array<{ id: string; label: string }>): StaffGroup[] => {
  const groups: StaffGroup[] = roles.map(role => ({
    roleId: role.id,
    label: role.label,
    members: staff.filter(member => member.roles[0] === role.id),
  }));
  const knownIds = new Set(roles.map(role => role.id));
  const others = staff.filter(member => !member.roles[0] || !knownIds.has(member.roles[0]));
  if (others.length > 0) groups.push({ roleId: null, label: 'Sans rôle principal', members: others });
  return groups.filter(group => group.members.length > 0);
};

function LockedScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow">
        <Lock className="mx-auto h-8 w-8 text-slate-400" />
        <p className="mt-3 text-sm font-semibold text-slate-700">Page réservée</p>
        <button type="button" onClick={onBack} className="mt-4 text-sm font-bold text-cyan-700">Retour</button>
      </div>
    </div>
  );
}

function ShiftPlanningContent({ onBack }: { onBack: () => void }) {
  const { activeSiteId } = useAuthSession();
  const [mondayIso, setMondayIso] = useState(() => mondayOfIso(isoFromDate(new Date())));
  const [showSettings, setShowSettings] = useState(false);
  const [editing, setEditing] = useState<{ staffKey: string; date: string } | null>(null);

  const weekDates = useMemo(() => weekDaysIso(mondayIso), [mondayIso]);
  const docs = useShiftPlanningDocs(activeSiteId, mondayIso);
  const roleIds = useMemo(() => docs.settings.roles.map(role => role.id), [docs.settings.roles]);
  const data = useShiftPlanningData(weekDates, docs.storedStaff, roleIds);
  const metrics = useShiftWeekMetrics(weekDates, docs.shifts, data.staff, data.hourlyRates, docs.settings, data.budgetOf);
  const period = useShiftPeriodData(activeSiteId, mondayIso, docs.settings, data.staff, docs.shifts);
  const generation = useShiftGeneration({
    mondayIso, staff: data.staff, absences: docs.absences, settings: docs.settings, budgetOf: data.budgetOf,
    periodInfo: period.periodInfo, shifts: docs.shifts, updateShifts: docs.updateShifts,
    isLoading: docs.isLoading || data.isLoading,
    flushPending: docs.flushPending,
  });

  useEffect(() => {
    if (document.getElementById(FONT_LINK_ID)) return;
    const link = document.createElement('link');
    link.id = FONT_LINK_ID;
    link.rel = 'stylesheet';
    link.href = FONT_HREF;
    document.head.appendChild(link);
  }, []);

  const groups = useMemo(() => groupStaffByPrimaryRole(data.staff, docs.settings.roles), [data.staff, docs.settings.roles]);

  const { updateShifts } = docs;
  const validateWeek = useCallback(() => {
    updateShifts(list => list.map<Shift>(shift => (shift.status === 'proposed' ? { ...shift, status: 'validated' } : shift)));
  }, [updateShifts]);

  const rests = useMemo(
    () => Object.fromEntries(data.staff.map(member => [member.key, restSummary(member, docs.shifts, docs.absences, weekDates)])),
    [data.staff, docs.shifts, docs.absences, weekDates],
  );

  // RAZ : supprime tous les shifts de la semaine affichée (validés compris), après confirmation.
  const { resetUnmet } = generation;
  const resetWeek = useCallback(() => {
    if (!window.confirm(`Supprimer les ${docs.shifts.length} shifts de la semaine (validés compris) ? Cette action est définitive.`)) return;
    updateShifts(() => []);
    resetUnmet();
  }, [docs.shifts.length, updateShifts, resetUnmet]);

  const { applyManualShifts } = generation;
  const saveCell = useCallback((staffKey: string, date: string, cellShifts: Shift[]) => {
    applyManualShifts([...docs.shifts.filter(shift => !(shift.staffKey === staffKey && shift.date === date)), ...cellShifts]);
    setEditing(null);
  }, [applyManualShifts, docs.shifts]);

  if (showSettings) {
    return (
      <div className="min-h-screen" style={{ background: '#f4f1ec' }}>
        <ShiftPlanningSettings
          settings={docs.settings}
          staff={data.staff}
          staffSourceLabels={data.staffSourceLabels}
          weekDates={weekDates}
          budgetOf={data.budgetOf}
          saveStatus={docs.saveStatus}
          lastSavedAt={docs.lastSavedAt}
          saveError={docs.error}
          absences={docs.absences}
          onSettingsChange={docs.setSettings}
          onStaffChange={docs.setStoredStaff}
          onAbsencesChange={docs.setAbsences}
          onClose={() => { docs.flushPending(); setShowSettings(false); }}
        />
      </div>
    );
  }

  const editedMember = editing ? data.staff.find(member => member.key === editing.staffKey) : undefined;
  const weekLabel = `S.${String(isoWeekNumber(mondayIso)).padStart(2, '0')} · ${formatShortDate(mondayIso)} – ${formatShortDate(addDaysIso(mondayIso, 6))}`;

  return (
    <div className="min-h-screen" style={{ background: '#f4f1ec' }}>
      <ShiftPlanningHeader
        weekLabel={weekLabel}
        proposedCount={metrics.proposedCount}
        saveStatus={docs.saveStatus}
        onBack={onBack}
        onPrevWeek={() => setMondayIso(addDaysIso(mondayIso, -7))}
        onNextWeek={() => setMondayIso(addDaysIso(mondayIso, 7))}
        onOpenSettings={() => setShowSettings(true)}
        onValidate={validateWeek}
        onGenerate={generation.generate}
        onReset={resetWeek}
        shiftCount={docs.shifts.length}
      />

      <main className="space-y-5 p-4 sm:p-6">
        {docs.error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {docs.error} (si la table n'existe pas encore : exécuter supabase/SHIFT_PLANNING_SETUP.sql)
          </div>
        )}
        {(docs.isLoading || data.isLoading) && <p className="text-sm text-slate-500">Chargement…</p>}

        <ShiftKpiCards metrics={metrics} settings={docs.settings} />

        <ShiftUnmetList unmet={generation.unmet} />

        <ShiftGrid
          groups={groups}
          roles={docs.settings.roles}
          days={metrics.days}
          dayContext={data.dayContext}
          shifts={docs.shifts}
          absences={docs.absences}
          alertShiftIds={metrics.alertShiftIds}
          hoursByStaff={metrics.hoursByStaff}
          counters={period.counters}
          rests={rests}
          serviceLabelOf={shift => coveredServicesLabel(shift, docs.settings).toUpperCase()}
          minProductivity={docs.settings.minProductivity}
          todayIso={isoFromDate(new Date())}
          onCellClick={(staffKey, date) => setEditing({ staffKey, date })}
        />

        {metrics.alerts.length > 0 && (
          <ul className="space-y-1 rounded-2xl bg-white p-4 text-xs text-red-700 shadow-sm">
            {metrics.alerts.map((alert, index) => <li key={index}>{alert.message}</li>)}
          </ul>
        )}

        <ShiftLegend roles={docs.settings.roles} />
      </main>

      {editing && editedMember && (
        <ShiftEditDialog
          key={`${editing.staffKey}-${editing.date}`}
          member={editedMember}
          date={editing.date}
          cellShifts={docs.shifts.filter(shift => shift.staffKey === editing.staffKey && shift.date === editing.date)}
          roles={docs.settings.roles}
          settings={docs.settings}
          getBlockingReasons={cellShifts => newBlockingViolations(docs.shifts, editedMember, editing.date, cellShifts, mondayIso, docs.settings.legalRules)}
          onSave={cellShifts => saveCell(editing.staffKey, editing.date, cellShifts)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

export default function ShiftPlanning({ onBack }: { onBack: () => void }) {
  const { accessProfile, activeSiteId } = useAuthSession();
  if (!canAccessShiftPlanning({ role: accessProfile.role }, activeSiteId)) return <LockedScreen onBack={onBack} />;
  return <ShiftPlanningContent onBack={onBack} />;
}
