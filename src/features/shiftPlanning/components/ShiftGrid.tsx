import { formatDecimal } from '@/lib/formatters';
import type { Shift, ShiftAbsence, ShiftRoleDef, ShiftStaffMember } from '@/types/dataTypes';
import type { DayMetrics } from '../hooks/useShiftWeekMetrics';
import { findAbsence } from '../shiftCalculations';
import type { DayContext } from '../shiftSources';
import { dateFromIso } from '../shiftDates';
import { BEBAS_FONT, NO_ROLE_COLOR, roleColorOf, roleGradient, roleTextColor } from '../shiftRoleStyle';

const DAY_LABELS = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];
const GRID_COLUMNS = '210px repeat(7, minmax(120px, 1fr))';

export type StaffGroup = { roleId: string | null; label: string; members: ShiftStaffMember[] };

type Props = {
  groups: StaffGroup[];
  roles: ShiftRoleDef[];
  days: DayMetrics[];
  dayContext: Record<string, DayContext>;
  shifts: Shift[];
  absences: ShiftAbsence[];
  alertShiftIds: Set<string>;
  hoursByStaff: Record<string, number>;
  counters: Record<string, number | null>;
  minProductivity: number;
  todayIso: string;
  onCellClick: (staffKey: string, date: string) => void;
};

function ContextPills({ context }: { context: DayContext | undefined }) {
  if (!context) return null;
  const pill = "mt-1 mr-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold";
  return (
    <div>
      {context.holiday && <span className={pill} style={{ background: '#fee2e2', color: '#991b1b' }}>Férié · {context.holiday}</span>}
      {context.vacation && <span className={pill} style={{ background: '#e0f2fe', color: '#075985' }}>Vacances</span>}
      {context.events.map(label => (
        <span key={label} className={pill} style={{ background: 'rgba(255,255,255,.15)', color: '#fff' }}>{label}</span>
      ))}
    </div>
  );
}

function DayHeader({ day, context, roles, minProductivity, isToday }: { day: DayMetrics; context: DayContext | undefined; roles: ShiftRoleDef[]; minProductivity: number; isToday: boolean }) {
  const date = dateFromIso(day.date);
  const productivityOk = day.productivity !== null && day.productivity >= minProductivity;
  return (
    <div
      className="px-2 py-2 text-white"
      style={{ background: isToday ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '#0b1f33', color: isToday ? '#1f1300' : '#fff' }}
    >
      <div className="text-2xl leading-none" style={{ fontFamily: BEBAS_FONT }}>
        {DAY_LABELS[date.getDay()]} {String(date.getDate()).padStart(2, '0')}
      </div>
      <div className="mt-1 text-[11px] opacity-80">{Math.round(day.covers)} couverts</div>
      <ContextPills context={context} />
      {day.productivity !== null && (
        <span
          className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
          style={{ background: productivityOk ? '#16a34a' : '#dc2626' }}
        >
          {formatDecimal(day.productivity, 0)} €/h
        </span>
      )}
      {day.shortages.map(shortage => (
        <div key={shortage.roleId} className="mt-1 text-[10px] font-bold" style={{ color: isToday ? '#7f1d1d' : '#fca5a5' }}>
          {shortage.missing} {(roles.find(r => r.id === shortage.roleId)?.label ?? shortage.roleId).toLowerCase()} manquant{shortage.missing > 1 ? 's' : ''}
        </div>
      ))}
    </div>
  );
}

function ShiftBlock({ shift, roles, hasAlert }: { shift: Shift; roles: ShiftRoleDef[]; hasAlert: boolean }) {
  const couleur = roleColorOf(roles, shift.roleId);
  const proposed = shift.status === 'proposed';
  return (
    <div
      className="rounded-lg px-2 py-1 text-[11px] leading-tight"
      style={{
        background: proposed ? '#fff' : roleGradient(couleur),
        color: proposed ? '#78350f' : roleTextColor(couleur),
        border: proposed ? '2px solid #f59e0b' : '2px solid transparent',
        boxShadow: hasAlert ? '0 0 0 2px #dc2626' : undefined,
      }}
    >
      <div className="text-[9px] font-bold uppercase tracking-wider opacity-80">
        {shift.service === 'midi' ? 'MIDI' : 'SOIR'}{proposed ? ' · PROPOSÉ' : ''}
      </div>
      <div className="font-bold">{shift.start} – {shift.end}</div>
    </div>
  );
}

