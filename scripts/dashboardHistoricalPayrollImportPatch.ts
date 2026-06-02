import type { Plugin } from 'vite';

const swap = (code: string, from: string, to: string) => code.includes(from) ? code.replace(from, to) : code;

export const dashboardHistoricalPayrollImportPatch = (): Plugin => ({
  name: 'dashboard-historical-payroll-import-patch',
  enforce: 'pre',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').endsWith('/src/Dashboard.tsx')) return null;
    let next = code;

    next = swap(next, `  costMatterValues: Record<number, number>;
  costMatterTotal: number;
  status: string;`, `  costMatterValues: Record<number, number>;
  costMatterTotal: number;
  payrollValues: Record<number, string>;
  payrollTotalHours: number;
  status: string;`);

    next = swap(next, `  const sumHistoricalCostMatterValues = (values: Record<number, number>) => (
    Object.values(values).reduce((sum, value) => sum + value, 0)
  );`, `  const sumHistoricalCostMatterValues = (values: Record<number, number>) => (
    Object.values(values).reduce((sum, value) => sum + value, 0)
  );

  const historicalPayrollProjectionCols = [62, 63, 64, 65, 66, 67, 68, 69, 70, 71];
  const historicalPayrollRealiseCols = [77, 78, 79, 80, 81, 82, 83, 84, 85, 86];
  const historicalPayrollAllCols = [...historicalPayrollProjectionCols, ...historicalPayrollRealiseCols];

  const parseHistoricalPayrollHourCell = (cell: XLSX.CellObject | undefined) => {
    if (!cell) return '';
    const display = String(cell.w ?? '')
      .replace(/−|–|—/g, '-')
      .replace(/\u00a0/g, ' ')
      .trim();
    const raw = cell.v;

    if (/^\d{1,4}[:hH]\d{2}$/.test(display)) {
      const normalized = display.replace(/[hH]/, ':');
      return /^0+:00$/.test(normalized) ? '' : normalized;
    }

    const rawText = String(raw ?? '').trim();
    if (/^\d{1,4}[:hH]\d{2}$/.test(rawText)) {
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

  const historicalPayrollHourToDecimal = (value: string) => {
    const match = value.match(/^(\d{1,4})[:hH](\d{2})$/);
    if (!match) return 0;
    return Math.round(((Number(match[1]) || 0) + (Number(match[2]) || 0) / 60) * 100) / 100;
  };

  const findHistoricalPayrollTitle = (sheet: XLSX.WorkSheet, range: XLSX.Range, needles: string[]) => {
    for (let rowNumber = range.s.r; rowNumber <= range.e.r; rowNumber += 1) {
      for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex += 1) {
        const text = normalizeHistoricalSupplierName(getHistoricalBudgetCell(sheet, rowNumber, colIndex)?.w ?? getHistoricalBudgetCell(sheet, rowNumber, colIndex)?.v);
        if (needles.some(needle => text.includes(needle))) return { rowNumber, colIndex };
      }
    }
    return null;
  };

  type HistoricalPayrollColumnMap = {
    group: 'projection' | 'realise';
    headerRow: number;
    columns: Record<number, number>;
  };

  const findHistoricalPayrollTotalHoursCols = (sheet: XLSX.WorkSheet, range: XLSX.Range, title: { rowNumber: number; colIndex: number } | null) => {
    const matches: Array<{ rowNumber: number; colIndex: number }> = [];
    const seen = new Set<string>();
    if (!title) return matches;
    const rowStart = title.rowNumber;
    const rowEnd = range.e.r;
    const colStart = Math.max(range.s.c, title.colIndex - 8);
    const colEnd = Math.min(range.e.c, title.colIndex + 80);
    for (let rowNumber = rowStart; rowNumber <= rowEnd; rowNumber += 1) {
      for (let colIndex = colStart; colIndex <= colEnd; colIndex += 1) {
        const text = normalizeHistoricalSupplierName(getHistoricalBudgetCell(sheet, rowNumber, colIndex)?.w ?? getHistoricalBudgetCell(sheet, rowNumber, colIndex)?.v);
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

  const findHistoricalPayrollTargetColumn = (headerText: unknown, baseTargetCol: number) => {
    const header = normalizeHistoricalSupplierName(headerText);
    if (!header || /TOTAL|COUT|GLOBAL|PRODUCTIVITE|BUDGET|FRAIS|PERSONNEL|RATIO|ECART/.test(header)) return 0;
    const sectionOffset = header.includes('SALLE') ? 1 : 0;
    if (header.includes('CADRE')) return baseTargetCol + sectionOffset;
    if (header.includes('MAITRISE')) return baseTargetCol + 2 + sectionOffset;
    if (header.includes('NIVIETII') || header.includes('NIVEAU1ET2') || header.includes('NIVEAUIETII')) return baseTargetCol + 4 + sectionOffset;
    if (header.includes('NIVIII') || header.includes('NIVEAU3') || header.includes('NIVEAUIII')) return baseTargetCol + 6 + sectionOffset;
    if (header.includes('APPRENTI')) return baseTargetCol + 8 + sectionOffset;
    return 0;
  };

  const mapHistoricalPayrollStatusColumns = (sheet: XLSX.WorkSheet, headerRow: number, totalHoursCol: number | null, baseTargetCol: number) => {
    const map: Record<number, number> = {};
    if (totalHoursCol === null || totalHoursCol === undefined) return map;
    let foundStatusColumn = false;
    for (let colIndex = totalHoursCol + 1; colIndex <= totalHoursCol + 14; colIndex += 1) {
      const targetCol = findHistoricalPayrollTargetColumn(getHistoricalBudgetCell(sheet, headerRow, colIndex)?.w ?? getHistoricalBudgetCell(sheet, headerRow, colIndex)?.v, baseTargetCol);
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

  const getHistoricalPayrollColumnMaps = (sheet: XLSX.WorkSheet, range: XLSX.Range) => {
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

  const selectHistoricalPayrollColumnMap = (rowNumber: number, columnMaps: HistoricalPayrollColumnMap[]) => {
    const selected: Record<number, number> = {};
    (['projection', 'realise'] as const).forEach(group => {
      const nearest = columnMaps
        .filter(map => map.group === group)
        .sort((a, b) => Math.abs(a.headerRow - rowNumber) - Math.abs(b.headerRow - rowNumber))[0];
      if (nearest) Object.assign(selected, nearest.columns);
    });
    return selected;
  };

  const getHistoricalPayrollValues = (sheet: XLSX.WorkSheet, rowNumber: number, columnMap: Record<number, number>) => {
    const values: Record<number, string> = {};
    if (rowNumber < 0 || isHistoricalBudgetTotalRow(sheet, rowNumber)) return values;
    Object.entries(columnMap).forEach(([sourceColText, targetCol]) => {
      const hourValue = parseHistoricalPayrollHourCell(getHistoricalBudgetCell(sheet, rowNumber, Number(sourceColText)));
      if (hourValue) values[targetCol] = hourValue;
    });
    return values;
  };

  const rowHasHistoricalPayrollValues = (values: Record<number, string>) => Object.keys(values).length > 0;

  const getBestHistoricalPayrollValues = (sheet: XLSX.WorkSheet, primaryRow: number, dateRow: number, columnMaps: HistoricalPayrollColumnMap[]) => {
    const candidateRows = Array.from(new Set([primaryRow, dateRow, dateRow - 1, dateRow - 2, dateRow - 3, dateRow - 4, dateRow + 1, dateRow + 2, dateRow + 3, dateRow + 4]));
    for (const candidateRow of candidateRows) {
      const columnMap = selectHistoricalPayrollColumnMap(candidateRow, columnMaps);
      const values = getHistoricalPayrollValues(sheet, candidateRow, columnMap);
      if (rowHasHistoricalPayrollValues(values)) return values;
    }
    return {};
  };

  const sumHistoricalPayrollValues = (values: Record<number, string>) => (
    Object.values(values).reduce((sum, value) => sum + historicalPayrollHourToDecimal(value), 0)
  );`);

    next = swap(next, `        const costMatterColumnMap = getHistoricalCostMatterColumnMap(sheet, range);`, `        const costMatterColumnMap = getHistoricalCostMatterColumnMap(sheet, range);
        const payrollColumnMaps = getHistoricalPayrollColumnMaps(sheet, range);`);

    next = swap(next, `          const costMatterValues = getHistoricalCostMatterValues(sheet, rowNumber, costMatterColumnMap);
          const costMatterTotal = sumHistoricalCostMatterValues(costMatterValues);
          const caMidi = couvertsMidi * tmMidi;`, `          const costMatterValues = getHistoricalCostMatterValues(sheet, rowNumber, costMatterColumnMap);
          const costMatterTotal = sumHistoricalCostMatterValues(costMatterValues);
          const payrollValues = getBestHistoricalPayrollValues(sheet, realiseSourceRow, rowNumber, payrollColumnMaps);
          const payrollTotalHours = sumHistoricalPayrollValues(payrollValues);
          const caMidi = couvertsMidi * tmMidi;`);

    next = swap(next, `          if (couvertsTotal <= 0 && tmMidi <= 0 && tmSoir <= 0 && !rowHasHistoricalRealiseValues(realiseValues) && costMatterTotal === 0) continue;`, `          if (couvertsTotal <= 0 && tmMidi <= 0 && tmSoir <= 0 && !rowHasHistoricalRealiseValues(realiseValues) && costMatterTotal === 0 && payrollTotalHours === 0) continue;`);

    next = swap(next, `            costMatterValues,
            costMatterTotal,
            status:`, `            costMatterValues,
            costMatterTotal,
            payrollValues,
            payrollTotalHours,
            status:`);

    next = swap(next, `      Object.entries(item.costMatterValues || {}).forEach(([targetCol, amount]) => {
        updateDashboard(item.month, item.rowIndex + '-' + targetCol, formatImportedNumber(amount));
      });`, `      Object.entries(item.costMatterValues || {}).forEach(([targetCol, amount]) => {
        updateDashboard(item.month, item.rowIndex + '-' + targetCol, formatImportedNumber(amount));
      });
      historicalPayrollAllCols.forEach(targetCol => {
        updateDashboard(item.month, item.rowIndex + '-' + targetCol, '');
      });
      Object.entries(item.payrollValues || {}).forEach(([targetCol, hourValue]) => {
        updateDashboard(item.month, item.rowIndex + '-' + targetCol, String(hourValue));
      });`);

    next = swap(next, `Lit uniquement le mois affiché et importe les prévisions couverts + TM, le réalisé CA/couverts et les achats coût matière par fournisseur. Les totaux restent calculés par l'application.`, `Lit uniquement le mois affiché et importe les prévisions couverts + TM, le réalisé CA/couverts, les achats coût matière et les heures personnel projection/réalisé. Les totaux restent calculés par l'application.`);

    next = swap(next, `Achats CM {formatImportedCurrencyLabel(historicalBudgetPreviews.reduce((sum, item) => sum + (item.costMatterTotal || 0), 0))} · Couverts`, `Achats CM {formatImportedCurrencyLabel(historicalBudgetPreviews.reduce((sum, item) => sum + (item.costMatterTotal || 0), 0))} · Heures personnel {formatImportedNumber(historicalBudgetPreviews.reduce((sum, item) => sum + (item.payrollTotalHours || 0), 0)) || '-'} · Couverts`);

    next = swap(next, `<div style={{ fontSize: 11, fontWeight: 800 }}>Cts réels {formatImportedIntegerLabel(item.realiseCouvertsMidi + item.realiseCouvertsSoir)}</div>`, `<div style={{ fontSize: 11, fontWeight: 800 }}>Cts réels {formatImportedIntegerLabel(item.realiseCouvertsMidi + item.realiseCouvertsSoir)}</div>
                        <div style={{ fontSize: 11, fontWeight: 800 }}>Heures personnel {formatImportedNumber(item.payrollTotalHours || 0) || '-'}</div>`);

    return { code: next, map: null };
  },
});
