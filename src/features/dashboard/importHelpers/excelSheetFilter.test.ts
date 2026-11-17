import { Workbook } from 'exceljs';
import { describe, expect, it } from 'vitest';

import { isImportSheetName, keepOnlyImportSheets } from './excelSheetFilter';

describe('isImportSheetName', () => {
  it('garde les onglets mensuels, ANNUEL BUDGET et 01 à 12', () => {
    ['JANV 26', 'FEV 26', 'OCT 25', 'SEPT 2026', 'DEC 26', 'ANNUEL BUDGET', '01', '12'].forEach(name => {
      expect(isImportSheetName(name), name).toBe(true);
    });
  });

  it('écarte les autres onglets', () => {
    ['ACC', 'Menu', 'Cocktails', 'PC JANVIER', 'BILAN JANVIER', 'SAISIE JANVIER', 'CB JANVIER', 'REPORTING 2026', 'ANNUEL 26 SUIVI', 'REALISE', 'Config', '13', '00'].forEach(name => {
      expect(isImportSheetName(name), name).toBe(false);
    });
  });
});

describe('keepOnlyImportSheets', () => {
  it('ne garde que les onglets utiles avec les mêmes valeurs', async () => {
    const source = new Workbook();
    source.addWorksheet('Menu').getCell('A1').value = 'inutile';
    const octobre = source.addWorksheet('OCT 26');
    octobre.getCell('A1').value = 42;
    octobre.getCell('B1').value = { formula: 'A1*2', result: 84 };
    octobre.getCell('C1').value = 'Café';
    source.addWorksheet('PC JANVIER').getCell('A1').value = 1;
    source.addWorksheet('ANNUEL BUDGET').getCell('A1').value = 7;
    source.addWorksheet('05').getCell('A1').value = 9;
    source.addWorksheet('Cocktails').getCell('A1').value = 2;
    const original = (await source.xlsx.writeBuffer()) as ArrayBuffer;

    let stats = { kept: 0, total: 0 };
    const filtered = await keepOnlyImportSheets(original, isImportSheetName, s => { stats = s; });
    expect(stats).toEqual({ kept: 3, total: 6 });

    const reloaded = new Workbook();
    await reloaded.xlsx.load(filtered);
    expect(reloaded.worksheets.map(ws => ws.name).sort()).toEqual(['05', 'ANNUEL BUDGET', 'OCT 26']);
    const oct = reloaded.getWorksheet('OCT 26');
    expect(oct?.getCell('A1').value).toBe(42);
    expect(oct?.getCell('C1').value).toBe('Café');
    expect(reloaded.getWorksheet('ANNUEL BUDGET')?.getCell('A1').value).toBe(7);
  });

  it('échoue explicitement si aucun onglet utile (le repli est géré par l\'appelant)', async () => {
    const source = new Workbook();
    source.addWorksheet('Menu');
    const buffer = (await source.xlsx.writeBuffer()) as ArrayBuffer;
    await expect(keepOnlyImportSheets(buffer, isImportSheetName)).rejects.toThrow();
  });
});
