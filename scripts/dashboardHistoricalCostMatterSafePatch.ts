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

  const getHistoricalCostMatterColumnMap = (sheet: XLSX.WorkSheet, range: XLSX.Range) => {
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

  const parseHistoricalCostMatterCellNumber = (cell: XLSX.CellObject | undefined) => {
    if (!cell) return 0;
    const rawValue = typeof cell.v === 'number' && Number.isFinite(cell.v) ? cell.v : parseHistoricalBudgetNumber(cell.v);
    const displayText = String(cell.w ?? cell.v ?? '')
      .replace(/−|–|—/g, '-')
      .replace(/\u00a0/g, ' ')
      .trim();
    const cleanedDisplay = displayText
      .replace(/\s/g, '')
      .replace(',', '.')
      .replace(/[^0-9.()\-]/g, '');
    const displayIsNegative = /^-/.test(cleanedDisplay) || /-$/.test(cleanedDisplay) || /^\(.*\)$/.test(cleanedDisplay);
    const displayNumber = Number(cleanedDisplay.replace(/[()\-]/g, '')) || 0;
    if (displayIsNegative) return -Math.abs(displayNumber || rawValue);
    return rawValue;
  };

  const getHistoricalCostMatterValues`
    );

    next = next.replace(
      'const amount = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, Number(sourceColText)));',
      'const amount = parseHistoricalCostMatterCellNumber(getHistoricalBudgetCell(sheet, rowNumber, Number(sourceColText)));'
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
