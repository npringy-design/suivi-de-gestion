import { describe, expect, it } from 'vitest';

import type { MonthData, SalarieRow } from '../types/dataTypes';
import { buildCategoryReference } from '../features/dashboard/importHelpers/payrollCategoryReference';
import type { PayrollCategoryReference } from '../features/dashboard/importHelpers/payrollCategoryReference';
import { inferPersonnelFromJob } from '../features/dashboard/importHelpers/payrollJobCategories';
import {
  averagePayrollRate,
  buildPayrollCategories,
  buildPayrollRowsFromText,
  buildSalaryPreviewRows,
  getPayrollTargetPeriodFromText,
  parsePayrollLine,
  payrollNameKey,
} from '../features/dashboard/importHelpers/personnelSalaryImport';

// Lignes réelles du PDF « coûts salariaux » : matricule, nom, entrée, [sortie], emploi, période, valeurs de paie.
const LINE_PRINGY = '000019 PRINGY NICOLAS (forfait jour) 01/11/2021 DIRECTEUR 04/2026 4043.35 2063.74 51.04 -49.32 6057.77 333.46';
const LINE_MARTIAL = '000014 MARTIAL KIESHA 01/11/2021 ASSISTANT MANAGER 04/2026 148.92 17.33 166.25 2672.11 740.57 27.71 -124.94 3287.74 19.78';
const LINE_MARTIN = '000020 MARTIN SAMIR 02/03/2023 CHEF DE PARTIE 04/2026 140.00 12.00 152.00 2000.00 700.00 35.00 -10.00 2700.00 17.00';
const LINE_LEAVER = '00100 BOUMEDIENE MEROUANE Adybe 07/08/2026 22/09/2026 Apprenti serveur 09/2026 80.00 10.00 90.00 900.00 200.00 22.00 -5.00 1650.00 11.00';
const lineWithCost = (name: string, hours: number, cost: number, job = 'DIRECTEUR') =>
  `0001 ${name} 01/01/2020 ${job} 04/2026 ${hours - 10}.00 5.00 ${hours}.00 2500.00 400.00 30.00 -10.00 ${cost}.00 30.00`;

const row = (nom: string, heures = '100', coutGlobal = '3000', department?: SalarieRow['department']): SalarieRow => ({
  nom,
  heures,
  coutGlobal,
  provision: '',
  coutHoraire: '',
  department,
});

const monthWith = (categories: Record<string, SalarieRow[]>): MonthData =>
  ({ salariesConfig: { locked: false, categories } }) as unknown as MonthData;

const EMPTY_REFERENCE: PayrollCategoryReference = new Map();

describe('personnelSalaryImport', () => {
  it('detects the target month from the payroll PDF title', () => {
    const result = getPayrollTargetPeriodFromText('Coûts salariaux - Avril 2026');

    expect(result).toMatchObject({
      sourceMonth: 3,
      sourceYear: 2026,
      targetMonth: 4,
      targetYear: 2026,
      sourceLabel: 'avril 2026',
      targetLabel: 'mai 2026',
    });
  });

  it('moves December payroll to January of the next year', () => {
    const result = getPayrollTargetPeriodFromText('Coûts salariaux - Décembre 2026');

    expect(result).toMatchObject({
      sourceMonth: 11,
      sourceYear: 2026,
      targetMonth: 0,
      targetYear: 2027,
      sourceLabel: 'décembre 2026',
      targetLabel: 'janvier 2027',
    });
  });

  it('falls back to the most frequent numeric payroll month in table rows', () => {
    const result = getPayrollTargetPeriodFromText([
      'PRINGY NICOLAS 04/2026 151.67 6057.77',
      'MARTIAL KIESHA 04/2026 166.25 3287.74',
    ].join('\n'));

    expect(result).toMatchObject({ sourceMonth: 3, sourceYear: 2026, targetMonth: 4, targetYear: 2026 });
  });
});

describe('parsePayrollLine', () => {
  it('lit nom, entrée, sortie et emploi sans prendre le jour/mois d\'une date pour la période', () => {
    expect(parsePayrollLine(LINE_LEAVER)).toEqual({
      matricule: '00100',
      identity: 'BOUMEDIENE MEROUANE Adybe',
      entryDate: '07/08/2026',
      exitDate: '22/09/2026',
      jobTitle: 'Apprenti serveur',
    });
  });

  it('une ligne sans sortie n\'a pas de date de sortie ; « (forfait jour) » est retiré du nom', () => {
    expect(parsePayrollLine(LINE_PRINGY)).toEqual({
      matricule: '000019',
      identity: 'PRINGY NICOLAS',
      entryDate: '01/11/2021',
      exitDate: undefined,
      jobTitle: 'DIRECTEUR',
    });
  });
});

