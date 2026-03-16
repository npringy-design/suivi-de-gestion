import React, { useState, useMemo } from 'react';
import { useData } from './DataContext';
import { getDashboardRowIndices, getISOWeek } from './utils';

const NAV = '#1e293b';
const AMBER = '#f59e0b';
const BLUE = '#3b82f6';
const GREEN = '#10b981';

const WEEKS = Array.from({ length: 52 }, (_, i) => `S${i + 1}`);

const n = (v?: string) => parseFloat((v || '0').replace(',', '.')) || 0;
const fe = (v: number) => v === 0 ? '0,00 €' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v);
const fp = (v: number) => (isFinite(v) && !isNaN(v)) ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '—';

interface ReportingProps {
  onBack: () => void;
  hideHeader?: boolean;
}

export default function Reporting({ onBack, hideHeader = false }: ReportingProps) {
  const { data, selectedYear } = useData();
  const YEAR = selectedYear;
  const MONTHS_SHORT = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'].map(m => `${m}-${YEAR.toString().slice(-2)}`);
  
  const [activeTab, setActiveTab] = useState<'mensuel' | 'hebdo_ca' | 'hebdo_rh'>('mensuel');

  const { monthlyTotals, weeklyTotals } = useMemo(() => {
    const monthly: Record<number, Record<number, number>> = {};
    const weekly: Record<number, Record<number, number>> = {};

    for (let m = 0; m < 12; m++) {
      monthly[m] = {};
      for (let i = 0; i < 110; i++) monthly[m][i] = 0;
    }

    for (let w = 1; w <= 52; w++) {
      weekly[w] = {};
      for (let i = 0; i < 110; i++) weekly[w][i] = 0;
    }

    for (let m = 0; m < 12; m++) {
      const md = data[m]?.dashboard || {};
      const indices = getDashboardRowIndices(m, YEAR);
      const numDays = new Date(YEAR, m + 1, 0).getDate();

      for (let d = 1; d <= numDays; d++) {
        const rIdx = indices[d];
        const date = new Date(YEAR, m, d);
        const isoWeek = getISOWeek(date);

        for (let cIdx = 0; cIdx < 110; cIdx++) {
          const val = parseFloat(md[`${rIdx}-${cIdx}`] || '0');
          if (!isNaN(val)) {
            monthly[m][cIdx] += val;
            if (isoWeek >= 1 && isoWeek <= 52) {
              weekly[isoWeek][cIdx] += val;
            }
          }
        }
      }
    }

    // Recalculate averages and percentages for monthly
    for (let m = 0; m < 12; m++) {
      const totals = monthly[m];
      if (totals[6] > 0) totals[7] = totals[0] / totals[6]; // CVTS MOY HT MIDI
      if (totals[8] > 0) totals[9] = totals[1] / totals[8]; // CVTS MOY HT SOIR
      if (totals[10] > 0) totals[11] = totals[3] / totals[10]; // CVTS MOY HT JOUR
      if (totals[14] > 0) totals[15] = totals[2] / totals[14]; // CVTS MOY HT LIMONADE
      
      if (totals[33] > 0) totals[34] = totals[18] / totals[33]; // MIDI CVTS MOY (Realise)
      if (totals[35] > 0) totals[36] = totals[20] / totals[35]; // SOIR CVTS MOY (Realise)
      if (totals[37] > 0) totals[38] = (totals[18] + totals[20]) / totals[37]; // JOUR CVTS MOY (Realise)
      if (totals[43] > 0) totals[44] = totals[22] / totals[43]; // JOUR CVTS MOY LIMONADE (Realise)
    }

    // Recalculate averages and percentages for weekly
    for (let w = 1; w <= 52; w++) {
      const totals = weekly[w];
      if (totals[6] > 0) totals[7] = totals[0] / totals[6]; // CVTS MOY HT MIDI
      if (totals[8] > 0) totals[9] = totals[1] / totals[8]; // CVTS MOY HT SOIR
      if (totals[10] > 0) totals[11] = totals[3] / totals[10]; // CVTS MOY HT JOUR
      if (totals[14] > 0) totals[15] = totals[2] / totals[14]; // CVTS MOY HT LIMONADE
      
      if (totals[33] > 0) totals[34] = totals[18] / totals[33]; // MIDI CVTS MOY (Realise)
      if (totals[35] > 0) totals[36] = totals[20] / totals[35]; // SOIR CVTS MOY (Realise)
      if (totals[37] > 0) totals[38] = (totals[18] + totals[20]) / totals[37]; // JOUR CVTS MOY (Realise)
      if (totals[43] > 0) totals[44] = totals[22] / totals[43]; // JOUR CVTS MOY LIMONADE (Realise)

      if (totals[92] > 0) totals[104] = totals[24] / totals[92]; // PRODUCTIVITE
      if (totals[24] > 0) {
        totals[105] = (totals[103] / totals[24]) * 100; // FRAIS DE PERSONNEL REEL
        totals[106] = totals[105]; // RATIO A DATE
      }
    }

    return { monthlyTotals: monthly, weeklyTotals: weekly };
  }, [data]);

  const thBase: React.CSSProperties = {
    position: 'sticky',
    borderTop: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1',
    borderLeft: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1',
    padding: '6px 8px', fontSize: 10, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '.03em',
    textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.25,
    background: '#f8fafc', color: '#334155'
  };

  const tdBase: React.CSSProperties = {
    borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0',
    borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0',
    padding: '6px 8px', fontSize: 11, textAlign: 'center',
    fontWeight: 500, color: '#334155', whiteSpace: 'nowrap',
  };

  const renderMensuel = () => (
    <table style={{ borderCollapse: 'separate', borderSpacing: 0, background: '#fff', width: '100%' }}>
      <thead>
        <tr>
          <th rowSpan={2} style={{ ...thBase, left: 0, zIndex: 30, background: NAV, color: '#fff' }}>DATE</th>
          <th colSpan={6} style={{ ...thBase, background: '#dbeafe', color: '#1e40af' }}>GLOBAL</th>
          <th colSpan={5} style={{ ...thBase, background: '#fef3c7', color: '#92400e' }}>COUVERTS RESTAURANT</th>
          <th colSpan={3} style={{ ...thBase, background: '#dcfce7', color: '#166534' }}>COUVERTS LIMONADE</th>
        </tr>
        <tr>
          <th style={{ ...thBase, background: '#eff6ff' }}>VAE<br/>CA HT VAE</th>
          <th style={{ ...thBase, background: '#eff6ff' }}>MIDI<br/>CA HT MIDI</th>
          <th style={{ ...thBase, background: '#eff6ff' }}>SOIR<br/>CA HT SOIR</th>
          <th style={{ ...thBase, background: '#eff6ff' }}>LIMONADE<br/>CA HT</th>
          <th style={{ ...thBase, background: '#eff6ff' }}>MOIS<br/>CAHT MOIS</th>
          <th style={{ ...thBase, background: '#eff6ff' }}>CUMUL<br/>CA HT CUMUL</th>
          
          <th style={{ ...thBase, background: '#fffbeb' }}>MIDI<br/>NB CVTS</th>
          <th style={{ ...thBase, background: '#fffbeb' }}>MIDI<br/>CVTS MOY</th>
          <th style={{ ...thBase, background: '#fffbeb' }}>SOIR<br/>NB CVTS</th>
          <th style={{ ...thBase, background: '#fffbeb' }}>SOIR<br/>CVTS MOY</th>
          <th style={{ ...thBase, background: '#fffbeb' }}>MOIS<br/>NB CVTS</th>
          
          <th style={{ ...thBase, background: '#f0fdf4' }}>MOIS<br/>NB CVTS</th>
          <th style={{ ...thBase, background: '#f0fdf4' }}>MOIS<br/>CVTS MOY</th>
          <th style={{ ...thBase, background: '#f0fdf4' }}>MOIS<br/>CVTS CUMUL</th>
        </tr>
      </thead>
      <tbody>
        {MONTHS_SHORT.map((m, i) => {
          const dt = monthlyTotals[i];
          let cumulCA = 0;
          let cumulCvtsLimo = 0;
          for (let j = 0; j <= i; j++) {
            cumulCA += monthlyTotals[j][24] || 0;
            cumulCvtsLimo += monthlyTotals[j][43] || 0;
          }
          
          return (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
              <td style={{ ...tdBase, position: 'sticky', left: 0, background: '#f1f5f9', fontWeight: 700, zIndex: 10 }}>{m}</td>
              <td style={{ ...tdBase }}>{fe(dt[17])}</td>
              <td style={{ ...tdBase }}>{fe(dt[18])}</td>
              <td style={{ ...tdBase }}>{fe(dt[20])}</td>
              <td style={{ ...tdBase }}>{fe(dt[22])}</td>
              <td style={{ ...tdBase, fontWeight: 700 }}>{fe(dt[24])}</td>
              <td style={{ ...tdBase, fontWeight: 700, color: BLUE }}>{fe(cumulCA)}</td>
              
              <td style={{ ...tdBase }}>{dt[33]}</td>
              <td style={{ ...tdBase }}>{fe(dt[34])}</td>
              <td style={{ ...tdBase }}>{dt[35]}</td>
              <td style={{ ...tdBase }}>{fe(dt[36])}</td>
              <td style={{ ...tdBase, fontWeight: 700 }}>{dt[37]}</td>
              
              <td style={{ ...tdBase }}>{dt[43]}</td>
              <td style={{ ...tdBase }}>{fe(dt[44])}</td>
              <td style={{ ...tdBase, fontWeight: 700, color: GREEN }}>{cumulCvtsLimo}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  const renderHebdoCA = () => (
    <table style={{ borderCollapse: 'separate', borderSpacing: 0, background: '#fff', width: '100%' }}>
      <thead>
        <tr>
          <th rowSpan={2} style={{ ...thBase, left: 0, zIndex: 30, background: NAV, color: '#fff' }}>DATE</th>
          <th colSpan={6} style={{ ...thBase, background: '#dbeafe', color: '#1e40af' }}>CA HT</th>
          <th colSpan={4} style={{ ...thBase, background: '#fef3c7', color: '#92400e' }}>COUVERTS RESTAURANT</th>
          <th colSpan={3} style={{ ...thBase, background: '#f3e8ff', color: '#6b21a8' }}>SEMAINE RESTAURANT (SANS VAE)</th>
          <th colSpan={3} style={{ ...thBase, background: '#dcfce7', color: '#166534' }}>SEMAINE LIMONADE</th>
        </tr>
        <tr>
          <th style={{ ...thBase, background: '#eff6ff' }}>VAE<br/>CA HT VAE</th>
          <th style={{ ...thBase, background: '#eff6ff' }}>MIDI<br/>CA HT MIDI</th>
          <th style={{ ...thBase, background: '#eff6ff' }}>SOIR<br/>CA HT SOIR</th>
          <th style={{ ...thBase, background: '#eff6ff' }}>LIMONADE<br/>CA HT</th>
          <th style={{ ...thBase, background: '#eff6ff' }}>SEMAINE<br/>CA HT SEMAINE</th>
          <th style={{ ...thBase, background: '#eff6ff' }}>CUMUL ANNUEL<br/>CA HT CUMUL</th>
          
          <th style={{ ...thBase, background: '#fffbeb' }}>MIDI<br/>NB CVTS</th>
          <th style={{ ...thBase, background: '#fffbeb' }}>MIDI<br/>CVTS MOY</th>
          <th style={{ ...thBase, background: '#fffbeb' }}>SOIR<br/>NB CVTS</th>
          <th style={{ ...thBase, background: '#fffbeb' }}>SOIR<br/>CVTS MOY</th>
          
          <th style={{ ...thBase, background: '#faf5ff' }}>NB CVTS</th>
          <th style={{ ...thBase, background: '#faf5ff' }}>CVTS MOY</th>
          <th style={{ ...thBase, background: '#faf5ff' }}>CVTS CUMUL</th>
          
          <th style={{ ...thBase, background: '#f0fdf4' }}>NB CVTS</th>
          <th style={{ ...thBase, background: '#f0fdf4' }}>CVTS MOY</th>
          <th style={{ ...thBase, background: '#f0fdf4' }}>CVTS CUMUL</th>
        </tr>
      </thead>
      <tbody>
        {WEEKS.map((w, i) => {
          const weekNum = i + 1;
          const dt = weeklyTotals[weekNum] || {};
          let cumulCA = 0;
          let cumulCvtsResto = 0;
          let cumulCvtsLimo = 0;
          for (let j = 1; j <= weekNum; j++) {
            cumulCA += weeklyTotals[j]?.[24] || 0;
            cumulCvtsResto += weeklyTotals[j]?.[37] || 0;
            cumulCvtsLimo += weeklyTotals[j]?.[43] || 0;
          }

          return (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
              <td style={{ ...tdBase, position: 'sticky', left: 0, background: '#f1f5f9', fontWeight: 700, zIndex: 10 }}>{w}</td>
              <td style={{ ...tdBase }}>{fe(dt[17])}</td>
              <td style={{ ...tdBase }}>{fe(dt[18])}</td>
              <td style={{ ...tdBase }}>{fe(dt[20])}</td>
              <td style={{ ...tdBase }}>{fe(dt[22])}</td>
              <td style={{ ...tdBase, fontWeight: 700 }}>{fe(dt[24])}</td>
              <td style={{ ...tdBase, fontWeight: 700, color: BLUE }}>{fe(cumulCA)}</td>
              
              <td style={{ ...tdBase }}>{dt[33] || 0}</td>
              <td style={{ ...tdBase }}>{fe(dt[34])}</td>
              <td style={{ ...tdBase }}>{dt[35] || 0}</td>
              <td style={{ ...tdBase }}>{fe(dt[36])}</td>
              
              <td style={{ ...tdBase, fontWeight: 700 }}>{dt[37] || 0}</td>
              <td style={{ ...tdBase }}>{fe(dt[38])}</td>
              <td style={{ ...tdBase, fontWeight: 700, color: '#7e22ce' }}>{cumulCvtsResto}</td>
              
              <td style={{ ...tdBase, fontWeight: 700 }}>{dt[43] || 0}</td>
              <td style={{ ...tdBase }}>{fe(dt[44])}</td>
              <td style={{ ...tdBase, fontWeight: 700, color: GREEN }}>{cumulCvtsLimo}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  const renderHebdoRH = () => (
    <table style={{ borderCollapse: 'separate', borderSpacing: 0, background: '#fff', width: '100%' }}>
      <thead>
        <tr>
          <th rowSpan={2} style={{ ...thBase, left: 0, zIndex: 30, background: NAV, color: '#fff' }}>DATE</th>
          <th colSpan={11} style={{ ...thBase, background: '#fce4d6', color: '#c2410c' }}>FRAIS DE PERSONNEL REALISES</th>
          <th colSpan={5} style={{ ...thBase, background: '#ffedd5', color: '#9a3412' }}>INDICATEURS</th>
        </tr>
        <tr>
          <th style={{ ...thBase, background: '#fff7ed' }}>TOTAL HEURES<br/>TRAVAILLEES</th>
          <th style={{ ...thBase, background: '#fff7ed' }}>CADRE<br/>CUISINE<br/>(38,54 €)</th>
          <th style={{ ...thBase, background: '#fff7ed' }}>CADRE<br/>SALLE<br/>(38,54 €)</th>
          <th style={{ ...thBase, background: '#fff7ed' }}>MAITRISE<br/>CUISINE<br/>(20,85 €)</th>
          <th style={{ ...thBase, background: '#fff7ed' }}>MAITRISE<br/>SALLE<br/>(20,85 €)</th>
          <th style={{ ...thBase, background: '#fff7ed' }}>NIV I ET II<br/>CUISINE<br/>(16,04 €)</th>
          <th style={{ ...thBase, background: '#fff7ed' }}>NIV I ET II<br/>SALLE<br/>(16,04 €)</th>
          <th style={{ ...thBase, background: '#fff7ed' }}>NIV III<br/>CUISINE<br/>(18,35 €)</th>
          <th style={{ ...thBase, background: '#fff7ed' }}>NIV III<br/>SALLE<br/>(18,35 €)</th>
          <th style={{ ...thBase, background: '#fff7ed' }}>APPRENTI<br/>CUISINE<br/>(8,39 €)</th>
          <th style={{ ...thBase, background: '#fff7ed' }}>APPRENTI<br/>SALLE<br/>(8,39 €)</th>
          
          <th style={{ ...thBase, background: '#ffedd5' }}>COUT<br/>GLOBAL</th>
          <th style={{ ...thBase, background: '#ffedd5' }}>PRODUCTIVITE<br/>CIBLE<br/>(50,00)</th>
          <th style={{ ...thBase, background: '#ffedd5' }}>FRAIS DE PERSONNEL<br/>REEL<br/>(35,00%)</th>
          <th style={{ ...thBase, background: '#ffedd5' }}>RATIO<br/>A DATE</th>
          <th style={{ ...thBase, background: '#ffedd5' }}>RATIO<br/>ANNUEL %</th>
        </tr>
      </thead>
      <tbody>
        {WEEKS.map((w, i) => {
          const weekNum = i + 1;
          const dt = weeklyTotals[weekNum] || {};
          let cumulCA = 0;
          let cumulCoutGlobal = 0;
          for (let j = 1; j <= weekNum; j++) {
            cumulCA += weeklyTotals[j]?.[24] || 0;
            cumulCoutGlobal += weeklyTotals[j]?.[103] || 0;
          }
          const ratioAnnuel = cumulCA > 0 ? (cumulCoutGlobal / cumulCA) * 100 : 0;

          return (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
              <td style={{ ...tdBase, position: 'sticky', left: 0, background: '#f1f5f9', fontWeight: 700, zIndex: 10 }}>{w}</td>
              <td style={{ ...tdBase }}>{dt[92]?.toFixed(2) || '0.00'}</td>
              <td style={{ ...tdBase }}>{dt[93]?.toFixed(2) || '0.00'}</td>
              <td style={{ ...tdBase }}>{dt[94]?.toFixed(2) || '0.00'}</td>
              <td style={{ ...tdBase }}>{dt[95]?.toFixed(2) || '0.00'}</td>
              <td style={{ ...tdBase }}>{dt[96]?.toFixed(2) || '0.00'}</td>
              <td style={{ ...tdBase }}>{dt[97]?.toFixed(2) || '0.00'}</td>
              <td style={{ ...tdBase }}>{dt[98]?.toFixed(2) || '0.00'}</td>
              <td style={{ ...tdBase }}>{dt[99]?.toFixed(2) || '0.00'}</td>
              <td style={{ ...tdBase }}>{dt[100]?.toFixed(2) || '0.00'}</td>
              <td style={{ ...tdBase }}>{dt[101]?.toFixed(2) || '0.00'}</td>
              <td style={{ ...tdBase }}>{dt[102]?.toFixed(2) || '0.00'}</td>
              
              <td style={{ ...tdBase, fontWeight: 700 }}>{fe(dt[103])}</td>
              <td style={{ ...tdBase }}>{dt[104]?.toFixed(2) || '0.00'}</td>
              <td style={{ ...tdBase }}>{fe(dt[103])}</td>
              <td style={{ ...tdBase, fontWeight: 700 }}>{fp(dt[106])}</td>
              <td style={{ ...tdBase, fontWeight: 700, color: '#c2410c' }}>{fp(ratioAnnuel)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <div style={{ height: hideHeader ? '100%' : '100vh', background: '#f1f5f9', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap'); *{box-sizing:border-box} button{outline:none}`}</style>

      {!hideHeader && (
        <header style={{ background: NAV, height: 52, padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#94a3b8', cursor: 'pointer', background: 'none', border: 'none', padding: '6px 0', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', transition: 'color .2s', textTransform: 'uppercase', letterSpacing: '.05em' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')} onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            Retour Accueil
          </button>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase' }}>
            📊 Reporting · {YEAR}
          </div>
          <div style={{ background: '#f59e0b18', border: '1px solid #f59e0b30', borderRadius: 6, padding: '4px 14px', color: AMBER, fontSize: 11, fontWeight: 700, letterSpacing: '.04em' }}>
            BURO MONTE
          </div>
        </header>
      )}

      <div style={{ padding: '12px 28px', display: 'flex', gap: 8, background: '#fff', borderBottom: '1px solid #e2e8f0', alignItems: 'center' }}>
        {([
          { key: 'mensuel' as const, label: 'Suivi de gestion & budget', sub: 'Mensuel', icon: '📅' },
          { key: 'hebdo_ca' as const, label: 'CA & Couverts', sub: `Semaines ${YEAR}`, icon: '📊' },
          { key: 'hebdo_rh' as const, label: 'Frais de personnel réalisés', sub: 'Hebdomadaire', icon: '👥' },
        ]).map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 16px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                background: isActive ? BLUE : '#f8fafc',
                border: `1.5px solid ${isActive ? BLUE : '#e2e8f0'}`,
                boxShadow: isActive ? '0 2px 8px rgba(59,130,246,0.2)' : 'none',
                transition: 'all .18s',
              }}
            >
              <span style={{ fontSize: 16 }}>{tab.icon}</span>
              <span style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? '#fff' : '#334155', letterSpacing: '.02em', lineHeight: 1.3 }}>{tab.label}</span>
                <span style={{ fontSize: 9.5, fontWeight: 500, color: isActive ? 'rgba(255,255,255,.75)' : '#94a3b8', letterSpacing: '.04em', textTransform: 'uppercase' }}>{tab.sub}</span>
              </span>
              {isActive && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 2 }}>
                  <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {activeTab === 'mensuel' && renderMensuel()}
        {activeTab === 'hebdo_ca' && renderHebdoCA()}
        {activeTab === 'hebdo_rh' && renderHebdoRH()}
      </div>
    </div>
  );
}
