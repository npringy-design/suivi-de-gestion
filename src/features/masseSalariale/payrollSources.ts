import { parseMoneyValue } from '@/lib/money';
import { parseHourInputToDecimal } from '@/lib/utils';
import type { MonthData } from '@/types/dataTypes';

import type { AutoPayroll } from './payrollCalculations';

// Somme des salariés de Config Salaires du mois (coût global = brut + charges patronales,
// tel qu'issu de l'import PDF des coûts salariaux). Null si rien n'est renseigné.
export const getAutoPayrollFromConfig = (monthData: MonthData | undefined): AutoPayroll | null => {
  const categories = monthData?.salariesConfig?.categories;
  if (!categories) return null;

  let totalCost = 0;
  let hours = 0;
  Object.values(categories).forEach(rows => {
    rows.forEach(row => {
      totalCost += parseMoneyValue(row.coutGlobal);
      hours += parseHourInputToDecimal(row.heures);
    });
  });

  return totalCost > 0 ? { totalCost, hours } : null;
};