describe('payrollNameKey', () => {
  it('ignore casse, accents et ordre prénom/nom', () => {
    expect(payrollNameKey('Léa DURAND')).toBe(payrollNameKey('durand lea'));
  });
});

describe('buildCategoryReference (dernier import où le nom figure)', () => {
  it('reprend catégorie et service du mois cible, puis remonte les mois précédents', () => {
    const allData = {
      2026: {
        2: monthWith({ cadre: [row('Pringy Nicolas', '100', '3000', 'salle')], niv3: [row('Martin Samir', '100', '2000', 'cuisine')] }),
        3: monthWith({ cadre: [row('Pringy Nicolas', '100', '3000', 'salle')] }),
      },
    };
    const reference = buildCategoryReference(allData, 2026, 5);

    expect(reference.get(payrollNameKey('Pringy Nicolas'))).toEqual({ category: 'cadre', department: 'salle' });
    // Martin Samir absent d'avril mais présent en mars : retrouvé en remontant
    expect(reference.get(payrollNameKey('Martin Samir'))).toEqual({ category: 'niv3', department: 'cuisine' });
  });

  it('la version la plus récente d\'un nom l\'emporte, et remonte sur l\'année précédente', () => {
    const allData = {
      2025: { 11: monthWith({ niv12: [row('Durand Lea')], maitrise: [row('Martial Kiesha')] }) },
      2026: { 0: monthWith({ niv3: [row('Durand Lea')] }) },
    };
    const reference = buildCategoryReference(allData, 2026, 1);

    expect(reference.get(payrollNameKey('Durand Lea'))?.category).toBe('niv3');
    expect(reference.get(payrollNameKey('Martial Kiesha'))?.category).toBe('maitrise');
  });

  it('inclut le mois cible lui-même (réimport après corrections) mais pas les mois suivants', () => {
    const allData = {
      2026: {
        4: monthWith({ niv3: [row('Durand Lea')] }),
        5: monthWith({ cadre: [row('Durand Lea')] }),
      },
    };
    expect(buildCategoryReference(allData, 2026, 4).get(payrollNameKey('Durand Lea'))?.category).toBe('niv3');
  });

  it('aucune donnée : référence vide', () => {
    expect(buildCategoryReference({}, 2026, 4).size).toBe(0);
  });
});

describe('buildPayrollRowsFromText (partir des lignes du PDF)', () => {
  it('une ligne dont le nom est connu reprend catégorie et service du dernier import (statut Reconnu)', () => {
    const reference = buildCategoryReference({
      2026: { 3: monthWith({ cadre: [row('Pringy Nicolas', '100', '3000', 'salle')], niv3: [row('Martin Samir', '100', '2000', 'cuisine')] }) },
    }, 2026, 4);
    const rows = buildPayrollRowsFromText([LINE_PRINGY, LINE_MARTIN].join('\n'), reference);

    expect(rows.map(item => [item.personnel.nom, item.recognized])).toEqual([['Pringy Nicolas', true], ['Martin Samir', true]]);
    const categories = buildPayrollCategories(rows);
    expect(categories.cadre[0]).toMatchObject({ nom: 'Pringy Nicolas', department: 'salle' });
    expect(categories.niv3[0]).toMatchObject({ nom: 'Martin Samir', department: 'cuisine' });
  });

  it('le nom est reconnu quel que soit l\'ordre prénom/nom ou la casse', () => {
    const reference = buildCategoryReference({ 2026: { 3: monthWith({ niv12: [row('Pringy Nicolas', '100', '3000', 'cuisine')] }) } }, 2026, 4);
    const rows = buildPayrollRowsFromText(lineWithCost('NICOLAS PRINGY', 100, 3000), reference);

    expect(rows[0]).toMatchObject({ recognized: true });
    expect(rows[0].personnel).toMatchObject({ category: 'niv12', department: 'cuisine' });
  });

  it('un nom absent de la référence est « nouveau » : catégorie et service déduits de l\'emploi', () => {
    const rows = buildPayrollRowsFromText([LINE_PRINGY, LINE_MARTIN, LINE_LEAVER].join('\n'), EMPTY_REFERENCE);

    expect(rows.map(item => [item.personnel.nom, item.recognized, item.personnel.category, item.personnel.department])).toEqual([
      ['Pringy Nicolas', false, 'cadre', 'salle'],
      ['Martin Samir', false, 'niv3', 'cuisine'],
      ['Boumediene Merouane Adybe', false, 'apprenti', 'salle'],
    ]);
    expect(rows[0].personnel.id).toBe('ligne-1');
  });

  it('service absent de la référence (ancien import) : déduit de l\'emploi, catégorie reprise', () => {
    const reference = buildCategoryReference({ 2026: { 3: monthWith({ maitrise: [row('Martin Samir')] }) } }, 2026, 4);
    const rows = buildPayrollRowsFromText(LINE_MARTIN, reference);

    expect(rows[0].recognized).toBe(true);
    expect(rows[0].personnel).toMatchObject({ category: 'maitrise', department: 'cuisine' });
  });

  it('uses Total heures and Cout global from payroll table lines', () => {
    const rows = buildPayrollRowsFromText(LINE_MARTIAL, EMPTY_REFERENCE);

    expect(rows).toHaveLength(1);
    expect(rows[0].heures).toBeCloseTo(166.25);
    expect(rows[0].coutGlobal).toBeCloseTo(3287.74);
    expect(buildPayrollCategories(rows).maitrise[0]).toMatchObject({ heures: '166,25', coutGlobal: '3287,74' });
  });

  it('uses 151.67 hours for forfait jour and keeps Cout global from the payroll table', () => {
    const rows = buildPayrollRowsFromText(LINE_PRINGY, EMPTY_REFERENCE);

    expect(rows[0].heures).toBeCloseTo(151.67);
    expect(rows[0].coutGlobal).toBeCloseTo(6057.77);
    expect(buildPayrollCategories(rows).cadre[0]).toMatchObject({ heures: '151,67', coutGlobal: '6057,77' });
  });

  it('cumule les lignes d\'une même personne (changement de contrat en cours de mois)', () => {
    const rows = buildPayrollRowsFromText([lineWithCost('DUPONT JEAN', 80, 1000), lineWithCost('DUPONT JEAN', 70, 900)].join('\n'), EMPTY_REFERENCE);

    expect(rows).toHaveLength(1);
    expect(rows[0].heures).toBe(150);
    expect(rows[0].coutGlobal).toBe(1900);
  });

  it('averages rates by category and department', () => {
    const rows = buildPayrollRowsFromText([
      lineWithCost('PRINGY NICOLAS', 100, 3000),
      lineWithCost('DURAND LEA', 100, 2000),
    ].join('\n'), EMPTY_REFERENCE);
    const categories = buildPayrollCategories(rows);

    expect(averagePayrollRate(categories.cadre, 'salle')).toBeCloseTo(27.5);
    expect(averagePayrollRate(categories.cadre, 'cuisine')).toBe(0);
  });
});

