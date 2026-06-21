import React, { useMemo, useEffect, useRef } from 'react';
import DashboardAnalysisView from '@/pages/DashboardAnalysisView';

import { useData, type SalarieRow } from '@/contexts/DataContext';
import { averagePayrollRate } from '@/personnelSalaryImport';
import { parseMoneyValue } from '@/lib/money';

// ── Modèle Dashboard extrait (types, colonnes, configuration statique) ────────
import type {
  DashboardColumn,
  DashboardRow,
  VisibleDashboardColumn,
} from '@/features/dashboard/dashboardTypes';
import { buildDynamicColumns, dashboardColumns as C } from '@/features/dashboard/dashboardColumns';
import {
  contextColumns,
  dailyPersonnelRows,
  dailyPersonnelTotals,
  days,
  editableCols,
  monthNames,
} from '@/features/dashboard/dashboardStaticConfig';
import { useDashboardDailyRecapState } from '@/features/dashboard/hooks/useDashboardDailyRecapState';
import { useDashboardImportState } from '@/features/dashboard/hooks/useDashboardImportState';
import { useDashboardPeriodState } from '@/features/dashboard/hooks/useDashboardPeriodState';
import { useDashboardPurchaseSuppliers } from '@/features/dashboard/hooks/useDashboardPurchaseSuppliers';
import { useDashboardResponsiveState } from '@/features/dashboard/hooks/useDashboardResponsiveState';
import { useDashboardUiState } from '@/features/dashboard/hooks/useDashboardUiState';
import { useDashboardImportHandlers } from '@/features/dashboard/hooks/useDashboardImportHandlers';
import { useDashboardDailyRecapHandlers } from '@/features/dashboard/hooks/useDashboardDailyRecapHandlers';
import {
  computeDashboardData,
  formatPayrollHourVisualValue,
  formatValue,
  getFgBoxLayout,
  isDateInRange,
  isExactDate,
  isPayrollInputColumn,
  parsePayrollHourForCalculation,
} from '@/features/dashboard/dashboardCalculations';
import {
  renderAutoValue as renderDashboardAutoValue,
  renderCashAutoValue as renderDashboardCashAutoValue,
  renderDailySection as renderDashboardDailySection,
  renderDailyServiceRow as renderDashboardDailyServiceRow,
  renderDailySingleRow as renderDashboardDailySingleRow,
  renderDailyTotalRow as renderDashboardDailyTotalRow,
  renderPersonnelRow as renderDashboardPersonnelRow,
  renderPersonnelTable as renderDashboardPersonnelTable,
} from '@/features/dashboard/components/dashboardRenderHelpers';
import { parseCaisseNumber } from '@/features/dashboard/importHelpers/caisseImport';
import DashboardDatePicker from '@/features/dashboard/components/DashboardDatePicker';
import DebouncedInput from '@/features/dashboard/components/DebouncedInput';
import DashboardRealiseMatrix from '@/features/dashboard/components/DashboardRealiseMatrix';
import DashboardDailyEntry from '@/features/dashboard/components/DashboardDailyEntry';
import DashboardSidebar from '@/features/dashboard/components/DashboardSidebar';
import DashboardHeader from '@/features/dashboard/components/DashboardHeader';
import DashboardDailyRecapModal from '@/features/dashboard/components/DashboardDailyRecapModal';
import DashboardImportModal from '@/features/dashboard/components/DashboardImportModal';
import DashboardTableHeader from '@/features/dashboard/components/DashboardTableHeader';
import DashboardTableBody from '@/features/dashboard/components/DashboardTableBody';
// ─────────────────────────────────────────────────────────────────────────────
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import jsPDF from 'jspdf';
import domtoimage from 'dom-to-image-more';

interface DashboardProps {
  initialMonth: number;
  year: number;
  onBack: () => void;
}

