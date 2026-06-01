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

    if (/^-?\d{1,4}[:hH]\d{2}$/.test(display)) {
      const normalized = display.replace(/[hH]/, ':');
      return /^0+:00$/.test(normalized) ? '' : normalized;
    }

    if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
      const hoursDecimal = raw <= 3 ? raw * 24 : raw;
      const totalMinutes = Math.round(hoursDecimal * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return hours === 0 && minutes === 0 ? '' : hours + ':' + String(minutes).padStart(2, '0');
    }

    const text = String(raw ?? display ?? '').trim();
    if (/^-?\d{1,4}[:hH]\d{2}$/.test(text)) {
      const normalized = text.replace(/[hH]/, ':');
      return /^0+:00$/.test(normalized) ? '' : normalized;
    }
    return '';
  };

  const historicalPayrollHourToDecimal = (value: string) => {
    const match = value.match(/^(\d{1,4})[:hH](\d{2})$/);
    if (!match) return 0;
    const hours = Number(match[1]) || 0;
    const minutes = Number(match[2]) || 0;
    return Math.round((hours + minutes / 60) * 100) / 100;
  };

  const findHistoricalPayrollTargetColumn = (headerText: string, mode: 'projection' | 'realise') => {
    const header = normalizeHistoricalSupplierName(headerText);
    if (!header || /TOTAL|COUTGLOBAL|PRODUCTIVITE|BUDGET|PERSONNEL|RATIO|ECART|VAR/.test(header)) return 0;
    const base = mode === 'projection' ? 62 : 77;
    const hasCuisine = header.includes('CUISINE');
    const hasSalle = header.includes('SALLE');
    if (!hasCuisine && !hasSalle) return 0;

    if (header.includes('CADRE')) return base + (hasSalle ? 1 : 0);
    if (header.includes('MAITRISE')) return base + 2 + (hasSalle ? 1 : 0);
    if (header.includes('NIVIETII') || header.includes('NIVEAUIETII') || header.includes('NIV12')) return base + 4 + (hasSalle ? 1 : 0);
    if (header.includes('NIVIII') || header.includes('NIVEAUIII') || header.includes('NIV3')) return base + 6 + (hasSalle ? 1 : 0);
    if (header.includes('APPRENT')) return base + 8 + (hasSalle ? 1 : 0);
    return 0;
  };

  const findHistoricalPayrollTitle = (sheet: XLSX.WorkSheet, range: XLSX.Range, needles: string[]) => {
    const searchEndRow = Math.min(range.e.r, range.s.r + 120);
    for (let rowNumber = range.s.r; rowNumber <= searchEndRow; rowNumber += 1) {
      for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex += 1) {
        const text = normalizeHistoricalSupplierName(getHistoricalBudgetCell(sheet, rowNumber, colIndex)?.w ?? getHistoricalBudgetCell(sheet, rowNumber, colIndex)?.v);
        if (needles.some(needle => text.includes(needle))) return { rowNumber, colIndex };
      }
    }
    return null;
  };

  const buildHistoricalPayrollSectionMap = (sheet: XLSX.WorkSheet, range: XLSX.Range, mode: 'projection' | 'realise') => {
    const title = mode === 'projection'
      ? findHistoricalPayrollTitle(sheet, range, ['PROJECTIONSCAVECPLANIFICATIONSKELLO', 'PROJECTIONSC'])
      : findHistoricalPayrollTitle(sheet, range, ['FRAISPERSONNELREALISE']);
    const map: Record<number, number> = {};
    if (!title) return map;

    const headerStartRow = title.rowNumber + 1;
    const headerEndRow = Math.min(range.e.r, title.rowNumber + 10);
    const colEnd = Math.min(range.e.c, title.colIndex + 24);

    for (let colIndex = title.colIndex; colIndex <= colEnd; colIndex += 1) {
      if (map[colIndex]) continue;
      const headerParts: string[] = [];
      for (let rowNumber = headerStartRow; rowNumber <= headerEndRow; rowNumber += 1) {
        const cell = getHistoricalBudgetCell(sheet, rowNumber, colIndex);
        const text = String(cell?.w ?? cell?.v ?? '').trim();
        if (text) headerParts.push(text);
      }
      const targetCol = findHistoricalPayrollTargetColumn(headerParts.join(' '), mode);
      if (targetCol) map[colIndex] = targetCol;
    }
    return map;
  };

  const getHistoricalPayrollColumnMap = (sheet: XLSX.WorkSheet, range: XLSX.Range) => ({
    ...buildHistoricalPayrollSectionMap(sheet, range, 'projection'),
    ...buildHistoricalPayrollSectionMap(sheet, range, 'realise'),
  });

  const getHistoricalPayrollValues = (sheet: XLSX.WorkSheet, rowNumber: number, columnMap: Record<number, number>) => {
    const values: Record<number, string> = {};
    if (rowNumber < 0 || isHistoricalBudgetTotalRow(sheet, rowNumber)) return values;
    Object.entries(columnMap).forEach(([sourceColText, targetCol]) => {
      const hourValue = parseHistoricalPayrollHourCell(getHistoricalBudgetCell(sheet, rowNumber, Number(sourceColText)));
      if (hourValue) values[targetCol] = hourValue;
    });
    return values;
  };

  const sumHistoricalPayrollValues = (values: Record<number, string>) => (
    Object.values(values).reduce((sum, value) => sum + historicalPayrollHourToDecimal(value), 0)
  );`);

    next = swap(next, `        const costMatterColumnMap = getHistoricalCostMatterColumnMap(sheet, range);`, `        const costMatterColumnMap = getHistoricalCostMatterColumnMap(sheet, range);
        const payrollColumnMap = getHistoricalPayrollColumnMap(sheet, range);`);

    next = swap(next, `          const costMatterValues = getHistoricalCostMatterValues(sheet, rowNumber, costMatterColumnMap);
          const costMatterTotal = sumHistoricalCostMatterValues(costMatterValues);
          const caMidi = couvertsMidi * tmMidi;`, `          const costMatterValues = getHistoricalCostMatterValues(sheet, rowNumber, costMatterColumnMap);
          const costMatterTotal = sumHistoricalCostMatterValues(costMatterValues);
          const payrollValues = getHistoricalPayrollValues(sheet, rowNumber, payrollColumnMap);
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
