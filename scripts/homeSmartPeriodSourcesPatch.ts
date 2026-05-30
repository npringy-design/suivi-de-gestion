import type { Plugin } from 'vite';

const replaceRequired = (code: string, from: string, to: string, label: string) => {
  if (!code.includes(from)) throw new Error('Patch sources periode accueil non applique : ' + label);
  return code.replace(from, to);
};

export const homeSmartPeriodSourcesPatch = (): Plugin => ({
  name: 'home-smart-period-sources-patch',
  enforce: 'pre',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').endsWith('/src/Home.tsx')) return null;
    let next = code;

    const source = `    return { caMois, caJour, tmJour, budgetCouvert };
  }, [data, month, year, dashboardRowIndices]);`;

    const replacement = `    const buildPeriodDates = (start: Date, end: Date) => {
      const dates: Date[] = [];
      const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      let guard = 0;
      while (cursor.getTime() <= end.getTime() && guard < 400) {
        if (cursor.getFullYear() === year) dates.push(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()));
        cursor.setDate(cursor.getDate() + 1);
        guard += 1;
      }
      return dates;
    };

    const statsForDate = (date: Date) => {
      const statMonth = date.getMonth();
      const monthData = data?.[statMonth];
      const dashboardForDate = monthData?.dashboard || {};
      const rowIndex = getDashboardRowIndices(statMonth, date.getFullYear())[date.getDate()];
      if (date.getFullYear() !== year || typeof rowIndex !== 'number') return { ca: 0, budget: 0, restaurant: 0, couverts: 0 };
      const value = (colIndex: number) => parseDashboardValue(dashboardForDate[String(rowIndex) + '-' + String(colIndex)]);
      const ca = [17, 18, 19, 20].reduce((sum, col) => sum + value(col), 0);
      const savedBudget = value(3);
      const budget = savedBudget > 0 ? savedBudget : (value(0) || value(6) * value(7)) + (value(1) || value(8) * value(9)) + (value(2) || value(14) * value(15));
      return { ca, budget, restaurant: value(18) + value(19), couverts: value(25) + value(27) };
    };

    const summarizeDates = (dates: Date[]) => dates.reduce((acc, date) => {
      const stats = statsForDate(date);
      return { ca: acc.ca + stats.ca, budget: acc.budget + stats.budget, restaurant: acc.restaurant + stats.restaurant, couverts: acc.couverts + stats.couverts };
    }, { ca: 0, budget: 0, restaurant: 0, couverts: 0 });

    const todayKey = toDateInputValue(today);
    const isDefaultView = homePeriod.mode === 'day' && homePeriod.start === todayKey && homePeriod.end === todayKey;
    if (!isDefaultView) {
      const startRaw = makeLocalDate(homePeriod.start);
      const endRaw = makeLocalDate(homePeriod.end);
      const startDate = startRaw.getTime() <= endRaw.getTime() ? startRaw : endRaw;
      const endDate = startRaw.getTime() <= endRaw.getTime() ? endRaw : startRaw;
      const selectedDates = buildPeriodDates(startDate, endDate);
      const safeDates = selectedDates.length > 0 ? selectedDates : [startDate];
      const totals = summarizeDates(safeDates);
      const selectedTm = totals.couverts > 0 ? totals.restaurant / totals.couverts : 0;
      const selectedBudget = totals.budget > 0 ? (totals.ca / totals.budget) * 100 : 0;

      if (homePeriod.mode === 'year') return { caMois: totals.ca, caJour: totals.ca / 12, tmJour: selectedTm, budgetCouvert: selectedBudget };
      if (homePeriod.mode === 'day') return { caMois: totals.ca, caJour: totals.restaurant, tmJour: selectedTm, budgetCouvert: selectedBudget };
      return { caMois: totals.ca, caJour: totals.ca / Math.max(1, safeDates.length), tmJour: selectedTm, budgetCouvert: selectedBudget };
    }

    return { caMois, caJour, tmJour, budgetCouvert };
  }, [data, month, year, dashboardRowIndices, homePeriod, today]);`;

    next = replaceRequired(next, source, replacement, 'sources kpi periode');

    return { code: next, map: null };
  },
});
