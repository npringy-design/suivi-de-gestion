import type { Worksheet } from 'exceljs';
import type { PlanDay } from '@/types/dataTypes';

// Grille des onglets mensuels du suivi de gestion Excel V27 :
// ligne 10 = lundi de la semaine du 1er du mois, semaines lundi→dimanche, une ligne de total (verrouillée) après chaque semaine.
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

// Seules cellules déverrouillées du suivi : J, K (midi), L, M (soir), R, S (limonade). B (CA VAE) et les formules ne sont jamais écrites.
function fillInputCell(sheet: Worksheet, address: string, value: number, numFmt: string): void {
  const cell = sheet.getCell(address);
  cell.value = value;
  cell.numFmt = numFmt;
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INPUT_FILL_ARGB } };
  cell.protection = { locked: false };
}

export function fillExcelPasteSheet(
  sheet: Worksheet,
  year: number,
  month: number,
  days: PlanDay[],
  withLimonade: boolean,
): void {
  const name = excelMonthSheetName(year, month);
  const lastCol = withLimonade ? 'S' : 'M';

  sheet.getCell('A1').value = `Budget ${name} — à coller dans l'onglet du même nom du suivi de gestion V27`;
  sheet.getCell('A1').font = { bold: true };
  sheet.getCell('A2').value = `Méthode 1 (feuille protégée, 6 collages) : copier J10:M16 puis Collage spécial › Valeurs en J10 du suivi ; idem J18:M24, J26:M32, J34:M40, J42:M48, J50:M51${withLimonade ? ' (et R:S de la même façon pour la limonade)' : ''}.`;
  sheet.getCell('A3').value = `Méthode 2 (1 seul collage) : Révision › Ôter la protection de la feuille (sans mot de passe) ; copier J10:${lastCol}51 ; en J10 : Collage spécial › cocher Valeurs ET Blancs non compris › OK ; puis Révision › Protéger la feuille.`;
  sheet.getCell('A4').value = 'Ne jamais coller en colonne B à H : ce sont des formules (CA calculé = couverts × TM).';

  const headers: Array<[string, string]> = [
    ['A9', 'DATE'],
    ['J9', 'NB CVTS MIDI'], ['K9', 'CVTS MOY HT MIDI'],
    ['L9', 'NB CVTS SOIR'], ['M9', 'CVTS MOY HT SOIR'],
  ];
  if (withLimonade) headers.push(['R9', 'NB CVTS LIMONADE'], ['S9', 'CVTS MOY HT LIMONADE']);
  headers.forEach(([address, label]) => {
    const cell = sheet.getCell(address);
    cell.value = label;
    cell.font = { bold: true };
  });

  TOTAL_ROWS.forEach(row => {
    const cell = sheet.getCell(`A${row}`);
    cell.value = 'Total semaine — ne rien coller';
    cell.font = { italic: true, color: { argb: 'FF808080' } };
  });

  days.forEach(d => {
    const row = excelRowForDay(year, month, d.day);
    const dateCell = sheet.getCell(`A${row}`);
    dateCell.value = new Date(Date.UTC(year, month, d.day));
    dateCell.numFmt = 'ddd dd/mm/yyyy';
    fillInputCell(sheet, `J${row}`, d.midi.cv, '0');
    fillInputCell(sheet, `K${row}`, d.midi.tm, '0.00');
    fillInputCell(sheet, `L${row}`, d.soir.cv, '0');
    fillInputCell(sheet, `M${row}`, d.soir.tm, '0.00');
    if (withLimonade) {
      fillInputCell(sheet, `R${row}`, d.limonade?.cv ?? 0, '0');
      fillInputCell(sheet, `S${row}`, d.limonade?.tm ?? 0, '0.00');
    }
  });

  sheet.getColumn('A').width = 18;
  const inputCols = withLimonade ? ['J', 'K', 'L', 'M', 'R', 'S'] : ['J', 'K', 'L', 'M'];
  inputCols.forEach(col => { sheet.getColumn(col).width = 14; });
  sheet.views = [{ state: 'frozen', ySplit: 9 }];
}
