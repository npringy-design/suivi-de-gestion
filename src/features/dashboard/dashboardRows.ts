import type { DashboardRow } from './dashboardTypes';
import { days, monthNames } from './dashboardStaticConfig';
import { isDateInRange, isExactDate } from './dashboardCalculations';

type HolidayRange = { start: string; end: string };

export function buildMonthRows(
  year: number,
  month: number,
  options?: {
    schoolHolidays?: HolidayRange[];
    publicHolidays?: string[];
    customEvents?: { date: string }[];
  },
): DashboardRow[] {
  const generatedRows: DashboardRow[] = [];
  let weekCount = 1;
  const numDays = new Date(year, month + 1, 0).getDate();
  const monthName = monthNames[month];
  const sh = options?.schoolHolidays ?? [];
  const ph = options?.publicHolidays ?? [];
  const ce = options?.customEvents ?? [];

  for (let i = 1; i <= numDays; i++) {
    const date = new Date(year, month, i);
    const dayName = days[date.getDay()];

    const isSchoolHoliday = sh.some(h => isDateInRange(date, h.start, h.end));
    const isPublicHoliday = ph.some(h => isExactDate(date, h));
    const isCustomEvent = ce.some(e => isExactDate(date, e.date));

    generatedRows.push({
      type: 'day',
      label: `${dayName} ${i} ${monthName} ${year}`,
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      isSchoolHoliday,
      isPublicHoliday,
      isCustomEvent,
      dateObj: date,
      dayIndex: i,
      weekIndex: weekCount,
    });

    if (date.getDay() === 0) {
      generatedRows.push({ type: 'total', label: `Total Semaine ${weekCount}`, weekIndex: weekCount });
      weekCount++;
    }
  }

  if (new Date(year, month, numDays).getDay() !== 0) {
    const lastWeekHasDays = generatedRows.some(r => r.type === 'day' && r.weekIndex === weekCount);
    if (lastWeekHasDays) generatedRows.push({ type: 'total', label: `Total Semaine ${weekCount}`, weekIndex: weekCount });
  }

  generatedRows.push({ type: 'fg_box4_total', label: '' });
  generatedRows.push({ type: 'month_total', label: 'TOTAL' });
  return generatedRows;
}
