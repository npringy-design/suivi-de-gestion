import * as XLSX from 'xlsx';

export const getHistoricalBudgetCell = (sheet: XLSX.WorkSheet, rowIndex: number, colIndex: number) => (
  sheet[XLSX.utils.encode_cell({ r: rowIndex, c: colIndex })] as XLSX.CellObject | undefined
);

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

export const parseHistoricalBudgetCellNumber = (cell: XLSX.CellObject | undefined) => {
  if (!cell) return 0;
  const raw = parseHistoricalBudgetNumber(cell.v);
  if (raw !== 0) return raw;
  return parseHistoricalBudgetNumber(cell.w);
};

export const parseHistoricalBudgetDate = (value: unknown) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d);
  }
  const text = String(value ?? '').trim();
  const isoTime = Date.parse(text);
  if (/^d{4}-d{2}-d{2}/.test(text) && !Number.isNaN(isoTime)) return new Date(isoTime);
  const normalizedTextDate = text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/./g, ' ').replace(/s+/g, ' ').trim().toLowerCase();
  const monthWords: Record<string, number> = { janvier: 0, janv: 0, fevrier: 1, fevr: 1, fev: 1, mars: 2, avril: 3, avr: 3, mai: 4, juin: 5, juillet: 6, juil: 6, aout: 7, septembre: 8, sept: 8, octobre: 9, oct: 9, novembre: 10, nov: 10, decembre: 11, dec: 11 };
  const wordDateMatch = normalizedTextDate.match(/(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)?s*(d{1,2})s+([a-z]+)s+(d{2,4})/);
  if (wordDateMatch) {
    const monthIndex = monthWords[wordDateMatch[2]];
    if (monthIndex !== undefined) {
      const fullYear = wordDateMatch[3].length === 2 ? Number('20' + wordDateMatch[3]) : Number(wordDateMatch[3]);
      return new Date(fullYear, monthIndex, Number(wordDateMatch[1]));
    }
  }
  const frMatch = text.match(/(d{1,2})[/.-](d{1,2})[/.-](d{2,4})/);
  if (frMatch) {
    const fullYear = frMatch[3].length === 2 ? Number('20' + frMatch[3]) : Number(frMatch[3]);
    return new Date(fullYear, Number(frMatch[2]) - 1, Number(frMatch[1]));
  }
  return null;
};

export const parseHistoricalBudgetCellDate = (cell: XLSX.CellObject | undefined) => {
  if (!cell) return null;
  return parseHistoricalBudgetDate(cell.v) || parseHistoricalBudgetDate(cell.w);
};

export const getHistoricalBudgetRowLabel = (sheet: XLSX.WorkSheet, rowNumber: number) => (
  [0, 1, 2, 3, 4, 5]
    .map(colIndex => {
      const cell = getHistoricalBudgetCell(sheet, rowNumber, colIndex);
      return String(cell?.w ?? cell?.v ?? '');
    })
    .join(' ')
    .toUpperCase()
);

export const isHistoricalBudgetTotalRow = (sheet: XLSX.WorkSheet, rowNumber: number) => {
  if (rowNumber < 0) return false;
  const label = getHistoricalBudgetRowLabel(sheet, rowNumber);
  return label.includes('TOTAL') || label.includes('SEMAINE') || label.includes('CUMUL');
};

export const getHistoricalBudgetRowValues = (sheet: XLSX.WorkSheet, rowNumber: number) => {
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

export const getHistoricalRealiseRowValues = (sheet: XLSX.WorkSheet, rowNumber: number) => {
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

export const getHistoricalCostMatterColumnMap = (sheet: XLSX.WorkSheet, range: XLSX.Range) => {
  const map: Record<number, number> = {};
  const headerEndRow = Math.min(range.e.r, range.s.r + 80);

  for (let rowNumber = range.s.r; rowNumber <= headerEndRow; rowNumber += 1) {
    for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex += 1) {
      if (map[colIndex]) continue;
      const cell = getHistoricalBudgetCell(sheet, rowNumber, colIndex);
      const targetCol = findHistoricalCostMatterTargetColumn(cell?.w ?? cell?.v);
      if (targetCol) map[colIndex] = targetCol;
    }
  }

  return map;
};

export const parseHistoricalCostMatterCellNumber = (cell: XLSX.CellObject | undefined) => {
  if (!cell) return 0;
  const rawNumber = typeof cell.v === 'number' && Number.isFinite(cell.v)
    ? cell.v
    : parseHistoricalBudgetNumber(cell.v);
  if (rawNumber !== 0) return rawNumber;

  const displayText = String(cell.w ?? cell.v ?? '')
    .replace(/âˆ’|â€“|â€”/g, '-')
    .replace(/\u00a0/g, ' ')
    .trim();
  const compact = displayText.replace(/\s/g, '').replace(',', '.');
  const isNegative = /^-/.test(compact) || /-$/.test(compact) || /^\(.*\)$/.test(compact);
  const numericText = compact.replace(/[()-]/g, '').replace(/[^0-9.]/g, '');
  const displayNumber = Number(numericText) || 0;
  return isNegative ? -Math.abs(displayNumber) : displayNumber;
};

export const getHistoricalCostMatterValues = (sheet: XLSX.WorkSheet, rowNumber: number, columnMap: Record<number, number>) => {
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
