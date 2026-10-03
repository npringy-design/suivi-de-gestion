import { MONTH_NAMES_SHORT } from '@/lib/constants';

type SalaryPeriodCalendarProps = {
  year: number;
  month: number;
  // Mois de l'année affichée qui contiennent déjà des salariés (repère visuel)
  filledMonths: ReadonlySet<number>;
  lockedMonths: ReadonlySet<number>;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
};

const NAV = '#1e293b';

const arrowStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  background: '#f8fafc',
  color: '#475569',
  fontSize: 16,
  fontWeight: 800,
  cursor: 'pointer',
};

// Calendrier de sélection de la période : année avec flèches, puis grille des 12 mois.
export default function SalaryPeriodCalendar({ year, month, filledMonths, lockedMonths, onYearChange, onMonthChange }: SalaryPeriodCalendarProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
      <div style={{ background: '#fff', padding: '14px 18px', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,.04)', border: '1px solid #e2e8f0', width: 'min(100%, 380px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button type="button" aria-label="Année précédente" onClick={() => onYearChange(year - 1)} style={arrowStyle}>‹</button>
          <div style={{ fontSize: 20, fontWeight: 800, color: NAV, fontVariantNumeric: 'tabular-nums' }}>{year}</div>
          <button type="button" aria-label="Année suivante" onClick={() => onYearChange(year + 1)} style={arrowStyle}>›</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {MONTH_NAMES_SHORT.map((label, index) => {
            const selected = index === month;
            return (
              <button
                key={label}
                type="button"
                aria-pressed={selected}
                onClick={() => onMonthChange(index)}
                style={{
                  position: 'relative',
                  height: 38,
                  borderRadius: 8,
                  border: selected ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                  background: selected ? '#fef3c7' : '#f8fafc',
                  color: selected ? '#92400e' : '#475569',
                  fontSize: 12,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                {label}
                {filledMonths.has(index) && (
                  <span aria-hidden="true" title="Salariés renseignés" style={{ position: 'absolute', top: 4, right: 5, width: 6, height: 6, borderRadius: 3, background: '#10b981' }} />
                )}
                {lockedMonths.has(index) && (
                  <span aria-hidden="true" title="Mois verrouillé" style={{ position: 'absolute', bottom: 2, right: 4, fontSize: 9 }}>🔒</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
