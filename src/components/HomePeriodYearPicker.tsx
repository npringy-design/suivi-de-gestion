export type HomePeriodYearPickerProps = {
  selectedYear: string;
  onYearSelect: (year: string) => void;
};

const YEAR_RANGE_START = 2024;
const YEAR_RANGE_END = 2035;

export default function HomePeriodYearPicker({ selectedYear, onYearSelect }: HomePeriodYearPickerProps) {
  const now = new Date();
  const years = Array.from({ length: YEAR_RANGE_END - YEAR_RANGE_START + 1 }, (_, index) => YEAR_RANGE_START + index);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
      {years.map(year => {
        const key = String(year);
        const isSelected = key === selectedYear;
        const isCurrent = !isSelected && year === now.getFullYear();

        return (
          <button
            key={key}
            type="button"
            onClick={() => onYearSelect(key)}
            onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.18)'; }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
            style={{
              height: 44,
              border: `1px solid ${isSelected ? 'rgba(254,243,199,.86)' : isCurrent ? 'rgba(251,191,36,.55)' : 'rgba(207,250,254,.18)'}`,
              borderRadius: 10,
              background: isSelected ? 'linear-gradient(135deg,#f59e0b,#fbbf24)' : isCurrent ? 'rgba(251,191,36,.18)' : 'rgba(255,255,255,.10)',
              color: isSelected ? '#0f172a' : isCurrent ? '#fde68a' : '#ecfeff',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 900,
              boxShadow: isSelected ? '0 8px 18px rgba(0,0,0,.20)' : 'none',
              transition: 'filter 0.15s ease',
            }}
          >
            {year}
          </button>
        );
      })}
    </div>
  );
}
