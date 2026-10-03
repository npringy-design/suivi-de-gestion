import { describe, expect, it } from 'vitest';

import type { MonthData } from '@/types/dataTypes';

import { getAutoPayrollFromConfig, getForfaitsJourCount, getRealPayrollFromConfig } from './payrollSources';

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

describe('ETP lu dans Masse Salariale', () => {
  const monthWithTotals = (totals: Record<string, number>): MonthData =>
    ({ salariesConfig: { locked: false, categories: {}, totals: { brut: 1, chargesPatronales: 1, coutGlobal: 2, ...totals } } }) as unknown as MonthData;
  // Réel de septembre 2026 (index 8) rangé sur octobre (index 9).
  const real = (totals: Record<string, number>, year = 2026, month = 8) =>
    getRealPayrollFromConfig({ [year]: { [month + 1]: monthWithTotals(totals) } }, year, month)!;

  it('ETP exact du PDF : non estimé', () => {
    const auto = real({ heures: 2294.86, etp: 17.13 });
    expect(auto.etp).toBe(17.13);
    expect(auto.etpEstimated).toBeUndefined();
  });

  it('sans ETP exact : heures ÷ 151,67 + forfaits jour du réglage par défaut, marqué estimé', () => {
    const auto = real({ heures: 2294.86 });
    expect(auto.etp).toBeCloseTo(17.13, 2);
    expect(auto.etpEstimated).toBe(true);
  });

  it('forfaits jour : la dernière période antérieure ou égale au mois s\'applique', () => {
    const periods = [{ from: '2000-01', count: 1 }, { from: '2025-09', count: 2 }];
    expect(getForfaitsJourCount(periods, 2025, 7)).toBe(1);
    expect(getForfaitsJourCount(periods, 2025, 8)).toBe(2);
    expect(getForfaitsJourCount(periods, 2026, 0)).toBe(2);
    expect(getForfaitsJourCount([], 2026, 0)).toBe(0);
    const august = getRealPayrollFromConfig({ 2025: { 8: monthWithTotals({ heures: 1516.7 }) } }, 2025, 7, periods)!;
    expect(august.etp).toBeCloseTo(11, 2);
  });

  it('ni ETP ni heures : pas d\'ETP', () => {
    expect(real({}).etp).toBeUndefined();
  });
});

describe('totaux du PDF (salariesConfig.totals)', () => {
  const withTotals = (): MonthData =>
    ({
      salariesConfig: {
        locked: false,
        categories: { cadre: [{ nom: 'A', heures: '100', coutGlobal: '1 000', provision: '', coutHoraire: '' }] },
        totals: { brut: 38091.35, chargesPatronales: 9244.53, coutGlobal: 45521.82, heures: 2294.86 },
      },
    }) as unknown as MonthData;

  it('les totaux priment sur la somme des salariés', () => {
    const auto = getAutoPayrollFromConfig(withTotals())!;
    expect(auto).toEqual({ totalCost: 45521.82, hours: 2294.86, gross: 38091.35, employerCharges: 9244.53 });
  });

  it('heures de repli : somme des catégories si le PDF n\'en donne pas', () => {
    const monthData = withTotals();
    delete monthData.salariesConfig!.totals!.heures;
    expect(getAutoPayrollFromConfig(monthData)!.hours).toBe(100);
  });

  it('sans totaux (import ancien) : repli sur la somme des salariés, brut/charges absents', () => {
    expect(getAutoPayrollFromConfig(monthWithCost('1 000', '10'))).toEqual({ totalCost: 1000, hours: 10 });
  });

  it('le réel de septembre expose brut et charges lus sur octobre', () => {
    const real = getRealPayrollFromConfig({ 2026: { 9: withTotals() } }, 2026, 8)!;
    expect(real.gross).toBe(38091.35);
    expect(real.employerCharges).toBe(9244.53);
  });
});
