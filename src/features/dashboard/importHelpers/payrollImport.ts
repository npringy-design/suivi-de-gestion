import type { Worksheet, Cell } from 'exceljs';

import type { XlRange } from './historicalBudgetImport';
import {
  getHistoricalBudgetCell,
  isHistoricalBudgetTotalRow,
  normalizeHistoricalSupplierName,
} from './historicalBudgetImport';

export const historicalPayrollProjectionCols = [62, 63, 64, 65, 66, 67, 68, 69, 70, 71];
export const historicalPayrollRealiseCols = [77, 78, 79, 80, 81, 82, 83, 84, 85, 86];
export const historicalPayrollAllCols = [...historicalPayrollProjectionCols, ...historicalPayrollRealiseCols];

export const parseHistoricalPayrollHourCell = (cell: Cell | undefined) => {
  if (!cell) return '';
  const display = String(cell.text || '')
    .replace(/−|–|—/g, '-')
    .replace(/\u00a0/g, ' ')
    .trim();
  const raw = cell.value;

  if (/^d{1,4}[:hH]d{2}$/.test(display)) {
    const normalized = display.replace(/[hH]/, ':');
    return /^0+:00$/.test(normalized) ? '' : normalized;
  }

  const rawText = String(raw ?? '').trim();
  if (/^d{1,4}[:hH]d{2}$/.test(rawText)) {
    const normalized = rawText.replace(/[hH]/, ':');
    return /^0+:00$/.test(normalized) ? '' : normalized;
  }

  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    const hoursDecimal = raw < 1 ? raw * 24 : raw;
    const totalMinutes = Math.round(hoursDecimal * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours === 0 && minutes === 0 ? '' : hours + ':' + String(minutes).padStart(2, '0');
  }

  return '';
};

export const historicalPayrollHourToDecimal = (value: string) => {
  const match = value.match(/^(d{1,4})[:hH](d{2})$/);
  if (!match) return 0;
  return Math.round(((Number(match[1]) || 0) + (Number(match[2]) || 0) / 60) * 100) / 100;
};

export const findHistoricalPayrollTitle = (sheet: Worksheet, range: XlRange, needles: string[]) => {
  for (let rowNumber = 0; rowNumber <= range.rowCount - 1; rowNumber += 1) {
    for (let colIndex = 0; colIndex <= range.columnCount - 1; colIndex += 1) {
      const text = normalizeHistoricalSupplierName(getHistoricalBudgetCell(sheet, rowNumber, colIndex)?.text || getHistoricalBudgetCell(sheet, rowNumber, colIndex)?.value);
      if (needles.some(needle => text.includes(needle))) return { rowNumber, colIndex };
    }
  }
  return null;
};

export type HistoricalPayrollColumnMap = {
  group: 'projection' | 'realise';
  headerRow: number;
  columns: Record<number, number>;
};

export const findHistoricalPayrollTotalHoursCols = (sheet: Worksheet, range: XlRange, title: { rowNumber: number; colIndex: number } | null) => {
  const matches: Array<{ rowNumber: number; colIndex: number }> = [];
  const seen = new Set<string>();
  if (!title) return matches;
  const rowStart = title.rowNumber;
  const rowEnd = range.rowCount - 1;
  const colStart = Math.max(0, title.colIndex - 8);
  const colEnd = Math.min(range.columnCount - 1, title.colIndex + 80);
  for (let rowNumber = rowStart; rowNumber <= rowEnd; rowNumber += 1) {
    for (let colIndex = colStart; colIndex <= colEnd; colIndex += 1) {
      const text = normalizeHistoricalSupplierName(getHistoricalBudgetCell(sheet, rowNumber, colIndex)?.text || getHistoricalBudgetCell(sheet, rowNumber, colIndex)?.value);
      if (!text.includes('TOTALHEURES')) continue;
      const key = rowNumber + '-' + colIndex;
      if (!seen.has(key)) {
        seen.add(key);
        matches.push({ rowNumber, colIndex });
      }
    }
  }
  return matches;
};

