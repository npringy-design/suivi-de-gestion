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

const useDataSource = `  const { data, selectedYear, setSelectedYear, selectedMonth, setSelectedMonth } = useData();`;
const useDataReplacement = `  const { data, allData, selectedYear, setSelectedYear, selectedMonth, setSelectedMonth } = useData();`;

const metricsBlock = `  const kpis = useMemo(() => {
    const startRaw = makeLocalDate(homePeriod.start);
    const endRaw = makeLocalDate(homePeriod.end);
    const startDate = startRaw.getTime() <= endRaw.getTime() ? startRaw : endRaw;
    const endDate = startRaw.getTime() <= endRaw.getTime() ? endRaw : startRaw;
    const periodDays: Date[] = [];
    const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    let guard = 0;

    while (cursor.getTime() <= endDate.getTime() && guard < 800) {
      periodDays.push(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()));
      cursor.setDate(cursor.getDate() + 1);
      guard += 1;
    }

    const selectedDays = periodDays.length > 0 ? periodDays : [new Date(year, month, 1)];
    const parseDashboardValue = (value: unknown) => {
      if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
      return parseFloat(String(value || '0').replace(',', '.').replace(/[^0-9.-]/g, '')) || 0;
    };

    const dayStats = (date: Date) => {
      const statYear = date.getFullYear();
      const statMonth = date.getMonth();
      const yearData = allData?.[statYear] || (statYear === year ? data : {});
      const dashboard = yearData?.[statMonth]?.dashboard || {};
      const rowIndex = getDashboardRowIndices(statMonth, statYear)[date.getDate()];
      if (typeof rowIndex !== 'number') return { realised: 0, budget: 0, restaurant: 0, couverts: 0 };

      const value = (col: number) => parseDashboardValue(dashboard[String(rowIndex) + '-' + String(col)]);
      const realised = [17, 18, 19, 20].reduce((sum, col) => sum + value(col), 0);
      const savedBudget = value(3);
      const budget = savedBudget > 0
        ? savedBudget
        : (value(0) || value(6) * value(7)) + (value(1) || value(8) * value(9)) + (value(2) || value(14) * value(15));
      const restaurant = value(18) + value(19);
      const couverts = value(25) + value(27);
      return { realised, budget, restaurant, couverts };
    };

    const totals = selectedDays.reduce((acc, date) => {
      const stats = dayStats(date);
      return {
        realised: acc.realised + stats.realised,
        budget: acc.budget + stats.budget,
        restaurant: acc.restaurant + stats.restaurant,
        couverts: acc.couverts + stats.couverts,
      };
    }, { realised: 0, budget: 0, restaurant: 0, couverts: 0 });

    const isSingleDay = selectedDays.length === 1;
    const caJour = isSingleDay ? totals.realised : totals.realised / selectedDays.length;
    const tmJour = totals.couverts > 0 ? totals.restaurant / totals.couverts : 0;
    const budgetCouvert = totals.budget > 0 ? (totals.realised / totals.budget) * 100 : 0;

    return {
      caMois: totals.realised,
      caJour,
      tmJour,
      budgetCouvert,
      focusLabel: isSingleDay ? 'CA sélection' : 'CA moy. / jour',
      ticketLabel: isSingleDay ? 'TM sélection' : 'TM période',
      totalDescription: isSingleDay ? 'Performance de la date sélectionnée' : 'Performance cumulée de la période sélectionnée',
      focusDescription: isSingleDay ? 'Résultat de la date sélectionnée' : 'Moyenne journalière de la période sélectionnée',
      ticketDescription: isSingleDay ? 'Valeur moyenne par couvert de la date sélectionnée' : 'Valeur moyenne par couvert sur la période sélectionnée',
      budgetDescription: isSingleDay ? 'Taux d’atteinte du budget de la date sélectionnée' : 'Taux d’atteinte du budget de la période sélectionnée',
    };
  }, [allData, data, homePeriod, month, year]);

  const payrollCostBubble = useMemo(() => {
    const startRaw = makeLocalDate(homePeriod.start);
    const endRaw = makeLocalDate(homePeriod.end);
    const startDate = startRaw.getTime() <= endRaw.getTime() ? startRaw : endRaw;
    const endDate = startRaw.getTime() <= endRaw.getTime() ? endRaw : startRaw;
    const periodDays: Date[] = [];
    const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    let guard = 0;

    while (cursor.getTime() <= endDate.getTime() && guard < 800) {
      periodDays.push(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()));
      cursor.setDate(cursor.getDate() + 1);
      guard += 1;
    }

    const selectedDays = periodDays.length > 0 ? periodDays : [new Date(year, month, 1)];
    const isSingleDay = selectedDays.length === 1;

    const parseValue = (value: unknown) => {
      if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
      return parseFloat(String(value || '0').replace(',', '.').replace(/[^0-9.-]/g, '')) || 0;
    };

    const parseHour = (value: unknown) => {
      if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
      const raw = String(value || '').trim().toLowerCase().replace(/\s+/g, '');
      if (!raw) return 0;
      const hourMatch = raw.match(/^(\d+)(?:h|:)(\d{0,2})?$/);
      if (hourMatch) return Math.round((Number(hourMatch[1]) + Number(hourMatch[2] || 0) / 60) * 100) / 100;
      const separatorMatch = raw.match(/^(\d+)([,.])(\d{1,2})$/);
      if (separatorMatch) {
        const rightPart = separatorMatch[3];
        const minutes = Number(rightPart);
        if (rightPart.length === 2 && minutes <= 59) return Math.round((Number(separatorMatch[1]) + minutes / 60) * 100) / 100;
      }
      return parseFloat(raw.replace(',', '.')) || 0;
    };

    const getYearData = (targetYear: number) => allData?.[targetYear] || (targetYear === year ? data : {});
    const provisionMultiplier = (category: string) => category === 'cadre' ? 1.18 : 1.10;

    const averageRate = (monthData: any, category: string, department: string) => {
      const salaries = monthData?.salariesConfig?.categories || {};
      const rows = ((salaries as Record<string, Array<{ heures?: string; coutGlobal?: string; department?: string }>>)[category] || [])
        .filter(row => !row.department || row.department === department);
      const rates = rows
        .map(row => {
          const heures = parseHour(row.heures);
          const coutGlobal = parseValue(row.coutGlobal);
          return heures > 0 && coutGlobal > 0 ? (coutGlobal * provisionMultiplier(category)) / heures : 0;
        })
        .filter(rate => rate > 0);
      return rates.length > 0 ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length : 0;
    };

    const dayStats = (date: Date) => {
      const statYear = date.getFullYear();
      const statMonth = date.getMonth();
      const monthData = getYearData(statYear)?.[statMonth];
      const dashboard = monthData?.dashboard || {};
      const rowIndex = getDashboardRowIndices(statMonth, statYear)[date.getDate()];
      if (typeof rowIndex !== 'number') return { ca: 0, cost: 0 };

      const rowKey = String(rowIndex) + '-';
      const ca = [17, 18, 19, 20].reduce((sum, col) => sum + parseValue(dashboard[rowKey + String(col)]), 0);
      const payrollColumns = [
        { category: 'cadre', department: 'cuisine', col: 77, legacyCol: 91 },
        { category: 'cadre', department: 'salle', col: 78, legacyCol: 92 },
        { category: 'maitrise', department: 'cuisine', col: 79, legacyCol: 93 },
        { category: 'maitrise', department: 'salle', col: 80, legacyCol: 94 },
        { category: 'niv12', department: 'cuisine', col: 81, legacyCol: 95 },
        { category: 'niv12', department: 'salle', col: 82, legacyCol: 96 },
        { category: 'niv3', department: 'cuisine', col: 83, legacyCol: 97 },
        { category: 'niv3', department: 'salle', col: 84, legacyCol: 98 },
        { category: 'apprenti', department: 'cuisine', col: 85, legacyCol: 99 },
        { category: 'apprenti', department: 'salle', col: 86, legacyCol: 100 },
      ];
      const cost = payrollColumns.reduce((sum, item) => {
        const rate = averageRate(monthData, item.category, item.department);
        if (rate <= 0) return sum;
        const value = dashboard[rowKey + String(item.col)] || dashboard[rowKey + String(item.legacyCol)] || '';
        return sum + parseHour(value) * rate;
      }, 0);
      return { ca, cost };
    };

    const ratioForDates = (dates: Date[]) => {
      const totals = dates.reduce((acc, date) => {
        const stats = dayStats(date);
        return { ca: acc.ca + stats.ca, cost: acc.cost + stats.cost };
      }, { ca: 0, cost: 0 });
      if (totals.ca <= 0 || totals.cost <= 0) return null;
      return (totals.cost / totals.ca) * 100;
    };

    const formatPercent = (value: number | null) => value === null ? '-' : value.toFixed(2).replace('.', ',') + ' %';
    const selectedRatio = ratioForDates(selectedDays);

    if (!isSingleDay) {
      const firstDays = selectedDays.slice(0, Math.min(7, selectedDays.length));
      const lastDays = selectedDays.slice(Math.max(0, selectedDays.length - 7));
      const weekRows = [
        { label: 'Période', value: formatPercent(selectedRatio) },
        { label: 'Début', value: formatPercent(ratioForDates(firstDays)) },
        ...(selectedDays.length > 7 ? [{ label: 'Fin', value: formatPercent(ratioForDates(lastDays)) }] : []),
      ];

      return {
        headline: formatPercent(selectedRatio),
        yesterdayLabel: 'S/C Période',
        yesterday: formatPercent(selectedRatio),
        monthLabel: 'Jours',
        month: String(selectedDays.length) + ' j',
        currentWeekLabel: selectedPeriodLabel,
        weekSectionLabel: 'Détail période',
        previousWeeks: [],
        weekRows,
      };
    }

    const referenceDate = selectedDays[0];
    const referenceYear = referenceDate.getFullYear();
    const referenceMonth = referenceDate.getMonth();
    const referenceDay = referenceDate.getDate();
    const daysInReferenceMonth = new Date(referenceYear, referenceMonth + 1, 0).getDate();
    const weekNumberForDay = (targetDay: number) => {
      let weekNumber = 1;
      for (let day = 1; day <= daysInReferenceMonth; day += 1) {
        if (day === targetDay) return weekNumber;
        if (new Date(referenceYear, referenceMonth, day).getDay() === 0) weekNumber += 1;
      }
      return weekNumber;
    };

    const weeks: Array<{ week: number; days: Date[] }> = [];
    for (let day = 1; day <= daysInReferenceMonth; day += 1) {
      const week = weekNumberForDay(day);
      let item = weeks.find(entry => entry.week === week);
      if (!item) {
        item = { week, days: [] };
        weeks.push(item);
      }
      item.days.push(new Date(referenceYear, referenceMonth, day));
    }

    const currentWeekNumber = weekNumberForDay(referenceDay);
    const yesterdayDate = new Date(referenceDate);
    yesterdayDate.setDate(referenceDate.getDate() - 1);
    const currentWeekDays = weeks.find(entry => entry.week === currentWeekNumber)?.days.filter(date => date.getDate() <= referenceDay) || [];
    const monthDays = Array.from({ length: referenceDay }, (_, index) => new Date(referenceYear, referenceMonth, index + 1));
    const previousWeeks = weeks
      .filter(entry => entry.week < currentWeekNumber)
      .map(entry => ({ label: 'Semaine ' + entry.week, value: formatPercent(ratioForDates(entry.days)) }));
    const currentWeekRatio = ratioForDates(currentWeekDays);
    const monthRatio = ratioForDates(monthDays);
    const yesterdayRatio = ratioForDates([yesterdayDate]);
    const weekRows = [
      ...previousWeeks,
      { label: 'Semaine ' + currentWeekNumber + ' en cours', value: formatPercent(currentWeekRatio) },
    ];

    return {
      headline: formatPercent(currentWeekRatio ?? monthRatio ?? yesterdayRatio),
      yesterdayLabel: 'S/C Veille',
      yesterday: formatPercent(yesterdayRatio),
      monthLabel: 'S/C Mois',
      month: formatPercent(monthRatio),
      currentWeekLabel: 'Semaine ' + currentWeekNumber,
      weekSectionLabel: 'Semaine',
      previousWeeks,
      weekRows,
    };
  }, [allData, data, homePeriod, month, selectedPeriodLabel, year]);

  const chartDataCA = useMemo(() => {
    const startRaw = makeLocalDate(homePeriod.start);
    const endRaw = makeLocalDate(homePeriod.end);
    const startDate = startRaw.getTime() <= endRaw.getTime() ? startRaw : endRaw;
    const endDate = startRaw.getTime() <= endRaw.getTime() ? endRaw : startRaw;
    const rows = [];
    const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    let guard = 0;

    const parseDashboardValue = (value: unknown) => {
      if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
      return parseFloat(String(value || '0').replace(',', '.').replace(/[^0-9.-]/g, '')) || 0;
    };

    while (cursor.getTime() <= endDate.getTime() && guard < 800) {
      const statYear = cursor.getFullYear();
      const statMonth = cursor.getMonth();
      const yearData = allData?.[statYear] || (statYear === year ? data : {});
      const dashboard = yearData?.[statMonth]?.dashboard || {};
      const rowIndex = getDashboardRowIndices(statMonth, statYear)[cursor.getDate()];

      if (typeof rowIndex === 'number') {
        const value = (col: number) => parseDashboardValue(dashboard[String(rowIndex) + '-' + String(col)]);
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

      cursor.setDate(cursor.getDate() + 1);
      guard += 1;
    }

    return rows;
  }, [allData, data, homePeriod, year]);

`;

