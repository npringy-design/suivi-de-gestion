import type { PersonnelInfo, SalarieRow } from '@/contexts/DataContext';
import type { PayrollCandidateLine } from '@/types/dataTypes';
import { parseHourInputToDecimal } from '@/lib/utils';

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

export type PayrollMatch = {
  personnel: PersonnelInfo;
  heures: number;
  coutGlobal: number;
  coutHoraire: number;
  sourceLine: string;
};

export type PayrollTargetPeriod = {
  sourceMonth: number;
  sourceYear: number;
  targetMonth: number;
  targetYear: number;
  sourceLabel: string;
  targetLabel: string;
};

export type PayrollImportResult = {
  categories: SalariesCategories;
  matches: PayrollMatch[];
  unmatched: PersonnelInfo[];
  // Lignes candidates du PDF qui ne sont la sourceLine d'aucun match
  orphanLines: PayrollCandidateLine[];
};

export type PayrollCategoryInput = {
  personnel: PersonnelInfo;
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

const compactPersonnelText = (value: string) => normalizePersonnelText(value).replace(/\s+/g, '');

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

const splitAliases = (value: string) =>
  value
    .split(/[;,\n]/)
    .map(item => item.trim())
    .filter(Boolean);

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

const extractNumberNearLabels = (text: string, labels: string[]) => {
  const normalizedText = normalizePersonnelText(text);
  const matches = numberMatches(text);

  for (const label of labels) {
    const labelIndex = normalizedText.indexOf(normalizePersonnelText(label));
    if (labelIndex < 0) continue;

    const afterLabel = matches.find(item => item.index >= labelIndex);
    if (afterLabel) return afterLabel.value;
  }

  return 0;
};

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

export const extractPayrollValues = (sourceLine: string, context: string) => {
  const tableValues = extractPayrollTableValues(sourceLine);
  if (tableValues) return tableValues;

  const text = `${sourceLine} ${context}`;
  const labeledHours = extractNumberNearLabels(text, ['total heures', 'heures payees', 'heures mensuelles', 'heures', 'hrs']);
  const labeledCost = extractNumberNearLabels(text, ['cout global', 'cout total charge', 'cout total', 'salaire charge', 'total charge']);
  const numbers = numberMatches(sourceLine);
  const hours = labeledHours || numbers.find(item => item.value > 0 && item.value <= 260)?.value || 0;
  const cost = labeledCost || [...numbers].reverse().find(item => item.value >= 100)?.value || 0;

  return { hours, cost };
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

// Nom porté par une ligne du PDF : texte avant le premier nombre ou la première date
export const extractPayrollLineName = (line: string) => {
  const beforeFirstDigit = (line.match(/^[^\d]*/)?.[0] || '')
    .replace(/[\s\-–:;,.|/]+$/, '')
    .trim();
  return /[A-Za-zÀ-ÿ].*[A-Za-zÀ-ÿ]/.test(beforeFirstDigit) ? beforeFirstDigit : '';
};

// Ajoute un alias à la liste existante, sans doublon (comparaison normalisée), séparateur « ; »
export const mergePersonnelAlias = (personnel: PersonnelInfo, alias: string) => {
  const normalizedAlias = normalizePersonnelText(alias);
  if (!normalizedAlias) return personnel.aliases;

  const known = [personnel.nom, ...splitAliases(personnel.aliases)].map(normalizePersonnelText);
  if (known.includes(normalizedAlias)) return personnel.aliases;

  const current = personnel.aliases.trim();
  return current ? `${current}; ${alias.trim()}` : alias.trim();
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

const findPersonnelLine = (text: string, personnel: PersonnelInfo) => {
  const lines = splitPayrollLines(text);

  const names = [personnel.nom, ...splitAliases(personnel.aliases)];
  for (const name of names) {
    const compactName = compactPersonnelText(name);
    if (!compactName) continue;

    const exactLine = lines.find(line => compactPersonnelText(line).includes(compactName));
    if (exactLine) return exactLine;

    const tokens = normalizePersonnelText(name).split(/\s+/).filter(token => token.length >= 2);
    const tokenLine = lines.find(line => {
      const normalizedLine = normalizePersonnelText(line);
      return tokens.length > 0 && tokens.every(token => normalizedLine.includes(token));
    });
    if (tokenLine) return tokenLine;
  }

  return '';
};

export const buildPayrollImportFromText = (text: string, personnelInfos: PersonnelInfo[]): PayrollImportResult => {
  const matches: PayrollMatch[] = [];
  const unmatched: PersonnelInfo[] = [];

  personnelInfos.forEach(personnel => {
    const sourceLine = findPersonnelLine(text, personnel);
    if (!sourceLine) {
      unmatched.push(personnel);
      return;
    }

    const lineIndex = text.indexOf(sourceLine);
    const context = lineIndex >= 0 ? text.slice(Math.max(0, lineIndex - 160), lineIndex + sourceLine.length + 220) : sourceLine;
    const { hours, cost } = extractPayrollValues(sourceLine, context);
    if (hours <= 0 || cost <= 0) {
      unmatched.push(personnel);
      return;
    }

    const coutHoraire = (cost * getPayrollProvisionMultiplier(personnel.category)) / hours;
    matches.push({ personnel, heures: hours, coutGlobal: cost, coutHoraire, sourceLine });
  });

  const categories = buildPayrollCategories(matches);
  const matchedLines = new Set(matches.map(match => match.sourceLine));
  const orphanLines = extractPayrollCandidateLines(text).filter(candidate => !matchedLines.has(candidate.line));

  return { categories, matches, unmatched, orphanLines };
};

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
