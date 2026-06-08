import { parseMoneyValue, type MoneyInputValue } from '@/lib/money';
import { parseHourInputToDecimal } from '@/utils';

export type FgBoxLayout =
  | { type: 'data'; box: number; dataIdx: number }
  | { type: 'total'; box: number }
  | { type: 'header'; box: number }
  | { type: 'subheader'; box: number }
  | null;

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
  if (typeof val === 'string' && val.includes('%')) return val;

  const num = parseMoneyValue(val);
  if (Number.isNaN(num)) return val;

  const groupName = c[0];
  const subGroupName = c[1];
  const colName = c[2] || c[1];
  const isPercentage = groupName !== 'COUT MATIERE' && (colName.includes('RATIO') || colName.includes('%') || subGroupName.includes('RATIO'));
  const isCurrency = !isPercentage && (colName.includes('CA') || colName.includes('HT') || colName.includes('PANIER') || colName.includes('MONTANT') || colName.includes('â‚¬') || colName.includes('COUT')
    || subGroupName.includes('CA HT') || subGroupName.includes('ACHAT') || groupName.includes('COUT'));
  const formattedNum = Number.isInteger(num) ? num.toString() : num.toFixed(2).replace('.', ',');
  const prefix = (colName.includes('ECART') && num > 0) ? '+' : '';

  if (isPercentage) return `${prefix}${formattedNum} %`;
  return isCurrency ? `${prefix}${formattedNum} â‚¬` : `${prefix}${formattedNum}`;
};
