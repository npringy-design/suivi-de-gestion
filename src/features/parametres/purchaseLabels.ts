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

// Sites Hippo : la liste des fournisseurs (achats liquides 45–48, solides 49–57) est recréée à l'import
// Excel de l'année en cours avec les noms de l'en-tête de l'Excel, rangés sur les colonnes où l'import
// écrit les montants (colonnes non utilisées : « Libre »). Les autres sections (frais généraux…) sont conservées.
const supplierSlug = (name: string, col: number) =>
  `${name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'fournisseur'}_${col}`;

export const applyImportedSupplierNames = (
  sections: readonly PurchaseSection[],
  namesByCol: Record<number, string>,
): PurchaseSection[] => {
  const cols = Object.keys(namesByCol).map(Number).filter(col => col >= FIRST_PURCHASE_COL && col <= LAST_PURCHASE_COL).sort((a, b) => a - b);
  if (cols.length === 0) return [...sections];
  // Colonne sans fournisseur dans l'Excel : « Libre », pour ne plus afficher un ancien nom sur une colonne vide.
  const suppliersFor = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i)
    .map(col => {
      const name = namesByCol[col] ?? 'Libre';
      return { id: supplierSlug(name, col), name, storeColumn: col };
    });
  const defaults = new Map(DEFAULT_COMPANY_SETTINGS.purchaseSections.map(section => [section.id, section]));
  const rebuilt = (id: 'liquides' | 'solides', from: number, to: number): PurchaseSection => {
    const current = sections.find(section => section.id === id) ?? defaults.get(id);
    return { id, name: current?.name ?? id, icon: current?.icon, suppliers: suppliersFor(from, to) };
  };
  const others = sections.filter(section => section.id !== 'liquides' && section.id !== 'solides');
  return [rebuilt('liquides', 45, 48), rebuilt('solides', 49, LAST_PURCHASE_COL), ...others];
};
