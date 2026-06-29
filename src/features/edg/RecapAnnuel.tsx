import React, { useEffect, useMemo, useState } from 'react';

import { useData } from '@/contexts/DataContext';
import { formatEuroSymbol, formatPercentSigned } from '@/lib/formatters';
import { useRecapAnnuelData } from './useRecapAnnuelData';

// CA Réalisé N-1 (2025) par mois — source : feuille "Variation 2025"
const CA_N1_BY_MONTH = [
  100140.41,  // janvier
  122148.18,  // février
  113683.74,  // mars
  104913.83,  // avril
  116309.09,  // mai
  102128.20,  // juin
  114122.14,  // juillet
  115047.47,  // août
   90585.35,  // septembre
  125965.82,  // octobre
  116430.32,  // novembre
  150217.73,  // décembre
];
const CA_N1 = CA_N1_BY_MONTH.reduce((a, b) => a + b, 0); // 1 371 692,28
// Couverts réalisés N-1 (2025) par mois — source : feuille "Couverts Restaurant" 2025
const CVTS_N1_BY_MONTH = [
  3956,  // janvier
  4863,  // février
  4440,  // mars
  4239,  // avril
  4506,  // mai
  4002,  // juin
  4493,  // juillet
  4604,  // août
  3470,  // septembre
  5082,  // octobre
  4694,  // novembre
  5989,  // décembre
]; // total 54338
const MONTHS_FULL = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const MONTHS_SHORT_LABELS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const CONTRATS_FG = [
  { label: 'PI Electronique',  montant: 3649.32 },
  { label: 'Skello',           montant: 2465.75 },
  { label: 'Au bureau',        montant: 2268.49 },
  { label: 'Kertel nomotech',  montant: 1183.56 },
  { label: 'Stelogy nomotech', montant: 986.30  },
  { label: 'Eeworx',           montant: 437.92  },
];

const NAV    = '#1e293b';
const BG_DATE  = '#1e293b';
const BG_BUDG  = '#fff2cc';
const BG_REAL2 = '#b4c6e7';
const BG_CM    = '#e2efda';
const BG_CM2   = '#a9d08e';
const BG_CM3   = '#c6efce';
const BG_FP    = '#fce4d6';
const BG_FG    = '#fef3c7';
const BG_FG2   = '#fce4d6';
const BG_RES   = '#fef9e7';
const BG_HATCH = '#e2e8f0';

const fe = formatEuroSymbol;
const fp = formatPercentSigned;

const fmtHeures = (val: number): string => {
  if (!isFinite(val) || val === 0) return '—';
  const abs = Math.abs(val);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  return `${val < 0 ? '-' : ''}${h}h${String(m).padStart(2, '0')}`;
};

// threshold: rouge si valeur > value, vert sinon | invertSign: négatif=vert, positif=rouge, zéro=noir
type ColDef = { g: string; l: string; bg: string; w: number; threshold?: number; invertSign?: boolean };

// ─── Colonnes statiques ──────────────────────────────────────────────────────

const COLS_BUDGET: ColDef[] = [
  // 13 colonnes — CA Limo (col 2) + groupe LIMONADE (cols 14-16) + VAE exclus
  { g: 'CA',             l: 'CA HT\nMidi',         bg: BG_BUDG,  w: 70 }, // col 0
  { g: 'CA',             l: 'CA HT\nSoir',         bg: BG_BUDG,  w: 70 }, // col 1
  { g: 'CA',             l: 'CA HT\nJour',         bg: BG_BUDG,  w: 75 }, // col 3
  { g: 'CA',             l: 'Cumul\nDepuis le 01', bg: BG_BUDG,  w: 80 }, // col 4 (last day)
  { g: 'CA',             l: 'VAR\nVS N-1',         bg: BG_HATCH, w: 65 }, // calc local
  { g: 'COUVERT\nMIDI',  l: 'NB CVTS',             bg: BG_BUDG,  w: 65 }, // col 6
  { g: 'COUVERT\nMIDI',  l: 'CVTS MOY HT',         bg: BG_BUDG,  w: 75 }, // CA Midi / NB Midi
  { g: 'COUVERT\nSOIR',  l: 'NB CVTS',             bg: BG_BUDG,  w: 65 }, // col 8
  { g: 'COUVERT\nSOIR',  l: 'CVTS MOY HT',         bg: BG_BUDG,  w: 75 }, // CA Soir / NB Soir
  { g: 'COUVERT\nJOUR',  l: 'NB CVTS',             bg: BG_BUDG,  w: 65 }, // col 10
  { g: 'COUVERT\nJOUR',  l: 'CVTS MOY',            bg: BG_BUDG,  w: 65 }, // CA Jour / NB Jour
  { g: 'COUVERT\nJOUR',  l: 'CVTS CUMUL',          bg: BG_BUDG,  w: 75 }, // col 12 (last day)
  { g: 'COUVERT\nJOUR',  l: 'VAR VS N-1',          bg: BG_HATCH, w: 65 }, // calc local
];

const COLS_REALISE: ColDef[] = [
  // CA HT — 10 colonnes
  { g: 'CA HT', l: 'CA HT\nVAE',               bg: BG_REAL2, w: 75 }, // col 17
  { g: 'CA HT', l: 'CA HT\nMidi',               bg: BG_REAL2, w: 75 }, // col 18
  { g: 'CA HT', l: 'Ecart vs\nBudget Midi',      bg: '#fff',   w: 75 }, // g(18)-g(0)
  { g: 'CA HT', l: 'CA HT\nSoir',               bg: BG_REAL2, w: 75 }, // col 19
  { g: 'CA HT', l: 'Ecart vs\nBudget Soir',      bg: '#fff',   w: 75 }, // g(19)-g(1)
  { g: 'CA HT', l: 'CA HT\nJour',               bg: BG_REAL2, w: 80 }, // col 21
  { g: 'CA HT', l: 'Ecart Budget\nJour Valeur',  bg: '#fff',   w: 80 }, // col 22
  { g: 'CA HT', l: 'Ecart Budget\nJour %',       bg: BG_HATCH, w: 70 }, // calc local
  { g: 'CA HT', l: 'Cumul\nAnnuel',              bg: BG_REAL2, w: 85 }, // sum col 21 jan→mois
  { g: 'CA HT', l: 'Tendance\nAnnuel',           bg: '#fff',   w: 75 }, // progressive
  { g: 'CA HT', l: 'VAR vs\nBudget %',          bg: BG_HATCH, w: 70 }, // tendanceCA vs budgetAnnuel
  // COUVERTS RESTAURANT — 11 colonnes (même disposition que CA HT)
  { g: 'COUVERTS\nRESTAURANT', l: 'Midi\nNB CVTS',          bg: BG_REAL2, w: 65 }, // col 25
  { g: 'COUVERTS\nRESTAURANT', l: 'Ecart vs\nBudget Midi',  bg: '#fff',   w: 70 }, // g(25)-g(6)
  { g: 'COUVERTS\nRESTAURANT', l: 'Soir\nNB CVTS',          bg: BG_REAL2, w: 65 }, // col 27
  { g: 'COUVERTS\nRESTAURANT', l: 'Ecart vs\nBudget Soir',  bg: '#fff',   w: 70 }, // g(27)-g(8)
  { g: 'COUVERTS\nRESTAURANT', l: 'Jour\nNB CVTS',          bg: BG_REAL2, w: 65 }, // col 29
  { g: 'COUVERTS\nRESTAURANT', l: 'Jour\nMoy HT',           bg: BG_REAL2, w: 65 }, // col 30
  { g: 'COUVERTS\nRESTAURANT', l: 'Ecart Budget\nJour NB',  bg: '#fff',   w: 70 }, // g(29)-g(10)
  { g: 'COUVERTS\nRESTAURANT', l: 'Ecart Budget\nJour %',   bg: BG_HATCH, w: 65 }, // calc local
  { g: 'COUVERTS\nRESTAURANT', l: 'Cumul\nAnnuel',          bg: BG_REAL2, w: 75 }, // sum col 29 jan→mois
  { g: 'COUVERTS\nRESTAURANT', l: 'Tendance\nAnnuel',       bg: '#fff',   w: 85 }, // progressive
  { g: 'COUVERTS\nRESTAURANT', l: 'VAR vs\nBudget %',      bg: BG_HATCH, w: 70 }, // tendanceCvts vs budgetCvtsAnnuel
];

