import { describe, expect, it } from 'vitest';

import type { MonthData } from '@/types/dataTypes';

import { getAutoPayrollFromConfig, getRealPayrollFromConfig } from './payrollSources';

const monthWithCost = (coutGlobal: string, heures: string): MonthData =>
  ({
    salariesConfig: {
      locked: false,
      categories: { cadre: [{ nom: 'A', heures, coutGlobal, provision: '', coutHoraire: '' }] },
    },
  }) as unknown as MonthData;

describe('getRealPayrollFromConfig', () => {
  it('le réel de septembre (index 8) est lu sur Config Salaires d\'octobre (index 9)', () => {
    const allData = { 2026: { 8: monthWithCost('1 000', '10'), 9: monthWithCost('47 335,88', '1100') } };
    const real = getRealPayrollFromConfig(allData, 2026, 8)!;
    expect(real.totalCost).toBeCloseTo(47335.88, 2);
    expect(real.hours).toBe(1100);
    // Le mois même (sémantique projection) reste lu par getAutoPayrollFromConfig.
    expect(getAutoPayrollFromConfig(allData[2026][8])!.totalCost).toBe(1000);
  });

  it('le réel de décembre est lu sur janvier de l\'année suivante', () => {
    const allData = { 2026: { 11: monthWithCost('1', '1') }, 2027: { 0: monthWithCost('52 000', '1200') } };
    expect(getRealPayrollFromConfig(allData, 2026, 11)!.totalCost).toBe(52000);
  });

  it('mois suivant absent : null (pas de repli sur le mois même)', () => {
    expect(getRealPayrollFromConfig({ 2026: { 8: monthWithCost('1 000', '10') } }, 2026, 8)).toBeNull();
  });
});
