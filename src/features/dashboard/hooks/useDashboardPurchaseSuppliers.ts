import { useCallback, useEffect } from 'react';

import { useData } from '@/contexts/DataContext';
import { removeBrowserStorageItem } from '@/lib/browserStorage';

// Ancien stockage local, commun à tous les sites et jamais synchronisé : supprimé au profit de
// companySettings.purchaseColumnNames (propre au site, sauvegardé dans le cloud).
const LEGACY_PURCHASE_SUPPLIER_NAMES_KEY = 'dashboard_purchase_supplier_names_v1';

export function useDashboardPurchaseSuppliers() {
  const { companySettings, updateCompanySettings } = useData();

  useEffect(() => {
    removeBrowserStorageItem(LEGACY_PURCHASE_SUPPLIER_NAMES_KEY);
  }, []);

  const purchaseSupplierNames: Record<number, string> = Object.fromEntries(
    Object.entries(companySettings.purchaseColumnNames ?? {}).map(([col, name]) => [Number(col), name]),
  );

  const setPurchaseSupplierName = useCallback((col: number, name: string) => {
    updateCompanySettings({
      ...companySettings,
      purchaseColumnNames: { ...(companySettings.purchaseColumnNames ?? {}), [String(col)]: name },
    });
  }, [companySettings, updateCompanySettings]);

  const resetPurchaseSupplierNames = useCallback(() => {
    removeBrowserStorageItem(LEGACY_PURCHASE_SUPPLIER_NAMES_KEY);
  }, []);

  return {
    purchaseSupplierNames,
    setPurchaseSupplierName,
    resetPurchaseSupplierNames,
  };
}
