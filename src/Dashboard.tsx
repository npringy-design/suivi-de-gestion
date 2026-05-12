import React, { useState, useMemo, useEffect } from 'react';

import { useData } from '@/contexts/DataContext';

import { ChevronLeft, Download, Upload, FileDown, Trash2, X } from 'lucide-react';
// ── Constantes Dashboard inline (dashboardConstants.ts intégré) ─────────────
type DashboardColumn = [string, string, string, string];
type VisibleDashboardColumn = DashboardColumn & { originalIndex: number };
type DashboardRow = {
  type: 'day' | 'total' | 'month_total' | 'fg_box4_total';
  label: string;
  isWeekend?: boolean;
  isSchoolHoliday?: boolean;
  isPublicHoliday?: boolean;
  isCustomEvent?: boolean;
  dateObj?: Date;
  dayIndex?: number;
  weekIndex?: number;
};

type InvoiceImportPreview = {
  id: string;
  fileName: string;
  supplier: string;
  amountHt: string;
  invoiceDate: string;
  targetCol: number;
  status: string;
  confidence: 'verified' | 'review';
};

const C: DashboardColumn[] = [
  ['CA', 'Midi Saisie', 'CA HT MIDI', 'bg-[#ffe699]'],
  ['CA', 'Soir Saisie', 'CA HT SOIR', 'bg-[#ffe699]'],
  ['CA', 'Limonade Saisie', 'CA HT LIMONADE', 'bg-[#ffe699]'],
  ['CA', 'TOTAL JOUR', 'CAHT JOUR', 'bg-[#ffe699]'],
  ['CA', 'CUMUL DEPUIS LE 01', 'CAHTCUMUL', 'bg-[#ffe699]'],
  ['CA', 'VAR % VS N-1', '', 'bg-hatched'],
  ['RESTAURANTS', 'MIDI\nPrevision Saisie', 'NB CVTS', 'bg-[#fff2cc]'],
  ['RESTAURANTS', 'MIDI\nPrevision Saisie', 'CVTS MOY HT', 'bg-[#fff2cc]'],
  ['RESTAURANTS', 'SOIR\nPrevision Saisie', 'NB CVTS', 'bg-[#fff2cc]'],
  ['RESTAURANTS', 'SOIR\nPrevision Saisie', 'CVTS MOY HT', 'bg-[#fff2cc]'],
  ['RESTAURANTS', 'JOUR\nPrevision Saisie', 'NB CVTS', 'bg-[#fff2cc]'],
  ['RESTAURANTS', 'JOUR\nPrevision Saisie', 'CVTS MOY HT', 'bg-[#fff2cc]'],
  ['RESTAURANTS', 'JOUR\nPrevision Saisie', 'CVTS CUMUL', 'bg-[#fff2cc]'],
  ['RESTAURANTS', 'VAR % VS N-1', '', 'bg-hatched'],
  ['LIMONADE', 'JOUR\nPrevision Saisie', 'NB CVTS', 'bg-[#fff2cc]'],
  ['LIMONADE', 'JOUR\nPrevision Saisie', 'CVTS MOY HT', 'bg-[#fff2cc]'],
  ['LIMONADE', 'VAR % VS N-1', '', 'bg-hatched'],
  ['REALISE', 'CA HT', 'VAE', 'bg-[#b4c6e7]'],
  ['REALISE', 'CA HT', 'MIDI', 'bg-[#b4c6e7]'],
  ['REALISE', 'CA HT', 'SOIR', 'bg-[#b4c6e7]'],
  ['REALISE', 'CA HT', 'LIMONADE', 'bg-[#b4c6e7]'],
  ['REALISE', 'CA HT', 'TOTAL JOUR', 'bg-[#b4c6e7]'],
  ['REALISE', 'CA HT', 'ECART\nBUDGET', 'bg-white'],
  ['REALISE', 'CA HT', 'CUMUL\nDEPUIS LE 01', 'bg-[#b4c6e7]'],
  ['REALISE', 'CA HT', 'VAR %\nVS N-1', 'bg-hatched'],
  ['REALISE', 'COUVERTS\nRESTAURANT', 'MIDI\nNB CVTS', 'bg-[#b4c6e7]'],
  ['REALISE', 'COUVERTS\nRESTAURANT', 'MIDI\nMOY', 'bg-white'],
  ['REALISE', 'COUVERTS\nRESTAURANT', 'SOIR\nNB CVTS', 'bg-[#b4c6e7]'],
  ['REALISE', 'COUVERTS\nRESTAURANT', 'SOIR\nMOY', 'bg-white'],
  ['REALISE', 'COUVERTS\nRESTAURANT', 'TOTAL JOUR', 'bg-[#b4c6e7]'],
  ['REALISE', 'COUVERTS\nRESTAURANT', 'MOY JOUR', 'bg-white'],
  ['REALISE', 'COUVERTS\nRESTAURANT', 'ECART TM\nBUDGET', 'bg-[#fce4d6]'],
  ['REALISE', 'COUVERTS\nRESTAURANT', 'CUMUL', 'bg-[#b4c6e7]'],
  ['REALISE', 'COUVERTS\nRESTAURANT', 'ECART\nBUDGET', 'bg-[#fce4d6]'],
  ['REALISE', 'COUVERTS\nLIMONADE', 'NB CVTS', 'bg-[#b4c6e7]'],
  ['REALISE', 'COUVERTS\nLIMONADE', 'MOY', 'bg-white'],
  ['REALISE', 'COUVERTS\nLIMONADE', 'CUMUL', 'bg-[#b4c6e7]'],
  ['EVENEMENTS RESTAURANTS', 'EVENEMENTS RESTAURANTS', 'EVENEMENTS\nRESTAURANTS', 'bg-[#e9eef7]'],
  ['EVENEMENTS NATIONAL', 'EVENEMENTS NATIONAL', 'EVENEMENTS\nNATIONAL', 'bg-[#e2efda]'],
  ['DEMARQUES', 'PERSONNEL', '', 'bg-[#e2efda]'],
  ['DEMARQUES', 'Ratio\nPerso', '', 'bg-[#fce4d6]'],
  ['DEMARQUES', 'OPERATIONEL', '', 'bg-[#e2efda]'],
  ['DEMARQUES', 'Ratio Cuisine', '', 'bg-[#fce4d6]'],
  ['DEMARQUES', 'TOTAL', '', 'bg-[#e2efda]'],
  ['DEMARQUES', 'EXPLICATION DEMARQUE', '', 'bg-white'],
  ['COUT MATIERE', 'ACHATS LIQUIDE HT', 'C10', 'bg-[#e2efda]'],
  ['COUT MATIERE', 'ACHATS LIQUIDE HT', 'RICHARD VINS', 'bg-[#e2efda]'],
  ['COUT MATIERE', 'ACHATS LIQUIDE HT', 'CAFE RICHARD', 'bg-[#e2efda]'],
  ['COUT MATIERE', 'ACHATS LIQUIDE HT', 'STORIA', 'bg-[#e2efda]'],
  ['COUT MATIERE', 'ACHATS SOLIDES HT', 'BRAKE', 'bg-[#e2efda]'],
  ['COUT MATIERE', 'ACHATS SOLIDES HT', 'POMONA F&L', 'bg-[#e2efda]'],
  ['COUT MATIERE', 'ACHATS SOLIDES HT', 'SOCOPA', 'bg-[#e2efda]'],
  ['COUT MATIERE', 'ACHATS SOLIDES HT', 'EPISAVEUR', 'bg-[#e2efda]'],
  ['COUT MATIERE', 'ACHATS SOLIDES HT', 'MAMMAFIORE', 'bg-[#e2efda]'],
  ['COUT MATIERE', 'ACHATS SOLIDES HT', 'COMPAGNIE DES DESSERTS', 'bg-[#e2efda]'],
  ['COUT MATIERE', 'ACHATS SOLIDES HT', 'DISTRIPATE', 'bg-[#e2efda]'],
  ['COUT MATIERE', 'ACHATS SOLIDES HT', 'METRO /\nDEPANNAGE', 'bg-[#e2efda]'],
  ['COUT MATIERE', 'ACHATS SOLIDES HT', 'MARTEL', 'bg-[#e2efda]'],
  ['COUT MATIERE', 'ACHAT HT', 'TOTAL HT', 'bg-[#a9d08e]'],
  ['COUT MATIERE', 'ACHAT HT', 'CUMUL HT', 'bg-[#a9d08e]'],
  ['COUT MATIERE', 'RATIO', 'SANS LE\nSTOCK', 'bg-[#e2efda]'],
  ['FRAIS DE PERSONNEL PROJECTION', '', 'TOTAL HEURES\nTRAVAILLEES', 'bg-white'],
  ['FRAIS DE PERSONNEL PROJECTION', 'PROJECTION S/C', 'CADRE\nCUISINE\n38,54 €', 'bg-[#fce4d6]'],
  ['FRAIS DE PERSONNEL PROJECTION', 'PROJECTION S/C', 'CADRE\nSALLE\n38,54 €', 'bg-[#fce4d6]'],
  ['FRAIS DE PERSONNEL PROJECTION', 'PROJECTION S/C', 'MAITRISE\nCUISINE\n20,85 €', 'bg-[#fce4d6]'],
  ['FRAIS DE PERSONNEL PROJECTION', 'PROJECTION S/C', 'MAITRISE\nSALLE\n20,85 €', 'bg-[#fce4d6]'],
  ['FRAIS DE PERSONNEL PROJECTION', 'PROJECTION S/C', 'NIV I ET II\nCUISINE\n16,04 €', 'bg-[#fce4d6]'],
  ['FRAIS DE PERSONNEL PROJECTION', 'PROJECTION S/C', 'NIV I ET II\nSALLE\n16,04 €', 'bg-[#fce4d6]'],
  ['FRAIS DE PERSONNEL PROJECTION', 'PROJECTION S/C', 'NIV III\nCUISINE\n18,35 €', 'bg-[#fce4d6]'],
  ['FRAIS DE PERSONNEL PROJECTION', 'PROJECTION S/C', 'NIV III\nSALLE\n18,35 €', 'bg-[#fce4d6]'],
  ['FRAIS DE PERSONNEL PROJECTION', 'PROJECTION S/C', 'APPRENTI\nCUISINE\n8,39 €', 'bg-[#fce4d6]'],
  ['FRAIS DE PERSONNEL PROJECTION', 'PROJECTION S/C', 'APPRENTI\nSALLE\n8,39 €', 'bg-[#fce4d6]'],
  ['FRAIS DE PERSONNEL PROJECTION', '', 'COUT GLOBAL', 'bg-white'],
  ['FRAIS DE PERSONNEL PROJECTION', 'PRODUCTIVITE\nCIBLE\n50,00', 'PRODUCTIVITE\nREELLE', 'bg-white'],
  ['FRAIS DE PERSONNEL PROJECTION', 'BUDGET FRAIS\nPERSONNEL\n35,00%', 'FRAIS PERSONNEL\n%', 'bg-white'],
  ['FRAIS DE PERSONNEL PROJECTION', '', 'RATIO HEBDO %', 'bg-white'],
  ['FRAIS DE PERSONNEL REALISE', '', 'TOTAL HEURES\nTRAVAILLEES', 'bg-white'],
  ['FRAIS DE PERSONNEL REALISE', 'FRAIS PERSONNEL REALISE', 'CADRE\nCUISINE\n38,54 €', 'bg-[#fce4d6]'],
  ['FRAIS DE PERSONNEL REALISE', 'FRAIS PERSONNEL REALISE', 'CADRE\nSALLE\n38,54 €', 'bg-[#fce4d6]'],
  ['FRAIS DE PERSONNEL REALISE', 'FRAIS PERSONNEL REALISE', 'MAITRISE\nCUISINE\n20,85 €', 'bg-[#fce4d6]'],
  ['FRAIS DE PERSONNEL REALISE', 'FRAIS PERSONNEL REALISE', 'MAITRISE\nSALLE\n20,85 €', 'bg-[#fce4d6]'],
  ['FRAIS DE PERSONNEL REALISE', 'FRAIS PERSONNEL REALISE', 'NIV I ET II\nCUISINE\n16,04 €', 'bg-[#fce4d6]'],
  ['FRAIS DE PERSONNEL REALISE', 'FRAIS PERSONNEL REALISE', 'NIV I ET II\nSALLE\n16,04 €', 'bg-[#fce4d6]'],
  ['FRAIS DE PERSONNEL REALISE', 'FRAIS PERSONNEL REALISE', 'NIV III\nCUISINE\n18,35 €', 'bg-[#fce4d6]'],
  ['FRAIS DE PERSONNEL REALISE', 'FRAIS PERSONNEL REALISE', 'NIV III\nSALLE\n18,35 €', 'bg-[#fce4d6]'],
  ['FRAIS DE PERSONNEL REALISE', 'FRAIS PERSONNEL REALISE', 'APPRENT\nI CUISINE\n8,39 €', 'bg-[#fce4d6]'],
  ['FRAIS DE PERSONNEL REALISE', 'FRAIS PERSONNEL REALISE', 'APPRENT\nI SALLE\n8,39 €', 'bg-[#fce4d6]'],
  ['FRAIS DE PERSONNEL REALISE', '', 'COUT GLOBAL', 'bg-white'],
  ['FRAIS DE PERSONNEL REALISE', 'PRODUCTIVITE\nCIBLE\n50,00', 'PRODUCTIVITE\nREELLE', 'bg-white'],
  ['FRAIS DE PERSONNEL REALISE', 'BUDGET FRAIS\nPERSONNEL\n35,00%', 'FRAIS PERSONNEL\n%', 'bg-white'],
  ['FRAIS DE PERSONNEL REALISE', '', 'RATIO HEBDO %', 'bg-white'],
  ['FRAIS DE PERSONNEL REALISE', '', 'Ecart au Budget\nNB d\'Heure', 'bg-white'],
  ['FRAIS DE PERSONNEL REALISE', '', 'Ecart au budget\nS/C %', 'bg-white'],
  ['FRAIS DE PERSONNEL REALISE', '', 'VAR %\nVS N-1', 'bg-hatched'],
  ['FRAIS GENERAUX', 'ENTRETIEN ET REPARATION', 'DATE', 'bg-[#e9eef7]'],
  ['FRAIS GENERAUX', 'ENTRETIEN ET REPARATION', 'FOURNISSEUR', 'bg-[#e9eef7]'],
  ['FRAIS GENERAUX', 'ENTRETIEN ET REPARATION', 'MOTIF ACHAT', 'bg-[#e9eef7]'],
  ['FRAIS GENERAUX', 'ENTRETIEN ET REPARATION', 'MONTANT HT', 'bg-[#e9eef7]'],
  ['FRAIS GENERAUX', 'ECOLAB / DIVERSEY', 'DATE', 'bg-[#e9eef7]'],
  ['FRAIS GENERAUX', 'ECOLAB / DIVERSEY', 'FOURNISSEURS', 'bg-[#e9eef7]'],
  ['FRAIS GENERAUX', 'ECOLAB / DIVERSEY', 'MOTIF ACHAT', 'bg-[#e9eef7]'],
  ['FRAIS GENERAUX', 'ECOLAB / DIVERSEY', 'MONTANT HT', 'bg-[#e9eef7]'],
  ['FRAIS GENERAUX', 'MARKETING LOCAL (BFF / FUCHEY / TRADER)', 'DATE', 'bg-[#e9eef7]'],
  ['FRAIS GENERAUX', 'MARKETING LOCAL (BFF / FUCHEY / TRADER)', 'FOURNISSEURS', 'bg-[#e9eef7]'],
  ['FRAIS GENERAUX', 'MARKETING LOCAL (BFF / FUCHEY / TRADER)', 'MOTIF ACHAT', 'bg-[#e9eef7]'],
  ['FRAIS GENERAUX', 'MARKETING LOCAL (BFF / FUCHEY / TRADER)', 'MONTANT HT', 'bg-[#e9eef7]'],
  ['CONTRAT MENSUALISES', '', 'Nom', 'bg-[#e9eef7]'],
  ['CONTRAT MENSUALISES', '', 'Montant', 'bg-[#e9eef7]'],
  ['RESULTATS MENSUEL HT', 'CA / COUVERTS', 'Indicateur', 'bg-[#fff2cc]'],
  ['RESULTATS MENSUEL HT', 'CA / COUVERTS', 'Valeur', 'bg-white']
];
const days: string[] = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const monthNames: string[] = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const tabs: { id: string; label: string }[] = [
  { id: 'PREVISIONS', label: 'Prévisions' },
  { id: 'REALISE', label: 'Réalisé' },
  { id: 'COUT_MATIERE', label: 'Coût matière' },
  { id: 'PERSONNEL', label: 'Personnel' },
  { id: 'FRAIS_GENERAUX', label: 'Frais généraux' },
  { id: 'RESULTATS', label: 'Résultats' },
];
const viewModes = [
  { id: 'SAISIE', label: 'Saisie' },
  { id: 'ANALYSE', label: 'Analyse' },
  { id: 'COMPLET', label: 'Complet' },
] as const;

