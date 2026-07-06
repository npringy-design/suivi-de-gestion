import { describe, expect, it } from 'vitest';
import { Workbook } from 'exceljs';

import { parseEdgBudgetSheet } from './edgBudgetImport';

// Construit une feuille "ANNUEL BUDGET" minimale : libellés en colonne A,
// blocs mensuels de 3 colonnes (valeur, ratio, vide) démarrant en colonne C (index 2),
// dates des mois en ligne 5 (index 4, 0-indexé côté helpers).
const buildBudgetWorkbook = (sheetName = 'ANNUEL BUDGET') => {
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  // Ligne 5 (index 4) : dates de janvier (col C = index 2) et février (col F = index 5)
  sheet.getCell(5, 3).value = new Date(2026, 0, 1);
  sheet.getCell(5, 6).value = new Date(2026, 1, 1);

  const setRow = (rowNumber: number, label: string, janValue?: number, febValue?: number) => {
    sheet.getCell(rowNumber, 1).value = label;
    if (janValue !== undefined) sheet.getCell(rowNumber, 3).value = janValue;
    if (febValue !== undefined) sheet.getCell(rowNumber, 6).value = febValue;
  };

  setRow(6, 'C.A. TOTAL HT', 50000, 52000);
  setRow(7, 'Achats Food', 15000, 15500);
  setRow(8, 'TOTA COUT MATIERE', 15000, 15500); // ligne de total : doit être ignorée
  setRow(9, 'Coût salaires', 12000); // février vide → clé absente pour février

  return workbook;
};

describe('parseEdgBudgetSheet', () => {
  it('retourne null si la feuille ANNUEL BUDGET est absente', () => {
    const workbook = new Workbook();
    workbook.addWorksheet('Autre feuille');
    expect(parseEdgBudgetSheet(workbook)).toBeNull();
  });

  it('trouve la feuille par nom insensible à la casse et aux espaces', () => {
    const workbook = buildBudgetWorkbook('  annuel   budget  ');
    const result = parseEdgBudgetSheet(workbook);
    expect(result).not.toBeNull();
  });

  it('détecte les colonnes mensuelles à partir des dates en ligne 5 et mappe les libellés vers les clés EDG', () => {
    const workbook = buildBudgetWorkbook();
    const result = parseEdgBudgetSheet(workbook);

    expect(result).not.toBeNull();
    expect(result![0].ca_total_ht).toBe('50000.00');
    expect(result![1].ca_total_ht).toBe('52000.00');
    expect(result![0].achats_food).toBe('15000.00');
    expect(result![1].achats_food).toBe('15500.00');
  });

  it('ignore les lignes de total recalculées par l\'application', () => {
    const workbook = buildBudgetWorkbook();
    const result = parseEdgBudgetSheet(workbook);

    expect(result![0]).not.toHaveProperty('cout_matiere');
    Object.values(result!).forEach(monthValues => {
      expect(Object.keys(monthValues)).not.toContain('TOTA COUT MATIERE');
    });
  });

  it('n\'inclut pas de clé pour un mois dont la cellule est vide (pas de 0)', () => {
    const workbook = buildBudgetWorkbook();
    const result = parseEdgBudgetSheet(workbook);

    expect(result![0].cout_salaires).toBe('12000.00');
    expect(result![1]).not.toHaveProperty('cout_salaires');
  });

  it('lit les cellules formule ExcelJS ({ result })', () => {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('ANNUEL BUDGET');
    sheet.getCell(5, 3).value = { formula: 'DATE(2026,1,1)', result: new Date(2026, 0, 1) };
    sheet.getCell(6, 1).value = 'Achats Food';
    sheet.getCell(6, 3).value = { formula: 'B6*2', result: 9000 };

    const result = parseEdgBudgetSheet(workbook);
    expect(result![0].achats_food).toBe('9000.00');
  });
});
