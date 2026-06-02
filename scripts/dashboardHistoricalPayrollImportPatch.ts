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
      return display.replace(/[hH]/, ':') === '0:00' ? '' : display.replace(/[hH]/, ':');
    }

    const rawText = String(raw ?? '').trim();
    if (/^\d{1,4}[:hH]\d{2}$/.test(rawText)) {
      return rawText.replace(/[hH]/, ':') === '0:00' ? '' : rawText.replace(/[hH]/, ':');
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
    const searchEndRow = Math.min(range.e.r, range.s.r + 180);
    for (let rowNumber = range.s.r; rowNumber <= searchEndRow; rowNumber += 1) {
      for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex += 1) {
        const text = normalizeHistoricalSupplierName(getHistoricalBudgetCell(sheet, rowNumber, colIndex)?.w ?? getHistoricalBudgetCell(sheet, rowNumber, colIndex)?.v);
        if (needles.some(needle => text.includes(needle))) return { rowNumber, colIndex };
      }
    }
    return null;
  };

  const getHistoricalPayrollVerticalHeader = (sheet: XLSX.WorkSheet, colIndex: number, rowStart: number, rowEnd: number) => {
    const parts: string[] = [];
    for (let rowNumber = rowStart; rowNumber <= rowEnd; rowNumber += 1) {
      const cell = getHistoricalBudgetCell(sheet, rowNumber, colIndex);
      const text = String(cell?.w ?? cell?.v ?? '').trim();
      if (text) parts.push(text);
    }
    return normalizeHistoricalSupplierName(parts.join(' '));
  };

  const looksLikeHistoricalPayrollTotalHeader = (text: string) => text.includes('TOTAL') && text.includes('HEURES');

  const findHistoricalPayrollTotalHourColNear = (sheet: XLSX.WorkSheet, range: XLSX.Range, title: { rowNumber: number; colIndex: number } | null) => {
    if (!title) return null;
    const rowStart = title.rowNumber;
    const rowEnd = Math.min(range.e.r, title.rowNumber + 18);
    const colStart = Math.max(range.s.c, title.colIndex - 60);
    const colEnd = Math.min(range.e.c, title.colIndex + 80);
    for (let colIndex = colStart; colIndex <= colEnd; colIndex += 1) {
      const text = getHistoricalPayrollVerticalHeader(sheet, colIndex, rowStart, rowEnd);
      if (looksLikeHistoricalPayrollTotalHeader(text)) return colIndex;
    }
    return null;
  };

  const mapHistoricalPayrollFromTotalCol = (totalCol: number | null, baseTargetCol: number) => {
    const map: Record<number, number> = {};
    if (totalCol === null || totalCol === undefined) return map;
    for (let offset = 0; offset < 10; offset += 1) {
      map[totalCol + 1 + offset] = baseTargetCol + offset;
    }
    return map;
  };

  const getHistoricalPayrollColumnMap = (sheet: XLSX.WorkSheet, range: XLSX.Range) => {
    const projectionTitle = findHistoricalPayrollTitle(sheet, range, ['PROJECTIONSCAVECPLANIFICATIONSKELLO', 'PROJECTIONSC', 'PLANIFICATIONSKELLO']);
    const realiseTitle = findHistoricalPayrollTitle(sheet, range, ['FRAISPERSONNELREALISE']);
    const projectionTotalCol = findHistoricalPayrollTotalHourColNear(sheet, range, projectionTitle);
    const realiseTotalCol = findHistoricalPayrollTotalHourColNear(sheet, range, realiseTitle);

    const map = {
      ...mapHistoricalPayrollFromTotalCol(projectionTotalCol, 62),
      ...mapHistoricalPayrollFromTotalCol(realiseTotalCol, 77),
    };

    if (Object.keys(map).length > 0) return map;

    const totalHourCols: number[] = [];
    const searchEndRow = Math.min(range.e.r, range.s.r + 180);
    for (let rowNumber = range.s.r; rowNumber <= searchEndRow; rowNumber += 1) {
      for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex += 1) {
        const text = getHistoricalPayrollVerticalHeader(sheet, colIndex, rowNumber, Math.min(range.e.r, rowNumber + 10));
        if (looksLikeHistoricalPayrollTotalHeader(text) && !totalHourCols.includes(colIndex)) totalHourCols.push(colIndex);
      }
    }
    totalHourCols.sort((a, b) => a - b);

    return {
      ...mapHistoricalPayrollFromTotalCol(totalHourCols[0] ?? null, 62),
      ...mapHistoricalPayrollFromTotalCol(totalHourCols[1] ?? null, 77),
    };
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

  const sumHistoricalPayrollValues = (values: Record<number, string>) => (
    Object.values(values).reduce((sum, value) => sum + historicalPayrollHourToDecimal(value), 0)
  );`);

    next = swap(next, `        const costMatterColumnMap = getHistoricalCostMatterColumnMap(sheet, range);`, `        const costMatterColumnMap = getHistoricalCostMatterColumnMap(sheet, range);
        const payrollColumnMap = getHistoricalPayrollColumnMap(sheet, range);`);

    next = swap(next, `          const costMatterValues = getHistoricalCostMatterValues(sheet, rowNumber, costMatterColumnMap);
          const costMatterTotal = sumHistoricalCostMatterValues(costMatterValues);
          const caMidi = couvertsMidi * tmMidi;`, `          const costMatterValues = getHistoricalCostMatterValues(sheet, rowNumber, costMatterColumnMap);
          const costMatterTotal = sumHistoricalCostMatterValues(costMatterValues);
          const payrollValues = getHistoricalPayrollValues(sheet, realiseSourceRow, payrollColumnMap);
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
