import React from 'react';
import { Workbook } from 'exceljs';
import type { Workbook as WorkbookType } from 'exceljs';

import type {
  DayDataBilanSynthese,
  DayDataTheorique,
  MonthData,
  MonthDataSalariesConfig,
  PersonnelInfo,
  PersonnelSchema,
} from '@/contexts/DataContext';
import { buildPayrollImportFromText, getPayrollTargetPeriodFromText } from '@/features/dashboard/importHelpers/personnelSalaryImport';
import { parseRecapPeriodeCaisse } from '@/features/caisse/caisseRecapPeriodeParser';
import type {
  CaisseImportPreview,
  DashboardColumn,
  DashboardRow,
  HistoricalBudgetPreview,
  InvoiceImportPreview,
  ParsedCaisseImport,
} from '@/features/dashboard/dashboardTypes';
import {
  extractCaisseNumbers,
  findCaisseAmount,
  findCaisseTheoriqueAmount,
  findCaisseTtcByRate,
  parseCaisseNumber,
} from '@/features/dashboard/importHelpers/caisseImport';
import {
  extractHistoricalDemarques,
  extractHistoricalFraisGeneraux,
  getHistoricalBudgetCell,
  getHistoricalBudgetRowValues,
  getHistoricalCostMatterColumnMap,
  getHistoricalCostMatterValues,
  getHistoricalRealiseRowValues,
  historicalCostMatterSupplierCols,
  parseHistoricalBudgetCellDate,
  rowHasHistoricalRealiseValues,
  sumHistoricalCostMatterValues,
  type HistoricalFgEntry,
  type HistoricalContratEntry,
} from '@/features/dashboard/importHelpers/historicalBudgetImport';
import {
  getBestHistoricalPayrollValues,
  getHistoricalPayrollColumnMaps,
  historicalPayrollAllCols,
  historicalPayrollAllGlobalCols,
  sumHistoricalPayrollValues,
} from '@/features/dashboard/importHelpers/payrollImport';
import {
  extractHistoricalV25Demarques,
  extractHistoricalV25FraisGeneraux,
  getHistoricalV25RowValues,
  getHistoricalPayrollColumnMaps as getV25PayrollColumnMaps,
} from '@/features/dashboard/importHelpers/historicalV25Import';

type DayRowEntry = { row: DashboardRow; index: number };
type ImportPreviewItem = { label: string; value: string };
type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

type UseDashboardImportHandlersParams = {
  month: number;
  year: number;
  dynamicColumns: DashboardColumn[];
  dayRows: DayRowEntry[];
  selectedDayEntry?: DayRowEntry;
  selectedDayRowIndex: number;
  selectedEntryDay: number;
  selectedDayLabel: string;
  setSelectedEntryDay: (day: number) => void;
  setMonth: (month: number) => void;
  setSelectedMonth: (month: number) => void;
  globalData: Record<number, MonthData>;
  monthNames: string[];
  historicalBudgetPreviews: HistoricalBudgetPreview[];
  historicalV25Previews: HistoricalBudgetPreview[];
  setImportStatus: (status: string) => void;
  setImportPreview: SetState<ImportPreviewItem[]>;
  setCaisseImportPreviews: SetState<CaisseImportPreview[]>;
  setInvoiceImportPreviews: SetState<InvoiceImportPreview[]>;
  setInvoiceImportStatus: (status: string) => void;
  setHistoricalBudgetPreviews: SetState<HistoricalBudgetPreview[]>;
  setHistoricalBudgetStatus: (status: string) => void;
  setHistoricalV25Previews: SetState<HistoricalBudgetPreview[]>;
  setHistoricalV25Status: (status: string) => void;
  setSalaryImportStatus: (status: string) => void;
  handleCellChange: (rowIndex: number, colIndex: number, value: string) => void;
  updateDashboard: (month: number, cellKey: string, value: string) => void;
  updateTheorique: (month: number, day: number, field: keyof DayDataTheorique, value: string | number) => void;
  updateBilanSynthese: (month: number, day: number, field: keyof DayDataBilanSynthese, value: string | number) => void;
  updateSalariesConfig: (month: number, data: MonthDataSalariesConfig) => void;
  updatePersonnelSchema: (month: number, schema: PersonnelSchema) => void;
  markMonthsAsLoaded: (year: number, months: number[]) => void;
  saveNow: () => Promise<void>;
  personnelInfos: PersonnelInfo[];
};

