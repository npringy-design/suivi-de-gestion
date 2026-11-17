import { describe, expect, it } from 'vitest';

import type { MonthData } from '@/types/dataTypes';
import { getDashboardRowIndices } from '@/lib/utils';
import { parseMoneyValue } from '@/lib/money';
import { buildMonthRows } from '@/features/dashboard/dashboardRows';
import { buildDynamicColumns } from '@/features/dashboard/dashboardColumns';
import { computeDashboardData } from '@/features/dashboard/dashboardCalculations';
import { COL, HOURS_REALISE_CUISINE_SALLE } from '@/features/dashboard/dashboardColumnIndex';
import { computeMonthlyResults } from '@/features/dashboard/monthlyResults';
import { resolvePersonnelSchema } from '@/features/dashboard/personnelSchema';
import {
  computeMonthDashboard,
  getAutoRealiseValues,
  getCaRealiseMonth,
  getLimonadeMonthStats,
} from '@/features/edg/edgRealtimeSources';

// Un même mois doit donner les mêmes chiffres sur toutes les pages :
// - Suivi quotidien et Accueil : computeDashboardData avec resolvePersonnelSchema (Dashboard.tsx, Home.tsx) ;
// - EDG, Récap annuel, Reporting : computeMonthDashboard (+ getAutoRealiseValues pour l'EDG réalisé) ;
// - bloc Résultats mensuels : computeMonthlyResults.
const YEAR = 2026;
const MONTH = 10; // novembre 2026

const buildMonth = (withLimonade: boolean): MonthData => {
  const idx = getDashboardRowIndices(MONTH, YEAR);
  const dashboard: Record<string, string> = {};
  for (let day = 2; day <= 14; day += 1) {
    const r = idx[day];
    dashboard[`${r}-${COL.BUDGET_CVTS_MIDI}`] = '60';
    dashboard[`${r}-${COL.BUDGET_TM_MIDI}`] = '24';
    dashboard[`${r}-${COL.BUDGET_CVTS_SOIR}`] = '70';
    dashboard[`${r}-${COL.BUDGET_TM_SOIR}`] = '26';
    dashboard[`${r}-${COL.REALISE_CA_VAE}`] = '50';
    dashboard[`${r}-${COL.REALISE_CA_MIDI}`] = String(1400 + day);
    dashboard[`${r}-${COL.REALISE_CA_SOIR}`] = String(1800 + day);
    dashboard[`${r}-${COL.REALISE_CVTS_MIDI}`] = '58';
    dashboard[`${r}-${COL.REALISE_CVTS_SOIR}`] = '71';
    dashboard[`${r}-${COL.ACHAT_PREMIER + 4}`] = '310,50';
    // Heures réalisées cuisine/salle (sans personnelSchema enregistré : cas d'un mois saisi à la main).
    dashboard[`${r}-${HOURS_REALISE_CUISINE_SALLE[0]}`] = '8';
    dashboard[`${r}-${HOURS_REALISE_CUISINE_SALLE[5]}`] = '20h30';
    if (withLimonade) {
      dashboard[`${r}-${COL.BUDGET_CVTS_LIMONADE}`] = '30';
      dashboard[`${r}-${COL.BUDGET_TM_LIMONADE}`] = '9';
      dashboard[`${r}-${COL.REALISE_CA_LIMONADE}`] = '280';
      dashboard[`${r}-${COL.REALISE_CVTS_LIMONADE}`] = '31';
    }
  }
  dashboard['fg-data-0-0-0-3'] = '120';
  dashboard['fg-data-1-2-0-3'] = '45,30';
  dashboard[`${idx[3]}-${COL.CONTRAT_NOM}`] = 'Caisse';
  dashboard[`${idx[3]}-${COL.CONTRAT_MONTANT}`] = '300';
  dashboard[`${idx[4]}-${COL.CONTRAT_MONTANT}`] = '200';
  return {
    dashboard,
    salariesConfig: { locked: false, categories: {}, tauxCibles: { cadre: 30, maitrise: 20, niv12: 15, niv3: 17, apprenti: 9 } },
  } as unknown as MonthData;
};

const sumDays = (data: Record<string, string>, col: number) =>
  Object.values(getDashboardRowIndices(MONTH, YEAR)).reduce((sum, r) => sum + parseMoneyValue(data[`${r}-${col}`]), 0);

