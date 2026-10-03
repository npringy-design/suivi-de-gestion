import type { SalarieRow } from '@/contexts/DataContext';
import type { PayrollCandidateLine, PayrollPageTotals, PayrollPerson, SalaryImportPreviewRow } from '@/types/dataTypes';
import { parseHourInputToDecimal } from '@/lib/utils';

import { inferPersonnelFromJob } from './payrollJobCategories';
import type { PayrollCategoryReference } from './payrollCategoryReference';

export const PERSONNEL_CATEGORIES = ['cadre', 'maitrise', 'niv12', 'niv3', 'apprenti'] as const;

const FORFAIT_JOUR_HOURS = 151.67;
const PAYROLL_MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
] as const;

type PersonnelCategory = (typeof PERSONNEL_CATEGORIES)[number];
type SalariesCategories = Record<PersonnelCategory, SalarieRow[]>;

export const getPayrollProvisionMultiplier = (category?: PersonnelCategory | string) =>
  category === 'cadre' ? 1.18 : 1.10;

export type PayrollTargetPeriod = {
  sourceMonth: number;
  sourceYear: number;
  targetMonth: number;
  targetYear: number;
  sourceLabel: string;
  targetLabel: string;
};

export type PayrollCategoryInput = {
  personnel: PayrollPerson;
  heures: number;
  coutGlobal: number;
};

export const createEmptyPayrollCategories = (): SalariesCategories => ({
  cadre: [{ nom: '', heures: '', coutGlobal: '', provision: '', coutHoraire: '' }],
  maitrise: [{ nom: '', heures: '', coutGlobal: '', provision: '', coutHoraire: '' }],
  niv12: [{ nom: '', heures: '', coutGlobal: '', provision: '', coutHoraire: '' }],
  niv3: [{ nom: '', heures: '', coutGlobal: '', provision: '', coutHoraire: '' }],
  apprenti: [{ nom: '', heures: '', coutGlobal: '', provision: '', coutHoraire: '' }],
});

export const normalizePersonnelText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();

// Clé de comparaison d'un nom : mots normalisés et triés, donc insensible à la casse, aux accents et à l'ordre prénom/nom.
export const payrollNameKey = (name: string) => normalizePersonnelText(name).split(' ').filter(Boolean).sort().join(' ');

const formatPayrollMonthLabel = (month: number, year: number) => `${PAYROLL_MONTHS[month]} ${year}`;

export const getPayrollTargetPeriodFromText = (text: string): PayrollTargetPeriod | null => {
  const normalizedText = normalizePersonnelText(text);
  let sourceMonth = -1;
  let sourceYear = 0;

  for (const [index, monthName] of PAYROLL_MONTHS.entries()) {
    const normalizedMonth = normalizePersonnelText(monthName);
    const titleMatch = normalizedText.match(new RegExp(`COUTS? SALARIAUX ${normalizedMonth} (20\\d{2})`))
      || normalizedText.match(new RegExp(`${normalizedMonth} (20\\d{2})`));
    if (titleMatch?.[1]) {
      sourceMonth = index;
      sourceYear = Number(titleMatch[1]);
      break;
    }
  }

  if (sourceMonth < 0 || sourceYear <= 0) {
    const counts = new Map<string, { month: number; year: number; count: number }>();
    Array.from(text.matchAll(/\b(0[1-9]|1[0-2])\/(20\d{2})\b/g)).forEach(match => {
      const month = Number(match[1]) - 1;
      const year = Number(match[2]);
      const key = `${month}-${year}`;
      const current = counts.get(key) || { month, year, count: 0 };
      counts.set(key, { ...current, count: current.count + 1 });
    });
    const best = [...counts.values()].sort((a, b) => b.count - a.count)[0];
    if (best) {
      sourceMonth = best.month;
      sourceYear = best.year;
    }
  }

  if (sourceMonth < 0 || sourceYear <= 0) return null;

  const targetMonth = sourceMonth === 11 ? 0 : sourceMonth + 1;
  const targetYear = sourceMonth === 11 ? sourceYear + 1 : sourceYear;

  return {
    sourceMonth,
    sourceYear,
    targetMonth,
    targetYear,
    sourceLabel: formatPayrollMonthLabel(sourceMonth, sourceYear),
    targetLabel: formatPayrollMonthLabel(targetMonth, targetYear),
  };
};

const parsePayrollNumber = (value: string) => {
  const normalized = value.replace(/\s/g, '').replace(/[€]/g, '').replace(',', '.');
  return parseFloat(normalized) || 0;
};

const formatPayrollNumber = (value: number) => String(Math.round(value * 100) / 100).replace('.', ',');

const numberMatches = (text: string) =>
  Array.from(text.matchAll(/[-+]?(?:\d{1,3}(?:[\s ]\d{3})+|\d+)(?:[,.]\d{1,2})?/g))
    .map(match => ({
      raw: match[0],
      value: parsePayrollNumber(match[0]),
      index: match.index || 0,
    }))
    .filter(item => item.value !== 0);

