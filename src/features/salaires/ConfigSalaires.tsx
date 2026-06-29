import React, { useState } from 'react';

import { useData } from '@/contexts/DataContext';
import type { MonthDataSalariesConfig, SalarieRow } from '@/contexts/DataContext';
import { createEmptyPayrollCategories, PERSONNEL_CATEGORIES } from '@/features/dashboard/importHelpers/personnelSalaryImport';
import { parseHourInputToDecimal } from '@/lib/utils';
import { parseMoneyValue } from '@/lib/money';
import { MONTH_NAMES } from '@/lib/constants';

const NAV = '#1e293b';

type SalarieField = keyof SalarieRow;
type SalaryCategory = (typeof PERSONNEL_CATEGORIES)[number];
type SalariesCategories = Record<SalaryCategory, SalarieRow[]>;
type SalarieRowWithCalculations = SalarieRow & {
  provisionVal: number;
  coutHoraireVal: number;
};

interface ConfigSalairesProps {
  onBack: () => void;
}

export default function ConfigSalaires({ onBack }: ConfigSalairesProps) {
  const { selectedYear: YEAR, data, updateSalariesConfig } = useData();
  const MONTHS = MONTH_NAMES.map(m => `${m} ${YEAR}`);
  
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(0);
  const selectedMonth = MONTHS[selectedMonthIndex];
  
  const emptySalarieRow = (): SalarieRow => ({ nom: '', heures: '', coutGlobal: '', provision: '', coutHoraire: '' });
  const emptyCategories = (): SalariesCategories => createEmptyPayrollCategories();

  const getCurrentConfig = (monthIdx: number): MonthDataSalariesConfig => {
    return data[monthIdx]?.salariesConfig || { locked: false, categories: emptyCategories() };
  };

  const getSalariesForMonth = (monthIdx: number): SalariesCategories => {
    const categories = getCurrentConfig(monthIdx).categories || emptyCategories();
    const defaults = emptyCategories();
    return {
      cadre: categories.cadre?.length ? categories.cadre : defaults.cadre,
      maitrise: categories.maitrise?.length ? categories.maitrise : defaults.maitrise,
      niv12: categories.niv12?.length ? categories.niv12 : defaults.niv12,
      niv3: categories.niv3?.length ? categories.niv3 : defaults.niv3,
      apprenti: categories.apprenti?.length ? categories.apprenti : defaults.apprenti,
    };
  };

  const isMonthLocked = (monthIdx: number) => {
    return data[monthIdx]?.salariesConfig?.locked || false;
  };

  const handleSalarieChange = (category: SalaryCategory, index: number, field: SalarieField, value: string) => {
    const currentConfig = getCurrentConfig(selectedMonthIndex);
    const monthData = getSalariesForMonth(selectedMonthIndex);
    const newCat = [...monthData[category]];
    newCat[index] = { ...(newCat[index] || emptySalarieRow()), [field]: value };
    
    updateSalariesConfig(selectedMonthIndex, {
      ...currentConfig,
      categories: { ...monthData, [category]: newCat }
    });
  };

  const addRow = (category: SalaryCategory) => {
    const currentConfig = getCurrentConfig(selectedMonthIndex);
    const monthData = getSalariesForMonth(selectedMonthIndex);
    
    updateSalariesConfig(selectedMonthIndex, {
      ...currentConfig,
      categories: {
        ...monthData,
        [category]: [...monthData[category], emptySalarieRow()]
      }
    });
  };

  const removeRow = (category: SalaryCategory, index: number) => {
    const currentConfig = getCurrentConfig(selectedMonthIndex);
    const monthData = getSalariesForMonth(selectedMonthIndex);
    const nextRows = monthData[category].filter((_, rowIndex) => rowIndex !== index);
    
    updateSalariesConfig(selectedMonthIndex, {
      ...currentConfig,
      categories: {
        ...monthData,
        [category]: nextRows.length > 0 ? nextRows : [emptySalarieRow()]
      }
    });
  };

  const handleRAZ = () => {
    if (isMonthLocked(selectedMonthIndex)) return;
    const currentConfig = getCurrentConfig(selectedMonthIndex);
    
    updateSalariesConfig(selectedMonthIndex, {
      ...currentConfig,
      categories: emptyCategories()
    });
  };

  const toggleLock = (monthIdx: number) => {
    const currentConfig = getCurrentConfig(monthIdx);
    updateSalariesConfig(monthIdx, {
      ...currentConfig,
      locked: !currentConfig.locked
    });
  };

const formatCurrency = (v: number) => v === 0 ? '-' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v);
  const formatDepartment = (value?: string) => value === 'cuisine' ? 'Cuisine' : value === 'salle' ? 'Salle' : '-';
  const getPayrollProvisionMultiplier = (category: SalaryCategory) => category === 'cadre' ? 1.18 : 1.10;

  const getAverageForCategory = (monthIdx: number, category: SalaryCategory) => {
    const rows = getSalariesForMonth(monthIdx)[category];
    let totalCoutHoraire = 0;
    let validRowsCount = 0;

    rows.forEach(row => {
      const coutGlobal = parseMoneyValue(row.coutGlobal);
      const heures = parseHourInputToDecimal(row.heures);
      const provision = coutGlobal * getPayrollProvisionMultiplier(category);
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

  const CATEGORIES_LIST: Array<{ id: SalaryCategory; label: string }> = [
    { id: 'cadre', label: 'CADRE' },
    { id: 'maitrise', label: 'MAITRISE' },
    { id: 'niv12', label: 'NIV I ET II' },
    { id: 'niv3', label: 'NIV III' },
    { id: 'apprenti', label: 'APPRENTI' },
  ];

  const getTauxCible = (monthIdx: number, cat: SalaryCategory): string => {
    const val = data[monthIdx]?.salariesConfig?.tauxCibles?.[cat];
    return val && val > 0 ? String(val).replace('.', ',') : '';
  };

  const setTauxCible = (mi: number, cat: SalaryCategory, raw: string) => {
    // Accepte virgule ou point comme séparateur décimal
    const val = parseFloat(raw.replace(',', '.')) || 0;
    const currentConfig = getCurrentConfig(mi);
    const tauxCibles = { ...(currentConfig.tauxCibles ?? {}), [cat]: val };
    updateSalariesConfig(mi, { ...currentConfig, tauxCibles });
  };

  const propagateTauxCibles = () => {
    const ref = getCurrentConfig(selectedMonthIndex).tauxCibles ?? {};
    for (let mi = 0; mi <= 11; mi++) {
      if (mi === selectedMonthIndex) continue;
      const cfg = getCurrentConfig(mi);
      updateSalariesConfig(mi, { ...cfg, tauxCibles: { ...ref } });
    }
  };

  // Valeur à afficher dans le tableau : manuelle si saisie, sinon calculée depuis bulletins
  const getDisplayTaux = (mi: number, cat: SalaryCategory): number => {
    const manual = data[mi]?.salariesConfig?.tauxCibles?.[cat];
    if (manual && manual > 0) return manual;
    return getAverageForCategory(mi, cat);
  };

  const renderTauxHorairesTable = () => {
    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', padding: '12px 24px', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,.04)', border: '1px solid #e2e8f0' }}>
            <label htmlFor="config-salaires-month" style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>Mois en cours :</label>
            <select
              id="config-salaires-month"
              value={selectedMonthIndex}
              onChange={e => setSelectedMonthIndex(parseInt(e.target.value))}
              style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: 15, fontWeight: 700, color: NAV, outline: 'none', cursor: 'pointer', boxShadow: 'inset 0 1px 2px rgba(0,0,0,.05)' }}
            >
              {MONTHS.map((m, idx) => (
                <option key={m} value={idx}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)', marginBottom: 32 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: NAV, textTransform: 'uppercase', letterSpacing: '.03em' }}>
                Configuration Taux Horaires
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
                Saisir manuellement le taux €/h par niveau et par mois (virgule ou point acceptés). Si vide, le taux calculé depuis les bulletins est utilisé.
              </p>
            </div>
            <button
              onClick={propagateTauxCibles}
              style={{ background: '#f59e0b', color: '#1c1917', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 11, fontWeight: 800, cursor: 'pointer', letterSpacing: '.02em', whiteSpace: 'nowrap' }}
            >
              Appliquer à tous les mois →
            </button>
          </div>
          <div style={{ overflowX: 'auto', padding: '20px' }}>
            <table style={{ borderCollapse: 'collapse', margin: '0 auto', width: '100%', maxWidth: '1000px' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, background: 'transparent', border: 'none' }}></th>
                  {CATEGORIES_LIST.map(cat => (
                    <th key={cat.id} style={{ ...thStyle, background: '#fce4d6', color: '#9a3412' }}>{cat.label}</th>
                  ))}
                  <th style={{ ...thStyle, background: '#f8fafc', width: 100 }}>VERROUILLER</th>
                </tr>
              </thead>
              <tbody>
                {MONTHS.map((month, i) => (
                  <tr key={month}>
                    <td style={{ ...tdStyle, background: i % 2 === 0 ? '#fff' : '#f1f5f9', fontWeight: 700, textAlign: 'center', color: '#64748b' }}>
                      {month}
                    </td>
                    {CATEGORIES_LIST.map(cat => {
                      const rawVal = getTauxCible(i, cat.id);
                      const hasManual = rawVal !== '';
                      const calculated = getAverageForCategory(i, cat.id);
                      return (
                        <td key={cat.id} style={{ ...tdStyle, padding: '4px 6px', background: hasManual ? '#fefce8' : '#fffef0' }}>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={rawVal}
                            onChange={e => setTauxCible(i, cat.id, e.target.value)}
                            placeholder={calculated > 0 ? calculated.toFixed(2).replace('.', ',') : '—'}
                            style={{
                              ...inputStyle,
                              border: hasManual ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                              borderRadius: 6,
                              padding: '5px 8px',
                              background: 'transparent',
                              color: hasManual ? '#92400e' : '#94a3b8',
                              fontWeight: hasManual ? 700 : 400,
                            }}
                          />
                          {!hasManual && calculated > 0 && (
                            <div style={{ fontSize: 9, color: '#94a3b8', textAlign: 'center', marginTop: 2 }}>
                              calc. : {calculated.toFixed(2).replace('.', ',')} €
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td style={{ ...tdStyle, background: i % 2 === 0 ? '#fff' : '#f1f5f9' }}>
                      <input
                        type="checkbox"
                        checked={isMonthLocked(i)}
                        onChange={() => toggleLock(i)}
                        style={{ cursor: 'pointer', width: 16, height: 16, accentColor: '#ef4444' }}
                      />
                    </td>
                  </tr>
                ))}
                <tr>
                  <td style={{ ...tdStyle, background: '#fef08a', fontWeight: 800, color: '#854d0e' }}>MOYENNE</td>
                  {CATEGORIES_LIST.map(cat => {
                    let total = 0;
                    let count = 0;
                    MONTHS.forEach((_, idx) => {
                      const v = getDisplayTaux(idx, cat.id);
                      if (v > 0) { total += v; count++; }
                    });
                    const avg = count > 0 ? total / count : 0;
                    return (
                      <td key={cat.id} style={{ ...tdStyle, background: '#fef08a', fontWeight: 800 }}>
                        {avg > 0 ? formatCurrency(avg) : '-'}
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

  const renderSalarieSection = (title: string, category: SalaryCategory, avgTitle: string, rows: SalarieRow[]) => {
    let totalCoutHoraire = 0;
    let validRowsCount = 0;

    const rowsWithCalculations: SalarieRowWithCalculations[] = rows.map(row => {
      const coutGlobal = parseMoneyValue(row.coutGlobal);
      const heures = parseHourInputToDecimal(row.heures);
      
      const provision = coutGlobal * getPayrollProvisionMultiplier(category);
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
    const averageRowSpan = Math.max(1, rowsWithCalculations.length + rowsWithCalculations.filter(row => row.importSourceLine).length);
    const isLocked = isMonthLocked(selectedMonthIndex);

    return (
      <div style={{ marginTop: 24, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: '#ef4444', margin: 0, textTransform: 'uppercase', fontSize: 13, fontWeight: 800, letterSpacing: '.04em' }}>
            {title}
          </h3>
          <button disabled={isLocked} onClick={() => addRow(category)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: isLocked ? '#9ca3af' : '#10b981', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: isLocked ? 'not-allowed' : 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,.1)' }}>
            <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> Créer
          </button>
        </div>
        <div style={{ overflowX: 'auto', padding: '20px' }}>
          <table style={{ borderCollapse: 'collapse', margin: '0 auto', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '20%' }}>NOM DU SALARIE</th>
                <th style={{ ...thStyle, width: '9%' }}>Section</th>
                <th style={{ ...thStyle, width: '14%' }}>Nombre d'heure mensuel</th>
                <th style={{ ...thStyle, width: '14%' }}>Coût global</th>
                <th style={{ ...thStyle, width: '14%' }}>Total avec Provision CP</th>
                <th style={{ ...thStyle, width: '14%' }}>COUT HORAIRE</th>
                <th style={{ ...thStyle, width: '12%' }}>{avgTitle}</th>
                <th style={{ ...thStyle, width: '9%' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rowsWithCalculations.map((row, i) => (
                <React.Fragment key={`${category}-${i}-${row.nom || 'ligne'}`}>
                <tr>
                  <td style={{ ...tdStyle, background: isLocked ? '#f1f5f9' : '#dbeafe' }}>
                    <input disabled={isLocked} style={{ ...inputStyle, textAlign: 'left', cursor: isLocked ? 'not-allowed' : 'text' }} value={row.nom} onChange={e => handleSalarieChange(category, i, 'nom', e.target.value)} placeholder="Nom..." />
                  </td>
                  <td style={{ ...tdStyle, background: '#fff', fontWeight: 800, color: '#475569' }}>
                    {formatDepartment(row.department)}
                  </td>
                  <td style={{ ...tdStyle, background: '#f1f5f9' }}>
                    <input disabled={isLocked} style={{ ...inputStyle, cursor: isLocked ? 'not-allowed' : 'text' }} value={row.heures} onChange={e => handleSalarieChange(category, i, 'heures', e.target.value)} placeholder="7h30" title="Formats acceptes : 7h30, 7:30, 7.30, 7,30" />
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
                    <td rowSpan={averageRowSpan} style={{ ...tdStyle, background: '#fff', verticalAlign: 'middle', fontWeight: 800, fontSize: 13, color: NAV }}>
                      {moyenneCoutHoraire > 0 ? formatCurrency(moyenneCoutHoraire) : '-'}
                    </td>
                  )}
                  <td style={{ ...tdStyle, background: '#fff' }}>
                    <button
                      disabled={isLocked}
                      onClick={() => removeRow(category, i)}
                      style={{
                        background: isLocked ? '#cbd5e1' : '#fee2e2',
                        color: isLocked ? '#64748b' : '#b91c1c',
                        border: '1px solid #fecaca',
                        borderRadius: 6,
                        padding: '5px 8px',
                        fontSize: 10,
                        fontWeight: 800,
                        cursor: isLocked ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
                {row.importSourceLine && (
                  <tr>
                    <td colSpan={6} style={{ ...tdStyle, background: '#f8fafc', textAlign: 'left', color: '#64748b', fontSize: 10, fontWeight: 700 }}>
                      Ligne PDF lue : {row.importSourceLine}
                    </td>
                    <td style={{ ...tdStyle, background: '#f8fafc' }}></td>
                  </tr>
                )}
                </React.Fragment>
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
            disabled={isMonthLocked(selectedMonthIndex)}
            onClick={handleRAZ}
            style={{
              background: isMonthLocked(selectedMonthIndex) ? '#9ca3af' : '#ef4444', color: '#fff', border: 'none', borderRadius: 8,
              padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: isMonthLocked(selectedMonthIndex) ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,.1)', display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            <span style={{ fontSize: 16 }}>RAZ</span> Remise a zero
          </button>
        </div>

        {isMonthLocked(selectedMonthIndex) && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '12px 16px', borderRadius: 8, marginBottom: 24, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🔒</span> Ce mois est verrouillé. Les données ne peuvent pas être modifiées.
          </div>
        )}

        {renderSalarieSection("CADRE AU FORFAIT & CADRE A L'HEURE", 'cadre', 'COÛT MOYEN CADRE', getSalariesForMonth(selectedMonthIndex).cadre)}
        {renderSalarieSection("AGENTS DE MAITRISE", 'maitrise', 'MOYEN AGENT DE MAITRISE', getSalariesForMonth(selectedMonthIndex).maitrise)}
        {renderSalarieSection("NIV I ET NIV II", 'niv12', 'COÛT MOYEN NIV 1 ET 2', getSalariesForMonth(selectedMonthIndex).niv12)}
        {renderSalarieSection("NIV III", 'niv3', 'COÛT MOYEN NIV III', getSalariesForMonth(selectedMonthIndex).niv3)}
        {renderSalarieSection("APPRENTIS", 'apprenti', 'COÛT MOYEN APPRENTIS', getSalariesForMonth(selectedMonthIndex).apprenti)}

        <div style={{ height: '100px' }}></div>
      </div>
    </div>
  );
}
