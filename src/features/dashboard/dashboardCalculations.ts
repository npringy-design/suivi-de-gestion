import { parseMoneyValue, type MoneyInputValue } from '@/lib/money';
import { parseHourInputToDecimal } from '@/lib/utils';
import { averagePayrollRate } from '@/features/dashboard/importHelpers/personnelSalaryImport';
import type { SalarieRow, PersonnelSchema } from '@/contexts/DataContext';
import type { DashboardColumn, DashboardRow } from './dashboardTypes';


export type FgBoxLayout =
  | { type: 'data'; box: number; dataIdx: number }
  | { type: 'total'; box: number }
  | { type: 'header'; box: number }
  | { type: 'subheader'; box: number }
  | null;

const getISOWeek = (date: Date): number => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

export const isDateInRange = (date: Date, startStr: string, endStr: string): boolean => {
  const start = new Date(startStr);
  const end = new Date(endStr);
  return date >= start && date <= end;
};

export const isExactDate = (date: Date, dateStr: string): boolean => {
  const target = new Date(dateStr);
  return date.getFullYear() === target.getFullYear()
    && date.getMonth() === target.getMonth()
    && date.getDate() === target.getDate();
};

export const isPayrollInputColumn = (colIndex: number): boolean => (
  (colIndex >= 62 && colIndex <= 71) || (colIndex >= 77 && colIndex <= 86)
  || (colIndex >= 130 && colIndex <= 139)
);

export const parsePayrollHourForCalculation = (value: string | number | undefined): number => {
  if (value === undefined || value === null || value === '') return 0;
  const converted = parseHourInputToDecimal(value);
  return Number.isFinite(converted) && converted > 0 ? Math.round(converted * 100) / 100 : 0;
};

export const formatPayrollHourDecimalValue = (value: string | number | undefined): string => {
  if (value === undefined || value === null || value === '') return '';
  const converted = parsePayrollHourForCalculation(value);
  return converted > 0 ? converted.toFixed(2).replace('.', ',') : String(value);
};

export const formatPayrollHourVisualValue = (value: string | number | undefined): string => {
  if (value === undefined || value === null || value === '') return '';
  const converted = parseHourInputToDecimal(value);
  if (!Number.isFinite(converted) || converted <= 0) return String(value);
  const hours = Math.floor(converted);
  const minutesTotal = Math.round((converted - hours) * 60);
  const normalizedHours = hours + Math.floor(minutesTotal / 60);
  const normalizedMinutes = minutesTotal % 60;
  return `${normalizedHours}h${String(normalizedMinutes).padStart(2, '0')}`;
};

export const getFgBoxLayout = (rIdx: number, totalRowCount: number): FgBoxLayout => {
  const dataRowsTotal = totalRowCount - 9;
  const baseDataRows = Math.floor(dataRowsTotal / 4);
  const remainder = dataRowsTotal % 4;

  const d1 = baseDataRows + (remainder > 0 ? 1 : 0);
  const d2 = baseDataRows + (remainder > 1 ? 1 : 0);
  const d3 = baseDataRows + (remainder > 2 ? 1 : 0);

  const b1Total = d1;
  const b2Head = b1Total + 1;
  const b2Sub = b2Head + 1;
  const b2Total = b2Sub + d2 + 1;
  const b3Head = b2Total + 1;
  const b3Sub = b3Head + 1;
  const b3Total = b3Sub + d3 + 1;
  const b4Head = b3Total + 1;
  const b4Sub = b4Head + 1;
  const b4Total = totalRowCount - 1;

  if (rIdx < b1Total) return { type: 'data', box: 0, dataIdx: rIdx };
  if (rIdx === b1Total) return { type: 'total', box: 0 };
  if (rIdx === b2Head) return { type: 'header', box: 1 };
  if (rIdx === b2Sub) return { type: 'subheader', box: 1 };
  if (rIdx < b2Total) return { type: 'data', box: 1, dataIdx: rIdx - b2Sub - 1 };
  if (rIdx === b2Total) return { type: 'total', box: 1 };
  if (rIdx === b3Head) return { type: 'header', box: 2 };
  if (rIdx === b3Sub) return { type: 'subheader', box: 2 };
  if (rIdx < b3Total) return { type: 'data', box: 2, dataIdx: rIdx - b3Sub - 1 };
  if (rIdx === b3Total) return { type: 'total', box: 2 };
  if (rIdx === b4Head) return { type: 'header', box: 3 };
  if (rIdx === b4Sub) return { type: 'subheader', box: 3 };
  if (rIdx < b4Total) return { type: 'data', box: 3, dataIdx: rIdx - b4Sub - 1 };
  if (rIdx === b4Total) return { type: 'total', box: 3 };
  return null;
};

export const parseDashboardNumber = (value: MoneyInputValue): number => parseMoneyValue(value);

export const formatKpiCurrency = (value: number): string =>
  value === 0 ? '-' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

export const formatKpiNumber = (value: number): string =>
  value === 0 ? '-' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value);

export const formatValue = (val: string | number | undefined, c: string[], colIndex?: number): string | number => {
  if (val === '' || val === undefined || val === null) return '';
  if (typeof colIndex === 'number' && isPayrollInputColumn(colIndex)) return formatPayrollHourDecimalValue(val);
  const groupName = c[0];
  const subGroupName = c[1];
  const colName = c[2] || c[1];

  // Pour les colonnes DEMARQUES non-ratio (PERSONNEL, OPERATIONEL, TOTAL), ignorer tout % stocké par erreur
  const isDemarquesInput = groupName === 'DEMARQUES' && !colName.includes('Ratio') && !subGroupName.includes('Ratio') && colName !== 'EXPLICATION DEMARQUE';
  if (typeof val === 'string' && val.includes('%') && !isDemarquesInput) return val;

  const num = parseMoneyValue(val);
  if (Number.isNaN(num)) return val;

  const isPercentage = groupName !== 'COUT MATIERE' && !isDemarquesInput && (colName.includes('RATIO') || colName.includes('%') || subGroupName.includes('RATIO') || colName.toLowerCase().includes('ratio'));
  const isCurrency = !isPercentage && (colName.includes('CA') || colName.includes('HT') || colName.includes('PANIER') || colName.includes('MONTANT') || colName.includes('€') || colName.includes('COUT')
    || subGroupName.includes('CA HT') || subGroupName.includes('ACHAT') || groupName.includes('COUT') || isDemarquesInput);
  const formattedNum = Number.isInteger(num) ? num.toString() : num.toFixed(2).replace('.', ',');
  const prefix = (colName.includes('ECART') && num > 0) ? '+' : '';

  if (isPercentage) return `${prefix}${formattedNum} %`;
  return isCurrency ? `${prefix}${formattedNum} €` : `${prefix}${formattedNum}`;
};

