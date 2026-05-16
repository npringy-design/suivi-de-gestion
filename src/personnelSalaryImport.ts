import type { PersonnelInfo, SalarieRow } from '@/contexts/DataContext';
import { parseHourInputToDecimal } from '@/utils';

export const PERSONNEL_CATEGORIES = ['cadre', 'maitrise', 'niv12', 'niv3', 'apprenti'] as const;

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
  Array.from(text.matchAll(/\d[\d\s]*(?:[,.]\d{1,2})?/g))
    .map(match => ({
      raw: match[0],
      value: parsePayrollNumber(match[0]),
      index: match.index || 0,
    }))
    .filter(item => item.value > 0);

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

const extractPayrollValues = (sourceLine: string, context: string) => {
  const text = `${sourceLine} ${context}`;
  const labeledHours = extractNumberNearLabels(text, ['heures payees', 'heures mensuelles', 'heures', 'hrs']);
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
