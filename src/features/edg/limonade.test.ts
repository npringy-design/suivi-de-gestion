import { afterEach, describe, expect, it } from 'vitest';

import { getDashboardRowIndices } from '@/lib/utils';
import { registerSite, setSitesRegistry, siteHasLimonade } from '@/lib/sites';
import type { MonthData } from '@/types/dataTypes';

import { computeMonthDashboard, getLimonadeMonthStats, getLimonadeTm, sumLimonadeStats } from './edgRealtimeSources';
import { buildLimonadeRows } from './limonadeRows';

const YEAR = 2026;
const MONTH = 0;

afterEach(() => setSitesRegistry([]));

describe('siteHasLimonade', () => {
  it('est vrai uniquement pour l\'enseigne Au Bureau', () => {
    registerSite({ siteId: 'au-bureau-reims', label: 'Au Bureau Reims', brand: 'au_bureau' });
    expect(siteHasLimonade('au-bureau-reims')).toBe(true);
    expect(siteHasLimonade('hippo_thillois')).toBe(false);
    expect(siteHasLimonade('hippo_cormontreuil')).toBe(false);
    expect(siteHasLimonade('inconnu')).toBe(false);
  });
});

describe('limonade dans les calculs', () => {
  const rIdx = getDashboardRowIndices(MONTH, YEAR)[5];
  const monthData = {
    dashboard: {
      [`${rIdx}-6`]: '10', [`${rIdx}-7`]: '20',
      [`${rIdx}-14`]: '4', [`${rIdx}-15`]: '5',
      [`${rIdx}-20`]: '30', [`${rIdx}-34`]: '3',
    },
  } as unknown as MonthData;

  it('calcule CA limonade = couverts × TM et l\'ajoute au total jour quand le site a une limonade', () => {
    const computed = computeMonthDashboard(monthData, MONTH, YEAR, true);
    expect(computed[`${rIdx}-2`]).toBe('20.00');
    expect(computed[`${rIdx}-3`]).toBe('220.00');
    expect(getLimonadeMonthStats(computed, MONTH, YEAR)).toEqual({
      budget: { ca: 20, cvts: 4 },
      realise: { ca: 30, cvts: 3 },
    });
  });

  it('ignore la limonade pour un site sans limonade', () => {
    const computed = computeMonthDashboard(monthData, MONTH, YEAR, false);
    expect(computed[`${rIdx}-2`]).toBe('');
    expect(computed[`${rIdx}-14`]).toBe('');
    expect(computed[`${rIdx}-3`]).toBe('200.00');
  });
});

describe('agrégation limonade', () => {
  const stats = (b: number, bc: number, r: number, rc: number) => ({ budget: { ca: b, cvts: bc }, realise: { ca: r, cvts: rc } });

  it('somme et calcule le TM sans diviser par zéro', () => {
    const total = sumLimonadeStats([stats(100, 10, 120, 12), stats(50, 5, 30, 3)]);
    expect(total).toEqual(stats(150, 15, 150, 15));
    expect(getLimonadeTm(total.budget)).toBe(10);
    expect(getLimonadeTm({ ca: 10, cvts: 0 })).toBe(0);
  });

  it('ne cumule que les mois clos dans le total à date', () => {
    const { rows, total } = buildLimonadeRows({
      statsByMonth: [stats(100, 10, 90, 9), stats(200, 20, 999, 99)],
      monthLabels: ['janv', 'févr'],
      mode: 'vsBudget',
      isMonthComplete: m => m === 0,
    });
    expect(rows).toHaveLength(2);
    expect(total.ref).toEqual({ ca: 100, cvts: 10 });
    expect(total.actual).toEqual({ ca: 90, cvts: 9 });
  });
});

describe('écart couverts (col 33)', () => {
  it('reste réalisé restaurant − budget restaurant, limonade exclue', () => {
    const rIdx = getDashboardRowIndices(MONTH, YEAR)[5];
    const md = {
      dashboard: {
        [`${rIdx}-6`]: '10', [`${rIdx}-7`]: '20',
        [`${rIdx}-14`]: '4', [`${rIdx}-15`]: '5',
        [`${rIdx}-18`]: '300', [`${rIdx}-25`]: '12',
        [`${rIdx}-34`]: '3',
      },
    } as unknown as MonthData;
    const computed = computeMonthDashboard(md, MONTH, YEAR, true);
    expect(computed[`${rIdx}-33`]).toBe('2');
    expect(computed[`${rIdx}-120`]).toBe('15');
    expect(computed[`${rIdx}-122`]).toBe(((15 - 14) / 14 * 100).toFixed(2));
  });
});