describe.each([
  ['Hippo (sans limonade)', false],
  ['Au Bureau (avec limonade)', true],
])('cohérence entre pages : %s', (_label, hasLimonade) => {
  const monthData = buildMonth(hasLimonade);
  const rows = buildMonthRows(YEAR, MONTH);
  const mt = rows.findIndex(r => r.type === 'month_total');
  const dynamicColumns = buildDynamicColumns(monthData.salariesConfig?.categories, {});

  // Chemin Suivi quotidien / Accueil.
  const suivi = computeDashboardData(
    monthData.dashboard ?? {}, rows, dynamicColumns, monthData.salariesConfig?.categories,
    resolvePersonnelSchema(monthData), undefined, monthData.salariesConfig?.tauxCibles, hasLimonade,
  );
  // Chemin EDG / Récap / Reporting.
  const edg = computeMonthDashboard(monthData, MONTH, YEAR, hasLimonade);
  const auto = getAutoRealiseValues(edg, MONTH, YEAR);
  const resultats = computeMonthlyResults({
    calculatedData: suivi, cellData: monthData.dashboard ?? {}, rows, dynamicColumns,
    caN1: null, previousStockFinal: undefined, objectifFoodCost: undefined, hasLimonade,
  });
  const v = (data: Record<string, string>, col: number) => parseMoneyValue(data[`${mt}-${col}`]);

  it('CA réalisé identique (Suivi, EDG/Récap, jours, Résultats mensuels)', () => {
    const ca = v(suivi, COL.REALISE_CA_JOUR);
    const expected = sumDays(monthData.dashboard ?? {}, COL.REALISE_CA_VAE) + sumDays(monthData.dashboard ?? {}, COL.REALISE_CA_MIDI)
      + sumDays(monthData.dashboard ?? {}, COL.REALISE_CA_SOIR) + (hasLimonade ? sumDays(monthData.dashboard ?? {}, COL.REALISE_CA_LIMONADE) : 0);
    expect(ca).toBeCloseTo(expected, 2);
    expect(getCaRealiseMonth(edg, MONTH, YEAR)).toBeCloseTo(ca, 2);
    expect(v(edg, COL.REALISE_CA_JOUR)).toBeCloseTo(ca, 2);
    expect(parseMoneyValue(resultats.ca_realise)).toBeCloseTo(ca, 2);
  });

  it('CA budget et couverts identiques', () => {
    expect(v(edg, COL.BUDGET_CA_JOUR)).toBeCloseTo(v(suivi, COL.BUDGET_CA_JOUR), 2);
    expect(v(edg, COL.REALISE_CVTS_JOUR)).toBe(v(suivi, COL.REALISE_CVTS_JOUR));
    expect(Number(resultats.cvts_resto)).toBe(v(suivi, COL.REALISE_CVTS_JOUR));
  });

  it('achats identiques (Suivi, EDG réalisé, Résultats mensuels)', () => {
    const achats = v(suivi, COL.ACHAT_TOTAL);
    expect(achats).toBeCloseTo(13 * 310.5, 2);
    expect(-auto.achats_food).toBeCloseTo(achats, 2);
    expect(parseMoneyValue(resultats.rm_achat_total)).toBeCloseTo(achats, 2);
  });

  it('masse salariale identique et non nulle sans schéma enregistré', () => {
    const cout = v(suivi, COL.COUT_REALISE);
    expect(cout).toBeGreaterThan(0);
    expect(v(edg, COL.COUT_REALISE)).toBeCloseTo(cout, 2);
    expect(-auto.cout_salaires).toBeCloseTo(cout, 2);
  });

  it('frais généraux et contrats reportés une seule fois dans l\'EDG', () => {
    expect(auto.entretien_locaux).toBeCloseTo(-120, 2);
    expect(auto.honoraires_divers).toBeCloseTo(-45.3, 2);
    expect(auto.contrats_maintenance).toBeCloseTo(-500, 2);
  });

  it('limonade : présente seulement pour un site qui en a', () => {
    const stats = getLimonadeMonthStats(edg, MONTH, YEAR);
    expect(stats.realise.ca).toBeCloseTo(hasLimonade ? 13 * 280 : 0, 2);
    expect(stats.budget.cvts).toBe(hasLimonade ? 13 * 30 : 0);
  });
});
