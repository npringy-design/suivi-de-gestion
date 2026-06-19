import type { Worksheet } from 'exceljs';

import {
  getHistoricalBudgetCell,
  parseHistoricalBudgetCellNumber,
  parseHistoricalBudgetCellDate,
  isHistoricalBudgetTotalRow,
  sumHistoricalCostMatterValues,
  parseHistoricalBudgetDate,
  type HistoricalDemarqueRow,
  type HistoricalFgEntry,
  type HistoricalContratEntry,
} from './historicalBudgetImport';
import {
  getHistoricalPayrollColumnMaps,
  getBestHistoricalPayrollValues,
  sumHistoricalPayrollValues,
  type HistoricalPayrollColumnMap,
} from './payrollImport';

// ─── Constantes colonnes source V25 (0-based, confirmées sur fichier réel) ───
// Budget
export const V25_COUVERTS_MIDI_COL = 8;
export const V25_TM_MIDI_COL = 9;
export const V25_COUVERTS_SOIR_COL = 10;
export const V25_TM_SOIR_COL = 11;

// CA réalisé
export const V25_CA_VAE_COL = 20;
export const V25_CA_MIDI_COL = 23;
export const V25_CA_SOIR_COL = 27;
export const V25_CA_LIMO_COL = 29;
export const V25_CVTS_MIDI_COL = 42;
export const V25_CVTS_SOIR_COL = 44;

// Coût matière : mapping fixe source col → app col (cols 71+72 s'additionnent vers 50)
export const V25_COST_MATTER_MAP: Record<number, number> = {
  67: 45, 68: 46, 69: 47, 70: 49,
  71: 50, 72: 50, 73: 51, 74: 52,
  75: 53, 78: 56, 79: 57,
};

// Démarques — colonnes déjà correctes
export const V25_DEMARQUE_PERS_COL = 60;
export const V25_DEMARQUE_OP_COL = 62;
export const V25_DEMARQUE_EXPL_COL = 66;

// ─── Type ─────────────────────────────────────────────────────────────────────

export type HistoricalV25RowValues = {
  couvertsMidi: number;
  tmMidi: number;
  couvertsSoir: number;
  tmSoir: number;
  realiseVae: number;
  realiseMidi: number;
  realiseSoir: number;
  realiseLimo: number;
  realiseCouvertsMidi: number;
  realiseCouvertsSoir: number;
  costMatterValues: Record<number, number>;
  costMatterTotal: number;
  payrollValues: Record<number, string>;
  payrollTotalHours: number;
};

// ─── Lecture d'une ligne journalière V25 ─────────────────────────────────────

export function getHistoricalV25RowValues(
  sheet: Worksheet,
  rowNumber: number,
  payrollColumnMaps: HistoricalPayrollColumnMap[],
): HistoricalV25RowValues {
  if (rowNumber < 0 || isHistoricalBudgetTotalRow(sheet, rowNumber)) {
    return {
      couvertsMidi: 0, tmMidi: 0, couvertsSoir: 0, tmSoir: 0,
      realiseVae: 0, realiseMidi: 0, realiseSoir: 0, realiseLimo: 0,
      realiseCouvertsMidi: 0, realiseCouvertsSoir: 0,
      costMatterValues: {}, costMatterTotal: 0,
      payrollValues: {}, payrollTotalHours: 0,
    };
  }

  const couvertsMidi = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, V25_COUVERTS_MIDI_COL));
  const tmMidi = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, V25_TM_MIDI_COL));
  const couvertsSoir = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, V25_COUVERTS_SOIR_COL));
  const tmSoir = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, V25_TM_SOIR_COL));

  const realiseVae = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, V25_CA_VAE_COL));
  const realiseMidi = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, V25_CA_MIDI_COL));
  const realiseSoir = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, V25_CA_SOIR_COL));
  const realiseLimo = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, V25_CA_LIMO_COL));
  const realiseCouvertsMidi = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, V25_CVTS_MIDI_COL));
  const realiseCouvertsSoir = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, V25_CVTS_SOIR_COL));

  // Coût matière : mapping fixe, additionner si deux sources → même target
  const costMatterValues: Record<number, number> = {};
  Object.entries(V25_COST_MATTER_MAP).forEach(([srcCol, targetCol]) => {
    const amount = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, Number(srcCol)));
    if (amount !== 0) costMatterValues[targetCol] = (costMatterValues[targetCol] || 0) + amount;
  });
  const costMatterTotal = sumHistoricalCostMatterValues(costMatterValues);

  const payrollValues = getBestHistoricalPayrollValues(sheet, rowNumber, rowNumber, payrollColumnMaps);
  const payrollTotalHours = sumHistoricalPayrollValues(payrollValues);

  return {
    couvertsMidi, tmMidi, couvertsSoir, tmSoir,
    realiseVae, realiseMidi, realiseSoir, realiseLimo,
    realiseCouvertsMidi, realiseCouvertsSoir,
    costMatterValues, costMatterTotal,
    payrollValues, payrollTotalHours,
  };
}

