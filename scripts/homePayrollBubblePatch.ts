import type { Plugin } from 'vite';

const replaceRequired = (code: string, from: string, to: string, label: string) => {
  if (!code.includes(from)) throw new Error('Patch accueil cout salarial non applique : ' + label);
  return code.replace(from, to);
};

const currencyFormatSource = `const fe = (v: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(v);`;

const currencyFormatReplacement = `const fe = (v: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);`;

const kpisMemoSource = `  const kpis = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) {
      return { caMois: 0, caJour: 0, tmJour: 0, budgetCouvert: 0 };
    }

    const caMois = moisIndex >= 0 ? n(data[moisIndex]?.CA_Realise) : 0;
    const caJour = jourIndex >= 0 ? n(data[jourIndex]?.CA_Realise) : 0;
    const nbCouverts = jourIndex >= 0 ? n(data[jourIndex]?.Nombre_de_Couverts) : 0;
    const tmJour = nbCouverts > 0 ? caJour / nbCouverts : 0;

    let totalBudgetCA = 0;
    let totalRealiseCA = 0;

    for (let i = rowFirstDay; i <= rowLastDay && i < data.length; i++) {
      totalBudgetCA += n(data[i]?.CA_Budget);
      totalRealiseCA += n(data[i]?.CA_Realise);
    }

    const budgetCouvert = totalBudgetCA > 0 ? (totalRealiseCA / totalBudgetCA) * 100 : 0;

    return { caMois, caJour, tmJour, budgetCouvert };
  }, [data, moisIndex, jourIndex, rowFirstDay, rowLastDay]);`;

const kpisMemoReplacement = `  const kpis = useMemo(() => {
    const parseDashboardValue = (value: unknown) => {
      if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
      return parseFloat(String(value || '0').replace(',', '.').replace(/[^0-9.-]/g, '')) || 0;
    };
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const now = new Date();
    const selectedDay = now.getFullYear() === year && now.getMonth() === month ? Math.min(now.getDate(), daysInMonth) : 1;

    const startRaw = makeLocalDate(homePeriod.start);
    const endRaw = makeLocalDate(homePeriod.end);
    const startDate = startRaw.getTime() <= endRaw.getTime() ? startRaw : endRaw;
    const endDate = startRaw.getTime() <= endRaw.getTime() ? endRaw : startRaw;
    const periodDates: Date[] = [];
    const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    let guard = 0;

    while (cursor.getTime() <= endDate.getTime() && guard < 400) {
      if (cursor.getFullYear() === year) {
        periodDates.push(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()));
      }
      cursor.setDate(cursor.getDate() + 1);
      guard += 1;
    }

    const selectedDates = periodDates.length > 0 ? periodDates : [new Date(year, month, selectedDay)];

    const statsForDate = (date: Date) => {
      const statMonth = date.getMonth();
      const monthData = data?.[statMonth];
      const dashboard = monthData?.dashboard || {};
      const rowIndex = getDashboardRowIndices(statMonth, year)[date.getDate()];
      if (typeof rowIndex !== 'number') return { ca: 0, budget: 0, restaurant: 0, couverts: 0 };

      const value = (colIndex: number) => parseDashboardValue(dashboard[String(rowIndex) + '-' + String(colIndex)]);
      const ca = [17, 18, 19, 20].reduce((sum, col) => sum + value(col), 0);
      const savedBudget = value(3);
      const budget = savedBudget > 0
        ? savedBudget
        : (value(0) || value(6) * value(7)) + (value(1) || value(8) * value(9)) + (value(2) || value(14) * value(15));
      return {
        ca,
        budget,
        restaurant: value(18) + value(19),
        couverts: value(25) + value(27),
      };
    };

    const totals = selectedDates.reduce((acc, date) => {
      const stats = statsForDate(date);
      return {
        ca: acc.ca + stats.ca,
        budget: acc.budget + stats.budget,
        restaurant: acc.restaurant + stats.restaurant,
        couverts: acc.couverts + stats.couverts,
      };
    }, { ca: 0, budget: 0, restaurant: 0, couverts: 0 });

    const caMois = totals.ca;
    const caJour = selectedDates.length === 1 ? totals.ca : totals.ca / selectedDates.length;
    const tmJour = totals.couverts > 0 ? totals.restaurant / totals.couverts : 0;
    const budgetCouvert = totals.budget > 0 ? (totals.ca / totals.budget) * 100 : 0;

    return { caMois, caJour, tmJour, budgetCouvert };
  }, [data, month, year, homePeriod]);`;