const COLS_COUT_MATIERE: ColDef[] = [
  // 23 colonnes
  { g: 'DEMARQUES',           l: 'Personnel',          bg: BG_CM,  w: 65 }, // col 39
  { g: 'DEMARQUES',           l: 'Ratio\nPerso',        bg: BG_FP,  w: 55 }, // col 40
  { g: 'DEMARQUES',           l: 'Cuisine',             bg: BG_CM,  w: 65 }, // col 41
  { g: 'DEMARQUES',           l: 'Ratio\nCuisine',      bg: BG_FP,  w: 55 }, // col 42
  { g: 'DEMARQUES',           l: 'TOTAL',               bg: BG_CM3, w: 65 }, // col 43
  { g: 'ACHATS\nLIQUIDE HT',  l: 'C10',                bg: BG_CM,  w: 65 }, // col 45
  { g: 'ACHATS\nLIQUIDE HT',  l: 'Richard\nVins',       bg: BG_CM,  w: 70 }, // col 46
  { g: 'ACHATS\nLIQUIDE HT',  l: 'Café\nRichard',       bg: BG_CM,  w: 70 }, // col 47
  { g: 'ACHATS\nLIQUIDE HT',  l: 'Storia',              bg: BG_CM,  w: 60 }, // col 48
  { g: 'ACHATS\nSOLIDES HT',  l: 'Brake',               bg: BG_CM,  w: 60 }, // col 49
  { g: 'ACHATS\nSOLIDES HT',  l: 'Pomona\nF&L',         bg: BG_CM,  w: 65 }, // col 50
  { g: 'ACHATS\nSOLIDES HT',  l: 'Socopa',              bg: BG_CM,  w: 60 }, // col 51
  { g: 'ACHATS\nSOLIDES HT',  l: 'Episaveur',           bg: BG_CM,  w: 65 }, // col 52
  { g: 'ACHATS\nSOLIDES HT',  l: 'Mamma\nfiore',        bg: BG_CM,  w: 65 }, // col 53
  { g: 'ACHATS\nSOLIDES HT',  l: 'Cie des\nDesserts',   bg: BG_CM,  w: 65 }, // col 54
  { g: 'ACHATS\nSOLIDES HT',  l: 'Distripate',          bg: BG_CM,  w: 65 }, // col 55
  { g: 'ACHATS\nSOLIDES HT',  l: 'Metro /\nDép.',       bg: BG_CM,  w: 65 }, // col 56
  { g: 'ACHATS\nSOLIDES HT',  l: 'Martel',              bg: BG_CM,  w: 60 }, // col 57
  { g: 'ACHAT HT',            l: 'Total HT',            bg: BG_CM2, w: 75 }, // col 58
  { g: 'ACHAT HT',            l: 'Cumul HT',            bg: BG_CM2, w: 75 }, // col 59
  { g: 'RATIO',               l: 'Sans le\nStock',       bg: BG_CM,  w: 65 }, // col 60
  { g: '',                    l: 'Marge\nRéelle',        bg: '#fff', w: 70 }, // —
  { g: '',                    l: 'Variation\nStock',     bg: '#fff', w: 75 }, // —
];

// Frais Personnel — un seul tableau : PROJECTION (8 cols) + REALISER (9 cols)
const COLS_FP: ColDef[] = [
  // ── PROJECTION ────────────────────────────────────────────────────────────
  { g: 'PROJECTION', l: 'Cadre',          bg: BG_FP,  w: 70 },
  { g: 'PROJECTION', l: 'Maîtrise',       bg: BG_FP,  w: 70 },
  { g: 'PROJECTION', l: 'NIV I-II',       bg: BG_FP,  w: 70 },
  { g: 'PROJECTION', l: 'NIV III',        bg: BG_FP,  w: 70 },
  { g: 'PROJECTION', l: 'Apprenti',       bg: BG_FP,  w: 70 },
  { g: 'PROJECTION', l: 'Total\nHeures',  bg: BG_FP,  w: 75 },
  { g: 'PROJECTION', l: 'Coût\nGlobal',   bg: '#fff', w: 90 }, // col 72
  { g: 'PROJECTION', l: 'Ratio %',        bg: '#fff', w: 70, threshold: 38 },
  // ── RÉALISER ──────────────────────────────────────────────────────────────
  { g: 'RÉALISER',   l: 'Cadre',          bg: BG_FP,  w: 70 },
  { g: 'RÉALISER',   l: 'Maîtrise',       bg: BG_FP,  w: 70 },
  { g: 'RÉALISER',   l: 'NIV I-II',       bg: BG_FP,  w: 70 },
  { g: 'RÉALISER',   l: 'NIV III',        bg: BG_FP,  w: 70 },
  { g: 'RÉALISER',   l: 'Apprenti',       bg: BG_FP,  w: 70 },
  { g: 'RÉALISER',   l: 'Total\nHeures',  bg: BG_FP,  w: 75 },
  { g: 'RÉALISER',   l: 'Coût\nGlobal',   bg: '#fff', w: 90 }, // col 87
  { g: 'RÉALISER',   l: 'Ratio %',                    bg: '#fff', w: 70,  threshold: 38 },
  { g: 'RÉALISER',   l: 'VS Coût Global\nProjection %', bg: BG_FG,  w: 100, invertSign: true },
  { g: 'RÉALISER',   l: 'VS Coût Global\nN-1 %',        bg: BG_FG2, w: 100, invertSign: true },
  { g: 'RÉALISER',   l: 'VS Ratio\nProjection %',        bg: BG_FG,  w: 100, invertSign: true },
  { g: 'RÉALISER',   l: 'VS Ratio\nN-1 %',              bg: BG_FG2, w: 100, invertSign: true },
];

// Alias pour la section SECTIONS
const COLS_FP_CUISINE_SALLE = COLS_FP;
const COLS_FP_GLOBAL        = COLS_FP;
// Conservés pour le rendu double (non utilisés en mode tableau unique)
const COLS_FP_PROJ = COLS_FP.slice(0, 8);
const COLS_FP_REAL = COLS_FP.slice(8);

