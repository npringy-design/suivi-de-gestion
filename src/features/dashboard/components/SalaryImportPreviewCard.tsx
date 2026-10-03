import React from 'react';

import { getPayrollProvisionMultiplier } from '@/features/dashboard/importHelpers/personnelSalaryImport';
import { formatEuroSymbol } from '@/lib/formatters';
import { parseMoneyValue } from '@/lib/money';
import type {
  PersonnelCategory,
  PersonnelDepartment,
  PersonnelInfo,
  SalaryImportPreview,
  SalaryImportPreviewRow,
  SalaryImportRowStatus,
} from '@/types/dataTypes';

const SALARY_CATEGORY_LABELS: Record<PersonnelCategory, string> = {
  cadre: 'Cadre',
  maitrise: 'Maîtrise',
  niv12: 'Niv. 1-2',
  niv3: 'Niv. 3',
  apprenti: 'Apprenti',
};

const SALARY_DEPARTMENT_LABELS: Record<PersonnelDepartment, string> = {
  cuisine: 'Cuisine',
  salle: 'Salle',
};

const SALARY_STATUS_BADGES: Record<SalaryImportRowStatus, { label: string; color: string; background: string }> = {
  matched: { label: '✓ Trouvé', color: '#166534', background: '#f0fdf4' },
  new: { label: 'Nouveau, à confirmer', color: '#92400e', background: '#fffbeb' },
  manual: { label: 'Modifié', color: '#1d4ed8', background: '#eff6ff' },
  ignored: { label: 'Ignoré', color: '#64748b', background: '#f1f5f9' },
};

const salaryPillStyle = (color: string, background: string): React.CSSProperties => ({
  padding: '3px 9px',
  borderRadius: 999,
  background,
  color,
  border: `1px solid ${color}33`,
  fontSize: 11,
  fontWeight: 900,
  whiteSpace: 'nowrap',
});

const salaryCellInputStyle: React.CSSProperties = {
  width: '100%',
  height: 30,
  minWidth: 0,
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  padding: '0 8px',
  fontWeight: 800,
  color: '#0f172a',
  textAlign: 'right',
  background: '#fff',
};

const salarySelectStyle: React.CSSProperties = {
  height: 28,
  width: '100%',
  maxWidth: 200,
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  padding: '0 6px',
  fontSize: 11,
  fontWeight: 700,
  color: '#0f172a',
  background: '#fff',
};

// Statut retrouvé quand on annule un « Ignorer » : une ligne sans fiche redevient « nouveau »,
// une ligne rapprochée (ou associée entre-temps à une fiche) redevient « trouvé » ou « modifié ».
const restoredStatus = (row: SalaryImportPreviewRow): SalaryImportRowStatus => {
  if (row.origin === 'new') return row.statusBeforeIgnore === 'manual' ? 'manual' : 'new';
  return row.statusBeforeIgnore === 'manual' ? 'manual' : 'matched';
};

type SalaryImportPreviewCardProps = {
  preview: SalaryImportPreview;
  updateSalaryImportRow: (previewId: string, personnelId: string, updates: Partial<SalaryImportPreviewRow>) => void;
  applySalaryImportPreview: (previewId: string) => void;
  discardSalaryImportPreview: (previewId: string) => void;
};

