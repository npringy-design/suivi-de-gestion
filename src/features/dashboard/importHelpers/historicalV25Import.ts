import type { Worksheet } from 'exceljs';

import {
  getHistoricalBudgetCell,
  parseHistoricalBudgetCellNumber,
  parseHistoricalBudgetCellDate,
  isHistoricalBudgetTotalRow,
  getHistoricalCostMatterColumnMap,
  getHistoricalCostMatterValues,
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

// ─── Constantes colonnes source V25 (0-based) ────────────────────────────────

export const V25_CA_MIDI_COL = 1;
export const V25_CA_SOIR_COL = 2;
export const V25_CA_LIMO_COL = 3;
export const V25_COUVERTS_MIDI_COL = 8;
export const V25_COUVERTS_SOIR_COL = 10;
export const V25_DEMARQUE_PERS_COL = 60;
export const V25_DEMARQUE_OP_COL = 62;
export const V25_DEMARQUE_EXPL_COL = 66;
export const V25_FG_COL_OFFSETS = [109, 114, 119] as const;
export const V25_FG_CONTRAT_NOM_COL = 124;
export const V25_FG_CONTRAT_MONTANT_COL = 125;

// ─── Type interne ─────────────────────────────────────────────────────────────

export type HistoricalV25RowValues = {
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
  costMatterColumnMap: Record<number, number>,
  payrollColumnMaps: HistoricalPayrollColumnMap[],
): HistoricalV25RowValues {
  if (rowNumber < 0 || isHistoricalBudgetTotalRow(sheet, rowNumber)) {
    return {
      realiseMidi: 0,
      realiseSoir: 0,
      realiseLimo: 0,
      realiseCouvertsMidi: 0,
      realiseCouvertsSoir: 0,
      costMatterValues: {},
      costMatterTotal: 0,
      payrollValues: {},
      payrollTotalHours: 0,
    };
  }

  const realiseMidi = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, V25_CA_MIDI_COL));
  const realiseSoir = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, V25_CA_SOIR_COL));
  const realiseLimo = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, V25_CA_LIMO_COL));
  const realiseCouvertsMidi = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, V25_COUVERTS_MIDI_COL));
  const realiseCouvertsSoir = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, V25_COUVERTS_SOIR_COL));

  const costMatterValues = getHistoricalCostMatterValues(sheet, rowNumber, costMatterColumnMap);
  const costMatterTotal = sumHistoricalCostMatterValues(costMatterValues);

  const payrollValues = getBestHistoricalPayrollValues(sheet, rowNumber, rowNumber, payrollColumnMaps);
  const payrollTotalHours = sumHistoricalPayrollValues(payrollValues);

  return {
    realiseMidi,
    realiseSoir,
    realiseLimo,
    realiseCouvertsMidi,
    realiseCouvertsSoir,
    costMatterValues,
    costMatterTotal,
    payrollValues,
    payrollTotalHours,
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

const fgBoxStartRows0Based = [9, 18, 29, 40];

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
  const contrats: HistoricalContratEntry[] = [];
  const anchorCol = V25_FG_COL_OFFSETS[0];

  fgBoxStartRows0Based.forEach((startRow, box) => {
    let rowNumber = startRow;
    const dIdxByGroup = [0, 0, 0];
    while (rowNumber <= sheet.rowCount - 1) {
      const firstColCell = getHistoricalBudgetCell(sheet, rowNumber, anchorCol);
      const firstColText = String(firstColCell?.text || firstColCell?.value || '').trim().toUpperCase();
      if (firstColText.includes('TOTAL')) break;

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

      const nomCell = getHistoricalBudgetCell(sheet, rowNumber, V25_FG_CONTRAT_NOM_COL);
      const nom = String(nomCell?.text || nomCell?.value || '').trim();
      const montantContrat = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, V25_FG_CONTRAT_MONTANT_COL));
      if (nom && montantContrat) {
        contrats.push({ dIdx: contrats.length, nom, montant: montantContrat });
      }

      rowNumber += 1;
    }
  });

  return { entries, contrats };
}

// ─── Re-export des helpers partagés nécessaires aux callers ──────────────────

export { getHistoricalCostMatterColumnMap, getHistoricalPayrollColumnMaps };