const COLS_FRAIS_GENERAUX: ColDef[] = [
  // 30 colonnes
  { g: 'Entretien &\nRéparation',     l: 'Montant HT', bg: BG_FG,  w: 80 },
  { g: 'Entretien &\nRéparation',     l: '% CA',       bg: BG_FP,  w: 55 },
  { g: 'Petit Matériel\n& Vaisselles', l: 'Montant HT', bg: BG_FG, w: 80 },
  { g: 'Petit Matériel\n& Vaisselles', l: '% CA',       bg: BG_FP, w: 55 },
  { g: 'Tenue du\nPersonnel',         l: 'Montant HT', bg: BG_FG,  w: 80 },
  { g: 'Tenue du\nPersonnel',         l: '% CA',       bg: BG_FP,  w: 55 },
  { g: 'Animation',                   l: 'Montant HT', bg: BG_FG2, w: 80 },
  { g: 'Animation',                   l: '% CA',       bg: BG_FP,  w: 55 },
  { g: 'Ecolab /\nDiversey',          l: 'Montant HT', bg: BG_FG,  w: 80 },
  { g: 'Ecolab /\nDiversey',          l: '% CA',       bg: BG_FP,  w: 55 },
  { g: 'HACCP\nDivers',               l: 'Montant HT', bg: BG_FG,  w: 75 },
  { g: 'HACCP\nDivers',               l: '% CA',       bg: BG_FP,  w: 55 },
  { g: 'Matériel\nBureau',            l: 'Montant HT', bg: BG_FG,  w: 75 },
  { g: 'Matériel\nBureau',            l: '% CA',       bg: BG_FP,  w: 55 },
  { g: 'Frais de\nTransports',        l: 'Montant HT', bg: BG_FG,  w: 75 },
  { g: 'Frais de\nTransports',        l: '% CA',       bg: BG_FP,  w: 55 },
  { g: 'Marketing\nLocal',            l: 'Montant HT', bg: BG_FG,  w: 75 },
  { g: 'Marketing\nLocal',            l: '% CA',       bg: BG_FP,  w: 55 },
  { g: 'Énergie',                     l: 'Montant HT', bg: BG_FG,  w: 80 },
  { g: 'Énergie',                     l: '% CA',       bg: BG_FP,  w: 55 },
  { g: 'Divers',                      l: 'Montant HT', bg: BG_FG,  w: 80 },
  { g: 'Divers',                      l: '% CA',       bg: BG_FP,  w: 55 },
  { g: 'TOTAL FG\n(Hors Contrat)',    l: 'Montant HT', bg: BG_CM2, w: 90 }, // getFgTotal
  { g: 'TOTAL FG\n(Hors Contrat)',    l: '% CA',       bg: BG_CM2, w: 55 },
  { g: 'CONTRAT FG\nANNUEL',         l: 'PI Electronique',  bg: '#f0fdf4', w: 95 },
  { g: 'CONTRAT FG\nANNUEL',         l: 'Skello',           bg: '#f0fdf4', w: 75 },
  { g: 'CONTRAT FG\nANNUEL',         l: 'Au bureau',        bg: '#f0fdf4', w: 75 },
  { g: 'CONTRAT FG\nANNUEL',         l: 'Kertel nomotech',  bg: '#f0fdf4', w: 90 },
  { g: 'CONTRAT FG\nANNUEL',         l: 'Stelogy nomotech', bg: '#f0fdf4', w: 95 },
  { g: 'CONTRAT FG\nANNUEL',         l: 'Eeworx',           bg: '#f0fdf4', w: 70 },
];

const COLS_SYNTHESE: ColDef[] = [
  // ── CA (4 cols) ─────────────────────────────────────────────────────────────
  { g: 'CHIFFRE D\'AFFAIRES', l: 'CA HT\nRéalisé',    bg: BG_RES,   w: 105 },
  { g: 'CHIFFRE D\'AFFAIRES', l: 'CA\nBudget',         bg: BG_BUDG,  w: 95  },
  { g: 'CHIFFRE D\'AFFAIRES', l: 'VAR %\nvs N-1',      bg: BG_HATCH, w: 80  },
  { g: 'CHIFFRE D\'AFFAIRES', l: 'VAR %\nvs Budget',   bg: BG_HATCH, w: 80  },
  // ── COUVERTS (5 cols) ───────────────────────────────────────────────────────
  { g: 'COUVERTS',            l: 'NB\nCouverts',       bg: BG_BUDG,  w: 75  },
  { g: 'COUVERTS',            l: 'VAR %\nvs N-1',      bg: BG_HATCH, w: 80  },
  { g: 'COUVERTS',            l: 'VAR %\nvs Budget',   bg: BG_HATCH, w: 80  },
  { g: 'COUVERTS',            l: 'Ticket\nMoyen HT',   bg: BG_BUDG,  w: 85  },
  { g: 'COUVERTS',            l: 'VAR TM %\nvs N-1',   bg: BG_HATCH, w: 85  },
  // ── COÛT MATIÈRE (3 cols) ───────────────────────────────────────────────────
  { g: 'COÛT MATIÈRE',        l: 'Total\nAchats HT',   bg: BG_CM,    w: 105 },
  { g: 'COÛT MATIÈRE',        l: 'Ratio\n% CA',        bg: BG_CM2,   w: 70  },
  { g: 'COÛT MATIÈRE',        l: 'VAR Ratio\nvs N-1',  bg: BG_HATCH, w: 85, invertSign: true },
  // ── FRAIS PERSONNEL (4 cols) ────────────────────────────────────────────────
  { g: 'FRAIS PERSONNEL',     l: 'Coût\nGlobal',       bg: BG_FP,    w: 105 },
  { g: 'FRAIS PERSONNEL',     l: 'Ratio\n% CA',        bg: '#fff',   w: 70,  threshold: 38 },
  { g: 'FRAIS PERSONNEL',     l: 'VAR Ratio\nvs Proj', bg: BG_FG,    w: 90,  invertSign: true },
  { g: 'FRAIS PERSONNEL',     l: 'VAR Ratio\nvs N-1',  bg: BG_FG2,   w: 85,  invertSign: true },
  // ── FRAIS GÉNÉRAUX (3 cols) ─────────────────────────────────────────────────
  { g: 'FRAIS GÉNÉRAUX',      l: 'Total FG\nHors Contrat', bg: BG_FG,  w: 110 },
  { g: 'FRAIS GÉNÉRAUX',      l: 'Ratio\n% CA',        bg: BG_FP,    w: 70  },
  { g: 'FRAIS GÉNÉRAUX',      l: 'VAR Ratio\nvs N-1',  bg: BG_HATCH, w: 85,  invertSign: true },
];

// ─── Composant ───────────────────────────────────────────────────────────────

interface RecapAnnuelProps { onBack: () => void; }

