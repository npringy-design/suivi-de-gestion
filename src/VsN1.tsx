import React, { useMemo } from 'react';
import { useData } from './DataContext';
import { getDashboardRowIndices } from './utils';

const MONTHS = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];

interface VsN1Props {
  onBack: () => void;
  hideHeader?: boolean;
}

const n = (v?: string | number) => {
  if (typeof v === 'number') return v;
  return parseFloat((v || '0').toString().replace(',', '.')) || 0;
};

const fe = (v: number) => v === 0 ? '0' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v);
const fp = (v: number) => (isFinite(v) && !isNaN(v)) ? `${v.toFixed(2)}%` : '';

export default function VsN1({ onBack, hideHeader = false }: VsN1Props) {
  const { data, selectedYear } = useData();
  const YEAR = selectedYear;

  const getCaMonth = (m: number) => {
    const md = data[m]?.dashboard || {};
    const indices = getDashboardRowIndices(m, YEAR);
    let total = 0;
    Object.values(indices).forEach(rIdx => {
      total += n(md[`${rIdx}-24`]);
    });
    return total;
  };

  const caMonths = useMemo(() => Array.from({ length: 12 }, (_, i) => getCaMonth(i)), [data]);
  const caTotal = caMonths.reduce((a, b) => a + b, 0);

  const getValN1 = (m: number, key: string) => n(data[m]?.edgMensuelN1?.[key]);
  const getValR = (m: number, key: string) => n(data[m]?.edgMensuelRealise?.[key]);

  const getRowData = (key: string) => {
    const monthsN1 = Array.from({ length: 12 }, (_, i) => getValN1(i, key));
    const monthsR = Array.from({ length: 12 }, (_, i) => getValR(i, key));
    const totalN1 = monthsN1.reduce((a, b) => a + b, 0);
    const totalR = monthsR.reduce((a, b) => a + b, 0);
    return { monthsN1, monthsR, totalN1, totalR };
  };

  const getMonthCalculations = (m: number) => {
    const caN1 = n(data[m]?.edgMensuelN1?.['ca_total_ht']);
    const caR = caMonths[m]; // Realise CA from dashboard
    
    const valN1 = (k: string) => getValN1(m, k);
    const valR = (k: string) => getValR(m, k);

    const calcValues = (val: (k: string) => number, ca: number) => {
      const coutMatiere = val('achats_food') + val('consommables') + val('variation_stock') + val('repas_salaries');
      const margeBrute = ca + coutMatiere;
      const totalMarge = margeBrute + val('refacturation');
      
      const fraisPersDirects = val('cout_salaires') + val('charges_sociales') + val('frais_formation') + val('aides_subventions');
      const fraisPersIndirects = val('prov_cp_brut') + val('prov_cp_pat') + val('prov_prud');
      const totalAutresFraisPers = val('taxe_salaires') + val('autres_primes');
      const totalSalairesCharges = fraisPersDirects + fraisPersIndirects + totalAutresFraisPers;
      
      const totalPublicite = val('prestation_anim') + val('pub_locale');
      const totalFgExploitation = val('comm_encaissement') + val('produits_entretien') + val('fournitures_bureau') + val('materiel_outillage') + val('blanchissage') + val('vetement_pro') + val('ptt') + val('enlev_fonds') + val('transport') + val('honoraires_comptables') + val('honoraires_divers');
      const totalFgOccupation = val('contrats_maintenance') + val('entretien_locaux') + val('nettoyage_locaux') + val('surveillance') + val('energie') + val('gaz_eau') + val('assurances');
      
      const resultatGestion = totalMarge + totalSalairesCharges + totalPublicite + totalFgExploitation + totalFgOccupation;
      const coutImm = val('amortissements') + val('credit_bail') + val('loyers_murs') + val('charges_locatives') + val('impots_taxes');
      const resExploit = resultatGestion + coutImm + val('redevances_spre') + val('redevances_flo') + val('marketing') + val('except_gestion') + val('frais_banque');
      const resCourant = resExploit + val('net_financier');
      const resNetAvantIs = resCourant + val('amortissement_except') + val('frais_holding') + val('pertes_except');
      const ebe = resNetAvantIs + val('retraitement_daa');
      const cashFlow = ebe + val('remboursement_net') + val('remboursement_capital');

      return {
        ca, coutMatiere, margeBrute, totalMarge,
        fraisPersDirects, fraisPersIndirects, totalAutresFraisPers, totalSalairesCharges,
        totalPublicite, totalFgExploitation, totalFgOccupation,
        resultatGestion, coutImm, resExploit, resCourant, resNetAvantIs, ebe, cashFlow
      };
    };

    return {
      n1: calcValues(valN1, caN1),
      realise: calcValues(valR, caR)
    };
  };

  const monthCalcs = useMemo(() => Array.from({ length: 12 }, (_, i) => getMonthCalculations(i)), [data, caMonths]);

  const getTotalCalc = (key: keyof ReturnType<typeof getMonthCalculations>['n1']) => {
    const n1 = monthCalcs.reduce((sum, m) => sum + m.n1[key], 0);
    const realise = monthCalcs.reduce((sum, m) => sum + m.realise[key], 0);
    return { n1, realise };
  };

  const ecart = (r: number, b: number) => r - b;

  const renderDataRow = (label: string, key: string, isBlue = false) => {
    const rowData = getRowData(key);
    const eValTotal = ecart(rowData.totalR, rowData.totalN1);
    const ratioRTotal = caTotal ? (rowData.totalR / caTotal) * 100 : 0;
    
    // Calculate total CA N1
    const caN1Total = monthCalcs.reduce((sum, m) => sum + m.n1.ca, 0);
    const ratioN1Total = caN1Total ? (rowData.totalN1 / caN1Total) * 100 : 0;
    const ratioETotal = ratioRTotal - ratioN1Total;
    
    return (
      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
        <td style={{ padding: '8px 12px', fontSize: 12, background: '#fff', color: '#334155', position: 'sticky', left: 0, zIndex: 10, borderRight: '2px solid #cbd5e1', minWidth: 250 }}>{label}</td>
        {Array.from({ length: 12 }).map((_, m) => {
          const n1Val = rowData.monthsN1[m];
          const rVal = rowData.monthsR[m];
          const eVal = ecart(rVal, n1Val);
          
          const caN1 = n(data[m]?.edgMensuelN1?.['ca_total_ht']);
          const caR = caMonths[m];
          
          const ratioN1 = caN1 ? (n1Val / caN1) * 100 : 0;
          const ratioR = caR ? (rVal / caR) * 100 : 0;
          const ratioE = ratioR - ratioN1;
          
          return (
            <React.Fragment key={m}>
              <td style={{ width: 80, padding: '8px 4px', textAlign: 'right', background: '#f1f5f9', fontSize: 12, color: '#0f172a', borderLeft: '1px solid #e2e8f0' }}>
                {fe(n1Val)}
              </td>
              <td style={{ width: 60, padding: '8px 4px', textAlign: 'right', background: '#e2e8f0', fontSize: 11, color: '#475569', borderLeft: '1px solid #e2e8f0' }}>
                {fp(ratioN1)}
              </td>
              <td style={{ width: 80, padding: '8px 4px', textAlign: 'right', background: isBlue ? '#eff6ff' : '#fff', fontSize: 12, color: '#0f172a', borderLeft: '1px solid #e2e8f0' }}>
                {fe(rVal)}
              </td>
              <td style={{ width: 60, padding: '8px 4px', textAlign: 'right', background: '#fef9c3', fontSize: 11, color: '#854d0e', borderLeft: '1px solid #e2e8f0' }}>
                {fp(ratioR)}
              </td>
              <td style={{ width: 80, padding: '8px 4px', textAlign: 'right', background: '#fee2e2', fontSize: 12, color: eVal < 0 ? '#b91c1c' : '#0f172a', borderLeft: '1px solid #e2e8f0' }}>
                {fe(eVal)}
              </td>
              <td style={{ width: 60, padding: '8px 4px', textAlign: 'right', background: '#fee2e2', fontSize: 11, color: '#991b1b', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #cbd5e1' }}>
                {fp(ratioE)}
              </td>
            </React.Fragment>
          );
        })}
        <td style={{ width: 90, padding: '8px 4px', textAlign: 'right', background: '#f1f5f9', fontSize: 12, fontWeight: 600, color: '#0f172a', borderLeft: '2px solid #cbd5e1' }}>
          {fe(rowData.totalN1)}
        </td>
        <td style={{ width: 60, padding: '8px 4px', textAlign: 'right', background: '#e2e8f0', fontSize: 11, fontWeight: 600, color: '#475569', borderLeft: '1px solid #e2e8f0' }}>
          {fp(ratioN1Total)}
        </td>
        <td style={{ width: 90, padding: '8px 4px', textAlign: 'right', background: isBlue ? '#eff6ff' : '#fff', fontSize: 12, fontWeight: 600, color: '#0f172a', borderLeft: '1px solid #e2e8f0' }}>
          {fe(rowData.totalR)}
        </td>
        <td style={{ width: 60, padding: '8px 4px', textAlign: 'right', background: '#fef9c3', fontSize: 11, fontWeight: 600, color: '#854d0e', borderLeft: '1px solid #e2e8f0' }}>
          {fp(ratioRTotal)}
        </td>
        <td style={{ width: 90, padding: '8px 4px', textAlign: 'right', background: '#fee2e2', fontSize: 12, fontWeight: 600, color: eValTotal < 0 ? '#b91c1c' : '#0f172a', borderLeft: '1px solid #e2e8f0' }}>
          {fe(eValTotal)}
        </td>
        <td style={{ width: 60, padding: '8px 4px', textAlign: 'right', background: '#fee2e2', fontSize: 11, fontWeight: 600, color: '#991b1b', borderLeft: '1px solid #e2e8f0' }}>
          {fp(ratioETotal)}
        </td>
      </tr>
    );
  };

  const renderCalcRow = (label: string, calcKey: keyof ReturnType<typeof getMonthCalculations>['n1'], type: 'header' | 'total' | 'subtotal', isRed = false) => {
    const totals = getTotalCalc(calcKey);
    const eValTotal = ecart(totals.realise, totals.n1);
    
    const caN1Total = monthCalcs.reduce((sum, m) => sum + m.n1.ca, 0);
    const ratioN1Total = caN1Total ? (totals.n1 / caN1Total) * 100 : 0;
    const ratioRTotal = caTotal ? (totals.realise / caTotal) * 100 : 0;
    const ratioETotal = ratioRTotal - ratioN1Total;
    
    let bg = '#fff';
    let color = '#0f172a';
    let weight = 400;
    let borderTop = '1px solid #e2e8f0';
    let borderBottom = '1px solid #e2e8f0';

    if (type === 'header') {
      bg = '#fef2f2';
      color = isRed ? '#b91c1c' : '#0f172a';
      weight = 700;
      borderTop = '2px solid #cbd5e1';
      borderBottom = '2px solid #cbd5e1';
    } else if (type === 'total') {
      bg = '#f0fdf4';
      color = '#166534';
      weight = 700;
      borderTop = '2px solid #cbd5e1';
      borderBottom = '2px solid #cbd5e1';
    } else if (type === 'subtotal') {
      bg = '#f8fafc';
      color = '#0f172a';
      weight = 600;
      borderTop = '1px solid #e2e8f0';
      borderBottom = '1px solid #cbd5e1';
    }

    return (
      <tr style={{ borderBottom, borderTop }}>
        <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: weight, background: bg, color: color, position: 'sticky', left: 0, zIndex: 10, borderRight: '2px solid #cbd5e1', textTransform: type === 'header' || type === 'total' ? 'uppercase' : 'none' }}>{label}</td>
        {monthCalcs.map((mCalc, m) => {
          const n1Val = mCalc.n1[calcKey];
          const rVal = mCalc.realise[calcKey];
          const eVal = ecart(rVal, n1Val);
          
          const caN1 = n(data[m]?.edgMensuelN1?.['ca_total_ht']);
          const caR = caMonths[m];
          
          const ratioN1 = caN1 ? (n1Val / caN1) * 100 : 0;
          const ratioR = caR ? (rVal / caR) * 100 : 0;
          const ratioE = ratioR - ratioN1;
          
          return (
            <React.Fragment key={m}>
              <td style={{ width: 80, padding: '10px 4px', textAlign: 'right', background: type === 'header' || type === 'total' ? bg : '#f1f5f9', color: color, fontSize: 12, fontWeight: weight, borderLeft: '1px solid #e2e8f0' }}>
                {fe(n1Val)}
              </td>
              <td style={{ width: 60, padding: '10px 4px', textAlign: 'right', background: type === 'header' || type === 'total' ? bg : '#e2e8f0', color: type === 'header' || type === 'total' ? color : '#475569', fontSize: 11, fontWeight: weight, borderLeft: '1px solid #e2e8f0' }}>
                {fp(ratioN1)}
              </td>
              <td style={{ width: 80, padding: '10px 4px', textAlign: 'right', background: bg, color: color, fontSize: 12, fontWeight: weight, borderLeft: '1px solid #e2e8f0' }}>
                {fe(rVal)}
              </td>
              <td style={{ width: 60, padding: '10px 4px', textAlign: 'right', background: type === 'header' || type === 'total' ? bg : '#fef9c3', color: type === 'header' || type === 'total' ? color : '#854d0e', fontSize: 11, fontWeight: weight, borderLeft: '1px solid #e2e8f0' }}>
                {fp(ratioR)}
              </td>
              <td style={{ width: 80, padding: '10px 4px', textAlign: 'right', background: type === 'header' || type === 'total' ? bg : '#fee2e2', color: eVal < 0 ? '#b91c1c' : color, fontSize: 12, fontWeight: weight, borderLeft: '1px solid #e2e8f0' }}>
                {fe(eVal)}
              </td>
              <td style={{ width: 60, padding: '10px 4px', textAlign: 'right', background: type === 'header' || type === 'total' ? bg : '#fee2e2', color: type === 'header' || type === 'total' ? color : '#991b1b', fontSize: 11, fontWeight: weight, borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #cbd5e1' }}>
                {fp(ratioE)}
              </td>
            </React.Fragment>
          );
        })}
        <td style={{ width: 90, padding: '10px 4px', textAlign: 'right', background: type === 'header' || type === 'total' ? bg : '#f1f5f9', color: color, fontSize: 12, fontWeight: 800, borderLeft: '2px solid #cbd5e1' }}>
          {fe(totals.n1)}
        </td>
        <td style={{ width: 60, padding: '10px 4px', textAlign: 'right', background: type === 'header' || type === 'total' ? bg : '#e2e8f0', color: type === 'header' || type === 'total' ? color : '#475569', fontSize: 11, fontWeight: 800, borderLeft: '1px solid #e2e8f0' }}>
          {fp(ratioN1Total)}
        </td>
        <td style={{ width: 90, padding: '10px 4px', textAlign: 'right', background: bg, color: color, fontSize: 12, fontWeight: 800, borderLeft: '1px solid #e2e8f0' }}>
          {fe(totals.realise)}
        </td>
        <td style={{ width: 60, padding: '10px 4px', textAlign: 'right', background: type === 'header' || type === 'total' ? bg : '#fef9c3', color: type === 'header' || type === 'total' ? color : '#854d0e', fontSize: 11, fontWeight: 800, borderLeft: '1px solid #e2e8f0' }}>
          {fp(ratioRTotal)}
        </td>
        <td style={{ width: 90, padding: '10px 4px', textAlign: 'right', background: type === 'header' || type === 'total' ? bg : '#fee2e2', color: eValTotal < 0 ? '#b91c1c' : color, fontSize: 12, fontWeight: 800, borderLeft: '1px solid #e2e8f0' }}>
          {fe(eValTotal)}
        </td>
        <td style={{ width: 60, padding: '10px 4px', textAlign: 'right', background: type === 'header' || type === 'total' ? bg : '#fee2e2', color: type === 'header' || type === 'total' ? color : '#991b1b', fontSize: 11, fontWeight: 800, borderLeft: '1px solid #e2e8f0' }}>
          {fp(ratioETotal)}
        </td>
      </tr>
    );
  };

  return (
    <div style={{ height: hideHeader ? '100%' : '100vh', background: '#f8fafc', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {!hideHeader && (
        <header style={{ background: '#1e293b', height: 54, padding: '0 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, boxShadow: '0 1px 0 rgba(255,255,255,.05)' }}>
          <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', cursor: 'pointer', background: 'none', border: 'none', padding: '6px 0', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            Retour Accueil
          </button>
          <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>
            VS N-1 <span style={{ color: '#64748b', margin: '0 8px' }}>|</span> <span style={{ color: '#10b981' }}>{YEAR}</span>
          </div>
        </header>
      )}

      <div style={{ padding: hideHeader ? '0' : '24px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>EDG "ETAT DE GESTION"</h1>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#64748b', marginTop: 4 }}>BURO MONTE - COMPARABLE N-1</div>
            </div>
            <div style={{ background: '#10b981', color: '#fff', padding: '6px 16px', borderRadius: 999, fontSize: 14, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)' }}>
              ANNÉE {YEAR}
            </div>
          </div>

          <div style={{ overflow: 'auto', flex: 1 }}>
            <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr style={{ height: 34 }}>
                  <th style={{ background: '#f1f5f9', position: 'sticky', left: 0, top: 0, zIndex: 50, borderRight: '2px solid #cbd5e1', borderBottom: '2px solid #cbd5e1' }}></th>
                  {MONTHS.map((m, i) => (
                    <React.Fragment key={i}>
                      <th colSpan={2} style={{ position: 'sticky', top: 0, zIndex: 40, borderBottom: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700, fontSize: 12, padding: '8px 0', background: '#e2e8f0', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #cbd5e1' }}>{m}-{YEAR - 1}</th>
                      <th colSpan={2} style={{ position: 'sticky', top: 0, zIndex: 40, borderBottom: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700, fontSize: 12, padding: '8px 0', background: '#f1f5f9', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderRight: '1px solid #cbd5e1' }}>{m}-{YEAR}</th>
                      <th colSpan={2} style={{ position: 'sticky', top: 0, zIndex: 40, borderBottom: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700, fontSize: 12, padding: '8px 0', background: '#fee2e2', color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.05em', borderRight: '1px solid #cbd5e1' }}>ECART VS N-1</th>
                    </React.Fragment>
                  ))}
                  <th colSpan={2} style={{ position: 'sticky', top: 0, zIndex: 40, borderBottom: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 800, fontSize: 13, padding: '8px 0', background: '#cbd5e1', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', borderLeft: '2px solid #cbd5e1', borderRight: '1px solid #cbd5e1' }}>TOTAL {YEAR - 1}</th>
                  <th colSpan={2} style={{ position: 'sticky', top: 0, zIndex: 40, borderBottom: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 800, fontSize: 13, padding: '8px 0', background: '#e2e8f0', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', borderRight: '1px solid #cbd5e1' }}>TOTAL {YEAR}</th>
                  <th colSpan={2} style={{ position: 'sticky', top: 0, zIndex: 40, borderBottom: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 800, fontSize: 13, padding: '8px 0', background: '#fca5a5', color: '#7f1d1d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ECART VS N-1</th>
                </tr>
                <tr style={{ height: 34 }}>
                  <th style={{ background: '#f1f5f9', position: 'sticky', left: 0, top: 34, zIndex: 50, borderRight: '2px solid #cbd5e1', borderBottom: '2px solid #cbd5e1' }}></th>
                  {MONTHS.map((m, i) => (
                    <React.Fragment key={i}>
                      <th style={{ position: 'sticky', top: 34, zIndex: 40, borderBottom: '2px solid #cbd5e1', width: 80, textAlign: 'center', fontWeight: 600, fontSize: 11, padding: '8px 0', background: '#f1f5f9', color: '#64748b', borderLeft: '1px solid #e2e8f0' }}></th>
                      <th style={{ position: 'sticky', top: 34, zIndex: 40, borderBottom: '2px solid #cbd5e1', width: 60, textAlign: 'center', fontWeight: 600, fontSize: 11, padding: '8px 0', background: '#e2e8f0', color: '#475569', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #cbd5e1' }}>Ratio</th>
                      <th style={{ position: 'sticky', top: 34, zIndex: 40, borderBottom: '2px solid #cbd5e1', width: 80, textAlign: 'center', fontWeight: 600, fontSize: 11, padding: '8px 0', background: '#f8fafc', color: '#64748b' }}></th>
                      <th style={{ position: 'sticky', top: 34, zIndex: 40, borderBottom: '2px solid #cbd5e1', width: 60, textAlign: 'center', fontWeight: 600, fontSize: 11, padding: '8px 0', background: '#fef9c3', color: '#854d0e', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #cbd5e1' }}>Ratio</th>
                      <th style={{ position: 'sticky', top: 34, zIndex: 40, borderBottom: '2px solid #cbd5e1', width: 80, textAlign: 'center', fontWeight: 600, fontSize: 11, padding: '8px 0', background: '#fee2e2', color: '#991b1b' }}></th>
                      <th style={{ position: 'sticky', top: 34, zIndex: 40, borderBottom: '2px solid #cbd5e1', width: 60, textAlign: 'center', fontWeight: 600, fontSize: 11, padding: '8px 0', background: '#fee2e2', color: '#991b1b', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #cbd5e1' }}>Ratio</th>
                    </React.Fragment>
                  ))}
                  <th style={{ position: 'sticky', top: 34, zIndex: 40, borderBottom: '2px solid #cbd5e1', width: 90, textAlign: 'center', fontWeight: 700, fontSize: 11, padding: '8px 0', background: '#f1f5f9', color: '#475569', borderLeft: '2px solid #cbd5e1' }}></th>
                  <th style={{ position: 'sticky', top: 34, zIndex: 40, borderBottom: '2px solid #cbd5e1', width: 60, textAlign: 'center', fontWeight: 700, fontSize: 11, padding: '8px 0', background: '#e2e8f0', color: '#475569', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #cbd5e1' }}>Ratio</th>
                  <th style={{ position: 'sticky', top: 34, zIndex: 40, borderBottom: '2px solid #cbd5e1', width: 90, textAlign: 'center', fontWeight: 700, fontSize: 11, padding: '8px 0', background: '#f8fafc', color: '#64748b' }}></th>
                  <th style={{ position: 'sticky', top: 34, zIndex: 40, borderBottom: '2px solid #cbd5e1', width: 60, textAlign: 'center', fontWeight: 700, fontSize: 11, padding: '8px 0', background: '#fef9c3', color: '#854d0e', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #cbd5e1' }}>Ratio</th>
                  <th style={{ position: 'sticky', top: 34, zIndex: 40, borderBottom: '2px solid #cbd5e1', width: 90, textAlign: 'center', fontWeight: 700, fontSize: 11, padding: '8px 0', background: '#fee2e2', color: '#991b1b' }}></th>
                  <th style={{ position: 'sticky', top: 34, zIndex: 40, borderBottom: '2px solid #cbd5e1', width: 60, textAlign: 'center', fontWeight: 700, fontSize: 11, padding: '8px 0', background: '#fee2e2', color: '#991b1b', borderLeft: '1px solid #e2e8f0' }}>Ratio</th>
                </tr>
              </thead>
              <tbody>
                {renderCalcRow('C.A. TOTAL HT', 'ca', 'header', true)}
                {renderDataRow('Achats Food', 'achats_food', true)}
                {renderDataRow('Consommables liés à la vente (Paper; Flyer;jouets;CO2)', 'consommables')}
                {renderDataRow('Variation de stock', 'variation_stock')}
                {renderDataRow('Repas des salariés (2,29€+1,23€/repas)', 'repas_salaries')}
                {renderCalcRow('TOTA COUT MATIERE', 'coutMatiere', 'total')}
                {renderCalcRow('Marge brute', 'margeBrute', 'header', true)}
                {renderDataRow('Refacturation Pub, Revenus Ecoles & format°et huiles usagées', 'refacturation')}
                {renderCalcRow('TOTAL MARGE', 'totalMarge', 'total')}
                
                {renderDataRow('Coût salaires', 'cout_salaires', true)}
                {renderDataRow('Charges sociales', 'charges_sociales')}
                {renderDataRow('Frais de formation et réaffectation salaires', 'frais_formation')}
                {renderDataRow('Aides et Subventions', 'aides_subventions')}
                {renderCalcRow('Frais person. directs', 'fraisPersDirects', 'subtotal')}
                {renderDataRow('Provision CP+ JF+ RC BRUT', 'prov_cp_brut')}
                {renderDataRow('Provision CP+ JF+ RC PAT', 'prov_cp_pat')}
                {renderDataRow('Prov. prud\'h, pro et div.', 'prov_prud')}
                {renderCalcRow('Frais Pers. indirects', 'fraisPersIndirects', 'subtotal')}
                {renderDataRow('Taxe sur les salaires', 'taxe_salaires')}
                {renderDataRow('Autres primes et divers', 'autres_primes')}
                {renderCalcRow('Total autres frais person.', 'totalAutresFraisPers', 'subtotal')}
                {renderCalcRow('TOTAL Salaires et charges', 'totalSalairesCharges', 'header', true)}
                
                {renderDataRow('Prestation animation + décoration', 'prestation_anim', true)}
                {renderDataRow('Publicité locale + Com Agence + Annonces', 'pub_locale')}
                {renderCalcRow('TOTAL PUBLICITE', 'totalPublicite', 'header', true)}
                
                {renderDataRow('Comm. / encaissement', 'comm_encaissement')}
                {renderDataRow('Produits d\'entretien et linge à jeter', 'produits_entretien', true)}
                {renderDataRow('Fournitures d\'exploitation et de bureau', 'fournitures_bureau', true)}
                {renderDataRow('Matériel et outillage', 'materiel_outillage', true)}
                {renderDataRow('Blanchissage-Entretien matériel', 'blanchissage')}
                {renderDataRow('Vêtement professionnel', 'vetement_pro', true)}
                {renderDataRow('PTT+Telephone+Internet', 'ptt')}
                {renderDataRow('Enlèv.fonds et trait. déchets', 'enlev_fonds')}
                {renderDataRow('Transport et déplacement', 'transport')}
                {renderDataRow('Honoraires comptables + juridiques (+ CAC)', 'honoraires_comptables')}
                {renderDataRow('Honoraires divers', 'honoraires_divers')}
                {renderCalcRow('TOTAL FG d\'exploitation', 'totalFgExploitation', 'header', true)}
                
                {renderDataRow('Contrats maintenance', 'contrats_maintenance', true)}
                {renderDataRow('Entretien & répar. locaux.', 'entretien_locaux')}
                {renderDataRow('Nettoyage locaux & ext.', 'nettoyage_locaux')}
                {renderDataRow('Surveillance-Sécurité-Voiturier', 'surveillance')}
                {renderDataRow('Energie', 'energie', true)}
                {renderDataRow('Gaz-Eau', 'gaz_eau')}
                {renderDataRow('Assurances', 'assurances')}
                {renderCalcRow('TOTAL FG d\'occupation', 'totalFgOccupation', 'header', true)}
                
                {renderCalcRow('RESULTAT GESTION', 'resultatGestion', 'total')}
                
                {renderDataRow('Amortissements', 'amortissements')}
                {renderDataRow('Crédit Bail', 'credit_bail')}
                {renderDataRow('Loyers Murs', 'loyers_murs')}
                {renderDataRow('Charges locatives et GIE', 'charges_locatives')}
                {renderDataRow('Impots et taxes', 'impots_taxes')}
                {renderCalcRow('COUT DES IMM.', 'coutImm', 'header', true)}
                
                {renderDataRow('Redavances Spre SACEM', 'redevances_spre')}
                {renderDataRow('Redevances Grpe Flo', 'redevances_flo')}
                {renderDataRow('Marketing', 'marketing')}
                {renderDataRow('Except de gestion(Diff.de caisse+Remb Ass)', 'except_gestion')}
                {renderDataRow('Frais de banque', 'frais_banque')}
                {renderCalcRow('RES. D\'EXPLOIT', 'resExploit', 'total')}
                
                {renderDataRow('Net financier', 'net_financier')}
                {renderCalcRow('RES. COURANT', 'resCourant', 'total')}
                
                {renderDataRow('Amortissement except.', 'amortissement_except')}
                {renderDataRow('Frais de Holding', 'frais_holding')}
                {renderDataRow('Pertes exceptionnelles', 'pertes_except')}
                {renderCalcRow('RES. NET avant IS', 'resNetAvantIs', 'total')}
                
                {renderDataRow('Retraitement DAA & Net financier', 'retraitement_daa')}
                {renderCalcRow('E.B.E.( credit CICE inclus)', 'ebe', 'total')}
                
                {renderDataRow('Remboursement net financier', 'remboursement_net')}
                {renderDataRow('Remboursement Capital emprunté', 'remboursement_capital')}
                {renderCalcRow('Cash Flow avant IS', 'cashFlow', 'total')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
