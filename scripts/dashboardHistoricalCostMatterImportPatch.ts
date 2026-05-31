import type { Plugin } from 'vite';

const swap = (code: string, from: string, to: string) => code.includes(from) ? code.replace(from, to) : code;

export const dashboardHistoricalCostMatterImportPatch = (): Plugin => ({
  name: 'dashboard-historical-cost-matter-import-patch',
  enforce: 'pre',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').endsWith('/src/Dashboard.tsx')) return null;
    let next = code;

    next = swap(next, `  realiseCouvertsLimo: number;
  status: string;`, `  realiseCouvertsLimo: number;
  costMatterValues: Record<number, number>;
  costMatterTotal: number;
  status: string;`);

    next = swap(next, `  const rowHasHistoricalRealiseValues = (values: ReturnType<typeof getHistoricalRealiseRowValues>) => (
    values.realiseVae > 0 || values.realiseMidi > 0 || values.realiseSoir > 0 || values.realiseLimo > 0 || values.realiseCouvertsMidi > 0 || values.realiseCouvertsSoir > 0 || values.realiseCouvertsLimo > 0
  );`, `  const rowHasHistoricalRealiseValues = (values: ReturnType<typeof getHistoricalRealiseRowValues>) => (
    values.realiseVae > 0 || values.realiseMidi > 0 || values.realiseSoir > 0 || values.realiseLimo > 0 || values.realiseCouvertsMidi > 0 || values.realiseCouvertsSoir > 0 || values.realiseCouvertsLimo > 0
  );

  const normalizeHistoricalSupplierName = (value: unknown) => String(value ?? '')
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .replace(/&/g, 'ET')
    .replace(/[^A-Z0-9]+/gi, '')
    .toUpperCase();

  const historicalCostMatterSupplierCols = [45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57];
  const historicalCostMatterAliases: Record<string, number> = {
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

  const findHistoricalCostMatterTargetColumn = (headerText: unknown) => {
    const header = normalizeHistoricalSupplierName(headerText);
    if (!header || /DATE|TOTAL|CUMUL|RATIO|ACHATHT|LIQUIDE|SOLIDE|SANSSTOCK/.test(header)) return 0;

    for (const targetCol of historicalCostMatterSupplierCols) {
      const appName = normalizeHistoricalSupplierName(dynamicColumns[targetCol]?.[2] || dynamicColumns[targetCol]?.[1]);
      if (appName && (header === appName || header.includes(appName) || appName.includes(header))) return targetCol;
    }

    const alias = Object.entries(historicalCostMatterAliases).find(([key]) => header.includes(key) || key.includes(header));
    return alias?.[1] || 0;
  };

  const getHistoricalCostMatterColumnMap = (sheet: XLSX.WorkSheet, range: XLSX.Range) => {
    const map: Record<number, number> = {};
    const headerEndRow = Math.min(range.e.r, range.s.r + 35);
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

  const getHistoricalCostMatterValues = (sheet: XLSX.WorkSheet, rowNumber: number, columnMap: Record<number, number>) => {
    const values: Record<number, number> = {};
    if (rowNumber < 0 || isHistoricalBudgetTotalRow(sheet, rowNumber)) return values;
    Object.entries(columnMap).forEach(([sourceColText, targetCol]) => {
      const amount = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, Number(sourceColText)));
      if (amount !== 0) values[targetCol] = (values[targetCol] || 0) + amount;
    });
    return values;
  };

  const sumHistoricalCostMatterValues = (values: Record<number, number>) => (
    Object.values(values).reduce((sum, value) => sum + value, 0)
  );`);

    next = swap(next, `        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');`, `        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
        const costMatterColumnMap = getHistoricalCostMatterColumnMap(sheet, range);`);

    next = swap(next, `          const realiseValues = getHistoricalRealiseRowValues(sheet, realiseSourceRow);
          const caMidi = couvertsMidi * tmMidi;`, `          const realiseValues = getHistoricalRealiseRowValues(sheet, realiseSourceRow);
          const costMatterValues = getHistoricalCostMatterValues(sheet, rowNumber, costMatterColumnMap);
          const costMatterTotal = sumHistoricalCostMatterValues(costMatterValues);
          const caMidi = couvertsMidi * tmMidi;`);

    next = swap(next, `          if (couvertsTotal <= 0 && tmMidi <= 0 && tmSoir <= 0 && !rowHasHistoricalRealiseValues(realiseValues)) continue;`, `          if (couvertsTotal <= 0 && tmMidi <= 0 && tmSoir <= 0 && !rowHasHistoricalRealiseValues(realiseValues) && costMatterTotal === 0) continue;`);

    next = swap(next, `            ...realiseValues,
            status:`, `            ...realiseValues,
            costMatterValues,
            costMatterTotal,
            status:`);

    next = swap(next, `      updateDashboard(item.month, item.rowIndex + '-34', formatImportedNumber(item.realiseCouvertsLimo, 0));`, `      updateDashboard(item.month, item.rowIndex + '-34', formatImportedNumber(item.realiseCouvertsLimo, 0));
      Object.entries(item.costMatterValues || {}).forEach(([targetCol, amount]) => {
        updateDashboard(item.month, item.rowIndex + '-' + targetCol, formatImportedNumber(amount));
      });`);

    next = swap(next, `Lit uniquement le mois affiché et importe les prévisions couverts + TM ainsi que le réalisé CA/couverts. Les totaux restent calculés par l'application.`, `Lit uniquement le mois affiché et importe les prévisions couverts + TM, le réalisé CA/couverts et les achats coût matière par fournisseur. Les totaux restent calculés par l'application.`);

    next = swap(next, `{historicalBudgetPreviews.length} jours · CA budget {formatImportedCurrencyLabel(historicalBudgetPreviews.reduce((sum, item) => sum + item.caTotal, 0))} · CA réalisé {formatImportedCurrencyLabel(historicalBudgetPreviews.reduce((sum, item) => sum + item.realiseVae + item.realiseMidi + item.realiseSoir + item.realiseLimo, 0))} · Couverts {formatImportedIntegerLabel(historicalBudgetPreviews.reduce((sum, item) => sum + item.couvertsTotal, 0))}`, `{historicalBudgetPreviews.length} jours · CA budget {formatImportedCurrencyLabel(historicalBudgetPreviews.reduce((sum, item) => sum + item.caTotal, 0))} · CA réalisé {formatImportedCurrencyLabel(historicalBudgetPreviews.reduce((sum, item) => sum + item.realiseVae + item.realiseMidi + item.realiseSoir + item.realiseLimo, 0))} · Achats CM {formatImportedCurrencyLabel(historicalBudgetPreviews.reduce((sum, item) => sum + (item.costMatterTotal || 0), 0))} · Couverts {formatImportedIntegerLabel(historicalBudgetPreviews.reduce((sum, item) => sum + item.couvertsTotal, 0))}`);

    return { code: next, map: null };
  },
});