export const findHistoricalPayrollTargetColumn = (headerText: unknown, baseTargetCol: number) => {
  const rawHeader = String(headerText ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase();
  const header = normalizeHistoricalSupplierName(rawHeader);
  if (!header || /TOTAL|COUT|GLOBAL|PRODUCTIVITE|BUDGET|FRAIS|PERSONNEL|RATIO|ECART/.test(header)) return 0;

  const sectionOffset = header.includes('SALLE') ? 1 : 0;
  const spacedHeader = rawHeader.replace(/[^A-Z0-9]+/g, ' ').split(' ').filter(Boolean).join(' ');
  const isLevelOneTwo = spacedHeader.includes('NIV I II')
    || spacedHeader.includes('NIVEAU I II')
    || spacedHeader.includes('NIVEAU 1 2')
    || spacedHeader.includes('NIV 1 2')
    || header.includes('NIVIETII')
    || header.includes('NIVEAU1ET2')
    || header.includes('NIVEAUIETII');
  const isLevelThree = !isLevelOneTwo && (
    spacedHeader.includes('NIV III')
    || spacedHeader.includes('NIVEAU III')
    || spacedHeader.includes('NIV 3')
    || spacedHeader.includes('NIVEAU 3')
    || header.includes('NIVIII')
    || header.includes('NIVEAUIII')
    || header.includes('NIVEAU3')
  );

  if (header.includes('CADRE')) return baseTargetCol + sectionOffset;
  if (header.includes('MAITRISE')) return baseTargetCol + 2 + sectionOffset;
  if (isLevelOneTwo) return baseTargetCol + 4 + sectionOffset;
  if (isLevelThree) return baseTargetCol + 6 + sectionOffset;
  if (header.includes('APPRENTI')) return baseTargetCol + 8 + sectionOffset;
  return 0;
};

export const mapHistoricalPayrollStatusColumns = (sheet: Worksheet, headerRow: number, totalHoursCol: number | null, baseTargetCol: number) => {
  const map: Record<number, number> = {};
  if (totalHoursCol === null || totalHoursCol === undefined) return map;
  let foundStatusColumn = false;
  for (let colIndex = totalHoursCol + 1; colIndex <= totalHoursCol + 14; colIndex += 1) {
    const targetCol = findHistoricalPayrollTargetColumn(getHistoricalBudgetCell(sheet, headerRow, colIndex)?.text || getHistoricalBudgetCell(sheet, headerRow, colIndex)?.value, baseTargetCol);
    if (targetCol) {
      map[colIndex] = targetCol;
      foundStatusColumn = true;
    } else if (foundStatusColumn) {
      break;
    }
  }
  if (Object.keys(map).length > 0) return map;
  // Fallback pour les anciens onglets qui n'auraient pas d'en-tetes lisibles :
  // Cadre, Maitrise, NIV I/II, NIV III, Apprenti, poses cote Cuisine.
  map[totalHoursCol + 1] = baseTargetCol;
  map[totalHoursCol + 2] = baseTargetCol + 2;
  map[totalHoursCol + 3] = baseTargetCol + 4;
  map[totalHoursCol + 4] = baseTargetCol + 6;
  map[totalHoursCol + 5] = baseTargetCol + 8;
  return map;
};

export const getHistoricalPayrollColumnMaps = (sheet: Worksheet, range: XlRange) => {
  const projectionTitle = findHistoricalPayrollTitle(sheet, range, ['PROJECTIONSCAVECPLANIFICATIONSKELLO', 'PROJECTIONSC', 'PLANIFICATIONSKELLO']);
  const realiseTitle = findHistoricalPayrollTitle(sheet, range, ['FRAISPERSONNELREALISE']);
  const projectionMaps = findHistoricalPayrollTotalHoursCols(sheet, range, projectionTitle).map(match => ({
    group: 'projection' as const,
    headerRow: match.rowNumber,
    columns: mapHistoricalPayrollStatusColumns(sheet, match.rowNumber - 3, match.colIndex, 62),
  }));
  const realiseMaps = findHistoricalPayrollTotalHoursCols(sheet, range, realiseTitle).map(match => ({
    group: 'realise' as const,
    headerRow: match.rowNumber,
    columns: mapHistoricalPayrollStatusColumns(sheet, match.rowNumber - 3, match.colIndex, 77),
  }));
  return [...projectionMaps, ...realiseMaps];
};

export const selectHistoricalPayrollColumnMap = (rowNumber: number, columnMaps: HistoricalPayrollColumnMap[]) => {
  const selected: Record<number, number> = {};
  (['projection', 'realise'] as const).forEach(group => {
    const nearest = columnMaps
      .filter(map => map.group === group)
      .sort((a, b) => Math.abs(a.headerRow - rowNumber) - Math.abs(b.headerRow - rowNumber))[0];
    if (nearest) Object.assign(selected, nearest.columns);
  });
  return selected;
};

export const getHistoricalPayrollValues = (sheet: Worksheet, rowNumber: number, columnMap: Record<number, number>) => {
  const values: Record<number, string> = {};
  if (rowNumber < 0 || isHistoricalBudgetTotalRow(sheet, rowNumber)) return values;
  Object.entries(columnMap).forEach(([sourceColText, targetCol]) => {
    const hourValue = parseHistoricalPayrollHourCell(getHistoricalBudgetCell(sheet, rowNumber, Number(sourceColText)));
    if (hourValue) values[targetCol] = hourValue;
  });
  return values;
};

export const rowHasHistoricalPayrollValues = (values: Record<number, string>) => Object.keys(values).length > 0;

export const getBestHistoricalPayrollValues = (sheet: Worksheet, primaryRow: number, dateRow: number, columnMaps: HistoricalPayrollColumnMap[]) => {
  const candidateRows = Array.from(new Set([primaryRow, dateRow, dateRow - 1, dateRow - 2, dateRow - 3, dateRow - 4, dateRow + 1, dateRow + 2, dateRow + 3, dateRow + 4]));
  for (const candidateRow of candidateRows) {
    const columnMap = selectHistoricalPayrollColumnMap(candidateRow, columnMaps);
    const values = getHistoricalPayrollValues(sheet, candidateRow, columnMap);
    if (rowHasHistoricalPayrollValues(values)) return values;
  }
  return {};
};

export const sumHistoricalPayrollValues = (values: Record<number, string>) => (
  Object.values(values).reduce((sum, value) => sum + historicalPayrollHourToDecimal(value), 0)
);