type TableViewMode = (typeof viewModes)[number]['id'];
const editableCols: number[] = [
  6, 7, 8, 9, 14, 15, 17, 18, 19, 20, 25, 27, 34, 37, 38, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90
];
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
    setSelectedYear,
    setSelectedMonth,
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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [importPreview, setImportPreview] = useState<Array<{ label: string; value: string }>>([]);
  const [invoiceImportStatus, setInvoiceImportStatus] = useState('');
  const [invoiceImportPreviews, setInvoiceImportPreviews] = useState<InvoiceImportPreview[]>([]);
  const [purchaseSupplierNames, setPurchaseSupplierNames] = useState<Record<number, string>>(() => {
    try {
      const saved = localStorage.getItem('dashboard_purchase_supplier_names_v1');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [expandedCashDetail, setExpandedCashDetail] = useState<'ancv' | 'tr' | null>(null);
  const [isCashValidationModalOpen, setIsCashValidationModalOpen] = useState(false);
  const [cashValidationDraft, setCashValidationDraft] = useState('');
  const [selectedEntryDay, setSelectedEntryDay] = useState(() => {
    const now = new Date();
    return initialMonth === now.getMonth() && year === now.getFullYear() ? now.getDate() : 1;
  });

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
    setImportPreview([]);
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
    const data: Record<string, string> = { ...cellData };
    let cumulCA = 0;
    let cumulCvts = 0;
    let cumulRealiseCA = 0;
    let cumulCoutMatiere = 0;
    let cumulCvtsRealise = 0;
    let cumulCvtsLimo = 0;

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
          data[`${rIdx}-10`] = jourCvts.toString();
          const jourMoy = (budgetMidi + budgetSoir) / jourCvts;
          data[`${rIdx}-11`] = jourMoy.toString();
          
          cumulCvts += jourCvts;
          data[`${rIdx}-12`] = cumulCvts.toString();
        }

        // REALISE CA HT — 17=VAE,18=MIDI,19=SOIR,20=LIMO,21=TOTAL,22=ECART,23=CUMUL
        const realiseVae  = parseFloat(data[`${rIdx}-17`] || '0');
        const realiseMidi = parseFloat(data[`${rIdx}-18`] || '0');
        const realiseSoir = parseFloat(data[`${rIdx}-19`] || '0');
        const realiseLimo = parseFloat(data[`${rIdx}-20`] || '0');
        const realiseTotalJour = realiseVae + realiseMidi + realiseSoir + realiseLimo;
        if (realiseTotalJour > 0 || data[`${rIdx}-17`] || data[`${rIdx}-18`] || data[`${rIdx}-19`] || data[`${rIdx}-20`]) {
          data[`${rIdx}-21`] = realiseTotalJour.toFixed(2);
          data[`${rIdx}-22`] = (realiseTotalJour - totalJour).toFixed(2);
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
        // COUVERTS LIMONADE — 32=NB,33=MOY,34=CUMUL
        const nbCvtsLimo = parseFloat(data[`${rIdx}-34`] || '0');
        if (nbCvtsLimo > 0 && realiseLimo > 0) data[`${rIdx}-35`] = (realiseLimo / nbCvtsLimo).toFixed(2);
        if (nbCvtsLimo > 0) {
          cumulCvtsLimo = (cumulCvtsLimo || 0) + nbCvtsLimo;
          data[`${rIdx}-36`] = cumulCvtsLimo.toFixed(0);
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
          const colIdx = 78 + i; // PROJECTION S/C columns start at 76 (CADRE en 74+75 éditable séparément)
          if (data[`${rIdx}-${colIdx}`]) {
            const val = parseFloat(data[`${rIdx}-${colIdx}`] || '0');
            totalHeuresProj += val;
            coutGlobalProj += val * projRates[i];
            hasProjData = true;
          }
        }
        
        if (hasProjData) {
          data[`${rIdx}-65`] = totalHeuresProj.toFixed(2);
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
          const colIdx = 91 + i;
          if (data[`${rIdx}-${colIdx}`]) {
            const val = parseFloat(data[`${rIdx}-${colIdx}`] || '0');
            totalHeuresReal += val;
            coutGlobalReal += val * projRates[i];
            hasRealData = true;
          }
        }
        
        if (hasRealData) {
          data[`${rIdx}-76`] = totalHeuresReal.toFixed(2);
          data[`${rIdx}-83`] = coutGlobalReal.toFixed(2);
          if (totalHeuresReal > 0) {
            data[`${rIdx}-84`] = (realiseTotalJour / totalHeuresReal).toFixed(2);
          }
          if (realiseTotalJour > 0) {
            data[`${rIdx}-85`] = ((coutGlobalReal / realiseTotalJour) * 100).toFixed(2) + '%';
          }
          
          // Ecarts
          if (hasProjData) {
            data[`${rIdx}-87`] = (totalHeuresReal - totalHeuresProj).toFixed(2);
            if (realiseTotalJour > 0) {
              const pctReal = (coutGlobalReal / realiseTotalJour) * 100;
              const pctProj = (coutGlobalProj / realiseTotalJour) * 100;
              data[`${rIdx}-88`] = (pctReal - pctProj).toFixed(2) + '%';
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
          if (dynamicColumns[cIdx][3] === 'bg-hatched' || ['DATE', 'FOURNISSEUR', 'FOURNISSEURS', 'MOTIF ACHAT', 'Nom'].includes(colName) || [7, 9, 11, 15, 4, 12, 22, 23, 26, 28, 35, 59, 60, 73, 74, 77, 78, 79, 84, 85, 88].includes(cIdx)) return;

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
        // Cout matiere semaine
        const coutMatiereW = parseFloat(data[`${rIdx}-58`] || '0');
        if (realiseCAW > 0) data[`${rIdx}-60`] = ((coutMatiereW / realiseCAW) * 100).toFixed(2) + '%';

        const totalHeuresProjW = parseFloat(data[`${rIdx}-65`] || '0');
        const coutGlobalProjW = parseFloat(data[`${rIdx}-72`] || '0');
        if (totalHeuresProjW > 0) data[`${rIdx}-73`] = (realiseCAW / totalHeuresProjW).toFixed(2);
        if (realiseCAW > 0) {
          data[`${rIdx}-74`] = ((coutGlobalProjW / realiseCAW) * 100).toFixed(2) + '%';
          data[`${rIdx}-75`] = ((coutGlobalProjW / realiseCAW) * 100).toFixed(2) + '%';
        }
        
        const totalHeuresRealW = parseFloat(data[`${rIdx}-76`] || '0');
        const coutGlobalRealW = parseFloat(data[`${rIdx}-83`] || '0');
        if (totalHeuresRealW > 0) data[`${rIdx}-84`] = (realiseCAW / totalHeuresRealW).toFixed(2);
        if (realiseCAW > 0) {
          data[`${rIdx}-85`] = ((coutGlobalRealW / realiseCAW) * 100).toFixed(2) + '%';
          data[`${rIdx}-86`] = ((coutGlobalRealW / realiseCAW) * 100).toFixed(2) + '%';
        }
        
        data[`${rIdx}-87`] = (totalHeuresRealW - totalHeuresProjW).toFixed(2);
        if (realiseCAW > 0) {
          const pctRealW = (coutGlobalRealW / realiseCAW) * 100;
          const pctProjW = (coutGlobalProjW / realiseCAW) * 100;
          data[`${rIdx}-88`] = (pctRealW - pctProjW).toFixed(2) + '%';
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
        if (dynamicColumns[cIdx][3] === 'bg-hatched' || ['DATE', 'FOURNISSEUR', 'FOURNISSEURS', 'MOTIF ACHAT', 'Nom'].includes(colName) || [7, 9, 11, 15, 4, 12, 22, 23, 26, 28, 35, 59, 60, 73, 74, 77, 78, 79, 84, 85, 88].includes(cIdx)) return;

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
      const totalCvtsM = nbMidiM + nbSoirM;
      if (totalCvtsM > 0) data[`${monthTotalIdx}-29`] = totalCvtsM.toFixed(0);

      const totalHeuresProjM = parseFloat(data[`${monthTotalIdx}-65`] || '0');
      const coutGlobalProjM = parseFloat(data[`${monthTotalIdx}-72`] || '0');
      if (totalHeuresProjM > 0) data[`${monthTotalIdx}-73`] = (realiseCAM / totalHeuresProjM).toFixed(2);
      if (realiseCAM > 0) {
        data[`${monthTotalIdx}-74`] = ((coutGlobalProjM / realiseCAM) * 100).toFixed(2) + '%';
        data[`${monthTotalIdx}-75`] = ((coutGlobalProjM / realiseCAM) * 100).toFixed(2) + '%';
      }
      
      const totalHeuresRealM = parseFloat(data[`${monthTotalIdx}-76`] || '0');
      const coutGlobalRealM = parseFloat(data[`${monthTotalIdx}-83`] || '0');
      if (totalHeuresRealM > 0) data[`${monthTotalIdx}-84`] = (realiseCAM / totalHeuresRealM).toFixed(2);
      if (realiseCAM > 0) {
        data[`${monthTotalIdx}-85`] = ((coutGlobalRealM / realiseCAM) * 100).toFixed(2) + '%';
        data[`${monthTotalIdx}-86`] = ((coutGlobalRealM / realiseCAM) * 100).toFixed(2) + '%';
      }
      
      data[`${monthTotalIdx}-87`] = (totalHeuresRealM - totalHeuresProjM).toFixed(2);
      if (realiseCAM > 0) {
        const pctRealM = (coutGlobalRealM / realiseCAM) * 100;
        const pctProjM = (coutGlobalProjM / realiseCAM) * 100;
        data[`${monthTotalIdx}-88`] = (pctRealM - pctProjM).toFixed(2) + '%';
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
      fraisPersonnel: parseDashboardNumber(calculatedData[`${monthTotalIdx}-83`]),
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

  const formatValue = (val: string | number | undefined, c: string[]) => {
    if (val === '' || val === undefined || val === null) return '';
    
    // If the value already contains a percentage sign, return it as is
    if (typeof val === 'string' && val.includes('%')) return val;

    const num = parseFloat(String(val));
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
    return dynamicColumns.map((c, index) => Object.assign([...c] as DashboardColumn, { originalIndex: index })).filter(c => {
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
      const contextColumns = new Set([
        0, 1, 2, 3, 4, 10, 11, 12,
        21, 22, 23, 29, 30, 31, 32, 33, 35, 36,
        49, 58, 59, 60,
        65, 72, 73, 74, 76, 83, 84, 85, 87, 88,
      ]);

      if (tableViewMode === 'SAISIE') {
        return isDailyDemarqueColumn || isEditableColumn || contextColumns.has(colIndex);
      }

      if (group === 'FRAIS GENERAUX' || group === 'CONTRAT MENSUALISES') {
        return true;
      }

      return !isEditableColumn || contextColumns.has(colIndex);
    });
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
  const formatImportedNumber = (value: number, decimals = 2) => value > 0 ? value.toFixed(decimals) : '';
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
    return `${fullYear}-${monthValue}-${day}`;
  };

  const formatInvoiceDateLabel = (value: string) => {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
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

  const createInvoiceImportId = (fileName: string, index: number) => `${Date.now()}-${index}-${fileName}`;

  const getInvoiceConfidence = (supplierNeedsCheck: boolean, amountHt: number, invoiceDate: string, targetCol: number): InvoiceImportPreview['confidence'] => (
    !supplierNeedsCheck && amountHt > 0 && Boolean(invoiceDate) && targetCol >= 45 && targetCol <= 57
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
    const confidence = getInvoiceConfidence(supplierNeedsCheck, amountHt, invoiceDate, supplierMatch.targetCol);

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
        ? 'Fournisseur et colonne cible à vérifier avant validation.'
        : amountHt && invoiceDate
        ? 'Lecture facture prête à valider.'
        : !amountHt
          ? 'Montant HT à renseigner manuellement avant validation.'
          : 'Date de facture à vérifier avant validation.',
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

  const parseCaisseRealise = (sourceText: string) => {
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
    };
  };

  const handleDailyRealiseImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportStatus('Lecture de la feuille de caisse...');
    setImportPreview([]);

    try {
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
      if (targetDayEntry?.row.dayIndex) setSelectedEntryDay(targetDayEntry.row.dayIndex);

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
  const getDailyDisplayValue = (col: number) => formatValue(getDailyCellValue(col), dynamicColumns[col] || ['', '', '', '']);
  const isDailyFieldFocused = (col: number) => focusedCell === `${selectedDayRowIndex}-${col}`;

  const dailyInputClass = "w-full h-8 rounded-md border border-slate-400 bg-white px-2 text-right text-sm font-bold text-slate-950 outline-none transition-all hover:border-slate-600 focus:border-slate-700 focus:ring-2 focus:ring-slate-500/15";
  const dailyReadOnlyClass = "flex h-8 items-center justify-end gap-1 overflow-hidden rounded-md border border-slate-300 bg-slate-100/90 px-2 text-sm font-bold text-slate-700 shadow-inner";
  const cashInputClass = "w-full h-7 rounded-md border border-slate-400 bg-white px-2 text-right text-xs font-bold text-slate-950 outline-none transition-all hover:border-slate-600 focus:border-slate-700 focus:ring-2 focus:ring-slate-500/15";

  const renderAutoValue = (value: string | number, options: { className?: string; style?: React.CSSProperties } = {}) => (
    <div className={`${dailyReadOnlyClass} ${options.className || ''}`} style={options.style}>
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || '-'}</span>
    </div>
  );
  const renderCashAutoValue = (value: string | number, options: { style?: React.CSSProperties } = {}) => (
    renderAutoValue(value, { className: 'h-7 px-2 text-xs', style: options.style })
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

  const renderRealCaisseControl = (
    label: string,
    theorique: string,
    value: string,
    onChange: (value: string) => void,
    options: { detailId?: 'ancv' | 'tr'; details?: React.ReactNode; invertEcart?: boolean } = {}
  ) => {
    const hasValues = Boolean(theorique || value);
    const realValue = parseCaisseNumber(value) * (options.invertEcart ? -1 : 1);
    const ecart = realValue - parseCaisseNumber(theorique);
    const ecartDisplay = hasValues ? ecart.toFixed(2) : '-';
    const isExpanded = options.detailId && expandedCashDetail === options.detailId;

    return (
      <div key={label} style={{ display: 'grid', gridTemplateColumns: 'minmax(132px, .66fr) repeat(3, minmax(0, 1fr))', gap: 6, alignItems: 'center', minWidth: 0 }}>
        {options.detailId ? (
          <button
            type="button"
            onClick={() => setExpandedCashDetail(isExpanded ? null : options.detailId || null)}
            style={{
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              border: 'none',
              background: 'transparent',
              padding: 0,
              color: isExpanded ? '#0f766e' : '#334155',
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 950,
              letterSpacing: '.03em',
              textAlign: 'left',
              textTransform: 'uppercase',
              textDecoration: isExpanded ? 'underline' : 'none',
              textUnderlineOffset: 3,
            }}
            title="Afficher le détail du nombre"
          >
            {label}
          </button>
        ) : (
          <span style={{ fontSize: 10, fontWeight: 900, color: '#334155', textTransform: 'uppercase', letterSpacing: '.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        )}
        {renderCashAutoValue(theorique)}
        <DebouncedInput
          dataRow={`cash-${selectedDayRowIndex}`}
          dataCol={label}
          value={value}
          onChange={nextValue => onChange(String(nextValue).replace(/[^0-9.,-]/g, '').replace(',', '.'))}
          className={cashInputClass}
          placeholder=""
        />
        {renderCashAutoValue(ecartDisplay, { style: { color: hasValues && ecart < -0.001 ? '#dc2626' : hasValues && ecart > 0.001 ? '#059669' : '#475569' } })}
        {isExpanded && options.details ? (
          <div style={{ gridColumn: '2 / -1', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, minmax(0, 1fr))', gap: 6, padding: 6, border: '1px solid #0f172a', borderRadius: 8, background: '#f8fafc' }}>
            {options.details}
          </div>
        ) : null}
      </div>
    );
  };

  const renderRealCaisseTable = () => {
    const day = selectedDayRow?.dayIndex;
    if (!day) return null;

    const monthData = globalData[month];
    const nepting = monthData?.nepting?.[day];
    const especes = monthData?.especes?.[day];
    const conecs = monthData?.conecs?.[day];
    const ancv = monthData?.ancvPapiers?.[day];
    const sunday = monthData?.sunday?.[day];
    const uber = monthData?.uber?.[day];
    const amexAncv = monthData?.amexAncv?.[day];
    const deliveroo = monthData?.deliveroo?.[day];
    const clickCollect = monthData?.clickCollect?.[day];
    const trData = monthData?.saisieTR?.[day];
    const trPapier = trData?.edenred?.[0];
    const trPapierProviders = [
      { key: 'bimpli', label: 'Bimpli' },
      { key: 'up', label: 'Up' },
      { key: 'pluxee', label: 'Pluxee' },
      { key: 'edenred', label: 'Edenred' },
    ] as const;
    const trPapierReel = trPapierProviders.reduce((sum, provider) => sum + parseCaisseNumber(trData?.[provider.key]?.[0]?.valeur || ''), 0);
    const trPapierDisplay = trPapierReel ? trPapierReel.toFixed(2) : trPapier?.valeur || '';
    const theorique = monthData?.theorique?.[day];
    const cashValidationComment = nepting?.commentaire || '';
    const cashValidationLabel = cashValidationComment ? 'Validation enregistrée' : 'Non validé';

    const renderCashDetailField = (label: string, value: string, onChange: (value: string) => void) => (
      <label key={label} style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</span>
        <DebouncedInput
          dataRow={`cash-detail-${selectedDayRowIndex}`}
          dataCol={label}
          value={value}
          onChange={nextValue => onChange(String(nextValue).replace(/[^0-9]/g, ''))}
          className="w-full h-7 rounded-md border border-slate-400 bg-white px-2 text-right text-xs font-bold text-slate-950 outline-none transition-all focus:border-slate-700 focus:ring-2 focus:ring-slate-500/15"
          placeholder=""
        />
      </label>
    );

    const cashRows = [
      { label: 'CB', theorique: theorique?.cb || '', value: nepting?.saisie_reel_nepting || '' },
      { label: 'Pourboires', theorique: '', value: nepting?.pourboire_sunday || '', multiplier: -1 },
      { label: 'Espèces coffre', theorique: theorique?.especes || '', value: especes?.mis_au_coffre || '' },
      { label: 'Pièces', theorique: '', value: especes?.pieces || '' },
      { label: 'AMEX/ANCV carte', theorique: theorique?.amex || '', value: amexAncv?.reel_nepting || '' },
      { label: 'TR carte', theorique: theorique?.tr_carte || '', value: conecs?.conecs_reel_nepting || '' },
      { label: 'ANCV papier', theorique: theorique?.ancv || '', value: ancv?.montant_total || '' },
      { label: 'TR papier', theorique: theorique?.tr_papier || '', value: trPapierDisplay },
      { label: 'Sunday', theorique: theorique?.sunday || '', value: sunday?.reel || '' },
      { label: 'Uber', theorique: theorique?.uber || '', value: uber?.reel || '' },
      { label: 'Deliveroo', theorique: theorique?.deliveroo || '', value: deliveroo?.reel || '' },
      { label: 'Click & collect', theorique: theorique?.click_collect || '', value: clickCollect?.reel || '' },
    ];
    const totalTheorique = cashRows.reduce((sum, row) => sum + parseCaisseNumber(row.theorique), 0);
    const totalReel = cashRows.reduce((sum, row) => sum + parseCaisseNumber(row.value) * (row.multiplier || 1), 0);
    const totalEcart = totalReel - totalTheorique;
    const hasTotalEcart = Math.abs(totalEcart) > 0.001;
    const totalEcartColor = totalEcart < -0.001 ? '#dc2626' : totalEcart > 0.001 ? '#059669' : '#475569';

    const handleCashValidation = () => {
      if (hasTotalEcart) {
        setCashValidationDraft(cashValidationComment.replace(/^Validation caisse\s*:\s*/i, ''));
        setIsCashValidationModalOpen(true);
        return;
      }
      updateNepting(month, day, 'commentaire', `Validation caisse : OK sans écart le ${new Date().toLocaleDateString('fr-FR')}`);
    };

    return (
      <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr', gap: 5, width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(132px, .66fr) repeat(3, minmax(0, 1fr))', gap: 6, alignItems: 'center', minWidth: 0 }}>
          <div />
          <div style={{ fontSize: 10, fontWeight: 950, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '.04em', textAlign: 'right' }}>Théorique</div>
          <div style={{ fontSize: 10, fontWeight: 950, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '.04em', textAlign: 'right' }}>Réel</div>
          <div style={{ fontSize: 10, fontWeight: 950, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '.04em', textAlign: 'right' }}>Écart</div>
        </div>
        {renderRealCaisseControl('CB', theorique?.cb || '', nepting?.saisie_reel_nepting || '', value => updateNepting(month, day, 'saisie_reel_nepting', value))}
        {renderRealCaisseControl('Pourboires', '', nepting?.pourboire_sunday || '', value => updateNepting(month, day, 'pourboire_sunday', value), { invertEcart: true })}
        {renderRealCaisseControl('Espèces coffre', theorique?.especes || '', especes?.mis_au_coffre || '', value => updateEspeces(month, day, 'mis_au_coffre', value))}
        {renderRealCaisseControl('Pièces', '', especes?.pieces || '', value => updateEspeces(month, day, 'pieces', value))}
        {renderRealCaisseControl('AMEX/ANCV carte', theorique?.amex || '', amexAncv?.reel_nepting || '', value => updateAmexAncv(month, day, 'reel_nepting', value))}
        {renderRealCaisseControl('TR carte', theorique?.tr_carte || '', conecs?.conecs_reel_nepting || '', value => updateConecs(month, day, 'conecs_reel_nepting', value))}
        {renderRealCaisseControl('ANCV papier', theorique?.ancv || '', ancv?.montant_total || '', value => updateAncvPapiers(month, day, 'montant_total', value), {
          detailId: 'ancv',
          details: renderCashDetailField('Nombre ANCV papier', ancv?.nombre_ancv || '', value => updateAncvPapiers(month, day, 'nombre_ancv', value)),
        })}
        {renderRealCaisseControl('TR papier', theorique?.tr_papier || '', trPapierDisplay, value => {
          updateSaisieTR(month, day, 'edenred', 0, 'valeur', value);
        }, {
          detailId: 'tr',
          details: trPapierProviders.map(provider => renderCashDetailField(provider.label, trData?.[provider.key]?.[0]?.nombre || '', value => updateSaisieTR(month, day, provider.key, 0, 'nombre', value))),
        })}
        {renderRealCaisseControl('Sunday', theorique?.sunday || '', sunday?.reel || '', value => updateSunday(month, day, 'reel', value))}
        {renderRealCaisseControl('Uber', theorique?.uber || '', uber?.reel || '', value => updateUber(month, day, 'reel', value))}
        {renderRealCaisseControl('Deliveroo', theorique?.deliveroo || '', deliveroo?.reel || '', value => updateDeliveroo(month, day, 'reel', value))}
        {renderRealCaisseControl('Click & collect', theorique?.click_collect || '', clickCollect?.reel || '', value => updateClickCollect(month, day, 'reel', value))}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(132px, .66fr) repeat(3, minmax(0, 1fr))', gap: 6, alignItems: 'center', marginTop: 2, paddingTop: 7, borderTop: '1px solid #cbd5e1' }}>
          <div style={{ fontSize: 10, fontWeight: 950, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '.04em' }}>Total caisse</div>
          {renderCashAutoValue(totalTheorique.toFixed(2))}
          {renderCashAutoValue(totalReel.toFixed(2))}
          {renderCashAutoValue(totalEcart.toFixed(2), { style: { color: totalEcartColor } })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', padding: '7px 10px', border: `1px solid ${hasTotalEcart ? '#fecaca' : '#bbf7d0'}`, borderRadius: 8, background: hasTotalEcart ? '#fef2f2' : '#f0fdf4' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 950, color: hasTotalEcart ? '#991b1b' : '#166534', textTransform: 'uppercase', letterSpacing: '.04em' }}>Écart total : {totalEcart.toFixed(2)}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cashValidationLabel}</div>
          </div>
          <button
            type="button"
            onClick={handleCashValidation}
            style={{ border: 'none', borderRadius: 7, background: hasTotalEcart ? '#dc2626' : '#16a34a', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 950, padding: '7px 11px', whiteSpace: 'nowrap' }}
          >
            Valider
          </button>
        </div>
      </div>
    );
  };

  const renderDailyServiceRow = (label: string, caCol: number, coversCol: number, tmCol: number) => (
    <div key={label} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '78px repeat(3, minmax(120px, 1fr))', gap: 8, alignItems: 'end', gridColumn: '1 / -1' }}>
      <div style={{ height: isMobile ? 'auto' : 32, display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 900, color: '#0f172a' }}>{label}</div>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.04em' }}>CA {label}</span>
        {renderDailyControl(caCol, { readOnly: true })}
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.04em' }}>Cts {label}</span>
        {renderDailyControl(coversCol, { readOnly: true })}
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.04em' }}>TM {label}</span>
        {renderDailyControl(tmCol, { readOnly: true })}
      </label>
    </div>
  );

  const renderDailySingleRow = (label: string, col: number, options: { readOnly?: boolean; text?: boolean } = {}) => (
    <div key={`${label}-${col}`} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '78px repeat(3, minmax(120px, 1fr))', gap: 8, alignItems: 'end', gridColumn: '1 / -1' }}>
      <div style={{ height: isMobile ? 'auto' : 32, display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 900, color: '#0f172a' }}>{label}</div>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</span>
        {renderDailyControl(col, options)}
      </label>
    </div>
  );

  const renderDailyTotalRow = (items: Array<{ label: string; col: number }>) => (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '78px repeat(3, minmax(120px, 1fr))', gap: 8, alignItems: 'end', gridColumn: '1 / -1' }}>
      <div style={{ height: isMobile ? 'auto' : 32, display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 900, color: '#0f172a' }}>Totaux</div>
      {items.map(item => (
        <label key={`total-${item.col}`} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 900, color: '#334155', textTransform: 'uppercase', letterSpacing: '.04em' }}>{item.label}</span>
          {renderDailyControl(item.col, { readOnly: true })}
        </label>
      ))}
    </div>
  );

  const renderDailyRealiseMatrix = () => {
    const columns = [
      { label: 'VAE', compact: 'VAE' },
      { label: 'Midi', compact: 'Midi' },
      { label: 'Soir', compact: 'Soir' },
      { label: 'Limonade', compact: 'Limo' },
      { label: 'Total', compact: 'Total' },
    ];
    const rows: Array<{ label: string; cells: Array<{ col: number; readOnly?: boolean } | null> }> = [
      {
        label: 'CA',
        cells: [
          { col: 17 },
          { col: 18 },
          { col: 19 },
          { col: 20 },
          { col: 21, readOnly: true },
        ],
      },
      {
        label: 'Couverts',
        cells: [
          null,
          { col: 25 },
          { col: 27 },
          { col: 34 },
          { col: 29, readOnly: true },
        ],
      },
      {
        label: 'Ticket moyen',
        cells: [
          null,
          { col: 26, readOnly: true },
          { col: 28, readOnly: true },
          { col: 35, readOnly: true },
          { col: 30, readOnly: true },
        ],
      },
    ];

    return (
      <div style={{ gridColumn: '1 / -1', overflowX: 'auto', paddingBottom: 2 }}>
        <div style={{ minWidth: isMobile ? 620 : 0, display: 'grid', gridTemplateColumns: isMobile ? '118px repeat(5, minmax(92px, 1fr))' : '140px repeat(5, minmax(130px, 1fr))', gap: 8, alignItems: 'center' }}>
          <div />
          {columns.map(column => (
            <div key={column.label} style={{ minHeight: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: column.label === 'Total' ? '#eff6ff' : '#f8fafc', border: '1px solid #dbe5ec', color: column.label === 'Total' ? '#1d4ed8' : '#334155', fontSize: 11, fontWeight: 950, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              {isMobile ? column.compact : column.label}
            </div>
          ))}

          {rows.map(row => (
            <React.Fragment key={row.label}>
              <div style={{ minHeight: 36, display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 950, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '.03em' }}>{row.label}</div>
              {row.cells.map((cell, index) => (
                <div key={`${row.label}-${columns[index].label}`} style={{ minWidth: 0 }}>
                  {cell ? renderDailyControl(cell.col, { readOnly: cell.readOnly }) : (
                    <div className={dailyReadOnlyClass} style={{ justifyContent: 'center', color: '#94a3b8' }}>-</div>
                  )}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const renderPersonnelRow = (label: string, cuisineCol: number, salleCol: number) => (
    <div key={`${label}-${cuisineCol}-${salleCol}`} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '180px repeat(2, minmax(180px, 1fr))', gap: 12, alignItems: 'center', gridColumn: '1 / -1' }}>
      <div style={{ height: isMobile ? 'auto' : 36, display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 900, color: '#0f172a' }}>{label}</div>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.04em' }}>Cuisine</span>
        {renderDailyControl(cuisineCol)}
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.04em' }}>Salle</span>
        {renderDailyControl(salleCol)}
      </label>
    </div>
  );

  const renderPersonnelTable = (rows: React.ReactNode) => (
    <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
      {!isMobile && (
        <div style={{ display: 'grid', gridTemplateColumns: '180px repeat(2, minmax(180px, 1fr))', gap: 12, alignItems: 'center' }}>
          <div />
          <div style={{ fontSize: 12, fontWeight: 950, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '.04em' }}>Cuisine</div>
          <div style={{ fontSize: 12, fontWeight: 950, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '.04em' }}>Salle</div>
        </div>
      )}
      {rows}
    </div>
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
    <section style={{ background: '#fff', border: '1px solid #dbe5ec', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)' }}>
      <div style={{ padding: '9px 12px', borderBottom: `1px solid ${tint(accent, 0.34)}`, background: `linear-gradient(135deg, ${tint(accent, 0.30)} 0%, ${tint(accent, 0.16)} 48%, #f8fafc 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{ width: 6, height: 24, borderRadius: 999, background: `linear-gradient(180deg, ${accent}, ${tint(accent, 0.78)})`, boxShadow: `0 0 0 3px ${tint(accent, 0.12)}`, flexShrink: 0 }} />
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap' }}>{title}</h3>
        </div>
        <p style={{ margin: 0, fontSize: 11, color: '#475569', fontWeight: 800, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: isMobile ? 'normal' : 'nowrap' }}>{subtitle}</p>
      </div>
      <div style={{ padding: isMobile ? 10 : 12, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(130px, 1fr))', columnGap: 8, rowGap: 8 }}>
        {fields}
      </div>
    </section>
  );

  const renderDatePicker = () => (
    <div style={{ position: 'absolute', left: 0, top: 'calc(100% + 10px)', width: isMobile ? 320 : 430, maxWidth: 'calc(100vw - 32px)', background: weatherTheme, color: '#ecfeff', border: '1px solid rgba(207,250,254,.28)', borderRadius: 14, padding: 14, boxShadow: '0 20px 48px rgba(2, 6, 23, 0.34), inset 0 1px 0 rgba(255,255,255,.12)', zIndex: 140 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 104px', gap: 10, marginBottom: 12 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 900, color: 'rgba(236,254,255,.76)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Mois</span>
          <select
            value={month}
            onChange={event => selectMonth(Number(event.target.value))}
            style={{ height: 38, border: '1px solid rgba(207,250,254,.24)', borderRadius: 10, padding: '0 10px', fontWeight: 850, color: '#ecfeff', background: 'rgba(5, 42, 52, .82)', textTransform: 'capitalize', outline: 'none' }}
          >
            {monthSelectOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em' }}>Année</span>
          <select
            value={year}
            onChange={event => setSelectedYear(Number(event.target.value))}
            style={{ height: 38, border: '1px solid rgba(207,250,254,.24)', borderRadius: 10, padding: '0 10px', fontWeight: 850, color: '#ecfeff', background: 'rgba(5, 42, 52, .82)', outline: 'none' }}
          >
            {yearSelectOptions.map(option => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(34px, 1fr))', gap: 6 }}>
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
          <div key={day} style={{ textAlign: 'center', fontSize: 10, fontWeight: 900, color: 'rgba(236,254,255,.70)', textTransform: 'uppercase' }}>{day}</div>
        ))}
        {datePickerCells.map((row, index) => {
          if (!row) return <div key={`empty-${index}`} style={{ minHeight: 34 }} />;
          const isSelected = row.dayIndex === selectedEntryDay;
          const isToday = row.dateObj
            && row.dateObj.getFullYear() === todayMarker.year
            && row.dateObj.getMonth() === todayMarker.month
            && row.dateObj.getDate() === todayMarker.day;

          return (
            <button
              key={`${row.dayIndex}-${index}`}
              type="button"
              onClick={() => {
                if (row.dayIndex) setSelectedEntryDay(row.dayIndex);
                setIsDatePickerOpen(false);
              }}
              style={{
                height: 34,
                border: `1px solid ${isSelected ? 'rgba(254,243,199,.86)' : isToday ? 'rgba(251,191,36,.55)' : 'rgba(207,250,254,.18)'}`,
                borderRadius: 9,
                background: isSelected ? 'linear-gradient(135deg,#f59e0b,#fbbf24)' : isToday ? 'rgba(251,191,36,.18)' : 'rgba(255,255,255,.10)',
                color: isSelected ? '#0f172a' : isToday ? '#fde68a' : '#ecfeff',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 900,
                boxShadow: isSelected ? '0 8px 18px rgba(0,0,0,.20)' : 'none',
              }}
            >
              {row.dayIndex}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderDailyEntryView = () => {
    if (!selectedDayRow) return null;

    const achatFields = Array.from({ length: 13 }, (_, idx) => 45 + idx).map(col => renderDailyField(dynamicColumns[col]?.[2] || `Achat ${col}`, col));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: '100%', minWidth: 0, maxWidth: 1480, width: '100%', margin: '0 auto' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: isMobile ? 12 : 16, display: 'none', gridTemplateColumns: isMobile ? '1fr' : '280px 1fr', gap: isMobile ? 12 : 18, alignItems: 'start' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 96px', gap: 10 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em' }}>Mois</span>
              <select
                value={month}
                onChange={event => selectMonth(Number(event.target.value))}
                style={{ height: 38, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 10px', fontWeight: 800, color: '#0f172a', background: '#fff', textTransform: 'capitalize' }}
              >
                {monthSelectOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em' }}>Année</span>
              <select
                value={year}
                onChange={event => setSelectedYear(Number(event.target.value))}
                style={{ height: 38, border: '1px solid #cbd5e1', borderRadius: 8, padding: '0 10px', fontWeight: 800, color: '#0f172a', background: '#fff' }}
              >
                {yearSelectOptions.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(34px, 1fr))', gap: 6 }}>
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
              <div key={day} style={{ textAlign: 'center', fontSize: 10, fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>{day}</div>
            ))}
            {datePickerCells.map((row, index) => {
              if (!row) return <div key={`empty-${index}`} style={{ minHeight: 34 }} />;
              const isSelected = row.dayIndex === selectedEntryDay;
              const isToday = row.dateObj
                && row.dateObj.getFullYear() === todayMarker.year
                && row.dateObj.getMonth() === todayMarker.month
                && row.dateObj.getDate() === todayMarker.day;

              return (
                <button
                  key={`${row.dayIndex}-${index}`}
                  type="button"
                  onClick={() => row.dayIndex && setSelectedEntryDay(row.dayIndex)}
                  style={{
                    height: 34,
                    border: `1px solid ${isSelected ? '#0f172a' : '#e2e8f0'}`,
                    borderRadius: 8,
                    background: isSelected ? '#0f172a' : isToday ? '#eff6ff' : '#fff',
                    color: isSelected ? '#fff' : isToday ? '#1d4ed8' : '#334155',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 900,
                  }}
                >
                  {row.dayIndex}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
          <div style={{ background: '#050b18', color: '#fff', borderRadius: 10, padding: isMobile ? 16 : '18px 20px', marginTop: isMobile ? 4 : 24, display: 'none', justifyContent: 'space-between', gap: 12, alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.08em' }}>Saisie journalière</div>
              <h2 style={{ margin: '4px 0 0', fontSize: isMobile ? 20 : 24, fontWeight: 950, textTransform: 'capitalize' }}>{selectedDayLabel}</h2>
            </div>
            <div style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 800 }}>
              {selectedMonthLabel}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(660px, 1.35fr) minmax(420px, .9fr)', gap: 10, alignItems: 'start' }}>
            {renderDailySection('Réel caisse', 'Saisie réelle des encaissements', (
              renderRealCaisseTable()
            ), '#0f766e')}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
              {renderDailySection('Réalisé', 'Saisie du CA et des couverts par service', (
                <>
                  {renderDailySingleRow('VAE', 17, { readOnly: true })}
                  {renderDailyServiceRow('Midi', 18, 25, 26)}
                  {renderDailyServiceRow('Soir', 19, 27, 28)}
                  {renderDailyServiceRow('Limonade', 20, 34, 35)}
                  {renderDailyTotalRow([
                    { label: 'Total CA', col: 21 },
                    { label: 'Total couverts', col: 29 },
                    { label: 'Ticket moyen', col: 30 },
                  ])}
                </>
              ), '#2563eb')}

              {renderDailySection('Événements', 'Notes particulières du jour', (
                <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                  {renderDailyField('Événement restaurant', 37, { text: true })}
                  {renderDailyField('Événement national', 38, { text: true })}
                </div>
              ), '#f59e0b')}

              {renderDailySection('Démarques', 'Personnel, opérationnel et total démarques', (
                <>
                  <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                    {renderDailyField('Démarque personnel', 39)}
                    {renderDailyField('Démarque opérationnel', 41)}
                    {renderDailyField('Total démarque', 43, { readOnly: true })}
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    {renderDailyField('Explication démarque', 44, { text: true })}
                  </div>
                </>
              ), '#f59e0b')}
            </div>
          </div>

          {renderDailySection('Achats / livraisons', 'Factures fournisseurs reçues dans la journée', (
            <>
              {achatFields}
              {renderDailyTotalRow([
                { label: 'Total achats HT', col: 58 },
              ])}
            </>
          ), '#16a34a')}

          {renderDailySection('Personnel', 'Saisie des heures par équipe', (
            renderPersonnelTable(
              <>
                {renderPersonnelRow('Cadre', 77, 78)}
                {renderPersonnelRow('Agent de maîtrise', 79, 80)}
                {renderPersonnelRow('NIV I et II', 81, 82)}
                {renderPersonnelRow('NIV III', 83, 84)}
                {renderPersonnelRow('Apprenti', 85, 86)}
              </>
            )
          ), '#9333ea')}
        </div>
        {isCashValidationModalOpen && selectedDayRow?.dayIndex ? (
          <div style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18, background: 'rgba(15, 23, 42, .55)' }}>
            <div style={{ width: 'min(520px, 100%)', borderRadius: 14, background: '#fff', boxShadow: '0 24px 70px rgba(15, 23, 42, .28)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: '18px 20px', borderBottom: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 950, color: '#0f172a' }}>Commentaire d'écart caisse</div>
                  <div style={{ marginTop: 3, fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'capitalize' }}>{selectedDayLabel}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCashValidationModalOpen(false)}
                  style={{ border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', padding: 4 }}
                  aria-label="Fermer"
                >
                  <X size={20} />
                </button>
              </div>
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 950, color: '#334155', textTransform: 'uppercase', letterSpacing: '.05em' }}>Commentaire obligatoire</span>
                  <textarea
                    value={cashValidationDraft}
                    onChange={event => setCashValidationDraft(event.target.value)}
                    rows={4}
                    style={{ width: '100%', resize: 'vertical', border: '2px solid #fecaca', borderRadius: 10, padding: 10, outline: 'none', fontSize: 13, fontWeight: 700, color: '#0f172a', background: '#fff7ed' }}
                    placeholder="Exemple : écart lié à un ticket papier manquant, correction prévue demain..."
                  />
                </label>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setIsCashValidationModalOpen(false)}
                    style={{ border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', color: '#334155', cursor: 'pointer', fontSize: 13, fontWeight: 900, padding: '9px 12px' }}
                  >
                    Réessayer
                  </button>
                  <button
                    type="button"
                    disabled={!cashValidationDraft.trim()}
                    onClick={() => {
                      if (!selectedDayRow?.dayIndex || !cashValidationDraft.trim()) return;
                      updateNepting(month, selectedDayRow.dayIndex, 'commentaire', `Validation caisse : ${cashValidationDraft.trim()}`);
                      setIsCashValidationModalOpen(false);
                    }}
                    style={{ border: 'none', borderRadius: 8, background: cashValidationDraft.trim() ? '#dc2626' : '#fca5a5', color: '#fff', cursor: cashValidationDraft.trim() ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 950, padding: '9px 12px' }}
                  >
                    Valider avec commentaire
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

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
        <header style={{ background: tableViewMode === 'SAISIE' ? sidebarThemeWide : '#fff', borderBottom: tableViewMode === 'SAISIE' ? '1px solid rgba(125, 211, 252, .24)' : '1px solid #e2e8f0', padding: isMobile ? '0 16px' : '0 24px', display: 'flex', flexDirection: 'column', flexShrink: 0, zIndex: 90, position: 'relative', boxShadow: tableViewMode === 'SAISIE' ? '0 14px 32px rgba(15, 23, 42, .20), inset 0 -1px 0 rgba(255,255,255,.06)' : 'none' }}>
          <div style={{ width: '100%', maxWidth: 1320, margin: '0 auto', minHeight: tableViewMode === 'SAISIE' ? (isMobile ? 86 : 78) : (isMobile ? 58 : 64), padding: tableViewMode === 'SAISIE' ? (isMobile ? '12px 0' : '14px 0 10px') : 0, display: 'flex', alignItems: tableViewMode === 'SAISIE' && isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 16, flexDirection: tableViewMode === 'SAISIE' && isMobile ? 'column' : 'row' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: tableViewMode === 'SAISIE' ? 18 : 12, minWidth: 0 }}>
              <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 7, color: tableViewMode === 'SAISIE' ? '#cbd5e1' : '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 800, padding: 0, flexShrink: 0 }}>
                <ChevronLeft size={16} /> Retour Accueil
              </button>
              {tableViewMode === 'SAISIE' ? (
                <div style={{ position: 'relative' }}>
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
                <h2 style={{ fontSize: isMobile ? 18 : 24, fontWeight: 800, color: '#0f172a', margin: 0, textTransform: 'capitalize', letterSpacing: '-0.02em' }}>
                  {monthNames[month]} {year}
                </h2>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignSelf: tableViewMode === 'SAISIE' && isMobile ? 'stretch' : 'auto', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button onClick={() => setIsImportModalOpen(true)} style={actionTileStyle} onMouseEnter={e => e.currentTarget.style.background = weatherThemeHover} onMouseLeave={e => e.currentTarget.style.background = weatherTheme}>
                <Upload size={isMobile ? 14 : 16} /> {isMobile ? '' : 'Importer'}
              </button>
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

          {tableViewMode !== 'SAISIE' && (
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
          <div style={{ width: '100%', maxWidth: 1320, margin: '0 auto', padding: tableViewMode === 'SAISIE' ? '0 0 14px' : (isMobile ? '10px 0' : '10px 0 12px'), display: 'flex', gap: 8, background: 'transparent', borderBottom: tableViewMode === 'SAISIE' ? 'none' : '1px solid #e2e8f0', alignItems: 'center', flexShrink: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: 4, border: tableViewMode === 'SAISIE' ? '1px solid rgba(255,255,255,.18)' : '1px solid #e2e8f0', borderRadius: 10, background: tableViewMode === 'SAISIE' ? 'rgba(255,255,255,.10)' : '#f8fafc', flexShrink: 0 }}>
              <span style={{ padding: '0 6px', fontSize: 10, fontWeight: 900, color: tableViewMode === 'SAISIE' ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: '.05em' }}>Vue</span>
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
                      background: isModeActive ? (tableViewMode === 'SAISIE' ? '#fff' : '#0f172a') : 'transparent',
                      color: isModeActive ? (tableViewMode === 'SAISIE' ? '#0f172a' : '#fff') : (tableViewMode === 'SAISIE' ? '#cbd5e1' : '#475569'),
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
            {tableViewMode !== 'SAISIE' && tabs.map(tab => {
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
                    background: isActive ? accentBg : '#f8fafc',
                    border: `1.5px solid ${isActive ? accentBg : '#e2e8f0'}`,
                    boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                    transition: 'all .15s',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span style={{ width: 22, height: 22, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isActive ? 'rgba(255,255,255,.16)' : '#e2e8f0', color: isActive ? '#fff' : accentBg, fontSize: 9, fontWeight: 900 }}>{icon}</span>
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
        <div id="dashboard-content-area" style={{ flex: 1, overflow: 'auto', padding: tableViewMode === 'SAISIE' ? (isMobile ? 12 : '16px 24px 28px') : (isMobile ? 12 : 32), display: 'flex', flexDirection: 'column' }}>
          {tableViewMode === 'SAISIE' ? (
            renderDailyEntryView()
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

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(260px, .85fr) minmax(320px, 1.15fr)', gap: 12 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 14, border: '1px dashed #93c5fd', borderRadius: 10, background: '#eff6ff' }}>
                  <span style={{ fontSize: 12, fontWeight: 900, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '.04em' }}>Feuille de caisse</span>
                  <input
                    type="file"
                    accept=".pdf,.txt,text/plain,application/pdf"
                    onChange={handleDailyRealiseImport}
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
              </div>

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

