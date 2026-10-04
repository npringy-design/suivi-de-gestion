import { describe, expect, it } from 'vitest';

import { buildPayrollCascade } from './payrollVarianceCascade';

describe('buildPayrollCascade', () => {
  it('échelle : cumul minimum − 5 %, arrondi à 500 €, barres flottantes enchaînées', () => {
    const cascade = buildPayrollCascade(43455.65, [2000, -500]);
    expect(cascade.min).toBe(41000); // 43 455,65 × 0,95 = 41 282 → 41 000
    expect(cascade.steps[0].left).toBeCloseTo(cascade.start.width, 4); // part là où la précédente s'arrête
    const [first, second] = cascade.steps;
    expect(second.left + second.width).toBeCloseTo(first.left + first.width, 4); // la baisse part du haut de la hausse
  });
});
