import type { Plugin } from 'vite';

const swap = (code: string, from: string, to: string) => code.includes(from) ? code.replace(from, to) : code;

export const dashboardHistoricalRealiseImportPatch = (): Plugin => ({
  name: 'dashboard-historical-realise-import-patch',
  enforce: 'pre',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').endsWith('/src/Dashboard.tsx')) return null;
    let next = code;

    next = swap(next, `  couvertsTotal: number;
  status: string;`, `  couvertsTotal: number;
  realiseVae: number;
  realiseMidi: number;
  realiseSoir: number;
  realiseLimo: number;
  realiseCouvertsMidi: number;
  realiseCouvertsSoir: number;
  realiseCouvertsLimo: number;
  status: string;`);

    next = swap(next, `  const rowHasHistoricalBudgetValues = (values: ReturnType<typeof getHistoricalBudgetRowValues>) => (
    values.couvertsMidi > 0 || values.tmMidi > 0 || values.couvertsSoir > 0 || values.tmSoir > 0
  );`, `  const rowHasHistoricalBudgetValues = (values: ReturnType<typeof getHistoricalBudgetRowValues>) => (
    values.couvertsMidi > 0 || values.tmMidi > 0 || values.couvertsSoir > 0 || values.tmSoir > 0
  );

  const getHistoricalRealiseRowValues = (sheet: XLSX.WorkSheet, rowNumber: number) => {
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

  const rowHasHistoricalRealiseValues = (values: ReturnType<typeof getHistoricalRealiseRowValues>) => (
    values.realiseVae > 0 || values.realiseMidi > 0 || values.realiseSoir > 0 || values.realiseLimo > 0 || values.realiseCouvertsMidi > 0 || values.realiseCouvertsSoir > 0 || values.realiseCouvertsLimo > 0
  );`);

    next = swap(next, `          const couvertsTotal = couvertsMidi + couvertsSoir;
          const caMidi = couvertsMidi * tmMidi;`, `          const couvertsTotal = couvertsMidi + couvertsSoir;
          let realiseSourceRow = rowNumber;
          if (rowHasHistoricalBudgetValues(previousValues)) realiseSourceRow = rowNumber - 1;
          else if (rowHasHistoricalBudgetValues(upperValues)) realiseSourceRow = rowNumber - 2;
          const realiseValues = getHistoricalRealiseRowValues(sheet, realiseSourceRow);
          const caMidi = couvertsMidi * tmMidi;`);

    next = swap(next, `          if (couvertsTotal <= 0 && tmMidi <= 0 && tmSoir <= 0) continue;`, `          if (couvertsTotal <= 0 && tmMidi <= 0 && tmSoir <= 0 && !rowHasHistoricalRealiseValues(realiseValues)) continue;`);

    next = swap(next, `            couvertsTotal,
            status:`, `            couvertsTotal,
            ...realiseValues,
            status:`);

    next = swap(next, `      updateDashboard(item.month, item.rowIndex + '-15', '');`, `      updateDashboard(item.month, item.rowIndex + '-15', '');
      updateDashboard(item.month, item.rowIndex + '-17', formatImportedNumber(item.realiseVae));
      updateDashboard(item.month, item.rowIndex + '-18', formatImportedNumber(item.realiseMidi));
      updateDashboard(item.month, item.rowIndex + '-19', formatImportedNumber(item.realiseSoir));
      updateDashboard(item.month, item.rowIndex + '-20', formatImportedNumber(item.realiseLimo));
      updateDashboard(item.month, item.rowIndex + '-25', formatImportedNumber(item.realiseCouvertsMidi, 0));
      updateDashboard(item.month, item.rowIndex + '-27', formatImportedNumber(item.realiseCouvertsSoir, 0));
      updateDashboard(item.month, item.rowIndex + '-34', formatImportedNumber(item.realiseCouvertsLimo, 0));`);

    next = swap(next, `Lit uniquement le mois affiché et importe les prévisions couverts + TM. Les CA restent calculés par l'application.`, `Lit uniquement le mois affiché et importe les prévisions couverts + TM ainsi que le réalisé CA/couverts. Les totaux restent calculés par l'application.`);

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
    const rawNumber = typeof cell.v === 'number' && Number.isFinite(cell.v)
      ? cell.v
      : parseHistoricalBudgetNumber(cell.v);
    if (rawNumber !== 0) return rawNumber;

    const displayText = String(cell.w ?? cell.v ?? '')
      .replace(/âˆ’|â€“|â€”/g, '-')
      .replace(/\\u00a0/g, ' ')
      .trim();
    const compact = displayText.replace(/\\s/g, '').replace(',', '.');
    const isNegative = /^-/.test(compact) || /-$/.test(compact) || /^\\(.*\\)$/.test(compact);
    const numericText = compact.replace(/[()\\-]/g, '').replace(/[^0-9.]/g, '');
    const displayNumber = Number(numericText) || 0;
    return isNegative ? -Math.abs(displayNumber) : displayNumber;
  };

  const getHistoricalCostMatterValues = (sheet: XLSX.WorkSheet, rowNumber: number, columnMap: Record<number, number>) => {
    const values: Record<number, number> = {};
    if (rowNumber < 0 || isHistoricalBudgetTotalRow(sheet, rowNumber)) return values;
    Object.entries(columnMap).forEach(([sourceColText, targetCol]) => {
      const amount = parseHistoricalCostMatterCellNumber(getHistoricalBudgetCell(sheet, rowNumber, Number(sourceColText)));
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
      historicalCostMatterSupplierCols.forEach(targetCol => {
        updateDashboard(item.month, item.rowIndex + '-' + targetCol, '');
      });
      Object.entries(item.costMatterValues || {}).forEach(([targetCol, amount]) => {
        updateDashboard(item.month, item.rowIndex + '-' + targetCol, formatImportedNumber(amount));
      });`);

    next = swap(next, `Lit uniquement le mois affichÃ© et importe les prÃ©visions couverts + TM ainsi que le rÃ©alisÃ© CA/couverts. Les totaux restent calculÃ©s par l'application.`, `Lit uniquement le mois affichÃ© et importe les prÃ©visions couverts + TM, le rÃ©alisÃ© CA/couverts et les achats coÃ»t matiÃ¨re par fournisseur. Les totaux restent calculÃ©s par l'application.`);

    next = swap(next, `{historicalBudgetPreviews.length} jours Â· CA budget {formatImportedCurrencyLabel(historicalBudgetPreviews.reduce((sum, item) => sum + item.caTotal, 0))} Â· CA rÃ©alisÃ© {formatImportedCurrencyLabel(historicalBudgetPreviews.reduce((sum, item) => sum + item.realiseVae + item.realiseMidi + item.realiseSoir + item.realiseLimo, 0))} Â· Couverts {formatImportedIntegerLabel(historicalBudgetPreviews.reduce((sum, item) => sum + item.couvertsTotal, 0))}`, `{historicalBudgetPreviews.length} jours Â· CA budget {formatImportedCurrencyLabel(historicalBudgetPreviews.reduce((sum, item) => sum + item.caTotal, 0))} Â· CA rÃ©alisÃ© {formatImportedCurrencyLabel(historicalBudgetPreviews.reduce((sum, item) => sum + item.realiseVae + item.realiseMidi + item.realiseSoir + item.realiseLimo, 0))} Â· Achats CM {formatImportedCurrencyLabel(historicalBudgetPreviews.reduce((sum, item) => sum + (item.costMatterTotal || 0), 0))} Â· Couverts {formatImportedIntegerLabel(historicalBudgetPreviews.reduce((sum, item) => sum + item.couvertsTotal, 0))}`);

    return { code: next, map: null };
  },
});
