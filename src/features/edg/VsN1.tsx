import React, { useMemo } from 'react';

import { useData } from '@/contexts/DataContext';
import { parseMoneyValue } from '@/lib/money';
import { formatEuro, formatPercent } from '@/lib/formatters';
import { MONTH_NAMES_SHORT } from '@/lib/constants';

import { computeMonthDashboard, getAutoRealiseValues, getCaRealiseMonth } from '@/features/edg/edgRealtimeSources';

interface VsN1Props {
  onBack: () => void;
  hideHeader?: boolean;
}



export default function VsN1({ onBack, hideHeader = false }: VsN1Props) {
  const { data, selectedYear } = useData();
  const YEAR = selectedYear;

  // Un mois futur ou en cours n'a pas de réalisé complet à comparer à son équivalent N-1 —
  // les agrégats "à date" (cartes KPI + colonnes Total) n'additionnent que les mois clos, des deux
  // côtés de la comparaison (même mois N-1 et Réalisé), pour éviter de comparer une année N-1
  // complète à un réalisé partiel. Les colonnes mensuelles individuelles ne sont pas concernées.
  const today = new Date();
  const isMonthComplete = (m: number): boolean =>
    YEAR < today.getFullYear() || (YEAR === today.getFullYear() && m < today.getMonth());

  const computedMonths = useMemo(
    () => Array.from({ length: 12 }, (_, i) => computeMonthDashboard(data[i], i, YEAR)),
    [data, YEAR],
  );
  const autoRealiseByMonth = useMemo(
    () => computedMonths.map((cm, i) => getAutoRealiseValues(cm, i, YEAR)),
    [computedMonths, YEAR],
  );

  const getCaMonth = (m: number) => getCaRealiseMonth(computedMonths[m], m, YEAR);

  const caMonths = useMemo(() => Array.from({ length: 12 }, (_, i) => getCaMonth(i)), [computedMonths]);
  const caTotal = caMonths.reduce((sum, v, i) => (isMonthComplete(i) ? sum + v : sum), 0);

  const getValN1 = (m: number, key: string) => parseMoneyValue(data[m]?.edgMensuelN1?.[key]);
  const getValR = (m: number, key: string) => {
    const override = data[m]?.edgMensuelRealise?.[key];
    if (override !== undefined && override !== '') return parseMoneyValue(override);
    return autoRealiseByMonth[m]?.[key] ?? 0;
  };

  const getRowData = (key: string) => {
    const monthsN1 = Array.from({ length: 12 }, (_, i) => getValN1(i, key));
    const monthsR = Array.from({ length: 12 }, (_, i) => getValR(i, key));
    const totalN1 = monthsN1.reduce((sum, v, i) => (isMonthComplete(i) ? sum + v : sum), 0);
    const totalR = monthsR.reduce((sum, v, i) => (isMonthComplete(i) ? sum + v : sum), 0);
    return { monthsN1, monthsR, totalN1, totalR };
  };

  const getMonthCalculations = (m: number) => {
    const caN1 = parseMoneyValue(data[m]?.edgMensuelN1?.['ca_total_ht']);
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
    const n1 = monthCalcs.reduce((sum, m, i) => (isMonthComplete(i) ? sum + m.n1[key] : sum), 0);
    const realise = monthCalcs.reduce((sum, m, i) => (isMonthComplete(i) ? sum + m.realise[key] : sum), 0);
    return { n1, realise };
  };

  const ecart = (r: number, b: number) => r - b;

  // Code couleur d'écart (repris à l'identique d'EdgMensuel.tsx) : vert = favorable, rouge =
  // défavorable. N-1/Réalisé des lignes de charges sont déjà stockés en négatif, donc eVal
  // (réalisé - N-1) est naturellement négatif quand on dépense plus — pas d'inversion sur la
  // couleur. Seul l'affichage du signe (ecartText/ecartRatioText) est inversé sur les lignes de
  // charges pour lire "+" un dépassement et "-" une économie.
  const RED = '#b91c1c';
  const GREEN = '#166534';
  const REVENUE_LIKE_KEYS = new Set(['refacturation', 'aides_subventions', 'retraitement_daa']);
  const ecartColor = (eVal: number): string => (eVal < 0 ? RED : GREEN);
  const ecartText = (eVal: number, invert: boolean): string => {
    const display = invert ? -eVal : eVal;
    const sign = display > 0 ? '+' : display < 0 ? '-' : '';
    return `${sign}${formatEuro(Math.abs(display))}`;
  };
  const ecartRatioText = (eVal: number, bVal: number, invert: boolean): string => {
    if (bVal === 0) return '';
    const display = invert ? -eVal : eVal;
    const pct = (display / Math.abs(bVal)) * 100;
    const sign = pct > 0 ? '+' : pct < 0 ? '-' : '';
    return `${sign}${formatPercent(Math.abs(pct))}`;
  };

  // Nombre de mois clos de l'année, affiché sous les cartes KPI pour expliciter le périmètre "à date".
  const monthsClosedCount = Array.from({ length: 12 }, (_, i) => i).filter(isMonthComplete).length;

  // Cartes KPI de synthèse (mêmes 5 indicateurs qu'EdgMensuel), totaux annuels via getTotalCalc.
  const kpiCards: { label: string; key: keyof ReturnType<typeof getMonthCalculations>['n1']; invert: boolean }[] = [
    { label: 'C.A. Total HT', key: 'ca', invert: false },
    { label: 'Marge Brute', key: 'margeBrute', invert: false },
    { label: 'Total Salaires et Charges', key: 'totalSalairesCharges', invert: true },
    { label: 'Résultat Gestion', key: 'resultatGestion', invert: false },
    { label: 'E.B.E.', key: 'ebe', invert: false },
  ];

  const renderDataRow = (label: string, key: string, isBlue = false) => {
    const rowData = getRowData(key);
    const invert = !REVENUE_LIKE_KEYS.has(key);
    const eValTotal = ecart(rowData.totalR, rowData.totalN1);
    const ratioRTotal = caTotal ? (rowData.totalR / caTotal) * 100 : 0;

    // Calculate total CA N1
    const caN1Total = monthCalcs.reduce((sum, m, i) => (isMonthComplete(i) ? sum + m.n1.ca : sum), 0);
    const ratioN1Total = caN1Total ? (rowData.totalN1 / caN1Total) * 100 : 0;
    const ratioETotal = ratioRTotal - ratioN1Total;

    return (
      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
        <td style={{ padding: '8px 12px', fontSize: 12, background: '#fff', color: '#334155', position: 'sticky', left: 0, zIndex: 10, borderRight: '2px solid #cbd5e1', minWidth: 250 }}>{label}</td>
        {Array.from({ length: 12 }).map((_, m) => {
          const n1Val = rowData.monthsN1[m];
          const rVal = rowData.monthsR[m];
          const eVal = ecart(rVal, n1Val);

          const caN1 = parseMoneyValue(data[m]?.edgMensuelN1?.['ca_total_ht']);
          const caR = caMonths[m];

          const ratioN1 = caN1 ? (n1Val / caN1) * 100 : 0;
          const ratioR = caR ? (rVal / caR) * 100 : 0;
          const ratioE = ratioR - ratioN1;

          return (
            <React.Fragment key={m}>
              <td style={{ width: 80, padding: '8px 4px', textAlign: 'right', background: '#f1f5f9', fontSize: 12, color: '#0f172a', borderLeft: '1px solid #e2e8f0' }}>
                {formatEuro(n1Val)}
              </td>
              <td style={{ width: 60, padding: '8px 4px', textAlign: 'right', background: '#e2e8f0', fontSize: 11, color: '#475569', borderLeft: '1px solid #e2e8f0' }}>
                {formatPercent(ratioN1)}
              </td>
              <td style={{ width: 80, padding: '8px 4px', textAlign: 'right', background: isBlue ? '#eff6ff' : '#fff', fontSize: 12, color: '#0f172a', borderLeft: '1px solid #e2e8f0' }}>
                {formatEuro(rVal)}
              </td>
              <td style={{ width: 60, padding: '8px 4px', textAlign: 'right', background: '#fef9c3', fontSize: 11, color: '#854d0e', borderLeft: '1px solid #e2e8f0' }}>
                {formatPercent(ratioR)}
              </td>
              <td style={{ width: 80, padding: '8px 4px', textAlign: 'right', background: '#fee2e2', fontSize: 12, fontWeight: 600, color: ecartColor(eVal), borderLeft: '1px solid #e2e8f0' }}>
                {ecartText(eVal, invert)}
              </td>
              <td style={{ width: 60, padding: '8px 4px', textAlign: 'right', background: '#fee2e2', fontSize: 11, fontWeight: 600, color: ecartColor(eVal), borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #cbd5e1' }}>
                {formatPercent(invert ? -ratioE : ratioE)}
              </td>
            </React.Fragment>
          );
        })}
        <td style={{ width: 90, padding: '8px 4px', textAlign: 'right', background: '#f1f5f9', fontSize: 12, fontWeight: 600, color: '#0f172a', borderLeft: '2px solid #cbd5e1' }}>
          {formatEuro(rowData.totalN1)}
        </td>
        <td style={{ width: 60, padding: '8px 4px', textAlign: 'right', background: '#e2e8f0', fontSize: 11, fontWeight: 600, color: '#475569', borderLeft: '1px solid #e2e8f0' }}>
          {formatPercent(ratioN1Total)}
        </td>
        <td style={{ width: 90, padding: '8px 4px', textAlign: 'right', background: isBlue ? '#eff6ff' : '#fff', fontSize: 12, fontWeight: 600, color: '#0f172a', borderLeft: '1px solid #e2e8f0' }}>
          {formatEuro(rowData.totalR)}
        </td>
        <td style={{ width: 60, padding: '8px 4px', textAlign: 'right', background: '#fef9c3', fontSize: 11, fontWeight: 600, color: '#854d0e', borderLeft: '1px solid #e2e8f0' }}>
          {formatPercent(ratioRTotal)}
        </td>
        <td style={{ width: 90, padding: '8px 4px', textAlign: 'right', background: '#fee2e2', fontSize: 12, fontWeight: 700, color: ecartColor(eValTotal), borderLeft: '1px solid #e2e8f0' }}>
          {ecartText(eValTotal, invert)}
        </td>
        <td style={{ width: 60, padding: '8px 4px', textAlign: 'right', background: '#fee2e2', fontSize: 11, fontWeight: 700, color: ecartColor(eValTotal), borderLeft: '1px solid #e2e8f0' }}>
          {formatPercent(invert ? -ratioETotal : ratioETotal)}
        </td>
      </tr>
    );
  };

  const renderCalcRow = (label: string, calcKey: keyof ReturnType<typeof getMonthCalculations>['n1'], type: 'header' | 'total' | 'subtotal', isRed = false) => {
    const totals = getTotalCalc(calcKey);
    const eValTotal = ecart(totals.realise, totals.n1);
    
    const caN1Total = monthCalcs.reduce((sum, m, i) => (isMonthComplete(i) ? sum + m.n1.ca : sum), 0);
    const ratioN1Total = caN1Total ? (totals.n1 / caN1Total) * 100 : 0;
    const ratioRTotal = caTotal ? (totals.realise / caTotal) * 100 : 0;
    const ratioETotal = ratioRTotal - ratioN1Total;
    // Inversion de signe des lignes de charges (mêmes règles qu'EdgMensuel renderHeader/renderTotal/renderSubTotal).
    const invert = type === 'header'
      ? !['C.A. TOTAL HT', 'Marge brute'].includes(label)
      : type === 'total'
        ? label === 'TOTA COUT MATIERE'
        : true;

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
          
          const caN1 = parseMoneyValue(data[m]?.edgMensuelN1?.['ca_total_ht']);
          const caR = caMonths[m];
          
          const ratioN1 = caN1 ? (n1Val / caN1) * 100 : 0;
          const ratioR = caR ? (rVal / caR) * 100 : 0;
          const ratioE = ratioR - ratioN1;
          
          return (
            <React.Fragment key={m}>
              <td style={{ width: 80, padding: '10px 4px', textAlign: 'right', background: type === 'header' || type === 'total' ? bg : '#f1f5f9', color: color, fontSize: 12, fontWeight: weight, borderLeft: '1px solid #e2e8f0' }}>
                {formatEuro(n1Val)}
              </td>
              <td style={{ width: 60, padding: '10px 4px', textAlign: 'right', background: type === 'header' || type === 'total' ? bg : '#e2e8f0', color: type === 'header' || type === 'total' ? color : '#475569', fontSize: 11, fontWeight: weight, borderLeft: '1px solid #e2e8f0' }}>
                {formatPercent(ratioN1)}
              </td>
              <td style={{ width: 80, padding: '10px 4px', textAlign: 'right', background: bg, color: color, fontSize: 12, fontWeight: weight, borderLeft: '1px solid #e2e8f0' }}>
                {formatEuro(rVal)}
              </td>
              <td style={{ width: 60, padding: '10px 4px', textAlign: 'right', background: type === 'header' || type === 'total' ? bg : '#fef9c3', color: type === 'header' || type === 'total' ? color : '#854d0e', fontSize: 11, fontWeight: weight, borderLeft: '1px solid #e2e8f0' }}>
                {formatPercent(ratioR)}
              </td>
              <td style={{ width: 80, padding: '10px 4px', textAlign: 'right', background: type === 'header' || type === 'total' ? bg : '#fee2e2', color: ecartColor(eVal), fontSize: 12, fontWeight: weight, borderLeft: '1px solid #e2e8f0' }}>
                {ecartText(eVal, invert)}
              </td>
              <td style={{ width: 60, padding: '10px 4px', textAlign: 'right', background: type === 'header' || type === 'total' ? bg : '#fee2e2', color: ecartColor(eVal), fontSize: 11, fontWeight: weight, borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #cbd5e1' }}>
                {formatPercent(invert ? -ratioE : ratioE)}
              </td>
            </React.Fragment>
          );
        })}
        <td style={{ width: 90, padding: '10px 4px', textAlign: 'right', background: type === 'header' || type === 'total' ? bg : '#f1f5f9', color: color, fontSize: 12, fontWeight: 800, borderLeft: '2px solid #cbd5e1' }}>
          {formatEuro(totals.n1)}
        </td>
        <td style={{ width: 60, padding: '10px 4px', textAlign: 'right', background: type === 'header' || type === 'total' ? bg : '#e2e8f0', color: type === 'header' || type === 'total' ? color : '#475569', fontSize: 11, fontWeight: 800, borderLeft: '1px solid #e2e8f0' }}>
          {formatPercent(ratioN1Total)}
        </td>
        <td style={{ width: 90, padding: '10px 4px', textAlign: 'right', background: bg, color: color, fontSize: 12, fontWeight: 800, borderLeft: '1px solid #e2e8f0' }}>
          {formatEuro(totals.realise)}
        </td>
        <td style={{ width: 60, padding: '10px 4px', textAlign: 'right', background: type === 'header' || type === 'total' ? bg : '#fef9c3', color: type === 'header' || type === 'total' ? color : '#854d0e', fontSize: 11, fontWeight: 800, borderLeft: '1px solid #e2e8f0' }}>
          {formatPercent(ratioRTotal)}
        </td>
        <td style={{ width: 90, padding: '10px 4px', textAlign: 'right', background: type === 'header' || type === 'total' ? bg : '#fee2e2', color: ecartColor(eValTotal), fontSize: 12, fontWeight: 800, borderLeft: '1px solid #e2e8f0' }}>
          {ecartText(eValTotal, invert)}
        </td>
        <td style={{ width: 60, padding: '10px 4px', textAlign: 'right', background: type === 'header' || type === 'total' ? bg : '#fee2e2', color: ecartColor(eValTotal), fontSize: 11, fontWeight: 800, borderLeft: '1px solid #e2e8f0' }}>
          {formatPercent(invert ? -ratioETotal : ratioETotal)}
        </td>
      </tr>
    );
  };

  // Bandeau de section (repris à l'identique d'EdgMensuel.tsx) — colSpan={999} pour couvrir
  // toutes les colonnes du tableau sans dépendre du nombre exact.
  const renderSectionBanner = (icon: string, title: string) => (
    <tr>
      <td colSpan={999} style={{
        padding: '8px 16px',
        fontSize: 12,
        fontWeight: 800,
        color: '#f8fafc',
        background: '#1e293b',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        borderTop: '1px solid #0f172a',
        borderBottom: '1px solid #0f172a',
      }}>
        <span style={{ marginRight: 8 }}>{icon}</span>{title}
      </td>
    </tr>
  );

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

          {/* Cartes KPI en colonne latérale gauche (repris d'EdgMensuel.tsx) + tableau à droite */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
            <div style={{ width: 260, flexShrink: 0, overflowY: 'auto', background: '#f8fafc', borderRight: '1px solid #e2e8f0', padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {kpiCards.map(k => {
                const totals = getTotalCalc(k.key);
                const kpiEcart = ecart(totals.realise, totals.n1);
                return (
                  <div key={k.label} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'normal' }}>
                      {k.label}
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 8 }}>
                      Cumul à date ({monthsClosedCount} mois clos)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: '#94a3b8' }}>N-1</span>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatEuro(totals.n1)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: '#94a3b8' }}>Réalisé</span>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatEuro(totals.realise)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 13, borderTop: '1px solid #f1f5f9', paddingTop: 5, marginTop: 2 }}>
                        <span style={{ color: '#94a3b8' }}>Écart</span>
                        <span>
                          <span style={{ fontWeight: 700, color: ecartColor(kpiEcart) }}>{ecartText(kpiEcart, k.invert)}</span>
                          {ecartRatioText(kpiEcart, totals.n1, k.invert) && (
                            <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 600, color: ecartColor(kpiEcart) }}>({ecartRatioText(kpiEcart, totals.n1, k.invert)})</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ overflow: 'auto', flex: 1 }}>
            <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr style={{ height: 34 }}>
                  <th style={{ background: '#f1f5f9', position: 'sticky', left: 0, top: 0, zIndex: 50, borderRight: '2px solid #cbd5e1', borderBottom: '2px solid #cbd5e1' }}></th>
                  {MONTH_NAMES_SHORT.map((m, i) => (
                    <React.Fragment key={i}>
                      <th colSpan={2} style={{ position: 'sticky', top: 0, zIndex: 40, borderBottom: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700, fontSize: 12, padding: '8px 0', background: '#e2e8f0', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #cbd5e1' }}>{m}-{YEAR - 1}</th>
                      <th colSpan={2} style={{ position: 'sticky', top: 0, zIndex: 40, borderBottom: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700, fontSize: 12, padding: '8px 0', background: '#f1f5f9', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderRight: '1px solid #cbd5e1' }}>{m}-{YEAR}</th>
                      <th colSpan={2} style={{ position: 'sticky', top: 0, zIndex: 40, borderBottom: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700, fontSize: 12, padding: '8px 0', background: '#fee2e2', color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.05em', borderRight: '1px solid #cbd5e1' }}>ECART VS N-1</th>
                    </React.Fragment>
                  ))}
                  <th colSpan={2} style={{ position: 'sticky', top: 0, zIndex: 40, borderBottom: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 800, fontSize: 13, padding: '8px 0', background: '#cbd5e1', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', borderLeft: '2px solid #cbd5e1', borderRight: '1px solid #cbd5e1' }}>À DATE {YEAR - 1}</th>
                  <th colSpan={2} style={{ position: 'sticky', top: 0, zIndex: 40, borderBottom: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 800, fontSize: 13, padding: '8px 0', background: '#e2e8f0', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', borderRight: '1px solid #cbd5e1' }}>À DATE {YEAR}</th>
                  <th colSpan={2} style={{ position: 'sticky', top: 0, zIndex: 40, borderBottom: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 800, fontSize: 13, padding: '8px 0', background: '#fca5a5', color: '#7f1d1d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ECART VS N-1</th>
                </tr>
                <tr style={{ height: 34 }}>
                  <th style={{ background: '#f1f5f9', position: 'sticky', left: 0, top: 34, zIndex: 50, borderRight: '2px solid #cbd5e1', borderBottom: '2px solid #cbd5e1' }}></th>
                  {MONTH_NAMES_SHORT.map((m, i) => (
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
                {renderSectionBanner('🍽️', 'Coût Matière')}
                {renderDataRow('Achats Food', 'achats_food', true)}
                {renderDataRow('Consommables liés à la vente (Paper; Flyer;jouets;CO2)', 'consommables')}
                {renderDataRow('Variation de stock', 'variation_stock')}
                {renderDataRow('Repas des salariés (2,29€+1,23€/repas)', 'repas_salaries')}
                {renderCalcRow('TOTA COUT MATIERE', 'coutMatiere', 'total')}
                {renderSectionBanner('📈', 'Marge')}
                {renderCalcRow('Marge brute', 'margeBrute', 'header', true)}
                {renderDataRow('Refacturation Pub, Revenus Ecoles & format°et huiles usagées', 'refacturation')}
                {renderCalcRow('TOTAL MARGE', 'totalMarge', 'total')}

                {renderSectionBanner('👥', 'Personnel')}
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

                {renderSectionBanner('📣', 'Publicité')}
                {renderDataRow('Prestation animation + décoration', 'prestation_anim', true)}
                {renderDataRow('Publicité locale + Com Agence + Annonces', 'pub_locale')}
                {renderCalcRow('TOTAL PUBLICITE', 'totalPublicite', 'header', true)}

                {renderSectionBanner('🏢', "Frais Généraux d'Exploitation")}
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

                {renderSectionBanner('🔧', "Frais Généraux d'Occupation")}
                {renderDataRow('Contrats maintenance', 'contrats_maintenance', true)}
                {renderDataRow('Entretien & répar. locaux.', 'entretien_locaux')}
                {renderDataRow('Nettoyage locaux & ext.', 'nettoyage_locaux')}
                {renderDataRow('Surveillance-Sécurité-Voiturier', 'surveillance')}
                {renderDataRow('Energie', 'energie', true)}
                {renderDataRow('Gaz-Eau', 'gaz_eau')}
                {renderDataRow('Assurances', 'assurances')}
                {renderCalcRow('TOTAL FG d\'occupation', 'totalFgOccupation', 'header', true)}

                {renderCalcRow('RESULTAT GESTION', 'resultatGestion', 'total')}

                {renderSectionBanner('🏗️', 'Coût des Immeubles')}
                {renderDataRow('Amortissements', 'amortissements')}
                {renderDataRow('Crédit Bail', 'credit_bail')}
                {renderDataRow('Loyers Murs', 'loyers_murs')}
                {renderDataRow('Charges locatives et GIE', 'charges_locatives')}
                {renderDataRow('Impots et taxes', 'impots_taxes')}
                {renderCalcRow('COUT DES IMM.', 'coutImm', 'header', true)}

                {renderSectionBanner('📊', 'Résultats et Trésorerie')}
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
    </div>
  );
}
