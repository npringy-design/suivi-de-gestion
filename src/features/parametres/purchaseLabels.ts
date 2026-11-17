import type { PurchaseSection } from '@/types/dataTypes';
import { normalizeHistoricalSupplierName } from '@/features/dashboard/importHelpers/historicalBudgetImport';

import { DEFAULT_COMPANY_SETTINGS } from './companySettingsDefaults';

export type PurchaseLabelOverride = { label?: string; group?: string };

const FIRST_PURCHASE_COL = 45;
const LAST_PURCHASE_COL = 57;

// Intitulés de groupe historiques des en-têtes (Récap Annuel), pour les sections par défaut.
const LEGACY_GROUP_BY_SECTION_ID: Record<string, string> = {
  liquides: 'ACHATS\nLIQUIDE HT',
  solides: 'ACHATS\nSOLIDES HT',
};

const defaultByColumn = new Map<number, { name: string; sectionId: string }>();
DEFAULT_COMPANY_SETTINGS.purchaseSections.forEach(section => {
  section.suppliers.forEach(supplier => {
    if (supplier.storeColumn !== null) defaultByColumn.set(supplier.storeColumn, { name: supplier.name, sectionId: section.id });
  });
});

// Libellés fournisseurs (cols 45–57) lus dans les réglages du site, par storeColumn.
// Seuls les écarts avec les réglages Hippo par défaut sont renvoyés : un site Hippo non
// personnalisé garde exactement ses en-têtes historiques (typographie comprise).
export const getPurchaseLabelOverrides = (
  sections: readonly PurchaseSection[] | undefined,
): Record<number, PurchaseLabelOverride> => {
  const overrides: Record<number, PurchaseLabelOverride> = {};
  (sections ?? []).forEach(section => {
    section.suppliers.forEach(supplier => {
      const col = supplier.storeColumn;
      if (col === null || col < FIRST_PURCHASE_COL || col > LAST_PURCHASE_COL || !supplier.name.trim()) return;
      const base = defaultByColumn.get(col);
      const sameName = base !== undefined && normalizeHistoricalSupplierName(base.name) === normalizeHistoricalSupplierName(supplier.name);
      const sameGroup = base !== undefined && base.sectionId === section.id;
      if (sameName && sameGroup) return;
      overrides[col] = {
        ...(sameName ? {} : { label: supplier.name.trim() }),
        ...(sameGroup ? {} : { group: LEGACY_GROUP_BY_SECTION_ID[section.id] ?? section.name }),
      };
    });
  });
  return overrides;
};
