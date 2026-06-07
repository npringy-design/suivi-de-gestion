import React, { useState, useMemo, useEffect, useRef } from 'react';
import DashboardAnalysisView from '@/DashboardAnalysisView';

import { useData } from '@/contexts/DataContext';
import { averagePayrollRate, buildPayrollImportFromText, getPayrollTargetPeriodFromText } from '@/personnelSalaryImport';
import { parseRecapPeriodeCaisse } from '@/caisseRecapPeriodeParser';
import { parseHourInputToDecimal } from '@/utils';

import { ChevronLeft, Download, Upload, FileDown, Trash2, X, Clipboard } from 'lucide-react';
// ── Modèle Dashboard extrait (types, colonnes, configuration statique) ────────
import type {
  CaisseImportPreview,
  DashboardColumn,
  DashboardRow,
  HistoricalBudgetPreview,
  InvoiceImportPreview,
  ParsedCaisseImport,
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
  tabs,
  viewModes,
} from '@/features/dashboard/dashboardStaticConfig';
import type { TableViewMode } from '@/features/dashboard/dashboardStaticConfig';
import { useDashboardDailyRecapState } from '@/features/dashboard/hooks/useDashboardDailyRecapState';
import { useDashboardImportState } from '@/features/dashboard/hooks/useDashboardImportState';
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
import DashboardDatePicker from '@/features/dashboard/components/DashboardDatePicker';
import DashboardRealiseMatrix from '@/features/dashboard/components/DashboardRealiseMatrix';
import DashboardDailyEntry from '@/features/dashboard/components/DashboardDailyEntry';
// ─────────────────────────────────────────────────────────────────────────────
import * as XLSX from 'xlsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import jsPDF from 'jspdf';
import domtoimage from 'dom-to-image-more';

// Helper to check if a date is within a range
const isDateInRange = (date: Date, startStr: string, endStr: string) => {
  const start = new Date(startStr);
  const end = new Date(endStr);
  return date >= start && date <= end;
};

// Helper to check if a date is exactly a specific date
const isExactDate = (date: Date, dateStr: string) => {
  const target = new Date(dateStr);
  return date.getFullYear() === target.getFullYear() && 
         date.getMonth() === target.getMonth() && 
         date.getDate() === target.getDate();
};

interface DashboardProps {
  initialMonth: number;
  year: number;
  onBack: () => void;
}

