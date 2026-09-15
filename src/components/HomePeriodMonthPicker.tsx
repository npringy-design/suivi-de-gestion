import type { CSSProperties } from 'react';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export type HomePeriodMonthPickerProps = {
  selectedMonth: string; // format YYYY-MM
  onMonthSelect: (month: string) => void;
};

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const parseMonthKey = (value: string) => {
  const [yearValue, monthValue] = value.split('-').map(part => Number.parseInt(part, 10));
  if (!Number.isFinite(yearValue) || !Number.isFinite(monthValue)) return null;
  return { year: yearValue, month: monthValue - 1 };
};

const toMonthKey = (year: number, month: number) => `${year}-${String(month + 1).padStart(2, '0')}`;

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

export default function HomePeriodMonthPicker({ selectedMonth, onMonthSelect }: HomePeriodMonthPickerProps) {
  const parsedSelected = parseMonthKey(selectedMonth);
  const now = new Date();
  const [viewYear, setViewYear] = useState(parsedSelected?.year ?? now.getFullYear());

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button type="button" onClick={() => setViewYear(year => year - 1)} aria-label="Année précédente" style={navButtonStyle}>
          <ChevronLeft size={16} />
        </button>
        <div style={{ fontSize: 14, fontWeight: 900, color: '#ecfeff' }}>{viewYear}</div>
        <button type="button" onClick={() => setViewYear(year => year + 1)} aria-label="Année suivante" style={navButtonStyle}>
          <ChevronRight size={16} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        {MONTH_LABELS.map((label, index) => {
          const key = toMonthKey(viewYear, index);
          const isSelected = key === selectedMonth;
          const isCurrent = !isSelected && viewYear === now.getFullYear() && index === now.getMonth();

          return (
            <button
              key={key}
              type="button"
              onClick={() => onMonthSelect(key)}
              onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.18)'; }}
              onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
              style={{
                height: 44,
                border: `1px solid ${isSelected ? 'rgba(254,243,199,.86)' : isCurrent ? 'rgba(251,191,36,.55)' : 'rgba(207,250,254,.18)'}`,
                borderRadius: 10,
                background: isSelected ? 'linear-gradient(135deg,#f59e0b,#fbbf24)' : isCurrent ? 'rgba(251,191,36,.18)' : 'rgba(255,255,255,.10)',
                color: isSelected ? '#0f172a' : isCurrent ? '#fde68a' : '#ecfeff',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 900,
                textTransform: 'capitalize',
                boxShadow: isSelected ? '0 8px 18px rgba(0,0,0,.20)' : 'none',
                transition: 'filter 0.15s ease',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
