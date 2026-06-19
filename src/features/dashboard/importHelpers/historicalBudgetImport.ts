import type { Worksheet, Cell } from 'exceljs';

export type XlRange = { rowCount: number; columnCount: number };

export const getHistoricalBudgetCell = (sheet: Worksheet, rowIndex: number, colIndex: number): Cell | undefined => {
  const cell = sheet.getCell(rowIndex + 1, colIndex + 1);
  return (cell.value === null || cell.value === undefined) ? undefined : cell;
};

export const parseHistoricalBudgetNumber = (value: unknown) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (value instanceof Date) return 0;
  const cleaned = String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/s/g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');
  return Number(cleaned) || 0;
};

export const parseHistoricalBudgetCellNumber = (cell: Cell | undefined) => {
  if (!cell) return 0;
  const raw = parseHistoricalBudgetNumber(cell.value);
  if (raw !== 0) return raw;
  return parseHistoricalBudgetNumber(cell.text);
};

export const parseHistoricalBudgetDate = (value: unknown): Date | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (value && typeof value === 'object' && 'result' in value) {
    const result = (value as { result: unknown }).result;
    if (result instanceof Date && !Number.isNaN(result.getTime())) return result;
    const fromResult = parseHistoricalBudgetDate(result);
    if (fromResult) return fromResult;
  }
  const text = String(value ?? '').trim();
  const isoTime = Date.parse(text);
  if (/^\d{4}-\d{2}-\d{2}/.test(text) && !Number.isNaN(isoTime)) return new Date(isoTime);
  const normalizedTextDate = text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  const monthWords: Record<string, number> = { janvier: 0, janv: 0, fevrier: 1, fevr: 1, fev: 1, mars: 2, avril: 3, avr: 3, mai: 4, juin: 5, juillet: 6, juil: 6, aout: 7, septembre: 8, sept: 8, octobre: 9, oct: 9, novembre: 10, nov: 10, decembre: 11, dec: 11 };
  const wordDateMatch = normalizedTextDate.match(/(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)?\s*(\d{1,2})\s+([a-z]+)\s+(\d{2,4})/);
  if (wordDateMatch) {
    const monthIndex = monthWords[wordDateMatch[2]];
    if (monthIndex !== undefined) {
      const fullYear = wordDateMatch[3].length === 2 ? Number('20' + wordDateMatch[3]) : Number(wordDateMatch[3]);
      return new Date(fullYear, monthIndex, Number(wordDateMatch[1]));
    }
  }
  const frMatch = text.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (frMatch) {
    const fullYear = frMatch[3].length === 2 ? Number('20' + frMatch[3]) : Number(frMatch[3]);
    return new Date(fullYear, Number(frMatch[2]) - 1, Number(frMatch[1]));
  }
  return null;
};

export const parseHistoricalBudgetCellDate = (cell: Cell | undefined) => {
  if (!cell) return null;
  return parseHistoricalBudgetDate(cell.value) || parseHistoricalBudgetDate(cell.text);
};

export const getHistoricalBudgetRowLabel = (sheet: Worksheet, rowNumber: number) => (
  [0, 1, 2, 3, 4, 5]
    .map(colIndex => {
      const cell = getHistoricalBudgetCell(sheet, rowNumber, colIndex);
      return String(cell?.text || cell?.value || '');
    })
    .join(' ')
    .toUpperCase()
);

export const isHistoricalBudgetTotalRow = (sheet: Worksheet, rowNumber: number) => {
  if (rowNumber < 0) return false;
  const label = getHistoricalBudgetRowLabel(sheet, rowNumber);
  return label.includes('TOTAL') || label.includes('SEMAINE') || label.includes('CUMUL');
};

export const getHistoricalBudgetRowValues = (sheet: Worksheet, rowNumber: number) => {
  if (rowNumber < 0 || isHistoricalBudgetTotalRow(sheet, rowNumber)) {
    return { couvertsMidi: 0, tmMidi: 0, couvertsSoir: 0, tmSoir: 0 };
  }
  const couvertsMidi = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, 11));
  const tmMidi = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, 12));
  const couvertsSoir = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, 15));
  const tmSoir = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, 16));
  return { couvertsMidi, tmMidi, couvertsSoir, tmSoir };
};

export const rowHasHistoricalBudgetValues = (values: ReturnType<typeof getHistoricalBudgetRowValues>) => (
  values.couvertsMidi > 0 || values.tmMidi > 0 || values.couvertsSoir > 0 || values.tmSoir > 0
);

export const getHistoricalRealiseRowValues = (sheet: Worksheet, rowNumber: number) => {
  if (rowNumber < 0 || isHistoricalBudgetTotalRow(sheet, rowNumber)) return { realiseVae: 0, realiseMidi: 0, realiseSoir: 0, realiseLimo: 0, realiseCouvertsMidi: 0, realiseCouvertsSoir: 0, realiseCouvertsLimo: 0 };
  return {
    realiseVae: parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, 33)),
    realiseMidi: parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, 34)),
    realiseSoir: parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, 36)),
    realiseLimo: parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, 38)),
    realiseCouvertsMidi: parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, 51)),
    realiseCouvertsSoir: parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, 53)),
    realiseCouvertsLimo: parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, 65)),
  };
};

