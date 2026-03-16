import React, { useMemo, useState, useEffect } from 'react';
import { useData } from './DataContext';
import { getDashboardRowIndices } from './utils';
import { Menu, X, ChevronLeft } from 'lucide-react';

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

interface EdgMensuelProps {
  month: number;
  setMonth: (month: number) => void;
  onBack: () => void;
}

const n = (v?: string | number) => {
  if (typeof v === 'number') return v;
  return parseFloat((v || '0').toString().replace(',', '.')) || 0;
};

const fe = (v: number) => v === 0 ? '0' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v);
const fp = (v: number) => (isFinite(v) && !isNaN(v)) ? `${v.toFixed(2)}%` : '';

export default function EdgMensuel({ month, setMonth, onBack }: EdgMensuelProps) {
  const { data, updateEdgMensuel, updateEdgMensuelRealise, selectedYear } = useData();
  const YEAR = selectedYear;
  const MONTHS_SHORT = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'].map(m => `${m}-${YEAR.toString().slice(-2)}`);
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

  // Calculate CA TOTAL HT from dashboard for REALISE
  const caTotalHtRealise = useMemo(() => {
    const md = data[month]?.dashboard || {};
    const indices = getDashboardRowIndices(month, YEAR);
    let total = 0;
    Object.values(indices).forEach(rIdx => {
      total += n(md[`${rIdx}-24`]);
    });
    return total;
  }, [data, month]);

  const caTotalHtBudget = n(edgData['ca_total_ht']);

  const handleChangeBudget = (key: string, value: string) => {
    const cleanValue = value.replace(/[^0-9.,-]/g, '').replace(',', '.');
    updateEdgMensuel(month, key, cleanValue);
  };

  const handleChangeRealise = (key: string, value: string) => {
    const cleanValue = value.replace(/[^0-9.,-]/g, '').replace(',', '.');
    updateEdgMensuelRealise(month, key, cleanValue);
  };

  const valB = (key: string) => n(edgData[key]);
  const valR = (key: string) => n(edgRealiseData[key]);

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

  const ecart = (r: number, b: number) => r - b;

  const renderRow = (label: string, key: string, isBlue = false) => {
    const bVal = valB(key);
    const rVal = valR(key);
    const eVal = ecart(rVal, bVal);
    
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
          {caTotalHtBudget > 0 && edgData[key] ? fp((bVal / caTotalHtBudget) * 100) : ''}
        </td>

        {/* REALISE */}
        <td style={{ width: 10, background: '#fff', borderBottom: '1px solid #e2e8f0' }}></td>
        <td style={{ width: isMobile ? 70 : 90, padding: 0, background: '#fff', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
          <input
            type="text"
            value={edgRealiseData[key] || ''}
            onChange={e => handleChangeRealise(key, e.target.value)}
            style={{ width: '100%', height: '100%', border: 'none', background: 'transparent', textAlign: 'right', padding: isMobile ? '6px 8px' : '8px 12px', fontSize: isMobile ? 11 : 13, outline: 'none', color: '#0f172a', fontWeight: edgRealiseData[key] ? 500 : 400 }}
            placeholder="0"
          />
        </td>
        <td style={{ width: isMobile ? 50 : 60, background: '#f8fafc', textAlign: 'right', padding: isMobile ? '6px 8px' : '8px 12px', fontSize: isMobile ? 10 : 12, color: '#64748b', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
          {caTotalHtRealise > 0 && edgRealiseData[key] ? fp((rVal / caTotalHtRealise) * 100) : ''}
        </td>

        {/* ECART */}
        <td style={{ width: 10, background: '#fff', borderBottom: '1px solid #e2e8f0' }}></td>
        <td style={{ width: isMobile ? 70 : 90, padding: isMobile ? '6px 8px' : '8px 12px', textAlign: 'right', background: '#fff', fontSize: isMobile ? 11 : 13, color: eVal < 0 ? '#b91c1c' : '#0f172a', borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
          {fe(eVal)}
        </td>
        <td style={{ width: isMobile ? 50 : 60, background: '#e2e8f0', textAlign: 'right', padding: isMobile ? '6px 8px' : '8px 12px', fontSize: isMobile ? 10 : 12, color: '#475569', borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #e2e8f0' }}>
        </td>
      </tr>
    );
  };

  const renderHeader = (label: string, bVal: number, rVal: number, isRed = false) => {
    const eVal = ecart(rVal, bVal);
    const isCaTotal = label === 'C.A. TOTAL HT';
    
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
          ) : fe(bVal)}
        </td>
        <td style={{ width: isMobile ? 50 : 60, background: '#fef2f2', textAlign: 'right', padding: isMobile ? '8px 10px' : '10px 12px', fontSize: isMobile ? 10 : 12, fontWeight: 600, color: isRed ? '#b91c1c' : '#0f172a', borderRight: '1px solid #cbd5e1', borderBottom: '2px solid #cbd5e1', borderTop: '2px solid #cbd5e1' }}>
          {caTotalHtBudget > 0 ? fp((bVal / caTotalHtBudget) * 100) : ''}
        </td>

        {/* REALISE */}
        <td style={{ width: 10, background: '#fff', borderBottom: '2px solid #cbd5e1', borderTop: '2px solid #cbd5e1' }}></td>
        <td style={{ width: isMobile ? 70 : 90, padding: isMobile ? '8px 10px' : '10px 12px', textAlign: 'right', fontWeight: 700, color: isRed ? '#b91c1c' : '#0f172a', background: '#fef2f2', fontSize: isMobile ? 11 : 13, borderLeft: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', borderBottom: '2px solid #cbd5e1', borderTop: '2px solid #cbd5e1' }}>
          {fe(rVal)}
        </td>
        <td style={{ width: isMobile ? 50 : 60, background: '#fef2f2', textAlign: 'right', padding: isMobile ? '8px 10px' : '10px 12px', fontSize: isMobile ? 10 : 12, fontWeight: 600, color: isRed ? '#b91c1c' : '#0f172a', borderRight: '1px solid #cbd5e1', borderBottom: '2px solid #cbd5e1', borderTop: '2px solid #cbd5e1' }}>
          {caTotalHtRealise > 0 ? fp((rVal / caTotalHtRealise) * 100) : ''}
        </td>

        {/* ECART */}
        <td style={{ width: 10, background: '#fff', borderBottom: '2px solid #cbd5e1', borderTop: '2px solid #cbd5e1' }}></td>
        <td style={{ width: isMobile ? 70 : 90, padding: isMobile ? '8px 10px' : '10px 12px', textAlign: 'right', fontWeight: 700, color: eVal < 0 ? '#b91c1c' : '#0f172a', background: '#fef2f2', fontSize: isMobile ? 11 : 13, borderLeft: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', borderBottom: '2px solid #cbd5e1', borderTop: '2px solid #cbd5e1' }}>
          {fe(eVal)}
        </td>
        <td style={{ width: isMobile ? 50 : 60, background: '#e2e8f0', textAlign: 'right', padding: isMobile ? '8px 10px' : '10px 12px', fontSize: isMobile ? 10 : 12, borderRight: '1px solid #cbd5e1', borderBottom: '2px solid #cbd5e1', borderTop: '2px solid #cbd5e1' }}>
        </td>
      </tr>
    );
  };

  const renderTotal = (label: string, bVal: number, rVal: number) => {
    const eVal = ecart(rVal, bVal);
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
          {fe(bVal)}
        </td>
        <td style={{ width: isMobile ? 50 : 60, background: '#f0fdf4', textAlign: 'right', padding: isMobile ? '8px 10px' : '10px 12px', fontSize: isMobile ? 10 : 12, fontWeight: 600, color: '#166534', borderRight: '1px solid #cbd5e1', borderBottom: '2px solid #cbd5e1', borderTop: '2px solid #cbd5e1' }}>
          {caTotalHtBudget > 0 ? fp((bVal / caTotalHtBudget) * 100) : ''}
        </td>

        {/* REALISE */}
        <td style={{ width: 10, background: '#fff', borderBottom: '2px solid #cbd5e1', borderTop: '2px solid #cbd5e1' }}></td>
        <td style={{ width: isMobile ? 70 : 90, padding: isMobile ? '8px 10px' : '10px 12px', textAlign: 'right', fontWeight: 700, background: '#f0fdf4', color: '#166534', fontSize: isMobile ? 11 : 13, borderLeft: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', borderBottom: '2px solid #cbd5e1', borderTop: '2px solid #cbd5e1' }}>
          {fe(rVal)}
        </td>
        <td style={{ width: isMobile ? 50 : 60, background: '#f0fdf4', textAlign: 'right', padding: isMobile ? '8px 10px' : '10px 12px', fontSize: isMobile ? 10 : 12, fontWeight: 600, color: '#166534', borderRight: '1px solid #cbd5e1', borderBottom: '2px solid #cbd5e1', borderTop: '2px solid #cbd5e1' }}>
          {caTotalHtRealise > 0 ? fp((rVal / caTotalHtRealise) * 100) : ''}
        </td>

        {/* ECART */}
        <td style={{ width: 10, background: '#fff', borderBottom: '2px solid #cbd5e1', borderTop: '2px solid #cbd5e1' }}></td>
        <td style={{ width: isMobile ? 70 : 90, padding: isMobile ? '8px 10px' : '10px 12px', textAlign: 'right', fontWeight: 700, background: '#f0fdf4', color: eVal < 0 ? '#b91c1c' : '#166534', fontSize: isMobile ? 11 : 13, borderLeft: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', borderBottom: '2px solid #cbd5e1', borderTop: '2px solid #cbd5e1' }}>
          {fe(eVal)}
        </td>
        <td style={{ width: isMobile ? 50 : 60, background: '#e2e8f0', textAlign: 'right', padding: isMobile ? '8px 10px' : '10px 12px', fontSize: isMobile ? 10 : 12, borderRight: '1px solid #cbd5e1', borderBottom: '2px solid #cbd5e1', borderTop: '2px solid #cbd5e1' }}>
        </td>
      </tr>
    );
  };

  const renderSubTotal = (label: string, bVal: number, rVal: number) => {
    const eVal = ecart(rVal, bVal);
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
          {fe(bVal)}
        </td>
        <td style={{ width: isMobile ? 50 : 60, background: '#f8fafc', textAlign: 'right', padding: isMobile ? '6px 8px' : '8px 12px', fontSize: isMobile ? 10 : 12, fontWeight: 500, color: '#64748b', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #cbd5e1', borderTop: '1px solid #e2e8f0' }}>
          {caTotalHtBudget > 0 ? fp((bVal / caTotalHtBudget) * 100) : ''}
        </td>

        {/* REALISE */}
        <td style={{ width: 10, background: '#fff', borderBottom: '1px solid #cbd5e1', borderTop: '1px solid #e2e8f0' }}></td>
        <td style={{ width: isMobile ? 70 : 90, padding: isMobile ? '6px 8px' : '8px 12px', textAlign: 'right', fontWeight: 600, background: '#f8fafc', color: '#0f172a', fontSize: isMobile ? 11 : 13, borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #cbd5e1', borderTop: '1px solid #e2e8f0' }}>
          {fe(rVal)}
        </td>
        <td style={{ width: isMobile ? 50 : 60, background: '#f8fafc', textAlign: 'right', padding: isMobile ? '6px 8px' : '8px 12px', fontSize: isMobile ? 10 : 12, fontWeight: 500, color: '#64748b', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #cbd5e1', borderTop: '1px solid #e2e8f0' }}>
          {caTotalHtRealise > 0 ? fp((rVal / caTotalHtRealise) * 100) : ''}
        </td>

        {/* ECART */}
        <td style={{ width: 10, background: '#fff', borderBottom: '1px solid #cbd5e1', borderTop: '1px solid #e2e8f0' }}></td>
        <td style={{ width: isMobile ? 70 : 90, padding: isMobile ? '6px 8px' : '8px 12px', textAlign: 'right', fontWeight: 600, background: '#f8fafc', color: eVal < 0 ? '#b91c1c' : '#0f172a', fontSize: isMobile ? 11 : 13, borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #cbd5e1', borderTop: '1px solid #e2e8f0' }}>
          {fe(eVal)}
        </td>
        <td style={{ width: isMobile ? 50 : 60, background: '#e2e8f0', textAlign: 'right', padding: isMobile ? '6px 8px' : '8px 12px', fontSize: isMobile ? 10 : 12, borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', borderTop: '1px solid #e2e8f0' }}>
        </td>
      </tr>
    );
  };

  return (
    <div style={{ height: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex', overflow: 'hidden', position: 'relative' }}>
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
      `}</style>

      {isMobile && isSidebarOpen && (
        <div className="mobile-sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Left Sidebar for Months */}
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
          {MONTHS.map((m, i) => (
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

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f8fafc' }}>
        
        {/* Top Header */}
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
                {MONTHS[month]} {YEAR}
              </h2>
            </div>
            <div style={{ background: '#10b981', color: '#fff', padding: '6px 16px', borderRadius: 999, fontSize: isMobile ? 12 : 14, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)' }}>
              {MONTHS_SHORT[month]}
            </div>
          </div>
        </header>

        {/* Table Area */}
        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 12 : 32, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, background: '#fff', borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
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
                  <th colSpan={2} style={{ position: 'sticky', top: 0, zIndex: 40, borderTop: '1px solid #cbd5e1', borderLeft: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700, fontSize: 12, padding: '8px 0', background: '#f1f5f9', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderTopLeftRadius: 6, borderTopRightRadius: 6 }}>ECART AU BUDGET</th>
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
              {renderRow('Achats Food', 'achats_food', true)}
              {renderRow('Consommables liés à la vente (Paper; Flyer;jouets;CO2)', 'consommables')}
              {renderRow('Variation de stock', 'variation_stock')}
              {renderRow('Repas des salariés (2,29€+1,23€/repas)', 'repas_salaries')}
              {renderTotal('TOTA COUT MATIERE', coutMatiereB, coutMatiereR)}
              {renderHeader('Marge brute', margeBruteB, margeBruteR, true)}
              {renderRow('Refacturation Pub, Revenus Ecoles & format°et huiles usagées', 'refacturation')}
              {renderTotal('TOTAL MARGE', totalMargeB, totalMargeR)}
              
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
              
              {renderRow('Prestation animation + décoration', 'prestation_anim', true)}
              {renderRow('Publicité locale + Com Agence + Annonces', 'pub_locale')}
              {renderHeader('TOTAL PUBLICITE', totalPubliciteB, totalPubliciteR, true)}
              
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
              
              {renderRow('Contrats maintenance', 'contrats_maintenance', true)}
              {renderRow('Entretien & répar. locaux.', 'entretien_locaux')}
              {renderRow('Nettoyage locaux & ext.', 'nettoyage_locaux')}
              {renderRow('Surveillance-Sécurité-Voiturier', 'surveillance')}
              {renderRow('Energie', 'energie', true)}
              {renderRow('Gaz-Eau', 'gaz_eau')}
              {renderRow('Assurances', 'assurances')}
              {renderHeader('TOTAL FG d\'occupation', totalFgOccupationB, totalFgOccupationR, true)}
              
              {renderTotal('RESULTAT GESTION', resultatGestionB, resultatGestionR)}
              
              {renderRow('Amortissements', 'amortissements')}
              {renderRow('Crédit Bail', 'credit_bail')}
              {renderRow('Loyers Murs', 'loyers_murs')}
              {renderRow('Charges locatives et GIE', 'charges_locatives')}
              {renderRow('Impots et taxes', 'impots_taxes')}
              {renderHeader('COUT DES IMM.', coutImmB, coutImmR, true)}
              
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
