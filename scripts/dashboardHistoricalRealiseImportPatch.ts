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

    return { code: next, map: null };
  },
});
