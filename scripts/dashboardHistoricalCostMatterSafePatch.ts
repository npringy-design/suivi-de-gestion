import type { Plugin } from 'vite';

export const dashboardHistoricalCostMatterSafePatch = (): Plugin => ({
  name: 'dashboard-historical-cost-matter-safe-patch',
  enforce: 'pre',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').endsWith('/src/Dashboard.tsx')) return null;
    let next = code;

    next = next.replace(
      /  const findHistoricalCostMatterTargetColumn = \(headerText: unknown\) => \{[\s\S]*?  const getHistoricalCostMatterColumnMap = \(sheet: XLSX\.WorkSheet, range: XLSX\.Range\) => \{[\s\S]*?  \};\n\n  const getHistoricalCostMatterValues/,
      `  const findHistoricalCostMatterTargetColumn = (headerText: unknown) => {
    const header = normalizeHistoricalSupplierName(headerText);
    if (!header || header.length < 3 || /DATE|TOTAL|CUMUL|RATIO|ACHATHT|ACHATS|LIQUIDE|SOLIDE|SANSSTOCK|COUTMATIERE|REALISE|PREVISION|BUDGET|RESTAURANT|JOUR|MIDI|SOIR/.test(header)) return 0;
    if (/EPISAVEUR.*5/.test(header)) return 53;
    if (/EPISAVEUR.*20|EPISAVEURO/.test(header)) return 52;
    const directAlias = historicalCostMatterAliases[header];
    if (directAlias) return directAlias;
    for (const targetCol of historicalCostMatterSupplierCols) {
      const appName = normalizeHistoricalSupplierName(dynamicColumns[targetCol]?.[2] || dynamicColumns[targetCol]?.[1]);
      if (appName && (header === appName || header.includes(appName))) return targetCol;
    }
    const alias = Object.entries(historicalCostMatterAliases)
      .sort((a, b) => b[0].length - a[0].length)
      .find(([key]) => key.length >= 4 && header.includes(key));
    return alias?.[1] || 0;
  };

  const getHistoricalCostMatterColumnMap = (sheet: XLSX.WorkSheet, range: XLSX.Range) => {
    const map: Record<number, number> = {};
    let titleRow = -1;
    let titleCol = range.s.c;
    const searchEndRow = Math.min(range.e.r, range.s.r + 80);
    for (let rowNumber = range.s.r; rowNumber <= searchEndRow; rowNumber += 1) {
      for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex += 1) {
        const cell = getHistoricalBudgetCell(sheet, rowNumber, colIndex);
        if (normalizeHistoricalSupplierName(cell?.w ?? cell?.v).includes('COUTMATIERE')) {
          titleRow = rowNumber;
          titleCol = colIndex;
          break;
        }
      }
      if (titleRow >= 0) break;
    }
    if (titleRow < 0) return map;

    const headerStartRow = titleRow + 1;
    const headerEndRow = Math.min(range.e.r, titleRow + 10);
    let maxSupplierCol = range.e.c;
    for (let rowNumber = headerStartRow; rowNumber <= headerEndRow; rowNumber += 1) {
      for (let colIndex = titleCol; colIndex <= range.e.c; colIndex += 1) {
        const cell = getHistoricalBudgetCell(sheet, rowNumber, colIndex);
        const header = normalizeHistoricalSupplierName(cell?.w ?? cell?.v);
        if (/TOTALHT|CUMULHT|SANSLESTOCK|RATIO/.test(header)) maxSupplierCol = Math.min(maxSupplierCol, colIndex - 1);
      }
    }

    for (let rowNumber = headerStartRow; rowNumber <= headerEndRow; rowNumber += 1) {
      for (let colIndex = Math.max(titleCol, 1); colIndex <= maxSupplierCol; colIndex += 1) {
        if (map[colIndex]) continue;
        const cell = getHistoricalBudgetCell(sheet, rowNumber, colIndex);
        const targetCol = findHistoricalCostMatterTargetColumn(cell?.w ?? cell?.v);
        if (targetCol) map[colIndex] = targetCol;
      }
    }
    return map;
  };

  const getHistoricalCostMatterValues`
    );

    next = next.replace(
      'const costMatterValues = getHistoricalCostMatterValues(sheet, realiseSourceRow, costMatterColumnMap);',
      'const costMatterValues = getHistoricalCostMatterValues(sheet, rowNumber, costMatterColumnMap);'
    );

    next = next.replace(
      `      Object.entries(item.costMatterValues || {}).forEach(([targetCol, amount]) => {`,
      `      historicalCostMatterSupplierCols.forEach(targetCol => {
        updateDashboard(item.month, item.rowIndex + '-' + targetCol, '');
      });
      Object.entries(item.costMatterValues || {}).forEach(([targetCol, amount]) => {`
    );

    return { code: next, map: null };
  },
});
