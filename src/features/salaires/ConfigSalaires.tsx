import React, { useCallback, useState } from 'react';

import { useData } from '@/contexts/DataContext';
import type { MonthDataSalariesConfig, SalarieRow } from '@/contexts/DataContext';
import { createEmptyPayrollCategories, getPayrollProvisionMultiplier, PERSONNEL_CATEGORIES } from '@/features/dashboard/importHelpers/personnelSalaryImport';
import { parseHourInputToDecimal } from '@/lib/utils';
import { parseMoneyValue } from '@/lib/money';
import { MONTH_NAMES } from '@/lib/constants';

import MoveCategoryMenu from './components/MoveCategoryMenu';
import SalarieCategorySection from './components/SalarieCategorySection';
import SalaryPeriodCalendar from './components/SalaryPeriodCalendar';
import { useLongPress } from './hooks/useLongPress';
import { isBlankSalarieRow, moveSalarieRow } from './salaryCategoryMove';
import { formatCurrency, inputStyle, tdStyle, thStyle } from './salaryTableShared';

const NAV = '#1e293b';

type SalarieField = keyof SalarieRow;
type SalaryCategory = (typeof PERSONNEL_CATEGORIES)[number];
type SalariesCategories = Record<SalaryCategory, SalarieRow[]>;
const SALARY_SECTIONS: Array<{ category: SalaryCategory; title: string; avgTitle: string }> = [
  { category: 'cadre', title: "CADRE AU FORFAIT & CADRE A L'HEURE", avgTitle: 'COÛT MOYEN CADRE' },
  { category: 'maitrise', title: 'AGENTS DE MAITRISE', avgTitle: 'MOYEN AGENT DE MAITRISE' },
  { category: 'niv12', title: 'NIV I ET NIV II', avgTitle: 'COÛT MOYEN NIV 1 ET 2' },
  { category: 'niv3', title: 'NIV III', avgTitle: 'COÛT MOYEN NIV III' },
  { category: 'apprenti', title: 'APPRENTIS', avgTitle: 'COÛT MOYEN APPRENTIS' },
];

interface ConfigSalairesProps {
  onBack: () => void;
}

export default function ConfigSalaires({ onBack }: ConfigSalairesProps) {
  const { selectedYear: YEAR, setSelectedYear, data, updateSalariesConfig } = useData();
  const MONTHS = MONTH_NAMES.map(m => `${m} ${YEAR}`);
  
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(0);
  const selectedMonth = MONTHS[selectedMonthIndex];
  // État local pour la cellule en cours de saisie (évite la perte de la virgule pendant la frappe)
  const [editingCell, setEditingCell] = useState<{ mi: number; cat: SalaryCategory; value: string } | null>(null);
  // Menu « Déplacer vers » ouvert par un clic maintenu sur la ligne d'un salarié
  const [moveMenu, setMoveMenu] = useState<{ x: number; y: number; category: SalaryCategory; index: number } | null>(null);
  const closeMoveMenu = useCallback(() => setMoveMenu(null), []);
  const bindLongPress = useLongPress();
  
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

  // Repères du calendrier : mois contenant des salariés, mois verrouillés
  const monthIndexes = Array.from({ length: 12 }, (_, index) => index);
  const filledMonths = new Set(monthIndexes.filter(index =>
    Object.values(getSalariesForMonth(index)).some(rows => rows.some(row => !isBlankSalarieRow(row))),
  ));
  const lockedMonths = new Set(monthIndexes.filter(isMonthLocked));

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

  // Déplace un salarié vers une autre catégorie (clic maintenu sur sa ligne). Passe par la sauvegarde cloud
  // existante : la mise à jour de salariesConfig marque le mois comme modifié.
  const moveRow = (from: SalaryCategory, index: number, to: SalaryCategory) => {
    if (isMonthLocked(selectedMonthIndex)) return;
    const currentConfig = getCurrentConfig(selectedMonthIndex);

    updateSalariesConfig(selectedMonthIndex, {
      ...currentConfig,
      categories: moveSalarieRow(getSalariesForMonth(selectedMonthIndex), from, index, to),
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
        <SalaryPeriodCalendar
          year={YEAR}
          month={selectedMonthIndex}
          filledMonths={filledMonths}
          lockedMonths={lockedMonths}
          onYearChange={setSelectedYear}
          onMonthChange={setSelectedMonthIndex}
        />

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
                      const isEditing = editingCell?.mi === i && editingCell?.cat === cat.id;
                      // Pendant la saisie : valeur locale brute ; sinon : manuelle > calculée > vide
                      const displayValue = isEditing
                        ? editingCell.value
                        : hasManual ? rawVal : calculated > 0 ? calculated.toFixed(2).replace('.', ',') : '';
                      return (
                        <td key={cat.id} style={{ ...tdStyle, padding: '4px 6px', background: hasManual ? '#fefce8' : '#fff' }}>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={displayValue}
                            onFocus={() => setEditingCell({ mi: i, cat: cat.id, value: displayValue })}
                            onChange={e => setEditingCell({ mi: i, cat: cat.id, value: e.target.value })}
                            onBlur={() => {
                              if (editingCell?.mi === i && editingCell?.cat === cat.id) {
                                setTauxCible(i, cat.id, editingCell.value);
                                setEditingCell(null);
                              }
                            }}
                            style={{
                              ...inputStyle,
                              border: isEditing ? '2px solid #3b82f6' : hasManual ? '2px solid #f59e0b' : '1px solid transparent',
                              borderRadius: 6,
                              padding: '5px 8px',
                              background: 'transparent',
                              color: isEditing ? '#1e293b' : hasManual ? '#92400e' : '#475569',
                              fontWeight: hasManual || isEditing ? 700 : 600,
                            }}
                          />
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

        {SALARY_SECTIONS.map(section => (
          <SalarieCategorySection
            key={section.category}
            title={section.title}
            avgTitle={section.avgTitle}
            category={section.category}
            rows={getSalariesForMonth(selectedMonthIndex)[section.category]}
            isLocked={isMonthLocked(selectedMonthIndex)}
            onAddRow={() => addRow(section.category)}
            onRemoveRow={index => removeRow(section.category, index)}
            onChange={(index, field, value) => handleSalarieChange(section.category, index, field, value)}
            bindLongPress={bindLongPress}
            onRowLongPress={(index, point) => setMoveMenu({ ...point, category: section.category, index })}
          />
        ))}

        {moveMenu && (
          <MoveCategoryMenu
            x={moveMenu.x}
            y={moveMenu.y}
            current={moveMenu.category}
            options={CATEGORIES_LIST}
            onSelect={to => {
              moveRow(moveMenu.category, moveMenu.index, to);
              closeMoveMenu();
            }}
            onClose={closeMoveMenu}
          />
        )}

        <div style={{ height: '100px' }}></div>
      </div>
    </div>
  );
}
