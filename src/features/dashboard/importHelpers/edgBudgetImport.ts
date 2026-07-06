import type { Workbook, Worksheet } from 'exceljs';

import {
  getHistoricalBudgetCell,
  parseHistoricalBudgetCellDate,
  parseHistoricalBudgetCellNumber,
} from './historicalBudgetImport';

// Normalise un libellé pour comparaison robuste aux accents/casse/ponctuation,
// puis retire les espaces pour une comparaison "compacte" insensible aux
// variations de séparateurs (ponctuation, espaces multiples...).
const compact = (value: string): string => value
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/gi, ' ')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, '');

const EDG_BUDGET_SHEET_NAME = compact('ANNUEL BUDGET');

// Ligne des dates de chaque bloc mensuel (ligne 5 Excel = index 4, 0-indexé).
const MONTH_HEADER_ROW = 4;
const MAX_SCAN_COLUMNS = 100;

// Libellés à ignorer : lignes de total recalculées par l'application, jamais importées.
const TOTAL_ROW_PATTERNS = [
  'TOTA COUT MATIERE',
  'TOTAL COUT MATIERE',
  'Marge brute',
  'TOTAL MARGE',
  'Frais person. directs',
  'Frais Pers. indirects',
  'Total autres frais person.',
  'TOTAL Salaires et charges',
  'TOTAL PUBLICITE',
  "TOTAL FG d'exploitation",
  "TOTAL FG d'occupation",
  'RESULTAT GESTION',
  'COUT DES IMM.',
  "RES. D'EXPLOIT",
  'RES. COURANT',
  'RES. NET avant IS',
  'E.B.E.( credit CICE inclus)',
  'Cash Flow avant IS',
].map(compact);

// Fragment de libellé de référence (le plus distinctif possible) → clé EDG.
// Match par inclusion sur le libellé compacté de la ligne ; en cas de plusieurs
// correspondances, le fragment le plus long l'emporte (voir findEdgKeyForLabel).
const EDG_KEY_LABELS: Array<[string, string]> = [
  ['ca_total_ht', 'C.A. TOTAL HT'],
  ['achats_food', 'Achats Food'],
  ['consommables', 'Consommables liés à la vente'],
  ['variation_stock', 'Variation de stock'],
  ['repas_salaries', 'Repas des salariés'],
  ['refacturation', 'Refacturation Pub'],
  ['cout_salaires', 'Coût salaires'],
  ['charges_sociales', 'Charges sociales'],
  ['frais_formation', 'Frais de formation'],
  ['aides_subventions', 'Aides et Subventions'],
  ['prov_cp_brut', 'Provision CP+ JF+ RC BRUT'],
  ['prov_cp_pat', 'Provision CP+ JF+ RC PAT'],
  ['prov_prud', "Prov. prud'h"],
  ['taxe_salaires', 'Taxe sur les salaires'],
  ['autres_primes', 'Autres primes et divers'],
  ['prestation_anim', 'Prestation animation'],
  ['pub_locale', 'Publicité locale'],
  ['comm_encaissement', 'Comm. / encaissement'],
  ['produits_entretien', "Produits d'entretien"],
  ['fournitures_bureau', "Fournitures d'exploitation"],
  ['materiel_outillage', 'Matériel et outillage'],
  ['blanchissage', 'Blanchissage'],
  ['vetement_pro', 'Vêtement professionnel'],
  ['ptt', 'PTT+Telephone'],
  ['enlev_fonds', 'Enlèv.fonds'],
  ['transport', 'Transport et déplacement'],
  ['honoraires_comptables', 'Honoraires comptables'],
  ['honoraires_divers', 'Honoraires divers'],
  ['contrats_maintenance', 'Contrats maintenance'],
  ['entretien_locaux', 'Entretien & répar. locaux'],
  ['nettoyage_locaux', 'Nettoyage locaux'],
  ['surveillance', 'Surveillance-Sécurité'],
  ['energie', 'Energie'],
  ['gaz_eau', 'Gaz-Eau'],
  ['assurances', 'Assurances'],
  ['amortissements', 'Amortissements'],
  ['credit_bail', 'Crédit Bail'],
  ['loyers_murs', 'Loyers Murs'],
  ['charges_locatives', 'Charges locatives'],
  ['impots_taxes', 'Impots et taxes'],
  ['redevances_spre', 'Spre'],
  ['redevances_flo', 'Grpe Flo'],
  ['marketing', 'Marketing'],
  ['except_gestion', 'Except de gestion'],
  ['frais_banque', 'Frais de banque'],
  ['net_financier', 'Net financier'],
  ['amortissement_except', 'Amortissement except'],
  ['frais_holding', 'Frais de Holding'],
  ['pertes_except', 'Pertes exceptionnelles'],
  ['retraitement_daa', 'Retraitement DAA'],
  ['remboursement_net', 'Remboursement net financier'],
  ['remboursement_capital', 'Remboursement Capital'],
].map(([key, label]) => [key, compact(label)]);