export default function RecapAnnuel({ onBack }: RecapAnnuelProps) {
  const { data, allData, selectedYear, setSelectedYear, loadYearFromCloud } = useData();
  const YEAR = selectedYear;
  const MONTHS_SHORT = MONTHS_SHORT_LABELS.map(m => `${m}-${YEAR.toString().slice(-2)}`);
  const [activeTab, setActiveTab] = useState<string>('budget');

  // Charge les mois N-1 depuis Supabase si l'autre utilisateur ne les a pas en local
  useEffect(() => {
    void loadYearFromCloud(YEAR - 1);
  }, [YEAR, loadYearFromCloud]);

  const {
    getVal, getFgTotal, getRaw, getLastDayVal,
    getRealLevelHours, getProjLevelHours,
    getRealTotalHours, getProjTotalHours,
    sumRealLevel, sumProjLevel, sumRealTotal, sumProjTotal,
    sumCol, sumHoursCol,
    getFgCategoryTotal, sumFgCategory,
    caByMonth, totalCA,
  } = useRecapAnnuelData(data, YEAR);

  // Données N-1 pour les frais personnel
  const dataN1 = allData[YEAR - 1] ?? {};
  const {
    getVal: getValN1,
    caByMonth: caByMonthN1,
  } = useRecapAnnuelData(dataN1, YEAR - 1);

  // Mapping ordonné des 11 catégories FG → [box, colGroup]
  const FG_MAPPING: [number, number][] = [
    [0, 0], // Entretien & Réparation
    [1, 0], // Petit Matériel & Vaisselles
    [2, 0], // Tenue du Personnel
    [3, 0], // Animation
    [0, 1], // Ecolab / Diversey
    [1, 1], // HACCP Divers
    [2, 1], // Matériel Bureau
    [3, 1], // Frais de Transports
    [0, 2], // Marketing Local
    [2, 2], // Énergie
    [3, 2], // Divers
  ];

  // Détection schéma personnel (global = 5 cats unifiées, cuisine_salle = 10 cats)
  const personnelSchema = useMemo(() =>
    Object.values(data).find(m => m?.personnelSchema)?.personnelSchema ?? 'global',
  [data]);
  const isGlobal = personnelSchema === 'global';

  // Sections avec cols FP dynamiques selon schéma
  const SECTIONS = useMemo(() => [
    { key: 'budget',          label: 'Budget',            icon: '🎯', accentBg: '#92400e', accentColor: '#fff', cols: COLS_BUDGET },
    { key: 'realise',         label: 'Réalisé',           icon: '📊', accentBg: '#1e40af', accentColor: '#fff', cols: COLS_REALISE },
    { key: 'cout_matiere',    label: 'Coût Matière',      icon: '🛒', accentBg: '#166534', accentColor: '#fff', cols: COLS_COUT_MATIERE },
    { key: 'frais_personnel', label: 'Frais Personnel',   icon: '👥', accentBg: '#7c2d12', accentColor: '#fff', cols: isGlobal ? COLS_FP_GLOBAL : COLS_FP_CUISINE_SALLE },
    { key: 'frais_generaux',  label: 'Frais Généraux',    icon: '📋', accentBg: '#78350f', accentColor: '#fff', cols: COLS_FRAIS_GENERAUX },
    { key: 'synthese',         label: 'Synthèse',          icon: '🏆', accentBg: '#1e3a5f', accentColor: '#fff', cols: COLS_SYNTHESE },
  ], [isGlobal]);

  // ─── Valeurs par mois ─────────────────────────────────────────────────────
  const getSectionValues = (sectionKey: string, mi: number): string[] => {
    const ca   = caByMonth[mi];
    const caN1 = CA_N1_BY_MONTH[mi] ?? 0;
    const varP = caN1 > 0 ? ((ca - caN1) / caN1) * 100 : 0;
    const isJan = mi === 0;
    const g = (col: number) => getVal(mi, col);
    const r = (col: number) => getRaw(mi, col);
    const fgt = getFgTotal(mi);

    switch (sectionKey) {

      // ── 13 valeurs ──────────────────────────────────────────────────────────
      case 'budget': {
        const cvtsN1    = CVTS_N1_BY_MONTH[mi] ?? 0;
        const cumulCA   = Array.from({ length: mi + 1 }, (_, i) => getVal(i, 3)).reduce((a, b) => a + b, 0);
        const cumulCvts = Array.from({ length: mi + 1 }, (_, i) => Math.round(getVal(i, 10))).reduce((a, b) => a + b, 0);
        return [
          fe(g(0)),
          fe(g(1)),
          fe(g(3)),
          fe(cumulCA),
          fp(caN1 > 0 ? ((g(3) - caN1) / caN1) * 100 : 0),
          String(Math.round(g(6))),
          fe(g(6) > 0 ? g(0) / g(6) : 0),
          String(Math.round(g(8))),
          fe(g(8) > 0 ? g(1) / g(8) : 0),
          String(Math.round(g(10))),
          fe(g(10) > 0 ? g(3) / g(10) : 0),
          String(cumulCvts),
          fp(cvtsN1 > 0 ? ((g(10) - cvtsN1) / cvtsN1) * 100 : 0),
        ];
      }

      // ── 22 valeurs ──────────────────────────────────────────────────────────
      case 'realise': {
        const isEmpty = ca === 0;
        const cumulCA   = Array.from({ length: mi + 1 }, (_, i) => caByMonth[i]).reduce((a, b) => a + b, 0);
        const cumulCvts = Array.from({ length: mi + 1 }, (_, i) => Math.round(getVal(i, 29))).reduce((a, b) => a + b, 0);
        const ecartCaJourPct   = !isEmpty && g(3) > 0  ? ((g(21) - g(3))  / g(3))  * 100 : 0;
        const ecartCvtsJourPct = !isEmpty && g(10) > 0 ? ((g(29) - g(10)) / g(10)) * 100 : 0;
        const budgetAnnuel     = Array.from({ length: 12 }, (_, i) => getVal(i, 3)).reduce((a, b) => a + b, 0);
        const budgetCvtsAnnuel = Array.from({ length: 12 }, (_, i) => getVal(i, 10)).reduce((a, b) => a + b, 0);
        const cumulEcartCA   = Array.from({ length: mi + 1 }, (_, i) => caByMonth[i] > 0 ? getVal(i, 22) : 0).reduce((a, b) => a + b, 0);
        const cumulEcartCvts = Array.from({ length: mi + 1 }, (_, i) => caByMonth[i] > 0 ? (getVal(i, 29) - getVal(i, 10)) : 0).reduce((a, b) => a + b, 0);
        const tendanceCA   = budgetAnnuel    + cumulEcartCA;
        const tendanceCvts = budgetCvtsAnnuel + cumulEcartCvts;
        return [
          // CA HT — 10 valeurs
          isEmpty ? '—' : fe(g(17)),
          isEmpty ? '—' : fe(g(18)),
          isEmpty ? '—' : fe(g(18) - g(0)),
          isEmpty ? '—' : fe(g(19)),
          isEmpty ? '—' : fe(g(19) - g(1)),
          isEmpty ? '—' : fe(g(21)),
          isEmpty ? '—' : fe(g(22)),
          isEmpty ? '—' : fp(ecartCaJourPct),
          isEmpty ? '—' : fe(cumulCA),
          isEmpty ? '—' : fe(tendanceCA),
          isEmpty ? '—' : fp(budgetAnnuel > 0 ? (cumulEcartCA / budgetAnnuel) * 100 : 0),
          // COUVERTS — 11 valeurs
          isEmpty ? '—' : String(Math.round(g(25))),
          isEmpty ? '—' : String(Math.round(g(25) - g(6))),
          isEmpty ? '—' : String(Math.round(g(27))),
          isEmpty ? '—' : String(Math.round(g(27) - g(8))),
          isEmpty ? '—' : String(Math.round(g(29))),
          isEmpty ? '—' : fe(g(30)),
          isEmpty ? '—' : String(Math.round(g(29) - g(10))),
          isEmpty ? '—' : fp(ecartCvtsJourPct),
          isEmpty ? '—' : String(cumulCvts),
          isEmpty ? '—' : String(Math.round(tendanceCvts)),
          isEmpty ? '—' : fp(budgetCvtsAnnuel > 0 ? (cumulEcartCvts / budgetCvtsAnnuel) * 100 : 0),
        ];
      }

      // ── 23 valeurs ──────────────────────────────────────────────────────────
      case 'cout_matiere': {
        const cumulHT = Array.from({ length: mi + 1 }, (_, i) => getVal(i, 58)).reduce((a, b) => a + b, 0);
        const ratioHT = ca > 0 ? g(58) / ca * 100 : 0;
        return [
          fe(g(39)), fp(g(40)), fe(g(41)), fp(g(42)), fe(g(43)),
          fe(g(45)), fe(g(46)), fe(g(47)), fe(g(48)),
          fe(g(49)), fe(g(50)), fe(g(51)), fe(g(52)), fe(g(53)), fe(g(54)), fe(g(55)), fe(g(56)), fe(g(57)),
          fe(g(58)), fe(cumulHT), fp(ratioHT),
          '0,00 €', '0,00 €',
        ];
      }

      // ── 20 valeurs : 8 projection + 12 réaliser ─────────────────────────────
      case 'frais_personnel': {
        const hasData    = ca > 0;
        const rl = (lv: number) => getRealLevelHours(mi, lv);
        const pl = (lv: number) => getProjLevelHours(mi, lv);
        const coutProj   = g(72);
        const coutReal   = g(87);
        const coutRealN1 = getValN1(mi, 87);
        const caN1       = CA_N1_BY_MONTH[mi] ?? 0;
        const fmtRatio   = (v: number) => `${v.toFixed(2)} %`;
        const ratioProj  = ca > 0 ? coutProj / ca * 100 : 0;
        const ratioReal  = ca > 0 ? coutReal / ca * 100 : 0;
        const ratioN1    = caN1 > 0 ? coutRealN1 / caN1 * 100 : 0;
        const vsCoutProj  = hasData && coutProj   > 0 ? fp((coutReal - coutProj)   / coutProj   * 100) : '—';
        const vsCoutN1    = hasData && coutRealN1  > 0 ? fp((coutReal - coutRealN1) / coutRealN1 * 100) : '—';
        const vsRatioProj = hasData && coutProj   > 0 ? fp(ratioReal - ratioProj) : '—';
        const vsRatioN1   = hasData && coutRealN1  > 0 ? fp(ratioReal - ratioN1)  : '—';
        return [
          // Projection (8)
          fmtHeures(pl(0)), fmtHeures(pl(1)), fmtHeures(pl(2)), fmtHeures(pl(3)), fmtHeures(pl(4)),
          fmtHeures(getProjTotalHours(mi)), fe(coutProj), ca > 0 ? fmtRatio(ratioProj) : '—',
          // Réaliser (12) — tout à — si pas de données
          hasData ? fmtHeures(rl(0)) : '—', hasData ? fmtHeures(rl(1)) : '—',
          hasData ? fmtHeures(rl(2)) : '—', hasData ? fmtHeures(rl(3)) : '—',
          hasData ? fmtHeures(rl(4)) : '—',
          hasData ? fmtHeures(getRealTotalHours(mi)) : '—',
          hasData ? fe(coutReal) : '—',
          hasData ? fmtRatio(ratioReal) : '—',
          vsCoutProj, vsCoutN1, vsRatioProj, vsRatioN1,
        ];
      }

      // ── 30 valeurs ──────────────────────────────────────────────────────────
      case 'frais_generaux': return [
        // 11 catégories × 2 colonnes (Montant HT + % CA)
        ...FG_MAPPING.flatMap(([box, colGroup]) => {
          const montant = getFgCategoryTotal(mi, box, colGroup);
          return [
            montant > 0 ? fe(montant) : '—',
            montant > 0 && ca > 0 ? `${((montant / ca) * 100).toFixed(2)} %` : '—',
          ];
        }),
        fgt > 0 ? fe(fgt) : '0,00 €',
        ca > 0 && fgt > 0 ? `${((fgt / ca) * 100).toFixed(2)} %` : '—',
        ...CONTRATS_FG.map(c => isJan ? fe(c.montant) : ''),
      ];

      // ── 18 valeurs synthèse ─────────────────────────────────────────────────
      case 'synthese': {
        if (ca === 0) return Array(19).fill('—');
        // CA
        const budgetCA    = g(3);
        const varBudP     = budgetCA > 0 ? ((ca - budgetCA) / budgetCA) * 100 : 0;
        // Couverts
        const nbCvts      = Math.round(g(29));
        const nbCvtsBud   = Math.round(g(10));
        const nbCvtsN1    = CVTS_N1_BY_MONTH[mi] ?? 0;
        const varCvtsN1   = nbCvtsN1 > 0 ? ((nbCvts - nbCvtsN1) / nbCvtsN1) * 100 : 0;
        const varCvtsBud  = nbCvtsBud > 0 ? ((nbCvts - nbCvtsBud) / nbCvtsBud) * 100 : 0;
        const tmHT        = nbCvts > 0 ? ca / nbCvts : 0;
        const tmN1        = nbCvtsN1 > 0 ? caN1 / nbCvtsN1 : 0;
        const varTmN1     = tmN1 > 0 ? ((tmHT - tmN1) / tmN1) * 100 : 0;
        // Coût Matière
        const totalAchats = g(58);
        const ratioAchats = ca > 0 ? (totalAchats / ca) * 100 : 0;
        const achatsN1    = getValN1(mi, 58);
        const ratioAchatsN1 = caN1 > 0 ? (achatsN1 / caN1) * 100 : 0;
        const varRatioAchats = ratioAchatsN1 > 0 ? fp(ratioAchats - ratioAchatsN1) : '—';
        // Frais Personnel
        const coutProj    = g(72);
        const coutReal    = g(87);
        const coutRealN1  = getValN1(mi, 87);
        const ratioFP     = ca > 0 ? (coutReal / ca) * 100 : 0;
        const ratioFPProj = ca > 0 && coutProj > 0 ? (coutProj / ca) * 100 : 0;
        const ratioFPN1   = caN1 > 0 && coutRealN1 > 0 ? (coutRealN1 / caN1) * 100 : 0;
        const varRatioFPProj = coutProj > 0 ? fp(ratioFP - ratioFPProj) : '—';
        const varRatioFPN1   = ratioFPN1 > 0 ? fp(ratioFP - ratioFPN1) : '—';
        // Frais Généraux
        const fgt         = getFgTotal(mi);
        const fgtN1       = getValN1(mi, 0); // pas de col FG N-1 directe — on garde ratio seul
        const ratioFG     = ca > 0 ? (fgt / ca) * 100 : 0;
        const ratioFGN1   = caN1 > 0 && fgtN1 > 0 ? (fgtN1 / caN1) * 100 : 0;
        const varRatioFG  = ratioFGN1 > 0 ? fp(ratioFG - ratioFGN1) : '—';
        return [
          // CA (4)
          fe(ca), fe(budgetCA), fp(varP), fp(varBudP),
          // Couverts (5)
          String(nbCvts), fp(varCvtsN1), fp(varCvtsBud), fe(tmHT), fp(varTmN1),
          // Coût Matière (3)
          fe(totalAchats), `${ratioAchats.toFixed(2)} %`, varRatioAchats,
          // Frais Personnel (4)
          fe(coutReal), `${ratioFP.toFixed(2)} %`, varRatioFPProj, varRatioFPN1,
          // Frais Généraux (3)
          fgt > 0 ? fe(fgt) : '0,00 €', `${ratioFG.toFixed(2)} %`, varRatioFG,
        ];
      }

      default: return [];
    }
  };

  // ─── Totaux annuels ───────────────────────────────────────────────────────
  const getTotalValues = (sectionKey: string): string[] => {
    const totalVarP = CA_N1 > 0 ? ((totalCA - CA_N1) / CA_N1) * 100 : 0;
    const s = sumCol;
    const totalFgt = Array.from({ length: 12 }, (_, mi) => getFgTotal(mi)).reduce((a, b) => a + b, 0);

    switch (sectionKey) {

      // ── 13 totaux ───────────────────────────────────────────────────────────
      case 'budget': {
        const totalCaMidi   = s(0);
        const totalCaSoir   = s(1);
        const totalCaJour   = s(3);
        const totalCvtsMidi = s(6);
        const totalCvtsSoir = s(8);
        const totalCvtsJour = s(10);
        const totalCumulCA   = totalCaJour;
        const totalCumulCvts = Math.round(totalCvtsJour);
        const totalVarBudget = CA_N1 > 0 ? ((totalCaJour - CA_N1) / CA_N1) * 100 : 0;
        return [
          fe(totalCaMidi),
          fe(totalCaSoir),
          fe(totalCaJour),
          fe(totalCumulCA),
          fp(totalVarBudget),
          String(Math.round(totalCvtsMidi)),
          fe(totalCvtsMidi > 0 ? totalCaMidi / totalCvtsMidi : 0),
          String(Math.round(totalCvtsSoir)),
          fe(totalCvtsSoir > 0 ? totalCaSoir / totalCvtsSoir : 0),
          String(Math.round(totalCvtsJour)),
          fe(totalCvtsJour > 0 ? totalCaJour / totalCvtsJour : 0),
          String(totalCumulCvts),
          fp(((totalCvtsJour - 54338) / 54338) * 100),
        ];
      }

      // ── 22 totaux ───────────────────────────────────────────────────────────
      case 'realise': {
        // Réalisé YTD (mois avec données uniquement)
        const hasData = (mi: number) => caByMonth[mi] > 0;
        const totalCaMidi   = s(18);
        const totalCaSoir   = s(19);
        const totalCaJour   = s(21);
        const totalCvtsMidi = s(25);
        const totalCvtsSoir = s(27);
        const totalCvtsJour = s(29);
        // Budget YTD = uniquement les mois qui ont du réalisé (comparaison à date)
        const ytd = (col: number) => Array.from({ length: 12 }, (_, mi) => hasData(mi) ? getVal(mi, col) : 0).reduce((a, b) => a + b, 0);
        const totalBudMidiYtd   = ytd(0);
        const totalBudSoirYtd   = ytd(1);
        const totalBudJourYtd   = ytd(3);
        const totalBudCvtsMidiYtd = ytd(6);
        const totalBudCvtsSoirYtd = ytd(8);
        const totalBudCvtsJourYtd = ytd(10);
        const ecartCaJourPct   = totalBudJourYtd    > 0 ? ((totalCaJour   - totalBudJourYtd)    / totalBudJourYtd)    * 100 : 0;
        const ecartCvtsJourPct = totalBudCvtsJourYtd > 0 ? ((totalCvtsJour - totalBudCvtsJourYtd) / totalBudCvtsJourYtd) * 100 : 0;
        // Tendance et budget annuel complet (projection fin d'année)
        const tBudgetAnnuel     = Array.from({ length: 12 }, (_, i) => getVal(i, 3)).reduce((a, b) => a + b, 0);
        const tBudgetCvtsAnnuel = Array.from({ length: 12 }, (_, i) => getVal(i, 10)).reduce((a, b) => a + b, 0);
        const tCumulEcartCA   = Array.from({ length: 12 }, (_, i) => hasData(i) ? getVal(i, 22) : 0).reduce((a, b) => a + b, 0);
        const tCumulEcartCvts = Array.from({ length: 12 }, (_, i) => hasData(i) ? (getVal(i, 29) - getVal(i, 10)) : 0).reduce((a, b) => a + b, 0);
        const tTendanceCA   = tBudgetAnnuel   + tCumulEcartCA;
        const tTendanceCvts = tBudgetCvtsAnnuel + tCumulEcartCvts;
        return [
          // CA HT — 10 valeurs
          fe(s(17)),
          fe(totalCaMidi),
          fe(totalCaMidi - totalBudMidiYtd),
          fe(totalCaSoir),
          fe(totalCaSoir - totalBudSoirYtd),
          fe(totalCaJour),
          fe(totalCaJour - totalBudJourYtd),   // écart vs budget à date
          fp(ecartCaJourPct),                  // % vs budget à date
          fe(totalCaJour),
          fe(tTendanceCA),
          fp(tBudgetAnnuel > 0 ? (tCumulEcartCA / tBudgetAnnuel) * 100 : 0),
          // COUVERTS — 11 valeurs
          String(Math.round(totalCvtsMidi)),
          String(Math.round(totalCvtsMidi - totalBudCvtsMidiYtd)),
          String(Math.round(totalCvtsSoir)),
          String(Math.round(totalCvtsSoir - totalBudCvtsSoirYtd)),
          String(Math.round(totalCvtsJour)),
          fe(totalCvtsJour > 0 ? totalCaJour / totalCvtsJour : 0),
          String(Math.round(totalCvtsJour - totalBudCvtsJourYtd)),
          fp(ecartCvtsJourPct),
          String(Math.round(totalCvtsJour)),
          String(Math.round(tTendanceCvts)),
          fp(tBudgetCvtsAnnuel > 0 ? (tCumulEcartCvts / tBudgetCvtsAnnuel) * 100 : 0),
        ];
      }

      // ── 23 totaux ───────────────────────────────────────────────────────────
      case 'cout_matiere': return [
        fe(s(39)), '—', fe(s(41)), '—', fe(s(43)),
        fe(s(45)), fe(s(46)), fe(s(47)), fe(s(48)),
        fe(s(49)), fe(s(50)), fe(s(51)), fe(s(52)), fe(s(53)), fe(s(54)), fe(s(55)), fe(s(56)), fe(s(57)),
        fe(s(58)), fe(s(58)), totalCA > 0 ? fp(s(58) / totalCA * 100) : '—',
        '0,00 €', '0,00 €',
      ];

      // ── 20 totaux YTD : 8 projection + 12 réaliser ──────────────────────────
      case 'frais_personnel': {
        const hasData = (i: number) => caByMonth[i] > 0;
        // Projection YTD = seulement les mois avec réalisé (pour comparer à date)
        const totalCoutProjYtd = Array.from({ length: 12 }, (_, i) => hasData(i) ? getVal(i, 72) : 0).reduce((a, b) => a + b, 0);
        const totalCoutReal    = s(87);
        // N-1 YTD = seulement les mois avec réalisé
        const totalCoutRealN1  = Array.from({ length: 12 }, (_, i) => hasData(i) ? getValN1(i, 87) : 0).reduce((a, b) => a + b, 0);
        const totalCaN1Ytd     = Array.from({ length: 12 }, (_, i) => hasData(i) ? (CA_N1_BY_MONTH[i] ?? 0) : 0).reduce((a, b) => a + b, 0);
        const fmtRatioT = (v: number) => `${v.toFixed(2)} %`;
        const ratioProj = totalCA > 0 ? totalCoutProjYtd / totalCA * 100 : 0;
        const ratioReal = totalCA > 0 ? totalCoutReal    / totalCA * 100 : 0;
        const ratioN1   = totalCaN1Ytd > 0 ? totalCoutRealN1 / totalCaN1Ytd * 100 : 0;
        const vsCoutProj  = totalCoutProjYtd > 0 ? fp((totalCoutReal - totalCoutProjYtd) / totalCoutProjYtd * 100) : '—';
        const vsCoutN1    = totalCoutRealN1  > 0 ? fp((totalCoutReal - totalCoutRealN1)  / totalCoutRealN1  * 100) : '—';
        const vsRatioProj = totalCA > 0 && totalCoutProjYtd > 0 ? fp(ratioReal - ratioProj) : '—';
        const vsRatioN1   = totalCaN1Ytd > 0 && totalCoutRealN1 > 0 ? fp(ratioReal - ratioN1) : '—';
        return [
          // Projection (8)
          fmtHeures(sumProjLevel(0)), fmtHeures(sumProjLevel(1)), fmtHeures(sumProjLevel(2)), fmtHeures(sumProjLevel(3)), fmtHeures(sumProjLevel(4)),
          fmtHeures(sumProjTotal()), fe(totalCoutProjYtd), totalCA > 0 ? fmtRatioT(ratioProj) : '—',
          // Réaliser (12)
          fmtHeures(sumRealLevel(0)), fmtHeures(sumRealLevel(1)), fmtHeures(sumRealLevel(2)), fmtHeures(sumRealLevel(3)), fmtHeures(sumRealLevel(4)),
          fmtHeures(sumRealTotal()), fe(totalCoutReal), totalCA > 0 ? fmtRatioT(ratioReal) : '—',
          vsCoutProj, vsCoutN1, vsRatioProj, vsRatioN1,
        ];
      }

      // ── 30 totaux ───────────────────────────────────────────────────────────
      case 'frais_generaux': return [
        // 11 catégories × 2 colonnes (Montant HT + % CA)
        ...FG_MAPPING.flatMap(([box, colGroup]) => {
          const montant = sumFgCategory(box, colGroup);
          return [
            montant > 0 ? fe(montant) : '—',
            montant > 0 && totalCA > 0 ? `${((montant / totalCA) * 100).toFixed(2)} %` : '—',
          ];
        }),
        totalFgt > 0 ? fe(totalFgt) : '0,00 €',
        totalCA > 0 && totalFgt > 0 ? `${((totalFgt / totalCA) * 100).toFixed(2)} %` : '—',
        ...CONTRATS_FG.map(c => fe(c.montant)),
      ];

      // ── 12 totaux (YTD uniquement — mois avec données) ──────────────────────
      case 'resultats': {
        const hasData = (mi: number) => caByMonth[mi] > 0;
        // Budget YTD = seulement les mois réalisés (comparaison à date)
        const totalBudgetCA = Array.from({ length: 12 }, (_, i) => hasData(i) ? getVal(i, 3) : 0).reduce((a, b) => a + b, 0);
        // N-1 YTD = seulement les mois réalisés
        const totalCaN1Ytd  = Array.from({ length: 12 }, (_, i) => hasData(i) ? (CA_N1_BY_MONTH[i] ?? 0) : 0).reduce((a, b) => a + b, 0);
        const totalVarPYtd  = totalCaN1Ytd > 0 ? ((totalCA - totalCaN1Ytd) / totalCaN1Ytd) * 100 : 0;
        const totalCvtsRes  = Array.from({ length: 12 }, (_, i) => hasData(i) ? Math.round(getVal(i, 29)) : 0).reduce((a, b) => a + b, 0);
        const totalCvtsJour = Array.from({ length: 12 }, (_, i) => hasData(i) ? Math.round(getVal(i, 32)) : 0).reduce((a, b) => a + b, 0);
        return [
          totalCA > 0 ? fe(totalCA) : '0,00 €',
          fe(totalBudgetCA),
          fp(totalVarPYtd),
          fe(totalCA - totalCaN1Ytd),
          fe(totalCA - totalBudgetCA),
          String(totalCvtsJour),
          totalCvtsRes > 0 ? fe(totalCA / totalCvtsRes) : '—',
          totalCvtsRes > 0 ? fe(totalCA / totalCvtsRes) : '—',
          '0,00 €', '0,00 €', '0,00 €', fe(s(58)),
        ];
      }

      // ── 18 totaux synthèse (YTD) ────────────────────────────────────────────
      case 'synthese': {
        const hd = (i: number) => caByMonth[i] > 0;
        const ytd = (fn: (i: number) => number) => Array.from({ length: 12 }, (_, i) => hd(i) ? fn(i) : 0).reduce((a, b) => a + b, 0);
        // CA
        const totalBudgetCA   = ytd(i => getVal(i, 3));
        const totalCaN1Ytd    = ytd(i => CA_N1_BY_MONTH[i] ?? 0);
        const varPYtd         = totalCaN1Ytd  > 0 ? ((totalCA - totalCaN1Ytd)  / totalCaN1Ytd)  * 100 : 0;
        const varBudYtd       = totalBudgetCA > 0 ? ((totalCA - totalBudgetCA) / totalBudgetCA) * 100 : 0;
        // Couverts
        const totalCvts       = ytd(i => Math.round(getVal(i, 29)));
        const totalCvtsBud    = ytd(i => Math.round(getVal(i, 10)));
        const totalCvtsN1Ytd  = ytd(i => CVTS_N1_BY_MONTH[i] ?? 0);
        const varCvtsN1       = totalCvtsN1Ytd > 0 ? ((totalCvts - totalCvtsN1Ytd) / totalCvtsN1Ytd) * 100 : 0;
        const varCvtsBud      = totalCvtsBud  > 0 ? ((totalCvts - totalCvtsBud)    / totalCvtsBud)    * 100 : 0;
        const tmHT            = totalCvts > 0 ? totalCA / totalCvts : 0;
        const tmN1            = totalCvtsN1Ytd > 0 ? totalCaN1Ytd / totalCvtsN1Ytd : 0;
        const varTmN1         = tmN1 > 0 ? ((tmHT - tmN1) / tmN1) * 100 : 0;
        // Coût Matière
        const totalAchats     = ytd(i => getVal(i, 58));
        const totalAchatsN1   = ytd(i => getValN1(i, 58));
        const ratioAchats     = totalCA > 0 ? (totalAchats / totalCA) * 100 : 0;
        const ratioAchatsN1   = totalCaN1Ytd > 0 ? (totalAchatsN1 / totalCaN1Ytd) * 100 : 0;
        const varRatioAchats  = ratioAchatsN1 > 0 ? fp(ratioAchats - ratioAchatsN1) : '—';
        // Frais Personnel
        const totalCoutProj   = ytd(i => getVal(i, 72));
        const totalCoutReal   = ytd(i => getVal(i, 87));
        const totalCoutRN1    = ytd(i => getValN1(i, 87));
        const ratioFP         = totalCA > 0 ? (totalCoutReal / totalCA) * 100 : 0;
        const ratioFPProj     = totalCA > 0 && totalCoutProj > 0 ? (totalCoutProj / totalCA) * 100 : 0;
        const ratioFPN1       = totalCaN1Ytd > 0 && totalCoutRN1 > 0 ? (totalCoutRN1 / totalCaN1Ytd) * 100 : 0;
        const varRatioFPProj  = totalCoutProj > 0 ? fp(ratioFP - ratioFPProj) : '—';
        const varRatioFPN1    = ratioFPN1 > 0 ? fp(ratioFP - ratioFPN1) : '—';
        // Frais Généraux
        const totalFgt        = ytd(i => getFgTotal(i));
        const ratioFG         = totalCA > 0 ? (totalFgt / totalCA) * 100 : 0;
        return [
          totalCA > 0 ? fe(totalCA) : '0,00 €', fe(totalBudgetCA), fp(varPYtd), fp(varBudYtd),
          String(totalCvts), fp(varCvtsN1), fp(varCvtsBud), fe(tmHT), fp(varTmN1),
          fe(totalAchats), `${ratioAchats.toFixed(2)} %`, varRatioAchats,
          fe(totalCoutReal), `${ratioFP.toFixed(2)} %`, varRatioFPProj, varRatioFPN1,
          totalFgt > 0 ? fe(totalFgt) : '0,00 €', `${ratioFG.toFixed(2)} %`, '—',
        ];
      }

      default: return [];
    }
  };

  // ─── Rendu ────────────────────────────────────────────────────────────────
  const thBase: React.CSSProperties = {
    position: 'sticky',
    border: '1px solid #cbd5e1',
    padding: '6px 8px', fontSize: 10, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '.03em',
    textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.25,
  };
  const tdBase: React.CSSProperties = {
    border: '1px solid #e2e8f0',
    padding: '6px 8px', fontSize: 11, textAlign: 'center',
    fontWeight: 500, color: '#334155', whiteSpace: 'nowrap',
  };

  const activeSection = SECTIONS.find(s => s.key === activeTab) ?? SECTIONS[0];

  const groups = useMemo(() => {
    const result: { g: string; count: number }[] = [];
    activeSection.cols.forEach(c => {
      const last = result[result.length - 1];
      if (last && last.g === c.g) last.count++;
      else result.push({ g: c.g, count: 1 });
    });
    return result;
  }, [activeSection]);

  const ACCENT_PALE: Record<string, string> = {
    '#92400e': '#fef3c7',
    '#1e40af': '#dbeafe',
    '#166534': '#dcfce7',
    '#7c2d12': '#fee2e2',
    '#78350f': '#ffedd5',
    '#1e3a5f': '#e0e7ff',
  };

  return (
    <div style={{ height: '100vh', background: '#FAFAF9', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap'); *{box-sizing:border-box} button{outline:none} .rr:hover td{background:#EEF2FF!important}`}</style>

      {/* HEADER */}
      <header style={{ background: '#1C1917', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, height: 'auto', minHeight: 64 }}>
        {/* Gauche : Retour Accueil */}
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#A8A29E', cursor: 'pointer', background: 'none', border: 'none', padding: '6px 0', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', transition: 'color .2s', textTransform: 'uppercase', letterSpacing: '.1em', flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = '#F59E0B')} onMouseLeave={e => (e.currentTarget.style.color = '#A8A29E')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Retour Accueil
        </button>

        {/* Centre : titre + sélecteur années */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
          <div style={{ color: '#fff', fontSize: 13, fontWeight: 300, letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 8 }}>Récapitulatif Annuel</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[YEAR - 1, YEAR, YEAR + 1].map(y => (
              <button key={y} onClick={() => setSelectedYear(y)} style={{
                border: y === YEAR ? '1px solid #f59e0b' : '1px solid #57534e',
                color: y === YEAR ? '#f59e0b' : '#a8a29e',
                background: y === YEAR ? 'rgba(245,158,11,0.1)' : 'transparent',
                borderRadius: 2, padding: '2px 12px', fontSize: 11, fontWeight: 600,
                letterSpacing: '.1em', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
              }}>
                {y}
              </button>
            ))}
          </div>
        </div>

        {/* Droite : Buro Monte + CA N-1 */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: '#A8A29E', letterSpacing: '.1em', textTransform: 'uppercase' }}>Buro Monte</div>
          <div style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600 }}>{'CA N-1 : ' + fe(CA_N1)}</div>
        </div>
      </header>

      {/* TABS */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E7E5E4', padding: '0 24px', display: 'flex', flexShrink: 0 }}>
        {SECTIONS.map(sec => {
          const isActive = activeTab === sec.key;
          return (
            <button key={sec.key} onClick={() => setActiveTab(sec.key)} style={{
              padding: '14px 20px', fontSize: 13, fontWeight: isActive ? 600 : 500,
              letterSpacing: '.03em', fontFamily: 'inherit', background: 'none', border: 'none',
              borderBottom: isActive ? '2px solid #f59e0b' : '2px solid transparent',
              marginBottom: '-1px', cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap',
              color: isActive ? '#92400e' : '#78716c',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#1c1917'; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = '#78716c'; }}
            >
              {sec.label}
            </button>
          );
        })}
      </div>

      {/* TABLEAU */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {(() => {
          const renderTable = (
            cols: ColDef[],
            label: string,
            icon: string,
            accentBg: string,
            accentColor: string,
            getVals: (mi: number) => string[],
            totalVals: string[],
          ) => {
            const paleBg = ACCENT_PALE[accentBg] ?? '#f1f5f9';
            const grps: { g: string; count: number }[] = [];
            cols.forEach(c => {
              const last = grps[grps.length - 1];
              if (last && last.g === c.g) last.count++;
              else grps.push({ g: c.g, count: 1 });
            });
            return (
              <div key={label} style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '.15em', textTransform: 'uppercase', color: '#1C1917', marginBottom: 16, fontFamily: "Georgia, serif" }}>
                  {label}
                </h2>
                <div style={{ borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.10)', border: '1px solid #D6D3D1' }}>
                <table style={{ borderCollapse: 'separate', borderSpacing: 0, background: '#fff', width: '100%', minWidth: 'max-content' }}>
                  <thead>
                    <tr style={{ height: 40 }}>
                      <th rowSpan={2} style={{ ...thBase, background: accentBg, color: accentColor, minWidth: 90, left: 0, top: 0, zIndex: 60, borderRight: '2px solid rgba(0,0,0,0.2)', borderBottom: '2px solid rgba(0,0,0,0.2)', fontSize: 10, letterSpacing: '.1em', borderTopLeftRadius: 8 }}>
                        DATE
                      </th>
                      {grps.map((gr, gi) => (
                        <th key={`g${gi}`} colSpan={gr.count} style={{ ...thBase, background: accentBg, color: accentColor, fontWeight: 700, top: 0, height: 40, fontSize: 10, letterSpacing: '.12em', zIndex: 40, borderRight: gi < grps.length - 1 ? '1px solid rgba(0,0,0,0.2)' : undefined, borderBottom: '2px solid rgba(0,0,0,0.2)', borderTopRightRadius: gi === grps.length - 1 ? 8 : undefined }}>
                          {gr.g}
                        </th>
                      ))}
                    </tr>
                    <tr style={{ height: 32 }}>
                      {cols.map((c, ci) => (
                        <th key={`col${ci}`} style={{ ...thBase, background: paleBg, color: '#374151', fontWeight: 700, top: 40, height: 32, minWidth: c.w || 65, fontSize: 9, letterSpacing: '.04em', zIndex: 40, borderBottom: '2px solid rgba(0,0,0,0.12)', borderRight: '1px solid rgba(0,0,0,0.08)' }}>
                          {c.l}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MONTHS_FULL.map((_, mi) => {
                      const vals = getVals(mi);
                      const isCurrent = mi === new Date().getMonth() && YEAR === new Date().getFullYear();
                      return (
                        <tr key={mi} className="rr" style={{ background: isCurrent ? '#f8fafc' : (mi % 2 === 0 ? '#ffffff' : '#f8f8f7') }}>
                          <td style={{ ...tdBase, position: 'sticky', left: 0, zIndex: 20, background: accentBg, fontWeight: isCurrent ? 800 : 700, fontSize: 11, color: '#fff', borderRight: '2px solid rgba(0,0,0,0.2)', minWidth: 90, textAlign: 'left', paddingLeft: 10, boxShadow: isCurrent ? 'inset 3px 0 0 rgba(255,255,255,0.4)' : undefined }}>
                            {MONTHS_SHORT[mi]}
                          </td>
                          {vals.map((v, ci) => {
                            const colDef = cols[ci];
                            const isNeg = typeof v === 'string' && v.startsWith('-') && (v.includes('%') || v.includes('€') || v.includes('h')) && v !== '—';
                            const isPos = typeof v === 'string' && v.startsWith('+');
                            let color = isNeg ? '#dc2626' : isPos ? '#16a34a' : v === '—' || v === '' ? '#94a3b8' : '#334155';
                            let fontWeight: number = isNeg || isPos ? 700 : 500;
                            if (v !== '—' && v !== '') {
                              const num = parseFloat(v.replace(',', '.').replace('%', '').trim());
                              if (colDef?.threshold !== undefined && isFinite(num)) {
                                color = num > colDef.threshold ? '#dc2626' : '#16a34a';
                                fontWeight = 700;
                              } else if (colDef?.invertSign && isFinite(num)) {
                                color = num < 0 ? '#16a34a' : num > 0 ? '#dc2626' : '#334155';
                                fontWeight = num !== 0 ? 700 : 500;
                              }
                            }
                            return (
                              <td key={ci} style={{
                                ...tdBase,
                                background: isCurrent ? '#f8fafc' : (mi % 2 === 0 ? '#ffffff' : '#f8f8f7'),
                                color,
                                fontWeight,
                                minWidth: colDef?.w ?? 65,
                                borderBottom: '1px solid #E7E5E4',
                                borderRight: '1px solid #E7E5E4',
                              }}>
                                {v}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td style={{ ...tdBase, position: 'sticky', left: 0, zIndex: 20, background: accentBg, fontWeight: 800, fontSize: 12, color: '#fff', borderRight: '2px solid rgba(0,0,0,0.2)', borderTop: '2px solid rgba(0,0,0,0.2)', textAlign: 'left', paddingLeft: 10, letterSpacing: '.1em', borderBottomLeftRadius: 8 }}>
                        TOTAL
                      </td>
                      {totalVals.map((v, ci) => {
                        const colDef = cols[ci];
                        const isNeg = typeof v === 'string' && v.startsWith('-') && (v.includes('%') || v.includes('€') || v.includes('h')) && v !== '—';
                        const isPos = typeof v === 'string' && v.startsWith('+');
                        let color = isNeg ? '#dc2626' : isPos ? '#16a34a' : 'rgba(255,255,255,0.85)';
                        if (v !== '—' && v !== '') {
                          const num = parseFloat(v.replace(',', '.').replace('%', '').trim());
                          if (colDef?.threshold !== undefined && isFinite(num)) {
                            color = num > colDef.threshold ? '#dc2626' : '#16a34a';
                          } else if (colDef?.invertSign && isFinite(num)) {
                            color = num < 0 ? '#16a34a' : num > 0 ? '#dc2626' : 'rgba(255,255,255,0.85)';
                          }
                        }
                        return (
                          <td key={ci} style={{
                            ...tdBase, background: accentBg,
                            fontWeight: 700, fontSize: 11,
                            color,
                            borderTop: '2px solid rgba(0,0,0,0.15)',
                            borderBottomRightRadius: ci === totalVals.length - 1 ? 8 : undefined,
                          }}>
                            {v}
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                </table>
                </div>
              </div>
            );
          };

          if (activeTab === 'budget') {
            return renderTable(
              activeSection.cols, activeSection.label, activeSection.icon, activeSection.accentBg, activeSection.accentColor,
              (mi) => getSectionValues(activeSection.key, mi),
              getTotalValues(activeSection.key),
            );
          }

          if (activeTab === 'realise') {
            const totals = getTotalValues('realise');
            return (
              <>
                {renderTable(
                  COLS_REALISE.slice(0, 11), 'CA HT', '📊', '#1e40af', '#fff',
                  (mi) => getSectionValues('realise', mi).slice(0, 11),
                  totals.slice(0, 11),
                )}
                {renderTable(
                  COLS_REALISE.slice(11), 'Couverts Restaurant', '📊', '#1e40af', '#fff',
                  (mi) => getSectionValues('realise', mi).slice(11),
                  totals.slice(11),
                )}
              </>
            );
          }
          return renderTable(
            activeSection.cols, activeSection.label, activeSection.icon, activeSection.accentBg, activeSection.accentColor,
            (mi) => getSectionValues(activeSection.key, mi),
            getTotalValues(activeSection.key),
          );
        })()}
      </div>

      <footer style={{ padding: '10px 24px', borderTop: '1px solid #E7E5E4', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ color: '#A8A29E', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase' }}>IDM Restauration Groupe — Buro Monte</span>
        <span style={{ color: '#A8A29E', fontSize: 10, letterSpacing: '.06em' }}>Récapitulatif Annuel · {YEAR} · {activeSection.label}</span>
      </footer>
    </div>
  );
}
