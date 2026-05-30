import type { Plugin } from 'vite';

const replaceRequired = (code: string, from: string, to: string, label: string) => {
  if (!code.includes(from)) throw new Error('Patch KPI periode accueil non applique : ' + label);
  return code.replace(from, to);
};

const replaceBetweenRequired = (code: string, start: string, end: string, replacement: string, label: string) => {
  const startIndex = code.indexOf(start);
  if (startIndex < 0) throw new Error('Patch KPI periode accueil non applique : debut ' + label);
  const endIndex = code.indexOf(end, startIndex);
  if (endIndex < 0) throw new Error('Patch KPI periode accueil non applique : fin ' + label);
  return code.slice(0, startIndex) + replacement + code.slice(endIndex);
};

const kpisMemoReplacement = `  const kpis = useMemo(() => {
    const monthData = data?.[month];
    const dashboard = monthData?.dashboard || {};
    const parseDashboardValue = (value: unknown) => {
      if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
      return parseFloat(String(value || '0').replace(',', '.').replace(/[^0-9.-]/g, '')) || 0;
    };
    const dashboardValue = (rowIndex: number, colIndex: number) => parseDashboardValue(dashboard[String(rowIndex) + '-' + String(colIndex)]);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDate = makeLocalDate(homePeriod.start);
    const endDate = makeLocalDate(homePeriod.end);
    const periodStart = startDate.getTime() <= endDate.getTime() ? startDate : endDate;
    const periodEnd = startDate.getTime() <= endDate.getTime() ? endDate : startDate;
    const fromDay = periodStart.getFullYear() === year && periodStart.getMonth() === month ? periodStart.getDate() : 1;
    const toDay = periodEnd.getFullYear() === year && periodEnd.getMonth() === month ? periodEnd.getDate() : daysInMonth;
    const firstDay = Math.max(1, Math.min(fromDay, daysInMonth));
    const lastDay = Math.max(firstDay, Math.min(toDay, daysInMonth));
    const dayCount = Math.max(1, lastDay - firstDay + 1);

    const realisedDayCA = (day: number) => {
      const rowIndex = dashboardRowIndices[day];
      if (typeof rowIndex !== 'number') return 0;
      return [17, 18, 19, 20].reduce((sum, col) => sum + dashboardValue(rowIndex, col), 0);
    };
    const budgetDayCA = (day: number) => {
      const rowIndex = dashboardRowIndices[day];
      if (typeof rowIndex !== 'number') return 0;
      const savedTotal = dashboardValue(rowIndex, 3);
      if (savedTotal > 0) return savedTotal;
      const caMidi = dashboardValue(rowIndex, 0) || dashboardValue(rowIndex, 6) * dashboardValue(rowIndex, 7);
      const caSoir = dashboardValue(rowIndex, 1) || dashboardValue(rowIndex, 8) * dashboardValue(rowIndex, 9);
      const caLimo = dashboardValue(rowIndex, 2) || dashboardValue(rowIndex, 14) * dashboardValue(rowIndex, 15);
      return caMidi + caSoir + caLimo;
    };

    let caMois = 0;
    let totalBudgetCA = 0;
    let caRestaurant = 0;
    let totalCouverts = 0;
    for (let day = firstDay; day <= lastDay; day += 1) {
      caMois += realisedDayCA(day);
      totalBudgetCA += budgetDayCA(day);
      const rowIndex = dashboardRowIndices[day];
      if (typeof rowIndex === 'number') {
        caRestaurant += dashboardValue(rowIndex, 18) + dashboardValue(rowIndex, 19);
        totalCouverts += dashboardValue(rowIndex, 25) + dashboardValue(rowIndex, 27);
      }
    }

    const caJour = dayCount === 1 ? caMois : caMois / dayCount;
    const tmJour = totalCouverts > 0 ? caRestaurant / totalCouverts : 0;
    const budgetCouvert = totalBudgetCA > 0 ? (caMois / totalBudgetCA) * 100 : 0;

    return { caMois, caJour, tmJour, budgetCouvert, dayCount };
  }, [data, month, year, dashboardRowIndices, homePeriod]);

`;

const chartDataCAReplacement = `  const chartDataCA = useMemo(() => {
    const monthData = data?.[month];
    const dashboard = monthData?.dashboard || {};
    const parseDashboardValue = (value: unknown) => {
      if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
      return parseFloat(String(value || '0').replace(',', '.').replace(/[^0-9.-]/g, '')) || 0;
    };
    const dashboardValue = (rowIndex: number, colIndex: number) => parseDashboardValue(dashboard[String(rowIndex) + '-' + String(colIndex)]);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDate = makeLocalDate(homePeriod.start);
    const endDate = makeLocalDate(homePeriod.end);
    const periodStart = startDate.getTime() <= endDate.getTime() ? startDate : endDate;
    const periodEnd = startDate.getTime() <= endDate.getTime() ? endDate : startDate;
    const fromDay = periodStart.getFullYear() === year && periodStart.getMonth() === month ? periodStart.getDate() : 1;
    const toDay = periodEnd.getFullYear() === year && periodEnd.getMonth() === month ? periodEnd.getDate() : daysInMonth;
    const firstDay = Math.max(1, Math.min(fromDay, daysInMonth));
    const lastDay = Math.max(firstDay, Math.min(toDay, daysInMonth));
    const rows = [];

    for (let day = firstDay; day <= lastDay; day += 1) {
      const rowIndex = dashboardRowIndices[day];
      if (typeof rowIndex !== 'number') continue;
      const caReal = [17, 18, 19, 20].reduce((sum, col) => sum + dashboardValue(rowIndex, col), 0);
      const savedBudget = dashboardValue(rowIndex, 3);
      const caBudget = savedBudget > 0
        ? savedBudget
        : (dashboardValue(rowIndex, 0) || dashboardValue(rowIndex, 6) * dashboardValue(rowIndex, 7))
          + (dashboardValue(rowIndex, 1) || dashboardValue(rowIndex, 8) * dashboardValue(rowIndex, 9))
          + (dashboardValue(rowIndex, 2) || dashboardValue(rowIndex, 14) * dashboardValue(rowIndex, 15));
      rows.push({ name: String(day), CA_Realise: caReal, CA_Budget: caBudget });
    }

    return rows;
  }, [data, month, year, dashboardRowIndices, homePeriod]);

`;

export const homePeriodKpiPatch = (): Plugin => ({
  name: 'home-period-kpi-patch',
  enforce: 'pre',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').endsWith('/src/Home.tsx')) return null;
    let next = code;

    next = replaceBetweenRequired(next, '  const kpis = useMemo(() => {', '  const payrollCostBubble = useMemo(() => {', kpisMemoReplacement + '  const payrollCostBubble = useMemo(() => {', 'calcul kpi');
    next = replaceBetweenRequired(next, '  const chartDataCA = useMemo(() => {', '  const chartDataFG = useMemo(() => {', chartDataCAReplacement + '  const chartDataFG = useMemo(() => {', 'graphique ca');
    next = replaceRequired(next, 'label="CA veille"', 'label={kpis.dayCount === 1 ? "CA sélection" : "CA moy. / jour"}', 'libelle ca selection');
    next = replaceRequired(next, 'label="TM veille"', 'label={kpis.dayCount === 1 ? "TM sélection" : "TM période"}', 'libelle tm selection');
    next = replaceRequired(next, 'Réalisé vs Budget mensuel', 'Réalisé vs Budget sélection', 'sous titre graphique ca');

    return { code: next, map: null };
  },
});
