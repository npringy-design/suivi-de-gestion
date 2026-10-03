import { describe, expect, it } from 'vitest';

import { computeYearSummary } from './payrollYearSummary';

const empty = Array.from({ length: 12 }, () => ({ totalCost: null, revenue: null }));
const withMonths = (values: Record<number, [number | null, number | null]>) =>
  empty.map((row, index) => (values[index] ? { totalCost: values[index][0], revenue: values[index][1] } : row));

describe('computeYearSummary', () => {
  it('cumule coût et CA, ratio sur les mois ayant les deux', () => {
    const rows = withMonths({ 0: [54200, 168000], 1: [53100, 159000], 2: [57800, null], 3: [null, 176000] });
    const summary = computeYearSummary(rows, empty, 34);
    expect(summary.costTotal).toBe(165100);
    expect(summary.costMonths).toBe(3);
    expect(summary.revenueTotal).toBe(503000);
    expect(summary.revenueMonths).toBe(3);
    expect(summary.comparableMonths).toBe(2);
    expect(summary.ratioPct).toBeCloseTo((107300 / 327000) * 100, 4);
  });

  it('compte les mois au-dessus du seuil', () => {
    const rows = withMonths({ 0: [34000, 100000], 1: [35000, 100000], 2: [33000, 100000] });
    expect(computeYearSummary(rows, empty, 34).monthsOverThreshold).toBe(1);
  });

  it('variation vs N-1 sur les mêmes mois uniquement', () => {
    const rows = withMonths({ 0: [30000, 100000], 1: [40000, 100000] });
    const lastYear = withMonths({ 0: [33000, 100000], 5: [90000, 100000] });
    // Seul janvier est comparable des deux côtés : 30 % vs 33 %.
    expect(computeYearSummary(rows, lastYear, 34).ratioDeltaVsLastYearPt).toBeCloseTo(-3, 6);
  });

  it('aucune donnée : ratio et variation null', () => {
    const summary = computeYearSummary(empty, empty, 34);
    expect(summary.ratioPct).toBeNull();
    expect(summary.ratioDeltaVsLastYearPt).toBeNull();
    expect(summary.monthsOverThreshold).toBe(0);
  });
});
