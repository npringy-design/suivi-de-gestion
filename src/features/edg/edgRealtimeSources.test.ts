import { describe, expect, it } from 'vitest';

import { getDashboardRowIndices } from '@/lib/utils';
import {
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

  it('somme les colonnes Frais Généraux (97/101/105/107) sur toutes les lignes, pas seulement les jours', () => {
    const md: Record<string, string> = {
      '12-97': '150',
      '13-97': '50',
      '20-101': '80',
      '31-105': '300',
      '9-107': '900',
    };

    const auto = getAutoRealiseValues(md, MONTH, YEAR);
    expect(auto.entretien_locaux).toBe(-200);
    expect(auto.produits_entretien).toBe(-80);
    expect(auto.pub_locale).toBe(-300);
    expect(auto.contrats_maintenance).toBe(-900);
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
});
