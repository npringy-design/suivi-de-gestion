import type {
  Shift,
  ShiftAbsence,
  ShiftLegalRuleId,
  ShiftPlanningSettings,
  ShiftService,
  ShiftStaffMember,
} from '@/types/dataTypes';

import { addDaysIso } from './shiftDates';

// Calculs purs du planning : aucune autre formule métier que celles listées ici.

const MINUTES_PER_DAY = 24 * 60;

export const ELEARNING_ROLE_ID = 'elearning';

export const parseShiftTime = (value: string): number | null => {
  const match = /^(\d{1,2})h(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 24 || minutes > 59 || (hours === 24 && minutes > 0)) return null;
  return hours * 60 + minutes;
};

export const formatShiftTime = (totalMinutes: number): string => {
  const minutes = ((totalMinutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}h${String(minutes % 60).padStart(2, '0')}`;
};

// Durée en heures ; une fin ≤ début passe minuit (18h30 – 00h00 = 5,5 h).
export const shiftDurationHours = (start: string, end: string): number => {
  const startMin = parseShiftTime(start);
  const endMin = parseShiftTime(end);
  if (startMin === null || endMin === null) return 0;
  const diff = endMin > startMin ? endMin - startMin : endMin + MINUTES_PER_DAY - startMin;
  return diff / 60;
};

export const shiftCost = (shift: Pick<Shift, 'start' | 'end'>, hourlyRate: number): number =>
  shiftDurationHours(shift.start, shift.end) * hourlyRate;

// Midi avant 16h, soir ensuite : service proposé pour un shift saisi à la main.
export const inferShiftService = (start: string): ShiftService => {
  const startMin = parseShiftTime(start);
  return startMin !== null && startMin < 16 * 60 ? 'midi' : 'soir';
};

export const totalHours = (shifts: Shift[]): number =>
  shifts.reduce((sum, shift) => sum + shiftDurationHours(shift.start, shift.end), 0);

export const totalCost = (shifts: Shift[], rates: Record<string, number>): number =>
  shifts.reduce((sum, shift) => sum + shiftCost(shift, rates[shift.staffKey] ?? 0), 0);

// Productivité = CA budgété ÷ heures planifiées (null sans heures).
export const productivity = (budgetRevenue: number, plannedHours: number): number | null =>
  plannedHours > 0 ? budgetRevenue / plannedHours : null;

// Masse salariale % = coût planifié ÷ CA budgété × 100 (null sans CA).
export const payrollPct = (plannedCost: number, budgetRevenue: number): number | null =>
  budgetRevenue > 0 ? (plannedCost / budgetRevenue) * 100 : null;

export type DayBudget = { cvMidi: number; cvSoir: number; caMidi: number; caSoir: number };

export const EMPTY_DAY_BUDGET: DayBudget = { cvMidi: 0, cvSoir: 0, caMidi: 0, caSoir: 0 };

export const dayRevenue = (budget: DayBudget): number => budget.caMidi + budget.caSoir;

export const findAbsence = (absences: ShiftAbsence[], staffKey: string, date: string): ShiftAbsence | undefined =>
  absences.find(a => a.staffKey === staffKey && date >= a.dateFrom && date <= a.dateTo);

export type LegalAlert = { ruleId: ShiftLegalRuleId | 'outOfTemplate'; staffKey: string; shiftIds: string[]; message: string };

const absoluteStartMinutes = (shift: Shift, mondayIso: string): number => {
  const dayIndex = Math.round((Date.parse(`${shift.date}T00:00:00Z`) - Date.parse(`${mondayIso}T00:00:00Z`)) / 86400000);
  return dayIndex * MINUTES_PER_DAY + (parseShiftTime(shift.start) ?? 0);
};

const absoluteEndMinutes = (shift: Shift, mondayIso: string): number =>
  absoluteStartMinutes(shift, mondayIso) + Math.round(shiftDurationHours(shift.start, shift.end) * 60);

const formatHours = (hours: number): string => `${Math.round(hours * 10) / 10} h`;

// Alertes légales de la semaine ; l'appelant choisit les règles évaluées (alerte, ou blocage à la saisie).
export function computeLegalAlerts(
  shifts: Shift[],
  staff: ShiftStaffMember[],
  mondayIso: string,
  enabledRules: ShiftLegalRuleId[],
): LegalAlert[] {
  const alerts: LegalAlert[] = [];
  const enabled = new Set(enabledRules);
  const days = Array.from({ length: 7 }, (_, i) => addDaysIso(mondayIso, i));

  staff.forEach(member => {
    const own = shifts
      .filter(shift => shift.staffKey === member.key)
      .sort((a, b) => absoluteStartMinutes(a, mondayIso) - absoluteStartMinutes(b, mondayIso));
    if (own.length === 0) return;

    if (enabled.has('rest11h')) {
      for (let i = 1; i < own.length; i += 1) {
        // Deux shifts du même jour forment une coupure (limitée par amplitude13h / oneBreak), pas un repos quotidien.
        if (own[i].date === own[i - 1].date) continue;
        const gapHours = (absoluteStartMinutes(own[i], mondayIso) - absoluteEndMinutes(own[i - 1], mondayIso)) / 60;
        if (gapHours < 11) {
          alerts.push({
            ruleId: 'rest11h', staffKey: member.key, shiftIds: [own[i - 1].id, own[i].id],
            message: `${member.nom} : repos de ${formatHours(Math.max(gapHours, 0))} entre deux shifts (11 h minimum)`,
          });
        }
      }
    }

    if (enabled.has('max10hDay')) {
      days.forEach(date => {
        const dayShifts = own.filter(shift => shift.date === date);
        const hours = totalHours(dayShifts);
        if (hours > 10) {
          alerts.push({
            ruleId: 'max10hDay', staffKey: member.key, shiftIds: dayShifts.map(s => s.id),
            message: `${member.nom} : ${formatHours(hours)} le ${date} (10 h maximum)`,
          });
        }
      });
    }

    const weekHours = totalHours(own);
    const allIds = own.map(shift => shift.id);
    if (enabled.has('max48hWeek') && weekHours > 48) {
      alerts.push({ ruleId: 'max48hWeek', staffKey: member.key, shiftIds: allIds, message: `${member.nom} : ${formatHours(weekHours)} sur la semaine (48 h maximum)` });
    }

    if (enabled.has('restDays2')) {
      const restDays = days.filter(date => !own.some(shift => shift.date === date)).length;
      if (restDays < 2) {
        alerts.push({ ruleId: 'restDays2', staffKey: member.key, shiftIds: allIds, message: `${member.nom} : ${restDays} jour(s) de repos sur la semaine (2 minimum)` });
      }
    }

    if (enabled.has('amplitude13h')) {
      days.forEach(date => {
        const dayShifts = own.filter(shift => shift.date === date);
        if (dayShifts.length < 2) return;
        const first = Math.min(...dayShifts.map(shift => absoluteStartMinutes(shift, mondayIso)));
        const last = Math.max(...dayShifts.map(shift => absoluteEndMinutes(shift, mondayIso)));
        if ((last - first) / 60 > 13) {
          alerts.push({
            ruleId: 'amplitude13h', staffKey: member.key, shiftIds: dayShifts.map(s => s.id),
            message: `${member.nom} : amplitude de ${formatHours((last - first) / 60)} le ${date} (13 h maximum)`,
          });
        }
      });
    }

    if (enabled.has('oneBreak')) {
      days.forEach(date => {
        const dayShifts = own.filter(shift => shift.date === date);
        if (dayShifts.length > 2) {
          alerts.push({
            ruleId: 'oneBreak', staffKey: member.key, shiftIds: dayShifts.map(s => s.id),
            message: `${member.nom} : ${dayShifts.length} shifts le ${date} (2 maximum, une seule coupure)`,
          });
        }
      });
    }

    if (enabled.has('contractHours') && !member.forfaitJour && member.contractHours > 0 && weekHours > member.contractHours) {
      alerts.push({
        ruleId: 'contractHours', staffKey: member.key, shiftIds: allIds,
        message: `${member.nom} : ${formatHours(weekHours)} planifiées pour ${formatHours(member.contractHours)} de contrat`,
      });
    }
  });

  return alerts;
}

// Heures supplémentaires de la semaine : heures au-delà du contrat hebdomadaire (hors forfait jour).
export const overtimeHours = (shifts: Shift[], staff: ShiftStaffMember[]): number =>
  staff.reduce((sum, member) => {
    if (member.forfaitJour || member.contractHours <= 0) return sum;
    const hours = totalHours(shifts.filter(shift => shift.staffKey === member.key));
    return sum + Math.max(0, hours - member.contractHours);
  }, 0);

export const DEFAULT_SHIFT_SETTINGS: ShiftPlanningSettings = {
  minProductivity: 50,
  targetPayrollPct: 24,
  avoidOvertime: true,
  autoRegenerate: true,
  staffingRules: [
    { roleId: 'salle', coversPerPerson: 25 },
    { roleId: 'cuisine', coversPerPerson: 30 },
  ],
  managerCountsInSalle: true,
  midiReferenceTime: '12h30',
  soirReferenceTime: '20h00',
  legalRules: [
    { id: 'rest11h', mode: 'alert' },
    { id: 'max10hDay', mode: 'alert' },
    { id: 'max48hWeek', mode: 'alert' },
    { id: 'restDays2', mode: 'alert' },
    { id: 'contractHours', mode: 'alert' },
    { id: 'amplitude13h', mode: 'alert' },
    { id: 'oneBreak', mode: 'alert' },
  ],
  roles: [
    { id: 'encadrement', label: 'Encadrement', couleur: '#1e3a5f' },
    { id: 'salle', label: 'Salle', couleur: '#f59e0b' },
    { id: 'cuisine', label: 'Cuisine', couleur: '#be123c' },
    { id: ELEARNING_ROLE_ID, label: 'E-learning', couleur: '#64748b' },
  ],
  // Horaires d'origine modifiables dans les paramètres : service du midi et du soir, tous les jours.
  serviceWindows: [
    { service: 'midi', days: [0, 1, 2, 3, 4, 5, 6], start: '11h30', end: '15h00' },
    { service: 'soir', days: [0, 1, 2, 3, 4, 5, 6], start: '18h30', end: '00h00' },
  ],
  slotRules: [],
  payPeriods: [],
  managerOpenToClose: true,
  elearningHours: 3,
  elearningInProductivity: true,
  // Modèles de départ (modifiables) : arrivée et fermeture maximum par rôle ; les services couverts se déduisent des heures de référence.
  templates: [
    { id: 'tpl-enc-midi', label: 'Encadrement midi', roleId: 'encadrement', order: 1, days: [0, 1, 2, 3, 4, 5, 6], start: '11h00', end: '15h00' },
    { id: 'tpl-enc-soir', label: 'Encadrement soir', roleId: 'encadrement', order: 2, days: [0, 1, 2, 3, 4, 5, 6], start: '18h00', end: '00h00' },
    { id: 'tpl-salle-ouv', label: 'Ouverture salle', roleId: 'salle', order: 1, days: [0, 1, 2, 3, 4, 5, 6], start: '10h00', end: '15h00' },
    { id: 'tpl-salle-ferm', label: 'Fermeture salle', roleId: 'salle', order: 2, days: [0, 1, 2, 3, 4, 5, 6], start: '18h30', end: '00h00' },
    { id: 'tpl-salle-midi', label: 'Service midi salle', roleId: 'salle', order: 3, days: [0, 1, 2, 3, 4, 5, 6], start: '11h30', end: '15h00' },
    { id: 'tpl-salle-soir', label: 'Service soir salle', roleId: 'salle', order: 4, days: [0, 1, 2, 3, 4, 5, 6], start: '18h30', end: '23h30' },
    { id: 'tpl-cuis-matin', label: 'Cuisine matin', roleId: 'cuisine', order: 1, days: [0, 1, 2, 3, 4, 5, 6], start: '09h30', end: '15h00' },
    { id: 'tpl-cuis-soir', label: 'Cuisine soir', roleId: 'cuisine', order: 2, days: [0, 1, 2, 3, 4, 5, 6], start: '18h00', end: '23h30' },
  ],
};

export const LEGAL_RULE_LABELS: Record<ShiftLegalRuleId, string> = {
  rest11h: 'Repos de 11 h entre deux shifts',
  max10hDay: '10 h maximum par jour',
  max48hWeek: '48 h maximum par semaine',
  restDays2: '2 jours de repos par semaine',
  contractHours: 'Dépassement des heures contractuelles',
  amplitude13h: '13 h maximum entre le premier et le dernier shift du jour',
  oneBreak: '2 shifts maximum par jour (une seule coupure)',
};

export const HARD_LEGAL_RULES: ShiftLegalRuleId[] = ['rest11h', 'max10hDay', 'max48hWeek', 'restDays2', 'amplitude13h', 'oneBreak'];

// Heures prises en compte pour la productivité : l'e-learning en est exclu si l'option est désactivée.
export const productiveHours = (shifts: Shift[], includeElearning: boolean): number =>
  totalHours(includeElearning ? shifts : shifts.filter(shift => shift.roleId !== ELEARNING_ROLE_ID));

// Infractions nouvelles (non présentes avant la saisie) aux règles en mode « bloquer » pour un collaborateur.
export function newBlockingViolations(
  weekShifts: Shift[],
  member: ShiftStaffMember,
  date: string,
  newCellShifts: Shift[],
  mondayIso: string,
  legalRules: Array<{ id: ShiftLegalRuleId; mode: 'alert' | 'block' }>,
): string[] {
  const blocking = legalRules.filter(rule => rule.mode === 'block').map(rule => rule.id);
  if (blocking.length === 0) return [];
  const others = weekShifts.filter(shift => !(shift.staffKey === member.key && shift.date === date));
  const before = new Set(computeLegalAlerts(weekShifts, [member], mondayIso, blocking).map(alert => alert.message));
  return computeLegalAlerts([...others, ...newCellShifts], [member], mondayIso, blocking)
    .map(alert => alert.message)
    .filter(message => !before.has(message));
}
