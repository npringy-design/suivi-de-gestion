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
import { dashboardColumns as C } from '@/features/dashboard/dashboardColumns';
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
  const dynamicColumns = useMemo(() => {
    const cols = [...C];
    const salariesConfig = globalData[month]?.salariesConfig?.categories;
    if (salariesConfig) {
      // Update FRAIS DE PERSONNEL PROJECTION headers
      const updateHeader = (idx: number, category: string, label: string, department?: 'cuisine' | 'salle') => {
        const rows = salariesConfig[category] || [];
        const avg = averagePayrollRate(rows, department, category);
        const names = rows
          .filter((row: SalarieRow) => !department || !row.department || row.department === department)
          .map((row: SalarieRow) => String(row.nom || '').trim())
          .filter(Boolean);
        const namesStr = '';
        const avgStr = avg > 0 ? `\n${avg.toFixed(2).replace('.', ',')} €` : '';
        cols[idx] = [...cols[idx]];
        cols[idx][1] = idx >= 77 ? 'FRAIS PERSONNEL REALISE' : 'PROJECTION S/C';
        cols[idx][2] = `${label}${namesStr}${avgStr}`;
      };

      updateHeader(62, 'cadre', 'CADRE\nCUISINE', 'cuisine');
      updateHeader(63, 'cadre', 'CADRE\nSALLE', 'salle');
      updateHeader(64, 'maitrise', 'MAITRISE\nCUISINE', 'cuisine');
      updateHeader(65, 'maitrise', 'MAITRISE\nSALLE', 'salle');
      updateHeader(66, 'niv12', 'NIV I ET II\nCUISINE', 'cuisine');
      updateHeader(67, 'niv12', 'NIV I ET II\nSALLE', 'salle');
      updateHeader(68, 'niv3', 'NIV III\nCUISINE', 'cuisine');
      updateHeader(69, 'niv3', 'NIV III\nSALLE', 'salle');
      updateHeader(70, 'apprenti', 'APPRENTI\nCUISINE', 'cuisine');
      updateHeader(71, 'apprenti', 'APPRENTI\nSALLE', 'salle');
      updateHeader(77, 'cadre', 'CADRE\nCUISINE', 'cuisine');
      updateHeader(78, 'cadre', 'CADRE\nSALLE', 'salle');
      updateHeader(79, 'maitrise', 'MAITRISE\nCUISINE', 'cuisine');
      updateHeader(80, 'maitrise', 'MAITRISE\nSALLE', 'salle');
      updateHeader(81, 'niv12', 'NIV I ET II\nCUISINE', 'cuisine');
      updateHeader(82, 'niv12', 'NIV I ET II\nSALLE', 'salle');
      updateHeader(83, 'niv3', 'NIV III\nCUISINE', 'cuisine');
      updateHeader(84, 'niv3', 'NIV III\nSALLE', 'salle');
      updateHeader(85, 'apprenti', 'APPRENTI\nCUISINE', 'cuisine');
      updateHeader(86, 'apprenti', 'APPRENTI\nSALLE', 'salle');
    }
    Object.entries(purchaseSupplierNames).forEach(([col, name]) => {
      const colIndex = Number(col);
      if (colIndex >= 45 && colIndex <= 57 && name.trim()) {
        cols[colIndex] = [...cols[colIndex]];
        cols[colIndex][2] = name.trim();
      }
    });
    return cols;
  }, [C, globalData, month, purchaseSupplierNames]);

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
  const calculatedData = useMemo(
    () => computeDashboardData(cellData, rows, dynamicColumns, globalData[month]?.salariesConfig?.categories),
    [cellData, globalData[month]?.salariesConfig],
  );

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
    const visibleColumnsWithoutLimonade = baseVisibleColumns.filter(col => {
      const text = [col[0], col[1], col[2]].join(' ').toUpperCase();
      return !thilloisNoLimonadeColumns.has(col.originalIndex) && !text.includes('LIMONADE');
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
    setImportStatus,
    setImportPreview,
    setCaisseImportPreviews,
    setInvoiceImportPreviews,
    setInvoiceImportStatus,
    setHistoricalBudgetPreviews,
    setHistoricalBudgetStatus,
    setSalaryImportStatus,
    handleCellChange,
    updateDashboard,
    updateTheorique,
    updateBilanSynthese,
    updateSalariesConfig,
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
                <thead>
            {/* ── ROW 1 : super-sections ── */}
            <tr style={{ height: 30 }}>
              <th rowSpan={4} style={{ ...thBase, background: '#1e293b', color: '#fff', minWidth: isMobile ? 120 : 160, left: 0, top: 0, zIndex: 60, borderRight: '2px solid #475569', borderBottom: '3px solid #374151', padding: isMobile ? '8px 6px' : '16px 12px', verticalAlign: 'middle' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, height: '100%' }}>
                  <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '0.15em', color: '#f8fafc' }}>DATE</span>
                  <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 8, padding: '8px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: '100%', boxSizing: 'border-box' }}>
                    <span style={{ fontSize: 10, color: '#cbd5e1', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Buro Monte</span>
                    <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 800, whiteSpace: 'nowrap' }}>CA N-1 : 159 802 €</span>
                  </div>
                </div>
              </th>
              {previsionsColspan > 0 && (
                <th colSpan={previsionsColspan} style={{ ...thBase, background: '#92400e', color: '#fff', top: 0, height: 30, zIndex: 40, borderRight: '3px solid #475569', borderBottom: '2px solid #94a3b8' }}>
                  PRÉVISIONS
                </th>
              )}
              {realiseColspan > 0 && (
                <th colSpan={realiseColspan} style={{ ...thBase, background: '#1e40af', color: '#fff', top: 0, height: 30, zIndex: 40, borderRight: '3px solid #475569', borderBottom: '2px solid #94a3b8' }}>
                  {activeTab === 'REALISE' && tableViewMode === 'COMPLET' ? 'RÉALISÉ' : 'RÉALISÉ & ÉVÉNEMENTS'}
                </th>
              )}
              {otherGroups.reduce((a, g) => a + g.colspan, 0) > 0 && (
                <th colSpan={otherGroups.reduce((a, g) => a + g.colspan, 0)} style={{ ...thBase, background: '#166534', color: '#fff', top: 0, height: 30, zIndex: 40, borderRight: '1px solid #cbd5e1', borderBottom: '2px solid #94a3b8' }}>
                  GESTION &amp; AUTRES
                </th>
              )}
            </tr>

            {/* ── ROW 2 : groupes ── */}
            <tr style={{ height: 30 }}>
              {groups.map((g, i) => {
                const isEvt = g.name === 'EVENEMENTS RESTAURANTS' || g.name === 'EVENEMENTS NATIONAL';
                let colCount = 0;
                for (let j = 0; j <= i; j++) colCount += groups[j].colspan;
                const isMajorEnd = isEndOfMajorSection[colCount - 1];
                
                return (
                  <th key={`g-${i}`} colSpan={g.colspan} style={{ ...thBase, background: getBgColor(g.bg), color: '#1e293b', top: 30, height: 30, fontSize: 9, zIndex: 40, borderRight: isMajorEnd ? '3px solid #475569' : '2px solid #94a3b8', borderBottom: '1px solid #94a3b8' }}>
                    {!isEvt ? g.name : ''}
                  </th>
                );
              })}
            </tr>

            {/* ── ROW 3 : sous-groupes ── */}
            <tr style={{ height: 30 }}>
              {subGroups.map((sg, i) => {
                const isEvt = sg.name === 'EVENEMENTS RESTAURANTS' || sg.name === 'EVENEMENTS NATIONAL';
                let colCount = 0;
                for (let j = 0; j <= i; j++) colCount += subGroups[j].colspan;
                const isMajorEnd = isEndOfMajorSection[colCount - 1];

                return (
                  <th key={`sg-${i}`} colSpan={sg.colspan} style={{ ...thBase, background: getBgColor(sg.bg), color: '#374151', top: 60, height: 30, fontSize: 9, zIndex: 40, borderRight: isMajorEnd ? '3px solid #475569' : '2px solid #94a3b8', borderBottom: '1px solid #94a3b8' }}>
                    {!isEvt ? sg.name : ''}
                  </th>
                );
              })}
            </tr>

            {/* ── ROW 4 : colonnes ── */}
            <tr style={{ height: 60 }}>
              {visibleColumns.map((c, i) => {
                const isEvt = c[0] === 'EVENEMENTS RESTAURANTS' || c[0] === 'EVENEMENTS NATIONAL';
                const isMajorEnd = isEndOfMajorSection[i];
                const isSectionEnd = isEndOfSection[i];

                const isRmLabel = c[0] === 'RESULTATS MENSUEL HT' && c[2] === 'Indicateur';
                const isRmValue = c[0] === 'RESULTATS MENSUEL HT' && c[2] === 'Valeur';
                const isEditableSupplierHeader = tableViewMode === 'COMPLET' && c.originalIndex >= 45 && c.originalIndex <= 57;
                const minW = isRmLabel ? 180 : isRmValue ? 100 : 65;

                return (
                  <th key={`c-${i}`} style={{ ...thBase, background: getBgColor(c[3]), color: '#374151', top: 90, height: 60, minWidth: minW, fontSize: 9, zIndex: 40, borderRight: isMajorEnd ? '3px solid #475569' : isSectionEnd ? '2px solid #94a3b8' : '1px solid #cbd5e1', borderBottom: '3px solid #374151' }}>
                    {isEditableSupplierHeader ? (
                      <input
                        value={c[2]}
                        onChange={event => updatePurchaseSupplierName(c.originalIndex, event.target.value)}
                        onClick={event => event.stopPropagation()}
                        title="Modifier le nom du fournisseur"
                        style={{
                          width: '100%',
                          minWidth: 74,
                          height: 42,
                          border: '1px solid #94a3b8',
                          borderRadius: 6,
                          background: '#fff',
                          color: '#0f172a',
                          fontSize: 9,
                          fontWeight: 900,
                          textAlign: 'center',
                          padding: '3px 5px',
                          outline: 'none',
                          textTransform: 'uppercase',
                        }}
                      />
                    ) : (
                      isEvt ? c[0] : c[2]
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => {
              const isTotalRow = row.type === 'total';
              const isMonthTotal = row.type === 'month_total';
              const isFgBox4Total = row.type === 'fg_box4_total';
              const isTodayRow = row.type === 'day'
                && row.dateObj?.getFullYear() === todayMarker.year
                && row.dateObj?.getMonth() === todayMarker.month
                && row.dateObj?.getDate() === todayMarker.day;

              // Ligne dédiée au total du box 4 FG — rendu spécial sans aucune bordure épaisse
              if (isFgBox4Total) {
                if (activeTab !== 'FRAIS_GENERAUX') return null;
                const fraisGenerauxStartIdx = visibleColumns.findIndex(col => col[0] === 'FRAIS GENERAUX');
                const fraisGenerauxEndIdx = visibleColumns.map(col => col[0]).lastIndexOf('FRAIS GENERAUX');
                const monthTotalIdx = rows.findIndex(r => r.type === 'month_total');
                return (
                  <tr key={`r-${rIdx}`}>
                    {/* Cellule date sticky — vide, fond blanc, bordure fine */}
                    <td className="sticky left-0 z-30 bg-[#ffffff] border-r-[2px] border-r-slate-600 border-b border-b-slate-200 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)]"/>
                    {visibleColumns.map((c, cIdx) => {
                      const isFraisGeneraux = c[0] === 'FRAIS GENERAUX';
                      if (!isFraisGeneraux) {
                        // Colonne non-FG : cellule vide avec bordures fines normales
                        const isMajorEnd = isEndOfMajorSection[cIdx];
                        const isSectEnd = isEndOfSection[cIdx];
                        const bR = isMajorEnd ? 'border-r-[3px] border-r-slate-600' : isSectEnd ? 'border-r-[2px] border-r-slate-400' : 'border-r border-r-slate-200';
                        return <td key={`c-${rIdx}-${cIdx}`} className={`bg-white border-b border-b-slate-200 ${bR}`}/>;
                      }
                      // Colonne FG : déléguer au getFgBoxLayout
                      const colGroup = Math.floor((cIdx - fraisGenerauxStartIdx) / 4);
                      const colIndexInGroup = (cIdx - fraisGenerauxStartIdx) % 4;
                      if (colIndexInGroup === 0) {
                        const totalVal = calculatedData[`fg-total-3-${colGroup}`] || '0,00 €';
                        const bR = 'border-r-[2px] border-r-slate-500';
                        return (
                          <td key={`c-${rIdx}-${cIdx}`} colSpan={4}
                            className={`px-3 py-1.5 border-b border-b-slate-300 ${bR}`}
                            style={{ background: ACCENT_GOLD + '44', color: HEADER_BG }}>
                            <div className="flex justify-between font-black text-[10px] uppercase tracking-widest">
                              <span>TOTAL</span>
                              <span>{totalVal}</span>
                            </div>
                          </td>
                        );
                      }
                      return null;
                    })}
                  </tr>
                );
              }
              
              let rowClasses = 'transition-colors hover:bg-blue-50/30';
              if (isTotalRow) rowClasses = 'font-bold bg-slate-100 hover:bg-slate-200/80';
              if (isMonthTotal) rowClasses = 'font-bold bg-amber-50 hover:bg-amber-100/80';
              if (isTodayRow) rowClasses = 'transition-colors bg-blue-50 hover:bg-blue-100/70';

              let rowBorderClasses = '';
              if (isTotalRow) rowBorderClasses = 'border-y-2 border-y-slate-400';
              if (isMonthTotal) rowBorderClasses = 'border-y-2 border-y-amber-500';
              if (isTodayRow) rowBorderClasses = 'border-y-2 border-y-blue-300';

              let dateCellBg = 'bg-[#ffffff] text-slate-600';
              if (isTotalRow) dateCellBg = 'bg-[#f1f5f9] text-slate-800 font-bold';
              else if (isMonthTotal) dateCellBg = 'bg-[#fffbeb] text-amber-900 font-bold';
              else if (isTodayRow) dateCellBg = 'bg-blue-600 text-white font-black';
              else if (row.isPublicHoliday) dateCellBg = 'bg-red-100 text-red-800 font-bold';
              else if (row.isCustomEvent) dateCellBg = 'bg-green-200 text-green-900 font-bold';
              else if (row.isSchoolHoliday) dateCellBg = 'bg-blue-200 text-blue-900 font-bold';
              else if (row.isWeekend) dateCellBg = 'bg-[#f8fafc] text-slate-400 italic';

              return (
                <tr key={`r-${rIdx}`} className={rowClasses}>
                  <td className={[
                    'sticky left-0 z-30 px-3 py-1.5 text-right font-medium whitespace-nowrap',
                    'border-r-[2px] border-r-slate-600',
                    'border-b border-b-slate-100',
                    'shadow-[2px_0_4px_-1px_rgba(0,0,0,0.08)] text-[10px]',
                    rowBorderClasses,
                    dateCellBg
                  ].join(' ')}>
                    {isTodayRow ? `${row.label} - aujourd'hui` : row.label}
                  </td>

                  {visibleColumns.map((c, cIdx) => {
                    const originalCIdx = c.originalIndex;
                    const isHatched = c[3] === 'bg-hatched';
                    let cellBg = isHatched ? 'bg-[url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiAvPgo8cGF0aCBkPSJNMCAwTDggOFpNOCAwTDAgOFoiIHN0cm9rZT0iI2UyZThmMCIgc3Ryb2tlLXdpZHRoPSIxIiAvPgo8L3N2Zz4=")]' : c[3];
                    
                    const isFraisGeneraux = c[0] === 'FRAIS GENERAUX';
                    const fraisGenerauxStartIdx = visibleColumns.findIndex(col => col[0] === 'FRAIS GENERAUX');
                    const fraisGenerauxEndIdx = visibleColumns.map(col => col[0]).lastIndexOf('FRAIS GENERAUX');

                    if (isTotalRow && !isHatched && !isFraisGeneraux) cellBg = 'bg-transparent';
                    if (isTotalRow && !isHatched && isFraisGeneraux) cellBg = 'bg-white ' + cellBg;
                    if (isMonthTotal && !isHatched) cellBg = 'bg-transparent';

                    const cellKey = `${rIdx}-${originalCIdx}`;
                    const val = calculatedData[cellKey] || '';
                    const displayVal = formatValue(val, [c[0], c[1], c[2], c[3]], originalCIdx);
                    const isFocused = focusedCell === cellKey;
                    
                    const isEditableCol = editableCols.includes(originalCIdx) || c[0] === 'FRAIS GENERAUX' || c[0] === 'CONTRAT MENSUALISES';
                    const isReadOnly = isTotalRow || isMonthTotal || !isEditableCol;

                    const isMajorEndCell = isEndOfMajorSection[cIdx];
                    const isSectionEndCell = isEndOfSection[cIdx];
                    let cellBorderClasses = 'border-b border-b-slate-200';
                    if (isMajorEndCell)      cellBorderClasses += ' border-r-[3px] border-r-slate-600';
                    else if (isSectionEndCell) cellBorderClasses += ' border-r-[2px] border-r-slate-400';
                    else                      cellBorderClasses += ' border-r border-r-slate-200';
                    
                    if (isTotalRow)    cellBorderClasses += ' border-y-2 border-y-slate-400';
                    if (isMonthTotal) cellBorderClasses += ' border-y-2 border-y-amber-500';

                    let textColorClass = isMonthTotal ? 'text-amber-900' : 'text-slate-800';
                    const isVarianceCol = c[1].includes('ECART') || c[2].includes('ECART') || [22, 31, 33, 117, 122].includes(originalCIdx);
                    if ((c[2] === 'ECART AU\nBUDGET\nJOUR' || isVarianceCol) && val !== '') {
                      const numVal = parseMoneyValue(val);
                      if (numVal > 0) {
                        textColorClass = 'text-emerald-800 font-bold';
                        if (!isHatched && !isTotalRow && !isMonthTotal) cellBg = 'bg-emerald-50';
                      } else if (numVal < 0) {
                        textColorClass = 'text-red-800 font-bold';
                        if (!isHatched && !isTotalRow && !isMonthTotal) cellBg = 'bg-red-50';
                      }
                    }

                    if (isFraisGeneraux) {
                      // Sur la ligne TOTAL mensuel : afficher le total global FG sur toute la largeur FG
                      if (isMonthTotal) {
                        const fgColSpan = fraisGenerauxEndIdx - fraisGenerauxStartIdx + 1;
                        if (cIdx === fraisGenerauxStartIdx) {
                          const totalVal = calculatedData[`${rIdx}-fraisGenerauxTotal`] || '0,00 €';
                          return (
                            <td key={`c-${rIdx}-${cIdx}`} colSpan={fgColSpan}
                              className="text-center font-black text-sm py-2 px-4 uppercase tracking-widest border-y-2 border-y-amber-500 border-r-[3px] border-r-slate-600"
                              style={{ background: ACCENT_GOLD, color: HEADER_BG }}>
                              TOTAL FRAIS GÉNÉRAUX : {totalVal}
                            </td>
                          );
                        }
                        // Les colonnes FG suivantes sont absorbées par le colSpan ci-dessus
                        return null;
                      }

                      const monthTotalIdx = rows.findIndex(r => r.type === 'month_total');
                      const fgLayout = getFgBoxLayout(rIdx, monthTotalIdx);
                      
                      if (fgLayout) {
                        const colGroup = Math.floor((cIdx - fraisGenerauxStartIdx) / 4);
                        const colIndexInGroup = (cIdx - fraisGenerauxStartIdx) % 4;
                        const boxName = fgBoxNames[fgLayout.box][colGroup];

                        if (fgLayout.type === 'header') {
                          if (colIndexInGroup === 0) {
                            const bR = 'border-r-[2px] border-r-slate-400';
                            return (
                              <td key={`c-${rIdx}-${cIdx}`} colSpan={4} className={`px-2 py-1.5 text-center font-bold text-[10px] uppercase tracking-wider bg-[#dce6f0] text-slate-800 border-b border-b-slate-300 ${bR}`}>
                                {boxName}
                              </td>
                            );
                          }
                          return null;
                        }

                        if (fgLayout.type === 'subheader') {
                          const subHeaders = ['DATE', 'FOURNISSEUR', 'MOTIF ACHAT', 'MONTANT HT'];
                          const fgSubBorder = `border-b border-b-slate-300 ${colIndexInGroup === 3 ? 'border-r-[2px] border-r-slate-400' : 'border-r border-r-slate-200'}`;
                          return (
                            <td key={`c-${rIdx}-${cIdx}`} className={`px-1 py-1 text-center font-bold text-[9px] bg-[#e9eef7] text-slate-700 ${fgSubBorder}`}>
                              {subHeaders[colIndexInGroup]}
                            </td>
                          );
                        }

                        if (fgLayout.type === 'total') {
                          if (colIndexInGroup === 0) {
                            const totalVal = calculatedData[`fg-total-${fgLayout.box}-${colGroup}`] || '0,00 €';
                            const bR = 'border-r-[2px] border-r-slate-400';
                            return (
                              <td key={`c-${rIdx}-${cIdx}`} colSpan={4}
                                className={`px-3 py-1.5 border-b border-b-slate-300 ${bR}`}
                                style={{ background: '#fef3c7', color: '#1e293b' }}>
                                <div className="flex justify-between font-black text-[10px] uppercase tracking-widest">
                                  <span>TOTAL</span>
                                  <span>{totalVal}</span>
                                </div>
                              </td>
                            );
                          }
                          return null;
                        }

                        // data cell inside frais généraux
                        const fgCellKey = `fg-data-${fgLayout.box}-${colGroup}-${fgLayout.dataIdx}-${colIndexInGroup}`;
                        const fgVal = cellData[fgCellKey] || '';
                        const isFgFocused = focusedCell === fgCellKey;
                        // Bordure droite : épaisse après la dernière colonne de chaque groupe (MONTANT HT), fine sinon
                        const fgCellBorder = `border-b border-b-slate-200 ${colIndexInGroup === 3 ? 'border-r-[2px] border-r-slate-400' : 'border-r border-r-slate-200'}`;
                        return (
                          <td key={`c-${rIdx}-${cIdx}`} className={`p-0 bg-white ${fgCellBorder} relative text-center`}>
                            <DebouncedInput
                              dataRow={rIdx}
                              dataCol={cIdx}
                              value={isFgFocused ? fgVal : (colIndexInGroup === 3 && fgVal ? formatValue(fgVal, ['FRAIS GENERAUX', '', 'MONTANT HT']) : fgVal)}
                              onChange={value => {
                                const nextValue = String(value);
                                if (colIndexInGroup === 3) {
                                  const cleanValue = nextValue.replace(/[^0-9.,-]/g, '').replace(',', '.');
                                  updateDashboard(month, fgCellKey, cleanValue);
                                } else {
                                  updateDashboard(month, fgCellKey, nextValue);
                                }
                              }}
                              onFocus={() => setFocusedCell(fgCellKey)}
                              onBlur={() => setFocusedCell(null)}
                              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e, rIdx, cIdx)}
                              className="w-full h-full min-h-[26px] bg-transparent outline-none px-1 text-center font-medium focus:bg-blue-50 focus:ring-1 focus:ring-indigo-400 focus:z-10 relative cursor-text text-[10px] text-slate-700 placeholder-slate-300 transition-all"
                              placeholder=""
                            />
                          </td>
                        );
                      }
                    }

                    // ── RESULTATS MENSUEL HT ─────────────────────────────────────
                    if (c[0] === 'RESULTATS MENSUEL HT') {
                      const isLabelCol = c[2] === 'Indicateur';
                      const isValueCol = c[2] === 'Valeur';
                      const rightBorder = isValueCol ? 'border-r-[3px] border-r-slate-600' : 'border-r border-r-slate-300';

                      // Structure complète : chaque rIdx mappe sur une ligne définie
                      type RmRowType = { type: string; label?: string; key?: string; style?: string };
                      const rmDef: RmRowType[] = [
                        // CA (lignes 0-8)
                        { type: 'section', label: 'CA' },
                        { type: 'data', label: 'CA HT RÉALISÉ',          key: 'ca_realise',    style: 'red' },
                        { type: 'data', label: 'CA BUDGET',              key: 'ca_budget',     style: 'normal' },
                        { type: 'data', label: 'VAR % N-1',              key: 'var_n1',        style: 'normal' },
                        { type: 'spacer' },
                        { type: 'data', label: 'DIFFÉRENCE N-1',         key: 'diff_n1',       style: 'normal' },
                        { type: 'data', label: 'DIFFÉRENCE BUDGET',      key: 'diff_budget',   style: 'normal' },
                        { type: 'spacer' },
                        // COUVERTS (lignes 8-16)
                        { type: 'section', label: 'COUVERTS' },
                        { type: 'data', label: 'COUVERTS RESTAURANT MOIS',          key: 'cvts_resto',     style: 'normal' },
                        { type: 'data', label: 'MOYENNE COUVERTS JOURS RESTAURANT', key: 'moy_cvts_resto', style: 'normal' },
                        { type: 'data', label: 'TM RESTAURANT MOIS',                key: 'tm_resto',       style: 'normal' },
                        { type: 'data', label: 'COUVERTS LIMONADE MOIS',            key: 'cvts_limo',      style: 'normal' },
                        { type: 'data', label: 'MOYENNE COUVERTS JOURS LIMONADE',   key: 'moy_cvts_limo',  style: 'normal' },
                        { type: 'data', label: 'TM LIMONADE MOIS',                  key: 'tm_limo',        style: 'normal' },
                        { type: 'spacer' },
                        // MARGE (lignes 16-31)
                        { type: 'section', label: 'MARGE' },
                        { type: 'data',   label: 'STOCK INITIAL',              key: 'rm_stock_init',  style: 'normal' },
                        { type: 'edit',   label: 'STOCK FINAL',                key: 'rm_stock_final', style: 'normal' },
                        { type: 'data',   label: 'VARIATION DE STOCK',         key: 'var_stock',      style: 'normal' },
                        { type: 'spacer' },
                        { type: 'data',   label: 'TOTAL ACHAT HORS METRO',     key: 'rm_achat_hm',    style: 'normal' },
                        { type: 'data',   label: 'TOTAL ACHAT',                key: 'rm_achat_total', style: 'normal' },
                        { type: 'spacer' },
                        { type: 'data',   label: 'RATIO FOOD OBJECTIF',        key: 'ratio_obj',      style: 'normal' },
                        { type: 'data',   label: 'CONSOMMATION OBJECTIF',      key: 'conso_obj',      style: 'normal' },
                        { type: 'data',   label: 'RATIO RÉEL',                 key: 'ratio_reel',     style: 'red' },
                        { type: 'data',   label: 'MARGE RÉEL',                 key: 'marge_reel',     style: 'red' },
                        { type: 'data',   label: 'CONSOMMATION RÉEL',          key: 'conso_reel',     style: 'red' },
                        { type: 'data',   label: 'ÉCART RATIO VS OBJECTIF',    key: 'ecart_ratio',    style: 'normal' },
                        { type: 'data',   label: 'ÉCART CONSOMMATION VS OBJECTIF', key: 'ecart_conso', style: 'normal' },
                        { type: 'spacer' },
                        // S/C (lignes 32-42)
                        { type: 'section', label: 'S/C' },
                        { type: 'data',   label: 'NB HEURES BUDGET',        key: 'nb_h_budget',  style: 'normal' },
                        { type: 'data',   label: 'S/C OBJECTIF',            key: 'sc_obj',       style: 'normal' },
                        { type: 'data',   label: 'PRODUCTIVITÉ BUDGET',     key: 'prod_budget',  style: 'normal' },
                        { type: 'spacer' },
                        { type: 'data',   label: 'NB HEURE RÉEL',           key: 'nb_h_reel',    style: 'red' },
                        { type: 'data',   label: 'ÉCART VS BUDGET',         key: 'ecart_h',      style: 'normal' },
                        { type: 'data',   label: 'S/C RÉEL',                key: 'sc_reel',      style: 'normal' },
                        { type: 'data',   label: 'ÉCART S/C VS BUDGET',     key: 'ecart_sc',     style: 'normal' },
                        { type: 'data',   label: 'PROD RÉEL',               key: 'prod_reel',    style: 'red' },
                        { type: 'spacer' },
                        // FRAIS GÉNÉRAUX (lignes 43+)
                        { type: 'section', label: 'FRAIS GÉNÉRAUX RÉALISÉ' },
                        { type: 'data',   label: 'Entretien et réparations',   key: 'fg_0',  style: 'normal' },
                        { type: 'data',   label: 'Petit matériel et vaisselle', key: 'fg_1', style: 'normal' },
                        { type: 'data',   label: 'Tenue du personnel',          key: 'fg_2', style: 'normal' },
                        { type: 'data',   label: 'Animation',                   key: 'fg_3', style: 'normal' },
                        { type: 'spacer' },
                        { type: 'data',   label: 'Ecolab / Diversey',           key: 'fg_4', style: 'normal' },
                        { type: 'data',   label: 'Marketing local',             key: 'fg_5', style: 'normal' },
                        { type: 'data',   label: 'HACCP Divers',                key: 'fg_6', style: 'normal' },
                        { type: 'data',   label: 'Matériel de bureau',          key: 'fg_7', style: 'normal' },
                        { type: 'data',   label: 'Énergie',                     key: 'fg_8', style: 'normal' },
                        { type: 'data',   label: 'Frais de transport',          key: 'fg_9', style: 'normal' },
                        { type: 'data',   label: 'Autres frais',                key: 'fg_10', style: 'normal' },
                        { type: 'data',   label: 'Divers',                      key: 'fg_11', style: 'normal' },
                      ];

                      const rmRow = rmDef[rIdx] as RmRowType | undefined;
                      if (!rmRow) {
                        return <td key={`c-${rIdx}-${cIdx}`} className={`border-b border-b-slate-100 bg-[#fffdf5] ${rightBorder}`} />;
                      }

                      // Calculs
                      const mtIdx = rows.findIndex(r => r.type === 'month_total');
                      const CA_BUDGET = 107967;
                      const CA_N1 = 159802;
                      const fg = (b: number, g: number) => parseMoneyValue(calculatedData[`fg-total-${b}-${g}`]);
                      const caR  = parseMoneyValue(calculatedData[`${mtIdx}-24`]);
                      const cvtsMidi = parseMoneyValue(calculatedData[`${mtIdx}-6`]);
                      const cvtsSoir = parseMoneyValue(calculatedData[`${mtIdx}-8`]);
                      const cvtsResto = cvtsMidi + cvtsSoir;
                      const cvtsLimo  = parseMoneyValue(calculatedData[`${mtIdx}-14`]);
                      const caLimo    = parseMoneyValue(calculatedData[`${mtIdx}-2`]);
                      const wDays = rows.filter(r => r.type === 'day' && !r.isWeekend).length;
                      const stockInit  = parseMoneyValue(cellData['rm_stock_init']);
                      const stockFinal = parseMoneyValue(cellData['rm_stock_final']);
                      const varStock   = stockFinal - stockInit;
                      const achatHM    = parseMoneyValue(cellData['rm_achat_hm']);
                      const achatTotal = parseMoneyValue(cellData['rm_achat_total']);
                      const ratioObj   = 24.50;
                      const consoObj   = caR * (ratioObj / 100);
                      const consoReel  = achatTotal + varStock;
                      const ratioReel  = caR > 0 ? (consoReel / caR) * 100 : 0;
                      const margeReel  = caR - consoReel;
                      const nbHBudget  = parseMoneyValue(calculatedData[`${mtIdx}-61`]);
                      const coutProj   = parseMoneyValue(calculatedData[`${mtIdx}-72`]);
                      const nbHReel    = parseMoneyValue(calculatedData[`${mtIdx}-76`]);
                      const coutReel   = parseMoneyValue(calculatedData[`${mtIdx}-87`]);

                      const f = (n: number, dec = 2) => n.toFixed(dec).replace('.', ',');
                      const eur = (n: number) => f(n) + ' €';

                      const rmValues: Record<string, string> = {
                        ca_realise:    eur(caR),
                        ca_budget:     eur(CA_BUDGET),
                        var_n1:        CA_N1 > 0 ? f((caR/CA_N1 - 1)*100) + '%' : '',
                        diff_n1:       eur(caR - CA_N1),
                        diff_budget:   eur(caR - CA_BUDGET),
                        cvts_resto:    cvtsResto.toFixed(0),
                        moy_cvts_resto:wDays > 0 ? (cvtsResto/wDays).toFixed(0) : '0',
                        tm_resto:      cvtsResto > 0 ? eur(caR / cvtsResto) : '',
                        cvts_limo:     cvtsLimo.toFixed(0),
                        moy_cvts_limo: wDays > 0 ? (cvtsLimo/wDays).toFixed(0) : '0',
                        tm_limo:       cvtsLimo > 0 ? eur(caLimo / cvtsLimo) : '',
                        rm_stock_init: stockInit ? eur(stockInit) : '0,00 €',
                        rm_stock_final:stockFinal ? eur(stockFinal) : '',
                        var_stock:     f(varStock, 0),
                        rm_achat_hm:   achatHM  ? eur(achatHM)  : '0,00 €',
                        rm_achat_total:achatTotal ? eur(achatTotal) : '0,00 €',
                        ratio_obj:     ratioObj.toFixed(2) + '%',
                        conso_obj:     eur(consoObj),
                        ratio_reel:    f(ratioReel) + '%',
                        marge_reel:    eur(margeReel),
                        conso_reel:    eur(consoReel),
                        ecart_ratio:   f(ratioReel - ratioObj),
                        ecart_conso:   f(consoReel - consoObj, 0),
                        nb_h_budget:   nbHBudget ? f(nbHBudget) : '',
                        sc_obj:        caR > 0 ? f((coutProj/caR)*100) + '%' : '',
                        prod_budget:   nbHBudget > 0 ? f(caR/nbHBudget) : '',
                        nb_h_reel:     nbHReel ? f(nbHReel) : '',
                        ecart_h:       f(nbHReel - nbHBudget),
                        sc_reel:       caR > 0 ? f((coutReel/caR)*100) + '%' : '',
                        ecart_sc:      caR > 0 ? f(((coutReel-coutProj)/caR)*100) + '%' : '',
                        prod_reel:     nbHReel > 0 ? f(caR/nbHReel) : '',
                        fg_0:  eur(fg(0,0)), fg_1: eur(fg(1,0)),  fg_2: eur(fg(2,0)),
                        fg_3:  eur(fg(3,0)), fg_4: eur(fg(0,1)),  fg_5: eur(fg(0,2)),
                        fg_6:  eur(fg(1,1)), fg_7: eur(fg(2,1)),  fg_8: eur(fg(2,2)),
                        fg_9:  eur(fg(3,1)), fg_10: eur(fg(1,2)), fg_11: eur(fg(3,2)),
                      };

                      const isRed = rmRow.style === 'red';
                      const dispVal = rmRow.key ? (rmValues[rmRow.key] || '') : '';
                      const isEditRow = rmRow.type === 'edit';
                      const BG_NORMAL = '#fffdf5';
                      const BG_SC     = '#fce4d6';
                      const BG_SECT   = '#b4c6e7';

                      if (rmRow.type === 'section') {
                        if (!isLabelCol) return null;
                        return (
                          <td key={`c-${rIdx}-${cIdx}`} colSpan={2}
                            className="px-2 py-1.5 text-center font-black text-[10px] uppercase tracking-widest border-b border-b-slate-400 border-r-[3px] border-r-slate-600"
                            style={{ background: BG_SECT, color: '#1e2d40' }}>
                            {rmRow.label}
                          </td>
                        );
                      }

                      if (rmRow.type === 'spacer') {
                        return <td key={`c-${rIdx}-${cIdx}`} className={`bg-[#fffdf5] border-b border-b-slate-100 ${rightBorder}`} style={{ height: 5 }} />;
                      }

                      const isSC = (rIdx >= 33 && rIdx <= 42);
                      const bg = isSC ? BG_SC : BG_NORMAL;

                      return (
                        <td key={`c-${rIdx}-${cIdx}`}
                          className={`border-b border-b-slate-200 ${rightBorder}`}
                          style={{ background: bg }}>
                          {isLabelCol ? (
                            <span className={`block px-2 py-1 text-[9px] leading-tight ${isRed ? 'font-bold text-red-600' : 'font-medium text-slate-700'}`}>
                              {rmRow.label}
                            </span>
                          ) : isEditRow ? (
                            <DebouncedInput
                              dataRow={rIdx}
                              dataCol={cIdx}
                              value={focusedCell === rmRow.key ? (cellData[rmRow.key!] || '') : (cellData[rmRow.key!] ? eur(parseMoneyValue(cellData[rmRow.key!])) : '')}
                              onChange={value => updateDashboard(month, rmRow.key!, String(value).replace(/[^0-9.,]/g,'').replace(',','.'))}
                              onFocus={() => setFocusedCell(rmRow.key!)}
                              onBlur={() => setFocusedCell(null)}
                              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e, rIdx, cIdx)}
                              className="w-full bg-transparent outline-none text-center text-[10px] text-slate-700 focus:bg-blue-50 focus:ring-1 focus:ring-indigo-400 px-1 py-1"
                              placeholder=""
                            />
                          ) : (
                            <span className={`block text-center px-1 py-1 text-[10px] ${isRed ? 'font-bold text-red-600' : 'text-slate-700'}`}>
                              {dispVal}
                            </span>
                          )}
                        </td>
                      );
                    }

                    const isDragOver = dragState && row.type === 'day' && rIdx > dragState.rIdx && rIdx <= dragState.endRow && originalCIdx === dragState.cIdx;
                    const showHandle = row.type === 'day' && !dragState && !isHatched && !isReadOnly && focusedCell === cellKey;
                    return (
                      <td
                        key={`c-${rIdx}-${cIdx}`}
                        className={`p-0 ${cellBg} ${cellBorderClasses} relative text-center`}
                        style={isDragOver ? { background: '#dcfce7', outline: '1px solid #16a34a' } : undefined}
                        onMouseEnter={() => dragState && row.type === 'day' && handleDragMove(rIdx)}
                      >
                        {!isHatched && !isReadOnly ? (
                          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                            <DebouncedInput
                              dataRow={rIdx}
                              dataCol={cIdx}
                              value={isFocused ? val : displayVal}
                              onChange={value => handleCellChange(rIdx, originalCIdx, String(value))}
                              onFocus={() => setFocusedCell(cellKey)}
                              onBlur={() => setFocusedCell(null)}
                              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(e, rIdx, cIdx)}
                              className="w-full h-full min-h-[26px] bg-transparent outline-none px-1 text-center font-medium focus:bg-blue-50 focus:ring-1 focus:ring-indigo-400 focus:z-10 relative cursor-text text-[10px] text-slate-700 placeholder-slate-300 transition-all"
                              placeholder=""
                            />
                            {showHandle && (
                              <div
                                onMouseDown={(e) => handleDragStart(e, rIdx, originalCIdx, String(cellData[cellKey] || ''))}
                                style={{ position: 'absolute', bottom: 0, right: 0, width: 7, height: 7, background: '#000000', border: '1px solid #ffffff', borderRadius: 1, cursor: 'crosshair', zIndex: 20 }}
                                title="Glisser pour recopier vers le bas"
                              />
                            )}
                          </div>
                        ) : !isHatched && isReadOnly ? (
                          <div className={`px-1 text-center py-1.5 min-h-[26px] text-[10px] ${val ? textColorClass : 'text-slate-400'}`}>
                            {displayVal || ''}
                          </div>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
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
          importStatus={importStatus}
          importPreview={importPreview}
        />
      )}
    </div>
  );
}
