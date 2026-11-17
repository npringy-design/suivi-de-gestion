import { Workbook } from 'exceljs';
import { describe, expect, it } from 'vitest';

import { mergeDashboardCellsData } from '@/contexts/dataContextUpdateHelpers';
import { computeMonthDashboard } from '@/features/edg/edgRealtimeSources';
import {
  AU_BUREAU_PURCHASE_SECTIONS, DEFAULT_COMPANY_SETTINGS, migrateAuBureauPurchaseSections, withAuBureauSuppliers,
} from '@/features/parametres/companySettingsDefaults';
import { getDashboardRowIndices } from '@/lib/utils';
import type { MonthData } from '@/types/dataTypes';

import { findHistoricalDataStartRow } from './importHelpers/historicalBudgetImport';

describe('écriture en masse', () => {
  it('conserve les valeurs vides (effacement) et les autres cellules', () => {
    const prev = { 0: { dashboard: { '1-6': '10', '1-7': '20', '2-6': '5' } } } as unknown as Record<number, MonthData>;
    const next = mergeDashboardCellsData(prev, { 0: { '1-6': '', '3-6': '8' } });
    expect(next[0].dashboard).toEqual({ '1-6': '', '1-7': '20', '2-6': '5', '3-6': '8' });
  });
});

describe('findHistoricalDataStartRow', () => {
  it('démarre sous la ligne « DATE » et ignore une date placée au-dessus', () => {
    const sheet = new Workbook().addWorksheet('JANV 26');
    sheet.getCell(5, 1).value = new Date(2026, 0, 1);
    sheet.getCell(9, 1).value = 'DATE';
    expect(findHistoricalDataStartRow(sheet)).toBe(9);
  });

  it('garde le comportement actuel (0) si la ligne « DATE » est introuvable', () => {
    const sheet = new Workbook().addWorksheet('JANV 26');
    sheet.getCell(5, 1).value = new Date(2026, 0, 1);
    expect(findHistoricalDataStartRow(sheet)).toBe(0);
  });
});

describe('colonnes limonade Réalisé Au Bureau', () => {
  const rIdx = getDashboardRowIndices(10, 2026)[1];
  const monthData = {
    dashboard: {
      [`${rIdx}-14`]: '35', [`${rIdx}-15`]: '9',
      [`${rIdx}-20`]: '563', [`${rIdx}-34`]: '59',
      // détail midi/soir : ne doit jamais remplacer les totaux 20/34
      [`${rIdx}-110`]: '100', [`${rIdx}-111`]: '50', [`${rIdx}-112`]: '7', [`${rIdx}-114`]: '8',
    },
  } as unknown as MonthData;

  it('garde les totaux 20/34 et calcule les trois écarts', () => {
    const c = computeMonthDashboard(monthData, 10, 2026, true);
    expect(c[`${rIdx}-20`]).toBe('563');
    expect(c[`${rIdx}-34`]).toBe('59');
    expect(c[`${rIdx}-144`]).toBe('248.00');
    expect(c[`${rIdx}-145`]).toBe('24');
    expect(c[`${rIdx}-146`]).toBe((563 / 59 - 9).toFixed(2));
    expect(c[`${rIdx}-35`]).toBe((563 / 59).toFixed(2));
    expect(c[`${rIdx}-36`]).toBe('59');
  });

  it('sans budget, pas d\'écart ; Hippo sans aucune colonne limonade', () => {
    const noBudget = { dashboard: { [`${rIdx}-20`]: '563', [`${rIdx}-34`]: '59' } } as unknown as MonthData;
    const c = computeMonthDashboard(noBudget, 10, 2026, true);
    expect(c[`${rIdx}-144`]).toBeUndefined();
    expect(c[`${rIdx}-145`]).toBeUndefined();
    const hippo = computeMonthDashboard(monthData, 10, 2026, false);
    ['20', '34', '144', '145', '146'].forEach(col => expect(hippo[`${rIdx}-${col}`] ?? '').toBe(''));
  });
});

describe('migration des fournisseurs Au Bureau', () => {
  it('remplace les sections jamais personnalisées et garde les frais généraux', () => {
    const migrated = migrateAuBureauPurchaseSections(DEFAULT_COMPANY_SETTINGS);
    expect(migrated).not.toBeNull();
    expect(migrated?.purchaseSections.map(s => s.id)).toEqual(['liquides', 'solides', 'frais_generaux']);
    expect(migrated?.purchaseSections[1].suppliers.map(s => s.name)).toContain('Sysco');
    expect(migrated?.purchaseSections[2]).toBe(DEFAULT_COMPANY_SETTINGS.purchaseSections[2]);
  });

  it('ne touche à rien si les fournisseurs ont été personnalisés', () => {
    const custom = withAuBureauSuppliers({
      ...DEFAULT_COMPANY_SETTINGS,
      purchaseSections: DEFAULT_COMPANY_SETTINGS.purchaseSections.map(s => (
        s.id === 'liquides' ? { ...s, suppliers: s.suppliers.map((sup, i) => (i === 0 ? { ...sup, name: 'Autre' } : sup)) } : s
      )),
    });
    expect(custom.purchaseSections.length).toBeGreaterThan(0);
    const renamed = { ...DEFAULT_COMPANY_SETTINGS, purchaseSections: DEFAULT_COMPANY_SETTINGS.purchaseSections.map(s => (
      s.id === 'liquides' ? { ...s, suppliers: s.suppliers.map((sup, i) => (i === 0 ? { ...sup, name: 'Autre' } : sup)) } : s
    )) };
    expect(migrateAuBureauPurchaseSections(renamed)).toBeNull();
    expect(migrateAuBureauPurchaseSections({ ...DEFAULT_COMPANY_SETTINGS, purchaseSections: AU_BUREAU_PURCHASE_SECTIONS })).toBeNull();
  });
});