export default function SalaryImportPreviewCard({
  preview,
  updateSalaryImportRow,
  applySalaryImportPreview,
  discardSalaryImportPreview,
}: SalaryImportPreviewCardProps) {
  const usedPersonnelIds = new Set(preview.rows.map(row => row.personnel.id));
  const freePersonnel = preview.availablePersonnel.filter(personnel => !usedPersonnelIds.has(personnel.id));
  const foundCount = preview.rows.filter(row => row.origin === 'matched' && row.status !== 'ignored').length;
  const newCount = preview.rows.filter(row => row.origin === 'new' && row.status !== 'ignored').length;
  const leaverCount = preview.rows.filter(row => row.exitDate && row.status === 'ignored').length;
  // Lignes sans fiche en premier (à confirmer), puis le reste dans l'ordre du PDF
  const sortedRows = [...preview.rows].sort((a, b) => Number(b.origin === 'new') - Number(a.origin === 'new'));

  const update = (row: SalaryImportPreviewRow, updates: Partial<SalaryImportPreviewRow>) => {
    updateSalaryImportRow(preview.id, row.personnel.id, updates);
  };

  const editValue = (row: SalaryImportPreviewRow, updates: Partial<SalaryImportPreviewRow>) => {
    update(row, { ...updates, status: 'manual' });
  };

  const editPersonnel = (row: SalaryImportPreviewRow, updates: Partial<PersonnelInfo>) => {
    update(row, { personnel: { ...row.personnel, ...updates } });
  };

  // Le nom du PDF est mémorisé en alias de la fiche choisie (reconnu aux imports suivants).
  const associatePersonnel = (row: SalaryImportPreviewRow, personnelId: string) => {
    const personnel = freePersonnel.find(item => item.id === personnelId);
    if (!personnel) return;
    update(row, {
      personnel,
      origin: 'matched',
      status: row.status === 'new' ? 'matched' : row.status,
      statusBeforeIgnore: row.statusBeforeIgnore === 'new' ? 'matched' : row.statusBeforeIgnore,
      saveAlias: true,
    });
  };

  const headerCellStyle: React.CSSProperties = { padding: '8px 10px', fontSize: 10, fontWeight: 900, color: '#6b21a8', textTransform: 'uppercase', letterSpacing: '.04em', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid #e9d5ff' };

  return (
    <div style={{ marginTop: 10, display: 'grid', gap: 10, padding: 12, border: '1px solid #e9d5ff', borderRadius: 10, background: '#faf5ff' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={preview.fileName}>{preview.fileName}</div>
          <div style={{ marginTop: 2, fontSize: 12, fontWeight: 800, color: '#6b21a8' }}>Paie {preview.sourceLabel} → {preview.targetLabel}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span style={salaryPillStyle('#166534', '#f0fdf4')}>✓ {foundCount} rapprochés</span>
          <span style={salaryPillStyle('#92400e', '#fffbeb')}>{newCount} nouveaux à confirmer</span>
          <span style={salaryPillStyle('#64748b', '#f1f5f9')}>{leaverCount} sortants exclus</span>
        </div>
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>
        {preview.totals
          ? <>Totaux du PDF (page Masse salariale, tout le monde compris) : brut {formatEuroSymbol(preview.totals.brut)} · charges {formatEuroSymbol(preview.totals.chargesPatronales)} · coût global {formatEuroSymbol(preview.totals.coutGlobal)}</>
          : 'Totaux de bas de page non reconnus (format différent) : la page Masse salariale utilisera la somme des salariés retenus.'}
      </div>

      <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e9d5ff', borderRadius: 8 }}>
        <table style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Salarié', 'Catégorie', 'Heures', 'Coût global', 'Coût horaire', 'Ligne PDF', 'Statut'].map(label => (
                <th key={label} style={headerCellStyle}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(row => {
              const isIgnored = row.status === 'ignored';
              const isNew = row.origin === 'new';
              const coutHoraire = row.heures > 0 && row.coutGlobal > 0
                ? (row.coutGlobal * getPayrollProvisionMultiplier(row.personnel.category)) / row.heures
                : 0;
              const badge = SALARY_STATUS_BADGES[row.status];
              const cellStyle: React.CSSProperties = {
                padding: '7px 10px',
                borderBottom: '1px solid #f1f5f9',
                verticalAlign: 'top',
                color: isIgnored ? '#94a3b8' : '#0f172a',
                textDecoration: isIgnored ? 'line-through' : 'none',
              };
              return (
                <tr key={row.personnel.id} style={{ background: isIgnored ? '#f8fafc' : isNew ? '#fffbeb' : '#fff', boxShadow: isNew && !isIgnored ? 'inset 3px 0 0 #d97706' : 'none' }}>
                  <td style={{ ...cellStyle, fontWeight: 900 }}>
                    <div>{row.personnel.nom}</div>
                    {row.jobTitle && <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>{row.jobTitle}</div>}
                    {row.exitDate && (
                      <div style={{ marginTop: 2, fontSize: 11, fontWeight: 800, color: '#b45309', textDecoration: 'none' }}>
                        Sortant le {row.exitDate}{isIgnored ? ' : exclu des taux horaires' : ' : réintégré aux taux horaires'}
                      </div>
                    )}
                    {isNew && !isIgnored && freePersonnel.length > 0 && (
                      <select
                        value=""
                        onChange={event => associatePersonnel(row, event.target.value)}
                        style={{ ...salarySelectStyle, marginTop: 6, textDecoration: 'none' }}
                      >
                        <option value="">Associer à une fiche existante…</option>
                        {freePersonnel.map(personnel => (
                          <option key={personnel.id} value={personnel.id}>{personnel.nom}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td style={cellStyle}>
                    {isNew && !isIgnored ? (
                      <div style={{ display: 'grid', gap: 4, textDecoration: 'none' }}>
                        <select
                          value={row.personnel.category}
                          onChange={event => editPersonnel(row, { category: event.target.value as PersonnelCategory })}
                          style={salarySelectStyle}
                        >
                          {(Object.keys(SALARY_CATEGORY_LABELS) as PersonnelCategory[]).map(category => (
                            <option key={category} value={category}>{SALARY_CATEGORY_LABELS[category]}</option>
                          ))}
                        </select>
                        <select
                          value={row.personnel.department}
                          onChange={event => editPersonnel(row, { department: event.target.value as PersonnelDepartment })}
                          style={salarySelectStyle}
                        >
                          {(Object.keys(SALARY_DEPARTMENT_LABELS) as PersonnelDepartment[]).map(department => (
                            <option key={department} value={department}>{SALARY_DEPARTMENT_LABELS[department]}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <>
                        {SALARY_CATEGORY_LABELS[row.personnel.category]}
                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>{SALARY_DEPARTMENT_LABELS[row.personnel.department]}</div>
                      </>
                    )}
                  </td>
                  <td style={{ ...cellStyle, width: 96, minWidth: 96 }}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      disabled={isIgnored}
                      value={row.heures || ''}
                      onChange={event => editValue(row, { heures: Number.isFinite(event.target.valueAsNumber) ? event.target.valueAsNumber : 0 })}
                      style={salaryCellInputStyle}
                    />
                  </td>
                  <td style={{ ...cellStyle, width: 116, minWidth: 116 }}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      disabled={isIgnored}
                      value={row.coutGlobal || ''}
                      onChange={event => editValue(row, { coutGlobal: parseMoneyValue(event.target.value) })}
                      style={salaryCellInputStyle}
                    />
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 800, whiteSpace: 'nowrap' }}>
                    {coutHoraire > 0 ? `${formatEuroSymbol(coutHoraire)}/h` : '—'}
                  </td>
                  <td style={{ ...cellStyle, maxWidth: 150 }}>
                    <div title={row.sourceLine} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, color: isIgnored ? '#94a3b8' : '#475569', fontFamily: 'ui-monospace, monospace' }}>
                      {row.sourceLine || '—'}
                    </div>
                  </td>
                  <td style={{ ...cellStyle, textDecoration: 'none' }}>
                    <div style={{ display: 'grid', gap: 6, justifyItems: 'start' }}>
                      <span style={salaryPillStyle(badge.color, badge.background)}>{badge.label}</span>
                      {isIgnored ? (
                        <button
                          type="button"
                          onClick={() => update(row, { status: restoredStatus(row), statusBeforeIgnore: undefined })}
                          style={{ border: 'none', background: 'transparent', color: '#1d4ed8', fontSize: 11, fontWeight: 800, cursor: 'pointer', padding: 0 }}
                        >
                          Rétablir
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => update(row, { status: 'ignored', statusBeforeIgnore: row.status === 'ignored' ? undefined : row.status })}
                          style={{ border: 'none', background: 'transparent', color: '#64748b', fontSize: 11, fontWeight: 800, cursor: 'pointer', padding: 0, textAlign: 'left' }}
                        >
                          Ignorer (absent ce mois)
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {newCount > 0 && (
        <div style={{ fontSize: 12, fontWeight: 800, color: '#92400e' }}>
          {newCount} nouveau(x) salarié(s) : une fiche sera créée dans Info personnel à la validation (catégorie et service modifiables ci-dessus), ou associez la ligne à une fiche existante. « Ignorer » exclut la ligne.
        </div>
      )}
      {leaverCount > 0 && (
        <div style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
          Les sortants sont exclus des taux horaires (leur coût inclut le solde de tout compte) mais restent comptés dans les totaux du PDF.
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button type="button" onClick={() => discardSalaryImportPreview(preview.id)} style={{ height: 34, border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', color: '#334155', fontSize: 12, fontWeight: 900, cursor: 'pointer', padding: '0 12px' }}>Annuler</button>
        <button type="button" onClick={() => applySalaryImportPreview(preview.id)} style={{ height: 34, border: 'none', borderRadius: 8, background: '#7e22ce', color: '#fff', fontSize: 12, fontWeight: 950, cursor: 'pointer', padding: '0 14px' }}>Valider l'import</button>
      </div>
    </div>
  );
}
