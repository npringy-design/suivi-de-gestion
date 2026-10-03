import { FULL_TIME_MONTHLY_HOURS } from '@/lib/constants';
import { parseMoneyValue } from '@/lib/money';
import { parseHourInputToDecimal } from '@/lib/utils';
import type { MonthData, PayrollForfaitsJourPeriod } from '@/types/dataTypes';

import type { AutoPayroll } from './payrollCalculations';
import { DEFAULT_FORFAITS_JOUR_PERIODS, payrollMonthKey } from './payrollDefaults';

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
      ...(totals.etp !== undefined ? { etp: totals.etp } : {}),
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
//
// ETP : exact quand l'import l'a stocké (`totals.etp`) ; sinon estimé depuis les heures du PDF
// (`totals.heures`) + forfaits jour du réglage `forfaitsJourPeriods` pour le mois réel ; sinon absent.
export const getRealPayrollFromConfig = (
  allData: Record<number, Record<number, MonthData>>,
  year: number,
  month: number,
  forfaitsJourPeriods: PayrollForfaitsJourPeriod[] = DEFAULT_FORFAITS_JOUR_PERIODS,
): AutoPayroll | null => {
  const nextYear = month === 11 ? year + 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  const monthData = allData[nextYear]?.[nextMonth];
  const auto = getAutoPayrollFromConfig(monthData);
  if (!auto || auto.etp !== undefined) return auto;

  const importedHours = monthData?.salariesConfig?.totals?.heures;
  if (importedHours === undefined || importedHours <= 0) return auto;
  const forfaitsJour = getForfaitsJourCount(forfaitsJourPeriods, year, month);
  const etp = Math.round((importedHours / FULL_TIME_MONTHLY_HOURS + forfaitsJour) * 100) / 100;
  return { ...auto, etp, etpEstimated: true };
};

// Valeur applicable à un mois : celle de la dernière période dont `from` est antérieur ou égal à ce mois.
export const getForfaitsJourCount = (periods: PayrollForfaitsJourPeriod[], year: number, month: number): number => {
  const key = payrollMonthKey(year, month);
  let count = 0;
  [...periods].sort((a, b) => a.from.localeCompare(b.from)).forEach(period => {
    if (period.from <= key) count = period.count;
  });
  return count;
};
