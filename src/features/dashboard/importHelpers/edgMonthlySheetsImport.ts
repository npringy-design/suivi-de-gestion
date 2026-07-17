import type { Workbook } from 'exceljs';

import { getHistoricalBudgetCell, parseHistoricalBudgetCellNumber } from './historicalBudgetImport';
import { findEdgKeyForLabel } from './edgBudgetImport';

// Onglets mensuels du classeur V25 : un onglet par mois calendaire, nommé "01" à "12"
// (contrairement au V26 où les 12 mois sont des blocs colonnes d'une seule feuille "ANNUEL BUDGET").
const MONTHLY_SHEET_NAMES = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

// Colonnes 0-indexées : A = libellé (0), C = Budget (2), F = Réalisé (5).
const BUDGET_COL = 2;
const REALISE_COL = 5;

export interface EdgMonthlySheetsResult {
  budget: Record<number, Record<string, string>>;
  realise: Record<number, Record<string, string>>;
}

// Lit les onglets mensuels "01" à "12" du classeur V25 et recopie tel quel — sans aucun calcul —
// le Budget (colonne C) et le Réalisé (colonne F) de chaque ligne EDG reconnue (colonne A, via
// findEdgKeyForLabel : mêmes libellés/clés et mêmes lignes de total ignorées que l'import du
// Budget EDG V26). Le nom d'onglet ("01"-"12") fait foi pour le mois ; la date en A3 n'est pas
// exploitée ici, elle ne sert qu'à confirmation visuelle côté classeur source. Retourne null si
// aucun onglet mensuel n'est trouvé. Une cellule vide n'ajoute pas de clé.
export const parseEdgMonthlySheets = (workbook: Workbook): EdgMonthlySheetsResult | null => {
  const budget: Record<number, Record<string, string>> = {};
  const realise: Record<number, Record<string, string>> = {};
  let foundAnySheet = false;

  MONTHLY_SHEET_NAMES.forEach((sheetName, month) => {
    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) return;
    foundAnySheet = true;

    for (let row = 0; row < sheet.rowCount; row += 1) {
      const labelCell = getHistoricalBudgetCell(sheet, row, 0);
      const rawLabel = String(labelCell?.text ?? labelCell?.value ?? '').trim();
      if (!rawLabel) continue;

      const key = findEdgKeyForLabel(rawLabel);
      if (!key) continue;

      const budgetCell = getHistoricalBudgetCell(sheet, row, BUDGET_COL);
      if (budgetCell) {
        if (!budget[month]) budget[month] = {};
        budget[month][key] = parseHistoricalBudgetCellNumber(budgetCell).toFixed(2);
      }

      const realiseCell = getHistoricalBudgetCell(sheet, row, REALISE_COL);
      if (realiseCell) {
        if (!realise[month]) realise[month] = {};
        realise[month][key] = parseHistoricalBudgetCellNumber(realiseCell).toFixed(2);
      }
    }
  });

  return foundAnySheet ? { budget, realise } : null;
};
