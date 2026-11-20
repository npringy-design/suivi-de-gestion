import type { Worksheet } from 'exceljs';
import type { PlanDay } from '@/types/dataTypes';

// Grille des onglets mensuels du suivi de gestion Excel (V26/V27) :
// ligne 10 = lundi de la semaine du 1er du mois, semaines lundi→dimanche, une ligne de total (formules) après chaque semaine.
const GRID_FIRST_ROW = 10;
const GRID_WEEK_STRIDE = 8; // 7 jours + 1 ligne de total
const TOTAL_ROWS = [17, 25, 33, 41, 49, 52];
const INPUT_FILL_ARGB = 'FFFDE68A';

const MONTH_PREFIXES = ['JANV', 'FEV', 'MARS', 'AVRIL', 'MAI', 'JUIN', 'JUIL', 'AOUT', 'SEPT', 'OCT', 'NOV', 'DEC'];

/** month : 0-based. Ex. (2027, 0) → « JANV 27 ». */
export function excelMonthSheetName(year: number, month: number): string {
  return `${MONTH_PREFIXES[month]} ${String(year).slice(-2)}`;
}

/** month : 0-based, day : 1-31. Ligne du jour dans la grille de l'onglet mensuel du suivi. */
export function excelRowForDay(year: number, month: number, day: number): number {
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const offset = firstWeekday + day - 1;
  return GRID_FIRST_ROW + Math.floor(offset / 7) * GRID_WEEK_STRIDE + (offset % 7);
}

export function isExcelTotalRow(row: number): boolean {
  return TOTAL_ROWS.includes(row);
}

function fillInputCell(sheet: Worksheet, address: string, value: number, numFmt: string): void {
  const cell = sheet.getCell(address);
  cell.value = value;
  cell.numFmt = numFmt;
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INPUT_FILL_ARGB } };
}

export function fillExcelPasteSheet(
  sheet: Worksheet,
  year: number,
  month: number,
  days: PlanDay[],
  withLimonade: boolean,
): void {
  const name = excelMonthSheetName(year, month);
  const copyRange = withLimonade ? 'L10:AB51' : 'L10:Q51';

  sheet.getCell('A1').value = `Budget ${name} — à coller dans l'onglet du même nom du suivi de gestion`;
  sheet.getCell('A1').font = { bold: true };
  sheet.getCell('A2').value = `1. Copier ${copyRange} de cet onglet.`;
  sheet.getCell('A3').value = '2. Dans le suivi, Révision › Ôter la protection de la feuille (pas de mot de passe).';
  sheet.getCell('A4').value = '3. Sélectionner L10 › Collage spécial › cocher « Valeurs » ET « Blancs non compris » › OK.';
  sheet.getCell('A5').value = '4. Révision › Protéger la feuille.';

  const headers: Array<[string, string]> = [
    ['A9', 'DATE'],
    ['L9', 'Couverts midi'], ['M9', 'TM HT midi'],
    ['P9', 'Couverts soir'], ['Q9', 'TM HT soir'],
  ];
  if (withLimonade) headers.push(['AA9', 'Couverts limonade'], ['AB9', 'TM HT limonade']);
  headers.forEach(([address, label]) => {
    const cell = sheet.getCell(address);
    cell.value = label;
    cell.font = { bold: true };
  });

  TOTAL_ROWS.forEach(row => {
    const cell = sheet.getCell(`A${row}`);
    cell.value = row === 52 ? 'Sous-total' : 'Total semaine (formules, ne rien saisir)';
    cell.font = { italic: true, color: { argb: 'FF808080' } };
  });

  days.forEach(d => {
    const row = excelRowForDay(year, month, d.day);
    const dateCell = sheet.getCell(`A${row}`);
    dateCell.value = new Date(Date.UTC(year, month, d.day));
    dateCell.numFmt = 'ddd dd/mm/yyyy';
    fillInputCell(sheet, `L${row}`, d.midi.cv, '0');
    fillInputCell(sheet, `M${row}`, d.midi.tm, '0.00');
    fillInputCell(sheet, `P${row}`, d.soir.cv, '0');
    fillInputCell(sheet, `Q${row}`, d.soir.tm, '0.00');
    if (withLimonade) {
      fillInputCell(sheet, `AA${row}`, d.limonade?.cv ?? 0, '0');
      fillInputCell(sheet, `AB${row}`, d.limonade?.tm ?? 0, '0.00');
    }
  });

  sheet.getColumn('A').width = 42;
  sheet.views = [{ state: 'frozen', ySplit: 9 }];
}
