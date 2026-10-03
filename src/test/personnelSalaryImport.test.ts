import { describe, expect, it } from 'vitest';

import type { PersonnelInfo } from '../contexts/DataContext';
import {
  averagePayrollRate,
  buildPayrollCategories,
  buildPayrollRowsFromText,
  buildSalaryPreviewRows,
  getPayrollTargetPeriodFromText,
  parsePayrollLine,
} from '../features/dashboard/importHelpers/personnelSalaryImport';
import { inferPersonnelFromJob } from '../features/dashboard/importHelpers/payrollJobCategories';
import { applyImportedPersonnel } from '../features/dashboard/importHelpers/salaryImportApply';

const personnel: PersonnelInfo[] = [
  { id: '1', nom: 'Pringy Nicolas', category: 'cadre', department: 'salle', aliases: 'Nicolas Pringy' },
  { id: '2', nom: 'Durand Lea', category: 'cadre', department: 'salle', aliases: '' },
  { id: '3', nom: 'Martin Samir', category: 'niv3', department: 'cuisine', aliases: '' },
];

// Lignes réelles du PDF « coûts salariaux » : matricule, nom, entrée, [sortie], emploi, période, valeurs de paie.
const LINE_PRINGY = '000019 PRINGY NICOLAS (forfait jour) 01/11/2021 DIRECTEUR 04/2026 4043.35 2063.74 51.04 -49.32 6057.77 333.46';
const LINE_MARTIAL = '000014 MARTIAL KIESHA 01/11/2021 ASSISTANT MANAGER 04/2026 148.92 17.33 166.25 2672.11 740.57 27.71 -124.94 3287.74 19.78';
const LINE_MARTIN = '000020 MARTIN SAMIR 02/03/2023 CHEF DE PARTIE 04/2026 140.00 12.00 152.00 2000.00 700.00 35.00 -10.00 2700.00 17.00';
const LINE_LEAVER = '00100 BOUMEDIENE MEROUANE Adybe 07/08/2026 22/09/2026 Apprenti serveur 09/2026 80.00 10.00 90.00 900.00 200.00 22.00 -5.00 1650.00 11.00';
const lineWithCost = (name: string, hours: number, cost: number) =>
  `0001 ${name} 01/01/2020 DIRECTEUR 04/2026 ${hours - 10}.00 5.00 ${hours}.00 2500.00 400.00 30.00 -10.00 ${cost}.00 30.00`;

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
      identity: 'BOUMEDIENE MEROUANE Adybe',
      entryDate: '07/08/2026',
      exitDate: '22/09/2026',
      jobTitle: 'Apprenti serveur',
    });
  });

  it('une ligne sans sortie n\'a pas de date de sortie ; « (forfait jour) » est retiré du nom', () => {
    expect(parsePayrollLine(LINE_PRINGY)).toEqual({
      identity: 'PRINGY NICOLAS',
      entryDate: '01/11/2021',
      exitDate: undefined,
      jobTitle: 'DIRECTEUR',
    });
  });
});

