import { parseMoneyValue } from '@/lib/money';
import { parseHourInputToDecimal } from '@/lib/utils';
import type { MonthData } from '@/types/dataTypes';

import type { AutoPayroll } from './payrollCalculations';

// Somme des salariés de Config Salaires du mois (coût global = brut + charges patronales,
// tel qu'issu de l'import PDF des coûts salariaux). Null si rien n'est renseigné.
export const getAutoPayrollFromConfig = (monthData: MonthData | undefined): AutoPayroll | null => {
  const config = monthData?.salariesConfig;
  const categories = config?.categories;
  if (!config || !categories) return null;

  let totalCost = 0;
  let hours = 0;
  Object.values(categories).forEach(rows => {
    rows.forEach(row => {
      totalCost += parseMoneyValue(row.coutGlobal);
      hours += parseHourInputToDecimal(row.heures);
    });
  });

  // Totaux de bas de page du PDF en priorité (brut et charges séparés, salariés non matchés inclus) ;
  // sinon repli sur la somme des salariés pour les imports antérieurs à l'extraction des totaux.
  const totals = config.totals;
  if (totals && totals.coutGlobal > 0) {
    return {
      totalCost: totals.coutGlobal,
      hours: totals.heures ?? hours,
      gross: totals.brut,
      employerCharges: totals.chargesPatronales,
    };
  }

  return totalCost > 0 ? { totalCost, hours } : null;
};

// Coût RÉEL du mois (year, month) pour l'analyse mensuelle de Masse Salariale.
// Décalage volontaire : l'import PDF « coûts salariaux » de septembre est rangé sur le
// salariesConfig d'OCTOBRE (cf. getPayrollTargetPeriodFromText), car Config Salaires / Dashboard
// l'utilisent pour les projections de taux horaires du mois suivant. Pour lire le réel de
// septembre il faut donc aller chercher le salariesConfig d'octobre (décembre → janvier N+1).
// getAutoPayrollFromConfig reste inchangée : sa sémantique « même mois » est correcte pour les autres écrans.
export const getRealPayrollFromConfig = (
  allData: Record<number, Record<number, MonthData>>,
  year: number,
  month: number,
): AutoPayroll | null => {
  const nextYear = month === 11 ? year + 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  return getAutoPayrollFromConfig(allData[nextYear]?.[nextMonth]);
};
