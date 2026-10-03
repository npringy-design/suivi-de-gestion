import React from 'react';

import { getPayrollProvisionMultiplier } from '@/features/dashboard/importHelpers/personnelSalaryImport';
import { parseMoneyValue } from '@/lib/money';
import { parseHourInputToDecimal } from '@/lib/utils';
import type { PersonnelCategory, SalarieRow } from '@/types/dataTypes';

import type { BindLongPress, LongPressPoint } from '../hooks/useLongPress';
import { formatCurrency, formatDepartment, inputStyle, tdStyle, thStyle } from '../salaryTableShared';

const NAV = '#1e293b';

type SalarieField = keyof SalarieRow;

type SalarieRowWithCalculations = SalarieRow & {
  provisionVal: number;
  coutHoraireVal: number;
};

type SalarieCategorySectionProps = {
  title: string;
  avgTitle: string;
  category: PersonnelCategory;
  rows: SalarieRow[];
  isLocked: boolean;
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  onChange: (index: number, field: SalarieField, value: string) => void;
  // Clic maintenu sur une ligne : ouvre le menu « Déplacer vers » (désactivé quand le mois est verrouillé)
  bindLongPress: BindLongPress;
  onRowLongPress: (index: number, point: LongPressPoint) => void;
};

export default function SalarieCategorySection({
  title,
  avgTitle,
  category,
  rows,
  isLocked,
  onAddRow,
  onRemoveRow,
  onChange,
  bindLongPress,
  onRowLongPress,
}: SalarieCategorySectionProps) {
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
      coutHoraireVal: coutHoraire,
    };
  });

  const moyenneCoutHoraire = validRowsCount > 0 ? totalCoutHoraire / validRowsCount : 0;
  const averageRowSpan = Math.max(1, rowsWithCalculations.length + rowsWithCalculations.filter(row => row.importSourceLine).length);

  return (
    <div style={{ marginTop: 24, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ color: '#ef4444', margin: 0, textTransform: 'uppercase', fontSize: 13, fontWeight: 800, letterSpacing: '.04em' }}>
          {title}
        </h3>
        <button disabled={isLocked} onClick={onAddRow} style={{ display: 'flex', alignItems: 'center', gap: 4, background: isLocked ? '#9ca3af' : '#10b981', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: isLocked ? 'not-allowed' : 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,.1)' }}>
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
              <tr {...bindLongPress(point => onRowLongPress(i, point), isLocked)}>
                <td
                  title={isLocked ? undefined : 'Maintenir le clic pour changer de catégorie'}
                  style={{ ...tdStyle, background: isLocked ? '#f1f5f9' : '#dbeafe' }}
                >
                  <input disabled={isLocked} style={{ ...inputStyle, textAlign: 'left', cursor: isLocked ? 'not-allowed' : 'text' }} value={row.nom} onChange={e => onChange(i, 'nom', e.target.value)} placeholder="Nom..." />
                </td>
                <td style={{ ...tdStyle, background: '#fff', fontWeight: 800, color: '#475569' }}>
                  {formatDepartment(row.department)}
                </td>
                <td style={{ ...tdStyle, background: '#f1f5f9' }}>
                  <input disabled={isLocked} style={{ ...inputStyle, cursor: isLocked ? 'not-allowed' : 'text' }} value={row.heures} onChange={e => onChange(i, 'heures', e.target.value)} placeholder="7h30" title="Formats acceptes : 7h30, 7:30, 7.30, 7,30" />
                </td>
                <td style={{ ...tdStyle, background: isLocked ? '#f1f5f9' : '#dbeafe' }}>
                  <input disabled={isLocked} style={{ ...inputStyle, cursor: isLocked ? 'not-allowed' : 'text' }} value={row.coutGlobal} onChange={e => onChange(i, 'coutGlobal', e.target.value)} />
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
                    onClick={() => onRemoveRow(i)}
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
}
