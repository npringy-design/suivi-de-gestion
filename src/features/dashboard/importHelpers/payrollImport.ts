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
export const historicalPayrollProjectionGlobalCols = [130, 131, 132, 133, 134];
export const historicalPayrollRealiseGlobalCols = [135, 136, 137, 138, 139];
export const historicalPayrollAllGlobalCols = [...historicalPayrollProjectionGlobalCols, ...historicalPayrollRealiseGlobalCols];

export const decimalHoursToHHMM = (decimal: number): string => {
  const totalMinutes = Math.round(decimal * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours === 0 && minutes === 0 ? '' : hours + ':' + String(minutes).padStart(2, '0');
};

export const parseHistoricalPayrollHourCell = (cell: Cell | undefined) => {
  if (!cell) return '';
  const display = String(cell.text || '')
    .replace(/−|–|—/g, '-')
    .replace(/\u00a0/g, ' ')
    .trim();
  const raw = cell.value;

  if (/^\d{1,4}[:hH]\d{2}$/.test(display)) {
    const normalized = display.replace(/[hH]/, ':');
    return /^0+:00$/.test(normalized) ? '' : normalized;
  }

  const rawText = String(raw ?? '').trim();
  if (/^\d{1,4}[:hH]\d{2}$/.test(rawText)) {
    const normalized = rawText.replace(/[hH]/, ':');
    return /^0+:00$/.test(normalized) ? '' : normalized;
  }

  if (raw instanceof Date) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const durationMs = raw.getTime() - excelEpoch;
    let totalMinutes: number;
    if (durationMs <= 24 * 3600 * 1000) {
      totalMinutes = raw.getUTCHours() * 60 + raw.getUTCMinutes();
    } else {
      totalMinutes = Math.round(raw.getTime() / 60000) + raw.getTimezoneOffset() - Math.round(excelEpoch / 60000);
    }
    return totalMinutes === 0 ? '' : Math.floor(totalMinutes / 60) + ':' + String(totalMinutes % 60).padStart(2, '0');
  }

  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    const hoursDecimal = raw < 1 ? raw * 24 : raw;
    return decimalHoursToHHMM(hoursDecimal);
  }

  const decimalCandidate = display || rawText;
  if (/^\d+(\.\d+)?$/.test(decimalCandidate)) {
    return decimalHoursToHHMM(parseFloat(decimalCandidate));
  }

  return '';
};

export const historicalPayrollHourToDecimal = (value: string) => {
  const match = value.match(/^(\d{1,4})[:hH](\d{2})$/);
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

export const findHistoricalPayrollTargetColumn = (headerText: unknown, baseTargetCol: number, baseGlobalCol: number) => {
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

  const hasZone = header.includes('CUISINE') || header.includes('SALLE');
  if (!hasZone) {
    if (header.includes('CADRE')) return baseGlobalCol;
    if (header.includes('MAITRISE')) return baseGlobalCol + 1;
    if (isLevelOneTwo) return baseGlobalCol + 2;
    if (isLevelThree) return baseGlobalCol + 3;
    if (header.includes('APPRENTI')) return baseGlobalCol + 4;
    return 0;
  }

  if (header.includes('CADRE')) return baseTargetCol + sectionOffset;
  if (header.includes('MAITRISE')) return baseTargetCol + 2 + sectionOffset;
  if (isLevelOneTwo) return baseTargetCol + 4 + sectionOffset;
  if (isLevelThree) return baseTargetCol + 6 + sectionOffset;
  if (header.includes('APPRENTI')) return baseTargetCol + 8 + sectionOffset;
  return 0;
};

export const mapHistoricalPayrollStatusColumns = (sheet: Worksheet, headerRow: number, totalHoursCol: number | null, baseTargetCol: number, baseGlobalCol: number) => {
  const map: Record<number, number> = {};
  if (totalHoursCol === null || totalHoursCol === undefined) return map;
  let foundStatusColumn = false;
  for (let colIndex = totalHoursCol + 1; colIndex <= totalHoursCol + 14; colIndex += 1) {
    const targetCol = findHistoricalPayrollTargetColumn(getHistoricalBudgetCell(sheet, headerRow, colIndex)?.text || getHistoricalBudgetCell(sheet, headerRow, colIndex)?.value, baseTargetCol, baseGlobalCol);
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
    columns: mapHistoricalPayrollStatusColumns(sheet, match.rowNumber - 3, match.colIndex, 62, 130),
  }));
  const realiseMaps = findHistoricalPayrollTotalHoursCols(sheet, range, realiseTitle).map(match => ({
    group: 'realise' as const,
    headerRow: match.rowNumber,
    columns: mapHistoricalPayrollStatusColumns(sheet, match.rowNumber - 3, match.colIndex, 77, 135),
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

// Compense un décalage d'en-tête ponctuel (quelques lignes) à l'intérieur de la même semaine.
// S'arrête dès qu'une ligne "Total Semaine" est rencontrée pour ne jamais retomber sur un
// autre jour de l'autre côté de cette ligne (qui produirait une duplication de ses valeurs).
const collectHistoricalPayrollOffsetCandidates = (sheet: Worksheet, dateRow: number, step: 1 | -1, maxSteps: number) => {
  const rows: number[] = [];
  let row = dateRow;
  for (let i = 0; i < maxSteps; i += 1) {
    row += step;
    if (row < 0 || isHistoricalBudgetTotalRow(sheet, row)) break;
    rows.push(row);
  }
  return rows;
};

export const getBestHistoricalPayrollValues = (sheet: Worksheet, primaryRow: number, dateRow: number, columnMaps: HistoricalPayrollColumnMap[]) => {
  const candidateRows = Array.from(new Set([
    primaryRow,
    dateRow,
    ...collectHistoricalPayrollOffsetCandidates(sheet, dateRow, -1, 4),
    ...collectHistoricalPayrollOffsetCandidates(sheet, dateRow, 1, 4),
  ]));
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
