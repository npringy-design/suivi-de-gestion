import type { DashboardColumn } from './dashboardTypes';

export const isDashboardVarianceColumn = (column: DashboardColumn, originalIndex?: number): boolean => {
  const [, groupLabel, columnLabel] = column;
  return (
    groupLabel.includes('ECART')
    || columnLabel.includes('ECART')
    || (typeof originalIndex === 'number' && [22, 31, 33, 117, 122].includes(originalIndex))
  );
};

export const isDashboardHatchedColumn = (column: DashboardColumn): boolean => column[3] === 'bg-hatched';

export const isDashboardEventColumn = (column: DashboardColumn): boolean => (
  column[0] === 'EVENEMENTS RESTAURANTS' || column[0] === 'EVENEMENTS NATIONAL'
);

export const isDashboardSupplierEditableColumn = (originalIndex: number): boolean => originalIndex >= 45 && originalIndex <= 57;

export const getDashboardCellVarianceTone = (value: string | number | null | undefined): 'positive' | 'negative' | 'neutral' => {
  const parsed = typeof value === 'number'
    ? value
    : Number.parseFloat(String(value ?? '').replace(',', '.'));

  if (!Number.isFinite(parsed) || parsed === 0) return 'neutral';
  return parsed > 0 ? 'positive' : 'negative';
};
