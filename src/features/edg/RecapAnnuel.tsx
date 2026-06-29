import React, { useMemo, useState } from 'react';

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
const AMBER  = '#f59e0b';
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
const BG_YELL  = '#fef08a';

const fe = formatEuroSymbol;
const fp = formatPercentSigned;

const fmtHeures = (val: number): string => {
  if (!isFinite(val) || val === 0) return '—';
  const abs = Math.abs(val);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  return `${val < 0 ? '-' : ''}${h}h${String(m).padStart(2, '0')}`;
};

type ColDef = { g: string; l: string; bg: string; w: number };

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
  { g: 'PROJECTION', l: 'Ratio %',        bg: '#fff', w: 70 }, // col 89 vs proj
  // ── RÉALISER ──────────────────────────────────────────────────────────────
  { g: 'RÉALISER',   l: 'Cadre',          bg: BG_FP,  w: 70 },
  { g: 'RÉALISER',   l: 'Maîtrise',       bg: BG_FP,  w: 70 },
  { g: 'RÉALISER',   l: 'NIV I-II',       bg: BG_FP,  w: 70 },
  { g: 'RÉALISER',   l: 'NIV III',        bg: BG_FP,  w: 70 },
  { g: 'RÉALISER',   l: 'Apprenti',       bg: BG_FP,  w: 70 },
  { g: 'RÉALISER',   l: 'Total\nHeures',  bg: BG_FP,  w: 75 },
  { g: 'RÉALISER',   l: 'Coût\nGlobal',   bg: '#fff', w: 90 }, // col 87
  { g: 'RÉALISER',   l: 'Ratio %',        bg: '#fff', w: 70 }, // col 88/89
  { g: 'RÉALISER',   l: 'VS Projection\n%', bg: BG_FG, w: 80 },
];

// Alias pour la section SECTIONS
const COLS_FP_CUISINE_SALLE = COLS_FP;
const COLS_FP_GLOBAL        = COLS_FP;
// Conservés pour le rendu double (non utilisés en mode tableau unique)
const COLS_FP_PROJ = COLS_FP.slice(0, 8);
const COLS_FP_REAL = COLS_FP.slice(8);

