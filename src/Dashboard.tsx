import React, { useState, useMemo, useEffect } from 'react';
import { useData } from './DataContext';
import { ChevronLeft, Save, Download, Upload, Calendar, Calculator, FileText, Settings, CreditCard, TrendingUp, PieChart as PieChartIcon, FileSpreadsheet, Receipt, Building2, Briefcase, Utensils, Menu, X, FileDown } from 'lucide-react';
import { DASHBOARD_COLUMNS as C, DAYS as days, MONTH_NAMES as monthNames, DASHBOARD_TABS as tabs, EDITABLE_COLS as editableCols } from './constants/dashboardConstants';
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

const DebouncedInput = ({ value, onChange, onFocus, onBlur, onKeyDown, className, placeholder, dataRow, dataCol }: any) => {
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
  const { data: globalData, updateDashboard, customEvents } = useData();
  
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const dynamicColumns = useMemo(() => {
    const cols = [...C];
    const salariesConfig = globalData[month]?.salariesConfig?.categories;
    if (salariesConfig) {
      // Update FRAIS DE PERSONNEL PROJECTION headers
      const updateHeader = (idx: number, category: string, label: string) => {
        const rows = salariesConfig[category] || [];
        let totalCoutHoraire = 0;
        let validRowsCount = 0;
        rows.forEach((row: any) => {
          const coutGlobal = parseFloat((row.coutGlobal || '0').replace(',', '.')) || 0;
          const heures = parseFloat((row.heures || '0').replace(',', '.')) || 0;
          const provision = coutGlobal * 1.10;
          const coutHoraire = heures > 0 ? provision / heures : 0;
          if (coutHoraire > 0) {
            totalCoutHoraire += coutHoraire;
            validRowsCount += 1;
          }
        });
        const avg = validRowsCount > 0 ? totalCoutHoraire / validRowsCount : 0;
        const avgStr = avg > 0 ? `\n${avg.toFixed(2).replace('.', ',')} €` : '';
        cols[idx] = [...cols[idx]];
        cols[idx][1] = 'PROJECTION S/C';
        cols[idx][2] = `${label}${avgStr}`;
      };

      // PROJECTION S/C — indices corrects 74-83
      updateHeader(74, 'cadre',    'CADRE\nCUISINE');
      updateHeader(75, 'cadre',    'CADRE\nSALLE');
      updateHeader(76, 'maitrise', 'MAITRISE\nCUISINE');
      updateHeader(77, 'maitrise', 'MAITRISE\nSALLE');
      updateHeader(78, 'niv12',    'NIV I ET II\nCUISINE');
      updateHeader(79, 'niv12',    'NIV I ET II\nSALLE');
      updateHeader(80, 'niv3',     'NIV III\nCUISINE');
      updateHeader(81, 'niv3',     'NIV III\nSALLE');
      updateHeader(82, 'apprenti', 'APPRENTI\nCUISINE');
      updateHeader(83, 'apprenti', 'APPRENTI\nSALLE');
      // FRAIS PERSONNEL RÉALISÉ — mêmes taux, indices 89-98
      updateHeader(89, 'cadre',    'CADRE\nCUISINE');
      updateHeader(90, 'cadre',    'CADRE\nSALLE');
      updateHeader(91, 'maitrise', 'MAITRISE\nCUISINE');
      updateHeader(92, 'maitrise', 'MAITRISE\nSALLE');
      updateHeader(93, 'niv12',    'NIV I ET II\nCUISINE');
      updateHeader(94, 'niv12',    'NIV I ET II\nSALLE');
      updateHeader(95, 'niv3',     'NIV III\nCUISINE');
      updateHeader(96, 'niv3',     'NIV III\nSALLE');
      updateHeader(97, 'apprenti', 'APPRENTI\nCUISINE');
      updateHeader(98, 'apprenti', 'APPRENTI\nSALLE');
    }
    return cols;
  }, [C, globalData, month]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth > 1024) setIsSidebarOpen(true);
      else setIsSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const cellData = globalData[month]?.dashboard || {};
  const [focusedCell, setFocusedCell] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('CA');

  const rows = useMemo(() => {
    const generatedRows: any[] = [];
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
        generatedRows.push({ type: 'total', label: `Total Semaine ${weekCount}`, weekIndex: weekCount });
    }

    generatedRows.push({ type: 'fg_box4_total', label: '' });
    generatedRows.push({ type: 'month_total', label: 'TOTAL' });
    return generatedRows;
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
    const isTextCol = cIdx === 49 || cIdx === 50 || ['DATE', 'FOURNISSEUR', 'FOURNISSEURS', 'MOTIF ACHAT', 'Nom'].includes(colName);
    
    if (isTextCol) {
      // Allow text for events columns and text columns
      updateDashboard(month, `${rIdx}-${cIdx}`, value);
    } else {
      // Only allow numbers for calculation purposes
      const cleanValue = value.replace(/[^0-9.,-]/g, '').replace(',', '.');
      updateDashboard(month, `${rIdx}-${cIdx}`, cleanValue);
    }
  };

  // Calculate totals
  const calculatedData = useMemo(() => {
    const data = { ...cellData };
    let cumulCA = 0;
    let cumulCvts = 0;
    let cumulRealiseCA = 0;
    let cumulCoutMatiere = 0;

    // First pass: Calculate row totals (TOTAL JOUR) and CUMUL
    rows.forEach((row, rIdx) => {
      if (row.type === 'day') {
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

        const totalJour = budgetMidi + budgetSoir + budgetLimo;
        if (totalJour > 0 || data[`${rIdx}-0`] || data[`${rIdx}-1`] || data[`${rIdx}-2`]) {
          data[`${rIdx}-3`] = totalJour.toFixed(2);
          cumulCA += totalJour;
          data[`${rIdx}-4`] = cumulCA.toFixed(2);
        }

        const jourCvts = cvtsMidi + cvtsSoir;
        if (jourCvts > 0) {
          data[`${rIdx}-10`] = jourCvts;
          const jourMoy = (budgetMidi + budgetSoir) / jourCvts;
          data[`${rIdx}-11`] = jourMoy;
          
          cumulCvts += jourCvts;
          data[`${rIdx}-12`] = cumulCvts;
        }

        // REALISE CA HT calculations
        const realiseVae = parseFloat(data[`${rIdx}-17`] || '0');
        const realiseMidi = parseFloat(data[`${rIdx}-18`] || '0');
        const realiseSoir = parseFloat(data[`${rIdx}-20`] || '0');
        const realiseLimo = parseFloat(data[`${rIdx}-22`] || '0');

        // Ecarts
        if (data[`${rIdx}-18`] || data[`${rIdx}-0`]) {
          data[`${rIdx}-19`] = (realiseMidi - budgetMidi).toFixed(2);
        }
        if (data[`${rIdx}-20`] || data[`${rIdx}-1`]) {
          data[`${rIdx}-21`] = (realiseSoir - budgetSoir).toFixed(2);
        }
        if (data[`${rIdx}-22`] || data[`${rIdx}-2`]) {
          data[`${rIdx}-23`] = (realiseLimo - budgetLimo).toFixed(2);
        }

        const realiseTotalJour = realiseVae + realiseMidi + realiseSoir + realiseLimo;
        if (realiseTotalJour > 0 || data[`${rIdx}-17`] || data[`${rIdx}-18`] || data[`${rIdx}-20`] || data[`${rIdx}-22`]) {
          data[`${rIdx}-24`] = realiseTotalJour.toFixed(2);
          
          const ecartJour = realiseTotalJour - totalJour;
          data[`${rIdx}-25`] = ecartJour.toFixed(2);

          cumulRealiseCA += realiseTotalJour;
          data[`${rIdx}-26`] = cumulRealiseCA.toFixed(2);
        }

        // COUT MATIERE calculations
        let coutMatiereTotalJour = 0;
        let hasCoutMatiereData = false;
        for (let i = 57; i <= 69; i++) {
          if (data[`${rIdx}-${i}`]) {
            coutMatiereTotalJour += parseFloat(data[`${rIdx}-${i}`] || '0');
            hasCoutMatiereData = true;
          }
        }

        if (hasCoutMatiereData) {
          data[`${rIdx}-70`] = coutMatiereTotalJour.toFixed(2);
          cumulCoutMatiere += coutMatiereTotalJour;
          data[`${rIdx}-71`] = cumulCoutMatiere.toFixed(2);
          
          if (cumulRealiseCA > 0) {
            data[`${rIdx}-72`] = ((cumulCoutMatiere / cumulRealiseCA) * 100).toFixed(2) + '%';
          } else {
            data[`${rIdx}-72`] = '0.00%';
          }
        }

        // FRAIS DE PERSONNEL - PROJECTION
        let totalHeuresProj = 0;
        let coutGlobalProj = 0;
        let hasProjData = false;
        
        const salariesConfig = globalData[month]?.salariesConfig?.categories;
        const getAvgRate = (category: string) => {
          if (!salariesConfig) return 0;
          const rows = salariesConfig[category] || [];
          let totalCoutHoraire = 0;
          let validRowsCount = 0;
          rows.forEach((row: any) => {
            const coutGlobal = parseFloat((row.coutGlobal || '0').replace(',', '.')) || 0;
            const heures = parseFloat((row.heures || '0').replace(',', '.')) || 0;
            const provision = coutGlobal * 1.10;
            const coutHoraire = heures > 0 ? provision / heures : 0;
            if (coutHoraire > 0) {
              totalCoutHoraire += coutHoraire;
              validRowsCount += 1;
            }
          });
          return validRowsCount > 0 ? totalCoutHoraire / validRowsCount : 0;
        };

        const projRates = [
          getAvgRate('cadre') || 38.54,
          getAvgRate('cadre') || 38.54,
          getAvgRate('maitrise') || 20.85,
          getAvgRate('maitrise') || 20.85,
          getAvgRate('niv12') || 16.04,
          getAvgRate('niv12') || 16.04,
          getAvgRate('niv3') || 18.35,
          getAvgRate('niv3') || 18.35,
          getAvgRate('apprenti') || 8.39,
          getAvgRate('apprenti') || 8.39
        ];

        for (let i = 0; i < 10; i++) {
          const colIdx = 74 + i; // PROJECTION S/C columns start at 74
          if (data[`${rIdx}-${colIdx}`]) {
            const val = parseFloat(data[`${rIdx}-${colIdx}`] || '0');
            totalHeuresProj += val;
            coutGlobalProj += val * projRates[i];
            hasProjData = true;
          }
        }
        
        if (hasProjData) {
          data[`${rIdx}-77`] = totalHeuresProj.toFixed(2);
          data[`${rIdx}-88`] = coutGlobalProj.toFixed(2);
          if (totalHeuresProj > 0) {
            data[`${rIdx}-89`] = (realiseTotalJour / totalHeuresProj).toFixed(2);
          }
          if (realiseTotalJour > 0) {
            data[`${rIdx}-90`] = ((coutGlobalProj / realiseTotalJour) * 100).toFixed(2) + '%';
          }
        }

        // FRAIS DE PERSONNEL - REALISE
        let totalHeuresReal = 0;
        let coutGlobalReal = 0;
        let hasRealData = false;
        
        for (let i = 0; i < 10; i++) {
          const colIdx = 89 + i;
          if (data[`${rIdx}-${colIdx}`]) {
            const val = parseFloat(data[`${rIdx}-${colIdx}`] || '0');
            totalHeuresReal += val;
            coutGlobalReal += val * projRates[i];
            hasRealData = true;
          }
        }
        
        if (hasRealData) {
          data[`${rIdx}-92`] = totalHeuresReal.toFixed(2);
          data[`${rIdx}-103`] = coutGlobalReal.toFixed(2);
          if (totalHeuresReal > 0) {
            data[`${rIdx}-104`] = (realiseTotalJour / totalHeuresReal).toFixed(2);
          }
          if (realiseTotalJour > 0) {
            data[`${rIdx}-105`] = ((coutGlobalReal / realiseTotalJour) * 100).toFixed(2) + '%';
          }
          
          // Ecarts
          if (hasProjData) {
            data[`${rIdx}-107`] = (totalHeuresReal - totalHeuresProj).toFixed(2);
            if (realiseTotalJour > 0) {
              const pctReal = (coutGlobalReal / realiseTotalJour) * 100;
              const pctProj = (coutGlobalProj / realiseTotalJour) * 100;
              data[`${rIdx}-108`] = (pctReal - pctProj).toFixed(2) + '%';
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
          if (dynamicColumns[cIdx][3] === 'bg-hatched' || ['DATE', 'FOURNISSEUR', 'FOURNISSEURS', 'MOTIF ACHAT', 'Nom'].includes(colName) || [7, 9, 11, 15, 4, 12, 26, 39, 45, 71, 72, 89, 90, 91, 104, 105, 106, 107, 108].includes(cIdx)) return;

          let colSum = 0;
          let hasData = false;
          weekDays.forEach(day => {
            const val = parseFloat(data[`${day.originalIdx}-${cIdx}`] || '0');
            if (!isNaN(val) && data[`${day.originalIdx}-${cIdx}`]) {
              colSum += val;
              hasData = true;
            }
          });

          if (hasData) {
            data[`${rIdx}-${cIdx}`] = colSum;
          }
        });

        // Calculate averages for week
        const caMidiW = parseFloat(data[`${rIdx}-0`] || '0');
        const cvtsMidiW = parseFloat(data[`${rIdx}-6`] || '0');
        if (cvtsMidiW > 0) data[`${rIdx}-7`] = (caMidiW / cvtsMidiW);

        const caSoirW = parseFloat(data[`${rIdx}-1`] || '0');
        const cvtsSoirW = parseFloat(data[`${rIdx}-8`] || '0');
        if (cvtsSoirW > 0) data[`${rIdx}-9`] = (caSoirW / cvtsSoirW);

        const caJourW = caMidiW + caSoirW;
        const cvtsJourW = cvtsMidiW + cvtsSoirW;
        if (cvtsJourW > 0) data[`${rIdx}-11`] = (caJourW / cvtsJourW);

        const caLimoW = parseFloat(data[`${rIdx}-2`] || '0');
        const cvtsLimoW = parseFloat(data[`${rIdx}-14`] || '0');
        if (cvtsLimoW > 0) data[`${rIdx}-15`] = (caLimoW / cvtsLimoW);

        const coutMatiereW = parseFloat(data[`${rIdx}-70`] || '0');
        const realiseCAW = parseFloat(data[`${rIdx}-24`] || '0');
        if (realiseCAW > 0) data[`${rIdx}-72`] = ((coutMatiereW / realiseCAW) * 100).toFixed(2) + '%';

        const totalHeuresProjW = parseFloat(data[`${rIdx}-77`] || '0');
        const coutGlobalProjW = parseFloat(data[`${rIdx}-88`] || '0');
        if (totalHeuresProjW > 0) data[`${rIdx}-89`] = (realiseCAW / totalHeuresProjW).toFixed(2);
        if (realiseCAW > 0) {
          data[`${rIdx}-90`] = ((coutGlobalProjW / realiseCAW) * 100).toFixed(2) + '%';
          data[`${rIdx}-91`] = ((coutGlobalProjW / realiseCAW) * 100).toFixed(2) + '%';
        }
        
        const totalHeuresRealW = parseFloat(data[`${rIdx}-92`] || '0');
        const coutGlobalRealW = parseFloat(data[`${rIdx}-103`] || '0');
        if (totalHeuresRealW > 0) data[`${rIdx}-104`] = (realiseCAW / totalHeuresRealW).toFixed(2);
        if (realiseCAW > 0) {
          data[`${rIdx}-105`] = ((coutGlobalRealW / realiseCAW) * 100).toFixed(2) + '%';
          data[`${rIdx}-106`] = ((coutGlobalRealW / realiseCAW) * 100).toFixed(2) + '%';
        }
        
        data[`${rIdx}-107`] = (totalHeuresRealW - totalHeuresProjW).toFixed(2);
        if (realiseCAW > 0) {
          const pctRealW = (coutGlobalRealW / realiseCAW) * 100;
          const pctProjW = (coutGlobalProjW / realiseCAW) * 100;
          data[`${rIdx}-108`] = (pctRealW - pctProjW).toFixed(2) + '%';
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
        if (dynamicColumns[cIdx][3] === 'bg-hatched' || ['DATE', 'FOURNISSEUR', 'FOURNISSEURS', 'MOTIF ACHAT', 'Nom'].includes(colName) || [7, 9, 11, 15, 4, 12, 26, 39, 45, 71, 72, 89, 90, 91, 104, 105, 106, 107, 108].includes(cIdx)) return;

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
          data[`${monthTotalIdx}-${cIdx}`] = colSum;
        }
      });

      // Calculate averages for month
      const caMidiM = parseFloat(data[`${monthTotalIdx}-0`] || '0');
      const cvtsMidiM = parseFloat(data[`${monthTotalIdx}-6`] || '0');
      if (cvtsMidiM > 0) data[`${monthTotalIdx}-7`] = (caMidiM / cvtsMidiM);

      const caSoirM = parseFloat(data[`${monthTotalIdx}-1`] || '0');
      const cvtsSoirM = parseFloat(data[`${monthTotalIdx}-8`] || '0');
      if (cvtsSoirM > 0) data[`${monthTotalIdx}-9`] = (caSoirM / cvtsSoirM);

      const caJourM = caMidiM + caSoirM;
      const cvtsJourM = cvtsMidiM + cvtsSoirM;
      if (cvtsJourM > 0) data[`${monthTotalIdx}-11`] = (caJourM / cvtsJourM);

      const caLimoM = parseFloat(data[`${monthTotalIdx}-2`] || '0');
      const cvtsLimoM = parseFloat(data[`${monthTotalIdx}-14`] || '0');
      if (cvtsLimoM > 0) data[`${monthTotalIdx}-15`] = (caLimoM / cvtsLimoM);

      const coutMatiereM = parseFloat(data[`${monthTotalIdx}-70`] || '0');
      const realiseCAM = parseFloat(data[`${monthTotalIdx}-24`] || '0');
      if (realiseCAM > 0) data[`${monthTotalIdx}-72`] = ((coutMatiereM / realiseCAM) * 100).toFixed(2) + '%';

      const totalHeuresProjM = parseFloat(data[`${monthTotalIdx}-77`] || '0');
      const coutGlobalProjM = parseFloat(data[`${monthTotalIdx}-88`] || '0');
      if (totalHeuresProjM > 0) data[`${monthTotalIdx}-89`] = (realiseCAM / totalHeuresProjM).toFixed(2);
      if (realiseCAM > 0) {
        data[`${monthTotalIdx}-90`] = ((coutGlobalProjM / realiseCAM) * 100).toFixed(2) + '%';
        data[`${monthTotalIdx}-91`] = ((coutGlobalProjM / realiseCAM) * 100).toFixed(2) + '%';
      }
      
      const totalHeuresRealM = parseFloat(data[`${monthTotalIdx}-92`] || '0');
      const coutGlobalRealM = parseFloat(data[`${monthTotalIdx}-103`] || '0');
      if (totalHeuresRealM > 0) data[`${monthTotalIdx}-104`] = (realiseCAM / totalHeuresRealM).toFixed(2);
      if (realiseCAM > 0) {
        data[`${monthTotalIdx}-105`] = ((coutGlobalRealM / realiseCAM) * 100).toFixed(2) + '%';
        data[`${monthTotalIdx}-106`] = ((coutGlobalRealM / realiseCAM) * 100).toFixed(2) + '%';
      }
      
      data[`${monthTotalIdx}-107`] = (totalHeuresRealM - totalHeuresProjM).toFixed(2);
      if (realiseCAM > 0) {
        const pctRealM = (coutGlobalRealM / realiseCAM) * 100;
        const pctProjM = (coutGlobalProjM / realiseCAM) * 100;
        data[`${monthTotalIdx}-108`] = (pctRealM - pctProjM).toFixed(2) + '%';
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

  const formatValue = (val: any, c: string[]) => {
    if (val === '' || val === undefined || val === null) return '';
    
    // If the value already contains a percentage sign, return it as is
    if (typeof val === 'string' && val.includes('%')) return val;

    const num = parseFloat(val);
    if (isNaN(num)) return val;

    const groupName = c[0];
    const subGroupName = c[1];
    const colName = c[2] || c[1];

    // Check if it's a percentage column
    const isPercentage = colName.includes('RATIO') || colName.includes('%') || subGroupName.includes('RATIO');

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
    return dynamicColumns.map((c, index) => ({ ...c, originalIndex: index })).filter(c => {
      const group = c[0];
      const subGroup = c[1];
      
      switch (activeTab) {
        case 'CA':
          return ['CA', 'RESTAURANTS', 'LIMONADE'].includes(group);
        case 'REALISE':
          return ['REALISE', 'EVENEMENTS RESTAURANTS', 'EVENEMENTS NATIONAL'].includes(group);
        case 'DEMARQUES':
          return group === 'DEMARQUES';
        case 'COUT_MATIERE':
          return group === 'COUT MATIERE';
        case 'FRAIS_PERSONNEL':
          return ['FRAIS DE PERSONNEL PROJECTION', 'FRAIS DE PERSONNEL REALISE'].includes(group);
        case 'FRAIS_GENERAUX':
          return group === 'FRAIS GENERAUX';
        case 'CONTRAT':
          return group === 'CONTRAT MENSUALISES';
        case 'RESULTATS':
          return group === 'RESULTATS MENSUEL HT';
        default:
          return true;
      }
    });
  }, [activeTab]);

  const groups: any[] = [];
  let currentGroup: any = null;
  visibleColumns.forEach(c => {
    if (!currentGroup || currentGroup.name !== c[0]) {
      if (currentGroup) groups.push(currentGroup);
      currentGroup = { name: c[0], colspan: 1, bg: c[3] };
    } else {
      currentGroup.colspan++;
    }
  });
  if (currentGroup) groups.push(currentGroup);

  const subGroups: any[] = [];
  let currentSub: any = null;
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

  const previsionsGroups = groups.filter(g => ['CA', 'RESTAURANTS', 'LIMONADE'].includes(g.name));
  const previsionsColspan = previsionsGroups.reduce((acc, g) => acc + g.colspan, 0);
  
  const realiseGroups = groups.filter(g => ['REALISE', 'EVENEMENTS RESTAURANTS', 'EVENEMENTS NATIONAL'].includes(g.name));
  const realiseColspan = realiseGroups.reduce((acc, g) => acc + g.colspan, 0);
  
  const otherGroups = groups.filter(g => !['CA', 'RESTAURANTS', 'LIMONADE', 'REALISE', 'EVENEMENTS RESTAURANTS', 'EVENEMENTS NATIONAL'].includes(g.name));

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
    <div style={{ height: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex', overflow: 'hidden', position: 'relative' }}>
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

      {/* Left Sidebar for Months */}
      <aside style={{ 
        width: 260, 
        background: '#1e293b', 
        color: '#fff', 
        display: 'flex', 
        flexDirection: 'column', 
        flexShrink: 0, 
        boxShadow: '4px 0 15px rgba(0,0,0,0.05)', 
        zIndex: 100,
        position: isMobile ? 'absolute' : 'relative',
        height: '100%',
        transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease-in-out'
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
        <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: isMobile ? '0 16px' : '0 32px', display: 'flex', flexDirection: 'column', flexShrink: 0, zIndex: 90 }}>
          <div style={{ height: isMobile ? 60 : 80, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {isMobile && (
                <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 4 }}
                >
                  {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
              )}
              <h2 style={{ fontSize: isMobile ? 18 : 28, fontWeight: 800, color: '#0f172a', margin: 0, textTransform: 'capitalize', letterSpacing: '-0.02em' }}>
                {monthNames[month]} {year}
              </h2>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setIsImportModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: isMobile ? '6px 12px' : '8px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, color: '#10b981', fontSize: isMobile ? 12 : 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#ecfdf5'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                <Upload size={isMobile ? 14 : 16} /> {isMobile ? '' : 'Importer'}
              </button>
              <button onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: isMobile ? '6px 12px' : '8px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, color: '#ef4444', fontSize: isMobile ? 12 : 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                <FileDown size={isMobile ? 14 : 16} /> {isMobile ? '' : 'PDF'}
              </button>
              <button onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: isMobile ? '6px 12px' : '8px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, color: '#475569', fontSize: isMobile ? 12 : 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                <Download size={isMobile ? 14 : 16} /> {isMobile ? '' : 'Excel'}
              </button>
            </div>
          </div>

          {/* Section Tabs */}
          <div style={{ padding: '12px 28px', display: 'flex', gap: 8, background: '#fff', borderBottom: '1px solid #e2e8f0', alignItems: 'center', flexShrink: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              let icon = '📁';
              let accentBg = '#475569';
              let accentColor = '#fff';
              
              switch (tab.id) {
                case 'SYNTHESE': icon = '📊'; accentBg = '#3b82f6'; break;
                case 'CA': icon = '🎯'; accentBg = '#92400e'; break;
                case 'REALISE': icon = '📈'; accentBg = '#1e40af'; break;
                case 'DEMARQUES': icon = '📉'; accentBg = '#047857'; break;
                case 'COUT_MATIERE': icon = '🛒'; accentBg = '#166534'; break;
                case 'FRAIS_PERSONNEL': icon = '👥'; accentBg = '#6b21a8'; break;
                case 'FRAIS_GENERAUX': icon = '📋'; accentBg = '#b45309'; break;
                case 'CONTRAT': icon = '📝'; accentBg = '#0f766e'; break;
                case 'RESULTATS': icon = '🏆'; accentBg = '#be123c'; break;
              }

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '9px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                    background: isActive ? accentBg : '#f8fafc',
                    border: `1.5px solid ${isActive ? accentBg : '#e2e8f0'}`,
                    boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                    transition: 'all .15s',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span style={{ fontSize: 14 }}>{icon}</span>
                  <span style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? accentColor : '#334155', letterSpacing: '.02em', lineHeight: 1.3 }}>{tab.label}</span>
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
        <div id="dashboard-content-area" style={{ flex: 1, overflow: 'auto', padding: isMobile ? 12 : 32, display: 'flex', flexDirection: 'column' }}>
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
                  RÉALISÉ &amp; ÉVÉNEMENTS
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
                const minW = isRmLabel ? 180 : isRmValue ? 100 : 65;

                return (
                  <th key={`c-${i}`} style={{ ...thBase, background: getBgColor(c[3]), color: '#374151', top: 90, height: 60, minWidth: minW, fontSize: 9, zIndex: 40, borderRight: isMajorEnd ? '3px solid #475569' : isSectionEnd ? '2px solid #94a3b8' : '1px solid #cbd5e1', borderBottom: '3px solid #374151' }}>
                    {isEvt ? c[0] : c[2]}
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

              let rowBorderClasses = '';
              if (isTotalRow) rowBorderClasses = 'border-y-2 border-y-slate-400';
              if (isMonthTotal) rowBorderClasses = 'border-y-2 border-y-amber-500';

              let dateCellBg = 'bg-[#ffffff] text-slate-600';
              if (isTotalRow) dateCellBg = 'bg-[#f1f5f9] text-slate-800 font-bold';
              else if (isMonthTotal) dateCellBg = 'bg-[#fffbeb] text-amber-900 font-bold';
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
                    {row.label}
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
                    const displayVal = formatValue(val, [c[0], c[1], c[2], c[3]]);
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
                    if (c[2] === 'ECART AU\nBUDGET\nJOUR' && val !== '') {
                      const numVal = parseFloat(val);
                      if (numVal > 0) textColorClass = 'text-green-600 font-bold';
                      else if (numVal < 0) textColorClass = 'text-red-600 font-bold';
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
                              onChange={(value: string) => {
                                if (colIndexInGroup === 3) {
                                  const cleanValue = value.replace(/[^0-9.,-]/g, '').replace(',', '.');
                                  updateDashboard(month, fgCellKey, cleanValue);
                                } else {
                                  updateDashboard(month, fgCellKey, value);
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
                      const nbHBudget  = parseFloat(calculatedData[`${mtIdx}-77`]  || '0');
                      const coutProj   = parseFloat(calculatedData[`${mtIdx}-88`]  || '0');
                      const nbHReel    = parseFloat(calculatedData[`${mtIdx}-92`]  || '0');
                      const coutReel   = parseFloat(calculatedData[`${mtIdx}-103`] || '0');

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
                              onChange={(value: string) => updateDashboard(month, rmRow.key!, value.replace(/[^0-9.,]/g,'').replace(',','.'))}
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

                    return (
                      <td key={`c-${rIdx}-${cIdx}`} className={`p-0 ${cellBg} ${cellBorderClasses} relative text-center`}>
                        {!isHatched && !isReadOnly ? (
                          <DebouncedInput
                            dataRow={rIdx}
                            dataCol={cIdx}
                            value={isFocused ? val : displayVal}
                            onChange={(value: string) => handleCellChange(rIdx, originalCIdx, value)}
                            onFocus={() => setFocusedCell(cellKey)}
                            onBlur={() => setFocusedCell(null)}
                            onKeyDown={(e: any) => handleKeyDown(e, rIdx, cIdx)}
                            className="w-full h-full min-h-[26px] bg-transparent outline-none px-1 text-center font-medium focus:bg-blue-50 focus:ring-1 focus:ring-indigo-400 focus:z-10 relative cursor-text text-[10px] text-slate-700 placeholder-slate-300 transition-all"
                            placeholder=""
                          />
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
        </div>
      </main>

      {/* Import Modal */}
      {isImportModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', overflow: 'hidden' }}>
            <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Upload size={20} color="#10b981" />
                Importer des données
              </h3>
              <button onClick={() => setIsImportModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4, borderRadius: 4 }} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: 24 }}>
              <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, marginBottom: 24 }}>
                Pour importer vos données, nous devons définir le format exact de votre fichier source. 
                Veuillez nous indiquer comment vous souhaitez procéder :
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
