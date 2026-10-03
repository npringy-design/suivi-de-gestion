import React, { useState } from 'react';

import { formatEuroSymbol } from '@/lib/formatters';
import type { PersonnelCategory } from '@/types/dataTypes';

import { formatCurrency, inputStyle, tdStyle, thStyle } from '../salaryTableShared';

const NAV = '#1e293b';

type TauxHorairesTableProps = {
  year: number;
  months: string[];
  categories: Array<{ id: PersonnelCategory; label: string }>;
  isMonthLocked: (monthIndex: number) => boolean;
  // Taux saisi à la main (0 si aucun)
  getManualRate: (monthIndex: number, category: PersonnelCategory) => number;
  // Taux calculé depuis les salariés importés du mois (0 si aucun)
  getCalculatedRate: (monthIndex: number, category: PersonnelCategory) => number;
  // Taux retenu : manuel > calculé (règle inchangée)
  getDisplayRate: (monthIndex: number, category: PersonnelCategory) => number;
  onSetRate: (monthIndex: number, category: PersonnelCategory, raw: string) => void;
  onToggleLock: (monthIndex: number) => void;
  onPropagate: () => void;
  onResetMonth: (monthIndex: number) => void;
  onResetAll: () => void;
};

const toInput = (rate: number) => String(rate).replace('.', ',');

const smallButtonStyle = (disabled: boolean): React.CSSProperties => ({
  background: 'transparent',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  color: disabled ? '#94a3b8' : '#475569',
  fontSize: 10,
  fontWeight: 700,
  padding: '4px 8px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  whiteSpace: 'nowrap',
});

export default function TauxHorairesTable({
  year,
  months,
  categories,
  isMonthLocked,
  getManualRate,
  getCalculatedRate,
  getDisplayRate,
  onSetRate,
  onToggleLock,
  onPropagate,
  onResetMonth,
  onResetAll,
}: TauxHorairesTableProps) {
  // État local pour la cellule en cours de saisie (évite la perte de la virgule pendant la frappe)
  const [editingCell, setEditingCell] = useState<{ mi: number; cat: PersonnelCategory; value: string } | null>(null);
  const [confirmingResetAll, setConfirmingResetAll] = useState(false);

  const hasManualRate = (monthIndex: number) => categories.some(cat => getManualRate(monthIndex, cat.id) > 0);
  const resettableCount = months.filter((_, mi) => !isMonthLocked(mi) && hasManualRate(mi)).length;

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)', marginBottom: 32 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: NAV, textTransform: 'uppercase', letterSpacing: '.03em' }}>
            Configuration Taux Horaires
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>
            Saisir manuellement le taux €/h par niveau et par mois (virgule ou point acceptés). Si vide, le taux calculé depuis les bulletins est utilisé.
            Un taux manuel (case jaune) prime sur le taux calculé, rappelé en dessous.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            disabled={resettableCount === 0}
            onClick={() => setConfirmingResetAll(true)}
            style={{ ...smallButtonStyle(resettableCount === 0), padding: '8px 12px', fontSize: 11 }}
          >
            Tout recalculer depuis les bulletins
          </button>
          <button
            type="button"
            onClick={onPropagate}
            style={{ background: '#f59e0b', color: '#1c1917', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 11, fontWeight: 800, cursor: 'pointer', letterSpacing: '.02em', whiteSpace: 'nowrap' }}
          >
            Appliquer à tous les mois →
          </button>
        </div>
      </div>

      {confirmingResetAll && (
        <div role="alertdialog" style={{ padding: '12px 20px', background: '#fffbeb', borderBottom: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>
            Supprimer les taux manuels de {resettableCount} mois non verrouillé{resettableCount > 1 ? 's' : ''} de {year} ? Les taux calculés depuis les bulletins seront utilisés.
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setConfirmingResetAll(false)} style={smallButtonStyle(false)}>Annuler</button>
            <button
              type="button"
              onClick={() => { onResetAll(); setConfirmingResetAll(false); }}
              style={{ ...smallButtonStyle(false), background: '#ef4444', borderColor: '#ef4444', color: '#fff' }}
            >
              Confirmer
            </button>
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto', padding: '20px' }}>
        <table style={{ borderCollapse: 'collapse', margin: '0 auto', width: '100%', maxWidth: '1000px' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, background: 'transparent', border: 'none' }}></th>
              {categories.map(cat => (
                <th key={cat.id} style={{ ...thStyle, background: '#fce4d6', color: '#9a3412' }}>{cat.label}</th>
              ))}
              <th style={{ ...thStyle, background: '#f8fafc', width: 100 }}>VERROUILLER</th>
              <th style={{ ...thStyle, background: '#f8fafc', width: 130 }}>TAUX MANUELS</th>
            </tr>
          </thead>
          <tbody>
            {months.map((month, i) => {
              const locked = isMonthLocked(i);
              const rowBackground = i % 2 === 0 ? '#fff' : '#f1f5f9';
              return (
                <tr key={month}>
                  <td style={{ ...tdStyle, background: rowBackground, fontWeight: 700, textAlign: 'center', color: '#64748b' }}>
                    {month}
                  </td>
                  {categories.map(cat => {
                    const manual = getManualRate(i, cat.id);
                    const hasManual = manual > 0;
                    const calculated = getCalculatedRate(i, cat.id);
                    const isEditing = editingCell?.mi === i && editingCell?.cat === cat.id;
                    // Pendant la saisie : valeur locale brute ; sinon : manuelle > calculée > vide
                    const displayValue = isEditing
                      ? editingCell.value
                      : hasManual ? toInput(manual) : calculated > 0 ? calculated.toFixed(2).replace('.', ',') : '';
                    const showCalculated = hasManual && calculated > 0 && Math.abs(calculated - manual) >= 0.005;
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
                              onSetRate(i, cat.id, editingCell.value);
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
                        {showCalculated && (
                          <div style={{ marginTop: 2, fontSize: 10, fontWeight: 600, color: '#64748b' }}>
                            calculé : {formatEuroSymbol(calculated)}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td style={{ ...tdStyle, background: rowBackground }}>
                    <input
                      type="checkbox"
                      checked={locked}
                      onChange={() => onToggleLock(i)}
                      style={{ cursor: 'pointer', width: 16, height: 16, accentColor: '#ef4444' }}
                    />
                  </td>
                  <td style={{ ...tdStyle, background: rowBackground }}>
                    {hasManualRate(i) && (
                      <button
                        type="button"
                        disabled={locked}
                        title={locked ? 'Mois verrouillé' : 'Supprimer les taux manuels de ce mois'}
                        onClick={() => onResetMonth(i)}
                        style={smallButtonStyle(locked)}
                      >
                        Revenir au calculé
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            <tr>
              <td style={{ ...tdStyle, background: '#fef08a', fontWeight: 800, color: '#854d0e' }}>MOYENNE</td>
              {categories.map(cat => {
                let total = 0;
                let count = 0;
                months.forEach((_, idx) => {
                  const v = getDisplayRate(idx, cat.id);
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
              <td style={{ ...tdStyle, background: '#fef08a' }}></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
