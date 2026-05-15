import type { SalarieRow } from '@/contexts/DataContext';
import { parseHourInputToDecimal } from '@/utils';

export const SALARY_CATEGORIES = ['cadre', 'maitrise', 'niv12', 'niv3', 'apprenti'] as const;

export type SalaryCategory = (typeof SALARY_CATEGORIES)[number];
export type SalariesCategories = Record<SalaryCategory, SalarieRow[]>;

export type SalaryImportResult = {
  categories: SalariesCategories;
  importedCount: number;
  skippedRows: number;
  warnings: string[];
};

const emptySalarieRow = (): SalarieRow => ({ nom: '', heures: '', coutGlobal: '', provision: '', coutHoraire: '' });

export const createEmptySalaryCategories = (): SalariesCategories => ({
  cadre: [emptySalarieRow()],
  maitrise: [emptySalarieRow()],
  niv12: [emptySalarieRow()],
  niv3: [emptySalarieRow()],
  apprenti: [emptySalarieRow()],
});

const normalizeText = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const parseImportedNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  const normalized = String(value ?? '')
    .replace(/\s/g, '')
    .replace(/[€%]/g, '')
    .replace(',', '.');

  return parseFloat(normalized) || 0;
};

const formatImportedNumber = (value: number) =>
  value > 0 ? String(Math.round(value * 100) / 100).replace('.', ',') : '';

export const mapSalaryCategory = (value: unknown): SalaryCategory | null => {
  const normalized = normalizeText(value);

  if (!normalized) return null;
  if (normalized.includes('apprenti')) return 'apprenti';
  if (normalized.includes('maitrise') || normalized.includes('agentdemaitrise')) return 'maitrise';
  if (normalized.includes('niv3') || normalized.includes('niviii') || normalized.includes('niveau3')) return 'niv3';
  if (normalized.includes('niv12') || normalized.includes('niv1et2') || normalized.includes('nivi') || normalized.includes('niveau1') || normalized.includes('niveau2')) return 'niv12';
  if (normalized.includes('cadre')) return 'cadre';

  return null;
};

const HEADER_ALIASES = {
  nom: ['nom', 'nomsalarie', 'salarie', 'collaborateur', 'employe', 'prenomnom'],
  statut: ['statut', 'categorie', 'categoriepersonnel', 'poste', 'niveau', 'classification'],
  heures: ['heures', 'heuresmensuelles', 'heuremensuelle', 'nombreheuremensuel', 'nombreheuresmensuelles', 'heurespayees'],
  coutGlobal: ['coutglobal', 'couttotalcharge', 'couttotalcharges', 'coutmensuel', 'coutglobalmensuel', 'salairecharge'],
  coutHoraire: ['cout horaire', 'couthoraire', 'tauxhoraire', 'coutheure', 'coutdelheure'],
} as const;

const getCellValue = (row: Record<string, unknown>, aliases: readonly string[]) => {
  const entries = Object.entries(row);
  const normalizedAliases = aliases.map(normalizeText);
  const match = entries.find(([key]) => normalizedAliases.includes(normalizeText(key)));
  return match?.[1];
};

export const parseSalaryImportRows = (rows: Record<string, unknown>[]): SalaryImportResult => {
  const categories = createEmptySalaryCategories();
  const collected: Record<SalaryCategory, SalarieRow[]> = {
    cadre: [],
    maitrise: [],
    niv12: [],
    niv3: [],
    apprenti: [],
  };
  const warnings: string[] = [];
  let importedCount = 0;
  let skippedRows = 0;

  rows.forEach((row, index) => {
    const nom = String(getCellValue(row, HEADER_ALIASES.nom) ?? '').trim();
    const statutValue = getCellValue(row, HEADER_ALIASES.statut);
    const category = mapSalaryCategory(statutValue);

    if (!nom && !statutValue) return;

    if (!nom || !category) {
      skippedRows += 1;
      warnings.push(`Ligne ${index + 2} ignoree : nom ou statut non reconnu.`);
      return;
    }

    const heuresValue = getCellValue(row, HEADER_ALIASES.heures);
    const coutGlobalValue = getCellValue(row, HEADER_ALIASES.coutGlobal);
    const coutHoraireValue = getCellValue(row, HEADER_ALIASES.coutHoraire);
    const heures = String(heuresValue ?? '').trim();

    const heuresDecimal = parseHourInputToDecimal(heures);
    const coutGlobalNumber = parseImportedNumber(coutGlobalValue);
    const coutHoraireNumber = parseImportedNumber(coutHoraireValue);
    const coutGlobal = coutGlobalNumber > 0
      ? formatImportedNumber(coutGlobalNumber)
      : heuresDecimal > 0 && coutHoraireNumber > 0
        ? formatImportedNumber((coutHoraireNumber * heuresDecimal) / 1.1)
        : '';

    collected[category].push({
      nom,
      heures,
      coutGlobal,
      provision: '',
      coutHoraire: '',
    });
    importedCount += 1;
  });

  SALARY_CATEGORIES.forEach(category => {
    categories[category] = collected[category].length > 0 ? collected[category] : [emptySalarieRow()];
  });

  return { categories, importedCount, skippedRows, warnings };
};
