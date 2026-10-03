import type React from 'react';

import { formatEuroSymbol } from '@/lib/formatters';

// Styles et formatage partagés par les tableaux de Config Salaires (taux horaires et sections par catégorie).

export const thStyle: React.CSSProperties = {
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

export const tdStyle: React.CSSProperties = {
  border: '1px solid #cbd5e1',
  padding: '6px 8px',
  textAlign: 'center',
  fontSize: 11,
  color: '#1e293b',
};

export const inputStyle: React.CSSProperties = {
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

export const formatCurrency = (value: number) => (value === 0 ? '-' : formatEuroSymbol(value));

export const formatDepartment = (value?: string) => (value === 'cuisine' ? 'Cuisine' : value === 'salle' ? 'Salle' : '-');
