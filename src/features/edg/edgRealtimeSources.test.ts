import { describe, expect, it } from 'vitest';

import { getDashboardRowIndices } from '@/lib/utils';
import type { MonthData } from '@/types/dataTypes';

import {
  computeMonthDashboard,
  getAutoRealiseValues,
  getCaBudgetMonth,
  getCaRealiseMonth,
  getMonthProgress,
} from './edgRealtimeSources';

const YEAR = 2026;
const MONTH = 0; // janvier 2026 : 31 jours, dimanche 4 janvier => ligne "Total Semaine" insérée

describe('edgRealtimeSources', () => {
  it('somme la colonne 21 sur les lignes jour en ignorant une ligne Total Semaine', () => {
    const indices = getDashboardRowIndices(MONTH, YEAR);
    const md: Record<string, string> = {};
    md[`${indices[1]}-21`] = '100';
    md[`${indices[2]}-21`] = '200';
    // La ligne "Total Semaine" du 4 janvier (dimanche) est juste après rIdx du jour 4 : elle ne doit pas être comptée.
    const totalWeekRowIdx = indices[4] + 1;
    md[`${totalWeekRowIdx}-21`] = '99999';

    expect(getCaRealiseMonth(md, MONTH, YEAR)).toBe(300);
  });

  it('somme la colonne 3 pour le budget du mois', () => {
    const indices = getDashboardRowIndices(MONTH, YEAR);
    const md: Record<string, string> = {};
    md[`${indices[1]}-3`] = '1000';
    md[`${indices[2]}-3`] = '2000';

    expect(getCaBudgetMonth(md, MONTH, YEAR)).toBe(3000);
  });

  it('retourne les coûts en négatif (achats food, salaires)', () => {
    const indices = getDashboardRowIndices(MONTH, YEAR);
    const md: Record<string, string> = {};
    md[`${indices[1]}-58`] = '500';
    md[`${indices[1]}-87`] = '1200';

    const auto = getAutoRealiseValues(md, MONTH, YEAR);
    expect(auto.achats_food).toBe(-500);
    expect(auto.cout_salaires).toBe(-1200);
  });

  it('reporte les catégories Frais Généraux sur les lignes EDG rattachées (rattachement par défaut)', () => {
    const md: Record<string, string> = {
      'fg-total-0-0': '150,00 €', // Entretien et réparation → entretien_locaux
      'fg-total-0-1': '80,00 €', // Ecolab → nettoyage_locaux
      'fg-total-1-1': '20,00 €', // HACCP → honoraires_divers
      'fg-total-3-2': '30,00 €', // Divers → honoraires_divers
    };
    const auto = getAutoRealiseValues(md, MONTH, YEAR);
    expect(auto.entretien_locaux).toBe(-150);
    expect(auto.nettoyage_locaux).toBe(-80);
    expect(auto.honoraires_divers).toBe(-50);
  });

  it('suit le rattachement du site, catégorie vide = non reportée', () => {
    const md: Record<string, string> = { 'fg-total-0-0': '150,00 €', 'fg-total-2-2': '40,00 €' };
    const auto = getAutoRealiseValues(md, MONTH, YEAR, { edgFgMapping: { '0-0': 'materiel_outillage', '2-2': '' } });
    expect(auto.materiel_outillage).toBe(-150);
    expect(auto.entretien_locaux).toBeUndefined();
    expect(auto.energie).toBeUndefined();
  });

  it('contrats importés (col 107, lignes jour) prioritaires sur les frais fixes du site, totaux exclus', () => {
    // Janvier 2026 : ligne 12 = total semaine (remplie par computeDashboardData), ignorée.
    const md: Record<string, string> = { '9-107': '900', '11-107': '100', '12-107': '1000' };
    const fixed = [{ id: 'a', label: 'Caisse', montant: 300, edgKey: 'ptt' }];
    const auto = getAutoRealiseValues(md, MONTH, YEAR, { fixedMonthlyCosts: fixed });
    expect(auto.contrats_maintenance).toBe(-1000);
    expect(auto.ptt).toBeUndefined();
  });

  it('frais fixes du site appliqués seulement aux mois ayant du CA réalisé', () => {
    const indices = getDashboardRowIndices(MONTH, YEAR);
    const fixed = [
      { id: 'a', label: 'Caisse', montant: 300, edgKey: 'ptt' },
      { id: 'b', label: 'Maintenance', montant: 200, edgKey: 'contrats_maintenance' },
    ];
    expect(getAutoRealiseValues({}, MONTH, YEAR, { fixedMonthlyCosts: fixed })).toEqual({});
    const md: Record<string, string> = { [`${indices[1]}-21`]: '5000' };
    const auto = getAutoRealiseValues(md, MONTH, YEAR, { fixedMonthlyCosts: fixed });
    expect(auto.ptt).toBe(-300);
    expect(auto.contrats_maintenance).toBe(-200);
  });

  it("n'inclut pas une clé quand aucune donnée source n'est renseignée", () => {
    const auto = getAutoRealiseValues({}, MONTH, YEAR);
    expect(auto).toEqual({});
  });

  it('calcule un avancement au prorata pondéré du budget CA', () => {
    const indices = getDashboardRowIndices(MONTH, YEAR);
    const md: Record<string, string> = {};
    md[`${indices[1]}-3`] = '1000';
    md[`${indices[2]}-3`] = '1000';
    md[`${indices[3]}-3`] = '1000';
    md[`${indices[1]}-21`] = '900'; // seul le jour 1 est renseigné

    const progress = getMonthProgress(md, MONTH, YEAR);
    expect(progress).toBeCloseTo(1000 / 3000, 5);
  });

  it('retombe sur le ratio jours renseignés / jours du mois si le budget CA est nul', () => {
    const indices = getDashboardRowIndices(MONTH, YEAR);
    const numDays = Object.keys(indices).length;
    const md: Record<string, string> = {};
    md[`${indices[1]}-21`] = '500';
    md[`${indices[2]}-21`] = '500';

    const progress = getMonthProgress(md, MONTH, YEAR);
    expect(progress).toBeCloseTo(2 / numDays, 5);
  });

  it('retourne 0 quand aucun jour n\'est renseigné', () => {
    expect(getMonthProgress({}, MONTH, YEAR)).toBe(0);
  });

  describe('computeMonthDashboard', () => {
    it('calcule les colonnes dérivées (col 21) à partir des cellules de saisie (col 18/19)', () => {
      const indices = getDashboardRowIndices(MONTH, YEAR);
      const seed: Record<string, string> = {};
      seed[`${indices[1]}-18`] = '300'; // réalisé midi
      seed[`${indices[1]}-19`] = '150'; // réalisé soir

      const monthData = { dashboard: seed } as MonthData;
      const computed = computeMonthDashboard(monthData, MONTH, YEAR);

      expect(computed[`${indices[1]}-21`]).toBe('450.00');
      expect(getCaRealiseMonth(computed, MONTH, YEAR)).toBe(450);
    });

    it('retourne un objet vide si le mois n\'a pas de dashboard saisi', () => {
      expect(computeMonthDashboard(undefined, MONTH, YEAR)).toEqual({});
      expect(computeMonthDashboard({ dashboard: {} } as MonthData, MONTH, YEAR)).toEqual({});
    });
  });
});