const chartDataCASource = `  const chartDataCA = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return [];

    const res = [];
    for (let i = rowFirstDay; i <= rowLastDay && i < data.length; i++) {
      const jour = data[i]?.Jour || '';
      const caReal = n(data[i]?.CA_Realise);
      const caBudg = n(data[i]?.CA_Budget);
      res.push({ name: jour, CA_Realise: caReal, CA_Budget: caBudg });
    }
    return res;
  }, [data, rowFirstDay, rowLastDay]);`;

const chartDataCAReplacement = `  const chartDataCA = useMemo(() => {
    const parseDashboardValue = (value: unknown) => {
      if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
      return parseFloat(String(value || '0').replace(',', '.').replace(/[^0-9.-]/g, '')) || 0;
    };
    const startRaw = makeLocalDate(homePeriod.start);
    const endRaw = makeLocalDate(homePeriod.end);
    const startDate = startRaw.getTime() <= endRaw.getTime() ? startRaw : endRaw;
    const endDate = startRaw.getTime() <= endRaw.getTime() ? endRaw : startRaw;
    const rows: Array<{ name: string; CA_Realise: number; CA_Budget: number }> = [];
    const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    let guard = 0;

    while (cursor.getTime() <= endDate.getTime() && guard < 400) {
      if (cursor.getFullYear() === year) {
        const statMonth = cursor.getMonth();
        const monthData = data?.[statMonth];
        const dashboard = monthData?.dashboard || {};
        const rowIndex = getDashboardRowIndices(statMonth, year)[cursor.getDate()];

        if (typeof rowIndex === 'number') {
          const value = (colIndex: number) => parseDashboardValue(dashboard[String(rowIndex) + '-' + String(colIndex)]);
          const caReal = [17, 18, 19, 20].reduce((sum, col) => sum + value(col), 0);
          const savedBudget = value(3);
          const caBudget = savedBudget > 0
            ? savedBudget
            : (value(0) || value(6) * value(7)) + (value(1) || value(8) * value(9)) + (value(2) || value(14) * value(15));
          rows.push({
            name: cursor.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
            CA_Realise: caReal,
            CA_Budget: caBudget,
          });
        }
      }
      cursor.setDate(cursor.getDate() + 1);
      guard += 1;
    }

    return rows;
  }, [data, year, homePeriod]);`;