export const rowHasHistoricalRealiseValues = (values: ReturnType<typeof getHistoricalRealiseRowValues>) => (
  values.realiseVae > 0 || values.realiseMidi > 0 || values.realiseSoir > 0 || values.realiseLimo > 0 || values.realiseCouvertsMidi > 0 || values.realiseCouvertsSoir > 0 || values.realiseCouvertsLimo > 0
);

export const normalizeHistoricalSupplierName = (value: unknown) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/&/g, 'ET')
  .replace(/[^A-Z0-9]+/gi, '')
  .toUpperCase();

export const historicalCostMatterSupplierCols = [45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57];
export const historicalCostMatterAliases: Record<string, number> = {
  DOQUET: 45,
  C10: 45,
  RICHARDVINS: 46,
  CAFERICHARD: 47,
  STORIA: 48,
  DOMAFRAIS: 49,
  BRAKE: 49,
  BRAKES: 49,
  TERREAZUR: 50,
  POMONAFETL: 50,
  POMONAFL: 50,
  POMONAFRUITLEGUME: 50,
  SOCOPA: 51,
  PLAINE: 51,
  PLAINEMAISON: 51,
  PLAINMAISON: 51,
  EPISAVEUR: 52,
  EPISAVEURS: 52,
  EPISAVEURO: 52,
  MAMMAFIORE: 53,
  COMPAGNIEDESDESSERTS: 54,
  DESSERTS: 54,
  DISTRIPATE: 55,
  METRO: 56,
  DEPANNAGE: 56,
  MARTEL: 57,
};

export const findHistoricalCostMatterTargetColumn = (headerText: unknown) => {
  const header = normalizeHistoricalSupplierName(headerText);
  if (!header || header.length < 4 || /DATE|TOTAL|CUMUL|RATIO|ACHATHT|ACHATS|LIQUIDE|SOLIDE|SANSSTOCK|COUTMATIERE|REALISE|PREVISION|BUDGET|RESTAURANT|JOUR|MIDI|SOIR/.test(header)) return 0;

  if (header.includes('DOQUET') || header.includes('C10')) return 45;
  if (header.includes('RICHARDVINS')) return 46;
  if (header.includes('CAFERICHARD')) return 47;
  if (header.includes('STORIA')) return 48;
  if (header.includes('DOMAFRAIS') || header.includes('BRAKE')) return 49;
  if (header.includes('TERREAZUR') || header.includes('POMONAF') || header.includes('POMONAFL')) return 50;
  if (header.includes('PLAIN') || header.includes('PLAINE') || header.includes('SOCOPA')) return 51;
  if (header.includes('EPISAVEUR') && header.includes('5')) return 53;
  if (header.includes('EPISAVEUR')) return 52;
  if (header.includes('MAMMAFIORE') || header.includes('COMPAGNIEDESDESSERTS') || header.includes('DESSERT')) return 54;
  if (header.includes('DISTRIPATE')) return 55;
  if (header.includes('METRO') || header.includes('DEPANNAGE')) return 56;
  if (header.includes('MARTEL')) return 57;

  return 0;
};

export const getHistoricalCostMatterColumnMap = (sheet: Worksheet, range: XlRange) => {
  const map: Record<number, number> = {};
  const headerEndRow = Math.min(range.rowCount - 1, 80);

  for (let rowNumber = 0; rowNumber <= headerEndRow; rowNumber += 1) {
    for (let colIndex = 0; colIndex <= range.columnCount - 1; colIndex += 1) {
      if (map[colIndex]) continue;
      const cell = getHistoricalBudgetCell(sheet, rowNumber, colIndex);
      const targetCol = findHistoricalCostMatterTargetColumn(cell?.text || cell?.value);
      if (targetCol) map[colIndex] = targetCol;
    }
  }

  return map;
};

export const parseHistoricalCostMatterCellNumber = (cell: Cell | undefined) => {
  if (!cell) return 0;
  const rawNumber = typeof cell.value === 'number' && Number.isFinite(cell.value)
    ? cell.value
    : parseHistoricalBudgetNumber(cell.value);
  if (rawNumber !== 0) return rawNumber;

  const displayText = String(cell.text || cell.value || '')
    .replace(/âˆ’|–|—/g, '-')
    .replace(/\u00a0/g, ' ')
    .trim();
  const compact = displayText.replace(/\s/g, '').replace(',', '.');
  const isNegative = /^-/.test(compact) || /-$/.test(compact) || /^\(.*\)$/.test(compact);
  const numericText = compact.replace(/[()-]/g, '').replace(/[^0-9.]/g, '');
  const displayNumber = Number(numericText) || 0;
  return isNegative ? -Math.abs(displayNumber) : displayNumber;
};

