import React from 'react';
import { ChevronLeft } from 'lucide-react';

export type DashboardSidebarProps = {
  isMobile: boolean;
  isSidebarOpen: boolean;
  sidebarTheme: string;
  year: number;
  month: number;
  monthNames: string[];
  onBack: () => void;
  setMonth: (month: number) => void;
};

export default function DashboardSidebar({
  isMobile,
  isSidebarOpen,
  sidebarTheme,
  year,
  month,
  monthNames,
  onBack,
  setMonth,
}: DashboardSidebarProps) {
  return (
    <aside style={{
      width: isSidebarOpen ? 260 : 0,
      minWidth: isSidebarOpen ? 260 : 0,
      background: sidebarTheme,
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      boxShadow: isSidebarOpen ? '4px 0 15px rgba(0,0,0,0.05)' : 'none',
      zIndex: 100,
      position: isMobile ? 'absolute' : 'relative',
      height: '100%',
      overflow: 'hidden',
      transition: 'width 0.3s ease, min-width 0.3s ease'
    }}>
      <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
          <ChevronLeft size={16} /> Retour Accueil
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '24px 0 0 0', letterSpacing: '-0.02em', color: '#f8fafc' }}>Tableau de Bord</h1>
        <div style={{ fontSize: 14, color: '#94a3b8', marginTop: 4, fontWeight: 500 }}>AnnÃ©e {year}</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 4, scrollbarWidth: 'none' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 12px 12px 12px' }}>SÃ©lection du mois</div>
        {monthNames.map((m, i) => (
          <button
            key={i}
            onClick={() => setMonth(i)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px',
              background: month === i ? '#3b82f6' : 'transparent',
              color: month === i ? '#fff' : '#cbd5e1',
              border: 'none', borderRadius: 8, cursor: 'pointer',
              fontSize: 14, fontWeight: month === i ? 700 : 500,
              textTransform: 'capitalize', transition: 'all 0.2s',
              textAlign: 'left',
              boxShadow: month === i ? '0 4px 6px -1px rgba(59, 130, 246, 0.3)' : 'none'
            }}
            onMouseEnter={e => { if (month !== i) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#fff'; } }}
            onMouseLeave={e => { if (month !== i) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#cbd5e1'; } }}
          >
            {m}
            {month === i && <ChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} />}
          </button>
        ))}
      </div>
    </aside>
  );
}