const payrollMemoBlock = `
  const payrollCostBubble = useMemo(() => {
    const monthData = data?.[month];
    const dashboard = monthData?.dashboard || {};
    const salaries = monthData?.salariesConfig?.categories || {};
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const now = new Date();
    const isSelectedCurrentMonth = now.getFullYear() === year && now.getMonth() === month;
    const referenceDay = isSelectedCurrentMonth ? Math.min(now.getDate(), daysInMonth) : daysInMonth;

    const parseValue = (value: unknown) => {
      if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
      return parseFloat(String(value || '0').replace(',', '.').replace(/[^0-9.-]/g, '')) || 0;
    };

    const parseHour = (value: unknown) => {
      if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
      const raw = String(value || '').trim().toLowerCase().replace(/\\s+/g, '');
      if (!raw) return 0;
      const hourMatch = raw.match(/^(\\d+)(?:h|:)(\\d{0,2})?$/);
      if (hourMatch) return Math.round((Number(hourMatch[1]) + Number(hourMatch[2] || 0) / 60) * 100) / 100;
      const separatorMatch = raw.match(/^(\\d+)([,.])(\\d{1,2})$/);
      if (separatorMatch) {
        const rightPart = separatorMatch[3];
        const minutes = Number(rightPart);
        if (rightPart.length === 2 && minutes <= 59) return Math.round((Number(separatorMatch[1]) + minutes / 60) * 100) / 100;
      }
      return parseFloat(raw.replace(',', '.')) || 0;
    };

    const averageRate = (category: string, department: string) => {
      const rows = ((salaries as Record<string, Array<{ heures?: string; coutGlobal?: string; department?: string }>>)[category] || [])
        .filter(row => !row.department || row.department === department);
      const rates = rows
        .map(row => {
          const heures = parseHour(row.heures);
          const coutGlobal = parseValue(row.coutGlobal);
          const multiplier = category === 'cadre' ? 1.18 : 1.10;
          return heures > 0 && coutGlobal > 0 ? (coutGlobal * multiplier) / heures : 0;
        })
        .filter(rate => rate > 0);
      return rates.length > 0 ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length : 0;
    };

    const payrollColumns = [
      { col: 77, legacyCol: 91, rate: averageRate('cadre', 'cuisine') },
      { col: 78, legacyCol: 92, rate: averageRate('cadre', 'salle') },
      { col: 79, legacyCol: 93, rate: averageRate('maitrise', 'cuisine') },
      { col: 80, legacyCol: 94, rate: averageRate('maitrise', 'salle') },
      { col: 81, legacyCol: 95, rate: averageRate('niv12', 'cuisine') },
      { col: 82, legacyCol: 96, rate: averageRate('niv12', 'salle') },
      { col: 83, legacyCol: 97, rate: averageRate('niv3', 'cuisine') },
      { col: 84, legacyCol: 98, rate: averageRate('niv3', 'salle') },
      { col: 85, legacyCol: 99, rate: averageRate('apprenti', 'cuisine') },
      { col: 86, legacyCol: 100, rate: averageRate('apprenti', 'salle') },
    ];

    const dayStats = (day: number) => {
      const rowIndex = dashboardRowIndices[day];
      if (typeof rowIndex !== 'number') return { ca: 0, cost: 0 };
      const rowKey = String(rowIndex) + '-';
      const ca = [17, 18, 19, 20].reduce((sum, col) => sum + parseValue(dashboard[rowKey + String(col)]), 0);
      const cost = payrollColumns.reduce((sum, item) => {
        if (item.rate <= 0) return sum;
        const value = dashboard[rowKey + String(item.col)] || dashboard[rowKey + String(item.legacyCol)] || '';
        return sum + parseHour(value) * item.rate;
      }, 0);
      return { ca, cost };
    };

    const ratioForDays = (days: number[]) => {
      const totals = days.reduce((acc, day) => {
        const stats = dayStats(day);
        return { ca: acc.ca + stats.ca, cost: acc.cost + stats.cost };
      }, { ca: 0, cost: 0 });
      if (totals.ca <= 0 || totals.cost <= 0) return null;
      return (totals.cost / totals.ca) * 100;
    };

    const weekNumberForDay = (targetDay: number) => {
      let weekNumber = 1;
      for (let day = 1; day <= daysInMonth; day += 1) {
        if (day === targetDay) return weekNumber;
        if (new Date(year, month, day).getDay() === 0) weekNumber += 1;
      }
      return weekNumber;
    };

    const weeks: Array<{ week: number; days: number[] }> = [];
    for (let day = 1; day <= daysInMonth; day += 1) {
      const week = weekNumberForDay(day);
      let item = weeks.find(entry => entry.week === week);
      if (!item) {
        item = { week, days: [] };
        weeks.push(item);
      }
      item.days.push(day);
    }

    const currentWeekNumber = weekNumberForDay(referenceDay);
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(now.getDate() - 1);
    const yesterdayDay = yesterdayDate.getFullYear() === year && yesterdayDate.getMonth() === month ? yesterdayDate.getDate() : null;
    const formatPercent = (value: number | null) => value === null ? '-' : value.toFixed(2).replace('.', ',') + ' %';

    const currentWeekDays = weeks.find(entry => entry.week === currentWeekNumber)?.days.filter(day => day <= referenceDay) || [];
    const monthDays = Array.from({ length: referenceDay }, (_, index) => index + 1);
    const previousWeeks = weeks
      .filter(entry => entry.week < currentWeekNumber)
      .map(entry => ({ label: 'Semaine ' + entry.week, value: formatPercent(ratioForDays(entry.days)) }));
    const currentWeekRatio = ratioForDays(currentWeekDays);
    const monthRatio = ratioForDays(monthDays);
    const yesterdayRatio = yesterdayDay ? ratioForDays([yesterdayDay]) : null;
    const weekRows = [
      ...previousWeeks,
      { label: 'Semaine ' + currentWeekNumber + ' en cours', value: formatPercent(currentWeekRatio) },
    ];

    return {
      headline: formatPercent(currentWeekRatio ?? monthRatio ?? yesterdayRatio),
      yesterday: formatPercent(yesterdayRatio),
      currentWeek: formatPercent(currentWeekRatio),
      currentWeekLabel: 'Semaine ' + currentWeekNumber,
      month: formatPercent(monthRatio),
      previousWeeks,
      weekRows,
    };
  }, [data, month, year, dashboardRowIndices]);
`;

