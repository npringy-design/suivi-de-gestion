import type { Plugin } from 'vite';

const replaceRequired = (code: string, from: string, to: string, label: string) => {
  if (!code.includes(from)) throw new Error('Patch import budget historique non applique : ' + label);
  return code.replace(from, to);
};

export const dashboardHistoricalBudgetExcelPatch = (): Plugin => ({
  name: 'dashboard-historical-budget-excel-patch',
  enforce: 'pre',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').endsWith('/src/Dashboard.tsx')) return null;
    let next = code;

    if (!next.includes("import * as XLSX from 'xlsx';")) {
      next = replaceRequired(
        next,
        "import React, { useState, useMemo, useEffect, useRef } from 'react';",
        "import React, { useState, useMemo, useEffect, useRef } from 'react';\nimport * as XLSX from 'xlsx';",
        'import xlsx'
      );
    }

    if (next.includes("type CaisseImportPreview = {")) {
      next = replaceRequired(
      next,
      `type CaisseImportPreview = {
  id: string;
  fileName: string;
  businessDate: string;
  confidence: 'verified' | 'review';
  status: string;
  parsed: ParsedCaisseImport;
};`,
      `type CaisseImportPreview = {
  id: string;
  fileName: string;
  businessDate: string;
  confidence: 'verified' | 'review';
  status: string;
  parsed: ParsedCaisseImport;
};

type HistoricalBudgetPreview = {
  id: string;
  sheetName: string;
  month: number;
  day: number;
  rowIndex: number;
  caMidi: number;
  caSoir: number;
  caTotal: number;
  couvertsMidi: number;
  couvertsSoir: number;
  couvertsTotal: number;
  status: string;
};`,
      'type preview budget'
      );
    }

    next = replaceRequired(
      next,
      "  const [invoiceImportPreviews, setInvoiceImportPreviews] = useState<InvoiceImportPreview[]>([]);",
      "  const [invoiceImportPreviews, setInvoiceImportPreviews] = useState<InvoiceImportPreview[]>([]);\n  const [historicalBudgetStatus, setHistoricalBudgetStatus] = useState('');\n  const [historicalBudgetPreviews, setHistoricalBudgetPreviews] = useState<HistoricalBudgetPreview[]>([]);",
      'state preview budget'
    );

    next = replaceRequired(
      next,
      `  const getDashboardRowIndexForDay = (targetYear: number, targetMonth: number, targetDay: number) => {
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
  };`,
      `  const getDashboardRowIndexForDay = (targetYear: number, targetMonth: number, targetDay: number) => {
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
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/gi, ' ')
    .trim()
    .toUpperCase();

  const findBudgetSheetName = (workbook: XLSX.WorkBook, targetMonth: number, targetYear: number) => {
    const yearShort = String(targetYear).slice(-2);
    const yearFull = String(targetYear);
    const tokens = budgetSheetTokens[targetMonth] || [];
    return workbook.SheetNames.find(sheetName => {
      const normalized = normalizeExcelSheetName(sheetName);
      if (/BILAN|SAISIE|REPORTING|ANNUEL|REALISE/.test(normalized)) return false;
      const hasMonth = tokens.some(token => normalized.includes(normalizeExcelSheetName(token)));
      const parts = normalized.split(/\s+/);
      const hasYear = normalized.includes(yearFull) || parts.includes(yearShort) || normalized.endsWith(yearShort);
      return hasMonth && hasYear;
    }) || '';
  };

  const getHistoricalBudgetCell = (sheet: XLSX.WorkSheet, rowIndex: number, colIndex: number) => (
    sheet[XLSX.utils.encode_cell({ r: rowIndex, c: colIndex })] as XLSX.CellObject | undefined
  );

  const parseHistoricalBudgetNumber = (value: unknown) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (value instanceof Date) return 0;
    const cleaned = String(value ?? '')
      .replace(/\u00a0/g, ' ')
      .replace(/\s/g, '')
      .replace(',', '.')
      .replace(/[^0-9.-]/g, '');
    return Number(cleaned) || 0;
  };

  const parseHistoricalBudgetCellNumber = (cell: XLSX.CellObject | undefined) => {
    if (!cell) return 0;
    const raw = parseHistoricalBudgetNumber(cell.v);
    if (raw !== 0) return raw;
    return parseHistoricalBudgetNumber(cell.w);
  };

  const parseHistoricalBudgetDate = (value: unknown) => {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value === 'number') {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d);
    }
    const text = String(value ?? '').trim();
    const isoTime = Date.parse(text);
    if (/^\d{4}-\d{2}-\d{2}/.test(text) && !Number.isNaN(isoTime)) return new Date(isoTime);
    const normalizedTextDate = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\./g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    const monthWords: Record<string, number> = { janvier: 0, janv: 0, fevrier: 1, fevr: 1, fev: 1, mars: 2, avril: 3, avr: 3, mai: 4, juin: 5, juillet: 6, juil: 6, aout: 7, septembre: 8, sept: 8, octobre: 9, oct: 9, novembre: 10, nov: 10, decembre: 11, dec: 11 };
    const wordDateMatch = normalizedTextDate.match(/(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)?\s*(\d{1,2})\s+([a-z]+)\s+(\d{2,4})/);
    if (wordDateMatch) {
      const monthIndex = monthWords[wordDateMatch[2]];
      if (monthIndex !== undefined) {
        const fullYear = wordDateMatch[3].length === 2 ? Number('20' + wordDateMatch[3]) : Number(wordDateMatch[3]);
        return new Date(fullYear, monthIndex, Number(wordDateMatch[1]));
      }
    }
    const frMatch = text.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
    if (frMatch) {
      const fullYear = frMatch[3].length === 2 ? Number('20' + frMatch[3]) : Number(frMatch[3]);
      return new Date(fullYear, Number(frMatch[2]) - 1, Number(frMatch[1]));
    }
    return null;
  };

  const parseHistoricalBudgetCellDate = (cell: XLSX.CellObject | undefined) => {
    if (!cell) return null;
    return parseHistoricalBudgetDate(cell.v) || parseHistoricalBudgetDate(cell.w);
  };

  const handleHistoricalBudgetExcelImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setHistoricalBudgetStatus('Lecture locale du budget historique Excel...');

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const previews: HistoricalBudgetPreview[] = [];
      const matchedSheets: string[] = [];
      let scannedDateRows = 0;

      for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
        const sheetName = findBudgetSheetName(workbook, monthIndex, year);
        if (!sheetName) continue;
        matchedSheets.push(sheetName);
        const sheet = workbook.Sheets[sheetName];
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');

        for (let rowNumber = range.s.r; rowNumber <= range.e.r; rowNumber += 1) {
          const parsedDate = parseHistoricalBudgetCellDate(getHistoricalBudgetCell(sheet, rowNumber, 0));
          if (!parsedDate) continue;
          scannedDateRows += 1;
          if (parsedDate.getFullYear() !== year || parsedDate.getMonth() !== monthIndex) continue;
          const day = parsedDate.getDate();
          const rowIndex = getDashboardRowIndexForDay(year, monthIndex, day);
          if (rowIndex < 0) continue;

          const caMidi = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, 1));
          const caSoir = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, 3));
          const caTotal = caMidi + caSoir;
          const couvertsMidi = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, 11));
          const couvertsSoir = parseHistoricalBudgetCellNumber(getHistoricalBudgetCell(sheet, rowNumber, 15));
          const couvertsTotal = couvertsMidi + couvertsSoir;

          if (caTotal <= 0 && couvertsTotal <= 0) continue;

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
            couvertsSoir,
            couvertsTotal,
            status: caTotal > 0 && couvertsTotal > 0 ? 'Budget détecté' : 'Budget partiel détecté',
          });
        }
      }

      setHistoricalBudgetPreviews(previews);
      setImportPreview([]);
      setCaisseImportPreviews([]);
      setInvoiceImportPreviews([]);
      setHistoricalBudgetStatus(previews.length > 0
        ? previews.length + ' jour(s) budget trouvés sur ' + new Set(previews.map(item => item.month)).size + ' mois. Vérifie puis valide.'
        : 'Aucun budget journalier trouvé pour ' + year + '. Feuilles budget détectées : ' + (matchedSheets.join(', ') || 'aucune') + '. Lignes dates lues : ' + scannedDateRows + '.');
    } catch (error) {
      setHistoricalBudgetStatus('Erreur import budget Excel : ' + (error instanceof Error ? error.message : 'lecture impossible'));
    } finally {
      event.target.value = '';
    }
  };

  const applyHistoricalBudgetExcelImport = () => {
    historicalBudgetPreviews.forEach(item => {
      updateDashboard(item.month, item.rowIndex + '-0', formatImportedNumber(item.caMidi));
      updateDashboard(item.month, item.rowIndex + '-1', formatImportedNumber(item.caSoir));
      updateDashboard(item.month, item.rowIndex + '-2', '');
      updateDashboard(item.month, item.rowIndex + '-6', formatImportedNumber(item.couvertsMidi, 0));
      updateDashboard(item.month, item.rowIndex + '-8', formatImportedNumber(item.couvertsSoir, 0));
      updateDashboard(item.month, item.rowIndex + '-14', '');
    });
    setHistoricalBudgetStatus(historicalBudgetPreviews.length + ' jour(s) budget importés dans le suivi quotidien pour ' + year + '.');
    setHistoricalBudgetPreviews([]);
  };`,
      'fonctions import budget historique'
    );

    next = replaceRequired(
      next,
      `                <label style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 14, border: '1px dashed #c084fc', borderRadius: 10, background: '#faf5ff' }}>
                  <span style={{ fontSize: 12, fontWeight: 900, color: '#7e22ce', textTransform: 'uppercase', letterSpacing: '.04em' }}>PDF salaires</span>
                  <span style={{ fontSize: 12, color: '#475569', lineHeight: 1.45 }}>
                    Lit les noms, heures et couts globaux puis met a jour les taux par statut et section.
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.txt,text/plain,application/pdf"
                    onChange={handleSalaryPayrollImport}
                    style={{ fontSize: 13, color: '#0f172a' }}
                  />
                </label>`,
      `                <label style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 14, border: '1px dashed #c084fc', borderRadius: 10, background: '#faf5ff' }}>
                  <span style={{ fontSize: 12, fontWeight: 900, color: '#7e22ce', textTransform: 'uppercase', letterSpacing: '.04em' }}>PDF salaires</span>
                  <span style={{ fontSize: 12, color: '#475569', lineHeight: 1.45 }}>
                    Lit les noms, heures et couts globaux puis met a jour les taux par statut et section.
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.txt,text/plain,application/pdf"
                    onChange={handleSalaryPayrollImport}
                    style={{ fontSize: 13, color: '#0f172a' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 14, border: '1px dashed #f59e0b', borderRadius: 10, background: '#fffbeb' }}>
                  <span style={{ fontSize: 12, fontWeight: 900, color: '#92400e', textTransform: 'uppercase', letterSpacing: '.04em' }}>Budget historique Excel</span>
                  <span style={{ fontSize: 12, color: '#475569', lineHeight: 1.45 }}>
                    Lit les feuilles JANV/FEV/etc. de l'annee affichee et prepare l'import des budgets journaliers. Limonade ignoree pour Thillois.
                  </span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={handleHistoricalBudgetExcelImport}
                    style={{ fontSize: 13, color: '#0f172a' }}
                  />
                </label>`,
      'carte import budget historique'
    );

    next = replaceRequired(
      next,
      `              {salaryImportStatus && (`,
      `              {historicalBudgetStatus && (
                <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: historicalBudgetStatus.startsWith('Erreur') ? '#fef2f2' : '#fffbeb', border: '1px solid ' + (historicalBudgetStatus.startsWith('Erreur') ? '#fecaca' : '#fde68a'), color: historicalBudgetStatus.startsWith('Erreur') ? '#991b1b' : '#92400e', fontSize: 13, fontWeight: 800 }}>
                  {historicalBudgetStatus}
                </div>
              )}

              {historicalBudgetPreviews.length > 0 && (
                <div style={{ marginTop: 12, display: 'grid', gap: 10, padding: 12, border: '1px solid #fde68a', borderRadius: 10, background: '#fffbeb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 950, color: '#92400e', textTransform: 'uppercase', letterSpacing: '.04em' }}>Prévisualisation budget historique</div>
                      <div style={{ marginTop: 3, fontSize: 12, color: '#64748b', fontWeight: 700 }}>
                        {historicalBudgetPreviews.length} jours · CA budget {formatImportedCurrencyLabel(historicalBudgetPreviews.reduce((sum, item) => sum + item.caTotal, 0))} · Couverts {formatImportedIntegerLabel(historicalBudgetPreviews.reduce((sum, item) => sum + item.couvertsTotal, 0))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => setHistoricalBudgetPreviews([])} style={{ height: 34, border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', color: '#334155', fontSize: 12, fontWeight: 900, cursor: 'pointer', padding: '0 12px' }}>Annuler</button>
                      <button type="button" onClick={applyHistoricalBudgetExcelImport} style={{ height: 34, border: 'none', borderRadius: 8, background: '#b45309', color: '#fff', fontSize: 12, fontWeight: 950, cursor: 'pointer', padding: '0 14px' }}>Valider l'import</button>
                    </div>
                  </div>
                  <div style={{ maxHeight: 220, overflow: 'auto', display: 'grid', gap: 6 }}>
                    {historicalBudgetPreviews.slice(0, 40).map(item => (
                      <div key={item.id} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '120px 90px repeat(4, minmax(86px, 1fr))', gap: 8, alignItems: 'center', padding: '8px 10px', border: '1px solid #fde68a', borderRadius: 8, background: '#fff' }}>
                        <div style={{ fontSize: 12, fontWeight: 900, color: '#0f172a' }}>{monthNames[item.month]} {item.day}</div>
                        <div style={{ fontSize: 11, fontWeight: 850, color: '#92400e' }}>{item.sheetName}</div>
                        <div style={{ fontSize: 11, fontWeight: 800 }}>Midi {formatImportedCurrencyLabel(item.caMidi)}</div>
                        <div style={{ fontSize: 11, fontWeight: 800 }}>Soir {formatImportedCurrencyLabel(item.caSoir)}</div>
                        <div style={{ fontSize: 11, fontWeight: 800 }}>Cts midi {formatImportedIntegerLabel(item.couvertsMidi)}</div>
                        <div style={{ fontSize: 11, fontWeight: 800 }}>Cts soir {formatImportedIntegerLabel(item.couvertsSoir)}</div>
                      </div>
                    ))}
                    {historicalBudgetPreviews.length > 40 && <div style={{ fontSize: 12, fontWeight: 800, color: '#92400e' }}>+ {historicalBudgetPreviews.length - 40} lignes non affichees dans l'aperçu</div>}
                  </div>
                </div>
              )}

              {salaryImportStatus && (`,
      'preview import budget historique'
    );

    return { code: next, map: null };
  },
});
