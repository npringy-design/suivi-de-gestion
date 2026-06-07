import { useEffect, useState } from 'react';

import { loadJsonFromBrowserStorage, removeBrowserStorageItem, saveJsonToBrowserStorage } from '@/lib/browserStorage';

const PURCHASE_SUPPLIER_NAMES_KEY = 'dashboard_purchase_supplier_names_v1';

export function useDashboardPurchaseSuppliers() {
  const [purchaseSupplierNames, setPurchaseSupplierNames] = useState<Record<number, string>>(() =>
    loadJsonFromBrowserStorage<Record<number, string>>(PURCHASE_SUPPLIER_NAMES_KEY, {})
  );

  useEffect(() => {
    saveJsonToBrowserStorage(PURCHASE_SUPPLIER_NAMES_KEY, purchaseSupplierNames);
  }, [purchaseSupplierNames]);

  const resetPurchaseSupplierNames = () => {
    setPurchaseSupplierNames({});
    removeBrowserStorageItem(PURCHASE_SUPPLIER_NAMES_KEY);
  };

  return {
    purchaseSupplierNames,
    setPurchaseSupplierNames,
    resetPurchaseSupplierNames,
  };
}
