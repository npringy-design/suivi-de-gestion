export type MoneyInputValue = string | number | null | undefined;

export const parseMoneyValue = (value: MoneyInputValue): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  const rawValue = String(value ?? '').trim();
  if (!rawValue) return 0;

  const normalizedValue = rawValue
    .replace(/\s/g, '')
    .replace(/€/g, '')
    .replace(',', '.');

  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

export const sanitizeMoneyInput = (value: string): string => value.replace(/[^0-9.,-]/g, '');

export const formatCurrencyFr = (value: MoneyInputValue): string =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(parseMoneyValue(value));

export const formatNullableCurrencyFr = (value: MoneyInputValue, emptyValue = '-'): string => {
  const parsedValue = parseMoneyValue(value);
  return parsedValue !== 0 ? formatCurrencyFr(parsedValue) : emptyValue;
};
