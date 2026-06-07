import { useEffect, useState } from 'react';

const PURCHASE_SUPPLIER_NAMES_KEY = 'dashboard_purchase_supplier_names_v1';

export function useDashboardPurchaseSuppliers() {
  const [purchaseSupplierNames, setPurchaseSupplierNames] = useState<Record<number, string>>(() => {
    try {
      const saved = localStorage.getItem(PURCHASE_SUPPLIER_NAMES_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(PURCHASE_SUPPLIER_NAMES_KEY, JSON.stringify(purchaseSupplierNames));
    } catch {
      // Les noms de fournisseurs restent modifiables même si le stockage navigateur est indisponible.
    }
  }, [purchaseSupplierNames]);

  const resetPurchaseSupplierNames = () => {
    setPurchaseSupplierNames({});
    try {
      localStorage.removeItem(PURCHASE_SUPPLIER_NAMES_KEY);
    } catch {
      // La RAZ des données métier a déjà été appliquée en mémoire.
    }
  };

  return {
    purchaseSupplierNames,
    setPurchaseSupplierNames,
    resetPurchaseSupplierNames,
  };
}
