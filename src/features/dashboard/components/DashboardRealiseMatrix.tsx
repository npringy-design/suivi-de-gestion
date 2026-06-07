import React from 'react';

type DailyControlOptions = { readOnly?: boolean; text?: boolean };

type DashboardRealiseMatrixProps = {
  isMobile: boolean;
  dailyReadOnlyClass: string;
  renderDailyControl: (col: number, options?: DailyControlOptions) => React.ReactNode;
};

const columns = [
  { label: 'VAE', compact: 'VAE' },
  { label: 'Midi', compact: 'Midi' },
  { label: 'Soir', compact: 'Soir' },
  { label: 'Limonade', compact: 'Limo' },
  { label: 'Total', compact: 'Total' },
];

const rows: Array<{ label: string; cells: Array<{ col: number; readOnly?: boolean } | null> }> = [
  {
    label: 'CA',
    cells: [
      { col: 17 },
      { col: 18 },
      { col: 19 },
      { col: 20 },
      { col: 21, readOnly: true },
    ],
  },
  {
    label: 'Couverts',
    cells: [
      null,
      { col: 25 },
      { col: 27 },
      { col: 34 },
      { col: 29, readOnly: true },
    ],
  },
  {
    label: 'Ticket moyen',
    cells: [
      null,
      { col: 26, readOnly: true },
      { col: 28, readOnly: true },
      { col: 35, readOnly: true },
      { col: 30, readOnly: true },
    ],
  },
];

export default function DashboardRealiseMatrix({
  isMobile,
  dailyReadOnlyClass,
  renderDailyControl,
}: DashboardRealiseMatrixProps) {
  return (
    <div style={{ gridColumn: '1 / -1', overflowX: 'auto', paddingBottom: 2 }}>
      <div style={{ minWidth: isMobile ? 620 : 0, display: 'grid', gridTemplateColumns: isMobile ? '118px repeat(5, minmax(92px, 1fr))' : '140px repeat(5, minmax(130px, 1fr))', gap: 8, alignItems: 'center' }}>
        <div />
        {columns.map(column => (
          <div key={column.label} style={{ minHeight: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: column.label === 'Total' ? '#eff6ff' : '#f8fafc', border: '1px solid #dbe5ec', color: column.label === 'Total' ? '#1d4ed8' : '#334155', fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            {isMobile ? column.compact : column.label}
          </div>
        ))}

        {rows.map(row => (
          <React.Fragment key={row.label}>
            <div style={{ minHeight: 36, display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 950, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '.03em' }}>{row.label}</div>
            {row.cells.map((cell, index) => (
              <div key={`${row.label}-${columns[index].label}`} style={{ minWidth: 0 }}>
                {cell ? renderDailyControl(cell.col, { readOnly: cell.readOnly }) : (
                  <div className={dailyReadOnlyClass} style={{ justifyContent: 'center', color: '#94a3b8' }}>-</div>
                )}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
