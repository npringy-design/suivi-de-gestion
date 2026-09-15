import type { CSSProperties } from 'react';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export type HomePeriodCalendarProps = {
  selectedDate: string; // format YYYY-MM-DD
  onDateSelect: (date: string) => void;
  todayDate?: Date;
  rangeStart?: string;
  rangeEnd?: string;
};

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const toDateKey = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const parseDateKey = (value: string) => {
  const [yearValue, monthValue, dayValue] = value.split('-').map(part => Number.parseInt(part, 10));
  if (!Number.isFinite(yearValue) || !Number.isFinite(monthValue) || !Number.isFinite(dayValue)) return null;
  return { year: yearValue, month: monthValue - 1, day: dayValue };
};

const formatMonthYearLabel = (year: number, month: number) => {
  const formatted = new Date(year, month, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

const navButtonStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  borderRadius: 8,
  border: '1px solid rgba(207,250,254,.24)',
  background: 'rgba(255,255,255,.08)',
  color: '#ecfeff',
  cursor: 'pointer',
};

export default function HomePeriodCalendar({ selectedDate, onDateSelect, todayDate, rangeStart, rangeEnd }: HomePeriodCalendarProps) {
  const parsedSelected = parseDateKey(selectedDate);
  const fallbackNow = new Date();
  const [viewYear, setViewYear] = useState(parsedSelected?.year ?? fallbackNow.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsedSelected?.month ?? fallbackNow.getMonth());

  const today = todayDate ?? fallbackNow;

  const goToPreviousMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(year => year - 1);
    } else {
      setViewMonth(month => month - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(year => year + 1);
    } else {
      setViewMonth(month => month + 1);
    }
  };

  const firstWeekday = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: Array<string | null> = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(toDateKey(viewYear, viewMonth, day));

  const rangeStartMs = rangeStart ? new Date(rangeStart).getTime() : null;
  const rangeEndMs = rangeEnd ? new Date(rangeEnd).getTime() : null;

  const isInRange = (dateKey: string) => {
    if (rangeStartMs === null || rangeEndMs === null) return false;
    const time = new Date(dateKey).getTime();
    const lower = Math.min(rangeStartMs, rangeEndMs);
    const upper = Math.max(rangeStartMs, rangeEndMs);
    return time >= lower && time <= upper;
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button type="button" onClick={goToPreviousMonth} aria-label="Mois précédent" style={navButtonStyle}>
          <ChevronLeft size={16} />
        </button>
        <div style={{ fontSize: 13, fontWeight: 900, color: '#ecfeff' }}>
          {formatMonthYearLabel(viewYear, viewMonth)}
        </div>
        <button type="button" onClick={goToNextMonth} aria-label="Mois suivant" style={navButtonStyle}>
          <ChevronRight size={16} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4, marginBottom: 4 }}>
        {WEEKDAY_LABELS.map(day => (
          <div key={day} style={{ textAlign: 'center', fontSize: 10, fontWeight: 900, color: 'rgba(236,254,255,.70)', textTransform: 'uppercase' }}>
            {day}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4 }}>
        {cells.map((dateKey, index) => {
          if (!dateKey) return <div key={`empty-${index}`} style={{ minHeight: 34 }} />;
          const parsed = parseDateKey(dateKey);
          if (!parsed) return <div key={`empty-${index}`} style={{ minHeight: 34 }} />;

          const isSelected = dateKey === selectedDate;
          const isToday = parsed.year === today.getFullYear() && parsed.month === today.getMonth() && parsed.day === today.getDate();
          const inRange = !isSelected && !isToday && isInRange(dateKey);

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onDateSelect(dateKey)}
              onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.18)'; }}
              onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
              style={{
                height: 34,
                border: `1px solid ${isSelected ? 'rgba(254,243,199,.86)' : isToday ? 'rgba(251,191,36,.55)' : inRange ? 'rgba(45,212,191,.30)' : 'rgba(207,250,254,.18)'}`,
                borderRadius: 9,
                background: isSelected ? 'linear-gradient(135deg,#f59e0b,#fbbf24)' : isToday ? 'rgba(251,191,36,.18)' : inRange ? 'rgba(45,212,191,.15)' : 'rgba(255,255,255,.10)',
                color: isSelected ? '#0f172a' : isToday ? '#fde68a' : '#ecfeff',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 900,
                boxShadow: isSelected ? '0 8px 18px rgba(0,0,0,.20)' : 'none',
                transition: 'filter 0.15s ease',
              }}
            >
              {parsed.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