describe('sortants exclus des taux horaires', () => {
  const text = [LINE_PRINGY, LINE_LEAVER].join('\n');

  it('la ligne d\'un sortant passe par défaut en « ignoré », réintégrable', () => {
    const previewRows = buildSalaryPreviewRows(buildPayrollRowsFromText(text, EMPTY_REFERENCE));
    const leaver = previewRows.find(item => item.exitDate)!;

    expect(leaver).toMatchObject({ status: 'ignored', statusBeforeIgnore: 'new', origin: 'new', exitDate: '22/09/2026' });
    expect(previewRows.find(item => !item.exitDate)).toMatchObject({ status: 'new', origin: 'new' });
  });

  it('un sortant reconnu garde l\'origine « reconnu » pour le rétablissement', () => {
    const reference = buildCategoryReference({ 2026: { 3: monthWith({ apprenti: [row('Boumediene Merouane Adybe')] }) } }, 2026, 4);
    const leaver = buildSalaryPreviewRows(buildPayrollRowsFromText(LINE_LEAVER, reference))[0];

    expect(leaver).toMatchObject({ status: 'ignored', statusBeforeIgnore: 'recognized', origin: 'recognized' });
  });

  it('un sortant écarté de l\'aperçu n\'entre pas dans les taux par échelon', () => {
    const previewRows = buildSalaryPreviewRows(buildPayrollRowsFromText(text, EMPTY_REFERENCE));
    const categories = buildPayrollCategories(previewRows.filter(item => item.status !== 'ignored'));

    expect(categories.apprenti[0].nom).toBe('');
    expect(categories.cadre[0].nom).toBe('Pringy Nicolas');
  });
});

describe('inferPersonnelFromJob', () => {
  it.each([
    ['Apprenti serveur', 'apprenti', 'salle'],
    ['Apprenti cuisinier', 'apprenti', 'cuisine'],
    ['Directeur', 'cadre', 'salle'],
    ['Directeur adjoint', 'cadre', 'salle'],
    ['Assistant manager', 'maitrise', 'salle'],
    ['Serveur', 'niv12', 'salle'],
    ['Chef de partie', 'niv3', 'cuisine'],
    ['Second de cuisine', 'maitrise', 'cuisine'],
  ])('%s → %s / %s', (job, category, department) => {
    expect(inferPersonnelFromJob(job)).toMatchObject({ category, department, recognized: true });
  });

  it('emploi inconnu : valeurs par défaut signalées comme non reconnues', () => {
    expect(inferPersonnelFromJob('Magicien')).toEqual({ category: 'niv12', department: 'salle', recognized: false });
  });
});
