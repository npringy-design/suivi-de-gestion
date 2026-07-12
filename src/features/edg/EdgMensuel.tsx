import React, { useMemo, useState, useEffect } from 'react';
import { Menu, X, ChevronLeft } from 'lucide-react';

import { useData } from '@/contexts/DataContext';
import { parseMoneyValue } from '@/lib/money';
import { formatEuro, formatPercent } from '@/lib/formatters';
import { MONTH_NAMES, MONTH_NAMES_SHORT } from '@/lib/constants';

import { computeMonthDashboard, getAutoRealiseValues, getCaRealiseMonth, getMonthProgress } from '@/features/edg/edgRealtimeSources';

interface EdgMensuelProps {
  month: number;
  setMonth: (month: number) => void;
  onBack: () => void;
  hideHeader?: boolean;
}



export default function EdgMensuel({ month, setMonth, onBack, hideHeader = false }: EdgMensuelProps) {
  const { data, updateEdgMensuel, updateEdgMensuelRealise, selectedYear, edgChargesConfig } = useData();
  const YEAR = selectedYear;
  const MONTHS_SHORT = MONTH_NAMES_SHORT.map(m => `${m}-${YEAR.toString().slice(-2)}`);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const edgData = data[month]?.edgMensuel || {};
  const edgRealiseData = data[month]?.edgMensuelRealise || {};
  const dashboardData = useMemo(
    () => computeMonthDashboard(data[month], month, YEAR),
    [data, month, YEAR],
  );

  // Calculate CA TOTAL HT from dashboard for REALISE
  const caTotalHtRealise = useMemo(
    () => getCaRealiseMonth(dashboardData, month, YEAR),
    [dashboardData, month, YEAR],
  );

  // Valeurs auto calculées depuis le Suivi Quotidien, utilisées tant qu'aucune saisie manuelle ne les écrase
  const autoRealiseValues = useMemo(
    () => getAutoRealiseValues(dashboardData, month, YEAR),
    [dashboardData, month, YEAR],
  );

  // Valeurs auto calculées pour les lignes sous Résultat Gestion pilotées par Paramètre EDG
  // ('fixe' : recopie du budget saisi ce mois-ci ; 'pourcentage' : % du CA réalisé du mois).
  // Les clés en mode 'manuel' ne produisent aucune valeur ici (comportement inchangé).
  const chargeAutoRealiseValues = useMemo(() => {
    const values: Record<string, number> = {};
    Object.entries(edgChargesConfig).forEach(([key, cfg]) => {
      if (cfg.mode === 'fixe') {
        values[key] = parseMoneyValue(edgData[key]);
      } else if (cfg.mode === 'pourcentage') {
        values[key] = ((cfg.pourcentage ?? 0) / 100) * caTotalHtRealise;
      }
    });
    return values;
  }, [edgChargesConfig, edgData, caTotalHtRealise]);

  // Fusion des deux sources d'auto-remplissage réalisé : Suivi Quotidien (CA, Achats Food,
  // Coût salaires...) et Paramètre EDG (les 17 lignes sous Résultat Gestion). Aucun chevauchement
  // de clés entre les deux, donc fusion directe.
  const combinedAutoRealiseValues = useMemo(
    () => ({ ...autoRealiseValues, ...chargeAutoRealiseValues }),
    [autoRealiseValues, chargeAutoRealiseValues],
  );

  const monthProgress = useMemo(
    () => getMonthProgress(dashboardData, month, YEAR),
    [dashboardData, month, YEAR],
  );

  const caTotalHtBudget = parseMoneyValue(edgData['ca_total_ht']);

  // formatEuro sépare les milliers par une espace fine insécable (U+202F), invisible dans
  // certaines polices — remplacée ici par une espace normale pour une séparation lisible (1 500 au lieu de 1500).
  const euro = (v: number) => formatEuro(v).replace(/[  ]/g, ' ');

  const handleChangeBudget = (key: string, value: string) => {
    const cleanValue = value.replace(/[^0-9.,-]/g, '').replace(',', '.');
    updateEdgMensuel(month, key, cleanValue);
  };

  const handleChangeRealise = (key: string, value: string) => {
    const cleanValue = value.replace(/[^0-9.,-]/g, '').replace(',', '.');
    updateEdgMensuelRealise(month, key, cleanValue);
  };

  const isAutoRealise = (key: string) => {
    const override = edgRealiseData[key];
    return (override === undefined || override === '') && key in combinedAutoRealiseValues;
  };

  const valB = (key: string) => parseMoneyValue(edgData[key]);
  const valR = (key: string) => {
    const override = edgRealiseData[key];
    if (override !== undefined && override !== '') return parseMoneyValue(override);
    return combinedAutoRealiseValues[key] ?? 0;
  };

  // Calculations BUDGET
  const coutMatiereB = valB('achats_food') + valB('consommables') + valB('variation_stock') + valB('repas_salaries');
  const margeBruteB = caTotalHtBudget + coutMatiereB;
  const totalMargeB = margeBruteB + valB('refacturation');
  const fraisPersDirectsB = valB('cout_salaires') + valB('charges_sociales') + valB('frais_formation') + valB('aides_subventions');
  const fraisPersIndirectsB = valB('prov_cp_brut') + valB('prov_cp_pat') + valB('prov_prud');
  const totalAutresFraisPersB = valB('taxe_salaires') + valB('autres_primes');
  const totalSalairesChargesB = fraisPersDirectsB + fraisPersIndirectsB + totalAutresFraisPersB;
  const totalPubliciteB = valB('prestation_anim') + valB('pub_locale');
  const totalFgExploitationB = valB('comm_encaissement') + valB('produits_entretien') + valB('fournitures_bureau') + valB('materiel_outillage') + valB('blanchissage') + valB('vetement_pro') + valB('ptt') + valB('enlev_fonds') + valB('transport') + valB('honoraires_comptables') + valB('honoraires_divers');
  const totalFgOccupationB = valB('contrats_maintenance') + valB('entretien_locaux') + valB('nettoyage_locaux') + valB('surveillance') + valB('energie') + valB('gaz_eau') + valB('assurances');
  const resultatGestionB = totalMargeB + totalSalairesChargesB + totalPubliciteB + totalFgExploitationB + totalFgOccupationB;
  const coutImmB = valB('amortissements') + valB('credit_bail') + valB('loyers_murs') + valB('charges_locatives') + valB('impots_taxes');
  const resExploitB = resultatGestionB + coutImmB + valB('redevances_spre') + valB('redevances_flo') + valB('marketing') + valB('except_gestion') + valB('frais_banque');
  const resCourantB = resExploitB + valB('net_financier');
  const resNetAvantIsB = resCourantB + valB('amortissement_except') + valB('frais_holding') + valB('pertes_except');
  const ebeB = resNetAvantIsB + valB('retraitement_daa');
  const cashFlowB = ebeB + valB('remboursement_net') + valB('remboursement_capital');

  // Calculations REALISE
  const coutMatiereR = valR('achats_food') + valR('consommables') + valR('variation_stock') + valR('repas_salaries');
  const margeBruteR = caTotalHtRealise + coutMatiereR;
  const totalMargeR = margeBruteR + valR('refacturation');
  const fraisPersDirectsR = valR('cout_salaires') + valR('charges_sociales') + valR('frais_formation') + valR('aides_subventions');
  const fraisPersIndirectsR = valR('prov_cp_brut') + valR('prov_cp_pat') + valR('prov_prud');
  const totalAutresFraisPersR = valR('taxe_salaires') + valR('autres_primes');
  const totalSalairesChargesR = fraisPersDirectsR + fraisPersIndirectsR + totalAutresFraisPersR;
  const totalPubliciteR = valR('prestation_anim') + valR('pub_locale');
  const totalFgExploitationR = valR('comm_encaissement') + valR('produits_entretien') + valR('fournitures_bureau') + valR('materiel_outillage') + valR('blanchissage') + valR('vetement_pro') + valR('ptt') + valR('enlev_fonds') + valR('transport') + valR('honoraires_comptables') + valR('honoraires_divers');
  const totalFgOccupationR = valR('contrats_maintenance') + valR('entretien_locaux') + valR('nettoyage_locaux') + valR('surveillance') + valR('energie') + valR('gaz_eau') + valR('assurances');
  const resultatGestionR = totalMargeR + totalSalairesChargesR + totalPubliciteR + totalFgExploitationR + totalFgOccupationR;
  const coutImmR = valR('amortissements') + valR('credit_bail') + valR('loyers_murs') + valR('charges_locatives') + valR('impots_taxes');
  const resExploitR = resultatGestionR + coutImmR + valR('redevances_spre') + valR('redevances_flo') + valR('marketing') + valR('except_gestion') + valR('frais_banque');
  const resCourantR = resExploitR + valR('net_financier');
  const resNetAvantIsR = resCourantR + valR('amortissement_except') + valR('frais_holding') + valR('pertes_except');
  const ebeR = resNetAvantIsR + valR('retraitement_daa');
  const cashFlowR = ebeR + valR('remboursement_net') + valR('remboursement_capital');

  // Écart au budget complet du mois (réalisé - budget). Ne dépend plus de l'avancement du mois :
  // un réalisé partiel (mois en cours) s'affiche défavorable tant qu'il n'atteint pas le budget
  // total, au lieu d'être comparé à un budget proraté qui produisait de faux écarts favorables.
  const ecart = (r: number, b: number): number | null => r - b;

  // Une ligne détail sans aucune donnée réalisée (ni saisie manuelle, ni valeur auto-calculée
  // depuis le Suivi Quotidien ou Paramètre EDG) n'a pas d'écart significatif : un réalisé à 0
  // par absence de donnée afficherait une fausse "économie" égale au budget complet.
  const hasRealiseData = (key: string): boolean => {
    const override = edgRealiseData[key];
    return (override !== undefined && override !== '') || key in combinedAutoRealiseValues;
  };

  // Pour les lignes calculées (headers/totaux/sous-totaux) et les cartes KPI, l'écart n'est
  // affiché que si le mois a au moins une donnée réalisée (un jour renseigné dans le Suivi
  // Quotidien ou une saisie manuelle dans edgMensuelRealise) — sinon '—'.
  const monthHasRealiseData = monthProgress > 0 || Object.values(edgRealiseData).some(v => v !== undefined && v !== '');

  // Sens gestion de la colonne Écart : le signe affiché n'est pas toujours le signe brut
  // (réalisé - budget). Pour les lignes de charges (budget stocké en négatif), un dépassement de
  // budget (plus dépensé) doit se lire en positif/rouge et une économie en négatif/vert — inverse
  // du signe brut, qui est négatif quand on dépense plus. Pour les lignes de revenu/crédit et les
  // totaux de résultat, le signe brut est déjà dans le bon sens (plus de réalisé = favorable).
  const RED = '#b91c1c';
  const GREEN = '#166534';
  // Lignes détail dont le budget est un revenu/crédit (pas une charge) : pas d'inversion.
  const REVENUE_LIKE_KEYS = new Set(['refacturation', 'aides_subventions', 'retraitement_daa']);

  const ecartColor = (eVal: number | null): string => eVal === null ? '#0f172a' : (eVal < 0 ? RED : GREEN);

  // Signe explicite (+ / -) plutôt que de compter sur le glyphe négatif implicite du formatage —
  // garantit un symbole "-" toujours visible devant un montant/pourcentage défavorable.
  const ecartText = (eVal: number | null, invert: boolean): string => {
    if (eVal === null) return '—';
    const display = invert ? -eVal : eVal;
    const sign = display > 0 ? '+' : display < 0 ? '-' : '';
    return `${sign}${euro(Math.abs(display))}`;
  };

  const ecartRatioText = (eVal: number | null, bVal: number, invert: boolean): string => {
    if (eVal === null || bVal === 0) return '';
    const display = invert ? -eVal : eVal;
    const pct = (display / Math.abs(bVal)) * 100;
    const sign = pct > 0 ? '+' : pct < 0 ? '-' : '';
    return `${sign}${formatPercent(Math.abs(pct))}`;
  };

  // Indicateurs clés affichés dans le bandeau de synthèse en haut de la vue.
  // `invert` : lignes de charges (stockées en négatif) où un écart favorable (moins dépensé)
  // doit s'afficher en négatif/vert et un dépassement en positif/rouge — inverse des lignes
  // de chiffre d'affaires ou de résultat où plus de réalisé que de budget est favorable.
  const kpiCards: { label: string; b: number; r: number; invert: boolean }[] = [
    { label: 'C.A. Total HT', b: caTotalHtBudget, r: caTotalHtRealise, invert: false },
    { label: 'Marge Brute', b: margeBruteB, r: margeBruteR, invert: false },
    { label: 'Total Salaires et Charges', b: totalSalairesChargesB, r: totalSalairesChargesR, invert: true },
    { label: 'Résultat Gestion', b: resultatGestionB, r: resultatGestionR, invert: false },
    { label: 'E.B.E.', b: ebeB, r: ebeR, invert: false },
  ];

  const renderRow =(label: string, key: string, isBlue = false) => {
    const bVal = valB(key);
    const rVal = valR(key);
    const eVal = hasRealiseData(key) ? ecart(rVal, bVal) : null;
    const isAuto = isAutoRealise(key);
    const autoVal = combinedAutoRealiseValues[key];
    const invert = !REVENUE_LIKE_KEYS.has(key);

    return (
      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
        <td style={{ 
          padding: isMobile ? '6px 8px' : '8px 12px', 
          fontSize: isMobile ? 11 : 13, 
          background: '#fff', 
          color: '#334155', 
          position: 'sticky', 
          left: 0, 
          zIndex: 10, 
          borderRight: '1px solid #e2e8f0', 
          borderBottom: '1px solid #e2e8f0',
          minWidth: isMobile ? 140 : 200
        }}>
          {label}
        </td>
        
        {/* BUDGET */}
        <td style={{ width: 10, background: '#fff', borderBottom: '1px solid #e2e8f0' }}></td>
        <td style={{ width: isMobile ? 70 : 90, padding: 0, background: isBlue ? '#eff6ff' : '#fff', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
          <input
            type="text"
            value={edgData[key] || ''}
            onChange={e => handleChangeBudget(key, e.target.value)}
            style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', textAlign: 'right', padding: isMobile ? '6px 8px' : '8px 12px', fontSize: isMobile ? 11 : 13, outline: 'none', color: '#0f172a', fontWeight: edgData[key] ? 500 : 400 }}
            placeholder="0"
          />
        </td>
        <td style={{ width: isMobile ? 50 : 60, background: '#f8fafc', textAlign: 'right', padding: isMobile ? '6px 8px' : '8px 12px', fontSize: isMobile ? 10 : 12, color: '#64748b', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
          {caTotalHtBudget > 0 && edgData[key] ? formatPercent((bVal / caTotalHtBudget) * 100) : ''}
        </td>

        {/* REALISE */}
        <td style={{ width: 10, background: '#fff', borderBottom: '1px solid #e2e8f0' }}></td>
        <td style={{ width: isMobile ? 70 : 90, padding: 0, position: 'relative', background: isAuto ? '#f0fdfa' : '#fff', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
          <input
            type="text"
            value={edgRealiseData[key] || ''}
            onChange={e => handleChangeRealise(key, e.target.value)}
            style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', textAlign: 'right', padding: isMobile ? '6px 8px' : '8px 12px', fontSize: isMobile ? 11 : 13, outline: 'none', color: '#0f172a', fontWeight: edgRealiseData[key] ? 500 : 400 }}
            placeholder={isAuto ? euro(autoVal) : '0'}
            title={isAuto ? 'Calculé depuis le Suivi Quotidien' : undefined}
          />
          {isAuto && (
            <span
              title="Calculé depuis le Suivi Quotidien"
              style={{ position: 'absolute', top: 3, left: 3, width: 6, height: 6, borderRadius: '50%', background: '#0d9488' }}
            />
          )}
        </td>
        <td style={{ width: isMobile ? 50 : 60, background: '#f8fafc', textAlign: 'right', padding: isMobile ? '6px 8px' : '8px 12px', fontSize: isMobile ? 10 : 12, color: '#64748b', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
          {caTotalHtRealise > 0 && (edgRealiseData[key] || isAuto) ? formatPercent((rVal / caTotalHtRealise) * 100) : ''}
        </td>

        {/* ECART */}
        <td style={{ width: 10, background: '#fff', borderBottom: '1px solid #e2e8f0' }}></td>
        <td style={{ width: isMobile ? 70 : 90, padding: isMobile ? '6px 8px' : '8px 12px', textAlign: 'right', background: '#fff', fontSize: isMobile ? 11 : 13, fontWeight: 600, color: ecartColor(eVal), borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
          {ecartText(eVal, invert)}
        </td>
        <td style={{ width: isMobile ? 50 : 60, background: '#e2e8f0', textAlign: 'right', padding: isMobile ? '6px 8px' : '8px 12px', fontSize: isMobile ? 10 : 12, fontWeight: 600, color: ecartColor(eVal), borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #e2e8f0' }}>
          {ecartRatioText(eVal, bVal, invert)}
        </td>
      </tr>
    );
  };

  const renderHeader =(label: string, bVal: number, rVal: number, isRed = false) => {
    const eVal = monthHasRealiseData ? ecart(rVal, bVal) : null;
    const isCaTotal = label === 'C.A. TOTAL HT';
    const invert = !['C.A. TOTAL HT', 'Marge brute'].includes(label);
    
    return (
      <tr style={{ borderBottom: '2px solid #cbd5e1', borderTop: '2px solid #cbd5e1' }}>
        <td style={{ 
          padding: isMobile ? '8px 10px' : '10px 12px', 
          fontSize: isMobile ? 11 : 13, 
          fontWeight: 700, 
          color: isRed ? '#b91c1c' : '#0f172a', 
          background: '#fef2f2', 
          textTransform: 'uppercase', 
          letterSpacing: '0.02em', 
          position: 'sticky', 
          left: 0, 
          zIndex: 10, 
          borderRight: '2px solid #cbd5e1', 
          borderBottom: '2px solid #cbd5e1', 
          borderTop: '2px solid #cbd5e1',
          minWidth: isMobile ? 140 : 200
        }}>
          {label}
        </td>
        
        {/* BUDGET */}
        <td style={{ width: 10, background: '#fff', borderBottom: '2px solid #cbd5e1', borderTop: '2px solid #cbd5e1' }}></td>
        <td style={{ width: isMobile ? 70 : 90, padding: isCaTotal ? 0 : (isMobile ? '8px 10px' : '10px 12px'), textAlign: 'right', fontWeight: 700, color: isRed ? '#b91c1c' : '#0f172a', background: isCaTotal ? '#eff6ff' : '#fef2f2', fontSize: isMobile ? 11 : 13, borderLeft: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', borderBottom: '2px solid #cbd5e1', borderTop: '2px solid #cbd5e1' }}>
          {isCaTotal ? (
            <input
              type="text"
              value={edgData['ca_total_ht'] || ''}
              onChange={e => handleChangeBudget('ca_total_ht', e.target.value)}
              style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', textAlign: 'right', padding: isMobile ? '8px 10px' : '10px 12px', fontSize: isMobile ? 11 : 13, outline: 'none', color: isRed ? '#b91c1c' : '#0f172a', fontWeight: 700 }}
              placeholder="0"
            />
          ) : euro(bVal)}
        </td>
        <td style={{ width: isMobile ? 50 : 60, background: '#fef2f2', textAlign: 'right', padding: isMobile ? '8px 10px' : '10px 12px', fontSize: isMobile ? 10 : 12, fontWeight: 600, color: isRed ? '#b91c1c' : '#0f172a', borderRight: '1px solid #cbd5e1', borderBottom: '2px solid #cbd5e1', borderTop: '2px solid #cbd5e1' }}>
          {caTotalHtBudget > 0 ? formatPercent((bVal / caTotalHtBudget) * 100) : ''}
        </td>

        {/* REALISE */}
        <td style={{ width: 10, background: '#fff', borderBottom: '2px solid #cbd5e1', borderTop: '2px solid #cbd5e1' }}></td>
        <td style={{ width: isMobile ? 70 : 90, padding: isMobile ? '8px 10px' : '10px 12px', textAlign: 'right', fontWeight: 700, color: isRed ? '#b91c1c' : '#0f172a', background: '#fef2f2', fontSize: isMobile ? 11 : 13, borderLeft: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', borderBottom: '2px solid #cbd5e1', borderTop: '2px solid #cbd5e1' }}>
          {euro(rVal)}
        </td>
        <td style={{ width: isMobile ? 50 : 60, background: '#fef2f2', textAlign: 'right', padding: isMobile ? '8px 10px' : '10px 12px', fontSize: isMobile ? 10 : 12, fontWeight: 600, color: isRed ? '#b91c1c' : '#0f172a', borderRight: '1px solid #cbd5e1', borderBottom: '2px solid #cbd5e1', borderTop: '2px solid #cbd5e1' }}>
          {caTotalHtRealise > 0 ? formatPercent((rVal / caTotalHtRealise) * 100) : ''}
        </td>

        {/* ECART */}
        <td style={{ width: 10, background: '#fff', borderBottom: '2px solid #cbd5e1', borderTop: '2px solid #cbd5e1' }}></td>
        <td style={{ width: isMobile ? 70 : 90, padding: isMobile ? '8px 10px' : '10px 12px', textAlign: 'right', fontWeight: 700, color: ecartColor(eVal), background: '#fef2f2', fontSize: isMobile ? 11 : 13, borderLeft: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', borderBottom: '2px solid #cbd5e1', borderTop: '2px solid #cbd5e1' }}>
          {ecartText(eVal, invert)}
        </td>
        <td style={{ width: isMobile ? 50 : 60, background: '#e2e8f0', textAlign: 'right', padding: isMobile ? '8px 10px' : '10px 12px', fontSize: isMobile ? 10 : 12, fontWeight: 600, color: ecartColor(eVal), borderRight: '1px solid #cbd5e1', borderBottom: '2px solid #cbd5e1', borderTop: '2px solid #cbd5e1' }}>
          {ecartRatioText(eVal, bVal, invert)}
        </td>
      </tr>
    );
  };

  const renderTotal =(label: string, bVal: number, rVal: number) => {
    const eVal = monthHasRealiseData ? ecart(rVal, bVal) : null;
    const invert = label === 'TOTA COUT MATIERE';
    return (
      <tr style={{ borderBottom: '2px solid #cbd5e1', borderTop: '2px solid #cbd5e1' }}>
        <td style={{ 
          padding: isMobile ? '8px 10px' : '10px 12px', 
          fontSize: isMobile ? 11 : 13, 
          fontWeight: 700, 
          background: '#f0fdf4', 
          color: '#166534', 
          textTransform: 'uppercase', 
          letterSpacing: '0.02em', 
          position: 'sticky', 
          left: 0, 
          zIndex: 10, 
          borderRight: '2px solid #cbd5e1', 
          borderBottom: '2px solid #cbd5e1', 
          borderTop: '2px solid #cbd5e1',
          minWidth: isMobile ? 140 : 200
        }}>
          {label}
        </td>
        
        {/* BUDGET */}
        <td style={{ width: 10, background: '#fff', borderBottom: '2px solid #cbd5e1', borderTop: '2px solid #cbd5e1' }}></td>
        <td style={{ width: isMobile ? 70 : 90, padding: isMobile ? '8px 10px' : '10px 12px', textAlign: 'right', fontWeight: 700, background: '#f0fdf4', color: '#166534', fontSize: isMobile ? 11 : 13, borderLeft: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', borderBottom: '2px solid #cbd5e1', borderTop: '2px solid #cbd5e1' }}>
          {euro(bVal)}
        </td>
        <td style={{ width: isMobile ? 50 : 60, background: '#f0fdf4', textAlign: 'right', padding: isMobile ? '8px 10px' : '10px 12px', fontSize: isMobile ? 10 : 12, fontWeight: 600, color: '#166534', borderRight: '1px solid #cbd5e1', borderBottom: '2px solid #cbd5e1', borderTop: '2px solid #cbd5e1' }}>
          {caTotalHtBudget > 0 ? formatPercent((bVal / caTotalHtBudget) * 100) : ''}
        </td>

        {/* REALISE */}
        <td style={{ width: 10, background: '#fff', borderBottom: '2px solid #cbd5e1', borderTop: '2px solid #cbd5e1' }}></td>
        <td style={{ width: isMobile ? 70 : 90, padding: isMobile ? '8px 10px' : '10px 12px', textAlign: 'right', fontWeight: 700, background: '#f0fdf4', color: '#166534', fontSize: isMobile ? 11 : 13, borderLeft: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', borderBottom: '2px solid #cbd5e1', borderTop: '2px solid #cbd5e1' }}>
          {euro(rVal)}
        </td>
        <td style={{ width: isMobile ? 50 : 60, background: '#f0fdf4', textAlign: 'right', padding: isMobile ? '8px 10px' : '10px 12px', fontSize: isMobile ? 10 : 12, fontWeight: 600, color: '#166534', borderRight: '1px solid #cbd5e1', borderBottom: '2px solid #cbd5e1', borderTop: '2px solid #cbd5e1' }}>
          {caTotalHtRealise > 0 ? formatPercent((rVal / caTotalHtRealise) * 100) : ''}
        </td>

        {/* ECART */}
        <td style={{ width: 10, background: '#fff', borderBottom: '2px solid #cbd5e1', borderTop: '2px solid #cbd5e1' }}></td>
        <td style={{ width: isMobile ? 70 : 90, padding: isMobile ? '8px 10px' : '10px 12px', textAlign: 'right', fontWeight: 700, background: '#f0fdf4', color: ecartColor(eVal), fontSize: isMobile ? 11 : 13, borderLeft: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', borderBottom: '2px solid #cbd5e1', borderTop: '2px solid #cbd5e1' }}>
          {ecartText(eVal, invert)}
        </td>
        <td style={{ width: isMobile ? 50 : 60, background: '#e2e8f0', textAlign: 'right', padding: isMobile ? '8px 10px' : '10px 12px', fontSize: isMobile ? 10 : 12, fontWeight: 600, color: ecartColor(eVal), borderRight: '1px solid #cbd5e1', borderBottom: '2px solid #cbd5e1', borderTop: '2px solid #cbd5e1' }}>
          {ecartRatioText(eVal, bVal, invert)}
        </td>
      </tr>
    );
  };

  const renderSubTotal =(label: string, bVal: number, rVal: number) => {
    const eVal = monthHasRealiseData ? ecart(rVal, bVal) : null;
    return (
      <tr style={{ borderBottom: '1px solid #cbd5e1', borderTop: '1px solid #e2e8f0' }}>
        <td style={{ 
          padding: isMobile ? '6px 8px' : '8px 12px', 
          fontSize: isMobile ? 11 : 13, 
          fontWeight: 600, 
          background: '#f8fafc', 
          color: '#334155', 
          position: 'sticky', 
          left: 0, 
          zIndex: 10, 
          borderRight: '1px solid #cbd5e1', 
          borderBottom: '1px solid #cbd5e1', 
          borderTop: '1px solid #e2e8f0',
          minWidth: isMobile ? 140 : 200
        }}>
          {label}
        </td>
        
        {/* BUDGET */}
        <td style={{ width: 10, background: '#fff', borderBottom: '1px solid #cbd5e1', borderTop: '1px solid #e2e8f0' }}></td>
        <td style={{ width: isMobile ? 70 : 90, padding: isMobile ? '6px 8px' : '8px 12px', textAlign: 'right', fontWeight: 600, background: '#f8fafc', color: '#0f172a', fontSize: isMobile ? 11 : 13, borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #cbd5e1', borderTop: '1px solid #e2e8f0' }}>
          {euro(bVal)}
        </td>
        <td style={{ width: isMobile ? 50 : 60, background: '#f8fafc', textAlign: 'right', padding: isMobile ? '6px 8px' : '8px 12px', fontSize: isMobile ? 10 : 12, fontWeight: 500, color: '#64748b', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #cbd5e1', borderTop: '1px solid #e2e8f0' }}>
          {caTotalHtBudget > 0 ? formatPercent((bVal / caTotalHtBudget) * 100) : ''}
        </td>

        {/* REALISE */}
        <td style={{ width: 10, background: '#fff', borderBottom: '1px solid #cbd5e1', borderTop: '1px solid #e2e8f0' }}></td>
        <td style={{ width: isMobile ? 70 : 90, padding: isMobile ? '6px 8px' : '8px 12px', textAlign: 'right', fontWeight: 600, background: '#f8fafc', color: '#0f172a', fontSize: isMobile ? 11 : 13, borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #cbd5e1', borderTop: '1px solid #e2e8f0' }}>
          {euro(rVal)}
        </td>
        <td style={{ width: isMobile ? 50 : 60, background: '#f8fafc', textAlign: 'right', padding: isMobile ? '6px 8px' : '8px 12px', fontSize: isMobile ? 10 : 12, fontWeight: 500, color: '#64748b', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #cbd5e1', borderTop: '1px solid #e2e8f0' }}>
          {caTotalHtRealise > 0 ? formatPercent((rVal / caTotalHtRealise) * 100) : ''}
        </td>

        {/* ECART */}
        <td style={{ width: 10, background: '#fff', borderBottom: '1px solid #cbd5e1', borderTop: '1px solid #e2e8f0' }}></td>
        <td style={{ width: isMobile ? 70 : 90, padding: isMobile ? '6px 8px' : '8px 12px', textAlign: 'right', fontWeight: 600, background: '#f8fafc', color: ecartColor(eVal), fontSize: isMobile ? 11 : 13, borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #cbd5e1', borderTop: '1px solid #e2e8f0' }}>
          {ecartText(eVal, true)}
        </td>
        <td style={{ width: isMobile ? 50 : 60, background: '#e2e8f0', textAlign: 'right', padding: isMobile ? '6px 8px' : '8px 12px', fontSize: isMobile ? 10 : 12, fontWeight: 500, color: ecartColor(eVal), borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', borderTop: '1px solid #e2e8f0' }}>
          {ecartRatioText(eVal, bVal, true)}
        </td>
      </tr>
    );
  };

  const renderSectionBanner =(icon: string, title: string) => (
    <tr>
      <td colSpan={10} style={{
        padding: isMobile ? '10px 12px' : '12px 16px',
        fontSize: isMobile ? 11 : 12,
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
    <div style={{ height: '100%', background: '#f8fafc', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex', overflow: 'hidden', position: 'relative' }}>
      <style>{`
        @media (max-width: 1024px) {
          .mobile-sidebar-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 95;
          }
        }
        .edg-mensuel-month-pills::-webkit-scrollbar { display: none; }
        .edg-mensuel-month-pills { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {!hideHeader && isMobile && isSidebarOpen && (
        <div className="mobile-sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Left Sidebar for Months (mode complet uniquement — masquée quand hideHeader, le sélecteur de mois passe dans la ligne compacte horizontale) */}
      {!hideHeader && (
      <aside style={{
        width: 260, 
        background: '#1e293b', 
        color: '#fff', 
        display: 'flex', 
        flexDirection: 'column', 
        flexShrink: 0, 
        boxShadow: '4px 0 15px rgba(0,0,0,0.05)', 
        zIndex: 100,
        position: isMobile ? 'absolute' : 'relative',
        height: '100%',
        transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease-in-out'
      }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
            <ChevronLeft size={16} /> Retour Accueil
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '24px 0 0 0', letterSpacing: '-0.02em', color: '#f8fafc' }}>État de Gestion</h1>
          <div style={{ fontSize: 14, color: '#94a3b8', marginTop: 4, fontWeight: 500 }}>Année {YEAR}</div>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 4, scrollbarWidth: 'none' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 12px 12px 12px' }}>Sélection du mois</div>
          {MONTH_NAMES.map((m, i) => (
            <button
              key={i}
              onClick={() => setMonth(i)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px',
                background: month === i ? '#10b981' : 'transparent',
                color: month === i ? '#fff' : '#cbd5e1',
                border: 'none', borderRadius: 8, cursor: 'pointer',
                fontSize: 14, fontWeight: month === i ? 700 : 500,
                textTransform: 'capitalize', transition: 'all 0.2s',
                textAlign: 'left',
                boxShadow: month === i ? '0 4px 6px -1px rgba(16, 185, 129, 0.3)' : 'none'
              }}
              onMouseEnter={e => { if (month !== i) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#fff'; } }}
              onMouseLeave={e => { if (month !== i) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#cbd5e1'; } }}
            >
              {m}
              {month === i && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(180deg)' }}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>}
            </button>
          ))}
        </div>
      </aside>
      )}

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f8fafc' }}>
        
        {!hideHeader ? (
        /* Top Header (mode complet) */
        <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: isMobile ? '0 16px' : '0 32px', display: 'flex', flexDirection: 'column', flexShrink: 0, zIndex: 90 }}>
          <div style={{ height: isMobile ? 60 : 80, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {isMobile && (
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 4 }}
                >
                  {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
              )}
              <h2 style={{ fontSize: isMobile ? 18 : 28, fontWeight: 800, color: '#0f172a', margin: 0, textTransform: 'capitalize', letterSpacing: '-0.02em' }}>
                {MONTH_NAMES[month]} {YEAR}
              </h2>
              <div
                title="Part du budget CA du mois déjà couverte par les jours renseignés dans le Suivi Quotidien"
                style={{ background: '#f0fdfa', color: '#0d9488', border: '1px solid #99f6e4', padding: '4px 12px', borderRadius: 999, fontSize: isMobile ? 11 : 13, fontWeight: 700, letterSpacing: '0.02em' }}
              >
                Avancement : {formatPercent(monthProgress * 100)}
              </div>
            </div>
            <div style={{ background: '#10b981', color: '#fff', padding: '6px 16px', borderRadius: 999, fontSize: isMobile ? 12 : 14, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)' }}>
              {MONTHS_SHORT[month]}
            </div>
          </div>
        </header>
        ) : (
        /* Ligne compacte : sélecteur de mois horizontal (pastilles scrollables) + badge Avancement,
           remplace la sidebar 260px + le header complet, tous deux redondants avec le header d'EdgAnnuelTabs. */
        <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: isMobile ? '8px 12px' : '10px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, zIndex: 90 }}>
          <div className="edg-mensuel-month-pills" style={{ display: 'flex', gap: 6, overflowX: 'auto', flex: 1, minWidth: 0 }}>
            {MONTH_NAMES_SHORT.map((m, i) => (
              <button
                key={i}
                onClick={() => setMonth(i)}
                style={{
                  flexShrink: 0,
                  padding: isMobile ? '6px 10px' : '6px 14px',
                  borderRadius: 999,
                  border: 'none',
                  cursor: 'pointer',
                  background: month === i ? '#10b981' : '#f1f5f9',
                  color: month === i ? '#fff' : '#475569',
                  fontSize: isMobile ? 12 : 13,
                  fontWeight: month === i ? 700 : 600,
                  textTransform: 'capitalize',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}
              >
                {m}
              </button>
            ))}
          </div>
          <div
            title="Part du budget CA du mois déjà couverte par les jours renseignés dans le Suivi Quotidien"
            style={{ flexShrink: 0, background: '#f0fdfa', color: '#0d9488', border: '1px solid #99f6e4', padding: '4px 12px', borderRadius: 999, fontSize: isMobile ? 11 : 12, fontWeight: 700, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}
          >
            Avancement : {formatPercent(monthProgress * 100)}
          </div>
        </div>
        )}

        {/* KPI Summary Cards */}
        <div style={{ display: 'flex', gap: isMobile ? 8 : 16, padding: hideHeader ? (isMobile ? '10px 12px 0' : '12px 20px 0') : (isMobile ? '12px 12px 0' : '20px 32px 0'), flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
          {kpiCards.map(k => {
            const rawEcart = monthHasRealiseData ? ecart(k.r, k.b) : null;
            const kpiEcartColor = ecartColor(rawEcart);
            const kpiEcartText = ecartText(rawEcart, k.invert);
            const kpiRatioEcart = ecartRatioText(rawEcart, k.b, k.invert);
            return (
              <div key={k.label} style={{ flex: 1, minWidth: isMobile ? '47%' : 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: hideHeader ? '8px 14px' : (isMobile ? '10px 12px' : '14px 16px'), boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: isMobile ? 10 : 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {k.label}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobile ? 11 : 12 }}>
                    <span style={{ color: '#94a3b8' }}>Budget</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{euro(k.b)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: isMobile ? 11 : 12 }}>
                    <span style={{ color: '#94a3b8' }}>Réalisé</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{euro(k.r)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: isMobile ? 11 : 12, borderTop: '1px solid #f1f5f9', paddingTop: 4, marginTop: 2 }}>
                    <span style={{ color: '#94a3b8' }}>Écart</span>
                    <span>
                      <span style={{ fontWeight: 700, color: kpiEcartColor }}>{kpiEcartText}</span>
                      {kpiRatioEcart && <span style={{ marginLeft: 6, fontSize: isMobile ? 10 : 11, fontWeight: 600, color: kpiEcartColor }}>({kpiRatioEcart})</span>}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Table Area */}
        <div style={{ flex: 1, overflow: 'auto', padding: hideHeader ? (isMobile ? 12 : 16) : (isMobile ? 12 : 32) }}>
          <div style={{ height: '100%', background: '#fff', borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                <tr>
                  <th style={{ background: '#fff', position: 'sticky', left: 0, top: 0, zIndex: 50, border: 'none', padding: '0 0 12px 0' }}></th>
                  
                  <th style={{ background: '#fff', position: 'sticky', top: 0, zIndex: 40, border: 'none', width: 10 }}></th>
                  <th colSpan={2} style={{ position: 'sticky', top: 0, zIndex: 40, borderTop: '1px solid #cbd5e1', borderLeft: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700, fontSize: 12, padding: '8px 0', background: '#f1f5f9', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderTopLeftRadius: 6, borderTopRightRadius: 6 }}>BUDGET</th>
                  
                  <th style={{ background: '#fff', position: 'sticky', top: 0, zIndex: 40, border: 'none', width: 10 }}></th>
                  <th colSpan={2} style={{ position: 'sticky', top: 0, zIndex: 40, borderTop: '1px solid #cbd5e1', borderLeft: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700, fontSize: 12, padding: '8px 0', background: '#f1f5f9', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderTopLeftRadius: 6, borderTopRightRadius: 6 }}>REALISE</th>
                  
                  <th style={{ background: '#fff', position: 'sticky', top: 0, zIndex: 40, border: 'none', width: 10 }}></th>
                  <th colSpan={2} style={{ position: 'sticky', top: 0, zIndex: 40, borderTop: '1px solid #cbd5e1', borderLeft: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700, fontSize: 12, padding: '8px 0', background: '#f1f5f9', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderTopLeftRadius: 6, borderTopRightRadius: 6 }}>ÉCART BUDGET</th>
                </tr>
                <tr>
                  <th style={{ background: '#fff', position: 'sticky', left: 0, top: 34, zIndex: 50, border: 'none', padding: '0 0 12px 0' }}></th>
                  
                  <th style={{ background: '#fff', position: 'sticky', top: 34, zIndex: 40, border: 'none', width: 10 }}></th>
                  <th style={{ position: 'sticky', top: 34, zIndex: 40, borderRight: '1px solid #cbd5e1', borderLeft: '1px solid #cbd5e1', width: 90, background: '#f8fafc' }}></th>
                  <th style={{ position: 'sticky', top: 34, zIndex: 40, borderRight: '1px solid #cbd5e1', width: 60, textAlign: 'center', fontWeight: 700, fontSize: 11, padding: '8px 0', background: '#fef3c7', color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ratio</th>
                  
                  <th style={{ background: '#fff', position: 'sticky', top: 34, zIndex: 40, border: 'none', width: 10 }}></th>
                  <th style={{ position: 'sticky', top: 34, zIndex: 40, borderRight: '1px solid #cbd5e1', borderLeft: '1px solid #cbd5e1', width: 90, background: '#f8fafc' }}></th>
                  <th style={{ position: 'sticky', top: 34, zIndex: 40, borderRight: '1px solid #cbd5e1', width: 60, textAlign: 'center', fontWeight: 700, fontSize: 11, padding: '8px 0', background: '#fef3c7', color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ratio</th>
                  
                  <th style={{ background: '#fff', position: 'sticky', top: 34, zIndex: 40, border: 'none', width: 10 }}></th>
                  <th style={{ position: 'sticky', top: 34, zIndex: 40, borderRight: '1px solid #cbd5e1', borderLeft: '1px solid #cbd5e1', width: 90, background: '#f8fafc' }}></th>
                  <th style={{ position: 'sticky', top: 34, zIndex: 40, borderRight: '1px solid #cbd5e1', width: 60, textAlign: 'center', fontWeight: 700, fontSize: 11, padding: '8px 0', background: '#e2e8f0', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}></th>
                </tr>
              </thead>
              <tbody style={{ borderTop: '1px solid #cbd5e1' }}>
              {renderHeader('C.A. TOTAL HT', caTotalHtBudget, caTotalHtRealise, true)}
              {renderSectionBanner('🍽️', 'Coût Matière')}
              {renderRow('Achats Food', 'achats_food', true)}
              {renderRow('Consommables liés à la vente (Paper; Flyer;jouets;CO2)', 'consommables')}
              {renderRow('Variation de stock', 'variation_stock')}
              {renderRow('Repas des salariés (2,29€+1,23€/repas)', 'repas_salaries')}
              {renderTotal('TOTA COUT MATIERE', coutMatiereB, coutMatiereR)}
              {renderSectionBanner('📈', 'Marge')}
              {renderHeader('Marge brute', margeBruteB, margeBruteR, true)}
              {renderRow('Refacturation Pub, Revenus Ecoles & format°et huiles usagées', 'refacturation')}
              {renderTotal('TOTAL MARGE', totalMargeB, totalMargeR)}

              {renderSectionBanner('👥', 'Personnel')}
              {renderRow('Coût salaires', 'cout_salaires', true)}
              {renderRow('Charges sociales', 'charges_sociales')}
              {renderRow('Frais de formation et réaffectation salaires', 'frais_formation')}
              {renderRow('Aides et Subventions', 'aides_subventions')}
              {renderSubTotal('Frais person. directs', fraisPersDirectsB, fraisPersDirectsR)}
              {renderRow('Provision CP+ JF+ RC BRUT', 'prov_cp_brut')}
              {renderRow('Provision CP+ JF+ RC PAT', 'prov_cp_pat')}
              {renderRow('Prov. prud\'h, pro et div.', 'prov_prud')}
              {renderSubTotal('Frais Pers. indirects', fraisPersIndirectsB, fraisPersIndirectsR)}
              {renderRow('Taxe sur les salaires', 'taxe_salaires')}
              {renderRow('Autres primes et divers', 'autres_primes')}
              {renderSubTotal('Total autres frais person.', totalAutresFraisPersB, totalAutresFraisPersR)}
              {renderHeader('TOTAL Salaires et charges', totalSalairesChargesB, totalSalairesChargesR, true)}

              {renderSectionBanner('📣', 'Publicité')}
              {renderRow('Prestation animation + décoration', 'prestation_anim', true)}
              {renderRow('Publicité locale + Com Agence + Annonces', 'pub_locale')}
              {renderHeader('TOTAL PUBLICITE', totalPubliciteB, totalPubliciteR, true)}

              {renderSectionBanner('🏢', "Frais Généraux d'Exploitation")}
              {renderRow('Comm. / encaissement', 'comm_encaissement')}
              {renderRow('Produits d\'entretien et linge à jeter', 'produits_entretien', true)}
              {renderRow('Fournitures d\'exploitation et de bureau', 'fournitures_bureau', true)}
              {renderRow('Matériel et outillage', 'materiel_outillage', true)}
              {renderRow('Blanchissage-Entretien matériel', 'blanchissage')}
              {renderRow('Vêtement professionnel', 'vetement_pro', true)}
              {renderRow('PTT+Telephone+Internet', 'ptt')}
              {renderRow('Enlèv.fonds et trait. déchets', 'enlev_fonds')}
              {renderRow('Transport et déplacement', 'transport')}
              {renderRow('Honoraires comptables + juridiques (+ CAC)', 'honoraires_comptables')}
              {renderRow('Honoraires divers', 'honoraires_divers')}
              {renderHeader('TOTAL FG d\'exploitation', totalFgExploitationB, totalFgExploitationR, true)}

              {renderSectionBanner('🔧', "Frais Généraux d'Occupation")}
              {renderRow('Contrats maintenance', 'contrats_maintenance', true)}
              {renderRow('Entretien & répar. locaux.', 'entretien_locaux')}
              {renderRow('Nettoyage locaux & ext.', 'nettoyage_locaux')}
              {renderRow('Surveillance-Sécurité-Voiturier', 'surveillance')}
              {renderRow('Energie', 'energie', true)}
              {renderRow('Gaz-Eau', 'gaz_eau')}
              {renderRow('Assurances', 'assurances')}
              {renderHeader('TOTAL FG d\'occupation', totalFgOccupationB, totalFgOccupationR, true)}
              
              {renderTotal('RESULTAT GESTION', resultatGestionB, resultatGestionR)}

              {renderSectionBanner('🏗️', 'Coût des Immeubles')}
              {renderRow('Amortissements', 'amortissements')}
              {renderRow('Crédit Bail', 'credit_bail')}
              {renderRow('Loyers Murs', 'loyers_murs')}
              {renderRow('Charges locatives et GIE', 'charges_locatives')}
              {renderRow('Impots et taxes', 'impots_taxes')}
              {renderHeader('COUT DES IMM.', coutImmB, coutImmR, true)}

              {renderSectionBanner('📊', 'Résultats et Trésorerie')}
              {renderRow('Redavances Spre SACEM', 'redevances_spre')}
              {renderRow('Redevances Grpe Flo', 'redevances_flo')}
              {renderRow('Marketing', 'marketing')}
              {renderRow('Except de gestion(Diff.de caisse+Remb Ass)', 'except_gestion')}
              {renderRow('Frais de banque', 'frais_banque')}
              {renderTotal('RES. D\'EXPLOIT', resExploitB, resExploitR)}
              
              {renderRow('Net financier', 'net_financier')}
              {renderTotal('RES. COURANT', resCourantB, resCourantR)}
              
              {renderRow('Amortissement except.', 'amortissement_except')}
              {renderRow('Frais de Holding', 'frais_holding')}
              {renderRow('Pertes exceptionnelles', 'pertes_except')}
              {renderTotal('RES. NET avant IS', resNetAvantIsB, resNetAvantIsR)}
              
              {renderRow('Retraitement DAA & Net financier', 'retraitement_daa')}
              {renderTotal('E.B.E.( credit CICE inclus)', ebeB, ebeR)}
              
              {renderRow('Remboursement net financier', 'remboursement_net')}
              {renderRow('Remboursement Capital emprunté', 'remboursement_capital')}
              {renderTotal('Cash Flow avant IS', cashFlowB, cashFlowR)}
            </tbody>
          </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
