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

  const getHistoricalPayrollHeaderText = (sheet: XLSX.WorkSheet, colIndex: number, rowNumber: number, range: XLSX.Range) => {
    const parts: string[] = [];
    const start = Math.max(range.s.r, rowNumber - 2);
    const end = Math.min(range.e.r, rowNumber + 8);
    for (let currentRow = start; currentRow <= end; currentRow += 1) {
      const cell = getHistoricalBudgetCell(sheet, currentRow, colIndex);
      const text = String(cell?.w ?? cell?.v ?? '').trim();
      if (text) parts.push(text);
    }
    return normalizeHistoricalSupplierName(parts.join(' '));
  };

  const getHistoricalPayrollOffset = (header: string) => {
    if (!header || /TOTAL|COUTGLOBAL|PRODUCTIVITE|BUDGET|PERSONNEL%|RATIO|ECART|VAR/.test(header)) return -1;
    const hasCuisine = header.includes('CUISINE');
    const hasSalle = header.includes('SALLE');
    if (!hasCuisine && !hasSalle) return -1;
    const sideOffset = hasSalle ? 1 : 0;

    if (header.includes('CADRE')) return sideOffset;
    if (header.includes('MAITRISE')) return 2 + sideOffset;
    if (header.includes('NIVIETII') || header.includes('NIVEAUIETII')) return 4 + sideOffset;
    if (header.includes('NIVIII') || header.includes('NIVEAUIII')) return 6 + sideOffset;
    if (header.includes('APPRENT')) return 8 + sideOffset;
    return -1;
  };

  const getHistoricalPayrollColumnMap = (sheet: XLSX.WorkSheet, range: XLSX.Range) => {
    const occurrences: Record<number, Set<number>> = {};
    const searchEndRow = Math.min(range.e.r, range.s.r + 180);

    for (let rowNumber = range.s.r; rowNumber <= searchEndRow; rowNumber += 1) {
      for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex += 1) {
        const header = getHistoricalPayrollHeaderText(sheet, colIndex, rowNumber, range);
        const offset = getHistoricalPayrollOffset(header);
        if (offset >= 0) {
          if (!occurrences[offset]) occurrences[offset] = new Set<number>();
          occurrences[offset].add(colIndex);
        }
      }
    }

    const map: Record<number, number> = {};
    Object.entries(occurrences).forEach(([offsetText, colSet]) => {
      const offset = Number(offsetText);
      const cols = Array.from(colSet).sort((a, b) => a - b);
      if (cols[0] !== undefined) map[cols[0]] = 62 + offset;
      if (cols[1] !== undefined) map[cols[1]] = 77 + offset;
    });
    return map;
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
