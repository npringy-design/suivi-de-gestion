import React, { useEffect, useState, useMemo } from 'react';

import { useData } from '@/contexts/DataContext';
import { parseMoneyValue } from '@/lib/money';

import { getDashboardRowIndices, getISOWeekAndYear } from '@/lib/utils';
import { resolvePersonnelSchema } from '@/features/dashboard/personnelSchema';
import { HOURS_REALISE_CUISINE_SALLE, HOURS_REALISE_GLOBAL } from '@/features/dashboard/dashboardColumnIndex';
import { formatDecimal, formatEuroSymbol, formatPercentSigned } from '@/lib/formatters';
import { useHasLimonade } from '@/lib/useHasLimonade';
import { buildDynamicColumns } from '@/features/dashboard/dashboardColumns';
import { parsePayrollHourForCalculation } from '@/features/dashboard/dashboardCalculations';
import { createBudgetVaeLookup } from '@/features/dashboard/budgetVae';
import { computeMonthDashboard } from '@/features/edg/edgRealtimeSources';

const NAV = '#1e293b';
const AMBER = '#f59e0b';
const BLUE = '#3b82f6';
const GREEN = '#10b981';


// Colonnes du Suivi quotidien sommées par le Reporting : 17 VAE, 18/19 CA midi/soir, 20 CA limonade,
// 21 CA jour, 25/27/29 couverts midi/soir/jour, 34 couverts limonade, 76 total heures, 87 coût global.
type DayTotals = Record<number, number>;
const HOURS_COLS_CUISINE_SALLE: readonly number[] = HOURS_REALISE_CUISINE_SALLE;
const HOURS_COLS_GLOBAL: readonly number[] = HOURS_REALISE_GLOBAL;
const REPORTING_COLS = [17, 18, 19, 20, 21, 25, 27, 29, 34, 76, 87, ...HOURS_COLS_CUISINE_SALLE, ...HOURS_COLS_GLOBAL];
const isHoursCol = (col: number): boolean => HOURS_COLS_CUISINE_SALLE.includes(col) || HOURS_COLS_GLOBAL.includes(col);
const zeroTotals = (): DayTotals => Object.fromEntries(REPORTING_COLS.map(col => [col, 0]));

const fe = formatEuroSymbol;
const fp = formatPercentSigned;

interface ReportingProps {
  onBack: () => void;
  hideHeader?: boolean;
}

