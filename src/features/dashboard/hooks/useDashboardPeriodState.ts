import { useEffect, useState } from 'react';

type UseDashboardPeriodStateParams = {
  initialMonth: number;
  year: number;
  setSelectedMonth: (month: number) => void;
};

export function useDashboardPeriodState({
  initialMonth,
  year,
  setSelectedMonth,
}: UseDashboardPeriodStateParams) {
  const [month, setMonth] = useState(initialMonth);
  const [selectedEntryDay, setSelectedEntryDay] = useState(() => {
    const now = new Date();
    return initialMonth === now.getMonth() && year === now.getFullYear() ? now.getDate() : 1;
  });

  useEffect(() => {
    const now = new Date();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const defaultDay = month === now.getMonth() && year === now.getFullYear() ? now.getDate() : 1;
    setSelectedEntryDay(prev => Math.min(prev || defaultDay, daysInMonth));
  }, [month, year]);

  const selectMonth = (nextMonth: number) => {
    setMonth(nextMonth);
    setSelectedMonth(nextMonth);
  };

  return {
    month,
    setMonth,
    selectedEntryDay,
    setSelectedEntryDay,
    selectMonth,
  };
}
