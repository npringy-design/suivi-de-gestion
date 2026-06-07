import { parseMoneyValue } from '@/lib/money';

export const normalizeNumberInput = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim().replace(/\s/g, '').replace(',', '.');
};

export const parseDashboardNumber = (value: string | number | null | undefined): number => parseMoneyValue(value);

export const formatDashboardNumber = (value: number, digits = 2): string => {
  if (!Number.isFinite(value)) return '';
  return value.toFixed(digits).replace('.', ',');
};

export const formatDashboardCurrency = (value: number, digits = 2): string => {
  if (!Number.isFinite(value)) return '';
  return `${formatDashboardNumber(value, digits)} €`;
};

export const formatDashboardPercent = (value: number, digits = 2): string => {
  if (!Number.isFinite(value)) return '';
  return `${formatDashboardNumber(value, digits)}%`;
};

export const parsePercentLikeValue = (value: string | number | null | undefined): number => {
  const normalized = normalizeNumberInput(value).replace('%', '');
  if (!normalized) return 0;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};