const DebouncedInput = ({ value, onChange, onFocus, onBlur, onKeyDown, className, placeholder, dataRow, dataCol }: {
  value: string | number;
  onChange: (value: string | number) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
  placeholder?: string;
  dataRow: string | number;
  dataCol: string | number;
}) => {
  const [localValue, setLocalValue] = useState(value);
  
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [localValue, onChange, value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  return (
    <input
      type="text"
      value={localValue}
      onChange={handleChange}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      className={className}
      placeholder={placeholder}
      data-row={dataRow}
      data-col={dataCol}
    />
  );
};

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

  const [month, setMonth] = useState(initialMonth);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
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
  const [purchaseSupplierNames, setPurchaseSupplierNames] = useState<Record<number, string>>(() => {
    try {
      const saved = localStorage.getItem('dashboard_purchase_supplier_names_v1');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedEntryDay, setSelectedEntryDay] = useState(() => {
    const now = new Date();
    return initialMonth === now.getMonth() && year === now.getFullYear() ? now.getDate() : 1;
  });

  const dynamicColumns = useMemo(() => {
    const cols = [...C];
    const salariesConfig = globalData[month]?.salariesConfig?.categories;
    if (salariesConfig) {
      // Update FRAIS DE PERSONNEL PROJECTION headers
      const updateHeader = (idx: number, category: string, label: string, department?: 'cuisine' | 'salle') => {
        const rows = salariesConfig[category] || [];
        const avg = averagePayrollRate(rows, department, category);
        const names = rows
          .filter((row: any) => !department || !row.department || row.department === department)
          .map((row: any) => String(row.nom || '').trim())
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
    try {
      localStorage.setItem('dashboard_purchase_supplier_names_v1', JSON.stringify(purchaseSupplierNames));
    } catch {
      // Les noms de fournisseurs restent modifiables même si le stockage navigateur est indisponible.
    }
  }, [purchaseSupplierNames]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const isPayrollInputColumn = (colIndex: number) => (colIndex >= 62 && colIndex <= 71) || (colIndex >= 77 && colIndex <= 86);

  const parsePayrollHourForCalculation = (value: string | number | undefined) => {
    if (value === undefined || value === null || value === '') return 0;
    const converted = parseHourInputToDecimal(value);
    return Number.isFinite(converted) && converted > 0 ? Math.round(converted * 100) / 100 : 0;
  };

  const formatPayrollHourDecimalValue = (value: string | number | undefined) => {
    if (value === undefined || value === null || value === '') return '';
    const converted = parsePayrollHourForCalculation(value);
    return converted > 0 ? converted.toFixed(2).replace('.', ',') : String(value);
  };

  const formatPayrollHourVisualValue = (value: string | number | undefined) => {
    if (value === undefined || value === null || value === '') return '';
    const converted = parseHourInputToDecimal(value);
    if (!Number.isFinite(converted) || converted <= 0) return String(value);
    const hours = Math.floor(converted);
    const minutesTotal = Math.round((converted - hours) * 60);
    const normalizedHours = hours + Math.floor(minutesTotal / 60);
    const normalizedMinutes = minutesTotal % 60;
    return `${normalizedHours}h${String(normalizedMinutes).padStart(2, '0')}`;
  };

  const cellData = globalData[month]?.dashboard || {};
  const [focusedCell, setFocusedCell] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('PREVISIONS');
  const [tableViewMode, setTableViewMode] = useState<TableViewMode>('SAISIE');
  const [dragState, setDragState] = useState<null | { rIdx: number; cIdx: number; endRow: number; value: string }>(null);

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
    setPurchaseSupplierNames({});
    try {
      localStorage.removeItem('dashboard_purchase_supplier_names_v1');
    } catch {
      // La RAZ des données métier a déjà été appliquée en mémoire.
    }
    setInvoiceImportPreviews([]);
    setInvoiceImportStatus('');
    setSalaryImportStatus('');
    setCaisseImportPreviews([]);
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

  useEffect(() => {
    const now = new Date();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const defaultDay = month === now.getMonth() && year === now.getFullYear() ? now.getDate() : 1;
    setSelectedEntryDay(prev => Math.min(prev || defaultDay, daysInMonth));
  }, [month, year]);

  const getFgBoxLayout = (rIdx: number, N: number) => {
    const dataRowsTotal = N - 9;
    const baseDataRows = Math.floor(dataRowsTotal / 4);
    const remainder = dataRowsTotal % 4;
    
    const d1 = baseDataRows + (remainder > 0 ? 1 : 0);
    const d2 = baseDataRows + (remainder > 1 ? 1 : 0);
    const d3 = baseDataRows + (remainder > 2 ? 1 : 0);
    const d4 = baseDataRows;

    const b1Total = d1;
    const b2Head = b1Total + 1;
    const b2Sub = b2Head + 1;
    const b2Total = b2Sub + d2 + 1;
    const b3Head = b2Total + 1;
    const b3Sub = b3Head + 1;
    const b3Total = b3Sub + d3 + 1;
    const b4Head = b3Total + 1;
    const b4Sub = b4Head + 1;
    const b4Total = N - 1;  // fg_box4_total row, juste avant month_total

    if (rIdx < b1Total) return { type: 'data', box: 0, dataIdx: rIdx };
    if (rIdx === b1Total) return { type: 'total', box: 0 };
    
    if (rIdx === b2Head) return { type: 'header', box: 1 };
    if (rIdx === b2Sub) return { type: 'subheader', box: 1 };
    if (rIdx < b2Total) return { type: 'data', box: 1, dataIdx: rIdx - b2Sub - 1 };
    if (rIdx === b2Total) return { type: 'total', box: 1 };

    if (rIdx === b3Head) return { type: 'header', box: 2 };
    if (rIdx === b3Sub) return { type: 'subheader', box: 2 };
    if (rIdx < b3Total) return { type: 'data', box: 2, dataIdx: rIdx - b3Sub - 1 };
    if (rIdx === b3Total) return { type: 'total', box: 2 };

    if (rIdx === b4Head) return { type: 'header', box: 3 };
    if (rIdx === b4Sub) return { type: 'subheader', box: 3 };
    if (rIdx < b4Total) return { type: 'data', box: 3, dataIdx: rIdx - b4Sub - 1 };
    if (rIdx === b4Total) return { type: 'total', box: 3 };

    return null;
  };

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
    const data: Record<string, string> = { ...cellData };
    let cumulCA = 0;
    let cumulCvts = 0;
    let cumulRealiseCA = 0;
    let cumulCoutMatiere = 0;
    let cumulCvtsRealise = 0;
    let cumulCvtsLimo = 0;
    let cumulCvtsBudgetComplet = 0;

    // First pass: Calculate row totals (TOTAL JOUR) and CUMUL
    rows.forEach((row, rIdx) => {
      if (row.type === 'day') {
        // Hippo Thillois : pas d'activite limonade. Les valeurs restent ignorees meme si une ancienne donnee existe.
        [2, 14, 15, 16, 20, 34, 35, 36, 110, 111, 112, 113, 114, 115].forEach(col => {
          data[`${rIdx}-${col}`] = '';
        });

        // Read inputs
        const cvtsMidi = parseFloat(data[`${rIdx}-6`] || '0');
        const moyMidi = parseFloat(data[`${rIdx}-7`] || '0');
        const cvtsSoir = parseFloat(data[`${rIdx}-8`] || '0');
        const moySoir = parseFloat(data[`${rIdx}-9`] || '0');
        const cvtsLimo = parseFloat(data[`${rIdx}-14`] || '0');
        const moyLimo = parseFloat(data[`${rIdx}-15`] || '0');

        // Calculate CA
        const caMidi = cvtsMidi * moyMidi;
        const caSoir = cvtsSoir * moySoir;
        const caLimo = cvtsLimo * moyLimo;

        if (caMidi > 0) data[`${rIdx}-0`] = caMidi.toFixed(2);
        if (caSoir > 0) data[`${rIdx}-1`] = caSoir.toFixed(2);
        if (caLimo > 0) data[`${rIdx}-2`] = caLimo.toFixed(2);

        const budgetMidi = parseFloat(data[`${rIdx}-0`] || '0');
        const budgetSoir = parseFloat(data[`${rIdx}-1`] || '0');
        const budgetLimo = parseFloat(data[`${rIdx}-2`] || '0');

        const budgetRestaurantTotal = budgetMidi + budgetSoir;
        if (budgetRestaurantTotal > 0 || data[`${rIdx}-0`] || data[`${rIdx}-1`]) data[`${rIdx}-125`] = budgetRestaurantTotal.toFixed(2);

        const totalJour = budgetRestaurantTotal + budgetLimo;
        if (totalJour > 0 || data[`${rIdx}-0`] || data[`${rIdx}-1`] || data[`${rIdx}-2`]) {
          data[`${rIdx}-3`] = totalJour.toFixed(2);
          cumulCA += totalJour;
          data[`${rIdx}-4`] = cumulCA.toFixed(2);
        }

        const jourCvts = cvtsMidi + cvtsSoir;
        if (jourCvts > 0) {
          data[`${rIdx}-10`] = jourCvts.toString();
          const jourMoy = (budgetMidi + budgetSoir) / jourCvts;
          data[`${rIdx}-11`] = jourMoy.toString();
          
          cumulCvts += jourCvts;
          data[`${rIdx}-12`] = cumulCvts.toString();
        }

        const budgetCvtsComplet = jourCvts + cvtsLimo;
        if (budgetCvtsComplet > 0 || data[`${rIdx}-10`] || data[`${rIdx}-14`]) {
          cumulCvtsBudgetComplet += budgetCvtsComplet;
          data[`${rIdx}-126`] = budgetCvtsComplet.toFixed(0);
          data[`${rIdx}-127`] = cumulCvtsBudgetComplet.toFixed(0);
        }

        // REALISE CA HT — 17=VAE,18=MIDI,19=SOIR,20=LIMO,21=TOTAL,22=ECART,23=CUMUL
        const realiseVae  = parseFloat(data[`${rIdx}-17`] || '0');
        const realiseMidi = parseFloat(data[`${rIdx}-18`] || '0');
        const realiseSoir = parseFloat(data[`${rIdx}-19`] || '0');
        const realiseLimoMidiDetail = parseFloat(data[`${rIdx}-110`] || '0');
        const realiseLimoSoirDetail = parseFloat(data[`${rIdx}-111`] || '0');
        const realiseLimoDetailTotal = realiseLimoMidiDetail + realiseLimoSoirDetail;
        const realiseLimo = realiseLimoDetailTotal > 0 ? realiseLimoDetailTotal : parseFloat(data[`${rIdx}-20`] || '0');
        if (realiseLimoDetailTotal > 0) data[`${rIdx}-20`] = realiseLimoDetailTotal.toFixed(2);
        const realiseRestaurantTotal = realiseMidi + realiseSoir;
        if (realiseRestaurantTotal > 0 || data[`${rIdx}-18`] || data[`${rIdx}-19`]) data[`${rIdx}-116`] = realiseRestaurantTotal.toFixed(2);
        const realiseTotalJour = realiseVae + realiseRestaurantTotal + realiseLimo;
        if (realiseTotalJour > 0 || data[`${rIdx}-17`] || data[`${rIdx}-18`] || data[`${rIdx}-19`] || data[`${rIdx}-20`]) {
          data[`${rIdx}-21`] = realiseTotalJour.toFixed(2);
          const realiseEcartBudget = realiseTotalJour - totalJour;
          data[`${rIdx}-22`] = realiseEcartBudget.toFixed(2);
          if (totalJour > 0) data[`${rIdx}-117`] = ((realiseEcartBudget / totalJour) * 100).toFixed(2);
          cumulRealiseCA += realiseTotalJour;
          data[`${rIdx}-23`] = cumulRealiseCA.toFixed(2);
        }
        // COUVERTS REALISE — 25=NB MIDI,26=MOY,27=NB SOIR,28=MOY,29=TOTAL,30=CUMUL,31=ECART nb vs budget
        const nbCvtsMidi = parseFloat(data[`${rIdx}-25`] || '0');
        const nbCvtsSoir = parseFloat(data[`${rIdx}-27`] || '0');
        if (nbCvtsMidi > 0 && realiseMidi > 0) data[`${rIdx}-26`] = (realiseMidi / nbCvtsMidi).toFixed(2);
        if (nbCvtsSoir > 0 && realiseSoir > 0) data[`${rIdx}-28`] = (realiseSoir / nbCvtsSoir).toFixed(2);
        const totalCvtsJour = nbCvtsMidi + nbCvtsSoir;
        if (totalCvtsJour > 0) {
          data[`${rIdx}-29`] = totalCvtsJour.toFixed(0);
          
          const moyJour = (realiseMidi + realiseSoir) / totalCvtsJour;
          data[`${rIdx}-30`] = moyJour.toFixed(2);
          
          const budgetMoyJour = parseFloat(data[`${rIdx}-11`] || '0');
          if (budgetMoyJour > 0) {
            data[`${rIdx}-31`] = (moyJour - budgetMoyJour).toFixed(2);
          }

          cumulCvtsRealise += totalCvtsJour;
          data[`${rIdx}-32`] = cumulCvtsRealise.toFixed(0);
          const budgetCvtsJour = parseFloat(data[`${rIdx}-10`] || '0');
          if (budgetCvtsJour > 0) data[`${rIdx}-33`] = (totalCvtsJour - budgetCvtsJour).toFixed(0);
        }
        // COUVERTS LIMONADE — detail midi/soir + total historique
        const nbCvtsLimoMidiDetail = parseFloat(data[`${rIdx}-112`] || '0');
        const nbCvtsLimoSoirDetail = parseFloat(data[`${rIdx}-114`] || '0');
        const nbCvtsLimoDetailTotal = nbCvtsLimoMidiDetail + nbCvtsLimoSoirDetail;
        const nbCvtsLimo = nbCvtsLimoDetailTotal > 0 ? nbCvtsLimoDetailTotal : parseFloat(data[`${rIdx}-34`] || '0');
        if (nbCvtsLimoDetailTotal > 0) data[`${rIdx}-34`] = nbCvtsLimoDetailTotal.toFixed(0);
        if (nbCvtsLimoMidiDetail > 0 && realiseLimoMidiDetail > 0) data[`${rIdx}-113`] = (realiseLimoMidiDetail / nbCvtsLimoMidiDetail).toFixed(2);
        if (nbCvtsLimoSoirDetail > 0 && realiseLimoSoirDetail > 0) data[`${rIdx}-115`] = (realiseLimoSoirDetail / nbCvtsLimoSoirDetail).toFixed(2);
        if (nbCvtsLimo > 0 && realiseLimo > 0) data[`${rIdx}-35`] = (realiseLimo / nbCvtsLimo).toFixed(2);
        if (nbCvtsLimo > 0) {
          cumulCvtsLimo = (cumulCvtsLimo || 0) + nbCvtsLimo;
          data[`${rIdx}-36`] = cumulCvtsLimo.toFixed(0);
        }
        const totalCvtsJourComplet = totalCvtsJour + nbCvtsLimo;
        if (totalCvtsJourComplet > 0) {
          data[`${rIdx}-120`] = totalCvtsJourComplet.toFixed(0);
          data[`${rIdx}-121`] = (cumulCvtsRealise + cumulCvtsLimo).toFixed(0);
          const budgetCvtsJourComplet = parseFloat(data[`${rIdx}-10`] || '0') + parseFloat(data[`${rIdx}-14`] || '0');
          if (budgetCvtsJourComplet > 0) {
            const ecartCvtsComplet = totalCvtsJourComplet - budgetCvtsJourComplet;
            data[`${rIdx}-33`] = ecartCvtsComplet.toFixed(0);
            data[`${rIdx}-122`] = ((ecartCvtsComplet / budgetCvtsJourComplet) * 100).toFixed(2);
          }
        }

        // COUT MATIERE calculations
        let coutMatiereTotalJour = 0;
        let hasCoutMatiereData = false;
        for (let i = 45; i <= 57; i++) {
          if (data[`${rIdx}-${i}`]) {
            coutMatiereTotalJour += parseFloat(data[`${rIdx}-${i}`] || '0');
            hasCoutMatiereData = true;
          }
        }

        if (hasCoutMatiereData) {
          data[`${rIdx}-58`] = coutMatiereTotalJour.toFixed(2);
          cumulCoutMatiere += coutMatiereTotalJour;
          data[`${rIdx}-59`] = cumulCoutMatiere.toFixed(2);
          
          if (cumulRealiseCA > 0) {
            data[`${rIdx}-60`] = ((cumulCoutMatiere / cumulRealiseCA) * 100).toFixed(2) + '%';
          } else {
            data[`${rIdx}-60`] = '0.00%';
          }
        }

        // FRAIS DE PERSONNEL - PROJECTION
        let totalHeuresProj = 0;
        let coutGlobalProj = 0;
        let hasProjData = false;
        
        const salariesConfig = globalData[month]?.salariesConfig?.categories;
        const getAvgRate = (category: string, department: 'cuisine' | 'salle') => {
          if (!salariesConfig) return 0;
          const rows = salariesConfig[category] || [];
          return averagePayrollRate(rows, department, category);
        };

        const projRates = [
          getAvgRate('cadre', 'cuisine'),
          getAvgRate('cadre', 'salle'),
          getAvgRate('maitrise', 'cuisine'),
          getAvgRate('maitrise', 'salle'),
          getAvgRate('niv12', 'cuisine'),
          getAvgRate('niv12', 'salle'),
          getAvgRate('niv3', 'cuisine'),
          getAvgRate('niv3', 'salle'),
          getAvgRate('apprenti', 'cuisine'),
          getAvgRate('apprenti', 'salle')
        ];

        for (let i = 0; i < 10; i++) {
          const colIdx = 62 + i;
          if (data[`${rIdx}-${colIdx}`]) {
            const val = parsePayrollHourForCalculation(data[`${rIdx}-${colIdx}`] || '0');
            totalHeuresProj += val;
            coutGlobalProj += val * projRates[i];
            hasProjData = true;
          }
        }
        
        if (hasProjData) {
          data[`${rIdx}-61`] = totalHeuresProj.toFixed(2);
          data[`${rIdx}-72`] = coutGlobalProj.toFixed(2);
          if (totalHeuresProj > 0) {
            data[`${rIdx}-73`] = (realiseTotalJour / totalHeuresProj).toFixed(2);
          }
          if (realiseTotalJour > 0) {
            data[`${rIdx}-74`] = ((coutGlobalProj / realiseTotalJour) * 100).toFixed(2) + '%';
          }
        }

        // FRAIS DE PERSONNEL - REALISE
        let totalHeuresReal = 0;
        let coutGlobalReal = 0;
        let hasRealData = false;
        
        for (let i = 0; i < 10; i++) {
          const colIdx = 77 + i;
          if (data[`${rIdx}-${colIdx}`]) {
            const val = parsePayrollHourForCalculation(data[`${rIdx}-${colIdx}`] || '0');
            totalHeuresReal += val;
            coutGlobalReal += val * projRates[i];
            hasRealData = true;
          }
        }
        
        if (hasRealData) {
          data[`${rIdx}-76`] = totalHeuresReal.toFixed(2);
          data[`${rIdx}-87`] = coutGlobalReal.toFixed(2);
          if (totalHeuresReal > 0) {
            data[`${rIdx}-88`] = (realiseTotalJour / totalHeuresReal).toFixed(2);
          }
          if (realiseTotalJour > 0) {
            data[`${rIdx}-89`] = ((coutGlobalReal / realiseTotalJour) * 100).toFixed(2) + '%';
          }
          
          // Ecarts
          if (hasProjData) {
            data[`${rIdx}-91`] = (totalHeuresReal - totalHeuresProj).toFixed(2);
            if (realiseTotalJour > 0) {
              const pctReal = (coutGlobalReal / realiseTotalJour) * 100;
              const pctProj = (coutGlobalProj / realiseTotalJour) * 100;
              data[`${rIdx}-92`] = (pctReal - pctProj).toFixed(2) + '%';
            }
          }
        }
      }
    });

    // Second pass: Week Totals
    rows.forEach((row, rIdx) => {
      if (row.type === 'total') {
        const weekIdx = row.weekIndex;
        // Find all days in this week
        const weekDays = rows
          .map((r, idx) => ({ ...r, originalIdx: idx }))
          .filter(r => r.type === 'day' && r.weekIndex === weekIdx);

        // Sum up each column for the week
        dynamicColumns.forEach((_, cIdx) => {
          // Skip hatched columns or text columns or averages or cumul columns
          const colName = dynamicColumns[cIdx][2] || dynamicColumns[cIdx][1];
          if (dynamicColumns[cIdx][3] === 'bg-hatched' || ['DATE', 'FOURNISSEUR', 'FOURNISSEURS', 'MOTIF ACHAT', 'Nom'].includes(colName) || [7, 9, 11, 15, 4, 12, 22, 23, 26, 28, 30, 31, 32, 35, 36, 59, 60, 73, 74, 75, 88, 89, 90, 91, 92, 117, 122].includes(cIdx)) return;

          let colSum = 0;
          let hasData = false;
          weekDays.forEach(day => {
            const rawVal = data[`${day.originalIdx}-${cIdx}`] || '';
            const val = isPayrollInputColumn(cIdx) ? parsePayrollHourForCalculation(rawVal) : parseFloat(rawVal || '0');
            if (!isNaN(val) && rawVal) {
              colSum += val;
              hasData = true;
            }
          });

          if (hasData) {
            data[`${rIdx}-${cIdx}`] = colSum.toString();
          }
        });

        // Calculate averages for week
        const caMidiW = parseFloat(data[`${rIdx}-0`] || '0');
        const cvtsMidiW = parseFloat(data[`${rIdx}-6`] || '0');
        if (cvtsMidiW > 0) data[`${rIdx}-7`] = (caMidiW / cvtsMidiW).toString();

        const caSoirW = parseFloat(data[`${rIdx}-1`] || '0');
        const cvtsSoirW = parseFloat(data[`${rIdx}-8`] || '0');
        if (cvtsSoirW > 0) data[`${rIdx}-9`] = (caSoirW / cvtsSoirW).toString();

        const caJourW = caMidiW + caSoirW;
        const cvtsJourW = cvtsMidiW + cvtsSoirW;
        if (cvtsJourW > 0) data[`${rIdx}-11`] = (caJourW / cvtsJourW).toString();

        const caLimoW = parseFloat(data[`${rIdx}-2`] || '0');
        const cvtsLimoW = parseFloat(data[`${rIdx}-14`] || '0');
        if (cvtsLimoW > 0) data[`${rIdx}-15`] = (caLimoW / cvtsLimoW).toString();

        const realiseCAW = parseFloat(data[`${rIdx}-21`] || '0');
        // Moyennes semaine couverts réalisé
        const nbMidiW = parseFloat(data[`${rIdx}-25`] || '0');
        const nbSoirW = parseFloat(data[`${rIdx}-27`] || '0');
        const caMidiWr = parseFloat(data[`${rIdx}-18`] || '0');
        const caSoirWr = parseFloat(data[`${rIdx}-19`] || '0');
        if (nbMidiW > 0 && caMidiWr > 0) data[`${rIdx}-26`] = (caMidiWr / nbMidiW).toFixed(2);
        if (nbSoirW > 0 && caSoirWr > 0) data[`${rIdx}-28`] = (caSoirWr / nbSoirW).toFixed(2);
        const budgetCaW = parseFloat(data[`${rIdx}-3`] || '0');
        if (budgetCaW > 0 || realiseCAW > 0) {
          const ecartCaBudgetW = realiseCAW - budgetCaW;
          data[`${rIdx}-22`] = ecartCaBudgetW.toFixed(2);
          if (budgetCaW > 0) data[`${rIdx}-117`] = ((ecartCaBudgetW / budgetCaW) * 100).toFixed(2);
        }
        const totalCvtsRealiseW = nbMidiW + nbSoirW;
        if (totalCvtsRealiseW > 0) {
          const moyJourRealiseW = (caMidiWr + caSoirWr) / totalCvtsRealiseW;
          data[`${rIdx}-29`] = totalCvtsRealiseW.toFixed(0);
          data[`${rIdx}-30`] = moyJourRealiseW.toFixed(2);
          const budgetMoyJourW = parseFloat(data[`${rIdx}-11`] || '0');
          if (budgetMoyJourW > 0) data[`${rIdx}-31`] = (moyJourRealiseW - budgetMoyJourW).toFixed(2);
          const lastWeekDay = weekDays[weekDays.length - 1];
          if (lastWeekDay) data[`${rIdx}-32`] = data[`${lastWeekDay.originalIdx}-32`] || totalCvtsRealiseW.toFixed(0);
          const budgetCvtsW = parseFloat(data[`${rIdx}-10`] || '0') + parseFloat(data[`${rIdx}-14`] || '0');
          const ecartCvtsW = parseFloat(data[`${rIdx}-33`] || '0');
          if (budgetCvtsW > 0) data[`${rIdx}-122`] = ((ecartCvtsW / budgetCvtsW) * 100).toFixed(2);
        }
        // Cout matiere semaine
        const coutMatiereW = parseFloat(data[`${rIdx}-58`] || '0');
        if (realiseCAW > 0) data[`${rIdx}-60`] = ((coutMatiereW / realiseCAW) * 100).toFixed(2) + '%';

        const totalHeuresProjW = parseFloat(data[`${rIdx}-61`] || '0');
        const coutGlobalProjW = parseFloat(data[`${rIdx}-72`] || '0');
        if (totalHeuresProjW > 0) data[`${rIdx}-73`] = (realiseCAW / totalHeuresProjW).toFixed(2);
        if (realiseCAW > 0) {
          data[`${rIdx}-74`] = ((coutGlobalProjW / realiseCAW) * 100).toFixed(2) + '%';
          data[`${rIdx}-75`] = ((coutGlobalProjW / realiseCAW) * 100).toFixed(2) + '%';
        }
        
        const totalHeuresRealW = parseFloat(data[`${rIdx}-76`] || '0');
        const coutGlobalRealW = parseFloat(data[`${rIdx}-87`] || '0');
        if (totalHeuresRealW > 0) data[`${rIdx}-88`] = (realiseCAW / totalHeuresRealW).toFixed(2);
        if (realiseCAW > 0) {
          data[`${rIdx}-89`] = ((coutGlobalRealW / realiseCAW) * 100).toFixed(2) + '%';
          data[`${rIdx}-90`] = ((coutGlobalRealW / realiseCAW) * 100).toFixed(2) + '%';
        }
        
        data[`${rIdx}-91`] = (totalHeuresRealW - totalHeuresProjW).toFixed(2);
        if (realiseCAW > 0) {
          const pctRealW = (coutGlobalRealW / realiseCAW) * 100;
          const pctProjW = (coutGlobalProjW / realiseCAW) * 100;
          data[`${rIdx}-92`] = (pctRealW - pctProjW).toFixed(2) + '%';
        }
      }
    });

    // Third pass: Month Total
    const monthTotalIdx = rows.findIndex(r => r.type === 'month_total');
    if (monthTotalIdx !== -1) {
      const allDays = rows
        .map((r, idx) => ({ ...r, originalIdx: idx }))
        .filter(r => r.type === 'day');

      dynamicColumns.forEach((_, cIdx) => {
        const colName = dynamicColumns[cIdx][2] || dynamicColumns[cIdx][1];
        if (dynamicColumns[cIdx][3] === 'bg-hatched' || ['DATE', 'FOURNISSEUR', 'FOURNISSEURS', 'MOTIF ACHAT', 'Nom'].includes(colName) || [7, 9, 11, 15, 4, 12, 22, 23, 26, 28, 30, 31, 32, 35, 36, 59, 60, 73, 74, 75, 88, 89, 90, 91, 92, 117, 122].includes(cIdx)) return;

        let colSum = 0;
        let hasData = false;
        allDays.forEach(day => {
          const val = parseFloat(data[`${day.originalIdx}-${cIdx}`] || '0');
          if (!isNaN(val) && data[`${day.originalIdx}-${cIdx}`]) {
            colSum += val;
            hasData = true;
          }
        });

        if (hasData) {
            data[`${monthTotalIdx}-${cIdx}`] = colSum.toString();
        }
      });

      // Calculate averages for month
      const caMidiM = parseFloat(data[`${monthTotalIdx}-0`] || '0');
      const cvtsMidiM = parseFloat(data[`${monthTotalIdx}-6`] || '0');
      if (cvtsMidiM > 0) data[`${monthTotalIdx}-7`] = (caMidiM / cvtsMidiM).toString();

      const caSoirM = parseFloat(data[`${monthTotalIdx}-1`] || '0');
      const cvtsSoirM = parseFloat(data[`${monthTotalIdx}-8`] || '0');
      if (cvtsSoirM > 0) data[`${monthTotalIdx}-9`] = (caSoirM / cvtsSoirM).toString();

      const caJourM = caMidiM + caSoirM;
      const cvtsJourM = cvtsMidiM + cvtsSoirM;
      if (cvtsJourM > 0) data[`${monthTotalIdx}-11`] = (caJourM / cvtsJourM).toString();

      const caLimoM = parseFloat(data[`${monthTotalIdx}-2`] || '0');
      const cvtsLimoM = parseFloat(data[`${monthTotalIdx}-14`] || '0');
      if (cvtsLimoM > 0) data[`${monthTotalIdx}-15`] = (caLimoM / cvtsLimoM).toString();

      const coutMatiereM = parseFloat(data[`${monthTotalIdx}-58`] || '0');
      const realiseCAM = parseFloat(data[`${monthTotalIdx}-21`] || '0');
      if (realiseCAM > 0) data[`${monthTotalIdx}-60`] = ((coutMatiereM / realiseCAM) * 100).toFixed(2) + '%';

      // Moyennes mois couverts réalisé
      const nbMidiM = parseFloat(data[`${monthTotalIdx}-25`] || '0');
      const nbSoirM = parseFloat(data[`${monthTotalIdx}-27`] || '0');
      const caMidiMr = parseFloat(data[`${monthTotalIdx}-18`] || '0');
      const caSoirMr = parseFloat(data[`${monthTotalIdx}-19`] || '0');
      if (nbMidiM > 0 && caMidiMr > 0) data[`${monthTotalIdx}-26`] = (caMidiMr / nbMidiM).toFixed(2);
      if (nbSoirM > 0 && caSoirMr > 0) data[`${monthTotalIdx}-28`] = (caSoirMr / nbSoirM).toFixed(2);
      const budgetCaM = parseFloat(data[`${monthTotalIdx}-3`] || '0');
      if (budgetCaM > 0 || realiseCAM > 0) {
        const ecartCaBudgetM = realiseCAM - budgetCaM;
        data[`${monthTotalIdx}-22`] = ecartCaBudgetM.toFixed(2);
        if (budgetCaM > 0) data[`${monthTotalIdx}-117`] = ((ecartCaBudgetM / budgetCaM) * 100).toFixed(2);
      }
      const totalCvtsM = nbMidiM + nbSoirM;
      if (totalCvtsM > 0) {
        const moyJourRealiseM = (caMidiMr + caSoirMr) / totalCvtsM;
        data[`${monthTotalIdx}-29`] = totalCvtsM.toFixed(0);
        data[`${monthTotalIdx}-30`] = moyJourRealiseM.toFixed(2);
        data[`${monthTotalIdx}-32`] = totalCvtsM.toFixed(0);
        const budgetMoyJourM = parseFloat(data[`${monthTotalIdx}-11`] || '0');
        if (budgetMoyJourM > 0) data[`${monthTotalIdx}-31`] = (moyJourRealiseM - budgetMoyJourM).toFixed(2);
        const budgetCvtsM = parseFloat(data[`${monthTotalIdx}-10`] || '0') + parseFloat(data[`${monthTotalIdx}-14`] || '0');
        const ecartCvtsM = parseFloat(data[`${monthTotalIdx}-33`] || '0');
        if (budgetCvtsM > 0) data[`${monthTotalIdx}-122`] = ((ecartCvtsM / budgetCvtsM) * 100).toFixed(2);
      }

      const totalHeuresProjM = parseFloat(data[`${monthTotalIdx}-61`] || '0');
      const coutGlobalProjM = parseFloat(data[`${monthTotalIdx}-72`] || '0');
      if (totalHeuresProjM > 0) data[`${monthTotalIdx}-73`] = (realiseCAM / totalHeuresProjM).toFixed(2);
      if (realiseCAM > 0) {
        data[`${monthTotalIdx}-74`] = ((coutGlobalProjM / realiseCAM) * 100).toFixed(2) + '%';
        data[`${monthTotalIdx}-75`] = ((coutGlobalProjM / realiseCAM) * 100).toFixed(2) + '%';
      }
      
      const totalHeuresRealM = parseFloat(data[`${monthTotalIdx}-76`] || '0');
      const coutGlobalRealM = parseFloat(data[`${monthTotalIdx}-87`] || '0');
      if (totalHeuresRealM > 0) data[`${monthTotalIdx}-88`] = (realiseCAM / totalHeuresRealM).toFixed(2);
      if (realiseCAM > 0) {
        data[`${monthTotalIdx}-89`] = ((coutGlobalRealM / realiseCAM) * 100).toFixed(2) + '%';
        data[`${monthTotalIdx}-90`] = ((coutGlobalRealM / realiseCAM) * 100).toFixed(2) + '%';
      }
      
      data[`${monthTotalIdx}-91`] = (totalHeuresRealM - totalHeuresProjM).toFixed(2);
      if (realiseCAM > 0) {
        const pctRealM = (coutGlobalRealM / realiseCAM) * 100;
        const pctProjM = (coutGlobalProjM / realiseCAM) * 100;
        data[`${monthTotalIdx}-92`] = (pctRealM - pctProjM).toFixed(2) + '%';
      }

      // Calculate FRAIS GENERAUX box totals
      let globalFgTotal = 0;
      for (let box = 0; box < 4; box++) {
        for (let colGroup = 0; colGroup < 3; colGroup++) {
          let boxTotal = 0;
          // Max possible data rows is around 10
          for (let dIdx = 0; dIdx < 10; dIdx++) {
            const val = parseFloat(data[`fg-data-${box}-${colGroup}-${dIdx}-3`] || '0');
            boxTotal += val;
          }
          data[`fg-total-${box}-${colGroup}`] = boxTotal.toFixed(2).replace('.', ',') + ' €';
          globalFgTotal += boxTotal;
        }
      }
      
      const fgTotalIdx = rows.findIndex(r => r.type === 'month_total');
      if (fgTotalIdx !== -1) {
        data[`${fgTotalIdx}-fraisGenerauxTotal`] = globalFgTotal.toFixed(2).replace('.', ',') + ' €';
      }
    }

    return data;
  }, [cellData, globalData[month]?.salariesConfig]);

  const parseDashboardNumber = (value: string | number | undefined) => {
    if (value === undefined || value === null || value === '') return 0;
    return parseFloat(String(value).replace(',', '.').replace(/[^0-9.-]/g, '')) || 0;
  };

  const formatKpiCurrency = (value: number) =>
    value === 0 ? '-' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

  const formatKpiNumber = (value: number) =>
    value === 0 ? '-' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value);

  const summaryKpis = useMemo(() => {
    const monthTotalIdx = rows.findIndex(r => r.type === 'month_total');
    if (monthTotalIdx === -1) {
      return {
        budgetCa: 0,
        realiseCa: 0,
        ecartCa: 0,
        couverts: 0,
        ticketMoyen: 0,
        coutMatiere: 0,
        fraisPersonnel: 0,
      };
    }

    const budgetCa = parseDashboardNumber(calculatedData[`${monthTotalIdx}-3`]);
    const realiseCa = parseDashboardNumber(calculatedData[`${monthTotalIdx}-21`]);
    const ecartCa = realiseCa - budgetCa;

    return {
      budgetCa,
      realiseCa,
      ecartCa,
      couverts: parseDashboardNumber(calculatedData[`${monthTotalIdx}-29`]),
      ticketMoyen: parseDashboardNumber(calculatedData[`${monthTotalIdx}-30`]),
      coutMatiere: parseDashboardNumber(calculatedData[`${monthTotalIdx}-58`]),
      fraisPersonnel: parseDashboardNumber(calculatedData[`${monthTotalIdx}-87`]),
    };
  }, [calculatedData, rows]);

  const todayMarker = useMemo(() => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
    };
  }, []);

  const formatValue = (val: string | number | undefined, c: string[], colIndex?: number) => {
    if (val === '' || val === undefined || val === null) return '';

    if (typeof colIndex === 'number' && isPayrollInputColumn(colIndex)) {
      return formatPayrollHourDecimalValue(val);
    }
    
    // If the value already contains a percentage sign, return it as is
    if (typeof val === 'string' && val.includes('%')) return val;

    const num = parseFloat(String(val));
    if (isNaN(num)) return val;

    const groupName = c[0];
    const subGroupName = c[1];
    const colName = c[2] || c[1];

    // Check if it's a percentage column
    const isPercentage = groupName !== 'COUT MATIERE' && (colName.includes('RATIO') || colName.includes('%') || subGroupName.includes('RATIO'));

    // Check if it's a currency column
    const isCurrency = !isPercentage && (colName.includes('CA') || colName.includes('HT') || colName.includes('PANIER') || colName.includes('MONTANT') || colName.includes('€') || colName.includes('COUT') ||
                       subGroupName.includes('CA HT') || subGroupName.includes('ACHAT') || groupName.includes('COUT'));
    
    // Format number: no decimals if integer, otherwise 2 decimals
    const formattedNum = Number.isInteger(num) ? num.toString() : num.toFixed(2).replace('.', ',');
    
    // Add + sign for positive gaps
    const prefix = (colName.includes('ECART') && num > 0) ? '+' : '';
    
    if (isPercentage) return `${prefix}${formattedNum} %`;
    return isCurrency ? `${prefix}${formattedNum} €` : `${prefix}${formattedNum}`;
  };

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

  const selectMonth = (nextMonth: number) => {
    setMonth(nextMonth);
    setSelectedMonth(nextMonth);
  };

  const parseCaisseNumber = (value: string) => Number(value.replace(/\s/g, '').replace(',', '.')) || 0;
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

  const findBudgetSheetName = (workbook: XLSX.WorkBook, targetMonth: number, targetYear: number) => {
    const yearShort = String(targetYear).slice(-2);
    const yearFull = String(targetYear);
    const tokens = budgetSheetTokens[targetMonth] || [];
    return workbook.SheetNames.find(sheetName => {
      const normalized = normalizeExcelSheetName(sheetName);
      if (/BILAN|SAISIE|REPORTING|ANNUEL|REALISE/.test(normalized)) return false;
      const hasMonth = tokens.some(token => normalized.includes(normalizeExcelSheetName(token)));
      const parts = normalized.split(/s+/);
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
      .replace(/ /g, ' ')
      .replace(/s/g, '')
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
    if (/^d{4}-d{2}-d{2}/.test(text) && !Number.isNaN(isoTime)) return new Date(isoTime);
    const normalizedTextDate = text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/./g, ' ').replace(/s+/g, ' ').trim().toLowerCase();
    const monthWords: Record<string, number> = { janvier: 0, janv: 0, fevrier: 1, fevr: 1, fev: 1, mars: 2, avril: 3, avr: 3, mai: 4, juin: 5, juillet: 6, juil: 6, aout: 7, septembre: 8, sept: 8, octobre: 9, oct: 9, novembre: 10, nov: 10, decembre: 11, dec: 11 };
    const wordDateMatch = normalizedTextDate.match(/(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)?s*(d{1,2})s+([a-z]+)s+(d{2,4})/);
    if (wordDateMatch) {
      const monthIndex = monthWords[wordDateMatch[2]];
      if (monthIndex !== undefined) {
        const fullYear = wordDateMatch[3].length === 2 ? Number('20' + wordDateMatch[3]) : Number(wordDateMatch[3]);
        return new Date(fullYear, monthIndex, Number(wordDateMatch[1]));
      }
    }
    const frMatch = text.match(/(d{1,2})[/.-](d{1,2})[/.-](d{2,4})/);
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
  );

  const normalizeHistoricalSupplierName = (value: unknown) => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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
      .replace(/\u00a0/g, ' ')
      .trim();
    const compact = displayText.replace(/\s/g, '').replace(',', '.');
    const isNegative = /^-/.test(compact) || /-$/.test(compact) || /^\(.*\)$/.test(compact);
    const numericText = compact.replace(/[()\-]/g, '').replace(/[^0-9.]/g, '');
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
  );

  const historicalPayrollProjectionCols = [62, 63, 64, 65, 66, 67, 68, 69, 70, 71];
  const historicalPayrollRealiseCols = [77, 78, 79, 80, 81, 82, 83, 84, 85, 86];
  const historicalPayrollAllCols = [...historicalPayrollProjectionCols, ...historicalPayrollRealiseCols];

  const parseHistoricalPayrollHourCell = (cell: XLSX.CellObject | undefined) => {
    if (!cell) return '';
    const display = String(cell.w ?? '')
      .replace(/−|–|—/g, '-')
      .replace(/ /g, ' ')
      .trim();
    const raw = cell.v;

    if (/^d{1,4}[:hH]d{2}$/.test(display)) {
      const normalized = display.replace(/[hH]/, ':');
      return /^0+:00$/.test(normalized) ? '' : normalized;
    }

    const rawText = String(raw ?? '').trim();
    if (/^d{1,4}[:hH]d{2}$/.test(rawText)) {
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
    const match = value.match(/^(d{1,4})[:hH](d{2})$/);
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
    const rawHeader = String(headerText ?? '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
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
  );

  const handleHistoricalBudgetExcelImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setHistoricalBudgetStatus('Lecture locale du budget historique Excel sur le mois affiché...');

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const previews: HistoricalBudgetPreview[] = [];
      const matchedSheets: string[] = [];
      let scannedDateRows = 0;

      for (const monthIndex of [month]) {
        const sheetName = findBudgetSheetName(workbook, monthIndex, year);
        if (!sheetName) continue;
        matchedSheets.push(sheetName);
        const sheet = workbook.Sheets[sheetName];
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
        const costMatterColumnMap = getHistoricalCostMatterColumnMap(sheet, range);
        const payrollColumnMaps = getHistoricalPayrollColumnMaps(sheet, range);

        for (let rowNumber = range.s.r; rowNumber <= range.e.r; rowNumber += 1) {
          const parsedDate = parseHistoricalBudgetCellDate(getHistoricalBudgetCell(sheet, rowNumber, 0));
          if (!parsedDate) continue;
          scannedDateRows += 1;
          if (parsedDate.getFullYear() !== year || parsedDate.getMonth() !== monthIndex) continue;
          const day = parsedDate.getDate();
          const rowIndex = getDashboardRowIndexForDay(year, monthIndex, day);
          if (rowIndex < 0) continue;

          const previousValues = getHistoricalBudgetRowValues(sheet, rowNumber - 1);
          const upperValues = getHistoricalBudgetRowValues(sheet, rowNumber - 2);
          const currentValues = getHistoricalBudgetRowValues(sheet, rowNumber);
          const values = rowHasHistoricalBudgetValues(previousValues) ? previousValues : rowHasHistoricalBudgetValues(upperValues) ? upperValues : currentValues;

          const couvertsMidi = values.couvertsMidi;
          const tmMidi = values.tmMidi;
          const couvertsSoir = values.couvertsSoir;
          const tmSoir = values.tmSoir;
          const couvertsTotal = couvertsMidi + couvertsSoir;
          let realiseSourceRow = rowNumber;
          if (rowHasHistoricalBudgetValues(previousValues)) realiseSourceRow = rowNumber - 1;
          else if (rowHasHistoricalBudgetValues(upperValues)) realiseSourceRow = rowNumber - 2;
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
      }

      setHistoricalBudgetPreviews(previews);
      setImportPreview([]);
      setCaisseImportPreviews([]);
      setInvoiceImportPreviews([]);
      setHistoricalBudgetStatus(previews.length > 0
        ? previews.length + ' jour(s) prévision trouvés pour ' + monthNames[month] + ' ' + year + '. Vérifie puis valide.'
        : 'Aucune prévision couverts/TM trouvée pour ' + monthNames[month] + ' ' + year + '. Feuille détectée : ' + (matchedSheets.join(', ') || 'aucune') + '. Lignes dates lues : ' + scannedDateRows + '.');
    } catch (error) {
      setHistoricalBudgetStatus('Erreur import budget Excel : ' + (error instanceof Error ? error.message : 'lecture impossible'));
    } finally {
      event.target.value = '';
    }
  };

  const applyHistoricalBudgetExcelImport = () => {
    historicalBudgetPreviews.forEach(item => {
      updateDashboard(item.month, item.rowIndex + '-0', '');
      updateDashboard(item.month, item.rowIndex + '-1', '');
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
      historicalPayrollAllCols.forEach(targetCol => {
        updateDashboard(item.month, item.rowIndex + '-' + targetCol, '');
      });
      Object.entries(item.payrollValues || {}).forEach(([targetCol, hourValue]) => {
        updateDashboard(item.month, item.rowIndex + '-' + targetCol, String(hourValue));
      });
    });
    setHistoricalBudgetStatus(historicalBudgetPreviews.length + ' jour(s) prévision couverts/TM importés dans ' + monthNames[month] + ' ' + year + '. Les CA seront recalculés automatiquement.');
    setHistoricalBudgetPreviews([]);
  };
  const findCaisseAmounts = (text: string, label: string) => {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = text.match(new RegExp(`${escaped}\\s+((?:-?\\d[\\d\\s]*,\\d{2}\\s*){1,3})`, 'i'));
    return match ? extractCaisseNumbers(match[1]) : [];
  };
  const findCaisseAmount = (text: string, label: string) => {
    const amounts = findCaisseAmounts(text, label);
    return amounts[amounts.length - 1] || 0;
  };
  const findCaisseTheoriqueAmount = (text: string, label: string) => {
    const amounts = findCaisseAmounts(text, label);
    return amounts.length >= 2 ? amounts[amounts.length - 2] : amounts[0] || 0;
  };
  const extractCaisseNumbers = (text: string) => (text.match(/-?\d[\d\s]*,\d{2}/g) || []).map(parseCaisseNumber);
  const findCaisseTtcByRate = (source: string, rate: '5,5' | '10' | '20') => {
    const text = source.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
    const headerMatch = text.match(/TVA\s+TOTAL\s+HT\s+TVA\s+TTC/i);
    if (!headerMatch || headerMatch.index === undefined) return 0;
    const block = text.slice(headerMatch.index, headerMatch.index + 450);
    const rateRegex = rate === '5,5' ? /TVA\s*5[,\.]5\s*%/i : rate === '10' ? /TVA\s*10\s*%/i : /TVA\s*20\s*%/i;
    const rateMatch = block.match(rateRegex);
    if (!rateMatch || rateMatch.index === undefined) return 0;
    const afterRate = block.slice(rateMatch.index + rateMatch[0].length);
    const nextRow = afterRate.search(/TVA\s*(?:5[,\.]5|10|20)\s*%|\bTOTAL\b/i);
    const rowText = nextRow >= 0 ? afterRate.slice(0, nextRow) : afterRate.slice(0, 160);
    const amounts = extractCaisseNumbers(rowText);
    const ht = amounts[2] || amounts[0] || 0;
    const coeff = rate === '5,5' ? 1.055 : rate === '10' ? 1.10 : 1.20;
    return Math.round(ht * coeff * 100) / 100;
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
      .replace(/â‚¬/g, '€')
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
    const text = sourceText.replace(/\u00a0/g, ' ').replace(/â‚¬/g, '€');
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
    const file = event.target.files?.[0];
    if (!file) return;

    setSalaryImportStatus('Lecture du PDF salaires...');

    try {
      const configuredPersonnel = personnelInfos.filter(item => item.nom.trim());
      if (configuredPersonnel.length === 0) {
        setSalaryImportStatus('Erreur : renseigne d abord la page Info personnel pour matcher les noms du PDF.');
        return;
      }

      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const text = isPdf ? await extractPdfLayoutText(file, undefined, false) : await file.text();
      const payrollPeriod = getPayrollTargetPeriodFromText(text);
      if (!payrollPeriod) {
        setSalaryImportStatus('Erreur : le mois du PDF salaires n a pas pu etre detecte.');
        return;
      }
      const result = buildPayrollImportFromText(text, configuredPersonnel);

      if (result.matches.length === 0) {
        setSalaryImportStatus('Erreur : aucun salarie de la page Info personnel n a ete retrouve avec heures et cout global dans ce fichier.');
        return;
      }

      const targetMonth = payrollPeriod.targetMonth;
      const currentConfig = globalData[targetMonth]?.salariesConfig || { locked: false, categories: result.categories };
      if (currentConfig.locked) {
        setSalaryImportStatus('Erreur : le mois est verrouille dans la configuration salaires.');
        return;
      }

      updateSalariesConfig(targetMonth, {
        ...currentConfig,
        categories: result.categories,
      });

      const unmatchedText = result.unmatched.length > 0 ? ` ${result.unmatched.length} non matche(s).` : '';
      setMonth(targetMonth);
      setSelectedMonth(targetMonth);
      setSalaryImportStatus(`${result.matches.length} salarie(s) importe(s). PDF ${payrollPeriod.sourceLabel} applique sur ${payrollPeriod.targetLabel}. Snapshot des taux sauvegarde, aucun import brut conserve.${unmatchedText}`);
    } catch (error) {
      setSalaryImportStatus(`Erreur : ${error instanceof Error ? error.message : "le PDF salaires n'a pas pu etre lu."}`);
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
  const getDailyCellValue = (col: number) => selectedDayRowIndex >= 0 ? calculatedData[`${selectedDayRowIndex}-${col}`] || '' : '';
  const getDailyDisplayValue = (col: number) => {
    const value = getDailyCellValue(col);
    return isPayrollInputColumn(col) ? formatPayrollHourVisualValue(value) : formatValue(value, dynamicColumns[col] || ['', '', '', ''], col);
  };
  const isDailyFieldFocused = (col: number) => focusedCell === `${selectedDayRowIndex}-${col}`;

  const formatDailyRecapNumber = (value: number, decimals = 2) => new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
  const formatDailyRecapCurrency = (value: number, suffix = ' HT') => `${formatDailyRecapNumber(value)} €${suffix}`;
  const formatDailyRecapTicket = (value: number) => `${formatDailyRecapNumber(value)} €`;
  const formatDailyRecapInteger = (value: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value);
  const formatDailyRecapDelta = (value: number, decimals = 2) => `${value > 0 ? '+' : ''}${formatDailyRecapNumber(value, decimals)}`;
  const formatDailyRecapPercent = (delta: number, budget: number) => (
    budget > 0 ? ` (${formatDailyRecapDelta((delta / budget) * 100, 1)}%)` : ''
  );
  const dailyRecapDeltaClass = (value: number) => value < 0 ? 'negative' : value > 0 ? 'positive' : 'neutral';
  const dailyRecapDeltaColor = (value: number) => value < 0 ? '#dc2626' : value > 0 ? '#15803d' : '#334155';
  const dailyRecapDeltaHtml = (value: number, suffix = ' €') => `<strong style="color:${dailyRecapDeltaColor(value)}">${formatDailyRecapDelta(value)}${suffix}</strong>`;
  const escapeDailyRecapHtml = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const dailyRecapTextLine = (label: string, value: string) => `  ${label.padEnd(18, ' ')} : ${value}`;
  const dailyRecapMetricHtml = (label: string, value: string) => (
    `<div style="display:grid;grid-template-columns:150px minmax(0,1fr);gap:14px;align-items:start;margin:3px 0"><span style="color:#475569">${label}</span><strong style="color:#0f172a">${value}</strong></div>`
  );
  const dailyRecapBudgetHtml = (label: string, value: number, suffix = ' €', percent = '') => (
    `<div style="display:grid;grid-template-columns:150px minmax(0,1fr);gap:14px;align-items:start;margin:3px 0"><span style="color:#475569">${label}</span><span>${dailyRecapDeltaHtml(value, suffix)}${percent}</span></div>`
  );

  const getDailyRecapService = (label: string, caCol: number, coversCol: number, tmCol: number, budgetCaCol: number, budgetCoversCol: number, budgetTmCol: number) => {
    const ca = parseDashboardNumber(getDailyCellValue(caCol));
    const covers = parseDashboardNumber(getDailyCellValue(coversCol));
    const tm = parseDashboardNumber(getDailyCellValue(tmCol));
    const budgetCa = parseDashboardNumber(getDailyCellValue(budgetCaCol));
    const budgetCovers = parseDashboardNumber(getDailyCellValue(budgetCoversCol));
    const budgetTm = parseDashboardNumber(getDailyCellValue(budgetTmCol));
    return { label, ca, covers, tm, budgetCa, budgetCovers, budgetTm };
  };

  const buildDailyRecapServiceText = (
    service: ReturnType<typeof getDailyRecapService>,
    manager: string,
    comment: string,
  ) => {
    const budgetLines = [
      service.budgetCa > 0 ? dailyRecapTextLine('CA', `${formatDailyRecapDelta(service.ca - service.budgetCa)} €${formatDailyRecapPercent(service.ca - service.budgetCa, service.budgetCa)}`) : '',
      service.budgetCovers > 0 && service.covers > 0 ? dailyRecapTextLine('Couverts', `${formatDailyRecapDelta(service.covers - service.budgetCovers, 0)}${formatDailyRecapPercent(service.covers - service.budgetCovers, service.budgetCovers)}`) : '',
      service.budgetTm > 0 && service.tm > 0 ? dailyRecapTextLine('Ticket moyen', `${formatDailyRecapDelta(service.tm - service.budgetTm)} €${formatDailyRecapPercent(service.tm - service.budgetTm, service.budgetTm)}`) : '',
    ].filter(Boolean);
    const lines = [
      `----- ${service.label.toUpperCase()} -----`,
      manager.trim() ? `Responsable : ${manager.trim()}` : '',
    ];
    if (service.ca > 0 || service.covers > 0 || service.tm > 0) {
      lines.push(
        '',
        'Réalisé',
        dailyRecapTextLine('CA HT', formatDailyRecapCurrency(service.ca)),
        ...(service.covers > 0 ? [dailyRecapTextLine('Couverts', formatDailyRecapInteger(service.covers))] : []),
        ...(service.tm > 0 ? [dailyRecapTextLine('Ticket moyen', formatDailyRecapTicket(service.tm))] : []),
      );
    }
    if (budgetLines.length > 0) lines.push('', 'Écart vs budget', ...budgetLines);
    if (comment.trim()) lines.push('', `Commentaire : ${comment.trim()}`);
    return lines.filter(line => line !== null && line !== undefined);
  };

  const buildDailyRecapServiceHtml = (
    service: ReturnType<typeof getDailyRecapService>,
    manager: string,
    comment: string,
  ) => {
    const realisedRows = [
      service.ca > 0 ? dailyRecapMetricHtml('CA HT', formatDailyRecapCurrency(service.ca)) : '',
      service.covers > 0 ? dailyRecapMetricHtml('Couverts', formatDailyRecapInteger(service.covers)) : '',
      service.tm > 0 ? dailyRecapMetricHtml('Ticket moyen', formatDailyRecapTicket(service.tm)) : '',
    ].filter(Boolean).join('');
    const budgetRows = [
      service.budgetCa > 0 ? dailyRecapBudgetHtml('CA', service.ca - service.budgetCa, ' €', formatDailyRecapPercent(service.ca - service.budgetCa, service.budgetCa)) : '',
      service.budgetCovers > 0 && service.covers > 0 ? dailyRecapBudgetHtml('Couverts', service.covers - service.budgetCovers, '', formatDailyRecapPercent(service.covers - service.budgetCovers, service.budgetCovers)) : '',
      service.budgetTm > 0 && service.tm > 0 ? dailyRecapBudgetHtml('Ticket moyen', service.tm - service.budgetTm, ' €', formatDailyRecapPercent(service.tm - service.budgetTm, service.budgetTm)) : '',
    ].filter(Boolean).join('');
    if (service.ca > 0 || service.covers > 0 || service.tm > 0) {
      return `<section style="margin:18px 0;padding:14px 16px;border:1px solid #dbe3ef;border-left:5px solid #0f766e;border-radius:10px;background:#ffffff">
        <h3 style="margin:0 0 10px;font-size:16px;color:#0f172a;text-transform:uppercase">${service.label}</h3>
        ${manager.trim() ? `<p style="margin:0 0 12px;color:#334155"><strong>Responsable :</strong> ${escapeDailyRecapHtml(manager.trim())}</p>` : ''}
        <p style="margin:0 0 4px;font-weight:700;color:#0f766e">Réalisé</p>
        <div style="margin:0 0 10px 0">${realisedRows}</div>
        ${budgetRows ? `<p style="margin:10px 0 4px;font-weight:700;color:#64748b">Écart vs budget</p><div style="margin:0 0 10px 0">${budgetRows}</div>` : ''}
        ${comment.trim() ? `<p style="margin:10px 0 0;padding:8px 10px;background:#f8fafc;border-radius:8px;color:#334155"><strong>Commentaire :</strong> ${escapeDailyRecapHtml(comment.trim())}</p>` : ''}
      </section>`;
    }
    return '';
  };

  const buildDailyRecapReport = (options: { managerMidi?: string; managerSoir?: string; commentMidi?: string; commentSoir?: string; googleRatings?: Record<number, string> } = {}) => {
    const totalCa = parseDashboardNumber(getDailyCellValue(21));
    const budgetCa = parseDashboardNumber(getDailyCellValue(3));
    const totalCovers = parseDashboardNumber(getDailyCellValue(29));
    const budgetCovers = parseDashboardNumber(getDailyCellValue(10));
    const ticketMoyen = parseDashboardNumber(getDailyCellValue(30));
    const budgetTicketMoyen = parseDashboardNumber(getDailyCellValue(11));
    const vae = parseDashboardNumber(getDailyCellValue(17));
    const limonade = parseDashboardNumber(getDailyCellValue(20));
    const limonadeCovers = parseDashboardNumber(getDailyCellValue(34));
    const limonadeTm = parseDashboardNumber(getDailyCellValue(35));
    const eventRestaurant = String(getDailyCellValue(37) || '').trim();
    const eventNational = String(getDailyCellValue(38) || '').trim();
    const midi = getDailyRecapService('Midi', 18, 25, 26, 0, 6, 7);
    const soir = getDailyRecapService('Soir', 19, 27, 28, 1, 8, 9);
    const googleRatings = [5, 4, 3, 2, 1]
      .map(stars => ({ stars, value: Number(String(options.googleRatings?.[stars] || '').replace(',', '.')) || 0 }))
      .filter(item => item.value > 0);

    const jourBudgetLines = [
      budgetCa > 0 ? dailyRecapTextLine('CA', `${formatDailyRecapDelta(totalCa - budgetCa)} €${formatDailyRecapPercent(totalCa - budgetCa, budgetCa)}`) : '',
      budgetCovers > 0 ? dailyRecapTextLine('Couverts', `${formatDailyRecapDelta(totalCovers - budgetCovers, 0)}${formatDailyRecapPercent(totalCovers - budgetCovers, budgetCovers)}`) : '',
      budgetTicketMoyen > 0 ? dailyRecapTextLine('Ticket moyen', `${formatDailyRecapDelta(ticketMoyen - budgetTicketMoyen)} €${formatDailyRecapPercent(ticketMoyen - budgetTicketMoyen, budgetTicketMoyen)}`) : '',
    ].filter(Boolean);
    const jourText = [
      '----- JOURNÉE -----',
      'Synthèse',
      dailyRecapTextLine('CA HT', formatDailyRecapCurrency(totalCa)),
      dailyRecapTextLine('Couverts', formatDailyRecapInteger(totalCovers)),
      dailyRecapTextLine('Ticket moyen', formatDailyRecapTicket(ticketMoyen)),
      vae > 0 ? dailyRecapTextLine('VAE', formatDailyRecapCurrency(vae)) : '',
      limonade > 0 ? dailyRecapTextLine('Limonade', `${formatDailyRecapCurrency(limonade)}${limonadeCovers > 0 ? ` | ${formatDailyRecapInteger(limonadeCovers)} couverts` : ''}${limonadeTm > 0 ? ` | TM ${formatDailyRecapTicket(limonadeTm)}` : ''}`) : '',
      ...(jourBudgetLines.length > 0 ? ['', 'Écart vs budget', ...jourBudgetLines] : []),
    ].filter(Boolean);

    const textSections = [
      'Bonsoir,',
      '',
      `Voici le récap de clôture du ${selectedDayLabel}.`,
      '',
      ...buildDailyRecapServiceText(midi, options.managerMidi || '', options.commentMidi || ''),
      '',
      ...buildDailyRecapServiceText(soir, options.managerSoir || '', options.commentSoir || ''),
      '',
      ...jourText,
      ...(eventRestaurant || eventNational ? ['', '----- ÉVÉNEMENTS -----', ...(eventRestaurant ? [dailyRecapTextLine('Restaurant', eventRestaurant)] : []), ...(eventNational ? [dailyRecapTextLine('National', eventNational)] : [])] : []),
      ...(googleRatings.length > 0 ? ['', '----- NOTES GOOGLE -----', ...googleRatings.map(item => dailyRecapTextLine(`${item.stars} étoile${item.stars > 1 ? 's' : ''}`, formatDailyRecapInteger(item.value)))] : []),
      '',
      'Bonne soirée,',
      '',
      'Cordialement,',
    ];

    const jourHtmlRows = [
      dailyRecapMetricHtml('CA HT', formatDailyRecapCurrency(totalCa)),
      dailyRecapMetricHtml('Couverts', formatDailyRecapInteger(totalCovers)),
      dailyRecapMetricHtml('Ticket moyen', formatDailyRecapTicket(ticketMoyen)),
      vae > 0 ? dailyRecapMetricHtml('VAE', formatDailyRecapCurrency(vae)) : '',
      limonade > 0 ? dailyRecapMetricHtml('Limonade', `${formatDailyRecapCurrency(limonade)}${limonadeCovers > 0 ? ` | ${formatDailyRecapInteger(limonadeCovers)} couverts` : ''}${limonadeTm > 0 ? ` | TM ${formatDailyRecapTicket(limonadeTm)}` : ''}`) : '',
    ].filter(Boolean).join('');
    const jourBudgetHtmlRows = [
      budgetCa > 0 ? dailyRecapBudgetHtml('CA', totalCa - budgetCa, ' €', formatDailyRecapPercent(totalCa - budgetCa, budgetCa)) : '',
      budgetCovers > 0 ? dailyRecapBudgetHtml('Couverts', totalCovers - budgetCovers, '', formatDailyRecapPercent(totalCovers - budgetCovers, budgetCovers)) : '',
      budgetTicketMoyen > 0 ? dailyRecapBudgetHtml('Ticket moyen', ticketMoyen - budgetTicketMoyen, ' €', formatDailyRecapPercent(ticketMoyen - budgetTicketMoyen, budgetTicketMoyen)) : '',
    ].filter(Boolean).join('');
    const optionalHtml = [
      eventRestaurant || eventNational ? `<section style="margin:18px 0;padding:14px 16px;border:1px solid #fde68a;border-left:5px solid #f59e0b;border-radius:10px;background:#fffbeb"><h3 style="margin:0 0 10px;font-size:16px;color:#92400e;text-transform:uppercase">Événements</h3>${eventRestaurant ? `<p style="margin:2px 0"><strong>Restaurant :</strong> ${escapeDailyRecapHtml(eventRestaurant)}</p>` : ''}${eventNational ? `<p style="margin:2px 0"><strong>National :</strong> ${escapeDailyRecapHtml(eventNational)}</p>` : ''}</section>` : '',
      googleRatings.length > 0 ? `<section style="margin:18px 0;padding:14px 16px;border:1px solid #dbe3ef;border-left:5px solid #64748b;border-radius:10px;background:#ffffff"><h3 style="margin:0 0 10px;font-size:16px;color:#0f172a;text-transform:uppercase">Notes Google</h3><div>${googleRatings.map(item => dailyRecapMetricHtml(`${item.stars} étoile${item.stars > 1 ? 's' : ''}`, formatDailyRecapInteger(item.value))).join('')}</div></section>` : '',
    ].filter(Boolean).join('');
    const html = `<div style="font-family:Arial,sans-serif;color:#111827;line-height:1.45;max-width:720px">
      <p style="margin:0 0 12px">Bonsoir,</p>
      <div style="margin:0 0 18px;padding:14px 16px;border-radius:10px;background:#ecfeff;border:1px solid #a5f3fc">
        <p style="margin:0;color:#0f766e;font-weight:700;text-transform:uppercase;font-size:12px;letter-spacing:.04em">Récapitulatif de clôture</p>
        <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#0f172a">${escapeDailyRecapHtml(selectedDayLabel)}</p>
      </div>
      ${buildDailyRecapServiceHtml(midi, options.managerMidi || '', options.commentMidi || '')}
      ${buildDailyRecapServiceHtml(soir, options.managerSoir || '', options.commentSoir || '')}
      <section style="margin:18px 0;padding:14px 16px;border:1px solid #bfdbfe;border-left:5px solid #2563eb;border-radius:10px;background:#eff6ff">
        <h3 style="margin:0 0 10px;font-size:16px;color:#1e3a8a;text-transform:uppercase">Journée</h3>
        <p style="margin:0 0 4px;font-weight:700;color:#1d4ed8">Synthèse</p>
        <div style="margin:0 0 10px 0">${jourHtmlRows}</div>
        ${jourBudgetHtmlRows ? `<p style="margin:10px 0 4px;font-weight:700;color:#64748b">Écart vs budget</p><div style="margin:0 0 10px 0">${jourBudgetHtmlRows}</div>` : ''}
      </section>
      ${optionalHtml}
      <p style="margin:18px 0 0">Bonne soirée,</p>
      <p style="margin:12px 0 0">Cordialement,</p>
    </div>`;

    return { text: textSections.filter(line => line !== null && line !== undefined).join('\n'), html };
  };

  const buildDailyRecapText = (options: { managerMidi?: string; managerSoir?: string; commentMidi?: string; commentSoir?: string; googleRatings?: Record<number, string> } = {}) => buildDailyRecapReport(options).text;
  const buildDailyRecapHtml = (options: { managerMidi?: string; managerSoir?: string; commentMidi?: string; commentSoir?: string; googleRatings?: Record<number, string> } = {}) => buildDailyRecapReport(options).html;
  const buildOutlookComposeUrl = (subject: string, textBody?: string) => {
    const baseUrl = 'https://outlook.office.com/mail/deeplink/compose';
    const subjectParam = `subject=${encodeURIComponent(subject)}`;
    if (!textBody) return `${baseUrl}?${subjectParam}`;

    const url = `${baseUrl}?${subjectParam}&body=${encodeURIComponent(textBody)}`;
    if (url.length < 8000) return url;

    return `${baseUrl}?${subjectParam}`;
  };
  const copyDailyRecapImageToClipboard = async (
    recapHtml: string,
    ClipboardItemCtor: typeof ClipboardItem,
  ) => {
    const captureHost = document.createElement('div');
    captureHost.style.position = 'fixed';
    captureHost.style.left = '-10000px';
    captureHost.style.top = '0';
    captureHost.style.width = '780px';
    captureHost.style.padding = '24px';
    captureHost.style.background = '#ffffff';
    captureHost.style.zIndex = '-1';
    captureHost.innerHTML = recapHtml;
    document.body.appendChild(captureHost);

    try {
      await document.fonts?.ready;
      await new Promise(resolve => window.requestAnimationFrame(resolve));
      const target = (captureHost.firstElementChild as HTMLElement | null) || captureHost;
      target.style.width = '720px';
      target.style.maxWidth = '720px';
      target.style.background = '#ffffff';

      const blob = await domtoimage.toBlob(target, {
        bgcolor: '#ffffff',
        quality: 1,
        width: target.scrollWidth,
        height: target.scrollHeight,
        style: {
          width: '720px',
          maxWidth: '720px',
          overflow: 'visible',
        },
      });

      await navigator.clipboard.write([new ClipboardItemCtor({ 'image/png': blob })]);
    } finally {
      document.body.removeChild(captureHost);
    }
  };
  const copyDailyRecapCanvasImageToClipboard = async (
    options: { managerMidi?: string; managerSoir?: string; commentMidi?: string; commentSoir?: string; googleRatings?: Record<number, string> },
    ClipboardItemCtor: typeof ClipboardItem,
  ) => {
    const totalCa = parseDashboardNumber(getDailyCellValue(21));
    const budgetCa = parseDashboardNumber(getDailyCellValue(3));
    const totalCovers = parseDashboardNumber(getDailyCellValue(29));
    const budgetCovers = parseDashboardNumber(getDailyCellValue(10));
    const ticketMoyen = parseDashboardNumber(getDailyCellValue(30));
    const budgetTicketMoyen = parseDashboardNumber(getDailyCellValue(11));
    const vae = parseDashboardNumber(getDailyCellValue(17));
    const limonade = parseDashboardNumber(getDailyCellValue(20));
    const midi = getDailyRecapService('Midi', 18, 25, 26, 0, 6, 7);
    const soir = getDailyRecapService('Soir', 19, 27, 28, 1, 8, 9);
    const googleRatings = [5, 4, 3, 2, 1]
      .map(stars => ({ stars, value: Number(String(options.googleRatings?.[stars] || '').replace(',', '.')) || 0 }))
      .filter(item => item.value > 0);

    const width = 620;
    const pad = 22;
    const cardGap = 12;
    const lineH = 20;
    type CanvasRecapRow = { label: string; value: string; color?: string; header?: boolean };
    const rows: CanvasRecapRow[] = [];
    const sections: Array<{ title: string; accent: string; rows: CanvasRecapRow[]; manager?: string; comment?: string }> = [];
    const deltaColor = (value: number) => value < 0 ? '#dc2626' : value > 0 ? '#15803d' : '#334155';
    const deltaText = (value: number, suffix = '', budget = 0, decimals = 2) => `${formatDailyRecapDelta(value, decimals)}${suffix}${formatDailyRecapPercent(value, budget)}`;
    const pushService = (service: ReturnType<typeof getDailyRecapService>, manager: string, comment: string, accent: string) => {
      const serviceRows = [
        { label: 'Réalisé', value: '', header: true },
        { label: 'CA HT', value: formatDailyRecapCurrency(service.ca) },
        ...(service.covers > 0 ? [{ label: 'Couverts', value: formatDailyRecapInteger(service.covers) }] : []),
        ...(service.tm > 0 ? [{ label: 'Ticket moyen', value: formatDailyRecapTicket(service.tm) }] : []),
        ...(service.budgetCa > 0 || (service.budgetCovers > 0 && service.covers > 0) || (service.budgetTm > 0 && service.tm > 0) ? [{ label: 'Écart vs budget', value: '', header: true }] : []),
        ...(service.budgetCa > 0 ? [{ label: 'CA', value: deltaText(service.ca - service.budgetCa, ' €', service.budgetCa), color: deltaColor(service.ca - service.budgetCa) }] : []),
        ...(service.budgetCovers > 0 && service.covers > 0 ? [{ label: 'Couverts', value: deltaText(service.covers - service.budgetCovers, '', service.budgetCovers, 0), color: deltaColor(service.covers - service.budgetCovers) }] : []),
        ...(service.budgetTm > 0 && service.tm > 0 ? [{ label: 'Ticket moyen', value: deltaText(service.tm - service.budgetTm, ' €', service.budgetTm), color: deltaColor(service.tm - service.budgetTm) }] : []),
      ];
      sections.push({ title: service.label, accent, rows: serviceRows, manager: manager.trim(), comment: comment.trim() });
    };
    pushService(midi, options.managerMidi || '', options.commentMidi || '', '#0f766e');
    pushService(soir, options.managerSoir || '', options.commentSoir || '', '#0f766e');
    rows.push(
      { label: 'Synthèse', value: '', header: true },
      { label: 'CA HT', value: formatDailyRecapCurrency(totalCa) },
      { label: 'Couverts', value: formatDailyRecapInteger(totalCovers) },
      { label: 'Ticket moyen', value: formatDailyRecapTicket(ticketMoyen) },
    );
    if (vae > 0) rows.push({ label: 'VAE', value: formatDailyRecapCurrency(vae) });
    if (limonade > 0) rows.push({ label: 'Limonade', value: formatDailyRecapCurrency(limonade) });
    if (budgetCa > 0 || budgetCovers > 0 || budgetTicketMoyen > 0) rows.push({ label: 'Écart vs budget', value: '', header: true });
    if (budgetCa > 0) rows.push({ label: 'CA', value: deltaText(totalCa - budgetCa, ' €', budgetCa), color: deltaColor(totalCa - budgetCa) });
    if (budgetCovers > 0) rows.push({ label: 'Couverts', value: deltaText(totalCovers - budgetCovers, '', budgetCovers, 0), color: deltaColor(totalCovers - budgetCovers) });
    if (budgetTicketMoyen > 0) rows.push({ label: 'Ticket moyen', value: deltaText(ticketMoyen - budgetTicketMoyen, ' €', budgetTicketMoyen), color: deltaColor(ticketMoyen - budgetTicketMoyen) });
    sections.push({ title: 'Journée', accent: '#2563eb', rows });
    if (googleRatings.length > 0) {
      sections.push({
        title: 'Notes Google',
        accent: '#64748b',
        rows: googleRatings.map(item => ({ label: `${item.stars} étoile${item.stars > 1 ? 's' : ''}`, value: formatDailyRecapInteger(item.value) })),
      });
    }

    const cardHeight = (section: typeof sections[number]) => (
      50 + section.rows.length * lineH + (section.manager ? 22 : 0) + (section.comment ? 30 : 0)
    );
    const contentHeight = 106 + sections.reduce((sum, section) => sum + cardHeight(section) + cardGap, 0) + 90;
    const dpr = 1;
    const canvas = document.createElement('canvas');
    canvas.width = width * dpr;
    canvas.height = contentHeight * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas indisponible');
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, contentHeight);

    const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };
    const drawText = (text: string, x: number, y: number, size = 13, weight = '400', color = '#111827') => {
      ctx.font = `${weight} ${size}px Arial, sans-serif`;
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
    };

    drawText('Bonsoir,', pad, 30, 13, '400');
    ctx.fillStyle = '#ecfeff';
    roundRect(pad, 46, width - pad * 2, 48, 8);
    ctx.fill();
    ctx.strokeStyle = '#a5f3fc';
    ctx.stroke();
    drawText('Récapitulatif de clôture', pad + 14, 68, 10, '700', '#0f766e');
    drawText(selectedDayLabel, pad + 14, 88, 15, '700', '#0f172a');

    let y = 112;
    sections.forEach(section => {
      const h = cardHeight(section);
      ctx.fillStyle = section.title === 'Journée' ? '#eff6ff' : '#ffffff';
      roundRect(pad, y, width - pad * 2, h, 8);
      ctx.fill();
      ctx.strokeStyle = '#dbe3ef';
      ctx.stroke();
      ctx.fillStyle = section.accent;
      roundRect(pad, y, 5, h, 5);
      ctx.fill();
      drawText(section.title.toUpperCase(), pad + 16, y + 24, 13, '700', '#0f172a');
      let cy = y + 46;
      if (section.manager) {
        drawText(`Responsable : ${section.manager}`, pad + 16, cy, 12, '700', '#334155');
        cy += 22;
      }
      section.rows.forEach(row => {
        if (row.header) {
          drawText(row.label, pad + 16, cy, 12, '700', section.accent === '#2563eb' ? '#1d4ed8' : section.accent);
          cy += lineH;
          return;
        }
        drawText(row.label, pad + 16, cy, 12, '400', '#475569');
        drawText(row.value, pad + 185, cy, 12, '700', row.color || '#0f172a');
        cy += lineH;
      });
      if (section.comment) {
        drawText(`Commentaire : ${section.comment}`, pad + 16, cy + 8, 12, '700', '#334155');
      }
      y += h + cardGap;
    });
    drawText('Bonne soirée,', pad, y + 8, 13, '400');
    drawText('Cordialement,', pad, y + 32, 13, '400');

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(nextBlob => nextBlob ? resolve(nextBlob) : reject(new Error('Image non générée')), 'image/png');
    });
    await navigator.clipboard.write([new ClipboardItemCtor({ 'image/png': blob })]);
  };

  const openDailyRecapPreview = () => {
    setDailyRecapStatus('');
    setIsDailyRecapModalOpen(true);
  };

  const handleValidateDailyRecapMail = async () => {
    const subject = `Chiffres du jour - ${selectedDayLabel}`;
    const recapOptions = {
      managerMidi: dailyRecapManagers.midi,
      managerSoir: dailyRecapManagers.soir,
      commentMidi: dailyRecapServiceComments.midi,
      commentSoir: dailyRecapServiceComments.soir,
      googleRatings: dailyRecapGoogleRatings,
    };
    const { text: recapText, html: recapHtml } = buildDailyRecapReport(recapOptions);
    const outlookUrl = buildOutlookComposeUrl(subject);
    const ClipboardItemCtor = (window as Window & { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
    const openOutlook = () => {
      const opened = window.open(outlookUrl, '_blank');
      if (!opened) window.location.href = outlookUrl;
    };

    if (typeof navigator.clipboard?.write === 'function' && ClipboardItemCtor) {
      try {
        await copyDailyRecapCanvasImageToClipboard(recapOptions, ClipboardItemCtor);
        openOutlook();
        setIsDailyRecapModalOpen(false);
        setDailyRecapStatus('Image copiée. Dans Outlook, clique dans le corps du mail puis Ctrl+V.');
        return;
      } catch {
        // Si la capture image echoue, on tente le fallback HTML juste apres.
      }
    }

    try {
      if (navigator.clipboard?.write && ClipboardItemCtor) {
        await navigator.clipboard.write([new ClipboardItemCtor({
          'text/html': new Blob([recapHtml], { type: 'text/html' }),
          'text/plain': new Blob([recapText], { type: 'text/plain' }),
        })]);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(recapText);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = recapText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      openOutlook();
      setIsDailyRecapModalOpen(false);
      setDailyRecapStatus('Récap copié. Colle-le dans le corps du mail Outlook avec Ctrl+V.');
    } catch {
      window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(recapText)}`;
      setIsDailyRecapModalOpen(false);
      setDailyRecapStatus("Mail ouvert en mode texte. Si la messagerie ne s'ouvre pas, le navigateur a bloqué le raccourci.");
    }
  };
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

  const handleExport = () => {
    const table = document.getElementById('dashboard-table');
    if (!table) return;
    
    // Create a new workbook and add the table
    const wb = XLSX.utils.table_to_book(table, { sheet: "Dashboard" });
    
    // Generate Excel file and trigger download
    XLSX.writeFile(wb, `Dashboard_${monthNames[month]}_${year}.xlsx`);
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
        CA_Realise: parseFloat(calculatedData[`${i}-24`] || '0'),
        CA_Budget: parseFloat(calculatedData[`${i}-3`] || '0')
      };
    });
  }, [rows, calculatedData]);

  const chartDataFG = useMemo(() => {
    const fg = (b: number, g: number) => parseFloat((calculatedData[`fg-total-${b}-${g}`] || '0').replace(',', '.').replace(/[^0-9.-]/g, ''));
    
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
      <aside style={{ 
        width: isSidebarOpen ? 260 : 0,
        minWidth: isSidebarOpen ? 260 : 0,
        background: sidebarTheme, 
        color: '#fff', 
        display: 'flex', 
        flexDirection: 'column', 
        flexShrink: 0, 
        boxShadow: isSidebarOpen ? '4px 0 15px rgba(0,0,0,0.05)' : 'none',
        zIndex: 100,
        position: isMobile ? 'absolute' : 'relative',
        height: '100%',
        overflow: 'hidden',
        transition: 'width 0.3s ease, min-width 0.3s ease'
      }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
            <ChevronLeft size={16} /> Retour Accueil
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '24px 0 0 0', letterSpacing: '-0.02em', color: '#f8fafc' }}>Tableau de Bord</h1>
          <div style={{ fontSize: 14, color: '#94a3b8', marginTop: 4, fontWeight: 500 }}>Année {year}</div>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 4, scrollbarWidth: 'none' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 12px 12px 12px' }}>Sélection du mois</div>
          {monthNames.map((m, i) => (
            <button
              key={i}
              onClick={() => setMonth(i)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px',
                background: month === i ? '#3b82f6' : 'transparent',
                color: month === i ? '#fff' : '#cbd5e1',
                border: 'none', borderRadius: 8, cursor: 'pointer',
                fontSize: 14, fontWeight: month === i ? 700 : 500,
                textTransform: 'capitalize', transition: 'all 0.2s',
                textAlign: 'left',
                boxShadow: month === i ? '0 4px 6px -1px rgba(59, 130, 246, 0.3)' : 'none'
              }}
              onMouseEnter={e => { if (month !== i) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#fff'; } }}
              onMouseLeave={e => { if (month !== i) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#cbd5e1'; } }}
            >
              {m}
              {month === i && <ChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} />}
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f8fafc' }}>
        
        {/* Top Header for Sections */}
        <header style={{ background: sidebarThemeWide, borderBottom: '1px solid rgba(125, 211, 252, .24)', padding: isMobile ? '0 16px' : '0 24px', display: 'flex', flexDirection: 'column', flexShrink: 0, zIndex: 90, position: 'relative', boxShadow: '0 14px 32px rgba(15, 23, 42, .20), inset 0 -1px 0 rgba(255,255,255,.06)' }}>
          <div style={{ width: '100%', maxWidth: 1320, margin: '0 auto', minHeight: isMobile ? 86 : 78, padding: isMobile ? '12px 0' : '14px 0 10px', display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 16, flexDirection: isMobile ? 'column' : 'row' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 0 }}>
              <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#cbd5e1', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 800, padding: 0, flexShrink: 0 }}>
                <ChevronLeft size={16} /> Retour Accueil
              </button>
              {tableViewMode === 'SAISIE' ? (
                <div ref={datePickerRef} style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setIsDatePickerOpen(prev => !prev)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(207,250,254,.14)', borderRadius: 14, cursor: 'pointer', color: '#fff', padding: isMobile ? '9px 11px' : '10px 14px', textAlign: 'left', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08)' }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em' }}>Saisie journalière</span>
                    <span style={{ fontSize: isMobile ? 21 : 25, fontWeight: 950, textTransform: 'capitalize', lineHeight: 1.1, color: '#fef3c7' }}>{selectedDayLabel}</span>
                  </button>
                  {isDatePickerOpen && renderDatePicker()}
                </div>
              ) : (
                <div ref={datePickerRef} style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setIsDatePickerOpen(prev => !prev)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(207,250,254,.14)', borderRadius: 14, cursor: 'pointer', color: '#fff', padding: isMobile ? '9px 11px' : '10px 14px', textAlign: 'left', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08)' }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em' }}>{tableViewMode === 'ANALYSE' ? 'Vue analyse' : 'Vue complète'}</span>
                    <span style={{ fontSize: isMobile ? 21 : 25, fontWeight: 950, textTransform: 'capitalize', lineHeight: 1.1, color: '#fef3c7' }}>{monthNames[month]} {year}</span>
                  </button>
                  {isDatePickerOpen && renderDatePicker()}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignSelf: tableViewMode === 'SAISIE' && isMobile ? 'stretch' : 'auto', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button onClick={() => setIsImportModalOpen(true)} style={actionTileStyle} onMouseEnter={e => e.currentTarget.style.background = weatherThemeHover} onMouseLeave={e => e.currentTarget.style.background = weatherTheme}>
                <Upload size={isMobile ? 14 : 16} /> {isMobile ? '' : 'Importer'}
              </button>
              {tableViewMode === 'SAISIE' && (
                <button onClick={openDailyRecapPreview} style={actionTileStyle} onMouseEnter={e => e.currentTarget.style.background = weatherThemeHover} onMouseLeave={e => e.currentTarget.style.background = weatherTheme} title={dailyRecapStatus || 'Préparer le récap mail du jour'}>
                  <Clipboard size={isMobile ? 14 : 16} /> {isMobile ? '' : 'Récap mail'}
                </button>
              )}
              <button onClick={handleExportPDF} style={actionTileStyle} onMouseEnter={e => e.currentTarget.style.background = weatherThemeHover} onMouseLeave={e => e.currentTarget.style.background = weatherTheme}>
                <FileDown size={isMobile ? 14 : 16} /> {isMobile ? '' : 'PDF'}
              </button>
              <button onClick={handleExport} style={actionTileStyle} onMouseEnter={e => e.currentTarget.style.background = weatherThemeHover} onMouseLeave={e => e.currentTarget.style.background = weatherTheme}>
                <Download size={isMobile ? 14 : 16} /> {isMobile ? '' : 'Excel'}
              </button>
              {tableViewMode === 'SAISIE' && (
                <button
                  type="button"
                  onClick={handleTemporaryResetLocalData}
                  style={{ ...actionTileStyle, background: '#7f1d1d', borderColor: 'rgba(254, 202, 202, .35)', color: '#fee2e2' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#991b1b'}
                  onMouseLeave={e => e.currentTarget.style.background = '#7f1d1d'}
                  title="RAZ provisoire des donnees locales"
                >
                  <Trash2 size={isMobile ? 14 : 16} /> {isMobile ? '' : 'RAZ'}
                </button>
              )}
            </div>
          </div>

          {false && tableViewMode !== 'SAISIE' && tableViewMode !== 'ANALYSE' && (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(7, minmax(116px, 1fr))', gap: 8, padding: isMobile ? '0 0 12px' : '0 0 12px', overflowX: isMobile ? 'visible' : 'auto' }}>
              {[
                { label: 'CA budget', value: formatKpiCurrency(summaryKpis.budgetCa), color: '#64748b', icon: '€' },
                { label: 'CA réalisé', value: formatKpiCurrency(summaryKpis.realiseCa), color: '#2563eb', icon: 'CA' },
                { label: 'Écart CA', value: formatKpiCurrency(summaryKpis.ecartCa), color: summaryKpis.ecartCa >= 0 ? '#059669' : '#dc2626', icon: summaryKpis.ecartCa >= 0 ? '+' : '-' },
                { label: 'Couverts', value: formatKpiNumber(summaryKpis.couverts), color: '#7c3aed', icon: 'CV' },
                { label: 'Ticket moyen', value: formatKpiCurrency(summaryKpis.ticketMoyen), color: '#d97706', icon: 'TM' },
                { label: 'Coût matière', value: formatKpiCurrency(summaryKpis.coutMatiere), color: '#16a34a', icon: 'CM' },
                { label: 'Frais personnel', value: formatKpiCurrency(summaryKpis.fraisPersonnel), color: '#9333ea', icon: 'SC' },
              ].map(kpi => (
                <div
                  key={kpi.label}
                  style={{
                    minWidth: 0,
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    borderRadius: 10,
                    padding: isMobile ? '8px 10px' : '9px 11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                  }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: `${kpi.color}14`, color: kpi.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, flexShrink: 0 }}>
                    {kpi.icon}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{kpi.label}</div>
                    <div style={{ fontSize: isMobile ? 13 : 14, color: '#0f172a', fontWeight: 900, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{kpi.value}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Section Tabs */}
          <div style={{ width: '100%', maxWidth: 1320, margin: '0 auto', padding: isMobile ? '0 0 12px' : '0 0 14px', display: 'flex', gap: 8, background: 'transparent', borderBottom: 'none', alignItems: 'center', flexShrink: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 4, border: '1px solid rgba(255,255,255,.18)', borderRadius: 10, background: 'rgba(255,255,255,.10)', flexShrink: 0 }}>
              <span style={{ padding: '0 6px', fontSize: 10, fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em' }}>Vue</span>
              {viewModes.map(mode => {
                const isModeActive = tableViewMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setTableViewMode(mode.id)}
                    style={{
                      border: 'none',
                      borderRadius: 7,
                      background: isModeActive ? '#fff' : 'transparent',
                      color: isModeActive ? '#0f172a' : '#cbd5e1',
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '6px 9px',
                      whiteSpace: 'nowrap',
                      transition: 'all .15s',
                    }}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>
            {tableViewMode !== 'SAISIE' && tableViewMode !== 'ANALYSE' && tabs.map(tab => {
              const isActive = activeTab === tab.id;
              let icon = '📁';
              let accentBg = '#475569';
              const accentColor = '#fff';
              
              switch (tab.id) {
                case 'PREVISIONS': icon = 'PR'; accentBg = '#92400e'; break;
                case 'REALISE': icon = 'RE'; accentBg = '#1e40af'; break;
                case 'COUT_MATIERE': icon = 'CM'; accentBg = '#166534'; break;
                case 'PERSONNEL': icon = 'FP'; accentBg = '#6b21a8'; break;
                case 'FRAIS_GENERAUX': icon = 'FG'; accentBg = '#b45309'; break;
                case 'RESULTATS': icon = 'RM'; accentBg = '#be123c'; break;
              }

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '9px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                    background: isActive ? accentBg : 'rgba(255,255,255,.10)',
                    border: `1.5px solid ${isActive ? accentBg : 'rgba(255,255,255,.18)'}`,
                    boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : 'inset 0 1px 0 rgba(255,255,255,.08)',
                    transition: 'all .15s',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span style={{ width: 22, height: 22, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isActive ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.14)', color: isActive ? '#fff' : '#cbd5e1', fontSize: 9, fontWeight: 900 }}>{icon}</span>
                  <span style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? accentColor : '#e2e8f0', letterSpacing: '.02em', lineHeight: 1.3 }}>{tab.label}</span>
                  </span>
                  {isActive && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 2 }}>
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </header>

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
                      const numVal = parseFloat(String(val).replace(',', '.'));
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
                              onKeyDown={(e: any) => handleKeyDown(e, rIdx, cIdx)}
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
                      const fg = (b: number, g: number) => parseFloat((calculatedData[`fg-total-${b}-${g}`] || '0,00 €').replace(',','.').replace(' €',''));
                      const caR  = parseFloat(calculatedData[`${mtIdx}-24`] || '0');
                      const cvtsMidi = parseFloat(calculatedData[`${mtIdx}-6`]  || '0');
                      const cvtsSoir = parseFloat(calculatedData[`${mtIdx}-8`]  || '0');
                      const cvtsResto = cvtsMidi + cvtsSoir;
                      const cvtsLimo  = parseFloat(calculatedData[`${mtIdx}-14`] || '0');
                      const caLimo    = parseFloat(calculatedData[`${mtIdx}-2`]  || '0');
                      const wDays = rows.filter(r => r.type === 'day' && !r.isWeekend).length;
                      const stockInit  = parseFloat(cellData['rm_stock_init']  || '0');
                      const stockFinal = parseFloat(cellData['rm_stock_final'] || '0');
                      const varStock   = stockFinal - stockInit;
                      const achatHM    = parseFloat(cellData['rm_achat_hm']    || '0');
                      const achatTotal = parseFloat(cellData['rm_achat_total'] || '0');
                      const ratioObj   = 24.50;
                      const consoObj   = caR * (ratioObj / 100);
                      const consoReel  = achatTotal + varStock;
                      const ratioReel  = caR > 0 ? (consoReel / caR) * 100 : 0;
                      const margeReel  = caR - consoReel;
                      const nbHBudget  = parseFloat(calculatedData[`${mtIdx}-61`] || '0');
                      const coutProj   = parseFloat(calculatedData[`${mtIdx}-72`] || '0');
                      const nbHReel    = parseFloat(calculatedData[`${mtIdx}-76`] || '0');
                      const coutReel   = parseFloat(calculatedData[`${mtIdx}-87`] || '0');

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
                              value={focusedCell === rmRow.key ? (cellData[rmRow.key!] || '') : (cellData[rmRow.key!] ? eur(parseFloat(cellData[rmRow.key!])) : '')}
                              onChange={value => updateDashboard(month, rmRow.key!, String(value).replace(/[^0-9.,]/g,'').replace(',','.'))}
                              onFocus={() => setFocusedCell(rmRow.key!)}
                              onBlur={() => setFocusedCell(null)}
                              onKeyDown={(e: any) => handleKeyDown(e, rIdx, cIdx)}
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
                              onKeyDown={(e: any) => handleKeyDown(e, rIdx, cIdx)}
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 105, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 10 : 18 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 'min(980px, 100%)', maxWidth: 'calc(100vw - 36px)', maxHeight: 'calc(100vh - 36px)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.16), 0 10px 10px -5px rgba(0, 0, 0, 0.08)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <h3 style={{ fontSize: 18, fontWeight: 850, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clipboard size={20} color="#0f766e" /> Préparer le mail de clôture
              </h3>
              <button onClick={() => setIsDailyRecapModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4, borderRadius: 4 }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: isMobile ? 14 : 20, overflow: 'auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(280px, .75fr) minmax(420px, 1.25fr)', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ padding: 12, border: '1px solid #dbeafe', borderRadius: 10, background: '#eff6ff', color: '#1e3a8a', fontSize: 12, lineHeight: 1.45, fontWeight: 750 }}>
                  Vérifie le contenu avant ouverture du mail. Le texte sera aussi copié dans le presse-papiers.
                </div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Responsable midi</span>
                  <input
                    value={dailyRecapManagers.midi}
                    onChange={event => setDailyRecapManagers(prev => ({ ...prev, midi: event.target.value }))}
                    style={{ height: 38, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 10px', fontWeight: 800, color: '#0f172a' }}
                    placeholder="Nom du responsable"
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Commentaire midi</span>
                  <textarea
                    value={dailyRecapServiceComments.midi}
                    onChange={event => setDailyRecapServiceComments(prev => ({ ...prev, midi: event.target.value }))}
                    style={{ minHeight: 70, resize: 'vertical', border: '1px solid #cbd5e1', borderRadius: 8, padding: 10, fontWeight: 700, color: '#0f172a', lineHeight: 1.45 }}
                    placeholder="Commentaire spécifique au service midi..."
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Responsable soir</span>
                  <input
                    value={dailyRecapManagers.soir}
                    onChange={event => setDailyRecapManagers(prev => ({ ...prev, soir: event.target.value }))}
                    style={{ height: 38, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 10px', fontWeight: 800, color: '#0f172a' }}
                    placeholder="Nom du responsable"
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Commentaire soir</span>
                  <textarea
                    value={dailyRecapServiceComments.soir}
                    onChange={event => setDailyRecapServiceComments(prev => ({ ...prev, soir: event.target.value }))}
                    style={{ minHeight: 70, resize: 'vertical', border: '1px solid #cbd5e1', borderRadius: 8, padding: 10, fontWeight: 700, color: '#0f172a', lineHeight: 1.45 }}
                    placeholder="Commentaire spécifique au service soir..."
                  />
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Notes Google du jour</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 6 }}>
                    {[1, 2, 3, 4, 5].map(stars => (
                      <label key={stars} style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 900, color: '#475569', textTransform: 'uppercase', textAlign: 'center' }}>{stars}*</span>
                        <input
                          type="number"
                          min="0"
                          value={dailyRecapGoogleRatings[stars] || ''}
                          onChange={event => setDailyRecapGoogleRatings(prev => ({ ...prev, [stars]: event.target.value.replace(/[^0-9]/g, '') }))}
                          style={{ height: 34, minWidth: 0, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 6px', fontWeight: 850, color: '#0f172a', textAlign: 'center' }}
                          placeholder="0"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Aperçu du mail</div>
                <div
                  ref={recapPreviewRef}
                  style={{ margin: 0, minHeight: 360, maxHeight: '55vh', overflow: 'auto', border: '1px solid #cbd5e1', borderRadius: 10, background: '#f8fafc', padding: 16, color: '#0f172a', fontSize: 14, lineHeight: 1.5, fontFamily: "'DM Sans', system-ui, sans-serif" }}
                  dangerouslySetInnerHTML={{
                    __html: buildDailyRecapHtml({
                      managerMidi: dailyRecapManagers.midi,
                      managerSoir: dailyRecapManagers.soir,
                      commentMidi: dailyRecapServiceComments.midi,
                      commentSoir: dailyRecapServiceComments.soir,
                      googleRatings: dailyRecapGoogleRatings,
                    }),
                  }}
                />
              </div>
            </div>
            <div style={{ padding: '14px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={() => setIsDailyRecapModalOpen(false)} style={{ height: 38, padding: '0 14px', background: '#fff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, fontWeight: 850, cursor: 'pointer' }}>
                Annuler
              </button>
              <button type="button" onClick={handleValidateDailyRecapMail} style={{ height: 38, padding: '0 16px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 900, cursor: 'pointer' }}>
                Valider et ouvrir le mail
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Import Modal */}
      {isImportModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? 10 : 18 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 'min(1120px, 100%)', maxWidth: 'calc(100vw - 36px)', maxHeight: 'calc(100vh - 36px)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Upload size={20} color="#10b981" />
                Importer des données
              </h3>
              <button onClick={() => setIsImportModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4, borderRadius: 4 }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: isMobile ? 14 : 20, overflow: 'auto' }}>
              <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, margin: '0 0 14px' }}>
                Importez une feuille de caisse PDF. Seule la partie realise du suivi quotidien sera remplie :
                VAE, CA midi, CA soir et couverts.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(240px, 1fr))', gap: 12 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 14, border: '1px dashed #93c5fd', borderRadius: 10, background: '#eff6ff' }}>
                  <span style={{ fontSize: 12, fontWeight: 900, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '.04em' }}>Feuille de caisse</span>
                  <span style={{ fontSize: 12, color: '#475569', lineHeight: 1.45 }}>
                    Lecture locale de plusieurs feuilles possible, avec validation une par une avant application.
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.txt,text/plain,application/pdf"
                    onChange={handleDailyRealiseImport}
                    multiple
                    style={{ fontSize: 13, color: '#0f172a' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 14, border: '1px dashed #86efac', borderRadius: 10, background: '#f0fdf4' }}>
                  <span style={{ fontSize: 12, fontWeight: 900, color: '#166534', textTransform: 'uppercase', letterSpacing: '.04em' }}>Facture fournisseur</span>
                  <span style={{ fontSize: 12, color: '#475569', lineHeight: 1.45 }}>
                    Lecture locale : fournisseur, date et montant HT. Les fichiers ne sont pas conserves.
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.txt,text/plain,application/pdf"
                    onChange={handleInvoiceImport}
                    multiple
                    style={{ fontSize: 13, color: '#0f172a' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 14, border: '1px dashed #c084fc', borderRadius: 10, background: '#faf5ff' }}>
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
                    Lit uniquement le mois affiché et importe les prévisions couverts + TM ainsi que le réalisé CA/couverts. Les totaux restent calculés par l'application.
                  </span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={handleHistoricalBudgetExcelImport}
                    style={{ fontSize: 13, color: '#0f172a' }}
                  />
                </label>
              </div>

              {historicalBudgetStatus && (
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
                        {historicalBudgetPreviews.length} jours · CA recalculé estimé {formatImportedCurrencyLabel(historicalBudgetPreviews.reduce((sum, item) => sum + item.caTotal, 0))} · Couverts {formatImportedIntegerLabel(historicalBudgetPreviews.reduce((sum, item) => sum + item.couvertsTotal, 0))}
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
                        <div style={{ fontSize: 11, fontWeight: 800 }}>Cts midi {formatImportedIntegerLabel(item.couvertsMidi)}</div>
                        <div style={{ fontSize: 11, fontWeight: 800 }}>TM midi {formatImportedCurrencyLabel(item.tmMidi)}</div>
                        <div style={{ fontSize: 11, fontWeight: 800 }}>Cts soir {formatImportedIntegerLabel(item.couvertsSoir)}</div>
                        <div style={{ fontSize: 11, fontWeight: 800 }}>TM soir {formatImportedCurrencyLabel(item.tmSoir)}</div>
                      </div>
                    ))}
                    {historicalBudgetPreviews.length > 40 && <div style={{ fontSize: 12, fontWeight: 800, color: '#92400e' }}>+ {historicalBudgetPreviews.length - 40} lignes non affichees dans l'aperçu</div>}
                  </div>
                </div>
              )}

              {salaryImportStatus && (
                <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: salaryImportStatus.startsWith('Erreur') ? '#fef2f2' : '#faf5ff', border: `1px solid ${salaryImportStatus.startsWith('Erreur') ? '#fecaca' : '#e9d5ff'}`, color: salaryImportStatus.startsWith('Erreur') ? '#991b1b' : '#6b21a8', fontSize: 13, fontWeight: 800 }}>
                  {salaryImportStatus}
                </div>
              )}

              {invoiceImportStatus && (
                <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: invoiceImportStatus.startsWith('Erreur') ? '#fef2f2' : invoiceImportStatus.includes('verifier') ? '#fffbeb' : '#f0fdf4', border: `1px solid ${invoiceImportStatus.startsWith('Erreur') ? '#fecaca' : invoiceImportStatus.includes('verifier') ? '#fbbf24' : '#bbf7d0'}`, color: invoiceImportStatus.startsWith('Erreur') ? '#991b1b' : invoiceImportStatus.includes('verifier') ? '#92400e' : '#166534', fontSize: 13, fontWeight: 800 }}>
                  {invoiceImportStatus}
                </div>
              )}

              {invoiceImportPreviews.length > 0 && (
                <div style={{ marginTop: 12, display: 'grid', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
                  {invoiceImportPreviews.map(item => {
                    const isVerified = item.confidence === 'verified';
                    return (
                      <div
                        key={item.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: isMobile ? 'minmax(140px, 1fr) minmax(140px, 1fr) 116px 104px minmax(150px, 1fr) 112px' : 'minmax(180px, 1.15fr) minmax(150px, 1fr) 130px 110px minmax(190px, 1fr) 112px',
                          gap: 8,
                          alignItems: 'end',
                          minWidth: isMobile ? 840 : 980,
                          padding: 10,
                          border: `1px solid ${isVerified ? '#86efac' : '#fbbf24'}`,
                          borderRadius: 8,
                          background: isVerified ? '#f0fdf4' : '#fffbeb',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                            <span style={{ padding: '2px 7px', borderRadius: 999, background: isVerified ? '#dcfce7' : '#fef3c7', color: isVerified ? '#166534' : '#92400e', fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }}>
                              {isVerified ? 'OK' : 'A verifier'}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 900, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.fileName}>{item.fileName}</div>
                          <div style={{ marginTop: 2, fontSize: 11, color: isVerified ? '#166534' : '#92400e', fontWeight: 700 }}>{item.status}</div>
                        </div>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          <span style={{ fontSize: 10, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Fournisseur</span>
                          <input
                            value={item.supplier}
                            onChange={event => updateInvoiceImportPreview(item.id, { supplier: event.target.value })}
                            style={{ height: 34, minWidth: 0, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 10px', fontWeight: 800, color: '#0f172a' }}
                          />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          <span style={{ fontSize: 10, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Date</span>
                          <input
                            type="date"
                            value={item.invoiceDate}
                            onChange={event => updateInvoiceImportPreview(item.id, { invoiceDate: event.target.value })}
                            style={{ height: 34, minWidth: 0, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 10px', fontWeight: 800, color: '#0f172a' }}
                          />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          <span style={{ fontSize: 10, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>HT</span>
                          <input
                            value={item.amountHt}
                            onChange={event => updateInvoiceImportPreview(item.id, { amountHt: event.target.value.replace(/[^0-9.,-]/g, '').replace(',', '.') })}
                            style={{ height: 34, minWidth: 0, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 10px', fontWeight: 900, color: '#0f172a', textAlign: 'right' }}
                          />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          <span style={{ fontSize: 10, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Colonne cible</span>
                          <select
                            value={item.targetCol}
                            onChange={event => updateInvoiceImportPreview(item.id, { targetCol: Number(event.target.value) })}
                            style={{ height: 34, minWidth: 0, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 10px', fontWeight: 800, color: '#0f172a', background: '#fff' }}
                          >
                            {Array.from({ length: 13 }, (_, idx) => 45 + idx).map(col => (
                              <option key={col} value={col}>{dynamicColumns[col]?.[2] || `Achat ${col}`}</option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          onClick={() => applyInvoiceImport(item)}
                          style={{ height: 36, border: 'none', borderRadius: 8, background: isVerified ? '#166534' : '#b45309', color: '#fff', fontSize: 13, fontWeight: 900, cursor: 'pointer' }}
                        >
                          Valider
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              {caisseImportPreviews.length > 0 && (
                <div style={{ marginTop: 12, display: 'grid', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
                  {caisseImportPreviews.map(item => {
                    const isVerified = item.confidence === 'verified';
                    const theoriqueTotal = item.parsed.theoriqueValues.cb
                      + item.parsed.theoriqueValues.especes
                      + item.parsed.theoriqueValues.amex
                      + item.parsed.theoriqueValues.tr_carte
                      + item.parsed.theoriqueValues.ancv
                      + item.parsed.theoriqueValues.tr_papier
                      + item.parsed.theoriqueValues.sunday
                      + item.parsed.theoriqueValues.uber
                      + item.parsed.theoriqueValues.deliveroo
                      + item.parsed.theoriqueValues.click_collect;

                    return (
                      <div
                        key={item.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: isMobile ? 'minmax(150px, 1fr) 130px minmax(250px, 1.2fr) 112px' : 'minmax(190px, 1fr) 138px minmax(420px, 1.5fr) 112px',
                          gap: 8,
                          alignItems: 'end',
                          minWidth: isMobile ? 760 : 960,
                          padding: 10,
                          border: `1px solid ${isVerified ? '#93c5fd' : '#fbbf24'}`,
                          borderRadius: 8,
                          background: isVerified ? '#eff6ff' : '#fffbeb',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                            <span style={{ padding: '2px 7px', borderRadius: 999, background: isVerified ? '#dbeafe' : '#fef3c7', color: isVerified ? '#1d4ed8' : '#92400e', fontSize: 10, fontWeight: 900, textTransform: 'uppercase' }}>
                              {isVerified ? 'OK' : 'A verifier'}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 900, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.fileName}>{item.fileName}</div>
                          <div style={{ marginTop: 2, fontSize: 11, color: isVerified ? '#1d4ed8' : '#92400e', fontWeight: 700 }}>{item.status}</div>
                        </div>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          <span style={{ fontSize: 10, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>Date</span>
                          <input
                            type="date"
                            value={item.businessDate}
                            onChange={event => updateCaisseImportPreview(item.id, { businessDate: event.target.value })}
                            style={{ height: 34, minWidth: 0, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 10px', fontWeight: 800, color: '#0f172a' }}
                          />
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                          {[
                            { label: 'VAE HT', value: formatImportedCurrencyLabel(item.parsed.values[17]) },
                            { label: 'CA midi', value: formatImportedCurrencyLabel(item.parsed.values[18]) },
                            { label: 'CA soir', value: formatImportedCurrencyLabel(item.parsed.values[19]) },
                            { label: 'Cts midi', value: formatImportedIntegerLabel(item.parsed.values[25]) },
                            { label: 'Cts soir', value: formatImportedIntegerLabel(item.parsed.values[27]) },
                            { label: 'Theo caisse', value: formatImportedCurrencyLabel(theoriqueTotal) },
                          ].map(metric => (
                            <div key={`${item.id}-${metric.label}`} style={{ padding: '8px 10px', border: '1px solid #dbe5ec', borderRadius: 8, background: '#fff' }}>
                              <div style={{ fontSize: 10, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>{metric.label}</div>
                              <div style={{ marginTop: 4, fontSize: 13, fontWeight: 900, color: '#0f172a' }}>{metric.value}</div>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => applyCaisseImport(item)}
                          style={{ height: 36, border: 'none', borderRadius: 8, background: isVerified ? '#1d4ed8' : '#b45309', color: '#fff', fontSize: 13, fontWeight: 900, cursor: 'pointer' }}
                        >
                          Valider
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {importStatus && (
                <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: importStatus.startsWith('Erreur') ? '#fef2f2' : '#f0fdf4', border: `1px solid ${importStatus.startsWith('Erreur') ? '#fecaca' : '#bbf7d0'}`, color: importStatus.startsWith('Erreur') ? '#991b1b' : '#166534', fontSize: 13, fontWeight: 800 }}>
                  {importStatus}
                </div>
              )}

              {importPreview.length > 0 && (
                <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                  {importPreview.map(item => (
                    <div key={item.label} style={{ padding: 10, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' }}>
                      <div style={{ fontSize: 10, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.04em' }}>{item.label}</div>
                      <div style={{ marginTop: 4, fontSize: 14, fontWeight: 950, color: '#0f172a' }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 16, marginBottom: 18, padding: 12, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 12, lineHeight: 1.5, color: '#64748b' }}>
                Si la date du PDF correspond au mois affiche, l'import remplit directement ce jour. Sinon il remplit le jour actuellement selectionne.
              </div>
              <p style={{ display: 'none', fontSize: 14, color: '#475569', lineHeight: 1.6, marginBottom: 24 }}>
                Pour importer vos données, nous devons définir le format exact de votre fichier source. 
                Veuillez nous indiquer comment vous souhaitez procéder :
              </p>
              
              <div style={{ display: 'none', flexDirection: 'column', gap: 16 }}>
                <div style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0' }}>Option A : Format CSV Standard</h4>
                  <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                    Nous pouvons définir un template CSV (colonnes spécifiques) que vous remplirez et importerez ici.
                  </p>
                </div>
                
                <div style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0' }}>Option B : Logiciel Spécifique</h4>
                  <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                    Si vous utilisez un logiciel de caisse ou de gestion (ex: Zelty, Lightspeed, etc.), nous pouvons créer un importateur sur-mesure pour leur format d'export.
                  </p>
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setIsImportModalOpen(false)} style={{ padding: '8px 16px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
