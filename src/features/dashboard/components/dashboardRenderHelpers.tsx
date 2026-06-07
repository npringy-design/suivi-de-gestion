import React from 'react';

type DailyControlOptions = { readOnly?: boolean; text?: boolean };
type RenderDailyControl = (col: number, options?: DailyControlOptions) => React.ReactNode;

export const renderAutoValue = (
  value: string | number,
  dailyReadOnlyClass: string,
  options: { className?: string; style?: React.CSSProperties } = {}
) => (
  <div className={`${dailyReadOnlyClass} ${options.className || ''}`} style={options.style}>
    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || '-'}</span>
  </div>
);

export const renderCashAutoValue = (
  value: string | number,
  dailyReadOnlyClass: string,
  options: { style?: React.CSSProperties } = {}
) => renderAutoValue(value, dailyReadOnlyClass, { className: 'h-7 px-2 text-xs', style: options.style });

export const renderDailyServiceRow = (
  label: string,
  caCol: number,
  coversCol: number,
  tmCol: number,
  isMobile: boolean,
  renderDailyControl: RenderDailyControl
) => (
  <div key={label} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '78px repeat(3, minmax(120px, 1fr))', gap: 8, alignItems: 'end', gridColumn: '1 / -1' }}>
    <div style={{ height: isMobile ? 'auto' : 32, display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 900, color: '#0f172a' }}>{label}</div>
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.04em' }}>CA {label}</span>
      {renderDailyControl(caCol, { readOnly: true })}
    </label>
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.04em' }}>Cts {label}</span>
      {renderDailyControl(coversCol, { readOnly: true })}
    </label>
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.04em' }}>TM {label}</span>
      {renderDailyControl(tmCol, { readOnly: true })}
    </label>
  </div>
);

export const renderDailySingleRow = (
  label: string,
  col: number,
  options: DailyControlOptions,
  isMobile: boolean,
  renderDailyControl: RenderDailyControl
) => (
  <div key={`${label}-${col}`} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '78px repeat(3, minmax(120px, 1fr))', gap: 8, alignItems: 'end', gridColumn: '1 / -1' }}>
    <div style={{ height: isMobile ? 'auto' : 32, display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 900, color: '#0f172a' }}>{label}</div>
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</span>
      {renderDailyControl(col, options)}
    </label>
  </div>
);

export const renderDailyTotalRow = (
  items: Array<{ label: string; col: number }>,
  isMobile: boolean,
  renderDailyControl: RenderDailyControl
) => (
  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '78px repeat(3, minmax(120px, 1fr))', gap: 8, alignItems: 'end', gridColumn: '1 / -1' }}>
    <div style={{ height: isMobile ? 'auto' : 32, display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 900, color: '#0f172a' }}>Totaux</div>
    {items.map(item => (
      <label key={`total-${item.col}`} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 900, color: '#334155', textTransform: 'uppercase', letterSpacing: '.04em' }}>{item.label}</span>
        {renderDailyControl(item.col, { readOnly: true })}
      </label>
    ))}
  </div>
);

export const renderPersonnelRow = (
  label: string,
  cuisineCol: number,
  salleCol: number,
  isMobile: boolean,
  renderDailyControl: RenderDailyControl
) => (
  <div key={`${label}-${cuisineCol}-${salleCol}`} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '180px repeat(2, minmax(180px, 1fr))', gap: 12, alignItems: 'center', gridColumn: '1 / -1' }}>
    <div style={{ height: isMobile ? 'auto' : 36, display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 900, color: '#0f172a' }}>{label}</div>
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.04em' }}>Cuisine</span>
      {renderDailyControl(cuisineCol)}
    </label>
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.04em' }}>Salle</span>
      {renderDailyControl(salleCol)}
    </label>
  </div>
);

export const renderPersonnelTable = (rows: React.ReactNode, isMobile: boolean) => (
  <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
    {!isMobile && (
      <div style={{ display: 'grid', gridTemplateColumns: '180px repeat(2, minmax(180px, 1fr))', gap: 12, alignItems: 'center' }}>
        <div />
        <div style={{ fontSize: 12, fontWeight: 950, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '.04em' }}>Cuisine</div>
        <div style={{ fontSize: 12, fontWeight: 950, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '.04em' }}>Salle</div>
      </div>
    )}
    {rows}
  </div>
);

export const renderDailySection = (
  title: string,
  subtitle: string,
  fields: React.ReactNode,
  accent: string,
  isMobile: boolean,
  tint: (hex: string, opacity: number) => string
) => (
  <section style={{ background: '#fff', border: '1px solid #dbe5ec', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' }}>
    <div style={{ padding: '9px 12px', borderBottom: `1px solid ${tint(accent, 0.34)}`, background: `linear-gradient(135deg, ${tint(accent, 0.30)} 0%, ${tint(accent, 0.16)} 48%, #f8fafc 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div style={{ width: 6, height: 24, borderRadius: 999, background: `linear-gradient(180deg, ${accent}, ${tint(accent, 0.78)})`, boxShadow: `0 0 0 3px ${tint(accent, 0.12)}`, flexShrink: 0 }} />
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap' }}>{title}</h3>
      </div>
      <p style={{ margin: 0, fontSize: 11, color: '#475569', fontWeight: 800, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: isMobile ? 'normal' : 'nowrap' }}>{subtitle}</p>
    </div>
    <div style={{ padding: isMobile ? 10 : 12, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(130px, 1fr))', columnGap: 8, rowGap: 8 }}>
      {fields}
    </div>
  </section>
);
