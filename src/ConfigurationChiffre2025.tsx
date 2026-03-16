import React, { useState } from 'react';
import { useData } from './DataContext';

const YEAR = 2025;
const NAV = '#1e293b';
const AMBER = '#f59e0b';
const BLUE = '#3b82f6';
const GREEN = '#10b981';

const MONTHS_SHORT = ['janv.-25','févr.-25','mars-25','avr.-25','mai-25','juin-25','juil.-25','août-25','sept.-25','oct.-25','nov.-25','déc.-25'];
const WEEKS = Array.from({ length: 52 }, (_, i) => `S${i + 1}`);

const p = (v?: string | number) => {
  if (typeof v === 'number') return v;
  return parseFloat((v || '0').replace(',', '.')) || 0;
};
const fe = (v: number) => v === 0 ? '0,00 €' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v);
const fp = (v: number) => (isFinite(v) && !isNaN(v)) ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '—';

interface ConfigurationChiffre2025Props {
  onBack: () => void;
  hideHeader?: boolean;
}

export default function ConfigurationChiffre2025({ onBack, hideHeader = false }: ConfigurationChiffre2025Props) {
  const { config2025, updateConfig2025 } = useData();
  const [activeTab, setActiveTab] = useState<'mensuel' | 'hebdo_ca' | 'hebdo_rh'>('mensuel');

  const handleMensuelChange = (monthIndex: number, field: string, value: string) => {
    updateConfig2025('mensuel', monthIndex, field, value);
  };

  const handleHebdoChange = (weekIndex: number, field: string, value: string) => {
    updateConfig2025('hebdo', weekIndex, field, value);
  };

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

  const inputStyle: React.CSSProperties = {
    width: '100%', minWidth: '60px', border: '1px solid #e2e8f0', borderRadius: 4,
    padding: '4px', textAlign: 'center', fontSize: 11, fontFamily: 'inherit',
    background: '#fff', color: '#1e293b', fontWeight: 600
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
          const dt = config2025.mensuel[i] || {};
          const ca_vae = p(dt.ca_vae);
          const ca_midi = p(dt.ca_midi);
          const ca_soir = p(dt.ca_soir);
          const ca_limonade = p(dt.ca_limonade);
          const cvts_midi = p(dt.cvts_midi);
          const cvts_soir = p(dt.cvts_soir);
          const cvts_limonade = p(dt.cvts_limonade);

          const ca_mois = ca_vae + ca_midi + ca_soir + ca_limonade;

          let cumulCA = 0;
          let cumulCvtsLimo = 0;
          for (let j = 0; j <= i; j++) {
            const jdt = config2025.mensuel[j] || {};
            cumulCA += p(jdt.ca_vae) + p(jdt.ca_midi) + p(jdt.ca_soir) + p(jdt.ca_limonade);
            cumulCvtsLimo += p(jdt.cvts_limonade);
          }
          
          const cvts_moy_midi = cvts_midi > 0 ? ca_midi / cvts_midi : 0;
          const cvts_moy_soir = cvts_soir > 0 ? ca_soir / cvts_soir : 0;
          const cvts_mois = cvts_midi + cvts_soir;
          const cvts_moy_limonade = cvts_limonade > 0 ? ca_limonade / cvts_limonade : 0;

          return (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
              <td style={{ ...tdBase, position: 'sticky', left: 0, background: '#f1f5f9', fontWeight: 700, zIndex: 10 }}>{m}</td>
              <td style={{ ...tdBase }}><input style={inputStyle} value={dt.ca_vae || ''} onChange={e => handleMensuelChange(i, 'ca_vae', e.target.value)} /></td>
              <td style={{ ...tdBase }}><input style={inputStyle} value={dt.ca_midi || ''} onChange={e => handleMensuelChange(i, 'ca_midi', e.target.value)} /></td>
              <td style={{ ...tdBase }}><input style={inputStyle} value={dt.ca_soir || ''} onChange={e => handleMensuelChange(i, 'ca_soir', e.target.value)} /></td>
              <td style={{ ...tdBase }}><input style={inputStyle} value={dt.ca_limonade || ''} onChange={e => handleMensuelChange(i, 'ca_limonade', e.target.value)} /></td>
              <td style={{ ...tdBase, fontWeight: 700 }}>{fe(ca_mois)}</td>
              <td style={{ ...tdBase, fontWeight: 700, color: BLUE }}>{fe(cumulCA)}</td>
              
              <td style={{ ...tdBase }}><input style={inputStyle} value={dt.cvts_midi || ''} onChange={e => handleMensuelChange(i, 'cvts_midi', e.target.value)} /></td>
              <td style={{ ...tdBase }}>{fe(cvts_moy_midi)}</td>
              <td style={{ ...tdBase }}><input style={inputStyle} value={dt.cvts_soir || ''} onChange={e => handleMensuelChange(i, 'cvts_soir', e.target.value)} /></td>
              <td style={{ ...tdBase }}>{fe(cvts_moy_soir)}</td>
              <td style={{ ...tdBase, fontWeight: 700 }}>{cvts_mois}</td>
              
              <td style={{ ...tdBase }}><input style={inputStyle} value={dt.cvts_limonade || ''} onChange={e => handleMensuelChange(i, 'cvts_limonade', e.target.value)} /></td>
              <td style={{ ...tdBase }}>{fe(cvts_moy_limonade)}</td>
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
          const dt = config2025.hebdo[weekNum] || {};
          const ca_vae = p(dt.ca_vae);
          const ca_midi = p(dt.ca_midi);
          const ca_soir = p(dt.ca_soir);
          const ca_limonade = p(dt.ca_limonade);
          const cvts_midi = p(dt.cvts_midi);
          const cvts_soir = p(dt.cvts_soir);
          const cvts_limonade = p(dt.cvts_limonade);

          const ca_semaine = ca_vae + ca_midi + ca_soir + ca_limonade;

          let cumulCA = 0;
          let cumulCvtsResto = 0;
          let cumulCvtsLimo = 0;
          for (let j = 1; j <= weekNum; j++) {
            const jdt = config2025.hebdo[j] || {};
            cumulCA += p(jdt.ca_vae) + p(jdt.ca_midi) + p(jdt.ca_soir) + p(jdt.ca_limonade);
            cumulCvtsResto += p(jdt.cvts_midi) + p(jdt.cvts_soir);
            cumulCvtsLimo += p(jdt.cvts_limonade);
          }

          const cvts_moy_midi = cvts_midi > 0 ? ca_midi / cvts_midi : 0;
          const cvts_moy_soir = cvts_soir > 0 ? ca_soir / cvts_soir : 0;
          const cvts_semaine = cvts_midi + cvts_soir;
          const cvts_moy_semaine = cvts_semaine > 0 ? (ca_midi + ca_soir) / cvts_semaine : 0;
          const cvts_moy_limonade = cvts_limonade > 0 ? ca_limonade / cvts_limonade : 0;

          return (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
              <td style={{ ...tdBase, position: 'sticky', left: 0, background: '#f1f5f9', fontWeight: 700, zIndex: 10 }}>{w}</td>
              <td style={{ ...tdBase }}><input style={inputStyle} value={dt.ca_vae || ''} onChange={e => handleHebdoChange(weekNum, 'ca_vae', e.target.value)} /></td>
              <td style={{ ...tdBase }}><input style={inputStyle} value={dt.ca_midi || ''} onChange={e => handleHebdoChange(weekNum, 'ca_midi', e.target.value)} /></td>
              <td style={{ ...tdBase }}><input style={inputStyle} value={dt.ca_soir || ''} onChange={e => handleHebdoChange(weekNum, 'ca_soir', e.target.value)} /></td>
              <td style={{ ...tdBase }}><input style={inputStyle} value={dt.ca_limonade || ''} onChange={e => handleHebdoChange(weekNum, 'ca_limonade', e.target.value)} /></td>
              <td style={{ ...tdBase, fontWeight: 700 }}>{fe(ca_semaine)}</td>
              <td style={{ ...tdBase, fontWeight: 700, color: BLUE }}>{fe(cumulCA)}</td>
              
              <td style={{ ...tdBase }}><input style={inputStyle} value={dt.cvts_midi || ''} onChange={e => handleHebdoChange(weekNum, 'cvts_midi', e.target.value)} /></td>
              <td style={{ ...tdBase }}>{fe(cvts_moy_midi)}</td>
              <td style={{ ...tdBase }}><input style={inputStyle} value={dt.cvts_soir || ''} onChange={e => handleHebdoChange(weekNum, 'cvts_soir', e.target.value)} /></td>
              <td style={{ ...tdBase }}>{fe(cvts_moy_soir)}</td>
              
              <td style={{ ...tdBase, fontWeight: 700 }}>{cvts_semaine}</td>
              <td style={{ ...tdBase }}>{fe(cvts_moy_semaine)}</td>
              <td style={{ ...tdBase, fontWeight: 700, color: '#7e22ce' }}>{cumulCvtsResto}</td>
              
              <td style={{ ...tdBase }}><input style={inputStyle} value={dt.cvts_limonade || ''} onChange={e => handleHebdoChange(weekNum, 'cvts_limonade', e.target.value)} /></td>
              <td style={{ ...tdBase }}>{fe(cvts_moy_limonade)}</td>
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
          const dt = config2025.hebdo[weekNum] || {};
          
          const heures_travaillees = p(dt.heures_travaillees);
          const cout_global = p(dt.cout_global);
          
          const ca_semaine = p(dt.ca_vae) + p(dt.ca_midi) + p(dt.ca_soir) + p(dt.ca_limonade);

          let cumulCA = 0;
          let cumulCoutGlobal = 0;
          for (let j = 1; j <= weekNum; j++) {
            const jdt = config2025.hebdo[j] || {};
            cumulCA += p(jdt.ca_vae) + p(jdt.ca_midi) + p(jdt.ca_soir) + p(jdt.ca_limonade);
            cumulCoutGlobal += p(jdt.cout_global);
          }
          
          const productivite = heures_travaillees > 0 ? ca_semaine / heures_travaillees : 0;
          const frais_personnel_reel = ca_semaine > 0 ? (cout_global / ca_semaine) * 100 : 0;
          const ratio_annuel = cumulCA > 0 ? (cumulCoutGlobal / cumulCA) * 100 : 0;

          return (
            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
              <td style={{ ...tdBase, position: 'sticky', left: 0, background: '#f1f5f9', fontWeight: 700, zIndex: 10 }}>{w}</td>
              <td style={{ ...tdBase }}><input style={inputStyle} value={dt.heures_travaillees || ''} onChange={e => handleHebdoChange(weekNum, 'heures_travaillees', e.target.value)} /></td>
              <td style={{ ...tdBase }}><input style={inputStyle} value={dt.cadre_cuisine || ''} onChange={e => handleHebdoChange(weekNum, 'cadre_cuisine', e.target.value)} /></td>
              <td style={{ ...tdBase }}><input style={inputStyle} value={dt.cadre_salle || ''} onChange={e => handleHebdoChange(weekNum, 'cadre_salle', e.target.value)} /></td>
              <td style={{ ...tdBase }}><input style={inputStyle} value={dt.maitrise_cuisine || ''} onChange={e => handleHebdoChange(weekNum, 'maitrise_cuisine', e.target.value)} /></td>
              <td style={{ ...tdBase }}><input style={inputStyle} value={dt.maitrise_salle || ''} onChange={e => handleHebdoChange(weekNum, 'maitrise_salle', e.target.value)} /></td>
              <td style={{ ...tdBase }}><input style={inputStyle} value={dt.niv12_cuisine || ''} onChange={e => handleHebdoChange(weekNum, 'niv12_cuisine', e.target.value)} /></td>
              <td style={{ ...tdBase }}><input style={inputStyle} value={dt.niv12_salle || ''} onChange={e => handleHebdoChange(weekNum, 'niv12_salle', e.target.value)} /></td>
              <td style={{ ...tdBase }}><input style={inputStyle} value={dt.niv3_cuisine || ''} onChange={e => handleHebdoChange(weekNum, 'niv3_cuisine', e.target.value)} /></td>
              <td style={{ ...tdBase }}><input style={inputStyle} value={dt.niv3_salle || ''} onChange={e => handleHebdoChange(weekNum, 'niv3_salle', e.target.value)} /></td>
              <td style={{ ...tdBase }}><input style={inputStyle} value={dt.apprenti_cuisine || ''} onChange={e => handleHebdoChange(weekNum, 'apprenti_cuisine', e.target.value)} /></td>
              <td style={{ ...tdBase }}><input style={inputStyle} value={dt.apprenti_salle || ''} onChange={e => handleHebdoChange(weekNum, 'apprenti_salle', e.target.value)} /></td>
              
              <td style={{ ...tdBase }}><input style={inputStyle} value={dt.cout_global || ''} onChange={e => handleHebdoChange(weekNum, 'cout_global', e.target.value)} /></td>
              <td style={{ ...tdBase }}>{productivite.toFixed(2)}</td>
              <td style={{ ...tdBase }}>{fp(frais_personnel_reel)}</td>
              <td style={{ ...tdBase, fontWeight: 700 }}>{fp(frais_personnel_reel)}</td>
              <td style={{ ...tdBase, fontWeight: 700, color: '#c2410c' }}>{fp(ratio_annuel)}</td>
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
            📄 Configuration chiffres · {YEAR}
          </div>
          <div style={{ background: '#f59e0b18', border: '1px solid #f59e0b30', borderRadius: 6, padding: '4px 14px', color: AMBER, fontSize: 11, fontWeight: 700, letterSpacing: '.04em' }}>
            BURO MONTE
          </div>
        </header>
      )}

      <div style={{ padding: '16px 28px', display: 'flex', gap: 10, background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <button
          onClick={() => setActiveTab('mensuel')}
          style={{
            padding: '8px 16px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            background: activeTab === 'mensuel' ? BLUE : '#f1f5f9',
            color: activeTab === 'mensuel' ? '#fff' : '#64748b',
            border: 'none', transition: 'all .2s'
          }}
        >
          SUIVI DE GESTION ET BUDGET (Mensuel)
        </button>
        <button
          onClick={() => setActiveTab('hebdo_ca')}
          style={{
            padding: '8px 16px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            background: activeTab === 'hebdo_ca' ? BLUE : '#f1f5f9',
            color: activeTab === 'hebdo_ca' ? '#fff' : '#64748b',
            border: 'none', transition: 'all .2s'
          }}
        >
          SEMAINES 2025 (CA & Couverts)
        </button>
        <button
          onClick={() => setActiveTab('hebdo_rh')}
          style={{
            padding: '8px 16px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            background: activeTab === 'hebdo_rh' ? BLUE : '#f1f5f9',
            color: activeTab === 'hebdo_rh' ? '#fff' : '#64748b',
            border: 'none', transition: 'all .2s'
          }}
        >
          FRAIS DE PERSONNEL REALISES (Hebdo)
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {activeTab === 'mensuel' && renderMensuel()}
        {activeTab === 'hebdo_ca' && renderHebdoCA()}
        {activeTab === 'hebdo_rh' && renderHebdoRH()}
      </div>
    </div>
  );
}
