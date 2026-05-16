import React from 'react';

import { useData } from '@/contexts/DataContext';
import type { PersonnelCategory, PersonnelDepartment, PersonnelInfo } from '@/contexts/DataContext';

const NAV = '#1e293b';

const CATEGORY_OPTIONS: Array<{ value: PersonnelCategory; label: string }> = [
  { value: 'cadre', label: 'Cadre' },
  { value: 'maitrise', label: 'Agent de maitrise' },
  { value: 'niv12', label: 'NIV I et II' },
  { value: 'niv3', label: 'NIV III' },
  { value: 'apprenti', label: 'Apprenti' },
];

const DEPARTMENT_OPTIONS: Array<{ value: PersonnelDepartment; label: string }> = [
  { value: 'salle', label: 'Salle' },
  { value: 'cuisine', label: 'Cuisine' },
];

interface CalculetteSalairesProps {
  onBack: () => void;
}

const createPersonnelRow = (): PersonnelInfo => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  nom: '',
  category: 'niv12',
  department: 'salle',
  aliases: '',
});

export default function CalculetteSalaires({ onBack }: CalculetteSalairesProps) {
  const { personnelInfos, updatePersonnelInfos } = useData();
  const rows = personnelInfos.length > 0 ? personnelInfos : [createPersonnelRow()];

  const updateRow = (id: string, updates: Partial<PersonnelInfo>) => {
    updatePersonnelInfos(rows.map(row => row.id === id ? { ...row, ...updates } : row));
  };

  const addRow = () => updatePersonnelInfos([...rows, createPersonnelRow()]);

  const removeRow = (id: string) => {
    const nextRows = rows.filter(row => row.id !== id);
    updatePersonnelInfos(nextRows.length > 0 ? nextRows : [createPersonnelRow()]);
  };

  const thStyle: React.CSSProperties = {
    border: '1px solid #cbd5e1',
    padding: '10px 8px',
    textAlign: 'center',
    fontWeight: 800,
    fontSize: 11,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '.04em',
    background: '#f8fafc',
  };

  const tdStyle: React.CSSProperties = {
    border: '1px solid #cbd5e1',
    padding: 8,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 700,
    color: '#1e293b',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 34,
    border: '1px solid #cbd5e1',
    borderRadius: 7,
    background: '#fff',
    padding: '0 10px',
    outline: 'none',
    fontSize: 13,
    fontWeight: 700,
    color: '#1e293b',
    fontFamily: 'inherit',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: 24, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <button onClick={onBack} style={{
            display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e2e8f0',
            padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700,
            color: '#64748b', boxShadow: '0 1px 2px rgba(0,0,0,.05)'
          }}>
            <span style={{ fontSize: 16 }}>←</span> Retour
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: 700 }}>Personnel</div>
            <div style={{ color: NAV, fontSize: 16, fontWeight: 900, letterSpacing: '.02em', marginTop: 2 }}>Infos personnel et matching PDF</div>
          </div>
          <div style={{ width: 96 }} />
        </header>

        <section style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: NAV }}>Référentiel personnel</h1>
              <div style={{ marginTop: 3, fontSize: 12, fontWeight: 700, color: '#64748b' }}>Ces infos servent à associer les noms lus dans le PDF paie aux colonnes du suivi quotidien.</div>
            </div>
            <button onClick={addRow} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
              Ajouter
            </button>
          </div>

          <div style={{ overflowX: 'auto', padding: 18 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 780 }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: '30%' }}>Nom dans le PDF</th>
                  <th style={{ ...thStyle, width: '20%' }}>Statut</th>
                  <th style={{ ...thStyle, width: '16%' }}>Section</th>
                  <th style={{ ...thStyle, width: '26%' }}>Alias éventuels</th>
                  <th style={{ ...thStyle, width: 90 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id}>
                    <td style={{ ...tdStyle, background: '#fff' }}>
                      <input style={inputStyle} value={row.nom} onChange={event => updateRow(row.id, { nom: event.target.value })} placeholder="Pringy Nicolas" />
                    </td>
                    <td style={{ ...tdStyle, background: '#fff' }}>
                      <select style={inputStyle} value={row.category} onChange={event => updateRow(row.id, { category: event.target.value as PersonnelCategory })}>
                        {CATEGORY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </td>
                    <td style={{ ...tdStyle, background: '#fff' }}>
                      <select style={inputStyle} value={row.department} onChange={event => updateRow(row.id, { department: event.target.value as PersonnelDepartment })}>
                        {DEPARTMENT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </td>
                    <td style={{ ...tdStyle, background: '#fff' }}>
                      <input style={inputStyle} value={row.aliases} onChange={event => updateRow(row.id, { aliases: event.target.value })} placeholder="Nicolas Pringy; N. Pringy" />
                    </td>
                    <td style={{ ...tdStyle, background: '#fff' }}>
                      <button onClick={() => removeRow(row.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 10px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                        Suppr.
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
