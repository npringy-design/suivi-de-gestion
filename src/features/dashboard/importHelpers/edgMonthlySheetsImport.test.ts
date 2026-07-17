import { describe, expect, it } from 'vitest';
import { Workbook } from 'exceljs';

import { parseEdgMonthlySheets } from './edgMonthlySheetsImport';

// Construit un onglet mensuel minimal "01"-"12" du V25 : libellés en colonne A,
// Budget en colonne C (index 2), Réalisé en colonne F (index 5).
const setEdgRow = (workbook: Workbook, sheetName: string, rowNumber: number, label: string, budget?: number, realise?: number) => {
  const sheet = workbook.getWorksheet(sheetName) ?? workbook.addWorksheet(sheetName);
  sheet.getCell(rowNumber, 1).value = label;
  if (budget !== undefined) sheet.getCell(rowNumber, 3).value = budget;
  if (realise !== undefined) sheet.getCell(rowNumber, 6).value = realise;
};

describe('parseEdgMonthlySheets', () => {
  it('retourne null si aucun onglet mensuel "01"-"12" n\'est trouvé', () => {
    const workbook = new Workbook();
    workbook.addWorksheet('Autre feuille');
    expect(parseEdgMonthlySheets(workbook)).toBeNull();
  });

  it('recopie Budget (colonne C) et Réalisé (colonne F) par onglet mensuel, sans calcul', () => {
    const workbook = new Workbook();
    setEdgRow(workbook, '01', 3, 'C.A. TOTAL HT', 50000, 48000);
    setEdgRow(workbook, '01', 4, 'Achats Food', 15000, 14200);
    setEdgRow(workbook, '02', 3, 'C.A. TOTAL HT', 52000, 51000);

    const result = parseEdgMonthlySheets(workbook);

    expect(result).not.toBeNull();
    expect(result!.budget[0].ca_total_ht).toBe('50000.00');
    expect(result!.realise[0].ca_total_ht).toBe('48000.00');
    expect(result!.budget[0].achats_food).toBe('15000.00');
    expect(result!.realise[0].achats_food).toBe('14200.00');
    expect(result!.budget[1].ca_total_ht).toBe('52000.00');
    expect(result!.realise[1].ca_total_ht).toBe('51000.00');
  });

  it('ignore les lignes de total recalculées par l\'application', () => {
    const workbook = new Workbook();
    setEdgRow(workbook, '01', 3, 'C.A. TOTAL HT', 50000, 48000);
    setEdgRow(workbook, '01', 4, 'Achats Food', 15000, 14200);
    setEdgRow(workbook, '01', 5, 'TOTA COUT MATIERE', 15000, 14200);

    const result = parseEdgMonthlySheets(workbook);

    expect(result!.budget[0]).not.toHaveProperty('cout_matiere');
    Object.values(result!.budget).forEach(monthValues => {
      expect(Object.keys(monthValues)).not.toContain('TOTA COUT MATIERE');
    });
  });

  it('n\'ajoute pas de clé pour une cellule vide (pas de 0)', () => {
    const workbook = new Workbook();
    setEdgRow(workbook, '01', 3, 'Coût salaires', 12000); // réalisé vide

    const result = parseEdgMonthlySheets(workbook);

    expect(result!.budget[0].cout_salaires).toBe('12000.00');
    expect(result!.realise[0]).toBeUndefined();
  });

  it('lit les cellules formule ExcelJS ({ result })', () => {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('03');
    sheet.getCell(3, 1).value = 'Achats Food';
    sheet.getCell(3, 3).value = { formula: 'B3*2', result: 9000 };
    sheet.getCell(3, 6).value = { formula: 'C3*0.9', result: 8100 };

    const result = parseEdgMonthlySheets(workbook);

    expect(result!.budget[2].achats_food).toBe('9000.00');
    expect(result!.realise[2].achats_food).toBe('8100.00');
  });
});
