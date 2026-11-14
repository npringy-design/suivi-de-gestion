import { parseMoneyValue } from '@/lib/money';
import { isPublicHoliday } from '@/lib/publicHolidays';
import { collectDailySamples } from '@/features/analyse/ecartsAnalysis';
import { vacationStatusOf } from '@/features/planification/planningEngine';
import { averagePayrollRate, getPayrollProvisionMultiplier, payrollNameKey } from '@/features/dashboard/importHelpers/personnelSalaryImport';
import { parseHourInputToDecimal } from '@/lib/utils';
import type { CustomEvent, MonthData, MonthDataSalariesConfig, PersonnelDepartment, SchoolHolidayCalendar, ShiftGuardRule, ShiftPlanningSettings, ShiftStaffMember, ShiftStaffingRule } from '@/types/dataTypes';

import { ELEARNING_ROLE_ID, type DayBudget } from './shiftCalculations';
import { monthsOfDates } from './shiftDates';

// Lecture seule des données existantes : aucune écriture dans allData.

type AllData = Record<number, Record<number, MonthData>>;

export type StaffCandidate = {
  key: string;
  nom: string;
  hourlyRate: number;
  forfaitJour: boolean;
  category: string; // clé de config.categories (cadre, maitrise, niv12, niv3, apprenti)
  department?: PersonnelDepartment;
};

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
  Object.entries(found.config.categories).forEach(([category, rows]) => {
    rows.forEach(row => {
      const nom = row.nom.trim();
      if (!nom) return;
      const key = payrollNameKey(nom);
      if (leavers.has(key) || byKey.has(key)) return;
      // SalarieRow.coutHoraire est toujours vide : taux chargé = coût global × provision ÷ heures (comme Config Salaires),
      // à défaut (heures à 0) moyenne de la catégorie.
      const heures = parseHourInputToDecimal(row.heures);
      const ownRate = heures > 0 ? (parseMoneyValue(row.coutGlobal) * getPayrollProvisionMultiplier(category)) / heures : 0;
      const hourlyRate = ownRate > 0 ? ownRate : averagePayrollRate(rows, undefined, category);
      byKey.set(key, { key, nom, hourlyRate, forfaitJour: forfaitKeys.has(key), category, department: row.department });
    });
  });

  return { candidates: [...byKey.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')), year: found.year, month: found.month };
}

// Rôle proposé à un collaborateur sans fiche : catégorie cadre/maîtrise → encadrement, sinon service cuisine/salle.
// Un identifiant absent des rôles configurés ne donne aucun rôle.
const proposedRoles = (candidate: StaffCandidate, roleIds: string[]): string[] => {
  const wanted = candidate.category === 'cadre' || candidate.category === 'maitrise'
    ? 'encadrement'
    : candidate.department ?? '';
  return roleIds.includes(wanted) ? [wanted] : [];
};

// Fiche collaborateur : valeurs enregistrées (jamais modifiées), sinon défauts (35 h, rôle proposé, aucun repos préféré).
export const buildStaffMembers = (candidates: StaffCandidate[], stored: ShiftStaffMember[], roleIds: string[]): ShiftStaffMember[] => {
  const storedByKey = new Map(stored.map(member => [member.key, member]));
  return candidates.map(candidate => {
    const saved = storedByKey.get(candidate.key);
    return saved
      ? { ...saved, nom: candidate.nom, apprenti: candidate.category === 'apprenti' }
      : { key: candidate.key, nom: candidate.nom, roles: proposedRoles(candidate, roleIds), contractHours: 35, forfaitJour: candidate.forfaitJour, preferredRestDays: [], apprenti: candidate.category === 'apprenti' };
  });
};

const CATEGORY_LABELS: Record<string, string> = { cadre: 'Cadre', maitrise: 'Maîtrise', niv12: 'Niveau 1-2', niv3: 'Niveau 3', apprenti: 'Apprenti' };
const DEPARTMENT_LABELS: Record<PersonnelDepartment, string> = { cuisine: 'Cuisine', salle: 'Salle' };

// Source affichée en gris dans les paramètres : « catégorie · service » de Config Salaires.
export const staffSourceLabel = (candidate: StaffCandidate): string =>
  [CATEGORY_LABELS[candidate.category] ?? candidate.category, candidate.department ? DEPARTMENT_LABELS[candidate.department] : null]
    .filter(Boolean)
    .join(' · ');

export type DayContext = { holiday: string | null; vacation: boolean; events: string[] };

// Contexte de chaque jour : férié, vacances scolaires (hors férié, prioritaire) et événements personnalisés.
export function buildWeekDayContext(
  weekDates: string[],
  calendar: SchoolHolidayCalendar,
  customEvents: CustomEvent[],
): Record<string, DayContext> {
  return Object.fromEntries(weekDates.map(date => {
    const status = vacationStatusOf(date, calendar);
    return [date, {
      holiday: isPublicHoliday(date, Number(date.slice(0, 4))),
      vacation: status === 'vacances' || status === 'ete',
      events: customEvents.filter(event => event.date.slice(0, 10) === date).map(event => event.label),
    }];
  }));
}

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

// Anciennes règles d'effectif (minimum / maximum) : on ne garde que le rôle et les couverts par personne ;
// l'ancienne règle encadrement est ignorée, un rôle n'apparaît qu'une fois.
const migrateGuardRules = (raw: unknown, fallback: ShiftStaffingRule[]): ShiftStaffingRule[] => {
  const legacy = isRecord(raw) && Array.isArray(raw.guardRules) ? raw.guardRules as ShiftGuardRule[] : null;
  if (!legacy) return fallback;
  const migrated: ShiftStaffingRule[] = [];
  legacy.forEach(rule => {
    if (rule.roleId === 'encadrement' || !rule.coversPerPerson || rule.coversPerPerson <= 0) return;
    if (!migrated.some(existing => existing.roleId === rule.roleId)) migrated.push({ roleId: rule.roleId, coversPerPerson: rule.coversPerPerson });
  });
  return migrated.length > 0 ? migrated : fallback;
};

// Fusionne un document enregistré avec les défauts : les anciens documents (sans les champs de l'étape 2)
// restent valides, les règles légales et le rôle technique e-learning manquants sont ajoutés.
export const normalizeSettings = (raw: unknown, defaults: ShiftPlanningSettings): ShiftPlanningSettings => {
  if (!isRecord(raw)) return defaults;
  const value = raw as Partial<ShiftPlanningSettings>;
  const storedLegal = Array.isArray(value.legalRules) ? value.legalRules : [];
  const storedRoles = Array.isArray(value.roles) && value.roles.length > 0 ? value.roles : defaults.roles;
  return {
    minProductivity: typeof value.minProductivity === 'number' ? value.minProductivity : defaults.minProductivity,
    targetPayrollPct: typeof value.targetPayrollPct === 'number' ? value.targetPayrollPct : defaults.targetPayrollPct,
    avoidOvertime: typeof value.avoidOvertime === 'boolean' ? value.avoidOvertime : defaults.avoidOvertime,
    autoRegenerate: typeof value.autoRegenerate === 'boolean' ? value.autoRegenerate : defaults.autoRegenerate,
    staffingRules: Array.isArray(value.staffingRules) ? value.staffingRules : migrateGuardRules(raw, defaults.staffingRules),
    managerCountsInSalle: typeof value.managerCountsInSalle === 'boolean' ? value.managerCountsInSalle : defaults.managerCountsInSalle,
    midiReferenceTime: typeof value.midiReferenceTime === 'string' ? value.midiReferenceTime : defaults.midiReferenceTime,
    soirReferenceTime: typeof value.soirReferenceTime === 'string' ? value.soirReferenceTime : defaults.soirReferenceTime,
    legalRules: [...storedLegal, ...defaults.legalRules.filter(rule => !storedLegal.some(stored => stored.id === rule.id))],
    roles: [...storedRoles, ...defaults.roles.filter(role => role.id === ELEARNING_ROLE_ID && !storedRoles.some(stored => stored.id === role.id))],
    serviceWindows: Array.isArray(value.serviceWindows) ? value.serviceWindows : defaults.serviceWindows,
    slotRules: Array.isArray(value.slotRules) ? value.slotRules : defaults.slotRules,
    payPeriods: Array.isArray(value.payPeriods) ? value.payPeriods : defaults.payPeriods,
    managerOpenToClose: typeof value.managerOpenToClose === 'boolean' ? value.managerOpenToClose : defaults.managerOpenToClose,
    elearningHours: typeof value.elearningHours === 'number' ? value.elearningHours : defaults.elearningHours,
    elearningInProductivity: typeof value.elearningInProductivity === 'boolean' ? value.elearningInProductivity : defaults.elearningInProductivity,
    templates: Array.isArray(value.templates)
      ? value.templates.map((template, index) => ({ ...template, order: typeof template.order === 'number' ? template.order : index + 1 }))
      : defaults.templates,
  };
};

export const readArray = <T>(raw: unknown, field: string): T[] => {
  if (!isRecord(raw)) return [];
  const list = raw[field];
  return Array.isArray(list) ? list as T[] : [];
};