export function computeDashboardData(
  cellData: Record<string, string>,
  rows: DashboardRow[],
  dynamicColumns: DashboardColumn[],
  salariesConfig: Record<string, SalarieRow[]> | undefined,
  personnelSchema?: PersonnelSchema,
  nMinus1Data?: { cellData: Record<string, string>; rows: DashboardRow[] },
): Record<string, string> {
    const data: Record<string, string> = { ...cellData };
    const isGlobalSchema = personnelSchema === 'global';

    // Index N-1 par date exacte (YYYY-M-D)
    // Appairage par numéro de semaine ISO + jour de la semaine : même semaine ISO, même jour, année N-1.
    const getN1TargetDate = (currentDate: Date): Date => {
      const getISOWeek = (d: Date): number => {
        const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
        return Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      };
      const mondayOfISOWeek = (y: number, w: number): Date => {
        const jan4 = new Date(Date.UTC(y, 0, 4));
        const dow = jan4.getUTCDay() || 7;
        const monday = new Date(jan4);
        monday.setUTCDate(jan4.getUTCDate() - (dow - 1) + (w - 1) * 7);
        return monday;
      };
      const isoWeek = getISOWeek(currentDate);
      const dow = currentDate.getDay() || 7; // 1=lun … 7=dim (local)
      const mondayN1 = mondayOfISOWeek(currentDate.getFullYear() - 1, isoWeek);
      // Convertir en date locale pour que la clé YYYY-M-D soit cohérente avec nMinus1ByDate
      const utcMs = mondayN1.getTime() + (dow - 1) * 86400000;
      return new Date(utcMs);
    };

    const nMinus1ByDate = new Map<string, { caBudget: number; cvtsBudget: number; caRealise: number; cvtsRealise: number }>();
    if (nMinus1Data) {
      nMinus1Data.rows.forEach((row, rIdx) => {
        if (row.type !== 'day' || !row.dateObj) return;
        const d = row.dateObj;
        const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        const cd = nMinus1Data.cellData;
        const cvtsMidiN1 = parseMoneyValue(cd[`${rIdx}-6`]);
        const moyMidiN1 = parseMoneyValue(cd[`${rIdx}-7`]);
        const cvtsSoirN1 = parseMoneyValue(cd[`${rIdx}-8`]);
        const moySoirN1 = parseMoneyValue(cd[`${rIdx}-9`]);
        nMinus1ByDate.set(dateKey, {
          caBudget: cvtsMidiN1 * moyMidiN1 + cvtsSoirN1 * moySoirN1,
          cvtsBudget: cvtsMidiN1 + cvtsSoirN1,
          caRealise: parseMoneyValue(cd[`${rIdx}-17`]) + parseMoneyValue(cd[`${rIdx}-18`]) + parseMoneyValue(cd[`${rIdx}-19`]),
          cvtsRealise: parseMoneyValue(cd[`${rIdx}-25`]) + parseMoneyValue(cd[`${rIdx}-27`]),
        });
      });
    }
    let cumulCA = 0;
    let cumulCvts = 0;
    let cumulRealiseCA = 0;
    let cumulCoutMatiere = 0;
    let cumulCvtsRealise = 0;
    let cumulCvtsLimo = 0;
    let cumulCvtsBudgetComplet = 0;
    let cumulN1CA = 0;
    let cumulN1Cvts = 0;

    // First pass: Calculate row totals (TOTAL JOUR) and CUMUL
    rows.forEach((row, rIdx) => {
      if (row.type === 'day') {
        // Hippo Thillois : pas d'activite limonade. Les valeurs restent ignorees meme si une ancienne donnee existe.
        [2, 14, 15, 16, 20, 34, 35, 36, 110, 111, 112, 113, 114, 115].forEach(col => {
          data[`${rIdx}-${col}`] = '';
        });

        // Read inputs
        const cvtsMidi = parseMoneyValue(data[`${rIdx}-6`]);
        const moyMidi = parseMoneyValue(data[`${rIdx}-7`]);
        const cvtsSoir = parseMoneyValue(data[`${rIdx}-8`]);
        const moySoir = parseMoneyValue(data[`${rIdx}-9`]);
        const cvtsLimo = parseMoneyValue(data[`${rIdx}-14`]);
        const moyLimo = parseMoneyValue(data[`${rIdx}-15`]);

        // Calculate CA
        const caMidi = cvtsMidi * moyMidi;
        const caSoir = cvtsSoir * moySoir;
        const caLimo = cvtsLimo * moyLimo;

        if (caMidi > 0) data[`${rIdx}-0`] = caMidi.toFixed(2);
        if (caSoir > 0) data[`${rIdx}-1`] = caSoir.toFixed(2);
        if (caLimo > 0) data[`${rIdx}-2`] = caLimo.toFixed(2);

        const budgetMidi = parseMoneyValue(data[`${rIdx}-0`]);
        const budgetSoir = parseMoneyValue(data[`${rIdx}-1`]);
        const budgetLimo = parseMoneyValue(data[`${rIdx}-2`]);

        const budgetRestaurantTotal = budgetMidi + budgetSoir;
        if (budgetRestaurantTotal > 0 || data[`${rIdx}-0`] || data[`${rIdx}-1`]) data[`${rIdx}-125`] = budgetRestaurantTotal.toFixed(2);

        const totalJour = budgetRestaurantTotal + budgetLimo;
        if (totalJour > 0 || data[`${rIdx}-0`] || data[`${rIdx}-1`] || data[`${rIdx}-2`]) {
          data[`${rIdx}-3`] = totalJour.toFixed(2);
          cumulCA += totalJour;
          data[`${rIdx}-4`] = cumulCA.toFixed(2);
        }

        const jourCvts = cvtsMidi + cvtsSoir;
        if (jourCvts > 0) {
          data[`${rIdx}-10`] = jourCvts.toString();
          const jourMoy = (budgetMidi + budgetSoir) / jourCvts;
          data[`${rIdx}-11`] = jourMoy.toString();
          
          cumulCvts += jourCvts;
          data[`${rIdx}-12`] = cumulCvts.toString();
        }

        const budgetCvtsComplet = jourCvts + cvtsLimo;
        if (budgetCvtsComplet > 0 || data[`${rIdx}-10`] || data[`${rIdx}-14`]) {
          cumulCvtsBudgetComplet += budgetCvtsComplet;
          data[`${rIdx}-126`] = budgetCvtsComplet.toFixed(0);
          data[`${rIdx}-127`] = cumulCvtsBudgetComplet.toFixed(0);
        }

        // REALISE CA HT — 17=VAE,18=MIDI,19=SOIR,20=LIMO,21=TOTAL,22=ECART,23=CUMUL
        const realiseVae  = parseMoneyValue(data[`${rIdx}-17`]);
        const realiseMidi = parseMoneyValue(data[`${rIdx}-18`]);
        const realiseSoir = parseMoneyValue(data[`${rIdx}-19`]);
        const realiseLimoMidiDetail = parseMoneyValue(data[`${rIdx}-110`]);
        const realiseLimoSoirDetail = parseMoneyValue(data[`${rIdx}-111`]);
        const realiseLimoDetailTotal = realiseLimoMidiDetail + realiseLimoSoirDetail;
        const realiseLimo = realiseLimoDetailTotal > 0 ? realiseLimoDetailTotal : parseMoneyValue(data[`${rIdx}-20`]);
        if (realiseLimoDetailTotal > 0) data[`${rIdx}-20`] = realiseLimoDetailTotal.toFixed(2);
        const realiseRestaurantTotal = realiseMidi + realiseSoir;
        if (realiseRestaurantTotal > 0 || data[`${rIdx}-18`] || data[`${rIdx}-19`]) data[`${rIdx}-116`] = realiseRestaurantTotal.toFixed(2);
        const realiseTotalJour = realiseVae + realiseRestaurantTotal + realiseLimo;
        if (realiseTotalJour > 0 || data[`${rIdx}-17`] || data[`${rIdx}-18`] || data[`${rIdx}-19`] || data[`${rIdx}-20`]) {
          data[`${rIdx}-21`] = realiseTotalJour.toFixed(2);
          const realiseEcartBudget = realiseTotalJour - totalJour;
          data[`${rIdx}-22`] = realiseEcartBudget.toFixed(2);
          if (totalJour > 0) data[`${rIdx}-117`] = ((realiseEcartBudget / totalJour) * 100).toFixed(2);
          cumulRealiseCA += realiseTotalJour;
          data[`${rIdx}-23`] = cumulRealiseCA.toFixed(2);
          // cols 140/141/142 (Tendance) calculés après le premier passage (totalBudgetMois requis)
        }
        // COUVERTS REALISE — 25=NB MIDI,26=MOY,27=NB SOIR,28=MOY,29=TOTAL,30=CUMUL,31=ECART nb vs budget
        const nbCvtsMidi = parseMoneyValue(data[`${rIdx}-25`]);
        const nbCvtsSoir = parseMoneyValue(data[`${rIdx}-27`]);
        if (nbCvtsMidi > 0 && realiseMidi > 0) data[`${rIdx}-26`] = (realiseMidi / nbCvtsMidi).toFixed(2);
        if (nbCvtsSoir > 0 && realiseSoir > 0) data[`${rIdx}-28`] = (realiseSoir / nbCvtsSoir).toFixed(2);
        const totalCvtsJour = nbCvtsMidi + nbCvtsSoir;
        if (totalCvtsJour > 0) {
          data[`${rIdx}-29`] = totalCvtsJour.toFixed(0);
          
          const moyJour = (realiseMidi + realiseSoir) / totalCvtsJour;
          data[`${rIdx}-30`] = moyJour.toFixed(2);
          
          const budgetMoyJour = parseMoneyValue(data[`${rIdx}-11`]);
          if (budgetMoyJour > 0) {
            data[`${rIdx}-31`] = (moyJour - budgetMoyJour).toFixed(2);
          }

          cumulCvtsRealise += totalCvtsJour;
          data[`${rIdx}-32`] = cumulCvtsRealise.toFixed(0);
          const budgetCvtsJour = parseMoneyValue(data[`${rIdx}-10`]);
          if (budgetCvtsJour > 0) data[`${rIdx}-33`] = (totalCvtsJour - budgetCvtsJour).toFixed(0);
        }
        // COUVERTS LIMONADE — detail midi/soir + total historique
        const nbCvtsLimoMidiDetail = parseMoneyValue(data[`${rIdx}-112`]);
        const nbCvtsLimoSoirDetail = parseMoneyValue(data[`${rIdx}-114`]);
        const nbCvtsLimoDetailTotal = nbCvtsLimoMidiDetail + nbCvtsLimoSoirDetail;
        const nbCvtsLimo = nbCvtsLimoDetailTotal > 0 ? nbCvtsLimoDetailTotal : parseMoneyValue(data[`${rIdx}-34`]);
        if (nbCvtsLimoDetailTotal > 0) data[`${rIdx}-34`] = nbCvtsLimoDetailTotal.toFixed(0);
        if (nbCvtsLimoMidiDetail > 0 && realiseLimoMidiDetail > 0) data[`${rIdx}-113`] = (realiseLimoMidiDetail / nbCvtsLimoMidiDetail).toFixed(2);
        if (nbCvtsLimoSoirDetail > 0 && realiseLimoSoirDetail > 0) data[`${rIdx}-115`] = (realiseLimoSoirDetail / nbCvtsLimoSoirDetail).toFixed(2);
        if (nbCvtsLimo > 0 && realiseLimo > 0) data[`${rIdx}-35`] = (realiseLimo / nbCvtsLimo).toFixed(2);
        if (nbCvtsLimo > 0) {
          cumulCvtsLimo = (cumulCvtsLimo || 0) + nbCvtsLimo;
          data[`${rIdx}-36`] = cumulCvtsLimo.toFixed(0);
        }
        const totalCvtsJourComplet = totalCvtsJour + nbCvtsLimo;
        if (totalCvtsJourComplet > 0) {
          data[`${rIdx}-120`] = totalCvtsJourComplet.toFixed(0);
          data[`${rIdx}-121`] = (cumulCvtsRealise + cumulCvtsLimo).toFixed(0);
          const budgetCvtsJourComplet = parseMoneyValue(data[`${rIdx}-10`]) + parseMoneyValue(data[`${rIdx}-14`]);
          if (budgetCvtsJourComplet > 0) {
            const ecartCvtsComplet = totalCvtsJourComplet - budgetCvtsJourComplet;
            data[`${rIdx}-33`] = ecartCvtsComplet.toFixed(0);
            data[`${rIdx}-122`] = ((ecartCvtsComplet / budgetCvtsJourComplet) * 100).toFixed(2);
          }
        }

        // DEMARQUES calculations
        const demPersonnel = parseMoneyValue(data[`${rIdx}-39`]);
        const demOperationnel = parseMoneyValue(data[`${rIdx}-41`]);
        if (demPersonnel > 0 || demOperationnel > 0) {
          data[`${rIdx}-43`] = (demPersonnel + demOperationnel).toFixed(2);
          if (realiseTotalJour > 0) {
            data[`${rIdx}-40`] = ((demPersonnel / realiseTotalJour) * 100).toFixed(2) + '%';
            data[`${rIdx}-42`] = ((demOperationnel / realiseTotalJour) * 100).toFixed(2) + '%';
          }
        }

        // COUT MATIERE calculations
        let coutMatiereTotalJour = 0;
        let hasCoutMatiereData = false;
        for (let i = 45; i <= 57; i++) {
          if (data[`${rIdx}-${i}`]) {
            coutMatiereTotalJour += parseMoneyValue(data[`${rIdx}-${i}`]);
            hasCoutMatiereData = true;
          }
        }

        if (hasCoutMatiereData) {
          data[`${rIdx}-58`] = coutMatiereTotalJour.toFixed(2);
          cumulCoutMatiere += coutMatiereTotalJour;
          data[`${rIdx}-59`] = cumulCoutMatiere.toFixed(2);
          
          if (cumulRealiseCA > 0) {
            data[`${rIdx}-60`] = ((cumulCoutMatiere / cumulRealiseCA) * 100).toFixed(2) + '%';
          } else {
            data[`${rIdx}-60`] = '0.00%';
          }
        }

        // FRAIS DE PERSONNEL - PROJECTION
        let totalHeuresProj = 0;
        let coutGlobalProj = 0;
        let hasProjData = false;
        
        const getAvgRate = (category: string, department: 'cuisine' | 'salle') => {
          if (!salariesConfig) return 0;
          const rows = salariesConfig[category] || [];
          return averagePayrollRate(rows, department, category);
        };

        const projRates = [
          getAvgRate('cadre', 'cuisine'),
          getAvgRate('cadre', 'salle'),
          getAvgRate('maitrise', 'cuisine'),
          getAvgRate('maitrise', 'salle'),
          getAvgRate('niv12', 'cuisine'),
          getAvgRate('niv12', 'salle'),
          getAvgRate('niv3', 'cuisine'),
          getAvgRate('niv3', 'salle'),
          getAvgRate('apprenti', 'cuisine'),
          getAvgRate('apprenti', 'salle')
        ];

        const projGlobalRates = [
          getAvgRate('cadre', 'cuisine'),
          getAvgRate('maitrise', 'cuisine'),
          getAvgRate('niv12', 'cuisine'),
          getAvgRate('niv3', 'cuisine'),
          getAvgRate('apprenti', 'cuisine'),
        ];

        const isGlobalSchema = personnelSchema === 'global';
        const projCols = isGlobalSchema ? [130, 131, 132, 133, 134] : [62, 63, 64, 65, 66, 67, 68, 69, 70, 71];
        const projColRates = isGlobalSchema ? projGlobalRates : projRates;

        projCols.forEach((colIdx, i) => {
          if (data[`${rIdx}-${colIdx}`]) {
            const val = parsePayrollHourForCalculation(data[`${rIdx}-${colIdx}`] || '0');
            totalHeuresProj += val;
            coutGlobalProj += val * projColRates[i];
            hasProjData = true;
          }
        });

        if (hasProjData) {
          data[`${rIdx}-61`] = totalHeuresProj.toFixed(2);
          data[`${rIdx}-72`] = coutGlobalProj.toFixed(2);
          if (totalHeuresProj > 0) {
            data[`${rIdx}-73`] = (realiseTotalJour / totalHeuresProj).toFixed(2);
          }
          if (realiseTotalJour > 0) {
            data[`${rIdx}-74`] = ((coutGlobalProj / realiseTotalJour) * 100).toFixed(2) + '%';
          }
        }

        // FRAIS DE PERSONNEL - REALISE
        let totalHeuresReal = 0;
        let coutGlobalReal = 0;
        let hasRealData = false;
        
        const realCols = isGlobalSchema ? [135, 136, 137, 138, 139] : [77, 78, 79, 80, 81, 82, 83, 84, 85, 86];
        const realColRates = isGlobalSchema ? projGlobalRates : projRates;

        realCols.forEach((colIdx, i) => {
          if (data[`${rIdx}-${colIdx}`]) {
            const val = parsePayrollHourForCalculation(data[`${rIdx}-${colIdx}`] || '0');
            totalHeuresReal += val;
            coutGlobalReal += val * realColRates[i];
            hasRealData = true;
          }
        });

        if (hasRealData) {
          data[`${rIdx}-76`] = totalHeuresReal.toFixed(2);
          data[`${rIdx}-87`] = coutGlobalReal.toFixed(2);
          if (totalHeuresReal > 0) {
            data[`${rIdx}-88`] = (realiseTotalJour / totalHeuresReal).toFixed(2);
          }
          if (realiseTotalJour > 0) {
            data[`${rIdx}-89`] = ((coutGlobalReal / realiseTotalJour) * 100).toFixed(2) + '%';
          }
          
          // Ecarts
          if (hasProjData) {
            data[`${rIdx}-91`] = (totalHeuresReal - totalHeuresProj).toFixed(2);
            if (realiseTotalJour > 0) {
              const pctReal = (coutGlobalReal / realiseTotalJour) * 100;
              const pctProj = (coutGlobalProj / realiseTotalJour) * 100;
              data[`${rIdx}-92`] = (pctReal - pctProj).toFixed(2) + '%';
            }
          }
        }

        // ECART VS N-1 — Nième occurrence du même jour de semaine dans le mois en N-1
        if (nMinus1Data && row.dateObj) {
          const n1Date = getN1TargetDate(row.dateObj);
          const n1Key = `${n1Date.getFullYear()}-${n1Date.getMonth()}-${n1Date.getDate()}`;
          const n1 = nMinus1ByDate.get(n1Key);
          if (n1) {
            const caBudgetN = parseMoneyValue(data[`${rIdx}-3`]);
            if (n1.caBudget > 0) {
              data[`${rIdx}-128`] = (caBudgetN - n1.caBudget).toFixed(2);
              data[`${rIdx}-5`] = (((caBudgetN - n1.caBudget) / n1.caBudget) * 100).toFixed(2);
            }
            const cvtsBudgetN = parseMoneyValue(data[`${rIdx}-10`]);
            if (n1.cvtsBudget > 0) {
              data[`${rIdx}-129`] = (cvtsBudgetN - n1.cvtsBudget).toFixed(2);
              data[`${rIdx}-13`] = (((cvtsBudgetN - n1.cvtsBudget) / n1.cvtsBudget) * 100).toFixed(2);
            }
            const caRealiseN = parseMoneyValue(data[`${rIdx}-21`]);
            cumulN1CA += n1.caRealise;
            // ECART VS N-1 jour vs jour (CA réalisé)
            const ecartJourCA = caRealiseN - n1.caRealise;
            data[`${rIdx}-118`] = ecartJourCA.toFixed(2);
            if (n1.caRealise > 0) data[`${rIdx}-119`] = ((ecartJourCA / n1.caRealise) * 100).toFixed(2);
            // ECART VS N-1 jour vs jour (CVTS réalisé)
            cumulN1Cvts += n1.cvtsRealise;
            const cvtsJour = parseMoneyValue(data[`${rIdx}-25`]) + parseMoneyValue(data[`${rIdx}-27`]);
            const ecartJourCvts = cvtsJour - n1.cvtsRealise;
            data[`${rIdx}-123`] = ecartJourCvts.toFixed(2);
            if (n1.cvtsRealise > 0) data[`${rIdx}-124`] = ((ecartJourCvts / n1.cvtsRealise) * 100).toFixed(2);
            // Écart budget couverts CUMUL
            data[`${rIdx}-143`] = (cumulCvtsRealise - cumulCvts).toFixed(0);
          }
        }
      }
    });

    // Mini-passage post-premier-passage : Tendance mensuelle (nécessite totalBudgetMois et totalN1Mois)
    {
      const totalBudgetMois = cumulCA;
      const totalN1Mois = cumulN1CA;
      rows.forEach((row, rIdx) => {
        if (row.type !== 'day') return;
        const cR = parseMoneyValue(data[`${rIdx}-23`]); // cumul réalisé CA
        const cB = parseMoneyValue(data[`${rIdx}-4`]);  // cumul budget CA
        if (cR === 0 || cB === 0) return;
        const tendance = cR * totalBudgetMois / cB;
        data[`${rIdx}-140`] = tendance.toFixed(2);
        if (totalBudgetMois > 0) data[`${rIdx}-141`] = ((tendance / totalBudgetMois - 1) * 100).toFixed(2);
        if (totalN1Mois > 0) data[`${rIdx}-142`] = ((tendance / totalN1Mois - 1) * 100).toFixed(2);
      });
    }

    // Second pass: Week Totals
    rows.forEach((row, rIdx) => {
      if (row.type === 'total') {
        const weekIdx = row.weekIndex;
        // Find all days in this week
        const weekDays = rows
          .map((r, idx) => ({ ...r, originalIdx: idx }))
          .filter(r => r.type === 'day' && r.weekIndex === weekIdx);

        // Sum up each column for the week
        dynamicColumns.forEach((_, cIdx) => {
          // Skip hatched columns or text columns or averages or cumul columns
          const colName = dynamicColumns[cIdx][2] || dynamicColumns[cIdx][1];
          if (dynamicColumns[cIdx][3] === 'bg-hatched' || ['DATE', 'FOURNISSEUR', 'FOURNISSEURS', 'MOTIF ACHAT', 'Nom'].includes(colName) || [7, 9, 11, 15, 4, 12, 22, 23, 26, 28, 30, 31, 32, 35, 36, 40, 42, 59, 60, 61, 73, 74, 75, 76, 88, 89, 90, 91, 92, 117, 118, 119, 121, 122, 123, 124, 127, 128, 129, 140, 141, 142, 143].includes(cIdx)) return;

          let colSum = 0;
          let hasData = false;
          weekDays.forEach(day => {
            const rawVal = data[`${day.originalIdx}-${cIdx}`] || '';
            const val = isPayrollInputColumn(cIdx) ? parsePayrollHourForCalculation(rawVal) : parseMoneyValue(rawVal);
            if (!isNaN(val) && rawVal) {
              colSum += val;
              hasData = true;
            }
          });

          data[`${rIdx}-${cIdx}`] = hasData ? colSum.toString() : '';
        });

        // Calculate averages for week
        const caMidiW = parseMoneyValue(data[`${rIdx}-0`]);
        const cvtsMidiW = parseMoneyValue(data[`${rIdx}-6`]);
        if (cvtsMidiW > 0) data[`${rIdx}-7`] = (caMidiW / cvtsMidiW).toString();

        const caSoirW = parseMoneyValue(data[`${rIdx}-1`]);
        const cvtsSoirW = parseMoneyValue(data[`${rIdx}-8`]);
        if (cvtsSoirW > 0) data[`${rIdx}-9`] = (caSoirW / cvtsSoirW).toString();

        const caJourW = caMidiW + caSoirW;
        const cvtsJourW = cvtsMidiW + cvtsSoirW;
        if (cvtsJourW > 0) data[`${rIdx}-11`] = (caJourW / cvtsJourW).toString();

        const caLimoW = parseMoneyValue(data[`${rIdx}-2`]);
        const cvtsLimoW = parseMoneyValue(data[`${rIdx}-14`]);
        if (cvtsLimoW > 0) data[`${rIdx}-15`] = (caLimoW / cvtsLimoW).toString();

        const realiseCAW = parseMoneyValue(data[`${rIdx}-21`]);
        // Moyennes semaine couverts réalisé
        const nbMidiW = parseMoneyValue(data[`${rIdx}-25`]);
        const nbSoirW = parseMoneyValue(data[`${rIdx}-27`]);
        const caMidiWr = parseMoneyValue(data[`${rIdx}-18`]);
        const caSoirWr = parseMoneyValue(data[`${rIdx}-19`]);
        if (nbMidiW > 0 && caMidiWr > 0) data[`${rIdx}-26`] = (caMidiWr / nbMidiW).toFixed(2);
        if (nbSoirW > 0 && caSoirWr > 0) data[`${rIdx}-28`] = (caSoirWr / nbSoirW).toFixed(2);
        const budgetCaW = parseMoneyValue(data[`${rIdx}-3`]);
        if (budgetCaW > 0 || realiseCAW > 0) {
          const ecartCaBudgetW = realiseCAW - budgetCaW;
          data[`${rIdx}-22`] = ecartCaBudgetW.toFixed(2);
          if (budgetCaW > 0) data[`${rIdx}-117`] = ((ecartCaBudgetW / budgetCaW) * 100).toFixed(2);
        }
        const totalCvtsRealiseW = nbMidiW + nbSoirW;
        if (totalCvtsRealiseW > 0) {
          const moyJourRealiseW = (caMidiWr + caSoirWr) / totalCvtsRealiseW;
          data[`${rIdx}-29`] = totalCvtsRealiseW.toFixed(0);
          data[`${rIdx}-30`] = moyJourRealiseW.toFixed(2);
          const budgetMoyJourW = parseMoneyValue(data[`${rIdx}-11`]);
          if (budgetMoyJourW > 0) data[`${rIdx}-31`] = (moyJourRealiseW - budgetMoyJourW).toFixed(2);
          const lastWeekDay = weekDays[weekDays.length - 1];
          if (lastWeekDay) data[`${rIdx}-32`] = data[`${lastWeekDay.originalIdx}-32`] || totalCvtsRealiseW.toFixed(0);
          const budgetCvtsW = parseMoneyValue(data[`${rIdx}-10`]) + parseMoneyValue(data[`${rIdx}-14`]);
          const ecartCvtsW = parseMoneyValue(data[`${rIdx}-33`]);
          if (budgetCvtsW > 0) data[`${rIdx}-122`] = ((ecartCvtsW / budgetCvtsW) * 100).toFixed(2);
        }
        // Démarques semaine
        const demPersonnelW = parseMoneyValue(data[`${rIdx}-39`]);
        const demOperationnelW = parseMoneyValue(data[`${rIdx}-41`]);
        if (demPersonnelW > 0 || demOperationnelW > 0) {
          data[`${rIdx}-43`] = (demPersonnelW + demOperationnelW).toFixed(2);
          if (realiseCAW > 0) {
            data[`${rIdx}-40`] = ((demPersonnelW / realiseCAW) * 100).toFixed(2) + '%';
            data[`${rIdx}-42`] = ((demOperationnelW / realiseCAW) * 100).toFixed(2) + '%';
          }
        }

        // Cout matiere semaine
        const coutMatiereW = parseMoneyValue(data[`${rIdx}-58`]);
        if (realiseCAW > 0) data[`${rIdx}-60`] = ((coutMatiereW / realiseCAW) * 100).toFixed(2) + '%';

        // Cumuls couverts complets et écarts cumulés : copier la valeur du dernier jour de la semaine
        {
          const lastWeekDay = weekDays[weekDays.length - 1];
          if (lastWeekDay) {
            [121, 127, 128, 129, 140, 141, 142, 143].forEach(c => {
              const key = `${lastWeekDay.originalIdx}-${c}`;
              if (data[key]) data[`${rIdx}-${c}`] = data[key];
            });
          }
        }

        // Écart VS N-1 total semaine — différence des totaux (appairage ISO semaine)
        {
          const n1KeyOf = (d: { dateObj?: Date }) => {
            const n1Date = getN1TargetDate(d.dateObj!);
            return `${n1Date.getFullYear()}-${n1Date.getMonth()}-${n1Date.getDate()}`;
          };

          // Prévision/budget
          const weeklyBudgetCA = parseMoneyValue(data[`${rIdx}-3`] || '');
          const weeklyN1CA = weekDays.reduce((s, d) => s + (nMinus1ByDate.get(n1KeyOf(d))?.caBudget ?? 0), 0);
          if (weeklyN1CA !== 0) {
            const ecartCA = weeklyBudgetCA - weeklyN1CA;
            data[`${rIdx}-128`] = ecartCA.toFixed(2);
            data[`${rIdx}-5`] = ((ecartCA / weeklyN1CA) * 100).toFixed(2);
          }
          const weeklyBudgetCvts = parseMoneyValue(data[`${rIdx}-10`] || '');
          const weeklyN1Cvts = weekDays.reduce((s, d) => s + (nMinus1ByDate.get(n1KeyOf(d))?.cvtsBudget ?? 0), 0);
          if (weeklyN1Cvts !== 0) {
            const ecartCvts = weeklyBudgetCvts - weeklyN1Cvts;
            data[`${rIdx}-129`] = ecartCvts.toFixed(2);
            data[`${rIdx}-13`] = ((ecartCvts / weeklyN1Cvts) * 100).toFixed(2);
          }

          // Réalisé CA
          const weeklyRealCA = parseMoneyValue(data[`${rIdx}-21`] || '');
          const weeklyN1RealCA = weekDays.reduce((s, d) => s + (nMinus1ByDate.get(n1KeyOf(d))?.caRealise ?? 0), 0);
          if (weeklyN1RealCA !== 0) {
            const ecartRealCA = weeklyRealCA - weeklyN1RealCA;
            data[`${rIdx}-118`] = ecartRealCA.toFixed(2);
            data[`${rIdx}-119`] = ((ecartRealCA / weeklyN1RealCA) * 100).toFixed(2);
          }

          // Réalisé couverts
          const weeklyRealCvts = parseMoneyValue(data[`${rIdx}-29`] || '');
          const weeklyN1RealCvts = weekDays.reduce((s, d) => s + (nMinus1ByDate.get(n1KeyOf(d))?.cvtsRealise ?? 0), 0);
          if (weeklyN1RealCvts !== 0) {
            const ecartRealCvts = weeklyRealCvts - weeklyN1RealCvts;
            data[`${rIdx}-123`] = ecartRealCvts.toFixed(2);
            data[`${rIdx}-124`] = ((ecartRealCvts / weeklyN1RealCvts) * 100).toFixed(2);
          }
        }

        // Recalcul TOTAL HEURES proj et réel pour la semaine (somme correcte des heures décimales)
        let totalHProjW2 = 0; let totalHRealW2 = 0;
        const projInputCols = isGlobalSchema ? [130,131,132,133,134] : [62,63,64,65,66,67,68,69,70,71];
        const realInputCols = isGlobalSchema ? [135,136,137,138,139] : [77,78,79,80,81,82,83,84,85,86];
        weekDays.forEach(day => {
          projInputCols.forEach(c => { totalHProjW2 += parsePayrollHourForCalculation(data[`${day.originalIdx}-${c}`] || ''); });
          realInputCols.forEach(c => { totalHRealW2 += parsePayrollHourForCalculation(data[`${day.originalIdx}-${c}`] || ''); });
        });
        if (totalHProjW2 > 0) data[`${rIdx}-61`] = totalHProjW2.toFixed(2);
        if (totalHRealW2 > 0) data[`${rIdx}-76`] = totalHRealW2.toFixed(2);

        const totalHeuresProjW = parseMoneyValue(data[`${rIdx}-61`]);
        const coutGlobalProjW = parseMoneyValue(data[`${rIdx}-72`]);
        if (totalHeuresProjW > 0) data[`${rIdx}-73`] = (realiseCAW / totalHeuresProjW).toFixed(2);
        if (realiseCAW > 0) {
          data[`${rIdx}-74`] = ((coutGlobalProjW / realiseCAW) * 100).toFixed(2) + '%';
          data[`${rIdx}-75`] = ((coutGlobalProjW / realiseCAW) * 100).toFixed(2) + '%';
        }
        
        const totalHeuresRealW = parseMoneyValue(data[`${rIdx}-76`]);
        const coutGlobalRealW = parseMoneyValue(data[`${rIdx}-87`]);
        if (totalHeuresRealW > 0) data[`${rIdx}-88`] = (realiseCAW / totalHeuresRealW).toFixed(2);
        if (realiseCAW > 0) {
          data[`${rIdx}-89`] = ((coutGlobalRealW / realiseCAW) * 100).toFixed(2) + '%';
          data[`${rIdx}-90`] = ((coutGlobalRealW / realiseCAW) * 100).toFixed(2) + '%';
        }
        
        data[`${rIdx}-91`] = (totalHeuresRealW - totalHeuresProjW).toFixed(2);
        if (realiseCAW > 0) {
          const pctRealW = (coutGlobalRealW / realiseCAW) * 100;
          const pctProjW = (coutGlobalProjW / realiseCAW) * 100;
          data[`${rIdx}-92`] = (pctRealW - pctProjW).toFixed(2) + '%';
        }
      }
    });

    // Third pass: Month Total
    const monthTotalIdx = rows.findIndex(r => r.type === 'month_total');
    if (monthTotalIdx !== -1) {
      const allDays = rows
        .map((r, idx) => ({ ...r, originalIdx: idx }))
        .filter(r => r.type === 'day');

      dynamicColumns.forEach((_, cIdx) => {
        const colName = dynamicColumns[cIdx][2] || dynamicColumns[cIdx][1];
        if (dynamicColumns[cIdx][3] === 'bg-hatched' || ['DATE', 'FOURNISSEUR', 'FOURNISSEURS', 'MOTIF ACHAT', 'Nom'].includes(colName) || [7, 9, 11, 15, 4, 12, 22, 23, 26, 28, 30, 31, 32, 35, 36, 40, 42, 59, 60, 61, 73, 74, 75, 76, 88, 89, 90, 91, 92, 117, 118, 119, 121, 122, 123, 124, 127, 128, 129, 140, 141, 142, 143].includes(cIdx)) return;

        let colSum = 0;
        let hasData = false;
        allDays.forEach(day => {
          const val = parseMoneyValue(data[`${day.originalIdx}-${cIdx}`]);
          if (!isNaN(val) && data[`${day.originalIdx}-${cIdx}`]) {
            colSum += val;
            hasData = true;
          }
        });

        data[`${monthTotalIdx}-${cIdx}`] = hasData ? colSum.toString() : '';
      });

      const lastDay = allDays[allDays.length - 1];
      if (lastDay) {
        [121, 127, 128, 129, 140, 141, 142, 143].forEach(c => {
          const key = `${lastDay.originalIdx}-${c}`;
          if (data[key]) data[`${monthTotalIdx}-${c}`] = data[key];
        });
        // Col 5 et 128 : VAR % VS N-1 prévision CA — somme des écarts jours / N-1 déduit par algèbre
        const monthlyEcartCA = allDays.reduce((s, d) => s + parseMoneyValue(data[`${d.originalIdx}-128`] || ''), 0);
        const monthlyBudgetCA = parseMoneyValue(data[`${monthTotalIdx}-3`]);
        const monthlyN1CA = monthlyBudgetCA - monthlyEcartCA;
        if (monthlyN1CA !== 0) {
          data[`${monthTotalIdx}-128`] = monthlyEcartCA.toFixed(2);
          data[`${monthTotalIdx}-5`] = ((monthlyEcartCA / monthlyN1CA) * 100).toFixed(2);
        }
        // Col 13 et 129 : VAR % VS N-1 prévision couverts — somme des écarts jours / N-1 déduit par algèbre
        const monthlyEcartCvts = allDays.reduce((s, d) => s + parseMoneyValue(data[`${d.originalIdx}-129`] || ''), 0);
        const monthlyCvtsTotal = parseMoneyValue(data[`${monthTotalIdx}-10`]);
        const monthlyN1Cvts = monthlyCvtsTotal - monthlyEcartCvts;
        if (monthlyN1Cvts !== 0) {
          data[`${monthTotalIdx}-129`] = monthlyEcartCvts.toFixed(2);
          data[`${monthTotalIdx}-13`] = ((monthlyEcartCvts / monthlyN1Cvts) * 100).toFixed(2);
        }
        // Réalisé ECART VS N-1 mois total (somme des écarts jours / N-1 déduit)
        const monthlyEcartRealCA = allDays.reduce((s, d) => s + parseMoneyValue(data[`${d.originalIdx}-118`] || ''), 0);
        const monthlyRealCA = parseMoneyValue(data[`${monthTotalIdx}-21`]);
        const monthlyN1RealCA = monthlyRealCA - monthlyEcartRealCA;
        if (monthlyN1RealCA !== 0) {
          data[`${monthTotalIdx}-118`] = monthlyEcartRealCA.toFixed(2);
          data[`${monthTotalIdx}-119`] = ((monthlyEcartRealCA / monthlyN1RealCA) * 100).toFixed(2);
        }
        const monthlyEcartRealCvts = allDays.reduce((s, d) => s + parseMoneyValue(data[`${d.originalIdx}-123`] || ''), 0);
        const monthlyRealCvts = parseMoneyValue(data[`${monthTotalIdx}-29`]);
        const monthlyN1RealCvts = monthlyRealCvts - monthlyEcartRealCvts;
        if (monthlyN1RealCvts !== 0) {
          data[`${monthTotalIdx}-123`] = monthlyEcartRealCvts.toFixed(2);
          data[`${monthTotalIdx}-124`] = ((monthlyEcartRealCvts / monthlyN1RealCvts) * 100).toFixed(2);
        }
      }

      {
        let totalHProjM = 0; let totalHRealM = 0;
        const projInputCols = isGlobalSchema ? [130,131,132,133,134] : [62,63,64,65,66,67,68,69,70,71];
        const realInputCols = isGlobalSchema ? [135,136,137,138,139] : [77,78,79,80,81,82,83,84,85,86];
        allDays.forEach(day => {
          projInputCols.forEach(c => { totalHProjM += parsePayrollHourForCalculation(data[`${day.originalIdx}-${c}`] || ''); });
          realInputCols.forEach(c => { totalHRealM += parsePayrollHourForCalculation(data[`${day.originalIdx}-${c}`] || ''); });
        });
        if (totalHProjM > 0) data[`${monthTotalIdx}-61`] = totalHProjM.toFixed(2);
        if (totalHRealM > 0) data[`${monthTotalIdx}-76`] = totalHRealM.toFixed(2);
      }

      // Calculate averages for month
      const caMidiM = parseMoneyValue(data[`${monthTotalIdx}-0`]);
      const cvtsMidiM = parseMoneyValue(data[`${monthTotalIdx}-6`]);
      if (cvtsMidiM > 0) data[`${monthTotalIdx}-7`] = (caMidiM / cvtsMidiM).toString();

      const caSoirM = parseMoneyValue(data[`${monthTotalIdx}-1`]);
      const cvtsSoirM = parseMoneyValue(data[`${monthTotalIdx}-8`]);
      if (cvtsSoirM > 0) data[`${monthTotalIdx}-9`] = (caSoirM / cvtsSoirM).toString();

      const caJourM = caMidiM + caSoirM;
      const cvtsJourM = cvtsMidiM + cvtsSoirM;
      if (cvtsJourM > 0) data[`${monthTotalIdx}-11`] = (caJourM / cvtsJourM).toString();

      const caLimoM = parseMoneyValue(data[`${monthTotalIdx}-2`]);
      const cvtsLimoM = parseMoneyValue(data[`${monthTotalIdx}-14`]);
      if (cvtsLimoM > 0) data[`${monthTotalIdx}-15`] = (caLimoM / cvtsLimoM).toString();

      const coutMatiereM = parseMoneyValue(data[`${monthTotalIdx}-58`]);
      const realiseCAM = parseMoneyValue(data[`${monthTotalIdx}-21`]);
      if (realiseCAM > 0) data[`${monthTotalIdx}-60`] = ((coutMatiereM / realiseCAM) * 100).toFixed(2) + '%';

      // Démarques mois
      const demPersonnelM = parseMoneyValue(data[`${monthTotalIdx}-39`]);
      const demOperationnelM = parseMoneyValue(data[`${monthTotalIdx}-41`]);
      if (demPersonnelM > 0 || demOperationnelM > 0) {
        data[`${monthTotalIdx}-43`] = (demPersonnelM + demOperationnelM).toFixed(2);
        if (realiseCAM > 0) {
          data[`${monthTotalIdx}-40`] = ((demPersonnelM / realiseCAM) * 100).toFixed(2) + '%';
          data[`${monthTotalIdx}-42`] = ((demOperationnelM / realiseCAM) * 100).toFixed(2) + '%';
        }
      }

      // Moyennes mois couverts réalisé
      const nbMidiM = parseMoneyValue(data[`${monthTotalIdx}-25`]);
      const nbSoirM = parseMoneyValue(data[`${monthTotalIdx}-27`]);
      const caMidiMr = parseMoneyValue(data[`${monthTotalIdx}-18`]);
      const caSoirMr = parseMoneyValue(data[`${monthTotalIdx}-19`]);
      if (nbMidiM > 0 && caMidiMr > 0) data[`${monthTotalIdx}-26`] = (caMidiMr / nbMidiM).toFixed(2);
      if (nbSoirM > 0 && caSoirMr > 0) data[`${monthTotalIdx}-28`] = (caSoirMr / nbSoirM).toFixed(2);
      const budgetCaM = parseMoneyValue(data[`${monthTotalIdx}-3`]);
      if (budgetCaM > 0 || realiseCAM > 0) {
        const ecartCaBudgetM = realiseCAM - budgetCaM;
        data[`${monthTotalIdx}-22`] = ecartCaBudgetM.toFixed(2);
        if (budgetCaM > 0) data[`${monthTotalIdx}-117`] = ((ecartCaBudgetM / budgetCaM) * 100).toFixed(2);
      }
      const totalCvtsM = nbMidiM + nbSoirM;
      if (totalCvtsM > 0) {
        const moyJourRealiseM = (caMidiMr + caSoirMr) / totalCvtsM;
        data[`${monthTotalIdx}-29`] = totalCvtsM.toFixed(0);
        data[`${monthTotalIdx}-30`] = moyJourRealiseM.toFixed(2);
        data[`${monthTotalIdx}-32`] = totalCvtsM.toFixed(0);
        const budgetMoyJourM = parseMoneyValue(data[`${monthTotalIdx}-11`]);
        if (budgetMoyJourM > 0) data[`${monthTotalIdx}-31`] = (moyJourRealiseM - budgetMoyJourM).toFixed(2);
        const budgetCvtsM = parseMoneyValue(data[`${monthTotalIdx}-10`]) + parseMoneyValue(data[`${monthTotalIdx}-14`]);
        const ecartCvtsM = parseMoneyValue(data[`${monthTotalIdx}-33`]);
        if (budgetCvtsM > 0) data[`${monthTotalIdx}-122`] = ((ecartCvtsM / budgetCvtsM) * 100).toFixed(2);
      }

      const totalHeuresProjM = parseMoneyValue(data[`${monthTotalIdx}-61`]);
      const coutGlobalProjM = parseMoneyValue(data[`${monthTotalIdx}-72`]);
      if (totalHeuresProjM > 0) data[`${monthTotalIdx}-73`] = (realiseCAM / totalHeuresProjM).toFixed(2);
      if (realiseCAM > 0) {
        data[`${monthTotalIdx}-74`] = ((coutGlobalProjM / realiseCAM) * 100).toFixed(2) + '%';
        data[`${monthTotalIdx}-75`] = ((coutGlobalProjM / realiseCAM) * 100).toFixed(2) + '%';
      }
      
      const totalHeuresRealM = parseMoneyValue(data[`${monthTotalIdx}-76`]);
      const coutGlobalRealM = parseMoneyValue(data[`${monthTotalIdx}-87`]);
      if (totalHeuresRealM > 0) data[`${monthTotalIdx}-88`] = (realiseCAM / totalHeuresRealM).toFixed(2);
      if (realiseCAM > 0) {
        data[`${monthTotalIdx}-89`] = ((coutGlobalRealM / realiseCAM) * 100).toFixed(2) + '%';
        data[`${monthTotalIdx}-90`] = ((coutGlobalRealM / realiseCAM) * 100).toFixed(2) + '%';
      }
      
      data[`${monthTotalIdx}-91`] = (totalHeuresRealM - totalHeuresProjM).toFixed(2);
      if (realiseCAM > 0) {
        const pctRealM = (coutGlobalRealM / realiseCAM) * 100;
        const pctProjM = (coutGlobalProjM / realiseCAM) * 100;
        data[`${monthTotalIdx}-92`] = (pctRealM - pctProjM).toFixed(2) + '%';
      }

      // Calculate FRAIS GENERAUX box totals
      let globalFgTotal = 0;
      for (let box = 0; box < 4; box++) {
        for (let colGroup = 0; colGroup < 3; colGroup++) {
          let boxTotal = 0;
          // Max possible data rows is around 10
          for (let dIdx = 0; dIdx < 10; dIdx++) {
            const val = parseMoneyValue(data[`fg-data-${box}-${colGroup}-${dIdx}-3`]);
            boxTotal += val;
          }
          data[`fg-total-${box}-${colGroup}`] = boxTotal.toFixed(2).replace('.', ',') + ' €';
          globalFgTotal += boxTotal;
        }
      }
      
      const fgTotalIdx = rows.findIndex(r => r.type === 'month_total');
      if (fgTotalIdx !== -1) {
        data[`${fgTotalIdx}-fraisGenerauxTotal`] = globalFgTotal.toFixed(2).replace('.', ',') + ' €';
      }
    }

    return data;
}