export default function Reporting({ onBack, hideHeader = false }: ReportingProps) {
  const { data, allData, selectedYear, loadYearFromCloud } = useData();
  const YEAR = selectedYear;
  const hasLimonade = useHasLimonade();
  const MONTHS_SHORT = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'].map(m => `${m}-${YEAR.toString().slice(-2)}`);
  
  const [activeTab, setActiveTab] = useState<'mensuel' | 'hebdo_ca' | 'hebdo_rh'>('mensuel');

  // Schéma du personnel : global dès qu'un mois est en global (les mois cuisine/salle sont alors regroupés
  // par catégorie), sinon cuisine/salle. Même résolution par mois que le Suivi quotidien et le Récap.
  const personnelSchema = useMemo(
    () => (Object.values(data).some(m => resolvePersonnelSchema(m) === 'global') ? 'global' : 'cuisine_salle'),
    [data],
  );
  // Semaines ISO de l'année : la semaine 1 peut commencer fin décembre N-1 et la semaine 53 finir début
  // janvier N+1 (ex. 2026) : on lit donc aussi les années voisines.
  useEffect(() => {
    void loadYearFromCloud(YEAR - 2);
    void loadYearFromCloud(YEAR - 1);
    void loadYearFromCloud(YEAR + 1);
  }, [YEAR, loadYearFromCloud]);
  const weeks = useMemo(() => {
    const count = getISOWeekAndYear(new Date(YEAR, 11, 28)).week;
    return Array.from({ length: count }, (_, i) => `S${i + 1}`);
  }, [YEAR]);
  const hoursCols = personnelSchema === 'global' ? HOURS_COLS_GLOBAL : HOURS_COLS_CUISINE_SALLE;
  // Libellés des catégories tirés des colonnes du tableau de bord (jamais en dur).
  const hoursLabels = useMemo(() => {
    const monthWithCategories = Object.values(data).find(m => m?.salariesConfig?.categories);
    const columns = buildDynamicColumns(monthWithCategories?.salariesConfig?.categories, {});
    return hoursCols.map(col => String(columns[col]?.[2] ?? col));
  }, [data, hoursCols]);

  // Source : données calculées du Suivi quotidien (computeMonthDashboard), sommées sur les lignes jour
  // (par mois, puis par semaine ISO). Aucune lecture des cellules brutes.
  const { monthlyTotals, weeklyTotals } = useMemo(() => {
    const monthly: DayTotals[] = Array.from({ length: 12 }, zeroTotals);
    const weekly: DayTotals[] = Array.from({ length: 54 }, zeroTotals);
    const groupByCategory = personnelSchema === 'global';

    // Mois calendaires de l'année + décembre N-1 et janvier N+1 (pour les semaines ISO à cheval).
    const sources: Array<{ y: number; m: number }> = [
      { y: YEAR - 1, m: 11 },
      ...Array.from({ length: 12 }, (_, m) => ({ y: YEAR, m })),
      { y: YEAR + 1, m: 0 },
    ];
    sources.forEach(({ y, m }) => {
      const monthData = y === YEAR ? data[m] : allData[y]?.[m];
      const computed = computeMonthDashboard(monthData, m, y, hasLimonade, createBudgetVaeLookup(allData, y));
      if (Object.keys(computed).length === 0) return;
      const monthIsCuisineSalle = resolvePersonnelSchema(monthData) === 'cuisine_salle';
      const indices = getDashboardRowIndices(m, y);
      const numDays = new Date(y, m + 1, 0).getDate();

      for (let d = 1; d <= numDays; d++) {
        const rIdx = indices[d];
        if (rIdx === undefined) continue;
        const iso = getISOWeekAndYear(new Date(y, m, d));
        const inYear = y === YEAR;
        const inIsoYear = iso.year === YEAR;
        if (!inYear && !inIsoYear) continue;
        const add = (col: number, val: number) => {
          if (inYear) monthly[m][col] += val;
          if (inIsoYear) weekly[iso.week][col] += val;
        };
        REPORTING_COLS.forEach(col => {
          const raw = computed[`${rIdx}-${col}`] ?? '';
          const val = isHoursCol(col) ? parsePayrollHourForCalculation(raw) : parseMoneyValue(raw);
          if (!Number.isFinite(val) || val === 0) return;
          add(col, val);
          // Mois cuisine/salle affiché en global : heures cuisine + salle regroupées dans la catégorie.
          const csIdx = HOURS_COLS_CUISINE_SALLE.indexOf(col);
          if (groupByCategory && monthIsCuisineSalle && csIdx >= 0) add(HOURS_COLS_GLOBAL[Math.floor(csIdx / 2)], val);
        });
      }
    });
    return { monthlyTotals: monthly, weeklyTotals: weekly };
  }, [data, allData, YEAR, hasLimonade, personnelSchema]);

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

  // Cumuls d'une colonne sur une série (mois ou semaines) jusqu'à l'indice i inclus.
  const cumulTo = (series: DayTotals[], col: number, from: number, to: number): number => {
    let total = 0;
    for (let j = from; j <= to; j++) total += series[j]?.[col] ?? 0;
    return total;
  };
  const nb = (v: number | undefined) => formatDecimal(v ?? 0, 0);
  const avg = (num: number, den: number) => (den > 0 ? num / den : 0);

  // Lignes de CA et de couverts communes au mensuel et à l'hebdomadaire.
  const renderCaCells = (dt: DayTotals, cumulCA: number) => (
    <>
      <td style={{ ...tdBase }}>{fe(dt[17])}</td>
      <td style={{ ...tdBase }}>{fe(dt[18])}</td>
      <td style={{ ...tdBase }}>{fe(dt[19])}</td>
      {hasLimonade && <td style={{ ...tdBase }}>{fe(dt[20])}</td>}
      <td style={{ ...tdBase, fontWeight: 700 }}>{fe(dt[21])}</td>
      <td style={{ ...tdBase, fontWeight: 700, color: BLUE }}>{fe(cumulCA)}</td>
    </>
  );
  const renderCaHeaders = (periodLabel: string, cumulLabel: string) => (
    <>
      <th style={{ ...thBase, background: '#eff6ff' }}>VAE<br/>CA HT VAE</th>
      <th style={{ ...thBase, background: '#eff6ff' }}>MIDI<br/>CA HT MIDI</th>
      <th style={{ ...thBase, background: '#eff6ff' }}>SOIR<br/>CA HT SOIR</th>
      {hasLimonade && <th style={{ ...thBase, background: '#eff6ff' }}>LIMONADE<br/>CA HT</th>}
      <th style={{ ...thBase, background: '#eff6ff' }}>{periodLabel}<br/>CA HT {periodLabel}</th>
      <th style={{ ...thBase, background: '#eff6ff' }}>{cumulLabel}<br/>CA HT CUMUL</th>
    </>
  );
  const caColSpan = hasLimonade ? 6 : 5;

  const renderMensuel = () => (
    <table style={{ borderCollapse: 'separate', borderSpacing: 0, background: '#fff', width: '100%' }}>
      <thead>
        <tr>
          <th rowSpan={2} style={{ ...thBase, left: 0, zIndex: 30, background: NAV, color: '#fff' }}>DATE</th>
          <th colSpan={caColSpan} style={{ ...thBase, background: '#dbeafe', color: '#1e40af' }}>GLOBAL</th>
          <th colSpan={7} style={{ ...thBase, background: '#fef3c7', color: '#92400e' }}>COUVERTS RESTAURANT</th>
          {hasLimonade && <th colSpan={3} style={{ ...thBase, background: '#dcfce7', color: '#166534' }}>COUVERTS LIMONADE</th>}
        </tr>
        <tr>
          {renderCaHeaders('MOIS', 'CUMUL')}
          <th style={{ ...thBase, background: '#fffbeb' }}>MIDI<br/>NB CVTS</th>
          <th style={{ ...thBase, background: '#fffbeb' }}>MIDI<br/>CVTS MOY</th>
          <th style={{ ...thBase, background: '#fffbeb' }}>SOIR<br/>NB CVTS</th>
          <th style={{ ...thBase, background: '#fffbeb' }}>SOIR<br/>CVTS MOY</th>
          <th style={{ ...thBase, background: '#fffbeb' }}>MOIS<br/>NB CVTS</th>
          <th style={{ ...thBase, background: '#fffbeb' }}>MOIS<br/>CVTS MOY</th>
          <th style={{ ...thBase, background: '#fffbeb' }}>MOIS<br/>CVTS CUMUL</th>
          {hasLimonade && (
            <>
              <th style={{ ...thBase, background: '#f0fdf4' }}>MOIS<br/>NB CVTS</th>
              <th style={{ ...thBase, background: '#f0fdf4' }}>MOIS<br/>CVTS MOY</th>
              <th style={{ ...thBase, background: '#f0fdf4' }}>MOIS<br/>CVTS CUMUL</th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {MONTHS_SHORT.map((m, i) => {
          const dt = monthlyTotals[i];
          return (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
              <td style={{ ...tdBase, position: 'sticky', left: 0, background: '#f1f5f9', fontWeight: 700, zIndex: 10 }}>{m}</td>
              {renderCaCells(dt, cumulTo(monthlyTotals, 21, 0, i))}
              <td style={{ ...tdBase }}>{nb(dt[25])}</td>
              <td style={{ ...tdBase }}>{fe(avg(dt[18], dt[25]))}</td>
              <td style={{ ...tdBase }}>{nb(dt[27])}</td>
              <td style={{ ...tdBase }}>{fe(avg(dt[19], dt[27]))}</td>
              <td style={{ ...tdBase, fontWeight: 700 }}>{nb(dt[29])}</td>
              <td style={{ ...tdBase }}>{fe(avg(dt[18] + dt[19], dt[29]))}</td>
              <td style={{ ...tdBase, fontWeight: 700, color: '#7e22ce' }}>{nb(cumulTo(monthlyTotals, 29, 0, i))}</td>
              {hasLimonade && (
                <>
                  <td style={{ ...tdBase, fontWeight: 700 }}>{nb(dt[34])}</td>
                  <td style={{ ...tdBase }}>{fe(avg(dt[20], dt[34]))}</td>
                  <td style={{ ...tdBase, fontWeight: 700, color: GREEN }}>{nb(cumulTo(monthlyTotals, 34, 0, i))}</td>
                </>
              )}
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
          <th colSpan={caColSpan} style={{ ...thBase, background: '#dbeafe', color: '#1e40af' }}>CA HT</th>
          <th colSpan={4} style={{ ...thBase, background: '#fef3c7', color: '#92400e' }}>COUVERTS RESTAURANT</th>
          <th colSpan={3} style={{ ...thBase, background: '#f3e8ff', color: '#6b21a8' }}>SEMAINE RESTAURANT (SANS VAE)</th>
          {hasLimonade && <th colSpan={3} style={{ ...thBase, background: '#dcfce7', color: '#166534' }}>SEMAINE LIMONADE</th>}
        </tr>
        <tr>
          {renderCaHeaders('SEMAINE', 'CUMUL ANNUEL')}
          <th style={{ ...thBase, background: '#fffbeb' }}>MIDI<br/>NB CVTS</th>
          <th style={{ ...thBase, background: '#fffbeb' }}>MIDI<br/>CVTS MOY</th>
          <th style={{ ...thBase, background: '#fffbeb' }}>SOIR<br/>NB CVTS</th>
          <th style={{ ...thBase, background: '#fffbeb' }}>SOIR<br/>CVTS MOY</th>

          <th style={{ ...thBase, background: '#faf5ff' }}>NB CVTS</th>
          <th style={{ ...thBase, background: '#faf5ff' }}>CVTS MOY</th>
          <th style={{ ...thBase, background: '#faf5ff' }}>CVTS CUMUL</th>

          {hasLimonade && (
            <>
              <th style={{ ...thBase, background: '#f0fdf4' }}>NB CVTS</th>
              <th style={{ ...thBase, background: '#f0fdf4' }}>CVTS MOY</th>
              <th style={{ ...thBase, background: '#f0fdf4' }}>CVTS CUMUL</th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {weeks.map((w, i) => {
          const weekNum = i + 1;
          const dt = weeklyTotals[weekNum];
          return (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
              <td style={{ ...tdBase, position: 'sticky', left: 0, background: '#f1f5f9', fontWeight: 700, zIndex: 10 }}>{w}</td>
              {renderCaCells(dt, cumulTo(weeklyTotals, 21, 1, weekNum))}
              <td style={{ ...tdBase }}>{nb(dt[25])}</td>
              <td style={{ ...tdBase }}>{fe(avg(dt[18], dt[25]))}</td>
              <td style={{ ...tdBase }}>{nb(dt[27])}</td>
              <td style={{ ...tdBase }}>{fe(avg(dt[19], dt[27]))}</td>

              <td style={{ ...tdBase, fontWeight: 700 }}>{nb(dt[29])}</td>
              <td style={{ ...tdBase }}>{fe(avg(dt[18] + dt[19], dt[29]))}</td>
              <td style={{ ...tdBase, fontWeight: 700, color: '#7e22ce' }}>{nb(cumulTo(weeklyTotals, 29, 1, weekNum))}</td>

              {hasLimonade && (
                <>
                  <td style={{ ...tdBase, fontWeight: 700 }}>{nb(dt[34])}</td>
                  <td style={{ ...tdBase }}>{fe(avg(dt[20], dt[34]))}</td>
                  <td style={{ ...tdBase, fontWeight: 700, color: GREEN }}>{nb(cumulTo(weeklyTotals, 34, 1, weekNum))}</td>
                </>
              )}
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
          <th colSpan={hoursCols.length + 1} style={{ ...thBase, background: '#fce4d6', color: '#c2410c' }}>FRAIS DE PERSONNEL REALISES</th>
          <th colSpan={5} style={{ ...thBase, background: '#ffedd5', color: '#9a3412' }}>INDICATEURS</th>
        </tr>
        <tr>
          <th style={{ ...thBase, background: '#fff7ed' }}>TOTAL HEURES<br/>TRAVAILLEES</th>
          {hoursLabels.map((label, i) => (
            <th key={hoursCols[i]} style={{ ...thBase, background: '#fff7ed' }}>{label}</th>
          ))}

          <th style={{ ...thBase, background: '#ffedd5' }}>COUT<br/>GLOBAL</th>
          <th style={{ ...thBase, background: '#ffedd5' }}>PRODUCTIVITE<br/>CA HT / HEURE</th>
          <th style={{ ...thBase, background: '#ffedd5' }}>FRAIS DE PERSONNEL<br/>REEL</th>
          <th style={{ ...thBase, background: '#ffedd5' }}>RATIO<br/>A DATE</th>
          <th style={{ ...thBase, background: '#ffedd5' }}>RATIO<br/>ANNUEL %</th>
        </tr>
      </thead>
      <tbody>
        {weeks.map((w, i) => {
          const weekNum = i + 1;
          const dt = weeklyTotals[weekNum];
          const cumulCA = cumulTo(weeklyTotals, 21, 1, weekNum);
          const cumulCout = cumulTo(weeklyTotals, 87, 1, weekNum);
          const ratioSemaine = dt[21] > 0 ? (dt[87] / dt[21]) * 100 : 0;
          const ratioAnnuel = cumulCA > 0 ? (cumulCout / cumulCA) * 100 : 0;

          return (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
              <td style={{ ...tdBase, position: 'sticky', left: 0, background: '#f1f5f9', fontWeight: 700, zIndex: 10 }}>{w}</td>
              <td style={{ ...tdBase, fontWeight: 700 }}>{formatDecimal(dt[76], 2)}</td>
              {hoursCols.map(col => (
                <td key={col} style={{ ...tdBase }}>{formatDecimal(dt[col], 2)}</td>
              ))}

              <td style={{ ...tdBase, fontWeight: 700 }}>{fe(dt[87])}</td>
              <td style={{ ...tdBase }}>{formatDecimal(avg(dt[21], dt[76]), 2)}</td>
              <td style={{ ...tdBase }}>{fp(ratioSemaine)}</td>
              <td style={{ ...tdBase, fontWeight: 700 }}>{fp(ratioSemaine)}</td>
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

      <div style={{ padding: '12px 28px', display: 'flex', gap: 8, background: '#fff', borderBottom: '1px solid #e2e8f0', alignItems: 'center', flexShrink: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {([
          { key: 'mensuel' as const, label: 'Suivi de gestion & budget', icon: '📅', accentBg: '#3b82f6', accentColor: '#fff' },
          { key: 'hebdo_ca' as const, label: 'CA & Couverts', icon: '📊', accentBg: '#92400e', accentColor: '#fff' },
          { key: 'hebdo_rh' as const, label: 'Frais de personnel réalisés', icon: '👥', accentBg: '#6b21a8', accentColor: '#fff' },
        ]).map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                background: isActive ? tab.accentBg : '#f8fafc',
                border: `1.5px solid ${isActive ? tab.accentBg : '#e2e8f0'}`,
                boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                transition: 'all .15s',
                whiteSpace: 'nowrap'
              }}
            >
              <span style={{ fontSize: 14 }}>{tab.icon}</span>
              <span style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? tab.accentColor : '#334155', letterSpacing: '.02em', lineHeight: 1.3 }}>{tab.label}</span>
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