export const homePeriodKpiPatch = (): Plugin => ({
  name: 'home-period-kpi-patch',
  enforce: 'pre',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').endsWith('/src/Home.tsx')) return null;
    let next = code;

    next = replaceRequired(next, useDataSource, useDataReplacement, 'allData accueil');
    next = replaceBetweenRequired(next, '  const kpis = useMemo(() => {', '  const chartDataFG = useMemo(() => {', metricsBlock + '  const chartDataFG = useMemo(() => {', 'calculs periode');
    next = replaceRequired(next, 'label="CA veille"', 'label={kpis.focusLabel}', 'libelle ca selection');
    next = replaceRequired(next, 'label="TM veille"', 'label={kpis.ticketLabel}', 'libelle tm selection');
    next = replaceRequired(next, 'description="Performance du mois en cours versus budget"', 'description={kpis.totalDescription}', 'description ca realise');
    next = replaceRequired(next, 'description="Résultat de la veille"', 'description={kpis.focusDescription}', 'description ca selection');
    next = replaceRequired(next, 'description="Valeur moyenne par couvert de la veille"', 'description={kpis.ticketDescription}', 'description tm selection');
    next = replaceRequired(next, 'description="Taux d\'atteinte du budget mensuel"', 'description={kpis.budgetDescription}', 'description budget selection');
    next = replaceRequired(next, 'S/C Veille', '{payrollCostBubble.yesterdayLabel}', 'libelle sc gauche');
    next = replaceRequired(next, 'S/C Mois', '{payrollCostBubble.monthLabel}', 'libelle sc mois');
    next = replaceRequired(next, 'Semaine\n', '{payrollCostBubble.weekSectionLabel}\n', 'libelle section sc');
    next = replaceRequired(next, 'Réalisé vs Budget mensuel', 'Réalisé vs Budget sélection', 'sous titre graphique ca');

    return { code: next, map: null };
  },
});
