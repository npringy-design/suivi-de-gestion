import { describe, expect, it } from 'vitest';

import type { MonthData, PayrollMonthEntry } from '@/types/dataTypes';

import {
  buildRollingSeries,
  compareMetrics,
  compareToBudget,
  computePayrollMetrics,
  resolvePayroll,
} from './payrollCalculations';
import { getAutoPayrollFromConfig } from './payrollSources';

// Chiffres de référence : septembre 2025 et septembre 2026.
const sept25: PayrollMonthEntry = { gross: 35676.92, employerCharges: 8296.73 };
const sept26: PayrollMonthEntry = { gross: 38091.35, employerCharges: 9244.53 };

const metrics = (entry: PayrollMonthEntry | undefined, revenue: number | null, hours?: number) =>
  computePayrollMetrics(resolvePayroll(entry && hours ? { ...entry, hours } : entry, null), revenue);

describe('computePayrollMetrics', () => {
  it('calcule coût global et % de charges patronales (sept. 2025)', () => {
    const m = metrics(sept25, null)!;
    expect(m.totalCost).toBeCloseTo(43973.65, 2);
    expect(m.chargesRatePct).toBeCloseTo(23.255, 2);
    expect(m.grossToRevenuePct).toBeNull();
  });

  it('calcule les ratios sur CA et le coût horaire moyen', () => {
    const m = metrics(sept26, 130000, 1000)!;
    expect(m.totalCost).toBeCloseTo(47335.88, 2);
    expect(m.grossToRevenuePct).toBeCloseTo(29.301, 2);
    expect(m.totalCostToRevenuePct).toBeCloseTo(36.412, 2);
    expect(m.hourlyCost).toBeCloseTo(47.33588, 4);
  });

  it('un CA nul ou absent donne des ratios null (pas de division par zéro)', () => {
    expect(metrics(sept26, 0)!.grossToRevenuePct).toBeNull();
  });

  it('retourne null sans aucune donnée', () => {
    expect(metrics(undefined, 100)).toBeNull();
  });
});

describe('resolvePayroll (reprise de Config Salaires)', () => {
  const auto = { totalCost: 47335.88, hours: 1100 };

  it('sans saisie : coût global et heures repris, brut/charges inconnus', () => {
    const resolved = resolvePayroll(undefined, auto)!;
    expect(resolved).toEqual({ gross: null, employerCharges: null, totalCost: 47335.88, hours: 1100 });
    const m = computePayrollMetrics(resolved, 130000)!;
    expect(m.totalCostToRevenuePct).toBeCloseTo(36.412, 2);
    expect(m.grossToRevenuePct).toBeNull();
    expect(m.chargesRatePct).toBeNull();
  });

  it('brut saisi : charges déduites du coût global (sept. 2026)', () => {
    const resolved = resolvePayroll({ gross: 38091.35 }, auto)!;
    expect(resolved.employerCharges).toBeCloseTo(9244.53, 2);
    expect(computePayrollMetrics(resolved, null)!.chargesRatePct).toBeCloseTo(24.27, 2);
  });

  it('charges saisies : brut déduit', () => {
    expect(resolvePayroll({ employerCharges: 9244.53 }, auto)!.gross).toBeCloseTo(38091.35, 2);
  });

  it('brut et charges saisis : la saisie prime sur Config Salaires', () => {
    expect(resolvePayroll(sept26, { totalCost: 1, hours: 0 })!.totalCost).toBeCloseTo(47335.88, 2);
  });

  it('heures saisies prioritaires sur celles de Config Salaires', () => {
    expect(resolvePayroll({ gross: 1, hours: 900 }, auto)!.hours).toBe(900);
  });
});

