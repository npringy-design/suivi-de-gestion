export const getDashboardRowIndices = (month: number, year: number) => {
  const numDays = new Date(year, month + 1, 0).getDate();
  const indices: Record<number, number> = {};
  let rIdx = 0;
  let weekCount = 1;

  for (let i = 1; i <= numDays; i++) {
    const date = new Date(year, month, i);
    indices[i] = rIdx;
    rIdx++;
    
    if (date.getDay() === 0) {
      rIdx++; // Skip total row
      weekCount++;
    }
  }
  return indices;
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
