import { Workbook } from 'exceljs';
import { describe, expect, it } from 'vitest';

import { AU_BUREAU_PURCHASE_SECTIONS, DEFAULT_COMPANY_SETTINGS, getDefaultCompanySettings } from '@/features/parametres/companySettingsDefaults';
import { getPurchaseLabelOverrides } from '@/features/parametres/purchaseLabels';

import { buildSupplierColumnMapFromSettings } from './historicalBudgetImport';

// Ligne 6 (1-based) = groupes, ligne 8 = noms de fournisseurs, colonnes 0-based comme dans l'import.
const buildSheet = (headers: Record<number, string>, groups: Record<number, string>) => {
  const sheet = new Workbook().addWorksheet('OCT 26');
  Object.entries(groups).forEach(([col, text]) => { sheet.getCell(6, Number(col) + 1).value = text; });
  Object.entries(headers).forEach(([col, text]) => { sheet.getCell(8, Number(col) + 1).value = text; });
  return { sheet, range: { rowCount: 10, columnCount: 100 } };
};

describe('buildSupplierColumnMapFromSettings', () => {
  it('relie les fournisseurs Au Bureau, y compris les libellés courts et les alias', () => {
    const { sheet, range } = buildSheet(
      { 81: 'C10', 82: 'RICHARD VINS', 83: 'CAFE RICHARD', 84: 'AURIBAULT', 85: 'SYSCO', 86: 'POMONA F&L', 87: 'SOCOPA', 88: 'EPISAVEUR', 89: 'SDV', 90: 'TETE DE CHOU', 91: 'DOMAFRAIS', 92: 'METRO / DEPANNAGE', 93: 'UNILEVER', 94: 'BAR SOLUTION', 95: 'MARTEL', 96: 'TOTAL HT' },
      { 81: 'ACHATS LIQUIDE HT', 84: 'ACHATS SOLIDES HT', 96: 'ACHAT HT' },
    );
    const { map, unrecognized } = buildSupplierColumnMapFromSettings(sheet, range, AU_BUREAU_PURCHASE_SECTIONS);
    expect(map).toEqual({ 81: 45, 82: 46, 83: 47, 84: 48, 85: 49, 86: 50, 87: 51, 88: 52, 89: 53, 90: 54, 91: 55, 92: 56, 93: 56, 94: 56, 95: 57 });
    expect(unrecognized).toEqual([]);
  });

  it('signale un fournisseur non reconnu au lieu de le perdre', () => {
    const { sheet, range } = buildSheet({ 81: 'C10', 82: 'INCONNU SARL' }, { 81: 'ACHATS LIQUIDE HT', 90: 'ACHAT HT' });
    const { map, unrecognized } = buildSupplierColumnMapFromSettings(sheet, range, AU_BUREAU_PURCHASE_SECTIONS);
    expect(map).toEqual({ 81: 45 });
    expect(unrecognized).toEqual(['INCONNU SARL']);
  });
});

describe('libellés fournisseurs des réglages', () => {
  it('ne change rien pour les réglages Hippo par défaut', () => {
    expect(getPurchaseLabelOverrides(DEFAULT_COMPANY_SETTINGS.purchaseSections)).toEqual({});
  });

  it('reprend les libellés Au Bureau qui diffèrent', () => {
    const overrides = getPurchaseLabelOverrides(getDefaultCompanySettings('au_bureau').purchaseSections);
    expect(overrides[48]).toEqual({ label: 'Auribault', group: 'ACHATS\nSOLIDES HT' });
    expect(overrides[49]).toEqual({ label: 'Sysco' });
    expect(overrides[54]).toEqual({ label: 'Tête de chou' });
    expect(overrides[45]).toBeUndefined();
    expect(getDefaultCompanySettings('au_bureau').companyName).toBe('Au Bureau');
    expect(getDefaultCompanySettings('hippo')).toBe(DEFAULT_COMPANY_SETTINGS);
  });
});
