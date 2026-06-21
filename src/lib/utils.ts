export const getDashboardRowIndices = (month: number, year: number) => {
  const numDays = new Date(year, month + 1, 0).getDate();
  const indices: Record<number, number> = {};
  let rIdx = 0;

  for (let i = 1; i <= numDays; i++) {
    const date = new Date(year, month, i);
    indices[i] = rIdx;
    rIdx++;

    if (date.getDay() === 0) {
      rIdx++; // Skip total row
    }
  }
  return indices;
};

export const parseHourInputToDecimal = (value: string | number) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  const rawValue = (value || '').trim().toLowerCase();
  if (!rawValue) return 0;

  const normalizedValue = rawValue.replace(/\s+/g, '');
  const hourMinuteMatch = normalizedValue.match(/^(\d+)(?:h|:)(\d{0,2})?$/);
  if (hourMinuteMatch) {
    const hours = Number(hourMinuteMatch[1]);
    const minutes = Number(hourMinuteMatch[2] || 0);
    return Math.round((hours + minutes / 60) * 10000) / 10000;
  }

  const separatorMatch = normalizedValue.match(/^(\d+)([,.])(\d{1,2})$/);
  if (separatorMatch) {
    const hours = Number(separatorMatch[1]);
    const rightPart = separatorMatch[3];
    const minutes = Number(rightPart);

    if (rightPart.length === 2 && minutes <= 59) {
      return Math.round((hours + minutes / 60) * 10000) / 10000;
    }
  }

  return parseFloat(normalizedValue.replace(',', '.')) || 0;
};

export const getISOWeek = (date: Date) => {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
};