const findEdgKeyForLabel = (rawLabel: string): string | null => {
  const label = compact(rawLabel);
  if (!label) return null;
  if (TOTAL_ROW_PATTERNS.some(pattern => label.includes(pattern))) return null;

  let best: { key: string; length: number } | null = null;
  for (const [key, pattern] of EDG_KEY_LABELS) {
    if (label.includes(pattern) && (!best || pattern.length > best.length)) {
      best = { key, length: pattern.length };
    }
  }
  return best?.key ?? null;
};

const findEdgBudgetSheet = (workbook: Workbook): Worksheet | undefined =>
  workbook.worksheets.find(ws => compact(ws.name) === EDG_BUDGET_SHEET_NAME);

// Une cellule par mois en ligne 5 porte la date du bloc : sa colonne est la colonne valeur du mois.
// Chaque en-tête de mois est fusionné sur 2 colonnes (montant € + ratio % à droite) : ExcelJS
// renvoie la même date fusionnée pour les deux colonnes. On scanne de gauche à droite et on ne
// retient que la première colonne trouvée pour un mois donné (la colonne montant), en ignorant
// toute colonne suivante portant la même date (la colonne ratio fusionnée).
const detectMonthColumns = (sheet: Worksheet): Record<number, number> => {
  const columns: Record<number, number> = {};
  const colCount = Math.min(sheet.columnCount || MAX_SCAN_COLUMNS, MAX_SCAN_COLUMNS);
  for (let col = 0; col < colCount; col += 1) {
    const date = parseHistoricalBudgetCellDate(getHistoricalBudgetCell(sheet, MONTH_HEADER_ROW, col));
    if (date && !(date.getMonth() in columns)) columns[date.getMonth()] = col;
  }
  return columns;
};

// Lit la feuille "ANNUEL BUDGET" du classeur de gestion V26 et retourne, par mois (0-11),
// les valeurs Budget EDG détectées (clé EDG → montant formaté). Retourne null si la feuille
// est absente ou si aucune colonne mensuelle n'a pu être détectée.
export const parseEdgBudgetSheet = (workbook: Workbook): Record<number, Record<string, string>> | null => {
  const sheet = findEdgBudgetSheet(workbook);
  if (!sheet) return null;

  const monthColumns = detectMonthColumns(sheet);
  if (Object.keys(monthColumns).length === 0) return null;

  const result: Record<number, Record<string, string>> = {};

  for (let row = 0; row < sheet.rowCount; row += 1) {
    const labelCell = getHistoricalBudgetCell(sheet, row, 0);
    const rawLabel = String(labelCell?.text ?? labelCell?.value ?? '').trim();
    if (!rawLabel) continue;

    const key = findEdgKeyForLabel(rawLabel);
    if (!key) continue;

    Object.entries(monthColumns).forEach(([monthStr, col]) => {
      const cell = getHistoricalBudgetCell(sheet, row, col);
      if (!cell) return; // cellule vide : pas de clé pour ce mois

      const month = Number(monthStr);
      if (!result[month]) result[month] = {};
      result[month][key] = parseHistoricalBudgetCellNumber(cell).toFixed(2);
    });
  }

  return Object.keys(result).length > 0 ? result : null;
};
