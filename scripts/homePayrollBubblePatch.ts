import type { Plugin } from 'vite';

const replaceRequired = (code: string, from: string, to: string, label: string) => {
  if (!code.includes(from)) throw new Error('Patch accueil cout salarial non applique : ' + label);
  return code.replace(from, to);
};

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

    const averageRate = (category: string, department: string, fallback: number) => {
      const values = ((salaries as Record<string, Array<{ coutHoraire?: string; department?: string }>>)[category] || [])
        .filter(row => !row.department || row.department === department)
        .map(row => parseValue(row.coutHoraire))
        .filter(value => value > 0);
      return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback;
    };

    const payrollColumns = [
      { col: 77, legacyCol: 91, rate: averageRate('cadre', 'cuisine', 38.54) },
      { col: 78, legacyCol: 92, rate: averageRate('cadre', 'salle', 38.54) },
      { col: 79, legacyCol: 93, rate: averageRate('maitrise', 'cuisine', 20.85) },
      { col: 80, legacyCol: 94, rate: averageRate('maitrise', 'salle', 20.85) },
      { col: 81, legacyCol: 95, rate: averageRate('niv12', 'cuisine', 16.04) },
      { col: 82, legacyCol: 96, rate: averageRate('niv12', 'salle', 16.04) },
      { col: 83, legacyCol: 97, rate: averageRate('niv3', 'cuisine', 18.35) },
      { col: 84, legacyCol: 98, rate: averageRate('niv3', 'salle', 18.35) },
      { col: 85, legacyCol: 99, rate: averageRate('apprenti', 'cuisine', 8.39) },
      { col: 86, legacyCol: 100, rate: averageRate('apprenti', 'salle', 8.39) },
    ];

    const dayStats = (day: number) => {
      const rowIndex = dashboardRowIndices[day];
      if (typeof rowIndex !== 'number') return { ca: 0, cost: 0 };
      const rowKey = String(rowIndex) + '-';
      const ca = [17, 18, 19, 20].reduce((sum, col) => sum + parseValue(dashboard[rowKey + String(col)]), 0);
      const cost = payrollColumns.reduce((sum, item) => {
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
    const formatPercent = (value: number | null) => value === null ? '-' : value.toFixed(1).replace('.', ',') + ' %';

    const currentWeekDays = weeks.find(entry => entry.week === currentWeekNumber)?.days.filter(day => day <= referenceDay) || [];
    const monthDays = Array.from({ length: referenceDay }, (_, index) => index + 1);
    const previousWeeks = weeks
      .filter(entry => entry.week < currentWeekNumber)
      .map(entry => ({ label: 'Semaine ' + entry.week, value: formatPercent(ratioForDays(entry.days)) }));
    const currentWeekRatio = ratioForDays(currentWeekDays);
    const monthRatio = ratioForDays(monthDays);
    const yesterdayRatio = yesterdayDay ? ratioForDays([yesterdayDay]) : null;

    return {
      headline: formatPercent(currentWeekRatio ?? monthRatio ?? yesterdayRatio),
      yesterday: formatPercent(yesterdayRatio),
      currentWeek: formatPercent(currentWeekRatio),
      currentWeekLabel: 'Semaine ' + currentWeekNumber,
      month: formatPercent(monthRatio),
      previousWeeks,
    };
  }, [data, month, year, dashboardRowIndices]);
`;

const payrollBubbleMarkup = `
            <section className="relative z-30 shrink-0">
              <div className="flex justify-end">
                <div className="relative w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsPayrollBubbleOpen(value => !value)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-cyan-900/10 bg-white/85 px-3 py-2 text-left shadow-sm shadow-slate-950/5 ring-1 ring-white/60 transition-all hover:bg-white hover:shadow-md sm:w-auto"
                    aria-expanded={isPayrollBubbleOpen}
                  >
                    <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-950 text-[10px] font-black text-cyan-50">S/C</span>
                      Cout salarial
                    </span>
                    <span className="text-sm font-black text-cyan-800">{payrollCostBubble.headline}</span>
                  </button>

                  {isPayrollBubbleOpen && (
                    <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-full min-w-[280px] rounded-2xl border border-cyan-900/10 bg-white p-3 shadow-2xl shadow-slate-950/20 ring-1 ring-white/70 sm:w-[340px]">
                      <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Ratio S/C</div>
                        <div className="text-xs font-bold text-slate-400">Cout / CA realise</div>
                      </div>
                      <div className="grid gap-1.5 text-sm">
                        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-2">
                          <span className="font-bold text-slate-600">Veille</span>
                          <span className="font-black text-slate-950">{payrollCostBubble.yesterday}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-cyan-50 px-2.5 py-2">
                          <span className="font-bold text-cyan-900">{payrollCostBubble.currentWeekLabel} en cours</span>
                          <span className="font-black text-cyan-900">{payrollCostBubble.currentWeek}</span>
                        </div>
                        {payrollCostBubble.previousWeeks.map(item => (
                          <div key={item.label} className="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-slate-100">
                            <span className="font-semibold text-slate-500">{item.label}</span>
                            <span className="font-black text-slate-800">{item.value}</span>
                          </div>
                        ))}
                        <div className="mt-1 flex items-center justify-between rounded-lg bg-amber-50 px-2.5 py-2">
                          <span className="font-bold text-amber-900">Mois en cours</span>
                          <span className="font-black text-amber-900">{payrollCostBubble.month}</span>
                        </div>
                      </div>
                    </div>
                  )}
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

    next = replaceRequired(
      next,
      "  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);",
      "  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);\n  const [isPayrollBubbleOpen, setIsPayrollBubbleOpen] = useState(false);",
      'etat infobulle'
    );

    next = replaceRequired(
      next,
      "  const chartDataCA = useMemo(() => {",
      payrollMemoBlock + "\n  const chartDataCA = useMemo(() => {",
      'calcul infobulle'
    );

    next = replaceRequired(
      next,
      "\n            <section className=\"home-chart-section grid flex-1 gap-3 overflow-hidden lg:min-h-0 lg:grid-cols-2 xl:gap-4\">",
      payrollBubbleMarkup + "\n            <section className=\"home-chart-section grid flex-1 gap-3 overflow-hidden lg:min-h-0 lg:grid-cols-2 xl:gap-4\">",
      'affichage infobulle'
    );

    return { code: next, map: null };
  },
});
