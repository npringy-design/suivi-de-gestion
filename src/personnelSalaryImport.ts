import type { PersonnelInfo, SalarieRow } from '@/contexts/DataContext';
import { parseHourInputToDecimal } from '@/utils';

export const PERSONNEL_CATEGORIES = ['cadre', 'maitrise', 'niv12', 'niv3', 'apprenti'] as const;

const FORFAIT_JOUR_HOURS = 151.67;

type PersonnelCategory = (typeof PERSONNEL_CATEGORIES)[number];
type SalariesCategories = Record<PersonnelCategory, SalarieRow[]>;

export type PayrollMatch = {
  personnel: PersonnelInfo;
  heures: number;
  coutGlobal: number;
  coutHoraire: number;
  sourceLine: string;
};

export type PayrollImportResult = {
  categories: SalariesCategories;
  matches: PayrollMatch[];
  unmatched: PersonnelInfo[];
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
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();

const compactPersonnelText = (value: string) => normalizePersonnelText(value).replace(/\s+/g, '');

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
  Array.from(text.matchAll(/[-+]?(?:\d{1,3}(?:[\s\u00a0]\d{3})+|\d+)(?:[,.]\d{1,2})?/g))
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
  const line = sourceLine.replace(/\u00a0/g, ' ');
  const monthMatches = Array.from(line.matchAll(/\b(?:0[1-9]|1[0-2])\/20\d{2}\b/g));
  const payrollMonth = monthMatches.at(-1);
  if (!payrollMonth || payrollMonth.index === undefined) return null;

  const afterMonth = line.slice(payrollMonth.index + payrollMonth[0].length);
  const values = numberMatches(afterMonth).map(item => item.value);
  if (values.length < 2) return null;

  // Dans le tableau PDF, les 6 dernières valeurs sont :
  // Brut, Charges patronales, % charges patronales, Supp. coût global, Coût global, Taux h. moyen.
  const coutGlobal = values[values.length - 2] || 0;
  const heures = isForfaitJourLine(line)
    ? FORFAIT_JOUR_HOURS
    : values.slice(0, Math.max(0, values.length - 6)).at(-1) || 0;

  return heures > 0 && coutGlobal > 0 ? { hours: heures, cost: coutGlobal } : null;
};

const extractPayrollValues = (sourceLine: string, context: string) => {
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

const findPersonnelLine = (text: string, personnel: PersonnelInfo) => {
  const lines = text
    .replace(/\u00a0/g, ' ')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

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
  const categories = createEmptyPayrollCategories();
  const collected: Record<PersonnelCategory, SalarieRow[]> = {
    cadre: [],
    maitrise: [],
    niv12: [],
    niv3: [],
    apprenti: [],
  };
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

    const coutHoraire = (cost * 1.1) / hours;
    matches.push({ personnel, heures: hours, coutGlobal: cost, coutHoraire, sourceLine });
    collected[personnel.category].push({
      nom: personnel.nom,
      heures: formatPayrollNumber(hours),
      coutGlobal: formatPayrollNumber(cost),
      provision: '',
      coutHoraire: '',
      department: personnel.department,
      importSourceLine: sourceLine,
    });
  });

  PERSONNEL_CATEGORIES.forEach(category => {
    categories[category] = collected[category].length > 0 ? collected[category] : categories[category];
  });

  return { categories, matches, unmatched };
};

export const averagePayrollRate = (rows: SalarieRow[], department?: 'cuisine' | 'salle') => {
  const rates = rows
    .filter(row => !department || !row.department || row.department === department)
    .map(row => {
      const heures = parseHourInputToDecimal(row.heures);
      const coutGlobal = parsePayrollNumber(row.coutGlobal);
      return heures > 0 && coutGlobal > 0 ? (coutGlobal * 1.1) / heures : 0;
    })
    .filter(rate => rate > 0);

  return rates.length > 0 ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length : 0;
};