export default function ShiftGrid({
  groups, roles, days, dayContext, shifts, absences, alertShiftIds, hoursByStaff, counters, minProductivity, todayIso, onCellClick,
}: Props) {
  return (
    <div className="overflow-x-auto rounded-2xl shadow-sm">
      <div className="grid min-w-[1050px] gap-px bg-slate-200" style={{ gridTemplateColumns: GRID_COLUMNS }}>
        <div className="flex items-end bg-[#0b1f33] px-3 py-2 text-xs font-bold uppercase tracking-wider text-white/70">Équipe</div>
        {days.map(day => (
          <DayHeader key={day.date} day={day} context={dayContext[day.date]} roles={roles} minProductivity={minProductivity} isToday={day.date === todayIso} />
        ))}

        {groups.map(group => (
          <GroupRows
            key={group.roleId ?? 'none'}
            group={group}
            roles={roles}
            days={days}
            shifts={shifts}
            absences={absences}
            alertShiftIds={alertShiftIds}
            hoursByStaff={hoursByStaff}
            counters={counters}
            onCellClick={onCellClick}
          />
        ))}

        {groups.length === 0 && (
          <div className="col-span-8 bg-white p-6 text-center text-sm text-slate-500">
            Aucun collaborateur : renseigne la configuration des salaires du mois (Config Salaires).
          </div>
        )}
      </div>
    </div>
  );
}

type GroupProps = Pick<Props, 'roles' | 'days' | 'shifts' | 'absences' | 'alertShiftIds' | 'hoursByStaff' | 'counters' | 'onCellClick'> & { group: StaffGroup };

function GroupRows({ group, roles, days, shifts, absences, alertShiftIds, hoursByStaff, counters, onCellClick }: GroupProps) {
  return (
    <>
      <div className="col-span-8 bg-[#e8e3da] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600">{group.label}</div>
      {group.members.map(member => (
        <StaffRow
          key={member.key}
          member={member}
          roles={roles}
          days={days}
          shifts={shifts}
          absences={absences}
          alertShiftIds={alertShiftIds}
          weekHours={hoursByStaff[member.key] ?? 0}
          counter={counters[member.key] ?? null}
          onCellClick={onCellClick}
        />
      ))}
    </>
  );
}

type RowProps = Pick<Props, 'roles' | 'days' | 'shifts' | 'absences' | 'alertShiftIds' | 'onCellClick'> & { member: ShiftStaffMember; weekHours: number; counter: number | null };

function StaffRow({ member, roles, days, shifts, absences, alertShiftIds, weekHours, counter, onCellClick }: RowProps) {
  const primaryColor = member.roles[0] ? roleColorOf(roles, member.roles[0]) : NO_ROLE_COLOR;
  const roleLabels = member.roles.map(id => roles.find(r => r.id === id)?.label ?? id).join(' › ');
  return (
    <>
      <div className="bg-white px-3 py-2" style={{ borderLeft: `4px solid ${primaryColor}` }}>
        <div className="truncate text-sm font-bold text-slate-900">{member.nom}</div>
        <div className="truncate text-[11px] text-slate-500">{roleLabels || 'Aucun rôle'}</div>
        <div className="text-[11px] font-semibold text-slate-600">
          {formatDecimal(weekHours, 1)} h / {member.forfaitJour ? 'forfait' : `${member.contractHours} h`}
        </div>
        {counter !== null && (
          <div className="text-[11px] font-semibold" style={{ color: counter > 0 ? '#b45309' : counter < 0 ? '#0e7490' : '#16a34a' }}>
            Compteur {counter > 0 ? '+' : ''}{formatDecimal(counter, 1)} h
          </div>
        )}
      </div>
      {days.map(day => {
        const absence = findAbsence(absences, member.key, day.date);
        const cellShifts = shifts.filter(s => s.staffKey === member.key && s.date === day.date);
        return (
          <button
            key={day.date}
            type="button"
            onClick={() => onCellClick(member.key, day.date)}
            className="group flex min-h-[64px] flex-col justify-center gap-1 bg-white p-1.5 text-left hover:bg-amber-50"
            aria-label={`${member.nom} ${day.date}`}
          >
            {absence && (
              <span
                className="rounded-full px-2 py-1 text-center text-[11px] font-bold text-white"
                style={{ background: absence.type === 'repos' ? '#cbd5e1' : '#0e7490', color: absence.type === 'repos' ? '#334155' : '#fff' }}
              >
                {ABSENCE_LABELS[absence.type]}
              </span>
            )}
            {cellShifts.map(shift => (
              <ShiftBlock key={shift.id} shift={shift} roles={roles} hasAlert={alertShiftIds.has(shift.id)} />
            ))}
            {!absence && cellShifts.length === 0 && (
              <span className="text-center text-lg text-slate-300 opacity-0 group-hover:opacity-100">+</span>
            )}
          </button>
        );
      })}
    </>
  );
}

const ABSENCE_LABELS: Record<ShiftAbsence['type'], string> = { cp: 'CP', rtt: 'RTT', maladie: 'Maladie', repos: 'Repos' };
