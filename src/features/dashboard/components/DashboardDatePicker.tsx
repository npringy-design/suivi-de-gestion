import type { DashboardRow } from '@/features/dashboard/dashboardTypes';

type MonthOption = {
  label: string;
  value: number;
};

type TodayMarker = {
  year: number;
  month: number;
  day: number;
};

type DashboardDatePickerProps = {
  isMobile: boolean;
  month: number;
  year: number;
  selectedEntryDay: number;
  monthSelectOptions: MonthOption[];
  yearSelectOptions: number[];
  datePickerCells: Array<DashboardRow | null>;
  todayMarker: TodayMarker;
  weatherTheme: string;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onDayChange: (day: number) => void;
  onClose: () => void;
};

export default function DashboardDatePicker({
  isMobile,
  month,
  year,
  selectedEntryDay,
  monthSelectOptions,
  yearSelectOptions,
  datePickerCells,
  todayMarker,
  weatherTheme,
  onMonthChange,
  onYearChange,
  onDayChange,
  onClose,
}: DashboardDatePickerProps) {
  return (
    <div style={{ position: 'absolute', left: 0, top: 'calc(100% + 10px)', width: isMobile ? 320 : 430, maxWidth: 'calc(100vw - 32px)', background: weatherTheme, color: '#ecfeff', border: '1px solid rgba(207,250,254,.28)', borderRadius: 14, padding: 14, boxShadow: '0 20px 48px rgba(2, 6, 23, 0.34), inset 0 1px 0 rgba(255,255,255,.12)', zIndex: 140 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 104px', gap: 10, marginBottom: 12 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 900, color: 'rgba(236,254,255,.76)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Mois</span>
          <select
            value={month}
            onChange={event => onMonthChange(Number(event.target.value))}
            style={{ height: 38, border: '1px solid rgba(207,250,254,.24)', borderRadius: 10, padding: '0 10px', fontWeight: 850, color: '#ecfeff', background: 'rgba(5, 42, 52, .82)', textTransform: 'capitalize', outline: 'none' }}
          >
            {monthSelectOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em' }}>Année</span>
          <select
            value={year}
            onChange={event => onYearChange(Number(event.target.value))}
            style={{ height: 38, border: '1px solid rgba(207,250,254,.24)', borderRadius: 10, padding: '0 10px', fontWeight: 850, color: '#ecfeff', background: 'rgba(5, 42, 52, .82)', outline: 'none' }}
          >
            {yearSelectOptions.map(option => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(34px, 1fr))', gap: 6 }}>
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
          <div key={day} style={{ textAlign: 'center', fontSize: 10, fontWeight: 900, color: 'rgba(236,254,255,.70)', textTransform: 'uppercase' }}>{day}</div>
        ))}
        {datePickerCells.map((row, index) => {
          if (!row) return <div key={`empty-${index}`} style={{ minHeight: 34 }} />;
          const isSelected = row.dayIndex === selectedEntryDay;
          const isToday = row.dateObj
            && row.dateObj.getFullYear() === todayMarker.year
            && row.dateObj.getMonth() === todayMarker.month
            && row.dateObj.getDate() === todayMarker.day;

          return (
            <button
              key={`${row.dayIndex}-${index}`}
              type="button"
              onClick={() => {
                if (row.dayIndex) onDayChange(row.dayIndex);
                onClose();
              }}
              style={{
                height: 34,
                border: `1px solid ${isSelected ? 'rgba(254,243,199,.86)' : isToday ? 'rgba(251,191,36,.55)' : 'rgba(207,250,254,.18)'}`,
                borderRadius: 9,
                background: isSelected ? 'linear-gradient(135deg,#f59e0b,#fbbf24)' : isToday ? 'rgba(251,191,36,.18)' : 'rgba(255,255,255,.10)',
                color: isSelected ? '#0f172a' : isToday ? '#fde68a' : '#ecfeff',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 900,
                boxShadow: isSelected ? '0 8px 18px rgba(0,0,0,.20)' : 'none',
              }}
            >
              {row.dayIndex}
            </button>
          );
        })}
      </div>
    </div>
  );
}
