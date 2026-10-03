import { describe, expect, it } from 'vitest';

import type { PayrollMonthEntry } from '@/types/dataTypes';

import { buildRollingSeries, compareMetrics, compareToBudget, computePayrollMetrics } from './payrollCalculations';

// Chiffres de référence : septembre 2025 et septembre 2026.
const sept25: PayrollMonthEntry = { gross: 35676.92, employerCharges: 8296.73 };
const sept26: PayrollMonthEntry = { gross: 38091.35, employerCharges: 9244.53 };

describe('computePayrollMetrics', () => {
  it('calcule coût global et % de charges patronales (sept. 2025)', () => {
    const m = computePayrollMetrics(sept25, null)!;
    expect(m.totalCost).toBeCloseTo(43973.65, 2);
    expect(m.chargesRatePct).toBeCloseTo(23.255, 2);
    expect(m.grossToRevenuePct).toBeNull();
  });

  it('calcule les ratios sur CA et le coût horaire moyen', () => {
    const m = computePayrollMetrics({ ...sept26, hours: 1000 }, 130000)!;
    expect(m.totalCost).toBeCloseTo(47335.88, 2);
    expect(m.grossToRevenuePct).toBeCloseTo(29.301, 2);
    expect(m.totalCostToRevenuePct).toBeCloseTo(36.412, 2);
    expect(m.hourlyCost).toBeCloseTo(47.33588, 4);
  });

  it('un CA nul ou absent donne des ratios null (pas de division par zéro)', () => {
    expect(computePayrollMetrics(sept26, 0)!.grossToRevenuePct).toBeNull();
  });

  it('retourne null sans saisie', () => {
    expect(computePayrollMetrics(undefined, 100)).toBeNull();
  });
});

describe('compareMetrics', () => {
  it('variation sept. 2026 vs sept. 2025 : brut, charges, coût global', () => {
    const cmp = compareMetrics(computePayrollMetrics(sept26, null)!, computePayrollMetrics(sept25, null));
    expect(cmp.gross!.delta).toBeCloseTo(2414.43, 2);
    expect(cmp.gross!.pct).toBeCloseTo(6.767, 2);
    expect(cmp.employerCharges!.delta).toBeCloseTo(947.8, 2);
    expect(cmp.employerCharges!.pct).toBeCloseTo(11.424, 2);
    expect(cmp.totalCost!.delta).toBeCloseTo(3362.23, 2);
    expect(cmp.totalCost!.pct).toBeCloseTo(7.646, 2);
    expect(cmp.grossToRevenuePct).toBeUndefined();
  });

  it('ratios : variation en points, sans pourcentage relatif', () => {
    const cur = computePayrollMetrics(sept26, 130000)!;
    const ref = computePayrollMetrics(sept25, 120000)!;
    const cmp = compareMetrics(cur, ref);
    expect(cmp.grossToRevenuePct!.delta).toBeCloseTo(29.301 - 29.731, 2);
    expect(cmp.grossToRevenuePct!.pct).toBeNull();
  });

  it('sans référence : aucune variation', () => {
    expect(compareMetrics(computePayrollMetrics(sept26, null)!, null)).toEqual({});
  });
});

describe('compareToBudget', () => {
  it('brut seul si pas de budget charges', () => {
    const cmp = compareToBudget(computePayrollMetrics(sept26, null)!, { ...sept26, budgetGross: 37000 });
    expect(cmp.gross!.delta).toBeCloseTo(1091.35, 2);
    expect(cmp.totalCost).toBeUndefined();
  });

  it('coût global comparé si budget charges saisi', () => {
    const cmp = compareToBudget(computePayrollMetrics(sept26, null)!, { ...sept26, budgetGross: 37000, budgetEmployerCharges: 9000 });
    expect(cmp.totalCost!.delta).toBeCloseTo(47335.88 - 46000, 2);
  });

  it('aucun budget : rien', () => {
    expect(compareToBudget(computePayrollMetrics(sept26, null)!, sept26)).toEqual({});
  });
});

describe('buildRollingSeries', () => {
  it('12 mois glissants, à cheval sur deux années', () => {
    const series = buildRollingSeries(2026, 1, { '2025-09': sept25, '2026-01': sept26 }, () => null);
    expect(series).toHaveLength(12);
    expect(series[0].key).toBe('2025-03');
    expect(series[11].key).toBe('2026-02');
    expect(series.find(p => p.key === '2025-09')!.gross).toBe(35676.92);
    expect(series.find(p => p.key === '2025-10')!.gross).toBeNull();
  });
});
