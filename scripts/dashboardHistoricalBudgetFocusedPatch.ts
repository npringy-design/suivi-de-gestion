import type { Plugin } from 'vite';

const replaceRequired = (code: string, from: string, to: string, label: string) => {
  if (!code.includes(from)) throw new Error('Patch correction import budget non applique : ' + label);
  return code.replace(from, to);
};

export const dashboardHistoricalBudgetFocusedPatch = (): Plugin => ({
  name: 'dashboard-historical-budget-focused-patch',
  enforce: 'pre',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').endsWith('/src/Dashboard.tsx')) return null;
    let next = code;

    next = replaceRequired(
      next,
      `  couvertsMidi: number;
  couvertsSoir: number;
  couvertsTotal: number;
  status: string;`,
      `  couvertsMidi: number;
  tmMidi: number;
  couvertsSoir: number;
  tmSoir: number;
  couvertsTotal: number;
  status: string;`,
      'type tm preview'
    );

    next = replaceRequired(
      next,
      `  const parseHistoricalBudgetCellDate = (cell: XLSX.CellObject | undefined) => {
    if (!cell) return null;
    return parseHistoricalBudgetDate(cell.v) || parseHistoricalBudgetDate(cell.w);
  };`,
      `  const parseHistoricalBudgetCellDate = (cell: XLSX.CellObject | undefined) => {
    if (!cell) return null;
    return parseHistoricalBudgetDate(cell.v) || parseHistoricalBudgetDate(cell.w);
  };

  const getHistoricalBudgetRowLabel = (sheet: XLSX.WorkSheet, rowNumber: number) => (
    [0, 1, 2, 3, 4, 5]
      .map(colIndex => {
        const cell = getHistoricalBudgetCell(sheet, rowNumber, colIndex);
        return String(cell?.w ?? cell?.v ?? '');
      })
      .join(' ')
      .toUpperCase()
  );

  const isHistoricalBudgetTotalRow = (sheet: XLSX.WorkSheet, rowNumber: number) => {
    if (rowNumber < 0) return false;
    const label = getHistoricalBudgetRowLabel(sheet, rowNumber);
    return label.includes('TOTAL') || label.includes('SEMAINE') || label.includes('CUMUL');
  };

  const getHistoricalBudgetRowValues = (sheet: XLSX.WorkSheet, rowNumber: number) => {
    if (rowNumber < 0 || isHistoricalBudgetTotalRow(sheet, rowNumber)) {
      return { couvertsMidi: 0, tmMidi: 0, couvertsSoir: 0, tmSoir: 0 };
    }
    const couvertsMidi = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, 11));
    const tmMidi = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, 12));
    const couvertsSoir = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, 15));
    const tmSoir = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, 16));
    return { couvertsMidi, tmMidi, couvertsSoir, tmSoir };
  };

  const rowHasHistoricalBudgetValues = (values: ReturnType<typeof getHistoricalBudgetRowValues>) => (
    values.couvertsMidi > 0 || values.tmMidi > 0 || values.couvertsSoir > 0 || values.tmSoir > 0
  );`,
      'helpers row values'
    );

    next = replaceRequired(
      next,
      `setHistoricalBudgetStatus('Lecture locale du budget historique Excel...');`,
      `setHistoricalBudgetStatus('Lecture locale du budget historique Excel sur le mois affiché...');`,
      'status lecture mois'
    );

    next = replaceRequired(
      next,
      `      for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {`,
      `      for (const monthIndex of [month]) {`,
      'limite mois affiche'
    );

    next = replaceRequired(
      next,
      `          const caMidi = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, 1));
          const caSoir = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, 3));
          const caTotal = caMidi + caSoir;
          const couvertsMidi = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, 11));
          const couvertsSoir = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, 15));
          const couvertsTotal = couvertsMidi + couvertsSoir;

          if (caTotal <= 0 && couvertsTotal <= 0) continue;`,
      `          if (isHistoricalBudgetTotalRow(sheet, rowNumber)) continue;

          const previousValues = getHistoricalBudgetRowValues(sheet, rowNumber - 1);
          const currentValues = getHistoricalBudgetRowValues(sheet, rowNumber);
          const values = rowHasHistoricalBudgetValues(previousValues) ? previousValues : currentValues;

          const couvertsMidi = values.couvertsMidi;
          const tmMidi = values.tmMidi;
          const couvertsSoir = values.couvertsSoir;
          const tmSoir = values.tmSoir;
          const couvertsTotal = couvertsMidi + couvertsSoir;
          const caMidi = couvertsMidi * tmMidi;
          const caSoir = couvertsSoir * tmSoir;
          const caTotal = caMidi + caSoir;

          if (couvertsTotal <= 0 && tmMidi <= 0 && tmSoir <= 0) continue;`,
      'lecture couverts tm'
    );

    next = replaceRequired(
      next,
      `            couvertsMidi,
            couvertsSoir,
            couvertsTotal,
            status: caTotal > 0 && couvertsTotal > 0 ? 'Budget détecté' : 'Budget partiel détecté',`,
      `            couvertsMidi,
            tmMidi,
            couvertsSoir,
            tmSoir,
            couvertsTotal,
            status: couvertsTotal > 0 && (tmMidi > 0 || tmSoir > 0) ? 'Prévision détectée' : 'Prévision partielle détectée',`,
      'preview push tm'
    );

    next = replaceRequired(
      next,
      `        ? previews.length + ' jour(s) budget trouvés sur ' + new Set(previews.map(item => item.month)).size + ' mois. Vérifie puis valide.'
        : 'Aucun budget journalier trouvé pour ' + year + '. Feuilles budget détectées : ' + (matchedSheets.join(', ') || 'aucune') + '. Lignes dates lues : ' + scannedDateRows + '.');`,
      `        ? previews.length + ' jour(s) prévision trouvés pour ' + monthNames[month] + ' ' + year + '. Vérifie puis valide.'
        : 'Aucune prévision couverts/TM trouvée pour ' + monthNames[month] + ' ' + year + '. Feuille détectée : ' + (matchedSheets.join(', ') || 'aucune') + '. Lignes dates lues : ' + scannedDateRows + '.');`,
      'status preview mois'
    );

    next = replaceRequired(
      next,
      `      updateDashboard(item.month, item.rowIndex + '-0', formatImportedNumber(item.caMidi));
      updateDashboard(item.month, item.rowIndex + '-1', formatImportedNumber(item.caSoir));
      updateDashboard(item.month, item.rowIndex + '-2', '');
      updateDashboard(item.month, item.rowIndex + '-6', formatImportedNumber(item.couvertsMidi, 0));
      updateDashboard(item.month, item.rowIndex + '-8', formatImportedNumber(item.couvertsSoir, 0));
      updateDashboard(item.month, item.rowIndex + '-14', '');`,
      `      updateDashboard(item.month, item.rowIndex + '-0', '');
      updateDashboard(item.month, item.rowIndex + '-1', '');
      updateDashboard(item.month, item.rowIndex + '-2', '');
      updateDashboard(item.month, item.rowIndex + '-6', formatImportedNumber(item.couvertsMidi, 0));
      updateDashboard(item.month, item.rowIndex + '-7', formatImportedNumber(item.tmMidi));
      updateDashboard(item.month, item.rowIndex + '-8', formatImportedNumber(item.couvertsSoir, 0));
      updateDashboard(item.month, item.rowIndex + '-9', formatImportedNumber(item.tmSoir));
      updateDashboard(item.month, item.rowIndex + '-14', '');
      updateDashboard(item.month, item.rowIndex + '-15', '');`,
      'application couverts tm'
    );

    next = replaceRequired(
      next,
      `setHistoricalBudgetStatus(historicalBudgetPreviews.length + ' jour(s) budget importés dans le suivi quotidien pour ' + year + '.');`,
      `setHistoricalBudgetStatus(historicalBudgetPreviews.length + ' jour(s) prévision couverts/TM importés dans ' + monthNames[month] + ' ' + year + '. Les CA seront recalculés automatiquement.');`,
      'status application'
    );

    next = replaceRequired(
      next,
      `Lit les feuilles JANV/FEV/etc. de l'annee affichee et prepare l'import des budgets journaliers. Limonade ignoree pour Thillois.`,
      `Lit uniquement le mois affiché et importe les prévisions couverts + TM. Les CA restent calculés par l'application.`,
      'texte carte import'
    );

    next = replaceRequired(
      next,
      `{historicalBudgetPreviews.length} jours · CA budget {formatImportedCurrencyLabel(historicalBudgetPreviews.reduce((sum, item) => sum + item.caTotal, 0))} · Couverts {formatImportedIntegerLabel(historicalBudgetPreviews.reduce((sum, item) => sum + item.couvertsTotal, 0))}`,
      `{historicalBudgetPreviews.length} jours · CA recalculé estimé {formatImportedCurrencyLabel(historicalBudgetPreviews.reduce((sum, item) => sum + item.caTotal, 0))} · Couverts {formatImportedIntegerLabel(historicalBudgetPreviews.reduce((sum, item) => sum + item.couvertsTotal, 0))}`,
      'resume preview'
    );

    next = replaceRequired(
      next,
      `<div style={{ fontSize: 11, fontWeight: 800 }}>Midi {formatImportedCurrencyLabel(item.caMidi)}</div>
                        <div style={{ fontSize: 11, fontWeight: 800 }}>Soir {formatImportedCurrencyLabel(item.caSoir)}</div>
                        <div style={{ fontSize: 11, fontWeight: 800 }}>Cts midi {formatImportedIntegerLabel(item.couvertsMidi)}</div>
                        <div style={{ fontSize: 11, fontWeight: 800 }}>Cts soir {formatImportedIntegerLabel(item.couvertsSoir)}</div>`,
      `<div style={{ fontSize: 11, fontWeight: 800 }}>Cts midi {formatImportedIntegerLabel(item.couvertsMidi)}</div>
                        <div style={{ fontSize: 11, fontWeight: 800 }}>TM midi {formatImportedCurrencyLabel(item.tmMidi)}</div>
                        <div style={{ fontSize: 11, fontWeight: 800 }}>Cts soir {formatImportedIntegerLabel(item.couvertsSoir)}</div>
                        <div style={{ fontSize: 11, fontWeight: 800 }}>TM soir {formatImportedCurrencyLabel(item.tmSoir)}</div>`,
      'lignes preview tm'
    );

    return { code: next, map: null };
  },
});
