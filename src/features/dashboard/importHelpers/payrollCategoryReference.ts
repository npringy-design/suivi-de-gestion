import type { MonthData, PersonnelCategory, PersonnelDepartment } from '@/types/dataTypes';

import { PERSONNEL_CATEGORIES, payrollNameKey } from './personnelSalaryImport';

// Catégorie et service connus par nom (clé = payrollNameKey), tirés des imports déjà faits.
export type PayrollCategoryReference = Map<string, { category: PersonnelCategory; department?: PersonnelDepartment }>;

// Parcourt les mois du mois cible (réimport : corrections déjà faites) puis en remontant dans le temps :
// la version la plus récente de chaque nom l'emporte, un nom absent des derniers mois est retrouvé plus loin.
export const buildCategoryReference = (
  allData: Record<number, Record<number, MonthData>>,
  targetYear: number,
  targetMonth: number,
): PayrollCategoryReference => {
  const reference: PayrollCategoryReference = new Map();
  const years = Object.keys(allData).map(Number).filter(Number.isFinite);
  if (years.length === 0) return reference;

  const oldestIndex = Math.min(...years) * 12;
  for (let index = targetYear * 12 + targetMonth; index >= oldestIndex; index -= 1) {
    const categories = allData[Math.floor(index / 12)]?.[index % 12]?.salariesConfig?.categories;
    if (!categories) continue;

    PERSONNEL_CATEGORIES.forEach(category => {
      (categories[category] ?? []).forEach(row => {
        const key = payrollNameKey(row.nom);
        if (key && !reference.has(key)) reference.set(key, { category, department: row.department });
      });
    });
  }

  return reference;
};