export function useDashboardImportHandlers({
  month,
  year,
  dynamicColumns,
  dayRows,
  selectedDayEntry,
  selectedDayRowIndex,
  selectedEntryDay,
  selectedDayLabel,
  setSelectedEntryDay,
  setMonth,
  setSelectedMonth,
  globalData,
  monthNames,
  historicalBudgetPreviews,
  historicalV25Previews,
  setImportStatus,
  setImportPreview,
  setCaisseImportPreviews,
  setInvoiceImportPreviews,
  setInvoiceImportStatus,
  setHistoricalBudgetPreviews,
  setHistoricalBudgetStatus,
  setHistoricalV25Previews,
  setHistoricalV25Status,
  setSalaryImportStatus,
  handleCellChange,
  updateDashboard,
  updateTheorique,
  updateBilanSynthese,
  updateSalariesConfig,
  updatePersonnelSchema,
  markMonthsAsLoaded,
  saveNow,
  personnelInfos,
}: UseDashboardImportHandlersParams) {
  const pendingDemarquesRef = React.useRef<Array<{
    date: string; personnel: number; operationnel: number; explication: string;
  }>>([]);
  const pendingV25DemarquesRef = React.useRef<Array<{
    date: string; personnel: number; operationnel: number; explication: string;
  }>>([]);
  const pendingFgRef = React.useRef<{
    monthIndex: number;
    entries: HistoricalFgEntry[];
    contrats: HistoricalContratEntry[];
  }[]>([]);
  const pendingV25FgRef = React.useRef<{
    monthIndex: number;
    entries: HistoricalFgEntry[];
    contrats: HistoricalContratEntry[];
  }[]>([]);
  const resetFgDataForMonth = (monthIndex: number) => {
    for (let box = 0; box <= 3; box++) {
      for (let colGroup = 0; colGroup <= 2; colGroup++) {
        for (let dIdx = 0; dIdx < 10; dIdx++) {
          const key = `fg-data-${box}-${colGroup}-${dIdx}`;
          updateDashboard(monthIndex, `${key}-0`, '');
          updateDashboard(monthIndex, `${key}-1`, '');
          updateDashboard(monthIndex, `${key}-2`, '');
          updateDashboard(monthIndex, `${key}-3`, '');
        }
      }
    }
    for (let i = 0; i < 25; i++) {
      const rowIndex = dayRows[i]?.index;
      if (rowIndex === undefined) continue;
      updateDashboard(monthIndex, `${rowIndex}-112`, '');
      updateDashboard(monthIndex, `${rowIndex}-113`, '');
    }
  };
  const formatImportedNumber = (value: number, decimals = 2) => value !== 0 ? value.toFixed(decimals) : '';
  const formatImportedCurrencyLabel = (value: number, decimals = 2) => formatImportedNumber(value, decimals) || '-';
  const formatImportedIntegerLabel = (value: number) => formatImportedNumber(value, 0) || '-';
  const formatImportBusinessDate = (day: number | null, monthValue: number | null, yearValue: number | null) => {
    if (!day || monthValue === null || monthValue < 0 || !yearValue) return '';
    const parsedDate = new Date(yearValue, monthValue, day);
    if (
      parsedDate.getFullYear() !== yearValue
      || parsedDate.getMonth() !== monthValue
      || parsedDate.getDate() !== day
    ) return '';
    return `${yearValue}-${String(monthValue + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };
  const formatImportBusinessDateLabel = (value: string) => {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
  };
  const normalizeImportText = (value: string) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/gi, ' ')
    .trim()
    .toUpperCase();
  const supplierTokens = (value: string) => normalizeImportText(value)
    .split(/\s+/)
    .filter(token => token.length >= 3 && !['SAS', 'SARL', 'SA', 'SNC', 'EURL', 'FRANCE', 'AGENCE', 'DEPANNAGE'].includes(token));
  const findConfiguredPurchaseSupplier = (evidenceText: string) => {
    const normalizedEvidence = normalizeImportText(evidenceText);
    const compactEvidence = normalizedEvidence.replace(/\s+/g, '');
    const scores: Array<{ col: number; score: number; coverage: number; name: string; tokenCount: number }> = [];
  
    for (let col = 45; col <= 57; col += 1) {
      const columnName = dynamicColumns[col]?.[2] || '';
      const columnTokens = supplierTokens(columnName);
      if (columnTokens.length === 0) continue;
  
      const normalizedColumnName = normalizeImportText(columnName);
      const compactColumnName = normalizedColumnName.replace(/\s+/g, '');
      const reverseCompactColumnName = [...columnTokens].reverse().join('');
      const matchedTokens = columnTokens.filter(token => normalizedEvidence.includes(token));
      const coverage = matchedTokens.length / columnTokens.length;
      const fullNameScore = normalizedEvidence.includes(normalizedColumnName) ? 4 : 0;
      const compactScore = compactEvidence.includes(compactColumnName) || compactEvidence.includes(reverseCompactColumnName) ? 3 : 0;
      const score = fullNameScore + compactScore + matchedTokens.length;
      if (score > 0) scores.push({ col, score, coverage, name: columnName, tokenCount: columnTokens.length });
    }
  
    if (scores.length === 0) return null;
  
    scores.sort((a, b) => b.score - a.score || b.coverage - a.coverage);
    const best = scores[0];
    const minScore = best.tokenCount === 1 ? 1 : 2;
    return best.score >= minScore && best.coverage >= 0.33 ? { supplier: best.name, targetCol: best.col } : null;
  };
  const getDashboardRowIndexForDay = (targetYear: number, targetMonth: number, targetDay: number) => {
    let rowIndex = 0;
    let weekCount = 1;
    const numDays = new Date(targetYear, targetMonth + 1, 0).getDate();
  
    for (let day = 1; day <= numDays; day += 1) {
      if (day === targetDay) return rowIndex;
      rowIndex += 1;
      if (new Date(targetYear, targetMonth, day).getDay() === 0) {
        rowIndex += 1;
        weekCount += 1;
      }
    }
  
    return -1;
  };
  
  const budgetSheetTokens = [
    ['JANV', 'JANVIER'],
    ['FEV', 'FEVR', 'FEVRIER', 'FÉV', 'FÉVR', 'FÉVRIER'],
    ['MARS'],
    ['AVRIL', 'AVR'],
    ['MAI'],
    ['JUIN'],
    ['JUIL', 'JUILLET'],
    ['AOUT', 'AOÛT'],
    ['SEPT', 'SEPTEMBRE'],
    ['OCT', 'OCTOBRE'],
    ['NOV', 'NOVEMBRE'],
    ['DEC', 'DÉC', 'DECEMBRE', 'DÉCEMBRE'],
  ];
  
  const normalizeExcelSheetName = (value: string) => value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9]+/gi, ' ')
    .trim()
    .toUpperCase();
  
  const findBudgetSheetName = (workbook: WorkbookType, targetMonth: number, targetYear: number) => {
    const yearShort = String(targetYear).slice(-2);
    const yearFull = String(targetYear);
    const tokens = budgetSheetTokens[targetMonth] || [];
    return workbook.worksheets.find(ws => {
      const normalized = normalizeExcelSheetName(ws.name);
      if (/BILAN|SAISIE|REPORTING|ANNUEL|REALISE/.test(normalized)) return false;
      const hasMonth = tokens.some(token => normalized.includes(normalizeExcelSheetName(token)));
      const parts = normalized.split(/s+/);
      const hasYear = normalized.includes(yearFull) || parts.includes(yearShort) || normalized.endsWith(yearShort);
      return hasMonth && hasYear;
    })?.name || '';
  };
  
  const handleHistoricalBudgetExcelImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setHistoricalBudgetStatus('Lecture locale du budget historique Excel — tous les mois du classeur...');
  
    try {
      const workbook = new Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const allDemarques: typeof pendingDemarquesRef.current = [];
      pendingFgRef.current = [];
      for (let mi = 0; mi < 12; mi++) {
        const sheetNameDem = findBudgetSheetName(workbook, mi, year);
        if (!sheetNameDem) continue;
        const sheetDem = workbook.getWorksheet(sheetNameDem);
        if (sheetDem) allDemarques.push(...extractHistoricalDemarques(sheetDem));
      }
      pendingDemarquesRef.current = allDemarques;
      const previews: HistoricalBudgetPreview[] = [];
      const matchedSheets: string[] = [];
      let scannedDateRows = 0;
  
      for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
        const sheetName = findBudgetSheetName(workbook, monthIndex, year);
        if (!sheetName) continue;
        matchedSheets.push(sheetName);
        const sheet = workbook.getWorksheet(sheetName);
        if (!sheet) continue;
        const range = { rowCount: sheet.rowCount, columnCount: sheet.columnCount };
        const costMatterColumnMap = getHistoricalCostMatterColumnMap(sheet, range);
        const payrollColumnMaps = getHistoricalPayrollColumnMaps(sheet, range);
  
        for (let rowNumber = 0; rowNumber <= range.rowCount - 1; rowNumber += 1) {
          const dateCell = getHistoricalBudgetCell(sheet, rowNumber, 0);
          const parsedDate = parseHistoricalBudgetCellDate(dateCell);
          if (!parsedDate) continue;
          // Ne retenir que les lignes dont la date est issue d'une formule Excel.
          // Les dates statiques (sans formule) sont des en-têtes de feuille, pas des lignes journalières.
          const cellValue = dateCell?.value;
          const isFormulaCell = cellValue != null
            && typeof cellValue === 'object'
            && 'result' in (cellValue as object);
          if (!isFormulaCell) continue;
          scannedDateRows += 1;
          if (parsedDate.getFullYear() !== year || parsedDate.getMonth() !== monthIndex) continue;
          const day = parsedDate.getDate();
          const rowIndex = getDashboardRowIndexForDay(year, monthIndex, day);
          if (rowIndex < 0) continue;
  
          const values = getHistoricalBudgetRowValues(sheet, rowNumber);

          const couvertsMidi = values.couvertsMidi;
          const tmMidi = values.tmMidi;
          const couvertsSoir = values.couvertsSoir;
          const tmSoir = values.tmSoir;
          const couvertsTotal = couvertsMidi + couvertsSoir;
          const realiseSourceRow = rowNumber;
          const realiseValues = getHistoricalRealiseRowValues(sheet, realiseSourceRow);
          const costMatterValues = getHistoricalCostMatterValues(sheet, rowNumber, costMatterColumnMap);
          const costMatterTotal = sumHistoricalCostMatterValues(costMatterValues);
          const payrollValues = getBestHistoricalPayrollValues(sheet, realiseSourceRow, rowNumber, payrollColumnMaps);
          const payrollTotalHours = sumHistoricalPayrollValues(payrollValues);
          const caMidi = couvertsMidi * tmMidi;
          const caSoir = couvertsSoir * tmSoir;
          const caTotal = caMidi + caSoir;
  
          if (couvertsTotal <= 0 && tmMidi <= 0 && tmSoir <= 0 && !rowHasHistoricalRealiseValues(realiseValues) && costMatterTotal === 0 && payrollTotalHours === 0) continue;
  
          previews.push({
            id: sheetName + '-' + rowNumber + '-' + day,
            sheetName,
            month: monthIndex,
            day,
            rowIndex,
            caMidi,
            caSoir,
            caTotal,
            couvertsMidi,
            tmMidi,
            couvertsSoir,
            tmSoir,
            couvertsTotal,
            ...realiseValues,
            costMatterValues,
            costMatterTotal,
            payrollValues,
            payrollTotalHours,
            status: couvertsTotal > 0 && (tmMidi > 0 || tmSoir > 0) ? 'Prévision détectée' : 'Prévision partielle détectée',
          });
        }

        // FG stockés pour application atomique lors de la validation
        const { entries: fgEntries, contrats } = extractHistoricalFraisGeneraux(sheet);
        pendingFgRef.current.push({ monthIndex, entries: fgEntries, contrats });
      }

      setHistoricalBudgetPreviews(previews);
      setImportPreview([]);
      setCaisseImportPreviews([]);
      setInvoiceImportPreviews([]);
      setHistoricalBudgetStatus(previews.length > 0
        ? `${previews.length} jour(s) trouvés sur ${matchedSheets.length} feuille(s) : ${matchedSheets.join(', ')}. Vérifiez puis validez.`
        : `Aucune prévision trouvée. Feuilles détectées : ${matchedSheets.join(', ') || 'aucune'}. Lignes dates lues : ${scannedDateRows}.`);
    } catch (error) {
      setHistoricalBudgetStatus('Erreur import budget Excel : ' + (error instanceof Error ? error.message : 'lecture impossible'));
    } finally {
      event.target.value = '';
    }
  };
  
  const applyHistoricalBudgetExcelImport = async () => {
    const usedColsByMonth = new Map<number, Set<number>>();
    historicalBudgetPreviews.forEach(item => {
      if (!usedColsByMonth.has(item.month)) usedColsByMonth.set(item.month, new Set());
      Object.keys(item.payrollValues || {}).forEach(col => usedColsByMonth.get(item.month)!.add(Number(col)));
    });
    usedColsByMonth.forEach((cols, monthIdx) => {
      const usesGlobal = historicalPayrollAllGlobalCols.some(col => cols.has(col));
      updatePersonnelSchema(monthIdx, usesGlobal ? 'global' : 'cuisine_salle');
    });
    historicalBudgetPreviews.forEach(item => {
      updateDashboard(item.month, item.rowIndex + '-0', item.caMidi > 0 ? formatImportedNumber(item.caMidi) : '');
      updateDashboard(item.month, item.rowIndex + '-1', item.caSoir > 0 ? formatImportedNumber(item.caSoir) : '');
      updateDashboard(item.month, item.rowIndex + '-2', '');
      updateDashboard(item.month, item.rowIndex + '-6', formatImportedNumber(item.couvertsMidi, 0));
      updateDashboard(item.month, item.rowIndex + '-7', formatImportedNumber(item.tmMidi));
      updateDashboard(item.month, item.rowIndex + '-8', formatImportedNumber(item.couvertsSoir, 0));
      updateDashboard(item.month, item.rowIndex + '-9', formatImportedNumber(item.tmSoir));
      updateDashboard(item.month, item.rowIndex + '-14', '');
      updateDashboard(item.month, item.rowIndex + '-15', '');
      updateDashboard(item.month, item.rowIndex + '-17', formatImportedNumber(item.realiseVae));
      updateDashboard(item.month, item.rowIndex + '-18', formatImportedNumber(item.realiseMidi));
      updateDashboard(item.month, item.rowIndex + '-19', formatImportedNumber(item.realiseSoir));
      updateDashboard(item.month, item.rowIndex + '-20', formatImportedNumber(item.realiseLimo));
      updateDashboard(item.month, item.rowIndex + '-25', formatImportedNumber(item.realiseCouvertsMidi, 0));
      updateDashboard(item.month, item.rowIndex + '-27', formatImportedNumber(item.realiseCouvertsSoir, 0));
      updateDashboard(item.month, item.rowIndex + '-34', formatImportedNumber(item.realiseCouvertsLimo, 0));
      historicalCostMatterSupplierCols.forEach(targetCol => {
        updateDashboard(item.month, item.rowIndex + '-' + targetCol, '');
      });
      Object.entries(item.costMatterValues || {}).forEach(([targetCol, amount]) => {
        updateDashboard(item.month, item.rowIndex + '-' + targetCol, formatImportedNumber(amount));
      });
      [...historicalPayrollAllCols, ...historicalPayrollAllGlobalCols].forEach(targetCol => {
        updateDashboard(item.month, item.rowIndex + '-' + targetCol, '');
      });
      Object.entries(item.payrollValues || {}).forEach(([targetCol, hourValue]) => {
        updateDashboard(item.month, item.rowIndex + '-' + targetCol, String(hourValue));
      });
    });
    // Reset + écriture des FG (atomique avec saveNow)
    const fgMonthsDone = new Set<number>();
    pendingFgRef.current.forEach(({ monthIndex, entries, contrats }) => {
      if (!fgMonthsDone.has(monthIndex)) {
        resetFgDataForMonth(monthIndex);
        fgMonthsDone.add(monthIndex);
      }
      entries.forEach(entry => {
        const key = `fg-data-${entry.box}-${entry.colGroup}-${entry.dIdx}`;
        updateDashboard(monthIndex, `${key}-0`, entry.date);
        updateDashboard(monthIndex, `${key}-1`, entry.fournisseur);
        updateDashboard(monthIndex, `${key}-2`, entry.motif);
        updateDashboard(monthIndex, `${key}-3`, entry.montant.toFixed(2));
      });
      contrats.forEach(contrat => {
        const rowIndex = dayRows[contrat.dIdx]?.index;
        if (rowIndex === undefined) return;
        updateDashboard(monthIndex, `${rowIndex}-112`, contrat.nom);
        updateDashboard(monthIndex, `${rowIndex}-113`, contrat.montant.toFixed(2));
      });
    });
    pendingFgRef.current = [];

    // Import démarques
    pendingDemarquesRef.current.forEach(dem => {
      const [demYear, demMonth, demDay] = dem.date.split('-').map(Number);
      if (demYear !== year) return;
      const demMonthIndex = demMonth - 1;
      const rowIndex = getDashboardRowIndexForDay(year, demMonthIndex, demDay);
      if (rowIndex < 0) return;
      if (dem.personnel > 0) updateDashboard(demMonthIndex, `${rowIndex}-39`, dem.personnel.toFixed(2));
      if (dem.operationnel > 0) updateDashboard(demMonthIndex, `${rowIndex}-41`, dem.operationnel.toFixed(2));
      if (dem.explication) updateDashboard(demMonthIndex, `${rowIndex}-44`, dem.explication);
    });
    pendingDemarquesRef.current = [];
    const importedMonths = [...new Set(historicalBudgetPreviews.map(item => item.month))];
    markMonthsAsLoaded(year, importedMonths);
    await saveNow();
    setHistoricalBudgetStatus(historicalBudgetPreviews.length + ' jour(s) prévision couverts/TM importés dans ' + monthNames[month] + ' ' + year + '. Les CA seront recalculés automatiquement.');
    setHistoricalBudgetPreviews([]);
  };

  // ─── Import budget V25 ──────────────────────────────────────────────────────

  const handleHistoricalV25ExcelImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setHistoricalV25Status('Lecture locale du budget historique Excel V25 — tous les mois du classeur...');

    try {
      const { Workbook } = await import('exceljs');
      const workbook = new Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());

      const allDemarques: typeof pendingV25DemarquesRef.current = [];
      pendingV25FgRef.current = [];
      for (let mi = 0; mi < 12; mi++) {
        const sheetNameDem = findBudgetSheetName(workbook, mi, year);
        if (!sheetNameDem) continue;
        const sheetDem = workbook.getWorksheet(sheetNameDem);
        if (sheetDem) allDemarques.push(...extractHistoricalV25Demarques(sheetDem));
      }
      pendingV25DemarquesRef.current = allDemarques;

      const previews: HistoricalBudgetPreview[] = [];
      const matchedSheets: string[] = [];
      let scannedDateRows = 0;

      for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
        const sheetName = findBudgetSheetName(workbook, monthIndex, year);
        if (!sheetName) continue;
        matchedSheets.push(sheetName);
        const sheet = workbook.getWorksheet(sheetName);
        if (!sheet) continue;
        const range = { rowCount: sheet.rowCount, columnCount: sheet.columnCount };
        const payrollColumnMaps = getV25PayrollColumnMaps(sheet, range);

        for (let rowNumber = 0; rowNumber <= range.rowCount - 1; rowNumber += 1) {
          const dateCell = getHistoricalBudgetCell(sheet, rowNumber, 0);
          const parsedDate = parseHistoricalBudgetCellDate(dateCell);
          if (!parsedDate) continue;
          scannedDateRows += 1;
          if (parsedDate.getFullYear() !== year || parsedDate.getMonth() !== monthIndex) continue;
          const day = parsedDate.getDate();
          const rowIndex = getDashboardRowIndexForDay(year, monthIndex, day);
          if (rowIndex < 0) continue;

          const v25Values = getHistoricalV25RowValues(sheet, rowNumber, payrollColumnMaps);
          const caTotal = v25Values.realiseVae + v25Values.realiseMidi + v25Values.realiseSoir + v25Values.realiseLimo;
          const couvertsTotal = v25Values.couvertsMidi + v25Values.couvertsSoir;

          if (caTotal === 0 && couvertsTotal === 0 && v25Values.costMatterTotal === 0 && v25Values.payrollTotalHours === 0) continue;

          previews.push({
            id: sheetName + '-' + rowNumber + '-' + day,
            sheetName,
            month: monthIndex,
            day,
            rowIndex,
            caMidi: v25Values.realiseMidi,
            caSoir: v25Values.realiseSoir,
            caTotal,
            couvertsMidi: v25Values.couvertsMidi,
            tmMidi: v25Values.tmMidi,
            couvertsSoir: v25Values.couvertsSoir,
            tmSoir: v25Values.tmSoir,
            couvertsTotal: v25Values.couvertsMidi + v25Values.couvertsSoir,
            realiseVae: v25Values.realiseVae,
            realiseMidi: v25Values.realiseMidi,
            realiseSoir: v25Values.realiseSoir,
            realiseLimo: v25Values.realiseLimo,
            realiseCouvertsMidi: v25Values.realiseCouvertsMidi,
            realiseCouvertsSoir: v25Values.realiseCouvertsSoir,
            realiseCouvertsLimo: 0,
            costMatterValues: v25Values.costMatterValues,
            costMatterTotal: v25Values.costMatterTotal,
            payrollValues: v25Values.payrollValues,
            payrollTotalHours: v25Values.payrollTotalHours,
            status: caTotal > 0 ? 'Réalisé V25 détecté' : 'Données partielles V25 détectées',
          });
        }

        // FG V25 stockés pour application atomique lors de la validation
        const { entries: fgEntries, contrats } = extractHistoricalV25FraisGeneraux(sheet);
        pendingV25FgRef.current.push({ monthIndex, entries: fgEntries, contrats });
      }

      setHistoricalV25Previews(previews);
      setImportPreview([]);
      setCaisseImportPreviews([]);
      setInvoiceImportPreviews([]);
      setHistoricalV25Status(previews.length > 0
        ? `Budget V25 — ${previews.length} jour(s) trouvés sur ${matchedSheets.length} feuille(s) : ${matchedSheets.join(', ')}. Vérifiez puis validez.`
        : `Budget V25 — Aucun réalisé trouvé. Feuilles détectées : ${matchedSheets.join(', ') || 'aucune'}. Lignes dates lues : ${scannedDateRows}.`);
    } catch (error) {
      setHistoricalV25Status('Erreur import budget V25 : ' + (error instanceof Error ? error.message : 'lecture impossible'));
    } finally {
      event.target.value = '';
    }
  };

  const applyHistoricalV25ExcelImport = async () => {
    const usedColsByMonth = new Map<number, Set<number>>();
    historicalV25Previews.forEach(item => {
      if (!usedColsByMonth.has(item.month)) usedColsByMonth.set(item.month, new Set());
      Object.keys(item.payrollValues || {}).forEach(col => usedColsByMonth.get(item.month)!.add(Number(col)));
    });
    usedColsByMonth.forEach((cols, monthIdx) => {
      const usesGlobal = historicalPayrollAllGlobalCols.some(col => cols.has(col));
      updatePersonnelSchema(monthIdx, usesGlobal ? 'global' : 'cuisine_salle');
    });

    // Reset complet de toutes les colonnes V25 pour chaque ligne importée (garantit l'idempotence)
    const V25_REALISE_COLS = [6, 7, 8, 9, 17, 18, 19, 20, 25, 27, 34];
    const V25_DEMARQUE_COLS = [39, 41, 44];
    historicalV25Previews.forEach(item => {
      V25_REALISE_COLS.forEach(col => {
        updateDashboard(item.month, item.rowIndex + '-' + col, '');
      });
      V25_DEMARQUE_COLS.forEach(col => {
        updateDashboard(item.month, item.rowIndex + '-' + col, '');
      });
      historicalCostMatterSupplierCols.forEach(col => {
        updateDashboard(item.month, item.rowIndex + '-' + col, '');
      });
      [...historicalPayrollAllCols, ...historicalPayrollAllGlobalCols].forEach(col => {
        updateDashboard(item.month, item.rowIndex + '-' + col, '');
      });
    });

    historicalV25Previews.forEach(item => {
      // Budget couverts / TM
      updateDashboard(item.month, item.rowIndex + '-6',  formatImportedNumber(item.couvertsMidi, 0));
      updateDashboard(item.month, item.rowIndex + '-7',  formatImportedNumber(item.tmMidi));
      updateDashboard(item.month, item.rowIndex + '-8',  formatImportedNumber(item.couvertsSoir, 0));
      updateDashboard(item.month, item.rowIndex + '-9',  formatImportedNumber(item.tmSoir));
      // Réalisé CA
      updateDashboard(item.month, item.rowIndex + '-17', formatImportedNumber(item.realiseVae));
      updateDashboard(item.month, item.rowIndex + '-18', formatImportedNumber(item.realiseMidi));
      updateDashboard(item.month, item.rowIndex + '-19', formatImportedNumber(item.realiseSoir));
      updateDashboard(item.month, item.rowIndex + '-20', formatImportedNumber(item.realiseLimo));
      updateDashboard(item.month, item.rowIndex + '-25', formatImportedNumber(item.realiseCouvertsMidi, 0));
      updateDashboard(item.month, item.rowIndex + '-27', formatImportedNumber(item.realiseCouvertsSoir, 0));
      updateDashboard(item.month, item.rowIndex + '-34', formatImportedNumber(item.realiseCouvertsLimo, 0));
      // Coût matière
      historicalCostMatterSupplierCols.forEach(targetCol => {
        updateDashboard(item.month, item.rowIndex + '-' + targetCol, '');
      });
      Object.entries(item.costMatterValues || {}).forEach(([targetCol, amount]) => {
        updateDashboard(item.month, item.rowIndex + '-' + targetCol, formatImportedNumber(amount));
      });
      // Personnel
      [...historicalPayrollAllCols, ...historicalPayrollAllGlobalCols].forEach(targetCol => {
        updateDashboard(item.month, item.rowIndex + '-' + targetCol, '');
      });
      Object.entries(item.payrollValues || {}).forEach(([targetCol, hourValue]) => {
        updateDashboard(item.month, item.rowIndex + '-' + targetCol, String(hourValue));
      });
    });

    // Reset + écriture des FG V25 (atomique avec saveNow)
    const fgV25MonthsDone = new Set<number>();
    pendingV25FgRef.current.forEach(({ monthIndex, entries, contrats }) => {
      if (!fgV25MonthsDone.has(monthIndex)) {
        resetFgDataForMonth(monthIndex);
        fgV25MonthsDone.add(monthIndex);
      }
      entries.forEach(entry => {
        const key = `fg-data-${entry.box}-${entry.colGroup}-${entry.dIdx}`;
        updateDashboard(monthIndex, `${key}-0`, entry.date);
        updateDashboard(monthIndex, `${key}-1`, entry.fournisseur);
        updateDashboard(monthIndex, `${key}-2`, entry.motif);
        updateDashboard(monthIndex, `${key}-3`, entry.montant.toFixed(2));
      });
      contrats.forEach(contrat => {
        const rowIndex = dayRows[contrat.dIdx]?.index;
        if (rowIndex === undefined) return;
        updateDashboard(monthIndex, `${rowIndex}-112`, contrat.nom);
        updateDashboard(monthIndex, `${rowIndex}-113`, contrat.montant.toFixed(2));
      });
    });
    pendingV25FgRef.current = [];

    // Démarques
    pendingV25DemarquesRef.current.forEach(dem => {
      const [demYear, demMonth, demDay] = dem.date.split('-').map(Number);
      if (demYear !== year) return;
      const demMonthIndex = demMonth - 1;
      const rowIndex = getDashboardRowIndexForDay(year, demMonthIndex, demDay);
      if (rowIndex < 0) return;
      if (dem.personnel > 0) updateDashboard(demMonthIndex, `${rowIndex}-39`, dem.personnel.toFixed(2));
      if (dem.operationnel > 0) updateDashboard(demMonthIndex, `${rowIndex}-41`, dem.operationnel.toFixed(2));
      if (dem.explication) updateDashboard(demMonthIndex, `${rowIndex}-44`, dem.explication);
    });
    pendingV25DemarquesRef.current = [];

    const importedMonths = [...new Set(historicalV25Previews.map(item => item.month))];
    markMonthsAsLoaded(year, importedMonths);
    await saveNow();
    setHistoricalV25Status(historicalV25Previews.length + ' jour(s) V25 importés dans ' + year + '. Les CA seront recalculés automatiquement.');
    setHistoricalV25Previews([]);
  };

  const parseInvoiceNumber = (value: string) => {
    const cleaned = value.replace(/[^\d,.-]/g, '').replace(/\s/g, '');
    if (cleaned.includes(',')) {
      return Number(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
    }
    return Number(cleaned) || 0;
  };
  
  const formatInvoiceAmount = (value: number) => value > 0 ? value.toFixed(2) : '';
  
  const normalizeInvoiceDate = (value: string) => {
    const match = value.match(/(\d{2})[./-](\d{2})[./-](\d{2,4})/);
    if (!match) return '';
    const [, day, monthValue, yearValue] = match;
    if (!day || !monthValue || !yearValue) return '';
    const fullYear = yearValue.length === 2 ? `20${yearValue}` : yearValue;
    const parsedDate = new Date(Number(fullYear), Number(monthValue) - 1, Number(day));
    if (
      parsedDate.getFullYear() !== Number(fullYear)
      || parsedDate.getMonth() !== Number(monthValue) - 1
      || parsedDate.getDate() !== Number(day)
    ) return '';
    return `${fullYear}-${monthValue}-${day}`;
  };
  
  const formatInvoiceDateLabel = (value: string) => {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
  };
  
  const isValidInvoiceDateValue = (value: string) => {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;
    const parsedDate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return parsedDate.getFullYear() === Number(match[1])
      && parsedDate.getMonth() === Number(match[2]) - 1
      && parsedDate.getDate() === Number(match[3]);
  };
  
  const findInvoiceDate = (text: string) => {
    const lines = text
      .replace(/\u00a0/g, ' ')
      .split(/\r?\n/)
      .map(line => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  
    const dateLinePatterns = [
      /f\s*a\s*c\s*t\s*u\s*r\s*e.{0,80}\bdu\s+(\d{2}[./-]\d{2}[./-]\d{2,4})/i,
      /(?:date\s*:?\s*)?(\d{2}[./-]\d{2}[./-]\d{2,4}).{0,40}f\s*a\s*c\s*t\s*u\s*r\s*e/i,
      /f\s*a\s*c\s*t\s*u\s*r\s*e.{0,40}(?:date\s*:?\s*)?(\d{2}[./-]\d{2}[./-]\d{2,4})/i,
      /date\s+(?:de\s+facturation|facture)\s*:?\s*(\d{2}[./-]\d{2}[./-]\d{2,4})/i,
      /date\s*:?\s*(\d{2}[./-]\d{2}[./-]\d{2,4})/i,
    ];
  
    for (const line of lines) {
      for (const pattern of dateLinePatterns) {
        const match = line.match(pattern);
        if (match?.[1]) return normalizeInvoiceDate(match[1]);
      }
    }
  
    const allDates = lines.join(' ').match(/\d{2}[./-]\d{2}[./-]\d{2,4}/g) || [];
    const plausibleDates = allDates.filter(date => !/^(?:27|28|29|30|31)[./-](?:0[1-9]|1[0-2])[./-](?:2[6-9]|20[2-9]\d)$/.test(date));
    return normalizeInvoiceDate(plausibleDates[0] || allDates[0] || '');
  };
  
  const findInvoiceDateFromFileName = (fileName: string) => {
    const baseName = fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
    const dateMatch = baseName.match(/\b(\d{1,2})[.\-/ ](\d{1,2})(?:[.\-/ ](\d{2,4}))?\b/);
    if (!dateMatch) return '';
    const day = Number(dateMatch[1]);
    const monthValue = Number(dateMatch[2]);
    const yearValue = dateMatch[3] ? Number(dateMatch[3]) : year;
    const fullYear = yearValue < 100 ? 2000 + yearValue : yearValue;
    if (day < 1 || day > 31 || monthValue < 1 || monthValue > 12) return '';
    return `${fullYear}-${String(monthValue).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };
  
  const findInvoiceSupplierFromFileName = (fileName: string) => {
    const cleanedName = fileName
      .replace(/\.[^.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\b(?:facture|fac|invoice|avoir|scan|pdf)\b/gi, ' ')
      .replace(/\b\d{1,2}[.\-/ ]\d{1,2}(?:[.\-/ ]\d{2,4})?\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const configuredSupplier = findConfiguredPurchaseSupplier(cleanedName);
    return {
      supplier: configuredSupplier?.supplier || cleanedName || 'Fournisseur à renseigner',
      targetCol: configuredSupplier?.targetCol || 56,
    };
  };
  
  const findInvoiceSupplier = (text: string) => {
    const lines = text
      .split(/\r?\n/)
      .map(line => line.replace(/\s+/g, ' ').trim())
      .filter(line => line.length >= 3 && /[A-Za-zÀ-ÿ]/.test(line));
    const recipientZoneStart = lines.findIndex(line => /adresse\s+facturation|adresse\s+livraison|destinataire\s+facture|client\s*:|n°\s*client/i.test(line));
    const issuerEvidenceLines = lines.filter((line, index) => {
      const isBeforeRecipient = recipientZoneStart < 0 || index < recipientZoneStart;
      const isIssuerLegalLine = /\b(S\.?\s*A\.?\s*S\.?|SAS|SARL|S\.?\s*A\.?|SNC|EURL)\b/i.test(line)
        && /rcs|siret|capital|si[eè]ge\s+social|tva/i.test(line)
        && !/destinataire|facturation|livraison|client/i.test(line);
      return isBeforeRecipient || isIssuerLegalLine;
    });
    const configuredSupplier = findConfiguredPurchaseSupplier(issuerEvidenceLines.join(' '));
    if (configuredSupplier) return configuredSupplier;
  
    const supplierZoneEnd = lines.findIndex(line => /adresse\s+facturation|adresse\s+livraison|destinataire\s+facture|code\s+art|designation/i.test(line));
    const supplierZone = lines.slice(0, supplierZoneEnd > 0 ? supplierZoneEnd : Math.min(lines.length, 15));
    const ignored = /agence|adresse|facturation|livraison|telephone|t[ée]l|fax|mail|www|client|compte|page|facture|invoice|avoir|date|total|montant|tva|siret|sirene|numero|n°|code\s+ape|capital|rcs|parc|rue|avenue|boulevard|cedex|france/i;
  
    const cleanSupplierCandidate = (line: string) => line
      .replace(/\b(S\.?\s*A\.?\s*S\.?|SAS|SARL|S\.?\s*A\.?|SNC|EURL)\b\.?/gi, '')
      .replace(/\s+au\s+capital[\s\S]*$/i, '')
      .replace(/\s+-\s+R\.?C\.?S[\s\S]*$/i, '')
      .replace(/\s+RCS[\s\S]*$/i, '')
      .replace(/\s+TVA[\s\S]*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  
    const legalLine = supplierZone.find(line => /\b(S\.?\s*A\.?\s*S\.?|SAS|SARL|S\.?\s*A\.?|SNC|EURL)\b/i.test(line) && !/adresse|facturation|livraison|client/i.test(line));
    const fallbackLine = supplierZone.find(line => !ignored.test(line) && supplierTokens(line).length > 0);
    const supplier = cleanSupplierCandidate(legalLine || fallbackLine || '');
    const supplierTokenSet = new Set(supplierTokens(supplier));
  
    let targetCol = 45;
    let bestScore = 0;
    for (let col = 45; col <= 57; col += 1) {
      const columnName = dynamicColumns[col]?.[2] || '';
      const columnTokens = supplierTokens(columnName);
      const score = columnTokens.reduce((sum, token) => sum + (supplierTokenSet.has(token) ? 1 : 0), 0);
      if (score > bestScore) {
        bestScore = score;
        targetCol = col;
      }
    }
  
    return {
      supplier: supplier || 'Fournisseur à renseigner',
      targetCol,
    };
  };
  
  const findInvoiceAmountHt = (text: string) => {
    const normalizedText = text
      .replace(/\u00a0/g, ' ')
      .replace(/€/g, '€')
      .replace(/\s+/g, ' ')
      .trim();
    const amountToken = '(-?\\d{1,3}(?:[\\s.]\\d{3})*(?:[,.]\\d{2})|-?\\d+[,.]\\d{2})';
    const visualLines = text
      .replace(/\u00a0/g, ' ')
      .split(/\r?\n/)
      .map(line => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    const taxTableHeaderIndex = visualLines.findIndex(line => /base\s*h\.?\s*t\.?|baseht/i.test(line) && /montant\s+tva|t\.?\s*t\.?\s*c\.?/i.test(line));
    if (taxTableHeaderIndex >= 0) {
      const candidateLines = visualLines.slice(taxTableHeaderIndex + 1, taxTableHeaderIndex + 7);
      for (const line of candidateLines) {
        const amounts = line.match(new RegExp(amountToken, 'g')) || [];
        const firstAmount = amounts[0];
        if (amounts.length >= 2 && firstAmount) return parseInvoiceNumber(firstAmount);
      }
    }
    const totalHtLineIndex = visualLines.findIndex(line => /total\s+h(?:ors\s+taxes|\.?\s*t\.?)/i.test(line) && !/article|designation|p\.?u\.?/i.test(line));
    if (totalHtLineIndex >= 0) {
      const candidateLines = visualLines.slice(totalHtLineIndex, totalHtLineIndex + 3);
      for (const line of candidateLines) {
        const amounts = line.match(new RegExp(amountToken, 'g')) || [];
        const firstAmount = amounts[0];
        if (firstAmount) return parseInvoiceNumber(firstAmount);
      }
    }
    const amountHtHeaderIndex = visualLines.findIndex(line => /montant\s+h\.?\s*t\.?/i.test(line) && /tva|taxe/i.test(line) && !/article|designation|p\.?u\.?/i.test(line));
    if (amountHtHeaderIndex >= 0) {
      const candidateLines = visualLines.slice(amountHtHeaderIndex + 1, amountHtHeaderIndex + 4);
      for (const line of candidateLines) {
        const amounts = line.match(new RegExp(amountToken, 'g')) || [];
        const firstAmount = amounts[0];
        if (firstAmount) return parseInvoiceNumber(firstAmount);
      }
    }
    const amountPatterns = [
      new RegExp(`(?:total|net|montant|base|sous[-\\s]?total)?\\s*h\\.?\\s*t\\.?\\s*(?:net)?\\s*(?:eur|euro|€)?\\s*[:\\-]?\\s*(?:eur|euro|€)?\\s*${amountToken}`, 'i'),
      new RegExp(`total\\s+hors\\s+taxe?s?\\s*(?:eur|euro|€)?\\s*[:\\-]?\\s*(?:eur|euro|€)?\\s*${amountToken}`, 'i'),
      new RegExp(`hors\\s+taxe?s?\\s*(?:eur|euro|€)?\\s*[:\\-]?\\s*(?:eur|euro|€)?\\s*${amountToken}`, 'i'),
      new RegExp(`net\\s+a\\s+payer\\s+h\\.?\\s*t\\.?\\s*(?:eur|euro|€)?\\s*[:\\-]?\\s*(?:eur|euro|€)?\\s*${amountToken}`, 'i'),
    ];
  
    for (const pattern of amountPatterns) {
      const match = normalizedText.match(pattern);
      if (match) return parseInvoiceNumber(match[match.length - 1]);
    }
  
    const htLines = visualLines.filter(line => /h\.?\s*t\.?|hors\s+taxe/i.test(line) && !/tva|ttc/i.test(line));
    for (const line of htLines) {
      const amounts = line.match(new RegExp(amountToken, 'g')) || [];
      if (amounts.length > 0) return parseInvoiceNumber(amounts[amounts.length - 1]);
    }
  
    const htWindow = normalizedText.match(/(.{0,120}(?:h\.?\s*t\.?|hors\s+taxe).{0,120})/i)?.[1] || '';
    const htAmounts = htWindow.match(new RegExp(amountToken, 'g')) || [];
    if (htAmounts.length > 0) return parseInvoiceNumber(htAmounts[htAmounts.length - 1]);
  
    const ttcMatch = normalizedText.match(new RegExp(`total\\s*t\\.?\\s*t\\.?\\s*c\\.?\\s*(?:eur|euro|€)?\\s*${amountToken}`, 'i'))
      || normalizedText.match(new RegExp(`${amountToken}\\s*\\d{2}/\\d{2}/\\d{4}\\s*(?:prelevements|pr[ée]l[èe]vements|virement|cheque|ch[eè]que)`, 'i'));
    const invoiceTableMatch = normalizedText.match(new RegExp(`base\\s*h\\.?\\s*t\\.?[\\s\\S]{0,700}?${amountToken}\\s+${amountToken}\\s+${amountToken}`, 'i'));
    if (invoiceTableMatch) {
      const [, first, second, third] = invoiceTableMatch;
      const firstAmount = parseInvoiceNumber(first);
      const secondAmount = parseInvoiceNumber(second);
      const thirdAmount = parseInvoiceNumber(third);
      const ttcAmount = ttcMatch ? parseInvoiceNumber(ttcMatch[1]) : thirdAmount;
      const candidates = [firstAmount, secondAmount, thirdAmount]
        .filter(amount => amount > 0 && amount < ttcAmount)
        .sort((a, b) => b - a);
      if (candidates.length > 0) return candidates[0];
    }
  
    return 0;
  };
  
  const isSameInvoiceAmount = (left: number, right: number) => Math.abs(left - right) < 0.01;
  
  const isInvoiceAmountHtReliable = (text: string, amountHt: number) => {
    if (amountHt <= 0) return false;
  
    const amountToken = '(-?\\d{1,3}(?:[\\s.]\\d{3})*(?:[,.]\\d{2})|-?\\d+[,.]\\d{2})';
    const visualLines = text
      .replace(/\u00a0/g, ' ')
      .split(/\r?\n/)
      .map(line => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  
    const strongLineIndexes = visualLines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => (
        /total\s+h(?:ors\s+taxes|\.?\s*t\.?)|total\s+hors\s+taxe?s?|base\s+h\.?\s*t\.?|baseht/i.test(line)
        && !/article|designation|p\.?u\.?|prix\s+unitaire|qte|quantite|ref/i.test(line)
      ))
      .map(item => item.index);
  
    for (const index of strongLineIndexes) {
      const candidateLines = visualLines.slice(index, index + 4);
      for (const line of candidateLines) {
        const amounts = line.match(new RegExp(amountToken, 'g')) || [];
        if (amounts.some(value => isSameInvoiceAmount(parseInvoiceNumber(value), amountHt))) return true;
      }
    }
  
    const normalizedText = visualLines.join(' ');
    const strongPatterns = [
      new RegExp(`total\\s+hors\\s+taxe?s?\\s*(?:eur|euro|€)?\\s*[:\\-]?\\s*(?:eur|euro|€)?\\s*${amountToken}`, 'i'),
      new RegExp(`total\\s+h\\.?\\s*t\\.?\\s*(?:eur|euro|€)?\\s*[:\\-]?\\s*(?:eur|euro|€)?\\s*${amountToken}`, 'i'),
      new RegExp(`base\\s+h\\.?\\s*t\\.?[\\s\\S]{0,160}?${amountToken}`, 'i'),
    ];
  
    return strongPatterns.some(pattern => {
      const match = normalizedText.match(pattern);
      return match ? isSameInvoiceAmount(parseInvoiceNumber(match[match.length - 1]), amountHt) : false;
    });
  };
  
  const createInvoiceImportId = (fileName: string, index: number) => `${Date.now()}-${index}-${fileName}`;
  
  const getInvoiceConfidence = (supplierNeedsCheck: boolean, amountHt: number, invoiceDate: string, targetCol: number, amountReliable: boolean, hasReadableInvoiceText: boolean): InvoiceImportPreview['confidence'] => (
    hasReadableInvoiceText && !supplierNeedsCheck && amountHt > 0 && amountReliable && isValidInvoiceDateValue(invoiceDate) && targetCol >= 45 && targetCol <= 57
      ? 'verified'
      : 'review'
  );
  
  const parseInvoiceImport = (sourceText: string, fileName: string, id = createInvoiceImportId(fileName, 0)): InvoiceImportPreview => {
    const text = sourceText.replace(/\u00a0/g, ' ').replace(/€/g, '€');
    const hasReadableInvoiceText = text.replace(/[^A-Za-z0-9]/g, '').length >= 80;
    const supplierMatch = hasReadableInvoiceText ? findInvoiceSupplier(text) : findInvoiceSupplierFromFileName(fileName);
    const amountHt = findInvoiceAmountHt(text);
    const invoiceDate = findInvoiceDate(text) || findInvoiceDateFromFileName(fileName);
    const supplierNeedsCheck = normalizeImportText(supplierMatch.supplier).includes('FOURNISSEUR A RENSEIGNER');
    const amountReliable = isInvoiceAmountHtReliable(text, amountHt);
    const dateReliable = isValidInvoiceDateValue(invoiceDate);
    const confidence = getInvoiceConfidence(supplierNeedsCheck, amountHt, invoiceDate, supplierMatch.targetCol, amountReliable, hasReadableInvoiceText);
  
    return {
      id,
      fileName,
      supplier: supplierMatch.supplier || 'Fournisseur non reconnu',
      amountHt: formatInvoiceAmount(amountHt),
      invoiceDate,
      targetCol: supplierMatch.targetCol,
      status: confidence === 'verified'
        ? 'Lecture complete prete a valider.'
        : !hasReadableInvoiceText
          ? 'PDF scanne ou image : saisie manuelle a verifier.'
          : supplierNeedsCheck
            ? 'Fournisseur et colonne cible a verifier avant validation.'
            : !dateReliable
              ? 'Date de facture a verifier avant validation.'
              : !amountHt
                ? 'Montant HT a renseigner manuellement avant validation.'
                : !amountReliable
                  ? 'Montant HT trouve mais contexte a verifier.'
                  : 'Lecture facture a verifier avant validation.',
      confidence,
    };
  };
  
  const extractPdfText = async (file: File) => {
    const loadPdfJs = new Function('url', 'return import(url)') as (url: string) => Promise<any>;
    const pdfjs = await loadPdfJs('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs';
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjs.getDocument({ data: bytes }).promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item: { str?: string }) => item.str || '').join(' '));
    }
    return pages.join('\n');
  };
  
  const extractPdfLayoutText = async (file: File, onOcrStart?: () => void, allowOcr = true) => {
    const loadPdfJs = new Function('url', 'return import(url)') as (url: string) => Promise<any>;
    const pdfjs = await loadPdfJs('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs';
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjs.getDocument({ data: bytes }).promise;
    const pages: string[] = [];
  
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const rows = new Map<number, Array<{ x: number; text: string }>>();
  
      content.items.forEach((item: { str?: string; transform?: number[] }) => {
        const text = (item.str || '').trim();
        if (!text || !item.transform) return;
        const x = item.transform[4] || 0;
        const y = item.transform[5] || 0;
        const rowKey = Math.round(y / 8) * 8;
        const row = rows.get(rowKey) || [];
        row.push({ x, text });
        rows.set(rowKey, row);
      });
  
      const pageLines = Array.from(rows.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([, row]) => row
          .sort((a, b) => a.x - b.x)
          .map(item => item.text)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim())
        .filter(Boolean);
  
      pages.push(pageLines.join('\n'));
    }
  
    const extractedText = pages.join('\n');
    const usefulTextLength = extractedText.replace(/[^A-Za-zÀ-ÿ0-9]/g, '').length;
    const normalizedExtractedText = normalizeImportText(extractedText);
    const hasInvoiceStructure = /FACTURE|INVOICE|TOTAL|TVA|HORS TAXE|MONTANT|HT/.test(normalizedExtractedText);
    const hasAmount = /-?\d{1,3}(?:[\s.]\d{3})*(?:[,.]\d{2})|-?\d+[,.]\d{2}/.test(extractedText);
    if (usefulTextLength >= 120 && hasInvoiceStructure && hasAmount && /\d{2}[./-]\d{2}[./-]\d{2,4}/.test(extractedText)) {
      return extractedText;
    }
  
    if (!allowOcr) return extractedText;
  
    onOcrStart?.();
    return extractPdfOcrText(file, pdfjs);
  };
  
  const extractPdfOcrText = async (file: File, pdfjs?: any) => {
    const loadModule = new Function('url', 'return import(url)') as (url: string) => Promise<any>;
    const loadedPdfjs = pdfjs || await loadModule('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs');
    loadedPdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs';
    const tesseract = await loadModule('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.esm.min.js');
    const createWorker = tesseract.createWorker || tesseract.default?.createWorker;
    if (!createWorker) throw new Error("L'OCR n'est pas disponible dans le navigateur.");
    const ocrOptions = {
      workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js',
      corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1',
      langPath: 'https://tessdata.projectnaptha.com/4.0.0',
    };
    let worker: any;
    try {
      worker = await createWorker('fra+eng', 1, ocrOptions);
    } catch {
      worker = await createWorker(ocrOptions);
      if (worker.loadLanguage) await worker.loadLanguage('fra+eng');
      if (worker.initialize) await worker.initialize('fra+eng');
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf = await loadedPdfjs.getDocument({ data: bytes }).promise;
    const pages: string[] = [];
  
    try {
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvasContext: context, viewport }).promise;
        const result = await worker.recognize(canvas);
        pages.push(result?.data?.text || '');
      }
    } finally {
      if (worker?.terminate) await worker.terminate();
    }
  
    return pages.join('\n');
  };
  
  const parseCaisseRealise = (sourceText: string): ParsedCaisseImport => {
    const recapPeriodeParsed = parseRecapPeriodeCaisse(sourceText, normalizeImportText);
    if (recapPeriodeParsed) return recapPeriodeParsed as ParsedCaisseImport;
  
    const text = sourceText.replace(/\u00a0/g, ' ').replace(/€/g, '').replace(/\s+/g, ' ');
    const dateMatch = text.match(/Du\s+(\d{2})\/(\d{2})\/(\d{2})/i);
    const pdfDay = dateMatch ? Number(dateMatch[1]) : null;
    const pdfMonth = dateMatch ? Number(dateMatch[2]) - 1 : null;
    const pdfYear = dateMatch ? 2000 + Number(dateMatch[3]) : null;
    const sundayReel = findCaisseAmount(text, 'SUNDAY') + findCaisseAmount(text, 'CHEQUE BANCAIRE') + findCaisseAmount(text, 'SUNDAY MANUEL') + findCaisseAmount(text, 'SUNDAY TPE');
    const trPapierReel = findCaisseAmount(text, 'EDENRED TR PAPIER') + findCaisseAmount(text, 'BIMPLI TR PAPIER') + findCaisseAmount(text, 'PLUXEE TR PAPIER') + findCaisseAmount(text, 'UP TR PAPIER');
    const sundayTheorique = findCaisseTheoriqueAmount(text, 'SUNDAY') + findCaisseTheoriqueAmount(text, 'CHEQUE BANCAIRE') + findCaisseTheoriqueAmount(text, 'SUNDAY MANUEL') + findCaisseTheoriqueAmount(text, 'SUNDAY TPE');
    const trPapierTheorique = findCaisseTheoriqueAmount(text, 'EDENRED TR PAPIER') + findCaisseTheoriqueAmount(text, 'BIMPLI TR PAPIER') + findCaisseTheoriqueAmount(text, 'PLUXEE TR PAPIER') + findCaisseTheoriqueAmount(text, 'UP TR PAPIER');
  
    const livraisonTtc = findCaisseAmount(text, 'Livraison');
    const livraisonSection = text.match(/TVA\s+LIVRAISON([\s\S]*?)TVA\s+TOTAL/i)?.[1] || '';
    const livraisonNumbers = extractCaisseNumbers(livraisonSection).slice(-6);
    const vaeHt = livraisonNumbers[2] || 0;
    const serviceSection = text.match(/TVA\s+MIDI([\s\S]*?)Quantit/i)?.[1] || text.match(/TVA\s+MIDI([\s\S]*?)REMISES/i)?.[1] || '';
    const serviceNumbers = extractCaisseNumbers(serviceSection);
    const totalLine = serviceNumbers.slice(-9);
    const totalMidiHt = totalLine[0] || 0;
    const totalSoirHt = totalLine[3] || 0;
    const totalHt = totalLine[6] || 0;
    const serviceLineMatch = text.match(/Sur-place\s+(\d+)\s+(\d+)\s+\d+\s+[-.\d\s]+,\d{2}\s+[-.\d\s]+,\d{2}\s+[-.\d\s]+,\d{2}/i);
    const midiCovers = serviceLineMatch ? Number(serviceLineMatch[1]) : 0;
    const soirCovers = serviceLineMatch ? Number(serviceLineMatch[2]) : 0;
    const deliveryLineMatch = text.match(/Livraison\s+-\s+Livraison\s+\d+\s+\d+\s+\d+\s+([-.\d\s]+,\d{2})\s+([-.\d\s]+,\d{2})/i);
    const deliveryMidiTtc = deliveryLineMatch ? parseCaisseNumber(deliveryLineMatch[1]) : 0;
    const deliverySoirTtc = deliveryLineMatch ? parseCaisseNumber(deliveryLineMatch[2]) : 0;
    const midiDeliveryHt = livraisonTtc > 0 ? vaeHt * (deliveryMidiTtc / livraisonTtc) : 0;
    const soirDeliveryHt = livraisonTtc > 0 ? vaeHt * (deliverySoirTtc / livraisonTtc) : 0;
  
    const caVae = vaeHt;
    const caMidi = Math.max(0, totalMidiHt - midiDeliveryHt);
    const caSoir = Math.max(0, totalSoirHt - soirDeliveryHt);
  
    if (!totalHt || (!caMidi && !caSoir && !caVae)) {
      throw new Error("La feuille de caisse n'a pas pu être lue automatiquement.");
    }
  
    return {
      pdfDay,
      pdfMonth,
      pdfYear,
      values: {
        17: caVae,
        18: caMidi,
        19: caSoir,
        20: 0,
        25: midiCovers,
        27: soirCovers,
        34: 0,
      } as Record<number, number>,
      theoriqueValues: {
        total_ca: findCaisseAmount(text, 'TOTAL CA'),
        cb: findCaisseTheoriqueAmount(text, 'CB'),
        amex: findCaisseTheoriqueAmount(text, 'AMEX') + findCaisseTheoriqueAmount(text, 'Carte ANCV'),
        tr_papier: trPapierTheorique,
        tr_carte: findCaisseTheoriqueAmount(text, 'CARTE TR'),
        ancv: findCaisseTheoriqueAmount(text, 'ANCV'),
        especes: findCaisseTheoriqueAmount(text, 'ESPECES'),
        click_collect: findCaisseTheoriqueAmount(text, 'Click and Collect'),
        uber: findCaisseTheoriqueAmount(text, 'UBER EATS'),
        deliveroo: findCaisseTheoriqueAmount(text, 'DELIVEROO'),
        sunday: sundayTheorique,
      },
      realValues: {
        cb: findCaisseAmount(text, 'CB'),
        pourboires: 0,
        especes: findCaisseAmount(text, 'ESPECES'),
        pieces: 0,
        amexAncvCarte: findCaisseAmount(text, 'AMEX') + findCaisseAmount(text, 'Carte ANCV'),
        trCarte: findCaisseAmount(text, 'CARTE TR'),
        ancvPapier: findCaisseAmount(text, 'ANCV'),
        trPapier: trPapierReel,
        sunday: sundayReel,
        uber: findCaisseAmount(text, 'UBER EATS'),
        deliveroo: findCaisseAmount(text, 'DELIVEROO'),
        clickCollect: findCaisseAmount(text, 'Click and Collect'),
      },
      bilanValues: {
        ttc_5_5: findCaisseTtcByRate(sourceText, '5,5'),
        ttc_10: findCaisseTtcByRate(sourceText, '10'),
        ttc_20: findCaisseTtcByRate(sourceText, '20'),
      },
    } as ParsedCaisseImport;
  };
  
  const createCaisseImportId = (fileName: string, index: number) => `${Date.now()}-caisse-${index}-${fileName}`;
  const parseCaisseImport = (sourceText: string, fileName: string, id = createCaisseImportId(fileName, 0)): CaisseImportPreview => {
    const parsed = parseCaisseRealise(sourceText);
    const businessDate = formatImportBusinessDate(parsed.pdfDay, parsed.pdfMonth, parsed.pdfYear);
    const dateMatchesCurrentMonth = businessDate !== '' && parsed.pdfMonth === month && parsed.pdfYear === year;
    const status = dateMatchesCurrentMonth
      ? 'Date detectee, feuille prete a valider sur son jour.'
      : businessDate
        ? 'Date detectee hors mois affiche, import sur le jour selectionne sauf correction.'
        : 'Date non detectee, import sur le jour selectionne.';
  
    return {
      id,
      fileName,
      businessDate,
      confidence: dateMatchesCurrentMonth ? 'verified' : 'review',
      status,
      parsed,
    };
  };
  
  const handleDailyRealiseImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    const file = files[0];
  
    setImportStatus(`Lecture locale de ${files.length} feuille${files.length > 1 ? 's' : ''} de caisse...`);
  
    try {
      const parsedImports: CaisseImportPreview[] = [];
      for (const [index, currentFile] of files.entries()) {
        const isPdf = currentFile.type === 'application/pdf' || currentFile.name.toLowerCase().endsWith('.pdf');
        const text = isPdf ? await extractPdfText(currentFile) : await currentFile.text();
        parsedImports.push(parseCaisseImport(text, currentFile.name, createCaisseImportId(currentFile.name, index)));
      }
  
      setImportPreview([]);
      setCaisseImportPreviews(prev => [...prev, ...parsedImports]);
      const reviewCount = parsedImports.filter(item => item.confidence === 'review').length;
      setImportStatus(reviewCount > 0
        ? `${parsedImports.length} feuille${parsedImports.length > 1 ? 's' : ''} lue${parsedImports.length > 1 ? 's' : ''}. ${reviewCount} a verifier.`
        : `${parsedImports.length} feuille${parsedImports.length > 1 ? 's' : ''} lue${parsedImports.length > 1 ? 's' : ''}, prete${parsedImports.length > 1 ? 's' : ''} a valider.`);
      return;
  
      const text = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
        ? await extractPdfText(file)
        : await file.text();
      const parsed = parseCaisseRealise(text);
      const targetDayEntry = parsed.pdfDay && parsed.pdfMonth === month && parsed.pdfYear === year
        ? dayRows.find(item => item.row.dayIndex === parsed.pdfDay)
        : selectedDayEntry;
      const targetRowIndex = targetDayEntry?.index ?? selectedDayRowIndex;
  
      if (targetRowIndex < 0) throw new Error('Aucune journée cible trouvée pour importer ces données.');
  
      const targetDay = targetDayEntry?.row.dayIndex || selectedEntryDay;
      Object.entries(parsed.values).forEach(([col, value]) => {
        handleCellChange(targetRowIndex, Number(col), formatImportedNumber(value, Number(col) === 25 || Number(col) === 27 || Number(col) === 34 ? 0 : 2));
      });
      updateTheorique(month, targetDay, 'total_ca', formatImportedNumber(parsed.theoriqueValues.total_ca));
      updateTheorique(month, targetDay, 'cb', formatImportedNumber(parsed.theoriqueValues.cb));
      updateTheorique(month, targetDay, 'amex', formatImportedNumber(parsed.theoriqueValues.amex));
      updateTheorique(month, targetDay, 'tr_papier', formatImportedNumber(parsed.theoriqueValues.tr_papier));
      updateTheorique(month, targetDay, 'tr_carte', formatImportedNumber(parsed.theoriqueValues.tr_carte));
      updateTheorique(month, targetDay, 'ancv', formatImportedNumber(parsed.theoriqueValues.ancv));
      updateTheorique(month, targetDay, 'especes', formatImportedNumber(parsed.theoriqueValues.especes));
      updateTheorique(month, targetDay, 'click_collect', formatImportedNumber(parsed.theoriqueValues.click_collect));
      updateTheorique(month, targetDay, 'uber', formatImportedNumber(parsed.theoriqueValues.uber));
      updateTheorique(month, targetDay, 'deliveroo', formatImportedNumber(parsed.theoriqueValues.deliveroo));
      updateTheorique(month, targetDay, 'sunday', formatImportedNumber(parsed.theoriqueValues.sunday));
      const targetDayIndex = targetDayEntry?.row.dayIndex;
      if (typeof targetDayIndex === 'number') setSelectedEntryDay(targetDayIndex as number);
  
      setImportPreview([
        { label: 'VAE HT', value: formatImportedNumber(parsed.values[17]) || '-' },
        { label: 'CA midi HT hors VAE', value: formatImportedNumber(parsed.values[18]) || '-' },
        { label: 'CA soir HT hors VAE', value: formatImportedNumber(parsed.values[19]) || '-' },
        { label: 'Théorique caisse', value: formatImportedNumber(parsed.theoriqueValues.cb + parsed.theoriqueValues.especes + parsed.theoriqueValues.amex + parsed.theoriqueValues.tr_carte + parsed.theoriqueValues.ancv + parsed.theoriqueValues.tr_papier + parsed.theoriqueValues.sunday + parsed.theoriqueValues.uber + parsed.theoriqueValues.deliveroo + parsed.theoriqueValues.click_collect) || '-' },
        { label: 'Couverts midi', value: formatImportedNumber(parsed.values[25], 0) || '-' },
        { label: 'Couverts soir', value: formatImportedNumber(parsed.values[27], 0) || '-' },
      ]);
      setImportStatus(`Import réalisé sur le ${targetDayEntry?.row.label || selectedDayLabel}.`);
    } catch (error) {
      setImportStatus(`Erreur : ${error instanceof Error ? error.message : "L'import a échoué."}`);
    } finally {
      event.target.value = '';
    }
  };
  
  const updateCaisseImportPreview = (id: string, updates: Partial<CaisseImportPreview>) => {
    setCaisseImportPreviews(prev => prev.map(item => item.id === id
      ? (() => {
        const nextItem = { ...item, ...updates };
        const dateMatch = nextItem.businessDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        const matchesCurrentMonth = !!dateMatch && Number(dateMatch[1]) === year && Number(dateMatch[2]) - 1 === month;
        return {
          ...nextItem,
          confidence: matchesCurrentMonth ? 'verified' : 'review',
          status: nextItem.businessDate !== ''
            ? matchesCurrentMonth
              ? 'Date ajustee, feuille prete a valider sur son jour.'
              : 'Date ajustee hors mois affiche, import sur le jour selectionne.'
            : 'Date vide, import sur le jour selectionne.',
        };
      })()
      : item));
  };
  
  const applyCaisseImport = (caisseImportPreview: CaisseImportPreview) => {
    if (!caisseImportPreview || selectedDayRowIndex < 0) return;
  
    const dateMatch = caisseImportPreview.businessDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const importYear = dateMatch ? Number(dateMatch[1]) : null;
    const importMonth = dateMatch ? Number(dateMatch[2]) - 1 : null;
    const importDay = dateMatch ? Number(dateMatch[3]) : null;
  
    if (importYear && importYear !== year) {
      setImportStatus(`Erreur : la feuille de caisse est datee de ${importYear}. Passe d'abord sur cette annee avant de valider l'import.`);
      return;
    }
  
    const usePdfDate = !!importDay && importMonth !== null && importYear === year;
    const targetMonth = usePdfDate && importMonth !== null ? importMonth : month;
    const targetDay = usePdfDate && importDay ? importDay : selectedEntryDay;
    const targetRowIndex = usePdfDate
      ? getDashboardRowIndexForDay(year, targetMonth, targetDay)
      : selectedDayRowIndex;
    const targetDayEntry = targetMonth === month
      ? dayRows.find(item => item.index === targetRowIndex)
      : null;
    if (targetRowIndex < 0) {
      setImportStatus('Erreur : aucune journee cible trouvee pour importer cette feuille.');
      return;
    }
  
    const parsed = caisseImportPreview.parsed;
    Object.entries(parsed.values).forEach(([col, value]) => {
      const formattedValue = formatImportedNumber(value, Number(col) === 25 || Number(col) === 27 || Number(col) === 34 ? 0 : 2);
      if (targetMonth === month) {
        handleCellChange(targetRowIndex, Number(col), formattedValue);
      } else {
        updateDashboard(targetMonth, `${targetRowIndex}-${Number(col)}`, formattedValue);
      }
    });
    updateTheorique(targetMonth, targetDay, 'total_ca', formatImportedNumber(parsed.theoriqueValues.total_ca));
    updateTheorique(targetMonth, targetDay, 'cb', formatImportedNumber(parsed.theoriqueValues.cb));
    updateTheorique(targetMonth, targetDay, 'amex', formatImportedNumber(parsed.theoriqueValues.amex));
    updateTheorique(targetMonth, targetDay, 'tr_papier', formatImportedNumber(parsed.theoriqueValues.tr_papier));
    updateTheorique(targetMonth, targetDay, 'tr_carte', formatImportedNumber(parsed.theoriqueValues.tr_carte));
    updateTheorique(targetMonth, targetDay, 'ancv', formatImportedNumber(parsed.theoriqueValues.ancv));
    updateTheorique(targetMonth, targetDay, 'especes', formatImportedNumber(parsed.theoriqueValues.especes));
    updateTheorique(targetMonth, targetDay, 'click_collect', formatImportedNumber(parsed.theoriqueValues.click_collect));
    updateTheorique(targetMonth, targetDay, 'uber', formatImportedNumber(parsed.theoriqueValues.uber));
    updateTheorique(targetMonth, targetDay, 'deliveroo', formatImportedNumber(parsed.theoriqueValues.deliveroo));
    updateTheorique(targetMonth, targetDay, 'sunday', formatImportedNumber(parsed.theoriqueValues.sunday));
    const bilanValues = (parsed as ParsedCaisseImport & { bilanValues?: { ttc_5_5?: number; ttc_10?: number; ttc_20?: number } }).bilanValues;
    if (bilanValues) {
      updateBilanSynthese(targetMonth, targetDay, 'ttc_5_5', formatImportedNumber(bilanValues.ttc_5_5 || 0));
      updateBilanSynthese(targetMonth, targetDay, 'ttc_10', formatImportedNumber(bilanValues.ttc_10 || 0));
      updateBilanSynthese(targetMonth, targetDay, 'ttc_20', formatImportedNumber(bilanValues.ttc_20 || 0));
    }
  
    if (targetMonth !== month) {
      setMonth(targetMonth);
      setSelectedMonth(targetMonth);
    }
    setSelectedEntryDay(targetDay);
  
    const targetLabel = usePdfDate
      ? `${String(targetDay).padStart(2, '0')}/${String(targetMonth + 1).padStart(2, '0')}/${year}`
      : targetDayEntry?.row.label || selectedDayLabel;
    setImportStatus(`Import realise sur le ${targetLabel}.`);
    setCaisseImportPreviews(prev => prev.filter(item => item.id !== caisseImportPreview.id));
  };
  
  const handleInvoiceImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
  
    setInvoiceImportStatus(`Lecture locale de ${files.length} facture${files.length > 1 ? 's' : ''}...`);
  
    try {
      const parsedInvoices: InvoiceImportPreview[] = [];
      for (const [index, file] of files.entries()) {
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        const text = isPdf
          ? await extractPdfLayoutText(file, undefined, false)
          : await file.text();
        parsedInvoices.push(parseInvoiceImport(text, file.name, createInvoiceImportId(file.name, index)));
      }
  
      setInvoiceImportPreviews(prev => [...prev, ...parsedInvoices]);
      const reviewCount = parsedInvoices.filter(item => item.confidence === 'review').length;
      setInvoiceImportStatus(reviewCount > 0
        ? `${parsedInvoices.length} facture${parsedInvoices.length > 1 ? 's' : ''} lue${parsedInvoices.length > 1 ? 's' : ''}. ${reviewCount} a verifier.`
        : `${parsedInvoices.length} facture${parsedInvoices.length > 1 ? 's' : ''} lue${parsedInvoices.length > 1 ? 's' : ''}, prete${parsedInvoices.length > 1 ? 's' : ''} a valider.`);
    } catch (error) {
      setInvoiceImportStatus(`Erreur : ${error instanceof Error ? error.message : "La facture n'a pas pu etre lue."}`);
    } finally {
      event.target.value = '';
    }
  };
  
  const updateInvoiceImportPreview = (id: string, updates: Partial<InvoiceImportPreview>) => {
    setInvoiceImportPreviews(prev => prev.map(item => item.id === id
      ? { ...item, ...updates, confidence: 'review', status: 'Valeurs modifiees manuellement, a verifier avant validation.' }
      : item));
  };
  
  const handleSalaryPayrollImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setSalaryImportStatus(`Lecture de ${files.length} PDF salaires...`);

    try {
      const configuredPersonnel = personnelInfos.filter(item => item.nom.trim());
      if (configuredPersonnel.length === 0) {
        setSalaryImportStatus('Erreur : renseigne d abord la page Info personnel pour matcher les noms du PDF.');
        return;
      }

      const results: string[] = [];
      const errors: string[] = [];
      let lastAppliedMonth: number | null = null;

      for (const file of files) {
        try {
          const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
          const text = isPdf ? await extractPdfLayoutText(file, undefined, false) : await file.text();
          const payrollPeriod = getPayrollTargetPeriodFromText(text);
          if (!payrollPeriod) {
            errors.push(`${file.name} : mois non détecté`);
            continue;
          }
          const result = buildPayrollImportFromText(text, configuredPersonnel);
          if (result.matches.length === 0) {
            errors.push(`${file.name} : aucun salarié matché`);
            continue;
          }
          const targetMonth = payrollPeriod.targetMonth;
          const currentConfig = globalData[targetMonth]?.salariesConfig || { locked: false, categories: result.categories };
          if (currentConfig.locked) {
            errors.push(`${file.name} : mois ${payrollPeriod.targetLabel} verrouillé`);
            continue;
          }
          updateSalariesConfig(targetMonth, { ...currentConfig, categories: result.categories });
          lastAppliedMonth = targetMonth;
          const unmatchedText = result.unmatched.length > 0 ? ` (${result.unmatched.length} non matché(s))` : '';
          results.push(`${payrollPeriod.targetLabel} : ${result.matches.length} salarié(s)${unmatchedText}`);
        } catch {
          errors.push(`${file.name} : lecture impossible`);
        }
      }

      if (lastAppliedMonth !== null) {
        setMonth(lastAppliedMonth);
        setSelectedMonth(lastAppliedMonth);
      }

      const statusParts: string[] = [];
      if (results.length > 0) statusParts.push(results.join(' | '));
      if (errors.length > 0) statusParts.push(`Erreurs : ${errors.join(', ')}`);
      setSalaryImportStatus(statusParts.join(' — ') || 'Aucun fichier traité.');
    } catch (error) {
      setSalaryImportStatus(`Erreur : ${error instanceof Error ? error.message : "les PDF salaires n'ont pas pu être lus."}`);
    } finally {
      event.target.value = '';
    }
  };
  
  const applyInvoiceImport = (invoiceImportPreview: InvoiceImportPreview) => {
    if (!invoiceImportPreview || selectedDayRowIndex < 0) return;
  
    const dateMatch = invoiceImportPreview.invoiceDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const invoiceYear = dateMatch ? Number(dateMatch[1]) : null;
    const invoiceMonth = dateMatch ? Number(dateMatch[2]) - 1 : null;
    const invoiceDay = dateMatch ? Number(dateMatch[3]) : null;
    if (invoiceYear && invoiceYear !== year) {
      setInvoiceImportStatus(`Erreur : la facture est datee de ${invoiceYear}. Passe d'abord sur cette annee avant de valider l'import.`);
      return;
    }
    const hasInvoiceTarget = invoiceDay && invoiceMonth !== null && invoiceYear;
    const targetMonth = hasInvoiceTarget ? invoiceMonth : month;
    const targetYear = hasInvoiceTarget ? invoiceYear : year;
    const targetRowIndex = hasInvoiceTarget
      ? getDashboardRowIndexForDay(targetYear, targetMonth, invoiceDay)
      : selectedDayRowIndex;
    const targetDayEntry = targetMonth === month && targetYear === year
      ? dayRows.find(item => item.index === targetRowIndex)
      : null;
  
    const cellKey = `${targetRowIndex}-${invoiceImportPreview.targetCol}`;
    const existingAmount = parseInvoiceNumber(globalData[targetMonth]?.dashboard?.[cellKey] || '');
    const importedAmount = parseInvoiceNumber(invoiceImportPreview.amountHt);
    if (targetRowIndex < 0) {
      setInvoiceImportStatus('Erreur : la date de facture ne correspond a aucun jour exploitable.');
      return;
    }
    if (!importedAmount) {
      setInvoiceImportStatus('Erreur : renseigne le montant HT avant de valider la facture.');
      return;
    }
    const nextAmount = existingAmount + importedAmount;
  
    updateDashboard(targetMonth, cellKey, formatInvoiceAmount(nextAmount));
    if (targetMonth !== month) {
      setMonth(targetMonth);
      setSelectedMonth(targetMonth);
    }
    if (invoiceDay) setSelectedEntryDay(invoiceDay);
    const targetLabel = invoiceDay && invoiceMonth !== null && invoiceYear
      ? `${String(invoiceDay).padStart(2, '0')}/${String(invoiceMonth + 1).padStart(2, '0')}/${invoiceYear}`
      : targetDayEntry?.row.label || selectedDayLabel;
    setInvoiceImportStatus(`Facture ajoutee sur ${dynamicColumns[invoiceImportPreview.targetCol]?.[2] || invoiceImportPreview.supplier} pour le ${targetLabel}.`);
    setInvoiceImportPreviews(prev => prev.filter(item => item.id !== invoiceImportPreview.id));
  };
  
  return {
    handleHistoricalBudgetExcelImport,
    applyHistoricalBudgetExcelImport,
    handleHistoricalV25ExcelImport,
    applyHistoricalV25ExcelImport,
    handleDailyRealiseImport,
    updateCaisseImportPreview,
    applyCaisseImport,
    handleInvoiceImport,
    updateInvoiceImportPreview,
    handleSalaryPayrollImport,
    applyInvoiceImport,
    formatImportedNumber,
    formatImportedCurrencyLabel,
    formatImportedIntegerLabel,
    formatImportBusinessDate,
    formatImportBusinessDateLabel,
  };
}
