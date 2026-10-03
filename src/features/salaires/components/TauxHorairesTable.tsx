import { useState } from 'react';

import { formatEuroSymbol } from '@/lib/formatters';
import type { PersonnelCategory } from '@/types/dataTypes';

import { formatCurrency, inputStyle, tdStyle, thStyle } from '../salaryTableShared';

const NAV = '#1e293b';

type TauxHorairesTableProps = {
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
};

const toInput = (rate: number) => String(rate).replace('.', ',');

export default function TauxHorairesTable({
  months,
  categories,
  isMonthLocked,
  getManualRate,
  getCalculatedRate,
  getDisplayRate,
  onSetRate,
  onToggleLock,
}: TauxHorairesTableProps) {
  // État local pour la cellule en cours de saisie (évite la perte de la virgule pendant la frappe).
  // `initial` = valeur affichée au clic : sans modification, rien n'est enregistré (un simple clic ne doit pas
  // transformer le taux calculé en taux manuel).
  const [editingCell, setEditingCell] = useState<{ mi: number; cat: PersonnelCategory; value: string; initial: string } | null>(null);

  return (
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
              <th style={{ ...thStyle, background: '#f8fafc', width: 100 }}>VERROUILLER</th>
            </tr>
          </thead>
          <tbody>
            {months.map((month, i) => {
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
                          onFocus={() => setEditingCell({ mi: i, cat: cat.id, value: displayValue, initial: displayValue })}
                          onChange={e => setEditingCell({ mi: i, cat: cat.id, value: e.target.value, initial: editingCell?.initial ?? displayValue })}
                          onBlur={() => {
                            if (editingCell?.mi === i && editingCell?.cat === cat.id) {
                              if (editingCell.value.trim() !== editingCell.initial.trim()) onSetRate(i, cat.id, editingCell.value);
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
                      checked={isMonthLocked(i)}
                      onChange={() => onToggleLock(i)}
                      style={{ cursor: 'pointer', width: 16, height: 16, accentColor: '#ef4444' }}
                    />
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
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
