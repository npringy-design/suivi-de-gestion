import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { PersonnelCategory } from '@/types/dataTypes';

import TauxHorairesTable from './TauxHorairesTable';

const MONTHS = ['Janvier', 'Février', 'Mars'];
const CATEGORIES: Array<{ id: PersonnelCategory; label: string }> = [
  { id: 'cadre', label: 'CADRE' },
  { id: 'niv12', label: 'NIV I ET II' },
];

const renderTable = (manual: Record<string, number>, calculated: Record<string, number>) =>
  render(
    <TauxHorairesTable
      months={MONTHS}
      categories={CATEGORIES}
      isMonthLocked={() => false}
      getManualRate={(mi, cat) => manual[`${mi}-${cat}`] ?? 0}
      getCalculatedRate={(mi, cat) => calculated[`${mi}-${cat}`] ?? 0}
      getDisplayRate={(mi, cat) => manual[`${mi}-${cat}`] ?? calculated[`${mi}-${cat}`] ?? 0}
      onSetRate={vi.fn()}
      onToggleLock={vi.fn()}
    />,
  );

describe('TauxHorairesTable', () => {
  it('rappelle le taux calculé sous un taux manuel qui en diffère', () => {
    renderTable({ '0-cadre': 20 }, { '0-cadre': 15.17 });

    expect(screen.getByText(/calculé : 15,17/)).toBeInTheDocument();
  });

  it('n\'affiche pas le rappel quand le taux manuel égale le calculé ou qu\'il n\'y a pas de calculé', () => {
    renderTable({ '0-cadre': 15.17, '1-cadre': 12 }, { '0-cadre': 15.17 });

    expect(screen.queryByText(/calculé :/)).not.toBeInTheDocument();
  });

  it('ne propose plus ni boutons de réinitialisation ni colonne de taux manuels', () => {
    renderTable({ '0-cadre': 20 }, { '0-cadre': 15 });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText('TAUX MANUELS')).not.toBeInTheDocument();
  });
});
