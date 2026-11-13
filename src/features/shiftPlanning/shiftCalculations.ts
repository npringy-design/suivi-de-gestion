import type {
  Shift,
  ShiftAbsence,
  ShiftGuardRule,
  ShiftLegalRuleId,
  ShiftPlanningSettings,
  ShiftService,
  ShiftStaffMember,
} from '@/types/dataTypes';
import { addDaysIso } from './shiftDates';

// Calculs purs du planning : aucune autre formule métier que celles listées ici.

const MINUTES_PER_DAY = 24 * 60;

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

// Besoin = max(min, ⌈couverts ÷ coversPerPerson⌉), plafonné à max ; coversPerPerson null → min.
export const requiredStaff = (rule: ShiftGuardRule, covers: number): number => {
  if (rule.coversPerPerson === null || rule.coversPerPerson <= 0) return rule.min;
  const need = Math.max(rule.min, Math.ceil(covers / rule.coversPerPerson));
  return Math.min(need, rule.max);
};

export type RoleNeed = { roleId: string; service: ShiftService; need: number };

// Plusieurs règles sur un même rôle et service : on retient le besoin le plus élevé.
export const computeDayNeeds = (rules: ShiftGuardRule[], budget: DayBudget): RoleNeed[] => {
  const needs = new Map<string, RoleNeed>();
  rules.forEach(rule => {
    const services: ShiftService[] = rule.service === 'both' ? ['midi', 'soir'] : [rule.service];
    services.forEach(service => {
      const need = requiredStaff(rule, service === 'midi' ? budget.cvMidi : budget.cvSoir);
      const key = `${rule.roleId}|${service}`;
      const existing = needs.get(key);
      if (!existing || need > existing.need) needs.set(key, { roleId: rule.roleId, service, need });
    });
  });
  return [...needs.values()];
};

export type RoleShortage = { roleId: string; missing: number };

export const computeDayShortages = (needs: RoleNeed[], dayShifts: Shift[]): RoleShortage[] => {
  const missingByRole = new Map<string, number>();
  needs.forEach(({ roleId, service, need }) => {
    const covered = dayShifts.filter(shift => shift.roleId === roleId && shift.service === service).length;
    if (need > covered) missingByRole.set(roleId, (missingByRole.get(roleId) ?? 0) + (need - covered));
  });
  return [...missingByRole.entries()].map(([roleId, missing]) => ({ roleId, missing }));
};

export const findAbsence = (absences: ShiftAbsence[], staffKey: string, date: string): ShiftAbsence | undefined =>
  absences.find(a => a.staffKey === staffKey && date >= a.dateFrom && date <= a.dateTo);

export type LegalAlert = { ruleId: ShiftLegalRuleId; staffKey: string; shiftIds: string[]; message: string };

const absoluteStartMinutes = (shift: Shift, mondayIso: string): number => {
  const dayIndex = Math.round((Date.parse(`${shift.date}T00:00:00Z`) - Date.parse(`${mondayIso}T00:00:00Z`)) / 86400000);
  return dayIndex * MINUTES_PER_DAY + (parseShiftTime(shift.start) ?? 0);
};

const absoluteEndMinutes = (shift: Shift, mondayIso: string): number =>
  absoluteStartMinutes(shift, mondayIso) + Math.round(shiftDurationHours(shift.start, shift.end) * 60);

const formatHours = (hours: number): string => `${Math.round(hours * 10) / 10} h`;

// Alertes légales de la semaine (mode « alerte » uniquement : « bloquer » est stocké mais pas appliqué).
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
  guardRules: [],
  legalRules: [
    { id: 'rest11h', mode: 'alert' },
    { id: 'max10hDay', mode: 'alert' },
    { id: 'max48hWeek', mode: 'alert' },
    { id: 'restDays2', mode: 'alert' },
    { id: 'contractHours', mode: 'alert' },
  ],
  roles: [
    { id: 'encadrement', label: 'Encadrement', couleur: '#1e3a5f' },
    { id: 'salle', label: 'Salle', couleur: '#f59e0b' },
    { id: 'cuisine', label: 'Cuisine', couleur: '#be123c' },
  ],
};

export const LEGAL_RULE_LABELS: Record<ShiftLegalRuleId, string> = {
  rest11h: 'Repos de 11 h entre deux shifts',
  max10hDay: '10 h maximum par jour',
  max48hWeek: '48 h maximum par semaine',
  restDays2: '2 jours de repos par semaine',
  contractHours: 'Dépassement des heures contractuelles',
};