const isForfaitJourLine = (line: string) => normalizePersonnelText(line).includes('FORFAIT JOUR');

const extractPayrollTableValues = (sourceLine: string) => {
  const line = sourceLine.replace(/ /g, ' ');
  const monthMatches = Array.from(line.matchAll(/\b(?:0[1-9]|1[0-2])\/20\d{2}\b/g));
  const payrollMonth = monthMatches.at(-1);
  if (!payrollMonth || payrollMonth.index === undefined) return null;

  const afterMonth = line.slice(payrollMonth.index + payrollMonth[0].length);
  const values = numberMatches(afterMonth).map(item => item.value);
  if (values.length < 2) return null;

  const coutGlobal = values[values.length - 2] || 0;
  const heures = isForfaitJourLine(line)
    ? FORFAIT_JOUR_HOURS
    : values.slice(0, Math.max(0, values.length - 6)).at(-1) || 0;

  return heures > 0 && coutGlobal > 0 ? { hours: heures, cost: coutGlobal } : null;
};

const splitPayrollLines = (text: string) =>
  text
    .replace(/ /g, ' ')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

export const extractPayrollCandidateLines = (text: string): PayrollCandidateLine[] => {
  const seen = new Set<string>();
  const candidates: PayrollCandidateLine[] = [];

  splitPayrollLines(text).forEach(line => {
    if (seen.has(line)) return;
    const tableValues = extractPayrollTableValues(line);
    if (!tableValues) return;
    seen.add(line);
    candidates.push({ line, heures: tableValues.hours, coutGlobal: tableValues.cost });
  });

  return candidates;
};

export type ParsedPayrollLine = {
  identity: string; // nom lu dans le PDF, sans matricule ni « (forfait jour) »
  entryDate?: string; // dd/mm/yyyy
  exitDate?: string; // dd/mm/yyyy : présente seulement pour un sortant
  jobTitle: string;
};

const PAYROLL_FULL_DATE = /\b\d{2}\/\d{2}\/\d{4}\b/g;
// Période MM/AAAA, hors jour/mois d'une date complète (le « 08/2026 » de « 07/08/2026 » n'en est pas une).
const PAYROLL_PERIOD = /(?<![\d/])(?:0[1-9]|1[0-2])\/20\d{2}\b/g;

// Ligne du PDF : matricule, nom, Entrée, [Sortie], emploi, période MM/AAAA, puis les valeurs de paie.
// Ex. « 00100 BOUMEDIENE MEROUANE 07/08/2026 22/09/2026 Apprenti serveur 09/2026 ... »
export const parsePayrollLine = (sourceLine: string): ParsedPayrollLine => {
  const line = sourceLine.replace(/\u00a0/g, ' ');
  const periodMatch = Array.from(line.matchAll(PAYROLL_PERIOD)).at(-1);
  const head = periodMatch?.index !== undefined ? line.slice(0, periodMatch.index) : line;
  const dates = Array.from(head.matchAll(PAYROLL_FULL_DATE));
  const identityEnd = dates[0]?.index ?? head.length;
  const identity = head
    .slice(0, identityEnd)
    .replace(/^\s*\d{3,}\s+/, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const lastDate = dates.at(-1);
  const jobTitle = lastDate?.index !== undefined
    ? head.slice(lastDate.index + lastDate[0].length).replace(/\s+/g, ' ').trim()
    : '';

  return { identity, entryDate: dates[0]?.[0], exitDate: dates[1]?.[0], jobTitle };
};

export const buildPayrollCategories = (rows: PayrollCategoryInput[]): SalariesCategories => {
  const categories = createEmptyPayrollCategories();
  const collected: Record<PersonnelCategory, SalarieRow[]> = {
    cadre: [],
    maitrise: [],
    niv12: [],
    niv3: [],
    apprenti: [],
  };

  rows.forEach(({ personnel, heures, coutGlobal }) => {
    collected[personnel.category].push({
      nom: personnel.nom,
      heures: formatPayrollNumber(heures),
      coutGlobal: formatPayrollNumber(coutGlobal),
      provision: '',
      coutHoraire: '',
      department: personnel.department,
    });
  });

  PERSONNEL_CATEGORIES.forEach(category => {
    categories[category] = collected[category].length > 0 ? collected[category] : categories[category];
  });

  return categories;
};

// Ligne « Total général » (sans tiret derrière : les « Total général - ... » sont des sous-totaux) :
// Brut, Charges patronales, % charges, Supp. coût, Coût global. Un « - » isolé n'est pas capturé comme
// nombre, on lit donc la 1re, la 2e et la dernière valeur. Les heures viennent de la 3e valeur de
// « Total général - périodes avec heures ». On garde la dernière occurrence (bas de la dernière page).
const PAGE_TOTAL_LINE = /^\s*total\s+g[eé]n[eé]ral(?!\s*[-–—])/i;
const HOURS_TOTAL_LINE = /^\s*total\s+g[eé]n[eé]ral\s*[-–—]\s*p[eé]riodes\s+avec\s+heures/i;

const valuesAfterLabel = (line: string, label: RegExp): number[] | null => {
  const match = line.match(label);
  return match ? numberMatches(line.slice(match[0].length)).map(item => item.value) : null;
};

export const extractPayrollPageTotals = (text: string): PayrollPageTotals | null => {
  let totalValues: number[] = [];
  let hoursValues: number[] = [];

  for (const line of text.split(/\r?\n/)) {
    const hours = valuesAfterLabel(line, HOURS_TOTAL_LINE);
    if (hours) {
      hoursValues = hours;
      continue;
    }
    const total = valuesAfterLabel(line, PAGE_TOTAL_LINE);
    if (total && total.length >= 3) totalValues = total;
  }

  if (totalValues.length < 3) return null;

  return {
    brut: totalValues[0],
    chargesPatronales: totalValues[1],
    coutGlobal: totalValues[totalValues.length - 1],
    ...(hoursValues.length >= 3 ? { heures: hoursValues[2] } : {}),
  };
};

// Ligne du PDF : nom, catégorie et service proposés, base de l'aperçu d'import.
// Catégorie et service viennent du dernier import où ce nom figure (recognized), sinon de l'emploi du PDF.
export type PayrollPdfRow = {
  personnel: PayrollPerson;
  recognized: boolean;
  heures: number;
  coutGlobal: number;
  sourceLine: string;
  jobTitle: string;
  exitDate?: string;
};

const formatPayrollPersonName = (identity: string) =>
  identity.toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (_match, separator: string, letter: string) => `${separator}${letter.toUpperCase()}`);

