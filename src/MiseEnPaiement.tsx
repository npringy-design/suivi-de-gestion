import React, { useState, useEffect } from 'react';
import { useData } from './DataContext';
import { ChevronLeft, Menu, X } from 'lucide-react';

interface MiseEnPaiementProps {
  month: number;
  setMonth: (month: number) => void;
  onBack: () => void;
}

const MONTHS = [
  'JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN',
  'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DÉCEMBRE'
];

const getPeriodLabels = (monthIndex: number) => {
  const prevMonth = monthIndex === 0 ? 12 : monthIndex;
  const currentMonth = monthIndex + 1;
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  const p1Start = `20/${pad(prevMonth)}`;
  const p1End = `09/${pad(currentMonth)}`;
  const p1Pay = `10/${pad(currentMonth)}`;
  
  const p2Start = `10/${pad(currentMonth)}`;
  const p2End = `19/${pad(currentMonth)}`;
  const p2Pay = `20/${pad(currentMonth)}`;
  
  return {
    period1: {
      echeance: `échéance entre le ${p1Start} et le ${p1End}`,
      paiement: `PAIEMENT LE ${p1Pay}`
    },
    period2: {
      echeance: `échéance entre le ${p2Start} et le ${p2End}`,
      paiement: `PAIEMENT LE ${p2Pay}`
    }
  };
};

const n = (v?: string | number) => {
  if (typeof v === 'number') return v;
  return parseFloat((v || '0').toString().replace(',', '.')) || 0;
};

const fe = (v: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v);

