import type { Plugin } from 'vite';

const replaceRequired = (code: string, from: string, to: string, label: string) => {
  if (!code.includes(from)) throw new Error('Patch correction import budget non applique : ' + label);
  return code.replace(from, to);
};

const swap = (code: string, from: string, to: string) => code.includes(from) ? code.replace(from, to) : code;

export const dashboardHistoricalBudgetFocusedPatch = (): Plugin => ({
  name: 'dashboard-historical-budget-focused-patch',
  enforce: 'pre',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').endsWith('/src/Dashboard.tsx')) return null;
    let next = code;

    if (next.includes("  couvertsMidi: number;\n  couvertsSoir: number;")) {
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
    }

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
      `          const previousValues = getHistoricalBudgetRowValues(sheet, rowNumber - 1);
          const upperValues = getHistoricalBudgetRowValues(sheet, rowNumber - 2);
          const currentValues = getHistoricalBudgetRowValues(sheet, rowNumber);
          const values = rowHasHistoricalBudgetValues(previousValues) ? previousValues : rowHasHistoricalBudgetValues(upperValues) ? upperValues : currentValues;

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



    // Vagues 8-9 pliees : realise historique, cout matiere historique et payroll historique.

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

    next = next.replace(
      /  const findHistoricalPayrollTargetColumn = \(headerText: unknown, baseTargetCol: number\) => \{[\s\S]*?  const mapHistoricalPayrollStatusColumns =/,
      `  const findHistoricalPayrollTargetColumn = (headerText: unknown, baseTargetCol: number) => {
    const rawHeader = String(headerText ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
    const header = normalizeHistoricalSupplierName(rawHeader);
    if (!header || /TOTAL|COUT|GLOBAL|PRODUCTIVITE|BUDGET|FRAIS|PERSONNEL|RATIO|ECART/.test(header)) return 0;

    const sectionOffset = header.includes('SALLE') ? 1 : 0;
    const spacedHeader = rawHeader.replace(/[^A-Z0-9]+/g, ' ').split(' ').filter(Boolean).join(' ');
    const isLevelOneTwo = spacedHeader.includes('NIV I II')
      || spacedHeader.includes('NIVEAU I II')
      || spacedHeader.includes('NIVEAU 1 2')
      || spacedHeader.includes('NIV 1 2')
      || header.includes('NIVIETII')
      || header.includes('NIVEAU1ET2')
      || header.includes('NIVEAUIETII');
    const isLevelThree = !isLevelOneTwo && (
      spacedHeader.includes('NIV III')
      || spacedHeader.includes('NIVEAU III')
      || spacedHeader.includes('NIV 3')
      || spacedHeader.includes('NIVEAU 3')
      || header.includes('NIVIII')
      || header.includes('NIVEAUIII')
      || header.includes('NIVEAU3')
    );

    if (header.includes('CADRE')) return baseTargetCol + sectionOffset;
    if (header.includes('MAITRISE')) return baseTargetCol + 2 + sectionOffset;
    if (isLevelOneTwo) return baseTargetCol + 4 + sectionOffset;
    if (isLevelThree) return baseTargetCol + 6 + sectionOffset;
    if (header.includes('APPRENTI')) return baseTargetCol + 8 + sectionOffset;
    return 0;
  };

  const mapHistoricalPayrollStatusColumns =`
    );

    return { code: next, map: null };
  },
});