export default function Dashboard({ initialMonth, year, onBack }: DashboardProps) {
  const {
    data: globalData,
    allData,
    updateDashboard,
    updateTheorique,
    updateBilanSynthese,
    updateNepting,
    updateEspeces,
    updateConecs,
    updateAncvPapiers,
    updateSaisieTR,
    updateSunday,
    updateUber,
    updateAmexAncv,
    updateDeliveroo,
    updateClickCollect,
    customEvents,
    personnelInfos,
    setSelectedYear,
    setSelectedMonth,
    updateSalariesConfig,
    updatePersonnelSchema,
    markMonthsAsLoaded,
    saveNow,
    resetLocalData,
  } = useData();
  
  const getEaster = (y: number) => {
    const a = y % 19;
    const b = Math.floor(y / 100);
    const c = y % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month - 1, day);
  };

  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const formatDateStr = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const easter = getEaster(year);

  const publicHolidays = [
    `${year}-01-01`, // Jour de l'An
    formatDateStr(addDays(easter, 1)), // Lundi de Pâques
    `${year}-05-01`, // Fête du Travail
    `${year}-05-08`, // Victoire 1945
    formatDateStr(addDays(easter, 39)), // Ascension
    formatDateStr(addDays(easter, 50)), // Lundi de Pentecôte
    `${year}-07-14`, // Fête Nationale
    `${year}-08-15`, // Assomption
    `${year}-11-01`, // La Toussaint
    `${year}-11-11`, // Armistice 1918
    `${year}-12-25`, // Noël
  ];

  const schoolHolidays = [
    { start: `${year - 1}-10-17`, end: `${year - 1}-11-02` }, // Toussaint
    { start: `${year - 1}-12-19`, end: `${year}-01-04` }, // Noël
    { start: `${year}-02-20`, end: `${year}-03-08` }, // Hiver Zone C
    { start: `${year}-04-17`, end: `${year}-05-03` }, // Printemps Zone C
    { start: `${year}-05-13`, end: `${year}-05-17` }, // Pont Ascension
    { start: `${year}-07-03`, end: `${year}-08-30` }, // Grandes Vacances
  ];

  const {
    month,
    setMonth,
    selectedEntryDay,
    setSelectedEntryDay,
    selectMonth,
  } = useDashboardPeriodState({ initialMonth, year, setSelectedMonth });
  const { isMobile } = useDashboardResponsiveState();
  const {
    isImportModalOpen,
    setIsImportModalOpen,
    importStatus,
    setImportStatus,
    importPreview,
    setImportPreview,
    caisseImportPreviews,
    setCaisseImportPreviews,
    invoiceImportStatus,
    setInvoiceImportStatus,
    invoiceImportPreviews,
    setInvoiceImportPreviews,
    historicalBudgetStatus,
    setHistoricalBudgetStatus,
    historicalBudgetPreviews,
    setHistoricalBudgetPreviews,
    historicalV25Status,
    setHistoricalV25Status,
    historicalV25Previews,
    setHistoricalV25Previews,
    salaryImportStatus,
    setSalaryImportStatus,
    resetDashboardImportState,
  } = useDashboardImportState();
  const recapPreviewRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const {
    dailyRecapStatus,
    setDailyRecapStatus,
    isDailyRecapModalOpen,
    setIsDailyRecapModalOpen,
    dailyRecapManagers,
    setDailyRecapManagers,
    dailyRecapServiceComments,
    setDailyRecapServiceComments,
    dailyRecapGoogleRatings,
    setDailyRecapGoogleRatings,
  } = useDashboardDailyRecapState();
  const { purchaseSupplierNames, setPurchaseSupplierNames, resetPurchaseSupplierNames } = useDashboardPurchaseSuppliers();
  const {
    isSidebarOpen,
    setIsSidebarOpen,
    isDatePickerOpen,
    setIsDatePickerOpen,
    focusedCell,
    setFocusedCell,
    activeTab,
    setActiveTab,
    tableViewMode,
    setTableViewMode,
    dragState,
    setDragState,
  } = useDashboardUiState();
  const dynamicColumns = useMemo(
    () => buildDynamicColumns(globalData[month]?.salariesConfig?.categories, purchaseSupplierNames),
    [C, globalData, month, purchaseSupplierNames],
  );

  useEffect(() => {
    if (!isDatePickerOpen) return;
    const handleOutsidePointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && datePickerRef.current?.contains(target)) return;
      setIsDatePickerOpen(false);
    };
    document.addEventListener('mousedown', handleOutsidePointer);
    document.addEventListener('touchstart', handleOutsidePointer);
    return () => {
      document.removeEventListener('mousedown', handleOutsidePointer);
      document.removeEventListener('touchstart', handleOutsidePointer);
    };
  }, [isDatePickerOpen]);

  const cellData = globalData[month]?.dashboard || {};
  const updatePurchaseSupplierName = (col: number, value: string) => {
    setPurchaseSupplierNames(prev => ({
      ...prev,
      [col]: value,
    }));
  };

  const handleTemporaryResetLocalData = () => {
    const confirmed = window.confirm('RAZ provisoire : effacer toutes les donnees locales de test de cette application ?');
    if (!confirmed) return;

    resetLocalData();
    resetPurchaseSupplierNames();
    resetDashboardImportState();
    setImportStatus('RAZ locale effectuee. Les donnees de test ont ete effacees.');
  };

  const handleDragStart = (e: React.MouseEvent, rIdx: number, cIdx: number, value: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragState({ rIdx, cIdx, endRow: rIdx, value });
  };

  const handleDragMove = (rIdx: number) => {
    setDragState(prev => {
      if (!prev) return prev;
      return { ...prev, endRow: Math.max(prev.rIdx, rIdx) };
    });
  };

  const handleDragEnd = () => {
    if (!dragState) return;

    const { rIdx, cIdx, endRow, value } = dragState;
    if (endRow > rIdx) {
      for (let rowIdx = rIdx + 1; rowIdx <= endRow; rowIdx++) {
        if (rows[rowIdx]?.type === 'day') {
          handleCellChange(rowIdx, cIdx, value);
        }
      }
    }

    setDragState(null);
  };

  const rows = useMemo(() => {
    const generatedRows: DashboardRow[] = [];
    let weekCount = 1;
    const numDays = new Date(year, month + 1, 0).getDate();
    const monthName = monthNames[month];

    for (let i = 1; i <= numDays; i++) {
      const date = new Date(year, month, i);
      const dayName = days[date.getDay()];
      
      const isSchoolHoliday = schoolHolidays.some(h => isDateInRange(date, h.start, h.end));
      const isPublicHoliday = publicHolidays.some(h => isExactDate(date, h));
      const isCustomEvent = customEvents?.some(e => isExactDate(date, e.date));
      
      generatedRows.push({ 
        type: 'day', 
        label: `${dayName} ${i} ${monthName} ${year}`, 
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        isSchoolHoliday,
        isPublicHoliday,
        isCustomEvent,
        dateObj: date,
        dayIndex: i,
        weekIndex: weekCount
      });
      
      if (date.getDay() === 0) {
        generatedRows.push({ type: 'total', label: `Total Semaine ${weekCount}`, weekIndex: weekCount });
        weekCount++;
      }
    }
    
    if (new Date(year, month, numDays).getDay() !== 0) {
      const lastWeekHasDays = generatedRows.some(r => r.type === 'day' && r.weekIndex === weekCount);
      if (lastWeekHasDays) generatedRows.push({ type: 'total', label: `Total Semaine ${weekCount}`, weekIndex: weekCount });
    }

    generatedRows.push({ type: 'fg_box4_total', label: '' });
    generatedRows.push({ type: 'month_total', label: 'TOTAL' });
    return generatedRows;
  }, [month, year]);

  const fgBoxNames = [
    ['ENTRETIEN ET REPARATION', 'ECOLAB / DIVERSEY', 'MARKETING LOCAL (BFF / FUCHEY / TRADER)'],
    ['PETIT MATERIEL ET VAISSELLE', 'HACCP DIVERS', 'AUTRES FRAIS'],
    ['TENUE DU PERSONNEL', 'MATERIEL DE BUREAU', 'ENERGIE (Gaz / Electricité / Charbon)'],
    ['ANNIMATION', 'FRAIS DE TRANSPORT', 'DIVERS']
  ];

  const handleCellChange = (rIdx: number, cIdx: number, value: string) => {
    const colName = dynamicColumns[cIdx][2] || dynamicColumns[cIdx][1];
    const isTextCol = [37, 38, 44, 49, 50].includes(cIdx) || ['DATE', 'FOURNISSEUR', 'FOURNISSEURS', 'MOTIF ACHAT', 'Nom'].includes(colName);
    
    if (isTextCol) {
      updateDashboard(month, `${rIdx}-${cIdx}`, value);
    } else if (isPayrollInputColumn(cIdx)) {
      const cleanHourValue = value.replace(/[^0-9hH:.,\s]/g, '');
      updateDashboard(month, `${rIdx}-${cIdx}`, cleanHourValue);
    } else {
      const cleanValue = value.replace(/[^0-9.,-]/g, '').replace(',', '.');
      updateDashboard(month, `${rIdx}-${cIdx}`, cleanValue);
    }
  };

  // Calculate totals
  const calculatedData = useMemo(() => {
    const nMinus1MonthData = allData[year - 1]?.[month];
    // Données du mois suivant en N-1 pour les jours de débordement (ex: sam 31 jan 2026 → sam 1er fév 2025)
    const overflowYear = month === 11 ? year : year - 1;
    const overflowMonth = month === 11 ? 0 : month + 1;
    const nMinus1OverflowMonthData = allData[overflowYear]?.[overflowMonth];
    let nMinus1Data: { cellData: Record<string, string>; rows: DashboardRow[] } | undefined;
    if (nMinus1MonthData?.dashboard) {
      const numDaysN1 = new Date(year - 1, month + 1, 0).getDate();
      const n1Rows: DashboardRow[] = [];
      let weekCountN1 = 1;
      for (let i = 1; i <= numDaysN1; i++) {
        const date = new Date(year - 1, month, i);
        n1Rows.push({ type: 'day', label: '', dateObj: date, dayIndex: i, weekIndex: weekCountN1 });
        if (date.getDay() === 0) { n1Rows.push({ type: 'total', label: '', weekIndex: weekCountN1 }); weekCountN1++; }
      }
      if (new Date(year - 1, month, numDaysN1).getDay() !== 0) n1Rows.push({ type: 'total', label: '', weekIndex: weekCountN1 });
      // Fusionner les 6 premiers jours du mois overflow N-1 pour gérer le débordement de fin de mois
      let mergedCellData: Record<string, string> = { ...nMinus1MonthData.dashboard };
      if (nMinus1OverflowMonthData?.dashboard) {
        for (let i = 1; i <= 6; i++) {
          const date = new Date(overflowYear, overflowMonth, i);
          // Calculer le srcRIdx dans le dashboard du mois overflow (compte les totaux de semaine avant le jour i)
          let srcRIdx = i - 1;
          for (let d = 1; d < i; d++) {
            if (new Date(overflowYear, overflowMonth, d).getDay() === 0) srcRIdx++;
          }
          const combinedRIdx = n1Rows.length;
          n1Rows.push({ type: 'day', label: '', dateObj: date, dayIndex: i, weekIndex: weekCountN1 });
          [6, 7, 8, 9, 17, 18, 19, 25, 27].forEach(col => {
            const v = nMinus1OverflowMonthData?.dashboard?.[`${srcRIdx}-${col}`];
            if (v !== undefined) mergedCellData[`${combinedRIdx}-${col}`] = v;
          });
        }
      }
      n1Rows.push({ type: 'fg_box4_total', label: '' });
      n1Rows.push({ type: 'month_total', label: '' });
      nMinus1Data = { cellData: mergedCellData, rows: n1Rows };
    }
    return computeDashboardData(cellData, rows, dynamicColumns, globalData[month]?.salariesConfig?.categories, globalData[month]?.personnelSchema, nMinus1Data);
  }, [cellData, globalData[month]?.salariesConfig, globalData[month]?.personnelSchema, allData[year - 1]?.[month], allData[month === 11 ? year : year - 1]?.[month === 11 ? 0 : month + 1]]);

  const todayMarker = useMemo(() => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
    };
  }, []);

  const visibleColumns = useMemo(() => {
    const baseVisibleColumns = dynamicColumns.map((c, index) => Object.assign([...c] as DashboardColumn, { originalIndex: index })).filter(c => {
      const group = c[0];
      const colIndex = c.originalIndex;

      const isInActiveTab = (() => {
        switch (activeTab) {
        case 'PREVISIONS':
          return ['CA', 'RESTAURANTS', 'LIMONADE'].includes(group);
        case 'REALISE':
          return ['REALISE', 'EVENEMENTS RESTAURANTS', 'EVENEMENTS NATIONAL'].includes(group);
        case 'COUT_MATIERE':
          return ['DEMARQUES', 'COUT MATIERE'].includes(group);
        case 'PERSONNEL':
          return ['FRAIS DE PERSONNEL PROJECTION', 'FRAIS DE PERSONNEL REALISE'].includes(group);
        case 'FRAIS_GENERAUX':
          if (tableViewMode === 'SAISIE') return group === 'FRAIS GENERAUX';
          return ['FRAIS GENERAUX', 'CONTRAT MENSUALISES'].includes(group);
        case 'RESULTATS':
          return group === 'RESULTATS MENSUEL HT';
        default:
          return true;
        }
      })();

      if (!isInActiveTab || tableViewMode === 'COMPLET') return isInActiveTab;

      const isEditableColumn = editableCols.includes(colIndex) || group === 'FRAIS GENERAUX' || group === 'CONTRAT MENSUALISES';
      const isDailyDemarqueColumn = group === 'DEMARQUES';

      if (tableViewMode === 'SAISIE') {
        return isDailyDemarqueColumn || isEditableColumn || contextColumns.has(colIndex);
      }

      if (group === 'FRAIS GENERAUX' || group === 'CONTRAT MENSUALISES') {
        return true;
      }

      return !isEditableColumn || contextColumns.has(colIndex);
    });

    const thilloisNoLimonadeColumns = new Set([2, 14, 15, 16, 20, 34, 35, 36, 110, 111, 112, 113, 114, 115]);
    const isGlobalPersonnelSchema = globalData[month]?.personnelSchema === 'global';
    const cuisineSalleColumns = new Set([62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86]);
    const globalPersonnelColumns = new Set([130, 131, 132, 133, 134, 135, 136, 137, 138]);
    const visibleColumnsWithoutLimonade = baseVisibleColumns.filter(col => {
      const text = [col[0], col[1], col[2]].join(' ').toUpperCase();
      if (thilloisNoLimonadeColumns.has(col.originalIndex) || text.includes('LIMONADE')) return false;
      if (isGlobalPersonnelSchema && cuisineSalleColumns.has(col.originalIndex)) return false;
      if (!isGlobalPersonnelSchema && globalPersonnelColumns.has(col.originalIndex)) return false;
      return true;
    });
    const findColumn = (colIndex: number) => visibleColumnsWithoutLimonade.find(col => col.originalIndex === colIndex);
    const buildColumn = (colIndex: number, group: string, subGroup: string, label: string, bg?: string) => {
      const source = findColumn(colIndex);
      if (!source) return null;
      const column = Object.assign([...source] as DashboardColumn, { originalIndex: source.originalIndex });
      column[0] = group;
      column[1] = subGroup;
      column[2] = label;
      if (bg) column[3] = bg;
      return column as VisibleDashboardColumn;
    };

    if (activeTab === 'PREVISIONS' && tableViewMode === 'COMPLET') {
      return [
        buildColumn(0, 'CA HT', 'CA HT RESTAURANT', 'MIDI'),
        buildColumn(1, 'CA HT', 'CA HT RESTAURANT', 'SOIR'),
        buildColumn(125, 'CA HT', 'CA HT RESTAURANT', 'TOTAL'),
        buildColumn(2, 'CA HT', 'CA HT LIMONADE', 'TOTAL'),
        buildColumn(3, 'CA HT', '', 'TOTAL JOUR'),
        buildColumn(4, 'CA HT', '', 'CUMUL MOIS'),
        buildColumn(128, 'CA HT', 'ECART VS N-1', 'VALEUR', 'bg-white'),
        buildColumn(5, 'CA HT', 'ECART VS N-1', '%', 'bg-white'),
        buildColumn(6, 'COUVERTS', 'COUVERTS RESTAURANT', 'MIDI'),
        buildColumn(7, 'COUVERTS', 'COUVERTS RESTAURANT', 'TM MIDI'),
        buildColumn(8, 'COUVERTS', 'COUVERTS RESTAURANT', 'SOIR'),
        buildColumn(9, 'COUVERTS', 'COUVERTS RESTAURANT', 'TM SOIR'),
        buildColumn(10, 'COUVERTS', 'COUVERTS RESTAURANT', 'TOTAL'),
        buildColumn(11, 'COUVERTS', 'COUVERTS RESTAURANT', 'TM TOTAL'),
        buildColumn(14, 'COUVERTS', 'COUVERTS LIMONADE', 'TOTAL'),
        buildColumn(15, 'COUVERTS', 'COUVERTS LIMONADE', 'TM TOTAL'),
        buildColumn(126, 'COUVERTS', '', 'TOTAL JOUR'),
        buildColumn(127, 'COUVERTS', '', 'CUMUL MOIS'),
        buildColumn(129, 'COUVERTS', 'ECART VS N-1', 'VALEUR', 'bg-white'),
        buildColumn(13, 'COUVERTS', 'ECART VS N-1', '%', 'bg-white'),
      ].filter(Boolean) as VisibleDashboardColumn[];
    }

    if (activeTab !== 'REALISE' || tableViewMode !== 'COMPLET') return visibleColumnsWithoutLimonade;

    return [
      buildColumn(17, 'CA HT', '', 'VAE'),
      buildColumn(18, 'CA HT', 'CA HT RESTAURANT', 'MIDI'),
      buildColumn(19, 'CA HT', 'CA HT RESTAURANT', 'SOIR'),
      buildColumn(116, 'CA HT', 'CA HT RESTAURANT', 'TOTAL'),
      buildColumn(110, 'CA HT', 'CA HT LIMONADE', 'MIDI'),
      buildColumn(111, 'CA HT', 'CA HT LIMONADE', 'SOIR'),
      buildColumn(20, 'CA HT', 'CA HT LIMONADE', 'TOTAL'),
      buildColumn(21, 'CA HT', '', 'TOTAL JOUR'),
      buildColumn(23, 'CA HT', '', 'CUMUL MOIS'),
      buildColumn(22, 'CA HT', 'ECART BUDGET', 'VALEUR', 'bg-white'),
      buildColumn(117, 'CA HT', 'ECART BUDGET', '%', 'bg-white'),
      buildColumn(118, 'CA HT', 'ECART VS N-1', 'VALEUR', 'bg-white'),
      buildColumn(119, 'CA HT', 'ECART VS N-1', '%', 'bg-white'),
      buildColumn(139, 'CA HT', 'TENDANCE CUMUL', 'vs Budget €', 'bg-white'),
      buildColumn(140, 'CA HT', 'TENDANCE CUMUL', 'vs Budget %', 'bg-hatched'),
      buildColumn(141, 'CA HT', 'TENDANCE CUMUL', 'vs N-1 %', 'bg-hatched'),
      buildColumn(25, 'COUVERTS', 'COUVERTS RESTAURANT', 'MIDI'),
      buildColumn(26, 'COUVERTS', 'COUVERTS RESTAURANT', 'TM MIDI'),
      buildColumn(27, 'COUVERTS', 'COUVERTS RESTAURANT', 'SOIR'),
      buildColumn(28, 'COUVERTS', 'COUVERTS RESTAURANT', 'TM SOIR'),
      buildColumn(29, 'COUVERTS', 'COUVERTS RESTAURANT', 'TOTAL'),
      buildColumn(30, 'COUVERTS', 'COUVERTS RESTAURANT', 'TM TOTAL'),
      buildColumn(112, 'COUVERTS', 'COUVERTS LIMONADE', 'MIDI'),
      buildColumn(113, 'COUVERTS', 'COUVERTS LIMONADE', 'TM MIDI'),
      buildColumn(114, 'COUVERTS', 'COUVERTS LIMONADE', 'SOIR'),
      buildColumn(115, 'COUVERTS', 'COUVERTS LIMONADE', 'TM SOIR'),
      buildColumn(34, 'COUVERTS', 'COUVERTS LIMONADE', 'TOTAL'),
      buildColumn(35, 'COUVERTS', 'COUVERTS LIMONADE', 'TM TOTAL'),
      buildColumn(120, 'COUVERTS', '', 'TOTAL JOUR'),
      buildColumn(121, 'COUVERTS', '', 'CUMUL MOIS'),
      buildColumn(33, 'COUVERTS', 'ECART BUDGET', 'VALEUR', 'bg-white'),
      buildColumn(122, 'COUVERTS', 'ECART BUDGET', '%', 'bg-white'),
      buildColumn(123, 'COUVERTS', 'ECART VS N-1', 'VALEUR', 'bg-white'),
      buildColumn(124, 'COUVERTS', 'ECART VS N-1', '%', 'bg-white'),
    ].filter(Boolean) as VisibleDashboardColumn[];
  }, [activeTab, tableViewMode, dynamicColumns]);

  const groups: Array<{ name: string; colspan: number; bg: string }> = [];
  let currentGroup: { name: string; colspan: number; bg: string } | null = null;
  visibleColumns.forEach(c => {
    if (!currentGroup || currentGroup.name !== c[0]) {
      if (currentGroup) groups.push(currentGroup);
      currentGroup = { name: c[0], colspan: 1, bg: c[3] };
    } else {
      currentGroup.colspan++;
    }
  });
  if (currentGroup) groups.push(currentGroup);

  const subGroups: Array<{ name: string; group: string; colspan: number; bg: string }> = [];
  let currentSub: { name: string; group: string; colspan: number; bg: string } | null = null;
  visibleColumns.forEach(c => {
    if (!currentSub || currentSub.name !== c[1] || currentSub.group !== c[0]) {
      if (currentSub) subGroups.push(currentSub);
      currentSub = { name: c[1], group: c[0], colspan: 1, bg: c[3] };
    } else {
      currentSub.colspan++;
    }
  });
  if (currentSub) subGroups.push(currentSub);

  const isEndOfSection = visibleColumns.map((c, i) => i === visibleColumns.length - 1 || visibleColumns[i][0] !== visibleColumns[i+1][0] || visibleColumns[i][1] !== visibleColumns[i+1][1]);
  
  const isEndOfMajorSection = visibleColumns.map((c, i) => {
    if (i === visibleColumns.length - 1) return true;
    const currentGroup = c[0];
    const nextGroup = visibleColumns[i+1][0];
    if (currentGroup !== nextGroup) {
      // Group CA and RESTAURANTS are part of PREVISIONS, so no major break after them
      if (currentGroup === 'CA' || currentGroup === 'RESTAURANTS') return false;
      // Group REALISE and EVENEMENTS RESTAURANTS are part of REALISE super-section
      if (currentGroup === 'REALISE' || currentGroup === 'EVENEMENTS RESTAURANTS') return false;
      return true;
    }
    return false;
  });

  const dayRows = useMemo(() => rows
    .map((row, index) => ({ row, index }))
    .filter(item => item.row.type === 'day'), [rows]);

  const selectedDayEntry = dayRows.find(item => item.row.dayIndex === selectedEntryDay) || dayRows[0];
  const selectedDayRowIndex = selectedDayEntry?.index ?? -1;
  const selectedDayRow = selectedDayEntry?.row;
  const selectedDayLabel = selectedDayRow?.dateObj?.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }) || selectedDayRow?.label || '';
  const selectedMonthLabel = `${monthNames[month]} ${year}`;
  const monthSelectOptions = monthNames.map((label, value) => ({ label, value }));
  const yearSelectOptions = [year - 1, year, year + 1];
  const leadingEmptyDays = (new Date(year, month, 1).getDay() + 6) % 7;
  const datePickerCells = [
    ...Array.from({ length: leadingEmptyDays }, () => null as DashboardRow | null),
    ...dayRows.map(({ row }) => row),
  ];
  while (datePickerCells.length % 7 !== 0) datePickerCells.push(null);

  const {
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
    formatImportedCurrencyLabel,
    formatImportedIntegerLabel,
    formatImportBusinessDateLabel,
  } = useDashboardImportHandlers({
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
  });

  const {
    getDailyDisplayValue,
    buildDailyRecapHtml,
    openDailyRecapPreview,
    handleValidateDailyRecapMail,
  } = useDashboardDailyRecapHandlers({
    selectedDayRowIndex,
    selectedDayLabel,
    calculatedData,
    dynamicColumns,
    dailyRecapManagers,
    dailyRecapServiceComments,
    dailyRecapGoogleRatings,
    setDailyRecapStatus,
    setIsDailyRecapModalOpen,
  });
  const isDailyFieldFocused = (col: number) => focusedCell === `${selectedDayRowIndex}-${col}`;

  const dailyInputClass = "w-full h-8 rounded-md border border-slate-400 bg-white px-2 text-right text-sm font-bold text-slate-950 outline-none transition-all hover:border-slate-600 focus:border-slate-700 focus:ring-2 focus:ring-slate-500/15";
  const dailyReadOnlyClass = "flex h-8 items-center justify-end gap-1 overflow-hidden rounded-md border border-slate-300 bg-slate-100/90 px-2 text-sm font-bold text-slate-700 shadow-inner";
  const cashInputClass = "w-full h-7 rounded-md border border-slate-400 bg-white px-2 text-right text-xs font-bold text-slate-950 outline-none transition-all hover:border-slate-600 focus:border-slate-700 focus:ring-2 focus:ring-slate-500/15";

  const renderAutoValue = (value: string | number, options: { className?: string; style?: React.CSSProperties } = {}) => (
    renderDashboardAutoValue(value, dailyReadOnlyClass, options)
  );
  const renderCashAutoValue = (value: string | number, options: { style?: React.CSSProperties } = {}) => (
    renderDashboardCashAutoValue(value, dailyReadOnlyClass, options)
  );

  const renderDailyField = (label: string, col: number, options: { readOnly?: boolean; text?: boolean } = {}) => {
    const cellKey = `${selectedDayRowIndex}-${col}`;
    const rawValue = cellData[cellKey] || '';
    const value = options.readOnly ? getDailyDisplayValue(col) : (isDailyFieldFocused(col) ? rawValue : getDailyDisplayValue(col));

    return (
      <label key={`${label}-${col}`} style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
        {options.readOnly ? (
          renderAutoValue(value)
        ) : (
          <DebouncedInput
            dataRow={`daily-${selectedDayRowIndex}`}
            dataCol={col}
            value={value}
            onChange={nextValue => handleCellChange(selectedDayRowIndex, col, String(nextValue))}
            onFocus={() => setFocusedCell(cellKey)}
            onBlur={() => setFocusedCell(null)}
            onKeyDown={(event) => handleKeyDown(event, selectedDayRowIndex, col)}
            className={`${dailyInputClass} ${options.text ? 'text-left' : ''}`}
            placeholder=""
          />
        )}
      </label>
    );
  };

  const renderDailyControl = (col: number, options: { readOnly?: boolean; text?: boolean } = {}) => {
    const cellKey = `${selectedDayRowIndex}-${col}`;
    const rawValue = cellData[cellKey] || '';
    const value = options.readOnly ? getDailyDisplayValue(col) : (isDailyFieldFocused(col) ? rawValue : getDailyDisplayValue(col));

    if (options.readOnly) {
      return renderAutoValue(value);
    }

    return (
      <DebouncedInput
        dataRow={`daily-${selectedDayRowIndex}`}
        dataCol={col}
        value={value}
        onChange={nextValue => handleCellChange(selectedDayRowIndex, col, String(nextValue))}
        onFocus={() => setFocusedCell(cellKey)}
        onBlur={() => setFocusedCell(null)}
        onKeyDown={(event) => handleKeyDown(event, selectedDayRowIndex, col)}
        className={`${dailyInputClass} ${options.text ? 'text-left' : ''}`}
        placeholder=""
      />
    );
  };

  const renderDailyServiceRow = (label: string, caCol: number, coversCol: number, tmCol: number) => (
    renderDashboardDailyServiceRow(label, caCol, coversCol, tmCol, isMobile, renderDailyControl)
  );

  const renderDailySingleRow = (label: string, col: number, options: { readOnly?: boolean; text?: boolean } = {}) => (
    renderDashboardDailySingleRow(label, col, options, isMobile, renderDailyControl)
  );

  const renderDailyTotalRow = (items: ReadonlyArray<{ label: string; col: number }>) => (
    renderDashboardDailyTotalRow(items, isMobile, renderDailyControl)
  );

  const renderDailyRealiseMatrix = () => (
    <DashboardRealiseMatrix
      isMobile={isMobile}
      dailyReadOnlyClass={dailyReadOnlyClass}
      renderDailyControl={renderDailyControl}
    />
  );

  const renderPersonnelRow = (label: string, cuisineCol: number, salleCol: number) => (
    renderDashboardPersonnelRow(label, cuisineCol, salleCol, isMobile, renderDailyControl)
  );

  const renderPersonnelTable = (rows: React.ReactNode) => (
    renderDashboardPersonnelTable(rows, isMobile)
  );

  const tint = (hex: string, opacity: number) => {
    const normalized = hex.replace('#', '');
    const bigint = parseInt(normalized, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const sidebarTheme = 'linear-gradient(180deg,#07111f 0%,#0a2430 48%,#073d43 100%)';
  const sidebarThemeWide = 'linear-gradient(135deg,#07111f 0%,#0a2430 46%,#073d43 100%)';
  const weatherTheme = 'linear-gradient(135deg,#052a34 0%,#0a4d58 52%,#0d6b6f 100%)';
  const weatherThemeHover = 'linear-gradient(135deg,#07323d 0%,#0b5b67 52%,#0f787b 100%)';

  const actionTileStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: isMobile ? '7px 12px' : '9px 16px',
    background: weatherTheme,
    border: '1px solid rgba(207, 250, 254, .26)',
    borderRadius: 12,
    color: '#ecfeff',
    fontSize: isMobile ? 12 : 14,
    fontWeight: 850,
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 8px 18px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.14)',
  };

  const renderDailySection = (title: string, subtitle: string, fields: React.ReactNode, accent: string) => (
    renderDashboardDailySection(title, subtitle, fields, accent, isMobile, tint)
  );

  const renderDatePicker = () => (
    <DashboardDatePicker
      isMobile={isMobile}
      month={month}
      year={year}
      selectedEntryDay={selectedEntryDay}
      monthSelectOptions={monthSelectOptions}
      yearSelectOptions={yearSelectOptions}
      datePickerCells={datePickerCells}
      todayMarker={todayMarker}
      weatherTheme={weatherTheme}
      onMonthChange={selectMonth}
      onYearChange={setSelectedYear}
      onDayChange={setSelectedEntryDay}
      onClose={() => setIsDatePickerOpen(false)}
    />
  );

  const renderDailyEntryView = () => (
    <DashboardDailyEntry
      selectedDayRow={selectedDayRow}
      selectedDayRowIndex={selectedDayRowIndex}
      selectedDayLabel={selectedDayLabel}
      selectedMonthLabel={selectedMonthLabel}
      isMobile={isMobile}
      month={month}
      dynamicColumns={dynamicColumns}
      dailyRecapStatus={dailyRecapStatus}
      globalData={globalData}
      cashInputClass={cashInputClass}
      DebouncedInput={DebouncedInput}
      parseCaisseNumber={parseCaisseNumber}
      renderCashAutoValue={renderCashAutoValue}
      renderDailyField={renderDailyField}
      renderDailySection={renderDailySection}
      renderDailyServiceRow={renderDailyServiceRow}
      renderDailySingleRow={renderDailySingleRow}
      renderDailyTotalRow={renderDailyTotalRow}
      renderPersonnelRow={renderPersonnelRow}
      renderPersonnelTable={renderPersonnelTable}
      dailyPersonnelRows={dailyPersonnelRows}
      dailyPersonnelTotals={dailyPersonnelTotals}
      updateNepting={updateNepting}
      updateEspeces={updateEspeces}
      updateAmexAncv={updateAmexAncv}
      updateConecs={updateConecs}
      updateAncvPapiers={updateAncvPapiers}
      updateSaisieTR={updateSaisieTR}
      updateSunday={updateSunday}
      updateUber={updateUber}
      updateDeliveroo={updateDeliveroo}
      updateClickCollect={updateClickCollect}
    />
  );

  const previsionsGroups = groups.filter(g => activeTab === 'PREVISIONS'
    ? ['CA', 'RESTAURANTS', 'LIMONADE', 'CA HT', 'COUVERTS'].includes(g.name)
    : ['CA', 'RESTAURANTS', 'LIMONADE'].includes(g.name));
  const previsionsColspan = previsionsGroups.reduce((acc, g) => acc + g.colspan, 0);
  
  const realiseGroups = groups.filter(g => activeTab === 'REALISE'
    ? ['REALISE', 'CA HT', 'COUVERTS', 'EVENEMENTS RESTAURANTS', 'EVENEMENTS NATIONAL'].includes(g.name)
    : ['REALISE', 'EVENEMENTS RESTAURANTS', 'EVENEMENTS NATIONAL'].includes(g.name));
  const realiseColspan = realiseGroups.reduce((acc, g) => acc + g.colspan, 0);
  
  const otherGroups = groups.filter(g => !['CA', 'RESTAURANTS', 'LIMONADE', 'REALISE', 'CA HT', 'COUVERTS', 'EVENEMENTS RESTAURANTS', 'EVENEMENTS NATIONAL'].includes(g.name));

  // Colour palette used consistently in the header/footer
  const HEADER_BG     = '#1e293b';   // slate-800 — cohérent NAV
  const ACCENT_GOLD   = '#f59e0b';   // amber-500 — cohérent RecapAnnuel
  const ACCENT_GREEN  = '#10b981';   // emerald-500
  const SECTION_BLUE  = '#3b82f6';   // blue-500
  const SECTION_YELLOW= '#fff2cc';   // jaune pâle budget
  const SECTION_GREEN = '#e2efda';   // vert pâle gestion

  const thBase: React.CSSProperties = {
    position: 'sticky',
    borderTop: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1',
    borderLeft: '1px solid #cbd5e1', borderRight: '1px solid #cbd5e1',
    padding: isMobile ? '4px 6px' : '6px 8px', 
    fontSize: isMobile ? 8 : 10, 
    fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '.03em',
    textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.25,
  };

  const getBgColor = (bgClass: string) => {
    if (bgClass === 'bg-hatched') return '#e2e8f0';
    if (bgClass === 'bg-white') return '#ffffff';
    if (bgClass.startsWith('bg-[')) return bgClass.slice(4, -1);
    return bgClass;
  };

  const handleExport = async () => {
    const table = document.getElementById('dashboard-table') as HTMLTableElement | null;
    if (!table) return;
    const { Workbook } = await import('exceljs');
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Dashboard');
    table.querySelectorAll('tr').forEach(row => {
      worksheet.addRow(Array.from(row.querySelectorAll('th, td')).map(cell => cell.textContent || ''));
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Dashboard_${monthNames[month]}_${year}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    const element = document.getElementById('dashboard-content-area');
    if (!element) return;

    try {
      // Add a temporary class to optimize for printing if needed
      element.classList.add('pdf-exporting');
      
      const imgData = await domtoimage.toPng(element, {
        bgcolor: '#ffffff',
        quality: 1,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });
      
      element.classList.remove('pdf-exporting');

      // A4 dimensions in mm: 210 x 297
      // We'll use landscape mode since dashboards are wide
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Create a temporary image to get dimensions
      const img = new Image();
      img.src = imgData;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const imgWidth = img.width;
      const imgHeight = img.height;
      
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      
      const finalWidth = imgWidth * ratio;
      const finalHeight = imgHeight * ratio;
      
      // Center the image
      const x = (pdfWidth - finalWidth) / 2;
      const y = (pdfHeight - finalHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
      pdf.save(`Rapport_${monthNames[month]}_${year}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Une erreur est survenue lors de la génération du PDF.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rIdx: number, cIdx: number) => {
    let nextRow = rIdx;
    let nextCol = cIdx;
    let found = false;
    const MAX_ROWS = 200;
    const MAX_COLS = 100;

    switch (e.key) {
      case 'ArrowUp':
        while (nextRow > 0 && !found) {
          nextRow -= 1;
          if (document.querySelector(`input[data-row="${nextRow}"][data-col="${nextCol}"]`)) found = true;
        }
        break;
      case 'ArrowDown':
      case 'Enter':
        while (nextRow < MAX_ROWS && !found) {
          nextRow += 1;
          if (document.querySelector(`input[data-row="${nextRow}"][data-col="${nextCol}"]`)) found = true;
        }
        break;
      case 'ArrowLeft':
        while (nextCol > 0 && !found) {
          nextCol -= 1;
          if (document.querySelector(`input[data-row="${nextRow}"][data-col="${nextCol}"]`)) found = true;
        }
        break;
      case 'ArrowRight':
        while (nextCol < MAX_COLS && !found) {
          nextCol += 1;
          if (document.querySelector(`input[data-row="${nextRow}"][data-col="${nextCol}"]`)) found = true;
        }
        break;
      default:
        return; // Do nothing for other keys
    }

    if (found) {
      e.preventDefault();
      const nextInput = document.querySelector(`input[data-row="${nextRow}"][data-col="${nextCol}"]`) as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
        setTimeout(() => nextInput.select(), 0);
      }
    }
  };

  const chartDataCA = useMemo(() => {
    return rows.filter(r => r.type === 'day').map((r, i) => {
      return {
        name: r.dayIndex?.toString() || '',
        CA_Realise: parseMoneyValue(calculatedData[`${i}-24`]),
        CA_Budget: parseMoneyValue(calculatedData[`${i}-3`])
      };
    });
  }, [rows, calculatedData]);

  const chartDataFG = useMemo(() => {
    const fg = (b: number, g: number) => parseMoneyValue(calculatedData[`fg-total-${b}-${g}`]);
    
    return [
      { name: 'Entretien', value: fg(0,0) },
      { name: 'Ecolab', value: fg(0,1) },
      { name: 'Marketing', value: fg(0,2) },
      { name: 'Petit matériel', value: fg(1,0) },
      { name: 'HACCP', value: fg(1,1) },
      { name: 'Autres', value: fg(1,2) },
      { name: 'Tenue', value: fg(2,0) },
      { name: 'Bureau', value: fg(2,1) },
      { name: 'Énergie', value: fg(2,2) },
      { name: 'Animation', value: fg(3,0) },
      { name: 'Transport', value: fg(3,1) },
      { name: 'Divers', value: fg(3,2) }
    ].filter(item => item.value > 0);
  }, [calculatedData]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57', '#ffc0cb', '#f4a460'];

  return (
    <div style={{ height: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex', overflow: 'hidden', position: 'relative' }} onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap'); 
        *{box-sizing:border-box} 
        button{outline:none} 
        .rr:hover td{background:#eff6ff!important}
        @media (max-width: 1024px) {
          .mobile-sidebar-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 95;
          }
        }
      `}</style>

      {isMobile && isSidebarOpen && (
        <div className="mobile-sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
      )}

      {dragState && <style>{`* { cursor: crosshair !important; user-select: none; }`}</style>}
      {/* Left Sidebar for Months */}
      <DashboardSidebar
        isMobile={isMobile}
        isSidebarOpen={isSidebarOpen}
        sidebarTheme={sidebarTheme}
        year={year}
        month={month}
        monthNames={monthNames}
        onBack={onBack}
        setMonth={setMonth}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f8fafc' }}>
        
        {/* Top Header for Sections */}
        <DashboardHeader
          isMobile={isMobile}
          onBack={onBack}
          sidebarThemeWide={sidebarThemeWide}
          weatherTheme={weatherTheme}
          weatherThemeHover={weatherThemeHover}
          actionTileStyle={actionTileStyle}
          tableViewMode={tableViewMode}
          setTableViewMode={setTableViewMode}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          monthNames={monthNames}
          month={month}
          year={year}
          selectedDayLabel={selectedDayLabel}
          isDatePickerOpen={isDatePickerOpen}
          setIsDatePickerOpen={setIsDatePickerOpen}
          datePickerRef={datePickerRef}
          renderDatePicker={renderDatePicker}
          setIsImportModalOpen={setIsImportModalOpen}
          openDailyRecapPreview={openDailyRecapPreview}
          dailyRecapStatus={dailyRecapStatus}
          handleExportPDF={handleExportPDF}
          handleExport={handleExport}
          handleTemporaryResetLocalData={handleTemporaryResetLocalData}
        />

        {/* Table Area */}
        <div id="dashboard-content-area" style={{ flex: 1, overflow: 'auto', padding: tableViewMode === 'SAISIE' ? (isMobile ? 12 : '16px 24px 28px') : (isMobile ? 12 : 32), display: 'flex', flexDirection: 'column' }}>
          {tableViewMode === 'SAISIE' ? (
            renderDailyEntryView()
          ) : tableViewMode === 'ANALYSE' ? (
            React.createElement(DashboardAnalysisView, { rows, calculatedData, salariesConfig: globalData[month]?.salariesConfig?.categories, isMobile })
          ) : (
          <div style={{ flex: 1, background: '#fff', borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflow: 'auto' }}>
                <table id="dashboard-table" style={{ borderCollapse: 'separate', borderSpacing: 0, width: 'max-content', minWidth: '100%' }}>
                <DashboardTableHeader
                  visibleColumns={visibleColumns}
                  groups={groups}
                  subGroups={subGroups}
                  isEndOfMajorSection={isEndOfMajorSection}
                  isEndOfSection={isEndOfSection}
                  getBgColor={getBgColor}
                  thBase={thBase}
                  activeTab={activeTab}
                  tableViewMode={tableViewMode}
                  isMobile={isMobile}
                  previsionsColspan={previsionsColspan}
                  realiseColspan={realiseColspan}
                  otherGroups={otherGroups}
                  updatePurchaseSupplierName={updatePurchaseSupplierName}
                />
                <DashboardTableBody
                  rows={rows}
                  visibleColumns={visibleColumns}
                  calculatedData={calculatedData}
                  cellData={cellData}
                  activeTab={activeTab}
                  todayMarker={todayMarker}
                  isEndOfMajorSection={isEndOfMajorSection}
                  isEndOfSection={isEndOfSection}
                  handleCellChange={handleCellChange}
                  handleKeyDown={handleKeyDown}
                  handleDragStart={handleDragStart}
                  handleDragMove={handleDragMove}
                  dragState={dragState}
                  focusedCell={focusedCell}
                  setFocusedCell={setFocusedCell}
                  month={month}
                  updateDashboard={updateDashboard}
                  fgBoxNames={fgBoxNames}
                  ACCENT_GOLD={ACCENT_GOLD}
                  HEADER_BG={HEADER_BG}
                />
        </table>
            </div>
          </div>
          )}
        </div>
      </main>

      {/* Daily Recap Mail Modal */}
      {isDailyRecapModalOpen && (
        <DashboardDailyRecapModal
          isMobile={isMobile}
          setIsDailyRecapModalOpen={setIsDailyRecapModalOpen}
          recapPreviewRef={recapPreviewRef}
          dailyRecapManagers={dailyRecapManagers}
          setDailyRecapManagers={setDailyRecapManagers}
          dailyRecapServiceComments={dailyRecapServiceComments}
          setDailyRecapServiceComments={setDailyRecapServiceComments}
          dailyRecapGoogleRatings={dailyRecapGoogleRatings}
          setDailyRecapGoogleRatings={setDailyRecapGoogleRatings}
          buildDailyRecapHtml={buildDailyRecapHtml}
          handleValidateDailyRecapMail={handleValidateDailyRecapMail}
        />
      )}
      {/* Import Modal */}
      {isImportModalOpen && (
        <DashboardImportModal
          isMobile={isMobile}
          setIsImportModalOpen={setIsImportModalOpen}
          monthNames={monthNames}
          dynamicColumns={dynamicColumns}
          formatImportedIntegerLabel={formatImportedIntegerLabel}
          formatImportedCurrencyLabel={formatImportedCurrencyLabel}
          handleDailyRealiseImport={handleDailyRealiseImport}
          caisseImportPreviews={caisseImportPreviews}
          updateCaisseImportPreview={updateCaisseImportPreview}
          applyCaisseImport={applyCaisseImport}
          handleInvoiceImport={handleInvoiceImport}
          invoiceImportStatus={invoiceImportStatus}
          invoiceImportPreviews={invoiceImportPreviews}
          updateInvoiceImportPreview={updateInvoiceImportPreview}
          applyInvoiceImport={applyInvoiceImport}
          handleSalaryPayrollImport={handleSalaryPayrollImport}
          salaryImportStatus={salaryImportStatus}
          handleHistoricalBudgetExcelImport={handleHistoricalBudgetExcelImport}
          historicalBudgetStatus={historicalBudgetStatus}
          historicalBudgetPreviews={historicalBudgetPreviews}
          setHistoricalBudgetPreviews={setHistoricalBudgetPreviews}
          applyHistoricalBudgetExcelImport={applyHistoricalBudgetExcelImport}
          handleHistoricalV25ExcelImport={handleHistoricalV25ExcelImport}
          historicalV25Status={historicalV25Status}
          historicalV25Previews={historicalV25Previews}
          setHistoricalV25Previews={setHistoricalV25Previews}
          applyHistoricalV25ExcelImport={applyHistoricalV25ExcelImport}
          year={year}
          importStatus={importStatus}
          importPreview={importPreview}
        />
      )}
    </div>
  );
}