export default function MiseEnPaiement({ month, setMonth, onBack }: MiseEnPaiementProps) {
  const { data, updateMiseEnPaiement } = useData();
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth > 1024) setIsSidebarOpen(true);
      else setIsSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const monthData = data[month]?.miseEnPaiement || {
    period1: Array(10).fill({ fournisseur: '', numFacture: '', montantHT: '', montantTTC: '', dateEcheance: '', datePaiementPrevue: '', paiementEffectue: false }),
    period2: Array(10).fill({ fournisseur: '', numFacture: '', montantHT: '', montantTTC: '', dateEcheance: '', datePaiementPrevue: '', paiementEffectue: false })
  };

  const labels = getPeriodLabels(month);

  const handleUpdate = (period: 'period1' | 'period2', index: number, field: string, value: string | boolean) => {
    updateMiseEnPaiement(month, period, index, field as any, value);
  };

  const renderPeriod = (period: 'period1' | 'period2', labelInfo: { echeance: string, paiement: string }) => {
    const rows = monthData[period];
    const totalTTC = rows.reduce((sum, row) => sum + n(row.montantTTC), 0);

    return (
      <div style={{ marginBottom: 32 }}>
        <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', background: '#fff' }}>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx}>
                {idx === 0 && (
                  <td rowSpan={10} style={{ width: isMobile ? 120 : 180, border: '1px solid #cbd5e1', padding: isMobile ? '8px' : '16px', textAlign: 'center', background: '#fff', verticalAlign: 'middle' }}>
                    <div style={{ fontSize: isMobile ? 11 : 13, fontWeight: 700, color: '#0f172a', marginBottom: isMobile ? 12 : 24 }}>{labelInfo.echeance}</div>
                    <div style={{ fontSize: isMobile ? 11 : 13, fontWeight: 700, color: '#0f172a' }}>{labelInfo.paiement}</div>
                  </td>
                )}
                <td style={{ border: '1px solid #cbd5e1', padding: 0 }}>
                  <input
                    type="text"
                    value={row.fournisseur}
                    onChange={(e) => handleUpdate(period, idx, 'fournisseur', e.target.value)}
                    style={{ width: '100%', border: 'none', padding: isMobile ? '6px' : '8px', background: '#f1f5f9', outline: 'none', fontSize: isMobile ? 11 : 13 }}
                  />
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: 0 }}>
                  <input
                    type="text"
                    value={row.numFacture}
                    onChange={(e) => handleUpdate(period, idx, 'numFacture', e.target.value)}
                    style={{ width: '100%', border: 'none', padding: isMobile ? '6px' : '8px', background: '#f1f5f9', outline: 'none', fontSize: isMobile ? 11 : 13 }}
                  />
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: 0 }}>
                  <input
                    type="text"
                    value={row.montantHT}
                    onChange={(e) => handleUpdate(period, idx, 'montantHT', e.target.value)}
                    style={{ width: '100%', border: 'none', padding: isMobile ? '6px' : '8px', background: '#f1f5f9', outline: 'none', fontSize: isMobile ? 11 : 13, textAlign: 'right' }}
                  />
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: 0 }}>
                  <input
                    type="text"
                    value={row.montantTTC}
                    onChange={(e) => handleUpdate(period, idx, 'montantTTC', e.target.value)}
                    style={{ width: '100%', border: 'none', padding: '8px', background: '#f1f5f9', outline: 'none', fontSize: 13, textAlign: 'right' }}
                  />
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: 0 }}>
                  <input
                    type="text"
                    value={row.dateEcheance}
                    onChange={(e) => handleUpdate(period, idx, 'dateEcheance', e.target.value)}
                    style={{ width: '100%', border: 'none', padding: '8px', background: '#f1f5f9', outline: 'none', fontSize: 13, textAlign: 'center' }}
                  />
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: 0 }}>
                  <input
                    type="text"
                    value={row.datePaiementPrevue}
                    onChange={(e) => handleUpdate(period, idx, 'datePaiementPrevue', e.target.value)}
                    style={{ width: '100%', border: 'none', padding: '8px', background: '#f1f5f9', outline: 'none', fontSize: 13, textAlign: 'center' }}
                  />
                </td>
                <td style={{ border: '1px solid #cbd5e1', padding: 0, textAlign: 'center', background: '#f1f5f9' }}>
                  <input
                    type="checkbox"
                    checked={row.paiementEffectue}
                    onChange={(e) => handleUpdate(period, idx, 'paiementEffectue', e.target.checked)}
                    style={{ cursor: 'pointer', width: 16, height: 16 }}
                  />
                </td>
                {idx === 0 && (
                  <td rowSpan={10} style={{ width: 120, border: '1px solid #cbd5e1', padding: '16px', textAlign: 'center', background: '#fff', verticalAlign: 'middle', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                    {fe(totalTTC)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#f8fafc', overflow: 'hidden', position: 'relative' }}>
      
      {/* Mobile Sidebar Overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100 }}
        />
      )}

      {/* Sidebar Navigation */}
      <aside style={{ 
        width: 280, 
        background: '#0f172a', 
        display: 'flex', 
        flexDirection: 'column', 
        borderRight: '1px solid #1e293b',
        position: isMobile ? 'absolute' : 'relative',
        height: '100%',
        zIndex: 110,
        transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease-in-out'
      }}>
        <div style={{ padding: '32px 24px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, background: '#f59e0b', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronLeft size={24} color="#fff" onClick={onBack} style={{ cursor: 'pointer' }} />
            </div>
            <h1 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: '0.02em' }}>Paiements</h1>
          </div>
          {isMobile && (
            <button onClick={() => setIsSidebarOpen(false)} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={24} />
            </button>
          )}
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px' }}>
          {MONTHS.map((m, i) => (
            <button
              key={m}
              onClick={() => {
                setMonth(i);
                if (isMobile) setIsSidebarOpen(false);
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                marginBottom: 8,
                borderRadius: 8,
                border: 'none',
                background: month === i ? '#1e293b' : 'transparent',
                color: month === i ? '#f59e0b' : '#94a3b8',
                textAlign: 'left',
                fontSize: 14,
                fontWeight: month === i ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              {m}
              {month === i && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />}
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f8fafc' }}>
        
        {/* Top Header */}
        <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: isMobile ? '0 16px' : '0 32px', display: 'flex', flexDirection: 'column', flexShrink: 0, zIndex: 90 }}>
          <div style={{ height: isMobile ? 60 : 80, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {(!isSidebarOpen || isMobile) && (
                <button onClick={() => setIsSidebarOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                  <Menu size={24} />
                </button>
              )}
              <h2 style={{ fontSize: isMobile ? 20 : 28, fontWeight: 800, color: '#0f172a', margin: 0, textTransform: 'capitalize', letterSpacing: '-0.02em' }}>
                Virements {MONTHS[month].toLowerCase()}
              </h2>
            </div>
            <div style={{ background: '#f59e0b', color: '#fff', padding: isMobile ? '4px 12px' : '6px 16px', borderRadius: 999, fontSize: isMobile ? 12 : 14, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', boxShadow: '0 2px 4px rgba(245, 158, 11, 0.2)' }}>
              BURO MONTE
            </div>
          </div>
        </header>

        {/* Table Area */}
        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 12 : 32, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, background: '#fff', borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', borderBottom: '1px solid #cbd5e1', minWidth: isMobile ? 800 : 'auto' }}>
                <thead>
                  <tr>
                    <th style={{ width: isMobile ? 120 : 180, borderRight: '1px solid #cbd5e1', padding: isMobile ? '8px' : '12px', fontSize: isMobile ? 10 : 12, fontWeight: 700, color: '#475569', background: '#f1f5f9', textTransform: 'uppercase' }}>Période</th>
                    <th style={{ borderRight: '1px solid #cbd5e1', padding: isMobile ? '8px' : '12px', fontSize: isMobile ? 10 : 12, fontWeight: 700, color: '#475569', background: '#f1f5f9', textTransform: 'uppercase' }}>Fournisseur</th>
                    <th style={{ borderRight: '1px solid #cbd5e1', padding: isMobile ? '8px' : '12px', fontSize: isMobile ? 10 : 12, fontWeight: 700, color: '#475569', background: '#f1f5f9', textTransform: 'uppercase' }}>N° Facture</th>
                    <th style={{ borderRight: '1px solid #cbd5e1', padding: isMobile ? '8px' : '12px', fontSize: isMobile ? 10 : 12, fontWeight: 700, color: '#475569', background: '#f1f5f9', textTransform: 'uppercase' }}>Montant HT</th>
                    <th style={{ borderRight: '1px solid #cbd5e1', padding: isMobile ? '8px' : '12px', fontSize: isMobile ? 10 : 12, fontWeight: 700, color: '#475569', background: '#f1f5f9', textTransform: 'uppercase' }}>Montant TTC</th>
                    <th style={{ borderRight: '1px solid #cbd5e1', padding: isMobile ? '8px' : '12px', fontSize: isMobile ? 10 : 12, fontWeight: 700, color: '#475569', background: '#f1f5f9', textTransform: 'uppercase' }}>Date d'échéance</th>
                    <th style={{ borderRight: '1px solid #cbd5e1', padding: isMobile ? '8px' : '12px', fontSize: isMobile ? 10 : 12, fontWeight: 700, color: '#475569', background: '#f1f5f9', textTransform: 'uppercase' }}>Date de paiement prévue</th>
                    <th style={{ borderRight: '1px solid #cbd5e1', padding: isMobile ? '8px' : '12px', fontSize: isMobile ? 10 : 12, fontWeight: 700, color: '#475569', background: '#f1f5f9', textTransform: 'uppercase' }}>Paiement effectué ?</th>
                    <th style={{ width: isMobile ? 80 : 120, padding: isMobile ? '8px' : '12px', fontSize: isMobile ? 10 : 12, fontWeight: 700, color: '#475569', background: '#f1f5f9', textTransform: 'uppercase' }}>Total TTC</th>
                  </tr>
                </thead>
              </table>

              {renderPeriod('period1', labels.period1)}
              {renderPeriod('period2', labels.period2)}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