const payrollTileMarkup = `
            <section className="shrink-0">
              <div className="home-summary-card group relative min-h-[112px] overflow-hidden rounded-2xl border border-cyan-200/25 bg-gradient-to-br from-[#061f28] via-[#073846] to-[#0b5a62] p-[clamp(0.8rem,1vw,1.15rem)] shadow-sm shadow-slate-950/10 backdrop-blur-sm transition-all duration-500 hover:border-cyan-200/50 hover:shadow-xl hover:shadow-cyan-950/20">
                <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-cyan-200/10 blur-2xl" />
                <div className="relative grid gap-3 lg:grid-cols-[minmax(250px,0.9fr)_minmax(300px,1.1fr)] lg:items-stretch">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    <div className="rounded-xl border border-cyan-100/20 bg-cyan-950/25 px-3 py-2 ring-1 ring-white/5">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/70">S/C Veille</div>
                      <div className="mt-1 text-[clamp(1.7rem,2.1vw,2.25rem)] font-black leading-none text-amber-50 drop-shadow-sm">
                        {payrollCostBubble.yesterday}
                      </div>
                    </div>
                    <div className="rounded-xl border border-cyan-100/20 bg-cyan-950/25 px-3 py-2 ring-1 ring-white/5">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/70">S/C Mois</div>
                      <div className="mt-1 text-[clamp(1.7rem,2.1vw,2.25rem)] font-black leading-none text-amber-50 drop-shadow-sm">
                        {payrollCostBubble.month}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-cyan-100/20 bg-white/8 px-3 py-2 ring-1 ring-white/10">
                    <div className="mb-2 flex items-center justify-between gap-3 border-b border-cyan-100/20 pb-2">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/75">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-300/10 text-[10px] text-cyan-50 ring-1 ring-cyan-100/20">S/C</span>
                        Semaine
                      </div>
                      <div className="text-sm font-black text-amber-50">{payrollCostBubble.headline}</div>
                    </div>
                    <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
                      {payrollCostBubble.weekRows.map(item => (
                        <div key={item.label} className="flex items-center justify-between gap-2 rounded-lg bg-cyan-950/25 px-2.5 py-1.5 ring-1 ring-cyan-100/10">
                          <span className="truncate text-[11px] font-bold text-cyan-50/75">{item.label}</span>
                          <span className="shrink-0 text-[12px] font-black text-amber-50">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
`;

export const homePayrollBubblePatch = (): Plugin => ({
  name: 'home-payroll-bubble-patch',
  enforce: 'pre',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').endsWith('/src/Home.tsx')) return null;
    let next = code;

    next = replaceRequired(next, currencyFormatSource, currencyFormatReplacement, 'format euros centimes');
    next = replaceRequired(next, kpisMemoSource, kpisMemoReplacement, 'kpi accueil depuis dashboard');
    next = replaceRequired(next, chartDataCASource, chartDataCAReplacement, 'graphique ca depuis dashboard');

    next = replaceRequired(
      next,
      "  const chartDataCA = useMemo(() => {",
      payrollMemoBlock + "\n  const chartDataCA = useMemo(() => {",
      'calcul tuile'
    );

    next = replaceRequired(
      next,
      "\n            <section className=\"home-chart-section grid flex-1 gap-3 overflow-hidden lg:min-h-0 lg:grid-cols-2 xl:gap-4\">",
      payrollTileMarkup + "\n            <section className=\"home-chart-section grid flex-1 gap-3 overflow-hidden lg:min-h-0 lg:grid-cols-2 xl:gap-4\">",
      'affichage tuile'
    );

    return { code: next, map: null };
  },
});
