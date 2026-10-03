import { describe, expect, it } from 'vitest';

import { computeCostEvolution } from './payrollCostEvolution';

const empty = Array.from({ length: 12 }, () => ({ totalCost: null as number | null }));
const withMonths = (values: Record<number, number>) =>
  empty.map((row, index) => (values[index] !== undefined ? { totalCost: values[index] } : row));

describe('computeCostEvolution', () => {
  it('cumule le coût des mois renseignés', () => {
    const evolution = computeCostEvolution(withMonths({ 0: 1000, 1: 2000 }), empty);
    expect(evolution.costTotal).toBe(3000);
    expect(evolution.costMonths).toBe(2);
    expect(evolution.vsLastYearDelta).toBeNull();
  });

  it('compare à N-1 sur les seuls mois renseignés des deux années', () => {
    const rows = withMonths({ 0: 44000, 1: 46000, 2: 47335.88 });
    const lastYear = withMonths({ 0: 42000, 2: 43973.65, 7: 90000 });
    const evolution = computeCostEvolution(rows, lastYear);
    expect(evolution.comparableMonths).toBe(2);
    expect(evolution.comparableCost).toBeCloseTo(91335.88, 2);
    expect(evolution.comparableLastYearCost).toBeCloseTo(85973.65, 2);
    expect(evolution.vsLastYearDelta).toBeCloseTo(5362.23, 2);
    expect(evolution.vsLastYearPct).toBeCloseTo(6.237, 2);
  });

  it('dernier mois renseigné vs mois précédent', () => {
    const evolution = computeCostEvolution(withMonths({ 7: 43973.65, 8: 47335.88 }), empty);
    expect(evolution.latestMonth).toBe(8);
    expect(evolution.vsPreviousDelta).toBeCloseTo(3362.23, 2);
    expect(evolution.vsPreviousPct).toBeCloseTo(7.646, 2);
  });

  it('janvier se compare à décembre N-1', () => {
    const evolution = computeCostEvolution(withMonths({ 0: 50000 }), withMonths({ 11: 40000 }));
    expect(evolution.previousCost).toBe(40000);
    expect(evolution.vsPreviousPct).toBeCloseTo(25, 6);
  });

  it('mois précédent absent : pas de variation', () => {
    const evolution = computeCostEvolution(withMonths({ 5: 50000 }), empty);
    expect(evolution.vsPreviousDelta).toBeNull();
    expect(evolution.vsPreviousPct).toBeNull();
  });

  it('aucune donnée', () => {
    const evolution = computeCostEvolution(empty, empty);
    expect(evolution.latestMonth).toBeNull();
    expect(evolution.costTotal).toBe(0);
  });
});
