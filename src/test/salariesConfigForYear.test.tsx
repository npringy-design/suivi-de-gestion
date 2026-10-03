import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { DataProvider, useData } from '../contexts/DataContext';
import type { MonthDataSalariesConfig } from '../types/dataTypes';

const wrapper = ({ children }: { children: ReactNode }) => <DataProvider>{children}</DataProvider>;

const config = (cost: string): MonthDataSalariesConfig => ({
  locked: false,
  categories: {
    cadre: [{ nom: 'Nicolas', heures: '151,67', coutGlobal: cost, provision: '', coutHoraire: '' }],
  },
});

describe('updateSalariesConfigForYear (import PDF sur l\'année du PDF)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('un import 2025 écrit sur 2025 pendant que l\'année affichée est 2026', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    act(() => result.current.setSelectedYear(2026));

    // PDF de septembre 2025 → cible octobre 2025 (index 9)
    act(() => result.current.updateSalariesConfigForYear(2025, 9, config('4500')));

    expect(result.current.allData[2025][9].salariesConfig?.categories.cadre[0].coutGlobal).toBe('4500');
    // L'octobre de l'année affichée n'est pas touché
    expect(result.current.allData[2026]?.[9]?.salariesConfig).toBeUndefined();
  });

  it('un PDF de décembre 2025 (cible janvier 2026) écrit sur janvier 2026 même si 2027 est affiché', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    act(() => result.current.setSelectedYear(2027));

    act(() => result.current.updateSalariesConfigForYear(2026, 0, config('5200')));

    expect(result.current.allData[2026][0].salariesConfig?.categories.cadre[0].coutGlobal).toBe('5200');
    expect(result.current.allData[2027]?.[0]?.salariesConfig).toBeUndefined();
  });

  it('la forme « updater » relit la config existante : autres champs conservés, mois verrouillé respecté', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    act(() => result.current.updateSalariesConfigForYear(2025, 9, { ...config('1000'), tauxCibles: { cadre: 30 } }));

    act(() => result.current.updateSalariesConfigForYear(2025, 9, current => (
      current?.locked ? current : { ...(current ?? { locked: false }), categories: config('2000').categories }
    )));
    expect(result.current.allData[2025][9].salariesConfig?.tauxCibles).toEqual({ cadre: 30 });
    expect(result.current.allData[2025][9].salariesConfig?.categories.cadre[0].coutGlobal).toBe('2000');

    act(() => result.current.updateSalariesConfigForYear(2025, 9, { ...config('2000'), locked: true, tauxCibles: { cadre: 30 } }));
    act(() => result.current.updateSalariesConfigForYear(2025, 9, current => (
      current?.locked ? current : { ...(current ?? { locked: false }), categories: config('9999').categories }
    )));
    expect(result.current.allData[2025][9].salariesConfig?.categories.cadre[0].coutGlobal).toBe('2000');
  });

  it('un import qui renvoie tauxCibles: undefined supprime les taux manuels du mois (les nouveaux montants remplacent les anciens)', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    act(() => result.current.updateSalariesConfigForYear(2025, 9, { ...config('1000'), tauxCibles: { cadre: 30 } }));

    act(() => result.current.updateSalariesConfigForYear(2025, 9, current => (
      current?.locked ? current : { ...(current ?? { locked: false }), categories: config('2000').categories, tauxCibles: undefined }
    )));

    expect(result.current.allData[2025][9].salariesConfig?.tauxCibles).toBeUndefined();
    expect(result.current.allData[2025][9].salariesConfig?.categories.cadre[0].coutGlobal).toBe('2000');
  });

  it('updateSalariesConfig existant écrit toujours sur l\'année affichée', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    act(() => result.current.setSelectedYear(2026));

    act(() => result.current.updateSalariesConfig(3, config('3000')));

    expect(result.current.allData[2026][3].salariesConfig?.categories.cadre[0].coutGlobal).toBe('3000');
  });
});
