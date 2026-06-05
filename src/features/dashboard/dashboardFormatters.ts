export const normalizeNumberInput = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim().replace(/\s/g, '').replace(',', '.');
};

export const parseDashboardNumber = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const normalized = normalizeNumberInput(value);
  if (!normalized) return 0;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

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
