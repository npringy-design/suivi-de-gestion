import { describe, expect, it } from 'vitest';

import type { SalarieRow } from '@/types/dataTypes';

import { createBlankSalarieRow, moveSalarieRow } from './salaryCategoryMove';
import type { SalariesByCategory } from './salaryCategoryMove';

const row = (nom: string, extra: Partial<SalarieRow> = {}): SalarieRow => ({
  nom,
  heures: '100',
  coutGlobal: '3000',
  provision: '',
  coutHoraire: '',
  ...extra,
});

const categories = (overrides: Partial<SalariesByCategory> = {}): SalariesByCategory => ({
  cadre: [createBlankSalarieRow()],
  maitrise: [createBlankSalarieRow()],
  niv12: [createBlankSalarieRow()],
  niv3: [createBlankSalarieRow()],
  apprenti: [createBlankSalarieRow()],
  ...overrides,
});

describe('moveSalarieRow', () => {
  it('déplace la ligne complète et la place en dernier dans la catégorie cible', () => {
    const moved = row('Lea', { department: 'cuisine', importSourceLine: '000012 LEA 04/2026 ...' });
    const result = moveSalarieRow(
      categories({ niv12: [row('Samir'), moved, row('Jean')], niv3: [row('Chef A'), row('Chef B')] }),
      'niv12',
      1,
      'niv3',
    );

    expect(result.niv12.map(item => item.nom)).toEqual(['Samir', 'Jean']);
    expect(result.niv3.map(item => item.nom)).toEqual(['Chef A', 'Chef B', 'Lea']);
    expect(result.niv3[2]).toEqual(moved);
  });

  it('la catégorie cible qui ne contient que la ligne vide par défaut est remplacée', () => {
    const result = moveSalarieRow(categories({ niv12: [row('Lea')] }), 'niv12', 0, 'apprenti');

    expect(result.apprenti).toEqual([row('Lea')]);
  });

  it('la catégorie d\'origine devenue vide retrouve sa ligne vide par défaut', () => {
    const result = moveSalarieRow(categories({ cadre: [row('Nicolas')] }), 'cadre', 0, 'maitrise');

    expect(result.cadre).toEqual([createBlankSalarieRow()]);
    expect(result.maitrise).toEqual([row('Nicolas')]);
  });

  it('une cible avec une ligne partiellement remplie est conservée (la ligne déplacée s\'ajoute)', () => {
    const partial = { ...createBlankSalarieRow(), heures: '10' };
    const result = moveSalarieRow(categories({ niv12: [row('Lea')], niv3: [partial] }), 'niv12', 0, 'niv3');

    expect(result.niv3).toEqual([partial, row('Lea')]);
  });

  it('ne modifie pas les autres catégories ni l\'entrée', () => {
    const input = categories({ niv12: [row('Lea')], cadre: [row('Nicolas')] });
    const snapshot = JSON.stringify(input);
    const result = moveSalarieRow(input, 'niv12', 0, 'niv3');

    expect(result.cadre).toBe(input.cadre);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it('même catégorie ou index invalide : rien ne change', () => {
    const input = categories({ niv12: [row('Lea')] });

    expect(moveSalarieRow(input, 'niv12', 0, 'niv12')).toBe(input);
    expect(moveSalarieRow(input, 'niv12', 5, 'niv3')).toBe(input);
  });
});