// ─── Démarques V25 ───────────────────────────────────────────────────────────

export function extractHistoricalV25Demarques(sheet: Worksheet): HistoricalDemarqueRow[] {
  const results: HistoricalDemarqueRow[] = [];
  for (let rowNumber = 0; rowNumber <= sheet.rowCount - 1; rowNumber += 1) {
    if (isHistoricalBudgetTotalRow(sheet, rowNumber)) continue;
    const dateCell = getHistoricalBudgetCell(sheet, rowNumber, 0);
    const parsedDate = parseHistoricalBudgetCellDate(dateCell);
    if (!parsedDate) continue;

    const personnel = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, V25_DEMARQUE_PERS_COL));
    const operationnel = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, V25_DEMARQUE_OP_COL));
    const explicationCell = getHistoricalBudgetCell(sheet, rowNumber, V25_DEMARQUE_EXPL_COL);
    const explication = String(explicationCell?.text || explicationCell?.value || '').trim();

    if (personnel === 0 && operationnel === 0 && !explication) continue;

    const isoDate = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`;
    results.push({ date: isoDate, personnel, operationnel, explication });
  }
  return results;
}

// ─── Frais généraux V25 ──────────────────────────────────────────────────────

const V25_FG_BOX_DATA_ROWS_0BASED: [number, number][] = [
  [9, 15], [18, 26], [29, 37], [41, 48],
];
const V25_FG_COL_OFFSETS = [109, 114, 119] as const;

const formatV25FgDate = (value: unknown): string => {
  const parsed = parseHistoricalBudgetDate(value);
  if (!parsed) return '';
  return `${String(parsed.getDate()).padStart(2, '0')}/${String(parsed.getMonth() + 1).padStart(2, '0')}/${parsed.getFullYear()}`;
};

export function extractHistoricalV25FraisGeneraux(sheet: Worksheet): {
  entries: HistoricalFgEntry[];
  contrats: HistoricalContratEntry[];
} {
  const entries: HistoricalFgEntry[] = [];

  V25_FG_BOX_DATA_ROWS_0BASED.forEach(([startRow, endRow], box) => {
    const dIdxByGroup = [0, 0, 0];
    for (let rowNumber = startRow; rowNumber <= endRow; rowNumber += 1) {
      V25_FG_COL_OFFSETS.forEach((dateCol, colGroup) => {
        const montant = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, dateCol + 3));
        if (!montant || Number.isNaN(montant)) return;
        const date = formatV25FgDate(getHistoricalBudgetCell(sheet, rowNumber, dateCol)?.value);
        const fournisseurCell = getHistoricalBudgetCell(sheet, rowNumber, dateCol + 1);
        const motifCell = getHistoricalBudgetCell(sheet, rowNumber, dateCol + 2);
        entries.push({
          box,
          colGroup,
          dIdx: dIdxByGroup[colGroup],
          date,
          fournisseur: String(fournisseurCell?.text || fournisseurCell?.value || '').trim(),
          motif: String(motifCell?.text || motifCell?.value || '').trim(),
          montant,
        });
        dIdxByGroup[colGroup] += 1;
      });
    }
  });

  // Contrats V25 : montants tous à 0 dans ce format — ne pas importer
  return { entries, contrats: [] };
}

// ─── Re-export des helpers partagés nécessaires aux callers ──────────────────

export { getHistoricalPayrollColumnMaps };
