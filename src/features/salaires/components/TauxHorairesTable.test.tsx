import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { PersonnelCategory } from '@/types/dataTypes';

import TauxHorairesTable from './TauxHorairesTable';

const MONTHS = ['Janvier', 'Février', 'Mars'];
const CATEGORIES: Array<{ id: PersonnelCategory; label: string }> = [
  { id: 'cadre', label: 'CADRE' },
  { id: 'niv12', label: 'NIV I ET II' },
];

type Overrides = Partial<{
  locked: number[];
  manual: Record<string, number>;
  calculated: Record<string, number>;
}>;

const renderTable = ({ locked = [], manual = {}, calculated = {} }: Overrides = {}) => {
  const handlers = {
    onSetRate: vi.fn(),
    onToggleLock: vi.fn(),
    onPropagate: vi.fn(),
    onResetMonth: vi.fn(),
    onResetAll: vi.fn(),
  };
  render(
    <TauxHorairesTable
      year={2026}
      months={MONTHS}
      categories={CATEGORIES}
      isMonthLocked={mi => locked.includes(mi)}
      getManualRate={(mi, cat) => manual[`${mi}-${cat}`] ?? 0}
      getCalculatedRate={(mi, cat) => calculated[`${mi}-${cat}`] ?? 0}
      getDisplayRate={(mi, cat) => manual[`${mi}-${cat}`] ?? calculated[`${mi}-${cat}`] ?? 0}
      {...handlers}
    />,
  );
  return handlers;
};

describe('TauxHorairesTable', () => {
  it('rappelle le taux calculé sous un taux manuel qui en diffère', () => {
    renderTable({ manual: { '0-cadre': 20 }, calculated: { '0-cadre': 15.17 } });

    expect(screen.getByText(/calculé : 15,17/)).toBeInTheDocument();
  });

  it('n\'affiche pas le rappel quand le taux manuel égale le calculé ou qu\'il n\'y a pas de calculé', () => {
    renderTable({ manual: { '0-cadre': 15.17, '1-cadre': 12 }, calculated: { '0-cadre': 15.17 } });

    expect(screen.queryByText(/calculé :/)).not.toBeInTheDocument();
  });

  it('« Revenir au calculé » n\'existe que pour un mois avec taux manuel, et est désactivé si le mois est verrouillé', () => {
    const handlers = renderTable({ manual: { '0-cadre': 20, '2-niv12': 18 }, locked: [2] });

    const buttons = screen.getAllByRole('button', { name: 'Revenir au calculé' });
    expect(buttons).toHaveLength(2);
    expect(buttons[1]).toBeDisabled();

    fireEvent.click(buttons[0]);
    expect(handlers.onResetMonth).toHaveBeenCalledWith(0);
  });

  it('« Tout recalculer » demande une confirmation intégrée et ne compte que les mois non verrouillés', () => {
    const handlers = renderTable({ manual: { '0-cadre': 20, '1-cadre': 19, '2-niv12': 18 }, locked: [2] });

    fireEvent.click(screen.getByRole('button', { name: 'Tout recalculer depuis les bulletins' }));
    expect(handlers.onResetAll).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toHaveTextContent('2 mois non verrouillés de 2026');

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(handlers.onResetAll).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Tout recalculer depuis les bulletins' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer' }));
    expect(handlers.onResetAll).toHaveBeenCalledTimes(1);
  });

  it('« Tout recalculer » est désactivé sans taux manuel à supprimer', () => {
    renderTable({ calculated: { '0-cadre': 15 } });

    expect(screen.getByRole('button', { name: 'Tout recalculer depuis les bulletins' })).toBeDisabled();
  });
});
