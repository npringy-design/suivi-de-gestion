import { parseMoneyValue } from '@/lib/money';
import { collectDailySamples } from '@/features/analyse/ecartsAnalysis';
import { payrollNameKey } from '@/features/dashboard/importHelpers/personnelSalaryImport';
import type { MonthData, MonthDataSalariesConfig, ShiftPlanningSettings, ShiftStaffMember } from '@/types/dataTypes';
import type { DayBudget } from './shiftCalculations';
import { monthsOfDates } from './shiftDates';

// Lecture seule des données existantes : aucune écriture dans allData.

type AllData = Record<number, Record<number, MonthData>>;

export type StaffCandidate = { key: string; nom: string; hourlyRate: number; forfaitJour: boolean };

export type StaffSource = { candidates: StaffCandidate[]; year: number; month: number } | null;

const hasNamedRows = (config: MonthDataSalariesConfig | undefined): config is MonthDataSalariesConfig =>
  Boolean(config && Object.values(config.categories ?? {}).some(rows => rows.some(row => row.nom.trim() !== '')));

// salariesConfig du mois planifié ; à défaut, du mois le plus récent qui en a un.
// (L'import du PDF du mois M est rangé sous M+1 : la config du mois planifié porte les coûts du mois précédent, voulu.)
export function findSalariesConfig(allData: AllData, year: number, month: number): { config: MonthDataSalariesConfig; year: number; month: number } | null {
  const planned = allData[year]?.[month]?.salariesConfig;
  if (hasNamedRows(planned)) return { config: planned, year, month };

  const years = Object.keys(allData).map(Number).sort((a, b) => b - a);
  for (const candidateYear of years) {
    for (let candidateMonth = 11; candidateMonth >= 0; candidateMonth -= 1) {
      const config = allData[candidateYear]?.[candidateMonth]?.salariesConfig;
      if (hasNamedRows(config)) return { config, year: candidateYear, month: candidateMonth };
    }
  }
  return null;
}

export function deriveStaffCandidates(allData: AllData, year: number, month: number): StaffSource {
  const found = findSalariesConfig(allData, year, month);
  if (!found) return null;

  const lines = found.config.payrollLines ?? [];
  const leavers = new Set(lines.filter(line => Boolean(line.exitDate)).map(line => payrollNameKey(line.nom)));
  const forfaitKeys = new Set(lines.filter(line => line.forfaitJour).map(line => payrollNameKey(line.nom)));

  const byKey = new Map<string, StaffCandidate>();
  Object.values(found.config.categories).forEach(rows => {
    rows.forEach(row => {
      const nom = row.nom.trim();
      if (!nom) return;
      const key = payrollNameKey(nom);
      if (leavers.has(key) || byKey.has(key)) return;
      byKey.set(key, { key, nom, hourlyRate: parseMoneyValue(row.coutHoraire), forfaitJour: forfaitKeys.has(key) });
    });
  });

  return { candidates: [...byKey.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')), year: found.year, month: found.month };
}

// Fiche collaborateur : valeurs enregistrées, sinon défauts (35 h, aucun rôle, aucun repos préféré).
export const buildStaffMembers = (candidates: StaffCandidate[], stored: ShiftStaffMember[]): ShiftStaffMember[] => {
  const storedByKey = new Map(stored.map(member => [member.key, member]));
  return candidates.map(candidate => {
    const saved = storedByKey.get(candidate.key);
    return saved
      ? { ...saved, nom: candidate.nom }
      : { key: candidate.key, nom: candidate.nom, roles: [], contractHours: 35, forfaitJour: candidate.forfaitJour, preferredRestDays: [] };
  });
};

// Couverts et CA budgétés par jour, via collectDailySamples (budgetFallback : jours futurs inclus).
export function collectWeekBudget(allData: AllData, weekDates: string[]): Record<string, DayBudget> {
  const start = weekDates[0];
  const end = weekDates[weekDates.length - 1];
  const samples = collectDailySamples(allData, monthsOfDates(weekDates), start, end, '9999-12-31', true);
  return Object.fromEntries(samples.map(sample => [sample.date, {
    cvMidi: sample.budget.cvMidi,
    cvSoir: sample.budget.cvSoir,
    caMidi: sample.budget.caMidi,
    caSoir: sample.budget.caSoir,
  }]));
}

// Gardes de forme à la lecture des documents Supabase (le contenu vient d'un jsonb non typé).
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

export const normalizeSettings = (raw: unknown, defaults: ShiftPlanningSettings): ShiftPlanningSettings => {
  if (!isRecord(raw)) return defaults;
  const value = raw as Partial<ShiftPlanningSettings>;
  return {
    minProductivity: typeof value.minProductivity === 'number' ? value.minProductivity : defaults.minProductivity,
    targetPayrollPct: typeof value.targetPayrollPct === 'number' ? value.targetPayrollPct : defaults.targetPayrollPct,
    avoidOvertime: typeof value.avoidOvertime === 'boolean' ? value.avoidOvertime : defaults.avoidOvertime,
    autoRegenerate: typeof value.autoRegenerate === 'boolean' ? value.autoRegenerate : defaults.autoRegenerate,
    guardRules: Array.isArray(value.guardRules) ? value.guardRules : defaults.guardRules,
    legalRules: Array.isArray(value.legalRules) ? value.legalRules : defaults.legalRules,
    roles: Array.isArray(value.roles) && value.roles.length > 0 ? value.roles : defaults.roles,
  };
};

export const readArray = <T>(raw: unknown, field: string): T[] => {
  if (!isRecord(raw)) return [];
  const list = raw[field];
  return Array.isArray(list) ? list as T[] : [];
};