describe('buildPayrollRowsFromText (partir des lignes du PDF)', () => {
  it('rapproche chaque ligne du PDF d\'une fiche et garde catégorie et service de la fiche', () => {
    const rows = buildPayrollRowsFromText([LINE_PRINGY, LINE_MARTIN].join('\n'), personnel);

    expect(rows.map(row => [row.personnel.nom, row.isNew])).toEqual([['Pringy Nicolas', false], ['Martin Samir', false]]);
    const categories = buildPayrollCategories(rows);
    expect(categories.cadre[0]).toMatchObject({ nom: 'Pringy Nicolas', department: 'salle' });
    expect(categories.niv3[0]).toMatchObject({ nom: 'Martin Samir', department: 'cuisine' });
  });

  it('une fiche absente du PDF n\'est pas signalée : elle n\'apparaît simplement pas', () => {
    const rows = buildPayrollRowsFromText(LINE_PRINGY, personnel);
    expect(rows).toHaveLength(1);
    expect(rows.some(row => row.personnel.nom === 'Durand Lea')).toBe(false);
  });

  it('uses aliases and reversed first/last names to match a payroll line', () => {
    const rows = buildPayrollRowsFromText(lineWithCost('NICOLAS PRINGY', 100, 3000), personnel);

    expect(rows).toHaveLength(1);
    expect(rows[0].personnel.nom).toBe('Pringy Nicolas');
    expect(rows[0].isNew).toBe(false);
  });

  it('uses Total heures and Cout global from payroll table lines', () => {
    const rows = buildPayrollRowsFromText(LINE_MARTIAL, [
      { id: '4', nom: 'Martial Kiesha', category: 'maitrise', department: 'salle', aliases: '' },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].heures).toBeCloseTo(166.25);
    expect(rows[0].coutGlobal).toBeCloseTo(3287.74);
    expect(buildPayrollCategories(rows).maitrise[0]).toMatchObject({ heures: '166,25', coutGlobal: '3287,74' });
  });

  it('uses 151.67 hours for forfait jour and keeps Cout global from the payroll table', () => {
    const rows = buildPayrollRowsFromText(LINE_PRINGY, personnel);

    expect(rows[0].heures).toBeCloseTo(151.67);
    expect(rows[0].coutGlobal).toBeCloseTo(6057.77);
    expect(buildPayrollCategories(rows).cadre[0]).toMatchObject({ heures: '151,67', coutGlobal: '6057,77' });
  });

  it('une ligne sans fiche devient un nouveau salarié avec catégorie et service déduits de l\'emploi', () => {
    const rows = buildPayrollRowsFromText(LINE_LEAVER, personnel);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ isNew: true, jobTitle: 'Apprenti serveur', exitDate: '22/09/2026' });
    expect(rows[0].personnel).toMatchObject({ id: 'nouveau-1', nom: 'Boumediene Merouane Adybe', category: 'apprenti', department: 'salle' });
  });

  it('cumule les lignes d\'une même personne (changement de contrat en cours de mois)', () => {
    const rows = buildPayrollRowsFromText([lineWithCost('DUPONT JEAN', 80, 1000), lineWithCost('DUPONT JEAN', 70, 900)].join('\n'), personnel);

    expect(rows).toHaveLength(1);
    expect(rows[0].heures).toBe(150);
    expect(rows[0].coutGlobal).toBe(1900);
  });

  it('averages rates by category and department', () => {
    const rows = buildPayrollRowsFromText([
      lineWithCost('PRINGY NICOLAS', 100, 3000),
      lineWithCost('DURAND LEA', 100, 2000),
    ].join('\n'), personnel);
    const categories = buildPayrollCategories(rows);

    expect(averagePayrollRate(categories.cadre, 'salle')).toBeCloseTo(27.5);
    expect(averagePayrollRate(categories.cadre, 'cuisine')).toBe(0);
  });
});

describe('sortants exclus des taux horaires', () => {
  const text = [LINE_PRINGY, LINE_LEAVER].join('\n');

  it('la ligne d\'un sortant passe par défaut en « ignoré », réintégrable', () => {
    const previewRows = buildSalaryPreviewRows(buildPayrollRowsFromText(text, personnel));
    const leaver = previewRows.find(row => row.exitDate)!;

    expect(leaver).toMatchObject({ status: 'ignored', statusBeforeIgnore: 'new', origin: 'new', exitDate: '22/09/2026' });
    expect(previewRows.find(row => !row.exitDate)).toMatchObject({ status: 'matched', origin: 'matched' });
  });

  it('un sortant retiré de l\'aperçu n\'entre pas dans les taux par échelon (ni dans les fiches créées)', () => {
    const previewRows = buildSalaryPreviewRows(buildPayrollRowsFromText(text, personnel));
    const imported = previewRows.filter(row => row.status !== 'ignored');
    const categories = buildPayrollCategories(imported);

    expect(categories.apprenti[0].nom).toBe('');
    expect(applyImportedPersonnel(personnel, imported, () => 'x').createdCount).toBe(0);
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

describe('applyImportedPersonnel', () => {
  it('crée la fiche d\'un nouveau salarié (catégorie/service confirmés, alias = nom du PDF)', () => {
    const rows = buildSalaryPreviewRows(buildPayrollRowsFromText(LINE_LEAVER, personnel)).map(row => ({
      ...row,
      status: 'new' as const,
      personnel: { ...row.personnel, category: 'niv12' as const },
    }));

    const result = applyImportedPersonnel(personnel, rows, () => 'id-nouveau');

    expect(result.createdCount).toBe(1);
    expect(result.personnelInfos).toHaveLength(4);
    expect(result.personnelInfos[3]).toEqual({
      id: 'id-nouveau',
      nom: 'Boumediene Merouane Adybe',
      category: 'niv12',
      department: 'salle',
      aliases: '',
    });
  });

  it('mémorise le nom du PDF en alias d\'une fiche associée', () => {
    const rows = buildSalaryPreviewRows(buildPayrollRowsFromText('0007 DURAND LEONIE 01/01/2020 SERVEUR 04/2026 90.00 5.00 100.00 2500.00 400.00 30.00 -10.00 2000.00 30.00', personnel)).map(row => ({
      ...row,
      personnel: personnel[1],
      origin: 'matched' as const,
      status: 'matched' as const,
      saveAlias: true,
    }));

    const result = applyImportedPersonnel(personnel, rows, () => 'x');

    expect(result.createdCount).toBe(0);
    expect(result.savedAliases).toBe(1);
    expect(result.personnelInfos[1].aliases).toBe('DURAND LEONIE');
  });
});