const COLS_FRAIS_GENERAUX: ColDef[] = [
  // 34 colonnes
  { g: '',                            l: 'Frais Perso\nRéel Mois',      bg: BG_FG2, w: 80 }, // col 87
  { g: '',                            l: "Ecart au\nBudget NB Heure",   bg: BG_FG,  w: 80 }, // col 91 (HH:MM)
  { g: '',                            l: 'Ecart au\nBudget S/C%',       bg: BG_FG,  w: 70 }, // col 92 raw
  { g: '',                            l: 'VAR VS N-1',                  bg: BG_HATCH, w: 65 }, // —
  { g: 'Entretien &\nRéparation',     l: 'Montant HT', bg: BG_FG,  w: 80 }, // TODO: brancher par catégorie FG
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

const COLS_RESULTATS: ColDef[] = [
  // 12 colonnes
  { g: 'CA',      l: 'CA HT Réalisé',          bg: BG_RES, w: 100 }, // caByMonth
  { g: 'CA',      l: 'CA Budget',               bg: BG_RES, w: 90  }, // —
  { g: 'CA',      l: 'VAR % N-1',               bg: BG_RES, w: 80  }, // calc local
  { g: 'CA',      l: 'Différence N-1',          bg: BG_RES, w: 95  }, // calc local
  { g: 'CA',      l: 'Diff. Budget',            bg: BG_RES, w: 90  }, // —
  { g: 'TICKETS', l: 'Couverts\nAnnuel',        bg: BG_BUDG, w: 75  }, // col 32 cumul
  { g: 'TICKETS', l: 'Moy Cvts\n/jour',         bg: BG_BUDG, w: 70  }, // col 30
  { g: 'TICKETS', l: 'TM\nAnnuel',              bg: BG_BUDG, w: 70  }, // —
  { g: 'MARGE',   l: 'Stock\nInitial',          bg: BG_CM,   w: 80  }, // —
  { g: 'MARGE',   l: 'Stock\nFinal',            bg: BG_CM,   w: 80  }, // —
  { g: 'MARGE',   l: 'Variation\nStock',        bg: BG_CM,   w: 80  }, // —
  { g: 'MARGE',   l: 'Total Achat\nHors Metro', bg: BG_CM,   w: 95  }, // col 58
];

// ─── Composant ───────────────────────────────────────────────────────────────

interface RecapAnnuelProps { onBack: () => void; }

export default function RecapAnnuel({ onBack }: RecapAnnuelProps) {
  const { data, selectedYear, setSelectedYear } = useData();
  const YEAR = selectedYear;
  const MONTHS_SHORT = MONTHS_SHORT_LABELS.map(m => `${m}-${YEAR.toString().slice(-2)}`);
  const [activeTab, setActiveTab] = useState<string>('budget');

  const {
    getVal, getFgTotal, getRaw, getLastDayVal,
    getRealLevelHours, getProjLevelHours,
    getRealTotalHours, getProjTotalHours,
    sumRealLevel, sumProjLevel, sumRealTotal, sumProjTotal,
    sumCol, sumHoursCol,
    caByMonth, totalCA,
  } = useRecapAnnuelData(data, YEAR);

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
    { key: 'resultats',       label: 'Résultats Annuels', icon: '🏆', accentBg: '#1e3a5f', accentColor: '#fff', cols: COLS_RESULTATS },
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
          fp(caN1 > 0 ? ((g(3) - caN1) / caN1) * 100 : 0),
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

      // ── 17 valeurs : 8 projection + 9 réaliser ──────────────────────────────
      case 'frais_personnel': {
        const rl = (lv: number) => getRealLevelHours(mi, lv);
        const pl = (lv: number) => getProjLevelHours(mi, lv);
        const coutProj = g(72);
        const coutReal = g(87);
        const vsProj   = coutProj > 0 ? fp((coutReal - coutProj) / coutProj * 100) : '—';
        const ratioProj = ca > 0 ? fp(coutProj / ca * 100) : '—';
        const ratioReal = ca > 0 ? fp(coutReal / ca * 100) : '—';
        return [
          // Projection (8)
          fmtHeures(pl(0)), fmtHeures(pl(1)), fmtHeures(pl(2)), fmtHeures(pl(3)), fmtHeures(pl(4)),
          fmtHeures(getProjTotalHours(mi)), fe(coutProj), ratioProj,
          // Réaliser (9)
          fmtHeures(rl(0)), fmtHeures(rl(1)), fmtHeures(rl(2)), fmtHeures(rl(3)), fmtHeures(rl(4)),
          fmtHeures(getRealTotalHours(mi)), fe(coutReal), ratioReal, vsProj,
        ];
      }

      // ── 34 valeurs ──────────────────────────────────────────────────────────
      case 'frais_generaux': return [
        fe(g(87)),
        fmtHeures(g(91)),
        r(92),
        '—',
        // TODO: brancher par catégorie FG (11 sous-catégories × 2 = 22 colonnes)
        ...Array<string>(22).fill('—'),
        fgt > 0 ? fe(fgt) : '0,00 €',
        ca > 0 && fgt > 0 ? `${((fgt / ca) * 100).toFixed(2)} %` : '—',
        ...CONTRATS_FG.map(c => isJan ? fe(c.montant) : ''),
      ];

      // ── 12 valeurs ──────────────────────────────────────────────────────────
      case 'resultats': return [
        ca > 0 ? fe(ca) : '0,00 €',
        '—',
        fp(varP),
        fe(ca - caN1),
        '—',
        String(Math.round(g(32))), fe(g(30)), '—',
        '0,00 €', '0,00 €', '0,00 €', fe(g(58)),
      ];

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
          fp(totalVarBudget),
        ];
      }

      // ── 22 totaux ───────────────────────────────────────────────────────────
      case 'realise': {
        const totalCaMidi   = s(18);
        const totalCaSoir   = s(19);
        const totalCaJour   = s(21);
        const totalBudMidi  = s(0);
        const totalBudSoir  = s(1);
        const totalBudJour  = s(3);
        const totalCvtsMidi = s(25);
        const totalCvtsSoir = s(27);
        const totalCvtsJour = s(29);
        const totalBudCvtsMidi = s(6);
        const totalBudCvtsSoir = s(8);
        const totalBudCvtsJour = s(10);
        const ecartCaJourPct   = totalBudJour    > 0 ? ((totalCaJour   - totalBudJour)    / totalBudJour)    * 100 : 0;
        const ecartCvtsJourPct = totalBudCvtsJour > 0 ? ((totalCvtsJour - totalBudCvtsJour) / totalBudCvtsJour) * 100 : 0;
        const tBudgetAnnuel     = Array.from({ length: 12 }, (_, i) => getVal(i, 3)).reduce((a, b) => a + b, 0);
        const tBudgetCvtsAnnuel = Array.from({ length: 12 }, (_, i) => getVal(i, 10)).reduce((a, b) => a + b, 0);
        const tCumulEcartCA   = Array.from({ length: 12 }, (_, i) => caByMonth[i] > 0 ? getVal(i, 22) : 0).reduce((a, b) => a + b, 0);
        const tCumulEcartCvts = Array.from({ length: 12 }, (_, i) => caByMonth[i] > 0 ? (getVal(i, 29) - getVal(i, 10)) : 0).reduce((a, b) => a + b, 0);
        const tTendanceCA   = tBudgetAnnuel     + tCumulEcartCA;
        const tTendanceCvts = tBudgetCvtsAnnuel + tCumulEcartCvts;
        return [
          // CA HT — 10 valeurs
          fe(s(17)),
          fe(totalCaMidi),
          fe(totalCaMidi - totalBudMidi),
          fe(totalCaSoir),
          fe(totalCaSoir - totalBudSoir),
          fe(totalCaJour),
          fe(totalCaJour - totalBudJour),
          fp(ecartCaJourPct),
          fe(totalCaJour),
          fe(tTendanceCA),
          fp(tBudgetAnnuel > 0 ? (tCumulEcartCA / tBudgetAnnuel) * 100 : 0),
          // COUVERTS — 11 valeurs
          String(Math.round(totalCvtsMidi)),
          String(Math.round(totalCvtsMidi - totalBudCvtsMidi)),
          String(Math.round(totalCvtsSoir)),
          String(Math.round(totalCvtsSoir - totalBudCvtsSoir)),
          String(Math.round(totalCvtsJour)),
          fe(totalCvtsJour > 0 ? totalCaJour / totalCvtsJour : 0),
          String(Math.round(totalCvtsJour - totalBudCvtsJour)),
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

      // ── 17 totaux : 8 projection + 9 réaliser ──────────────────────────────
      case 'frais_personnel': {
        const totalCoutProj = s(72);
        const totalCoutReal = s(87);
        const ratioProj = totalCA > 0 ? fp(totalCoutProj / totalCA * 100) : '—';
        const ratioReal = totalCA > 0 ? fp(totalCoutReal / totalCA * 100) : '—';
        const vsProj    = totalCoutProj > 0 ? fp((totalCoutReal - totalCoutProj) / totalCoutProj * 100) : '—';
        return [
          // Projection (8)
          fmtHeures(sumProjLevel(0)), fmtHeures(sumProjLevel(1)), fmtHeures(sumProjLevel(2)), fmtHeures(sumProjLevel(3)), fmtHeures(sumProjLevel(4)),
          fmtHeures(sumProjTotal()), fe(totalCoutProj), ratioProj,
          // Réaliser (9)
          fmtHeures(sumRealLevel(0)), fmtHeures(sumRealLevel(1)), fmtHeures(sumRealLevel(2)), fmtHeures(sumRealLevel(3)), fmtHeures(sumRealLevel(4)),
          fmtHeures(sumRealTotal()), fe(totalCoutReal), ratioReal, vsProj,
        ];
      }

      // ── 34 totaux ───────────────────────────────────────────────────────────
      case 'frais_generaux': return [
        fe(s(87)),
        fmtHeures(s(91)),
        '—', '—',
        ...Array<string>(22).fill('—'),
        totalFgt > 0 ? fe(totalFgt) : '0,00 €',
        totalCA > 0 && totalFgt > 0 ? `${((totalFgt / totalCA) * 100).toFixed(2)} %` : '—',
        ...CONTRATS_FG.map(c => fe(c.montant)),
      ];

      // ── 12 totaux ───────────────────────────────────────────────────────────
      case 'resultats': return [
        totalCA > 0 ? fe(totalCA) : '0,00 €',
        '—',
        fp(totalVarP),
        fe(totalCA - CA_N1),
        '—',
        String(Math.round(s(32))), '—', '—',
        '0,00 €', '0,00 €', '0,00 €', fe(s(58)),
      ];

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

  return (
    <div style={{ height: '100vh', background: '#f1f5f9', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden', maxWidth: '100vw' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap'); *{box-sizing:border-box} button{outline:none} .rr:hover td{background:#eff6ff!important}`}</style>

      {/* HEADER */}
      <header style={{ background: NAV, height: 52, padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#94a3b8', cursor: 'pointer', background: 'none', border: 'none', padding: '6px 0', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', transition: 'color .2s', textTransform: 'uppercase', letterSpacing: '.05em' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')} onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Retour Accueil
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase' }}>
            📋 Récapitulatif Annuel
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {[YEAR - 1, YEAR, YEAR + 1].map(y => (
              <button key={y} onClick={() => setSelectedYear(y)} style={{
                padding: '3px 10px', borderRadius: 6, border: '1px solid',
                fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all .15s',
                background: y === YEAR ? '#f59e0b' : 'transparent',
                borderColor: y === YEAR ? '#f59e0b' : '#475569',
                color: y === YEAR ? '#1e293b' : '#94a3b8',
              }}>
                {y}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: '#f59e0b18', border: '1px solid #f59e0b30', borderRadius: 6, padding: '4px 14px', color: AMBER, fontSize: 11, fontWeight: 700, letterSpacing: '.04em' }}>
          BURO MONTE &nbsp;·&nbsp; CA N-1 : {fe(CA_N1)}
        </div>
      </header>

      {/* BARRE D'ONGLETS */}
      <div style={{ padding: '12px 28px', display: 'flex', gap: 8, background: '#fff', borderBottom: '1px solid #e2e8f0', alignItems: 'center', flexShrink: 0 }}>
        {SECTIONS.map(sec => {
          const isActive = activeTab === sec.key;
          return (
            <button key={sec.key} onClick={() => setActiveTab(sec.key)} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
              background: isActive ? sec.accentBg : '#f8fafc',
              border: `1.5px solid ${isActive ? sec.accentBg : '#e2e8f0'}`,
              boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
              transition: 'all .15s',
            }}>
              <span style={{ fontSize: 14 }}>{sec.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? sec.accentColor : '#334155', letterSpacing: '.02em', lineHeight: 1.3 }}>
                {sec.label}
              </span>
              {isActive && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 2 }}>
                  <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {/* TABLEAU */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
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
            const grps: { g: string; count: number }[] = [];
            cols.forEach(c => {
              const last = grps[grps.length - 1];
              if (last && last.g === c.g) last.count++;
              else grps.push({ g: c.g, count: 1 });
            });
            return (
              <div key={label} style={{ marginBottom: 16, overflow: 'auto' }}>
                <table style={{ borderCollapse: 'separate', borderSpacing: 0, background: '#fff' }}>
                  <thead>
                    <tr style={{ height: 30 }}>
                      <th rowSpan={3} style={{ ...thBase, background: BG_DATE, color: '#fff', minWidth: 82, left: 0, top: 0, zIndex: 60, borderRight: '3px solid #475569', borderBottom: '3px solid #475569' }}>
                        DATE
                      </th>
                      <th colSpan={cols.length} style={{ ...thBase, background: accentBg, color: accentColor, top: 0, height: 30, fontSize: 11, zIndex: 40 }}>
                        {icon} {label.toUpperCase()}
                      </th>
                    </tr>
                    <tr style={{ height: 30 }}>
                      {grps.map((gr, gi) => {
                        const offset = grps.slice(0, gi).reduce((a, x) => a + x.count, 0);
                        return (
                          <th key={`g${gi}`} colSpan={gr.count} style={{ ...thBase, background: cols[offset].bg, color: '#1e293b', top: 30, height: 30, fontSize: 9, zIndex: 40, borderBottom: '1px solid #94a3b8' }}>
                            {gr.g}
                          </th>
                        );
                      })}
                    </tr>
                    <tr style={{ height: 60 }}>
                      {cols.map((c, ci) => (
                        <th key={`col${ci}`} style={{ ...thBase, background: c.bg, color: '#374151', top: 60, height: 60, minWidth: c.w || 65, fontSize: 9, zIndex: 40, borderBottom: '3px solid #374151' }}>
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
                        <tr key={mi} className="rr" style={{ background: isCurrent ? '#eff6ff' : (mi % 2 === 0 ? '#fff' : '#f8fafc') }}>
                          <td style={{ ...tdBase, position: 'sticky', left: 0, zIndex: 20, background: isCurrent ? '#dbeafe' : '#f1f5f9', fontWeight: isCurrent ? 800 : 600, fontSize: 11, color: '#1e293b', borderRight: '3px solid #475569', minWidth: 82, textAlign: 'left', paddingLeft: 8 }}>
                            {MONTHS_SHORT[mi]}
                          </td>
                          {vals.map((v, ci) => {
                            const colDef = cols[ci];
                            const isNeg = typeof v === 'string' && v.startsWith('-') && (v.includes('%') || v.includes('€') || v.includes('h')) && v !== '—';
                            const isPos = typeof v === 'string' && v.startsWith('+');
                            return (
                              <td key={ci} style={{
                                ...tdBase,
                                background: colDef?.bg ?? '#fff',
                                color: isNeg ? '#dc2626' : isPos ? '#16a34a' : v === '—' || v === '' ? '#94a3b8' : '#334155',
                                fontWeight: isNeg || isPos ? 700 : 500,
                                minWidth: colDef?.w ?? 65,
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
                      <td style={{ ...tdBase, position: 'sticky', left: 0, zIndex: 20, background: BG_YELL, fontWeight: 800, fontSize: 12, color: '#713f12', borderRight: '3px solid #ca8a04', borderTop: '2px solid #ca8a04', textAlign: 'left', paddingLeft: 8 }}>
                        TOTAL
                      </td>
                      {totalVals.map((v, ci) => {
                        const isNeg = typeof v === 'string' && v.startsWith('-') && (v.includes('%') || v.includes('€') || v.includes('h')) && v !== '—';
                        const isPos = typeof v === 'string' && v.startsWith('+');
                        return (
                          <td key={ci} style={{
                            ...tdBase, background: BG_YELL,
                            fontWeight: 800, fontSize: 11,
                            color: isNeg ? '#dc2626' : isPos ? '#16a34a' : '#713f12',
                            borderTop: '2px solid #ca8a04',
                          }}>
                            {v}
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          };

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

      <footer style={{ padding: '10px 28px', borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ color: '#94a3b8', fontSize: 9, letterSpacing: '.06em', textTransform: 'uppercase' }}>IDM Restauration Groupe — Buro Monte</span>
        <span style={{ color: '#cbd5e1', fontSize: 9 }}>Récapitulatif Annuel · {YEAR} · {activeSection.label}</span>
      </footer>
    </div>
  );
}
