import { describe, expect, it } from 'vitest';

import { mapSalaryCategory, parseSalaryImportRows } from '../salaryImport';

describe('salaryImport', () => {
  it('maps common status labels to salary categories', () => {
    expect(mapSalaryCategory('Cadre cuisine')).toBe('cadre');
    expect(mapSalaryCategory('Agent de maitrise')).toBe('maitrise');
    expect(mapSalaryCategory('NIV I et II')).toBe('niv12');
    expect(mapSalaryCategory('Niveau 3')).toBe('niv3');
    expect(mapSalaryCategory('Apprenti salle')).toBe('apprenti');
  });

  it('imports salary rows by status and keeps global cost when provided', () => {
    const result = parseSalaryImportRows([
      { Nom: 'Marie', Statut: 'Cadre', Heures: '151h67', 'Cout global': '4500' },
      { Nom: 'Samir', Statut: 'NIV III', Heures: '140', 'Cout global': '2700,50' },
    ]);

    expect(result.importedCount).toBe(2);
    expect(result.categories.cadre[0]).toMatchObject({ nom: 'Marie', heures: '151h67', coutGlobal: '4500' });
    expect(result.categories.niv3[0]).toMatchObject({ nom: 'Samir', heures: '140', coutGlobal: '2700,5' });
  });

  it('derives global cost from hourly cost and hours when global cost is missing', () => {
    const result = parseSalaryImportRows([
      { Salarie: 'Lea', Categorie: 'Apprenti', Heures: '100', 'Taux horaire': '11' },
    ]);

    expect(result.importedCount).toBe(1);
    expect(result.categories.apprenti[0]).toMatchObject({ nom: 'Lea', heures: '100', coutGlobal: '1000' });
  });

  it('skips rows with unknown status', () => {
    const result = parseSalaryImportRows([
      { Nom: 'Alex', Statut: 'Extra', Heures: '20', 'Cout global': '300' },
    ]);

    expect(result.importedCount).toBe(0);
    expect(result.skippedRows).toBe(1);
  });
});
