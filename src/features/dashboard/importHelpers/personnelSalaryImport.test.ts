import { describe, expect, it } from 'vitest';

import { buildPayrollRowsFromText, buildPayrollStoredLines, extractPayrollCandidateLines, extractPayrollPageTotals } from './personnelSalaryImport';

const PDF_TEXT = [
  'DUPONT Jean 151,67 3 000,00 800,00 26,67 - 3 800,00',
  'Total général - cuisine 10 000,00 2 500,00 25,00 - 12 500,00',
  'Total général - salle 28 091,35 6 744,53 24,01 1 814,06 33 021,82',
  'Total général 38 091,35 9 244,53 24,27 1 814,06 45 521,82',
  'Total général - périodes avec heures 36 000,00 8 800,00 2 294,86 1 700,00 43 100,00',
].join('\n');

describe('extractPayrollPageTotals', () => {
  it('lit Brut, Charges patronales, Coût global et le total heures', () => {
    expect(extractPayrollPageTotals(PDF_TEXT)).toEqual({
      brut: 38091.35,
      chargesPatronales: 9244.53,
      coutGlobal: 45521.82,
      heures: 2294.86,
    });
  });

  it('ignore les sous-totaux « Total général - … »', () => {
    const onlySubTotals = [
      'Total général - cuisine 10 000,00 2 500,00 25,00 - 12 500,00',
      'Total général - périodes avec heures 36 000,00 8 800,00 2 294,86 1 700,00 43 100,00',
    ].join('\n');
    expect(extractPayrollPageTotals(onlySubTotals)).toBeNull();
  });

  it('un « - » isolé (supplément nul) ne décale pas la lecture', () => {
    const text = 'Total général 38 091,35 9 244,53 24,27 - 47 335,88';
    const totals = extractPayrollPageTotals(text)!;
    expect(totals.brut).toBe(38091.35);
    expect(totals.chargesPatronales).toBe(9244.53);
    expect(totals.coutGlobal).toBe(47335.88);
    expect(totals.heures).toBeUndefined();
  });

  it('retourne null si le format est différent', () => {
    expect(extractPayrollPageTotals('DUPONT Jean 151,67 3 000,00')).toBeNull();
  });

  it('ETP exact : toutes les lignes (sortants inclus), forfaits jour à 151,67 h', () => {
    // Six valeurs de paie après les heures, coût global en avant-dernière position.
    const tail = '1 000,00 300,00 24,00 10,00 1 300,00 5,00';
    const text = [
      `00001 DUPONT Jean 01/01/2020 Cuisinier 09/2026 151,67 ${tail}`,
      `00002 MARTIN Paul 01/01/2020 22/09/2026 Serveur 09/2026 100,00 ${tail}`,
      `00003 DURAND Anne (forfait jour) 01/01/2020 Directrice 09/2026 ${tail}`,
      'Total général 38 091,35 9 244,53 24,27 1 814,06 45 521,82',
    ].join('\n');
    const totals = extractPayrollPageTotals(text)!;
    expect(totals.forfaitsJour).toBe(1);
    expect(totals.etp).toBeCloseTo((151.67 + 100 + 151.67) / 151.67, 2);
  });

  it('lignes stockées : toutes les lignes, sortants et forfaits jour compris, clé = matricule', () => {
    const tail = '1 000,00 300,00 24,00 10,00 1 300,00 5,00';
    const text = [
      `00001 DUPONT Jean 01/01/2020 Cuisinier 09/2026 151,67 ${tail}`,
      `00002 MARTIN Paul 01/01/2020 22/09/2026 Serveur 09/2026 100,00 ${tail}`,
      `DURAND Anne (forfait jour) 01/01/2020 Directrice 09/2026 ${tail}`,
    ].join('\n');
    const lines = buildPayrollStoredLines(text);
    expect(lines.map(line => line.key)).toEqual(['00001', '00002', 'DURAND ANNE']);
    expect(lines[1]).toMatchObject({ nom: 'MARTIN Paul', exitDate: '22/09/2026', heures: 100 });
    expect(lines[2]).toMatchObject({ forfaitJour: true, heures: 151.67 });
    expect(lines[0].exitDate).toBeUndefined();
  });

  it('lignes stockées : un forfait jour (sans heures dans le PDF) est inclus, la somme des coûts recoupe le total', () => {
    const forfait = '000019 PRINGY NICOLAS (forfait jour) 01/11/2021 DIRECTEUR 09/2026 4043.35 2063.74 51.04 -49.32 6057.77 333.46';
    const normal = '000014 MARTIAL KIESHA 01/11/2021 ASSISTANT MANAGER 09/2026 148.92 17.33 166.25 2672.11 740.57 27.71 -124.94 3287.74 19.78';
    const lines = buildPayrollStoredLines([forfait, normal].join('\n'));
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ key: '000019', forfaitJour: true, heures: 151.67, coutGlobal: 6057.77 });
    expect(lines.reduce((sum, line) => sum + line.coutGlobal, 0)).toBeCloseTo(6057.77 + 3287.74, 2);
  });

  it('lignes à coût seul (absence) : stockées sans heures, hors ETP, hors lignes d\'aperçu, somme = total', () => {
    const absent = '00123 SOW MOHAMED AL MUSTAFA 01/03/2024 Employé polyvalent 01/2026 43.25 43.25';
    const normal = '000014 MARTIAL KIESHA 01/11/2021 ASSISTANT MANAGER 01/2026 148.92 17.33 166.25 2672.11 740.57 27.71 -124.94 3287.74 19.78';
    const text = [normal, absent, 'Total général 2672,11 783,82 29,33 -124,94 3330,99'].join('\n');

    const lines = buildPayrollStoredLines(text);
    expect(lines).toHaveLength(2);
    expect(lines[1]).toMatchObject({ key: '00123', heures: 0, coutGlobal: 43.25, costOnly: true });
    expect(lines[0].costOnly).toBeUndefined();
    expect(lines.reduce((sum, line) => sum + line.coutGlobal, 0)).toBeCloseTo(3287.74 + 43.25, 2);

    expect(extractPayrollCandidateLines(text).map(candidate => candidate.line)).toEqual([normal]);
    expect(buildPayrollRowsFromText(text, new Map())).toHaveLength(1);
    expect(extractPayrollPageTotals(text)!.etp).toBeCloseTo(166.25 / 151.67, 2);
  });

  it('gère les fins de ligne Windows', () => {
    expect(extractPayrollPageTotals(PDF_TEXT.replace(/\n/g, '\r\n'))!.brut).toBe(38091.35);
  });
});