// Parcourt les lignes du PDF : aucune liste de personnel à maintenir. Plusieurs lignes d'une même personne
// (changement de contrat en cours de mois) sont cumulées.
export const buildPayrollRowsFromText = (text: string, reference: PayrollCategoryReference): PayrollPdfRow[] => {
  const rows: PayrollPdfRow[] = [];
  const rowByName = new Map<string, PayrollPdfRow>();

  extractPayrollCandidateLines(text).forEach(candidate => {
    const parsed = parsePayrollLine(candidate.line);
    const nameKey = payrollNameKey(parsed.identity);
    if (!nameKey) return;

    const existing = rowByName.get(nameKey);
    if (existing) {
      existing.heures += candidate.heures;
      existing.coutGlobal += candidate.coutGlobal;
      existing.exitDate = existing.exitDate ?? parsed.exitDate;
      return;
    }

    const known = reference.get(nameKey);
    const inferred = inferPersonnelFromJob(parsed.jobTitle);
    const row: PayrollPdfRow = {
      personnel: {
        id: `ligne-${rows.length + 1}`,
        nom: formatPayrollPersonName(parsed.identity),
        category: known?.category ?? inferred.category,
        department: known?.department ?? inferred.department,
      },
      recognized: known !== undefined,
      heures: candidate.heures,
      coutGlobal: candidate.coutGlobal,
      sourceLine: candidate.line,
      jobTitle: parsed.jobTitle,
      exitDate: parsed.exitDate,
    };
    rows.push(row);
    rowByName.set(nameKey, row);
  });

  return rows;
};

// Lignes de l'aperçu : un sortant (date de sortie présente) passe par défaut en « ignoré » — son coût est gonflé
// par le solde de tout compte —, réintégrable d'un clic. Il reste compté dans les totaux de bas de page.
export const buildSalaryPreviewRows = (rows: PayrollPdfRow[]): SalaryImportPreviewRow[] =>
  rows.map(row => {
    const origin = row.recognized ? 'recognized' : 'new';
    return {
      personnel: row.personnel,
      status: row.exitDate ? 'ignored' : origin,
      origin,
      statusBeforeIgnore: row.exitDate ? origin : undefined,
      heures: row.heures,
      coutGlobal: row.coutGlobal,
      sourceLine: row.sourceLine,
      jobTitle: row.jobTitle,
      exitDate: row.exitDate,
    };
  });

export const averagePayrollRate = (rows: SalarieRow[], department?: 'cuisine' | 'salle', category?: PersonnelCategory | string) => {
  const rates = rows
    .filter(row => !department || !row.department || row.department === department)
    .map(row => {
      const heures = parseHourInputToDecimal(row.heures);
      const coutGlobal = parsePayrollNumber(row.coutGlobal);
      return heures > 0 && coutGlobal > 0 ? (coutGlobal * getPayrollProvisionMultiplier(category)) / heures : 0;
    })
    .filter(rate => rate > 0);

  return rates.length > 0 ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length : 0;
};
