import React, { useState } from 'react';
import { useData } from './DataContext';

const NAV = '#1e293b';

interface ConfigSalairesProps {
  onBack: () => void;
}

export default function ConfigSalaires({ onBack }: ConfigSalairesProps) {
  const { selectedYear: YEAR } = useData();
  const MONTHS = [
    `Janvier ${YEAR}`, `Février ${YEAR}`, `Mars ${YEAR}`, `Avril ${YEAR}`, `Mai ${YEAR}`, `Juin ${YEAR}`,
    `Juillet ${YEAR}`, `Août ${YEAR}`, `Septembre ${YEAR}`, `Octobre ${YEAR}`, `Novembre ${YEAR}`, `Décembre ${YEAR}`
  ];
  
  const [selectedMonth, setSelectedMonth] = useState<string>(MONTHS[0]);
  const [lockedMonths, setLockedMonths] = useState<Record<string, boolean>>({});
  const [frozenAverages, setFrozenAverages] = useState<Record<string, Record<string, number>>>({});
  
  // Initialisation à 1 ligne max par défaut pour chaque mois
  const defaultCategories = {
    cadre: [{ nom: '', heures: '', coutGlobal: '', provision: '', coutHoraire: '' }],
    maitrise: [{ nom: '', heures: '', coutGlobal: '', provision: '', coutHoraire: '' }],
    niv12: [{ nom: '', heures: '', coutGlobal: '', provision: '', coutHoraire: '' }],
    niv3: [{ nom: '', heures: '', coutGlobal: '', provision: '', coutHoraire: '' }],
    apprenti: [{ nom: '', heures: '', coutGlobal: '', provision: '', coutHoraire: '' }],
  };

  const [salariesByMonth, setSalariesByMonth] = useState<Record<string, Record<string, any[]>>>({
    [MONTHS[0]]: defaultCategories
  });

  const getSalariesForMonth = (month: string) => {
    return salariesByMonth[month] || defaultCategories;
  };

  const handleSalarieChange = (category: string, index: number, field: string, value: string) => {
    setSalariesByMonth(prev => {
      const monthData = prev[selectedMonth] || defaultCategories;
      const newCat = [...monthData[category]];
      newCat[index] = { ...newCat[index], [field]: value };
      return { ...prev, [selectedMonth]: { ...monthData, [category]: newCat } };
    });
  };

  const addRow = (category: string) => {
    setSalariesByMonth(prev => {
      const monthData = prev[selectedMonth] || defaultCategories;
      return {
        ...prev,
        [selectedMonth]: {
          ...monthData,
          [category]: [...monthData[category], { nom: '', heures: '', coutGlobal: '', provision: '', coutHoraire: '' }]
        }
      };
    });
  };

  const removeRow = (category: string) => {
    setSalariesByMonth(prev => {
      const monthData = prev[selectedMonth] || defaultCategories;
      if (monthData[category].length <= 1) return prev; // Garder au moins 1 ligne
      return {
        ...prev,
        [selectedMonth]: {
          ...monthData,
          [category]: monthData[category].slice(0, -1)
        }
      };
    });
  };

  const handleRAZ = () => {
    setSalariesByMonth(prev => {
      const monthData = prev[selectedMonth] || defaultCategories;
      const newMonthData: Record<string, any[]> = {};
      
      Object.keys(monthData).forEach(cat => {
        newMonthData[cat] = monthData[cat].map((row: any) => ({
          ...row,
          heures: '',
          coutGlobal: ''
        }));
      });
      
      return {
        ...prev,
        [selectedMonth]: newMonthData
      };
    });
  };

  const toggleLock = (month: string) => {
    setLockedMonths(prev => {
      const isNowLocked = !prev[month];
      if (isNowLocked) {
        // Freeze current averages
        const currentAvgs: Record<string, number> = {};
        ['cadre', 'maitrise', 'niv12', 'niv3', 'apprenti'].forEach(cat => {
          currentAvgs[cat] = getAverageForCategory(month, cat);
        });
        setFrozenAverages(fa => ({ ...fa, [month]: currentAvgs }));
      }
      return { ...prev, [month]: isNowLocked };
    });
  };

  const parseNum = (v: string | number) => {
    if (typeof v === 'number') return v;
    return parseFloat((v || '0').replace(',', '.')) || 0;
  };

  const formatCurrency = (v: number) => v === 0 ? '-' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v);

  const getAverageForCategory = (month: string, category: string) => {
    const rows = getSalariesForMonth(month)[category];
    let totalCoutHoraire = 0;
    let validRowsCount = 0;

    rows.forEach((row: any) => {
      const coutGlobal = parseNum(row.coutGlobal);
      const heures = parseNum(row.heures);
      const provision = coutGlobal * 1.10;
      const coutHoraire = heures > 0 ? provision / heures : 0;

      if (coutHoraire > 0) {
        totalCoutHoraire += coutHoraire;
        validRowsCount += 1;
      }
    });

    return validRowsCount > 0 ? totalCoutHoraire / validRowsCount : 0;
  };

  const thStyle: React.CSSProperties = {
    border: '1px solid #cbd5e1',
    padding: '10px 8px',
    textAlign: 'center',
    fontWeight: 700,
    fontSize: 10,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '.04em',
    background: '#f8fafc',
  };

  const tdStyle: React.CSSProperties = {
    border: '1px solid #cbd5e1',
    padding: '6px 8px',
    textAlign: 'center',
    fontSize: 11,
    color: '#1e293b',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: 'none',
    background: 'transparent',
    textAlign: 'center',
    outline: 'none',
    fontSize: 11,
    fontWeight: 600,
    color: '#1e293b',
    fontFamily: 'inherit',
  };

  const renderTauxHorairesTable = () => {
    const categories = [
      { id: 'cadre', label: 'CADRE' },
      { id: 'maitrise', label: 'MAITRISE' },
      { id: 'niv12', label: 'NIV I ET II' },
      { id: 'niv3', label: 'NIV III' },
      { id: 'apprenti', label: 'APPRENTI' }
    ];
    
    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', padding: '12px 24px', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,.04)', border: '1px solid #e2e8f0' }}>
            <label style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>Mois en cours :</label>
            <select 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(e.target.value)}
              style={{ 
                padding: '8px 16px', 
                borderRadius: 8, 
                border: '1px solid #cbd5e1', 
                background: '#f8fafc',
                fontSize: 15,
                fontWeight: 700,
                color: NAV,
                outline: 'none',
                cursor: 'pointer',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,.05)'
              }}
            >
              {MONTHS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)', marginBottom: 32 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: NAV, textTransform: 'uppercase', letterSpacing: '.03em' }}>
              Configuration Taux Horaires
            </h2>
          </div>
          <div style={{ overflowX: 'auto', padding: '20px' }}>
            <table style={{ borderCollapse: 'collapse', margin: '0 auto', width: '100%', maxWidth: '1000px' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, background: 'transparent', border: 'none' }}></th>
                {categories.map(cat => (
                  <th key={cat.id} style={{ ...thStyle, background: '#fce4d6', color: '#9a3412' }}>{cat.label}</th>
                ))}
                <th style={{ ...thStyle, background: '#f8fafc', width: '100px' }}>VERROUILLER</th>
              </tr>
            </thead>
            <tbody>
              {MONTHS.map((month, i) => (
                <tr key={month}>
                  <td style={{ ...tdStyle, background: i % 2 === 0 ? '#fff' : '#f1f5f9', fontWeight: 700, textAlign: 'center', color: '#64748b' }}>
                    {month}
                  </td>
                  {categories.map(cat => {
                    const avg = lockedMonths[month] 
                      ? (frozenAverages[month]?.[cat.id] || 0)
                      : getAverageForCategory(month, cat.id);
                    return (
                      <td key={cat.id} style={{ ...tdStyle, background: '#fffef0', fontWeight: 600, color: '#475569' }}>
                        {avg > 0 ? formatCurrency(avg) : '-'}
                      </td>
                    );
                  })}
                  <td style={{ ...tdStyle, background: i % 2 === 0 ? '#fff' : '#f1f5f9' }}>
                    <input 
                      type="checkbox" 
                      checked={!!lockedMonths[month]} 
                      onChange={() => toggleLock(month)}
                      style={{ cursor: 'pointer', width: 16, height: 16, accentColor: '#ef4444' }}
                    />
                  </td>
                </tr>
              ))}
              <tr>
                <td style={{ ...tdStyle, background: '#fef08a', fontWeight: 800, color: '#854d0e' }}>MOYENNE</td>
                {categories.map(cat => {
                  let total = 0;
                  let count = 0;
                  MONTHS.forEach(m => {
                    const avg = lockedMonths[m] 
                      ? (frozenAverages[m]?.[cat.id] || 0)
                      : getAverageForCategory(m, cat.id);
                    if (avg > 0) {
                      total += avg;
                      count += 1;
                    }
                  });
                  const overallAvg = count > 0 ? total / count : 0;
                  return (
                    <td key={cat.id} style={{ ...tdStyle, background: '#fef08a', fontWeight: 800 }}>
                      {overallAvg > 0 ? formatCurrency(overallAvg) : '-'}
                    </td>
                  );
                })}
                <td style={{ ...tdStyle, background: '#fef08a' }}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      </>
    );
  };

  const renderSalarieSection = (title: string, category: string, avgTitle: string, rows: any[]) => {
    let totalCoutHoraire = 0;
    let validRowsCount = 0;

    const rowsWithCalculations = rows.map(row => {
      const coutGlobal = parseNum(row.coutGlobal);
      const heures = parseNum(row.heures);
      
      const provision = coutGlobal * 1.10;
      const coutHoraire = heures > 0 ? provision / heures : 0;

      if (coutHoraire > 0) {
        totalCoutHoraire += coutHoraire;
        validRowsCount += 1;
      }

      return {
        ...row,
        provisionVal: provision,
        coutHoraireVal: coutHoraire
      };
    });

    const moyenneCoutHoraire = validRowsCount > 0 ? totalCoutHoraire / validRowsCount : 0;
    const isLocked = lockedMonths[selectedMonth];

    return (
      <div style={{ marginTop: 24, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: '#ef4444', margin: 0, textTransform: 'uppercase', fontSize: 13, fontWeight: 800, letterSpacing: '.04em' }}>
            {title}
          </h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button disabled={isLocked} onClick={() => addRow(category)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: isLocked ? '#9ca3af' : '#10b981', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: isLocked ? 'not-allowed' : 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,.1)' }}>
              <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> Créer
            </button>
            <button disabled={isLocked} onClick={() => removeRow(category)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: isLocked ? '#9ca3af' : '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: isLocked ? 'not-allowed' : 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,.1)' }}>
              <span style={{ fontSize: 14, lineHeight: 1 }}>−</span> Supprimer
            </button>
          </div>
        </div>
        <div style={{ overflowX: 'auto', padding: '20px' }}>
          <table style={{ borderCollapse: 'collapse', margin: '0 auto', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '25%' }}>NOM DU SALARIE</th>
                <th style={{ ...thStyle, width: '15%' }}>Nombre d'heure mensuel</th>
                <th style={{ ...thStyle, width: '15%' }}>Coût global</th>
                <th style={{ ...thStyle, width: '15%' }}>Total avec Provision CP</th>
                <th style={{ ...thStyle, width: '15%' }}>COUT HORAIRE</th>
                <th style={{ ...thStyle, width: '15%' }}>{avgTitle}</th>
              </tr>
            </thead>
            <tbody>
              {rowsWithCalculations.map((row, i) => (
                <tr key={i}>
                  <td style={{ ...tdStyle, background: isLocked ? '#f1f5f9' : '#dbeafe' }}>
                    <input disabled={isLocked} style={{ ...inputStyle, textAlign: 'left', cursor: isLocked ? 'not-allowed' : 'text' }} value={row.nom} onChange={e => handleSalarieChange(category, i, 'nom', e.target.value)} placeholder="Nom..." />
                  </td>
                  <td style={{ ...tdStyle, background: '#f1f5f9' }}>
                    <input disabled={isLocked} style={{ ...inputStyle, cursor: isLocked ? 'not-allowed' : 'text' }} value={row.heures} onChange={e => handleSalarieChange(category, i, 'heures', e.target.value)} />
                  </td>
                  <td style={{ ...tdStyle, background: isLocked ? '#f1f5f9' : '#dbeafe' }}>
                    <input disabled={isLocked} style={{ ...inputStyle, cursor: isLocked ? 'not-allowed' : 'text' }} value={row.coutGlobal} onChange={e => handleSalarieChange(category, i, 'coutGlobal', e.target.value)} />
                  </td>
                  <td style={{ ...tdStyle, background: '#fff', fontWeight: 600, color: '#475569' }}>
                    {row.provisionVal > 0 ? formatCurrency(row.provisionVal) : '-'}
                  </td>
                  <td style={{ ...tdStyle, background: '#fff', fontWeight: 600, color: '#475569' }}>
                    {row.coutHoraireVal > 0 ? formatCurrency(row.coutHoraireVal) : '-'}
                  </td>
                  {i === 0 && (
                    <td rowSpan={rowsWithCalculations.length} style={{ ...tdStyle, background: '#fff', verticalAlign: 'middle', fontWeight: 800, fontSize: 13, color: NAV }}>
                      {moyenneCoutHoraire > 0 ? formatCurrency(moyenneCoutHoraire) : '-'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: 24, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        
        {/* Header Pro */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <button onClick={onBack} style={{
            display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e2e8f0',
            padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            color: '#64748b', boxShadow: '0 1px 2px rgba(0,0,0,.05)'
          }}>
            <span style={{ fontSize: 16 }}>←</span> Retour
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: 500 }}>Gestion Opérationnelle</div>
            <div style={{ color: NAV, fontSize: 15, fontWeight: 800, letterSpacing: '.02em', marginTop: 2 }}>Configuration Salaires et Charges · {YEAR}</div>
          </div>
          <div style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6,
            padding: '6px 12px', color: '#475569', fontSize: 11, fontWeight: 600, letterSpacing: '.04em',
            boxShadow: '0 1px 2px rgba(0,0,0,.05)'
          }}>
            Buro Monte
          </div>
        </header>

        {renderTauxHorairesTable()}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 48, marginBottom: 24, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 4, height: 24, background: '#ef4444', borderRadius: 2 }} />
            <h2 style={{ fontSize: 18, fontWeight: 800, color: NAV, margin: 0, letterSpacing: '.02em' }}>Calcul Coût Salarial</h2>
          </div>
          <button 
            onClick={handleRAZ}
            style={{ 
              background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, 
              padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', 
              boxShadow: '0 1px 2px rgba(0,0,0,.1)', display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <span style={{ fontSize: 16 }}>↺</span> RAZ (Remise à zéro)
          </button>
        </div>

        {lockedMonths[selectedMonth] && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 16px', borderRadius: 8, marginBottom: 24, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🔒</span> Ce mois est verrouillé. Les données ne peuvent pas être modifiées.
          </div>
        )}

        {renderSalarieSection("CADRE AU FORFAIT & CADRE A L'HEURE", 'cadre', 'COÛT MOYEN CADRE', getSalariesForMonth(selectedMonth).cadre)}
        {renderSalarieSection("AGENTS DE MAITRISE", 'maitrise', 'MOYEN AGENT DE MAITRISE', getSalariesForMonth(selectedMonth).maitrise)}
        {renderSalarieSection("NIV I ET NIV II", 'niv12', 'COÛT MOYEN NIV 1 ET 2', getSalariesForMonth(selectedMonth).niv12)}
        {renderSalarieSection("NIV III", 'niv3', 'COÛT MOYEN NIV III', getSalariesForMonth(selectedMonth).niv3)}
        {renderSalarieSection("APPRENTIS", 'apprenti', 'COÛT MOYEN APPRENTIS', getSalariesForMonth(selectedMonth).apprenti)}

        <div style={{ height: '100px' }}></div>
      </div>
    </div>
  );
}