export const getHistoricalCostMatterValues = (sheet: Worksheet, rowNumber: number, columnMap: Record<number, number>) => {
  const values: Record<number, number> = {};
  if (rowNumber < 0 || isHistoricalBudgetTotalRow(sheet, rowNumber)) return values;
  Object.entries(columnMap).forEach(([sourceColText, targetCol]) => {
    const amount = parseHistoricalCostMatterCellNumber(getHistoricalBudgetCell(sheet, rowNumber, Number(sourceColText)));
    if (amount !== 0) values[targetCol] = (values[targetCol] || 0) + amount;
  });
  return values;
};

export const sumHistoricalCostMatterValues = (values: Record<number, number>) => (
  Object.values(values).reduce((sum, value) => sum + value, 0)
);

export type HistoricalDemarqueRow = {
  date: string; // ISO YYYY-MM-DD
  personnel: number;
  operationnel: number;
  explication: string;
};

export function extractHistoricalDemarques(sheet: Worksheet): HistoricalDemarqueRow[] {
  const results: HistoricalDemarqueRow[] = [];
  for (let rowNumber = 0; rowNumber <= sheet.rowCount - 1; rowNumber += 1) {
    if (isHistoricalBudgetTotalRow(sheet, rowNumber)) continue;
    const dateCell = getHistoricalBudgetCell(sheet, rowNumber, 0);
    const parsedDate = parseHistoricalBudgetCellDate(dateCell);
    if (!parsedDate) continue;

    const personnel = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, 74));
    const operationnel = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, 76));
    const explicationCell = getHistoricalBudgetCell(sheet, rowNumber, 80);
    const explication = String(explicationCell?.text || explicationCell?.value || '').trim();

    if (personnel === 0 && operationnel === 0 && !explication) continue;

    const isoDate = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`;
    results.push({ date: isoDate, personnel, operationnel, explication });
  }
  return results;
}

export type HistoricalFgEntry = {
  box: number;      // 0-3
  colGroup: number; // 0-2
  dIdx: number;     // index dans le groupe
  date: string;
  fournisseur: string;
  motif: string;
  montant: number;
};

export type HistoricalContratEntry = {
  dIdx: number;
  nom: string;
  montant: number;
};

const fgBoxStartRows0Based = [9, 18, 29, 40];
const fgColGroupOffsets = [123, 128, 133]; // 0-based col index for "date" of colGroup 0/1/2

const formatHistoricalFgDate = (value: unknown): string => {
  const parsed = parseHistoricalBudgetDate(value);
  if (!parsed) return '';
  return `${String(parsed.getDate()).padStart(2, '0')}/${String(parsed.getMonth() + 1).padStart(2, '0')}/${parsed.getFullYear()}`;
};

export function extractHistoricalFraisGeneraux(sheet: Worksheet): {
  entries: HistoricalFgEntry[];
  contrats: HistoricalContratEntry[];
} {
  const entries: HistoricalFgEntry[] = [];
  const contrats: HistoricalContratEntry[] = [];

  fgBoxStartRows0Based.forEach((startRow, box) => {
    let rowNumber = startRow;
    const dIdxByGroup = [0, 0, 0];
    while (rowNumber <= sheet.rowCount - 1) {
      const firstColCell = getHistoricalBudgetCell(sheet, rowNumber, 123);
      const firstColText = String(firstColCell?.text || firstColCell?.value || '').trim().toUpperCase();
      if (firstColText.includes('TOTAL')) break;

      fgColGroupOffsets.forEach((dateCol, colGroup) => {
        const montant = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, dateCol + 3));
        if (!montant || Number.isNaN(montant)) return;
        const date = formatHistoricalFgDate(getHistoricalBudgetCell(sheet, rowNumber, dateCol)?.value);
        const fournisseurCell = getHistoricalBudgetCell(sheet, rowNumber, dateCol + 1);
        const motifCell = getHistoricalBudgetCell(sheet, rowNumber, dateCol + 2);
        entries.push({
          box,
          colGroup,
          dIdx: dIdxByGroup[colGroup],
          date,
          fournisseur: String(fournisseurCell?.text || fournisseurCell?.value || '').trim(),
          motif: String(motifCell?.text || motifCell?.value || '').trim(),
          montant,
        });
        dIdxByGroup[colGroup] += 1;
      });

      // Contrats mensualises : col 139 (EI, 0-based 138) = nom, col 140 (EJ, 0-based 139) = montant
      const nomCell = getHistoricalBudgetCell(sheet, rowNumber, 138);
      const nom = String(nomCell?.text || nomCell?.value || '').trim();
      const montantContrat = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, 139));
      if (nom && montantContrat) {
        contrats.push({ dIdx: contrats.length, nom, montant: montantContrat });
      }

      rowNumber += 1;
    }
  });

  return { entries, contrats };
}