describe('getAutoPayrollFromConfig', () => {
  it('somme coût global et heures de tous les salariés', () => {
    const monthData = {
      salariesConfig: {
        locked: false,
        categories: {
          cadre: [{ nom: 'A', heures: '151,67', coutGlobal: '4 000,50', provision: '', coutHoraire: '' }],
          niv12: [{ nom: 'B', heures: '100', coutGlobal: '2000', provision: '', coutHoraire: '' }, { nom: '', heures: '', coutGlobal: '', provision: '', coutHoraire: '' }],
        },
      },
    } as unknown as MonthData;
    const auto = getAutoPayrollFromConfig(monthData)!;
    expect(auto.totalCost).toBeCloseTo(6000.5, 2);
    expect(auto.hours).toBeCloseTo(251.67, 2);
  });

  it('null si rien de renseigné', () => {
    expect(getAutoPayrollFromConfig(undefined)).toBeNull();
    expect(getAutoPayrollFromConfig({ salariesConfig: { locked: false, categories: {} } } as unknown as MonthData)).toBeNull();
  });
});

describe('compareMetrics', () => {
  it('variation sept. 2026 vs sept. 2025 : brut, charges, coût global', () => {
    const cmp = compareMetrics(metrics(sept26, null)!, metrics(sept25, null));
    expect(cmp.gross!.delta).toBeCloseTo(2414.43, 2);
    expect(cmp.gross!.pct).toBeCloseTo(6.767, 2);
    expect(cmp.employerCharges!.delta).toBeCloseTo(947.8, 2);
    expect(cmp.employerCharges!.pct).toBeCloseTo(11.424, 2);
    expect(cmp.totalCost!.delta).toBeCloseTo(3362.23, 2);
    expect(cmp.totalCost!.pct).toBeCloseTo(7.646, 2);
    expect(cmp.grossToRevenuePct).toBeUndefined();
  });

  it('ratios : variation en points, sans pourcentage relatif', () => {
    const cmp = compareMetrics(metrics(sept26, 130000)!, metrics(sept25, 120000)!);
    expect(cmp.grossToRevenuePct!.delta).toBeCloseTo(29.301 - 29.731, 2);
    expect(cmp.grossToRevenuePct!.pct).toBeNull();
  });

  it('indicateur manquant d\'un côté : pas de variation (pas de faux zéro)', () => {
    const onlyTotal = computePayrollMetrics(resolvePayroll(undefined, { totalCost: 43973.65, hours: 0 }), null)!;
    const cmp = compareMetrics(metrics(sept26, null)!, onlyTotal);
    expect(cmp.gross).toBeUndefined();
    expect(cmp.totalCost!.delta).toBeCloseTo(3362.23, 2);
  });

  it('sans référence : aucune variation', () => {
    expect(compareMetrics(metrics(sept26, null)!, null)).toEqual({});
  });
});

describe('compareToBudget', () => {
  it('brut seul si pas de budget charges', () => {
    const cmp = compareToBudget(metrics(sept26, null)!, { ...sept26, budgetGross: 37000 });
    expect(cmp.gross!.delta).toBeCloseTo(1091.35, 2);
    expect(cmp.totalCost).toBeUndefined();
  });

  it('coût global comparé si budget charges saisi', () => {
    const cmp = compareToBudget(metrics(sept26, null)!, { ...sept26, budgetGross: 37000, budgetEmployerCharges: 9000 });
    expect(cmp.totalCost!.delta).toBeCloseTo(47335.88 - 46000, 2);
  });

  it('aucun budget : rien', () => {
    expect(compareToBudget(metrics(sept26, null)!, sept26)).toEqual({});
  });
});

describe('buildRollingSeries', () => {
  it('12 mois glissants, à cheval sur deux années', () => {
    const entries: Record<string, PayrollMonthEntry> = { '2025-09': sept25, '2026-01': sept26 };
    const series = buildRollingSeries(2026, 1, (y, m) => resolvePayroll(entries[`${y}-${String(m + 1).padStart(2, '0')}`], null), () => null);
    expect(series).toHaveLength(12);
    expect(series[0].key).toBe('2025-03');
    expect(series[11].key).toBe('2026-02');
    expect(series.find(p => p.key === '2025-09')!.gross).toBe(35676.92);
    expect(series.find(p => p.key === '2025-10')!.gross).toBeNull();
  });
});
