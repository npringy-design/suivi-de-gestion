import { describe, expect, it } from 'vitest';

import { computePayrollMetrics, computeVariation, resolvePayroll } from './payrollCalculations';
import { PAYROLL_MEASURES } from './payrollMeasures';

const metricsOf = (auto: Parameters<typeof resolvePayroll>[1]) => computePayrollMetrics(resolvePayroll(undefined, auto), null)!;
const row = (measure: 'cost' | 'etp', key: string) => PAYROLL_MEASURES[measure].detailRows.find(r => r.key === key)!;

describe('lignes de détail par grandeur', () => {
  it('coût : pas d\'ETP ; ETP : pas de coût global / brut / charges', () => {
    expect(PAYROLL_MEASURES.cost.detailRows.map(r => r.key)).toEqual(['totalCost', 'gross', 'employerCharges', 'chargesRatePct', 'otherAdjustments']);
    expect(PAYROLL_MEASURES.etp.detailRows.map(r => r.key)).toEqual(['etp', 'costPerEtp', 'hours']);
  });

  it('autres ajustements = coût global − brut − charges (Supp. coût du PDF)', () => {
    const m = metricsOf({ totalCost: 45521.82, hours: 0, gross: 38091.35, employerCharges: 9244.53 });
    expect(row('cost', 'otherAdjustments').value(m)).toBeCloseTo(-1814.06, 2);
  });

  it('autres ajustements indisponibles sans brut ni charges', () => {
    expect(row('cost', 'otherAdjustments').value(metricsOf({ totalCost: 1000, hours: 0 }))).toBeNull();
  });

  it('% charges : écart en points', () => {
    const chargesRate = row('cost', 'chargesRatePct');
    const a = metricsOf({ totalCost: 1, hours: 0, gross: 1000, employerCharges: 240 });
    const b = metricsOf({ totalCost: 1, hours: 0, gross: 1000, employerCharges: 250 });
    const variation = computeVariation(chargesRate.value(b), chargesRate.value(a), chargesRate.kind === 'ratio')!;
    expect(variation.delta).toBeCloseTo(1, 4);
    expect(variation.pct).toBeNull();
    expect(chargesRate.formatDelta(variation.delta)).toBe('+1,0 pt');
  });

  it('heures : reprises de la source auto', () => {
    expect(row('etp', 'hours').value(metricsOf({ totalCost: 1, hours: 2294.86, etp: 17.13 }))).toBe(2294.86);
  });
});
