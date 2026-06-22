import React, { useMemo, useState } from 'react';

import { useData } from '@/contexts/DataContext';
import { formatEuroSymbol, formatPercentSigned } from '@/lib/formatters';
import { useRecapAnnuelData } from './useRecapAnnuelData';

const CA_N1 = 1_789_254;
const CA_N1_BY_MONTH = [159802, 161245, 174361, 186373, 190990, 172214, 167786, 156793, 130384, 149359, 139948, 0];
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
  // 14 colonnes — CA Limo (col 2) + groupe LIMONADE (cols 14-16) exclus
  { g: 'CA',             l: 'CA HT\nMidi',         bg: BG_BUDG,  w: 70 }, // col 0
  { g: 'CA',             l: 'CA HT\nSoir',         bg: BG_BUDG,  w: 70 }, // col 1
  { g: 'CA',             l: 'CA HT\nJour',         bg: BG_BUDG,  w: 75 }, // col 3
  { g: 'CA',             l: 'Cumul\nDepuis le 01', bg: BG_BUDG,  w: 80 }, // col 4
  { g: 'CA',             l: 'VAR\nVS N-1',         bg: BG_HATCH, w: 65 }, // col 5
  { g: 'COUVERT\nMIDI',  l: 'NB CVTS',             bg: BG_BUDG,  w: 65 }, // col 6
  { g: 'COUVERT\nMIDI',  l: 'CVTS MOY HT',         bg: BG_BUDG,  w: 75 }, // col 7
  { g: 'COUVERT\nSOIR',  l: 'NB CVTS',             bg: BG_BUDG,  w: 65 }, // col 8
  { g: 'COUVERT\nSOIR',  l: 'CVTS MOY HT',         bg: BG_BUDG,  w: 75 }, // col 9
  { g: 'COUVERT\nJOUR',  l: 'NB CVTS',             bg: BG_BUDG,  w: 65 }, // col 10
  { g: 'COUVERT\nJOUR',  l: 'CVTS MOY',            bg: BG_BUDG,  w: 65 }, // col 11
  { g: 'COUVERT\nJOUR',  l: 'CVTS CUMUL',          bg: BG_BUDG,  w: 75 }, // col 12
  { g: 'COUVERT\nJOUR',  l: 'VAR VS N-1',          bg: BG_HATCH, w: 65 }, // col 13
  { g: 'VAE',            l: 'CA HT VAE',           bg: BG_BUDG,  w: 70 }, // col 17
];

const COLS_REALISE: ColDef[] = [
  // 25 colonnes — CA HT Limo + Ecart Budget Limo exclus (service limo inexistant)
  { g: 'CA HT',                l: 'VAR\nVS N-1',          bg: BG_HATCH, w: 65 }, // calc local
  { g: 'CA HT',                l: 'CA HT\nVAE',           bg: BG_REAL2, w: 70 }, // col 17
  { g: 'CA HT',                l: 'CA HT\nMidi',          bg: BG_REAL2, w: 70 }, // col 18
  { g: 'CA HT',                l: 'Ecart\nBudget Midi',   bg: '#fff',   w: 65 }, // —
  { g: 'CA HT',                l: 'CA HT\nSoir',          bg: BG_REAL2, w: 70 }, // col 19
  { g: 'CA HT',                l: 'Ecart\nBudget Soir',   bg: '#fff',   w: 65 }, // —
  { g: 'CA HT',                l: 'CAHT\nMois',           bg: BG_REAL2, w: 75 }, // col 21
  { g: 'CA HT',                l: 'VAR VS N-1',           bg: BG_HATCH, w: 65 }, // calc local
  { g: 'CA HT',                l: 'Cumul\nDepuis Janv.',  bg: BG_REAL2, w: 80 }, // col 23
  { g: 'CA HT',                l: 'Ecart\nBudget Mois',   bg: '#fff',   w: 65 }, // col 22
  { g: 'CA HT',                l: 'Ecart\nDepuis 01/01',  bg: '#fff',   w: 70 }, // —
  { g: 'CA HT',                l: 'Tendance\nAnnuel',     bg: '#fff',   w: 65 }, // —
  { g: 'CA HT',                l: 'Tendance\nVAR % -1',   bg: '#fff',   w: 65 }, // —
  { g: 'CA HT',                l: 'RAPPEL CA\nN-1',       bg: BG_HATCH, w: 75 }, // caN1
  { g: 'COUVERTS\nRESTAURANT', l: 'MIDI\nNB CVTS',        bg: BG_REAL2, w: 65 }, // col 25
  { g: 'COUVERTS\nRESTAURANT', l: 'MIDI\nCVTS MOY',       bg: BG_REAL2, w: 65 }, // col 26
  { g: 'COUVERTS\nRESTAURANT', l: 'SOIR\nNB CVTS',        bg: BG_REAL2, w: 65 }, // col 27
  { g: 'COUVERTS\nRESTAURANT', l: 'SOIR\nCVTS MOY',       bg: BG_REAL2, w: 65 }, // col 28
  { g: 'COUVERTS\nRESTAURANT', l: 'JOUR\nNB CVTS',        bg: BG_REAL2, w: 65 }, // col 29
  { g: 'COUVERTS\nRESTAURANT', l: 'JOUR\nCVTS MOY',       bg: BG_REAL2, w: 65 }, // col 30
  { g: 'COUVERTS\nRESTAURANT', l: 'JOUR\nCVTS CUMUL',     bg: BG_REAL2, w: 70 }, // col 32
  { g: 'COUVERTS\nRESTAURANT', l: 'Ecart\nBudget Cvts',   bg: '#fff',   w: 65 }, // —
  { g: 'COUVERTS\nRESTAURANT', l: 'Ecart\nMoy CVTS',      bg: '#fff',   w: 65 }, // —
  { g: 'COUVERTS\nRESTAURANT', l: 'VAR VS N-1',           bg: BG_HATCH, w: 65 }, // —
  { g: '',                     l: 'RAPPEL CA\nN-1',        bg: BG_HATCH, w: 80 }, // caN1
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

// FP cuisine/salle — 32 colonnes
const COLS_FP_CUISINE_SALLE: ColDef[] = [
  { g: '',                           l: 'Coût\nGlobal',             bg: '#fff', w: 75 }, // col 87
  { g: 'Productivité\nCible 50,00',  l: 'Productivité\nRéelle',     bg: '#fff', w: 70 }, // col 88
  { g: 'Budget FP\n35,00%',          l: 'Frais Perso\n%',           bg: '#fff', w: 70 }, // col 89
  { g: '',                           l: 'Ratio\nAnnuel %',          bg: '#fff', w: 65 }, // —
  { g: 'PROJECTION S/C\nSKELLO',    l: 'Total\nHeures',             bg: BG_FP,  w: 60 }, // col 61
  { g: 'PROJECTION S/C\nSKELLO',    l: 'Cadre\nCuisine',           bg: BG_FP,  w: 65 }, // col 62
  { g: 'PROJECTION S/C\nSKELLO',    l: 'Cadre\nSalle',             bg: BG_FP,  w: 65 }, // col 63
  { g: 'PROJECTION S/C\nSKELLO',    l: 'Maîtrise\nCuisine',        bg: BG_FP,  w: 70 }, // col 64
  { g: 'PROJECTION S/C\nSKELLO',    l: 'Maîtrise\nSalle',          bg: BG_FP,  w: 70 }, // col 65
  { g: 'PROJECTION S/C\nSKELLO',    l: 'NIV I-II\nCuisine',        bg: BG_FP,  w: 70 }, // col 66
  { g: 'PROJECTION S/C\nSKELLO',    l: 'NIV I-II\nSalle',          bg: BG_FP,  w: 70 }, // col 67
  { g: 'PROJECTION S/C\nSKELLO',    l: 'NIV III\nCuisine',         bg: BG_FP,  w: 70 }, // col 68
  { g: 'PROJECTION S/C\nSKELLO',    l: 'NIV III\nSalle',           bg: BG_FP,  w: 70 }, // col 69
  { g: 'PROJECTION S/C\nSKELLO',    l: 'Apprenti\nCuisine',        bg: BG_FP,  w: 70 }, // col 70
  { g: 'PROJECTION S/C\nSKELLO',    l: 'Apprenti\nSalle',          bg: BG_FP,  w: 70 }, // col 71
  { g: 'PROJECTION S/C\nSKELLO',    l: 'Coût\nGlobal',             bg: '#fff', w: 80 }, // col 72
  { g: 'FRAIS PERSONNEL\nREALISE',  l: 'Total\nHeures',             bg: BG_FP,  w: 60 }, // col 76
  { g: 'FRAIS PERSONNEL\nREALISE',  l: 'Cadre\nCuisine',            bg: BG_FP,  w: 60 }, // col 77
  { g: 'FRAIS PERSONNEL\nREALISE',  l: 'Cadre\nSalle',              bg: BG_FP,  w: 60 }, // col 78
  { g: 'FRAIS PERSONNEL\nREALISE',  l: 'Maîtrise\nCuisine',         bg: BG_FP,  w: 65 }, // col 79
  { g: 'FRAIS PERSONNEL\nREALISE',  l: 'Maîtrise\nSalle',           bg: BG_FP,  w: 65 }, // col 80
  { g: 'FRAIS PERSONNEL\nREALISE',  l: 'NIV I-II\nCuisine',         bg: BG_FP,  w: 65 }, // col 81
  { g: 'FRAIS PERSONNEL\nREALISE',  l: 'NIV I-II\nSalle',           bg: BG_FP,  w: 65 }, // col 82
  { g: 'FRAIS PERSONNEL\nREALISE',  l: 'NIV III\nCuisine',          bg: BG_FP,  w: 65 }, // col 83
  { g: 'FRAIS PERSONNEL\nREALISE',  l: 'NIV III\nSalle',            bg: BG_FP,  w: 65 }, // col 84
  { g: 'FRAIS PERSONNEL\nREALISE',  l: 'Apprenti\nCuisine',         bg: BG_FP,  w: 65 }, // col 85
  { g: 'FRAIS PERSONNEL\nREALISE',  l: 'Apprenti\nSalle',           bg: BG_FP,  w: 65 }, // col 86
  { g: 'FRAIS PERSONNEL\nREALISE',  l: 'FP Réel\nMois',             bg: '#fff', w: 80 }, // col 87
  { g: '',                           l: "Ecart Budget\nNB d'Heure", bg: BG_FG,  w: 80 }, // col 91
  { g: '',                           l: 'Ecart Budget\nS/C%',       bg: BG_FG,  w: 70 }, // col 92
  { g: '',                           l: 'VAR VS N-1',               bg: BG_HATCH, w: 65 }, // —
  { g: '',                           l: 'Ratio\nHebdo %',           bg: '#fff', w: 65 }, // col 90
];

// FP global — 22 colonnes (5 catégories unifiées)
const COLS_FP_GLOBAL: ColDef[] = [
  { g: '',                          l: 'Coût\nGlobal',             bg: '#fff', w: 75 }, // col 87
  { g: 'Productivité\nCible 50,00', l: 'Productivité\nRéelle',     bg: '#fff', w: 70 }, // col 88
  { g: 'Budget FP\n35,00%',         l: 'Frais Perso\n%',           bg: '#fff', w: 70 }, // col 89
  { g: '',                          l: 'Ratio\nAnnuel %',          bg: '#fff', w: 65 }, // —
  { g: 'PROJECTION S/C\nSKELLO',   l: 'Total\nHeures',             bg: BG_FP,  w: 60 }, // col 61
  { g: 'PROJECTION S/C\nSKELLO',   l: 'Cadre',                    bg: BG_FP,  w: 65 }, // col 130
  { g: 'PROJECTION S/C\nSKELLO',   l: 'Maîtrise',                 bg: BG_FP,  w: 70 }, // col 131
  { g: 'PROJECTION S/C\nSKELLO',   l: 'NIV I-II',                 bg: BG_FP,  w: 70 }, // col 132
  { g: 'PROJECTION S/C\nSKELLO',   l: 'NIV III',                  bg: BG_FP,  w: 70 }, // col 133
  { g: 'PROJECTION S/C\nSKELLO',   l: 'Apprenti',                 bg: BG_FP,  w: 70 }, // col 134
  { g: 'PROJECTION S/C\nSKELLO',   l: 'Coût\nGlobal',             bg: '#fff', w: 80 }, // col 72
  { g: 'FRAIS PERSONNEL\nREALISE', l: 'Total\nHeures',             bg: BG_FP,  w: 60 }, // col 76
  { g: 'FRAIS PERSONNEL\nREALISE', l: 'Cadre',                    bg: BG_FP,  w: 60 }, // col 135
  { g: 'FRAIS PERSONNEL\nREALISE', l: 'Maîtrise',                 bg: BG_FP,  w: 65 }, // col 136
  { g: 'FRAIS PERSONNEL\nREALISE', l: 'NIV I-II',                 bg: BG_FP,  w: 65 }, // col 137
  { g: 'FRAIS PERSONNEL\nREALISE', l: 'NIV III',                  bg: BG_FP,  w: 65 }, // col 138
  { g: 'FRAIS PERSONNEL\nREALISE', l: 'Apprenti',                 bg: BG_FP,  w: 65 }, // col 139
  { g: 'FRAIS PERSONNEL\nREALISE', l: 'FP Réel\nMois',            bg: '#fff', w: 80 }, // col 87
  { g: '',                          l: "Ecart Budget\nNB d'Heure", bg: BG_FG,  w: 80 }, // col 91
  { g: '',                          l: 'Ecart Budget\nS/C%',       bg: BG_FG,  w: 70 }, // col 92
  { g: '',                          l: 'VAR VS N-1',               bg: BG_HATCH, w: 65 }, // —
  { g: '',                          l: 'Ratio\nHebdo %',           bg: '#fff', w: 65 }, // col 90
];

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

  const { getVal, getFgTotal, getRaw, caByMonth, totalCA } = useRecapAnnuelData(data, YEAR);

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

  // Somme annuelle d'une colonne dashboard (mois 0–11)
  const sumCol = (col: number) =>
    Array.from({ length: 12 }, (_, mi) => getVal(mi, col)).reduce((a, b) => a + b, 0);

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

      // ── 14 valeurs ──────────────────────────────────────────────────────────
      case 'budget': return [
        fe(g(0)), fe(g(1)), fe(g(3)), fe(g(4)), fp(g(5)),
        String(Math.round(g(6))), fe(g(7)),
        String(Math.round(g(8))), fe(g(9)),
        String(Math.round(g(10))), fe(g(11)), String(Math.round(g(12))), fp(g(13)),
        fe(g(17)),
      ];

      // ── 25 valeurs ──────────────────────────────────────────────────────────
      case 'realise': return [
        fp(varP),
        fe(g(17)), fe(g(18)), '—',
        fe(g(19)), '—',
        ca > 0 ? fe(ca) : '0,00 €',
        fp(varP),
        fe(g(23)), fe(g(22)),
        '—', '—', '—',
        fe(caN1),
        String(Math.round(g(25))), fe(g(26)),
        String(Math.round(g(27))), fe(g(28)),
        String(Math.round(g(29))), fe(g(30)),
        String(Math.round(g(32))),
        '—', '—', '—',
        fe(caN1),
      ];

      // ── 23 valeurs ──────────────────────────────────────────────────────────
      case 'cout_matiere': return [
        fe(g(39)), fp(g(40)), fe(g(41)), fp(g(42)), fe(g(43)),
        fe(g(45)), fe(g(46)), fe(g(47)), fe(g(48)),
        fe(g(49)), fe(g(50)), fe(g(51)), fe(g(52)), fe(g(53)), fe(g(54)), fe(g(55)), fe(g(56)), fe(g(57)),
        fe(g(58)), fe(g(59)), fp(g(60)),
        '0,00 €', '0,00 €',
      ];

      // ── 32 (cuisine/salle) ou 22 (global) valeurs ────────────────────────
      case 'frais_personnel':
        if (isGlobal) {
          // 22 valeurs — schéma global (5 catégories unifiées, cols 130-134 proj / 135-139 réel)
          return [
            fe(g(87)), r(88), r(89), '—',
            fmtHeures(g(61)),
            fmtHeures(g(130)), fmtHeures(g(131)), fmtHeures(g(132)), fmtHeures(g(133)), fmtHeures(g(134)),
            fe(g(72)),
            fmtHeures(g(76)),
            fmtHeures(g(135)), fmtHeures(g(136)), fmtHeures(g(137)), fmtHeures(g(138)), fmtHeures(g(139)),
            fe(g(87)),
            fmtHeures(g(91)), r(92),
            '—',
            r(90),
          ];
        }
        // 32 valeurs — schéma cuisine/salle (10 catégories, cols 62-71 proj / 77-86 réel)
        return [
          fe(g(87)), r(88), r(89), '—',
          fmtHeures(g(61)),
          fmtHeures(g(62)), fmtHeures(g(63)), fmtHeures(g(64)), fmtHeures(g(65)),
          fmtHeures(g(66)), fmtHeures(g(67)), fmtHeures(g(68)), fmtHeures(g(69)),
          fmtHeures(g(70)), fmtHeures(g(71)),
          fe(g(72)),
          fmtHeures(g(76)),
          fmtHeures(g(77)), fmtHeures(g(78)), fmtHeures(g(79)), fmtHeures(g(80)),
          fmtHeures(g(81)), fmtHeures(g(82)), fmtHeures(g(83)), fmtHeures(g(84)),
          fmtHeures(g(85)), fmtHeures(g(86)),
          fe(g(87)),
          fmtHeures(g(91)), r(92),
          '—',
          r(90),
        ];

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
    const sCvtsMidi = Math.round(s(25));
    const sCvtsSoir = Math.round(s(27));
    const sCvtsJour = Math.round(s(29));

    switch (sectionKey) {

      // ── 14 totaux ───────────────────────────────────────────────────────────
      case 'budget': return [
        fe(s(0)), fe(s(1)), fe(s(3)), fe(s(4)), fp(totalVarP),
        String(Math.round(s(6))), sCvtsMidi > 0 ? fe(s(0) / sCvtsMidi) : '—',
        String(Math.round(s(8))), sCvtsSoir > 0 ? fe(s(1) / sCvtsSoir) : '—',
        String(Math.round(s(10))), sCvtsJour > 0 ? fe(s(3) / sCvtsJour) : '—',
        String(Math.round(s(12))), fp(totalVarP),
        fe(s(17)),
      ];

      // ── 25 totaux ───────────────────────────────────────────────────────────
      case 'realise': return [
        fp(totalVarP),
        fe(s(17)), fe(s(18)), '—',
        fe(s(19)), '—',
        totalCA > 0 ? fe(totalCA) : '0,00 €',
        fp(totalVarP),
        fe(totalCA),
        '—', '—', '—', '—',
        fe(CA_N1),
        String(sCvtsMidi), sCvtsMidi > 0 ? fe(s(18) / sCvtsMidi) : '—',
        String(sCvtsSoir), sCvtsSoir > 0 ? fe(s(19) / sCvtsSoir) : '—',
        String(sCvtsJour), sCvtsJour > 0 ? fe(totalCA / sCvtsJour) : '—',
        String(Math.round(s(32))),
        '—', '—', '—',
        fe(CA_N1),
      ];

      // ── 23 totaux ───────────────────────────────────────────────────────────
      case 'cout_matiere': return [
        fe(s(39)), '—', fe(s(41)), '—', fe(s(43)),
        fe(s(45)), fe(s(46)), fe(s(47)), fe(s(48)),
        fe(s(49)), fe(s(50)), fe(s(51)), fe(s(52)), fe(s(53)), fe(s(54)), fe(s(55)), fe(s(56)), fe(s(57)),
        fe(s(58)), fe(s(59)), totalCA > 0 ? fp(s(58) / totalCA * 100) : '—',
        '0,00 €', '0,00 €',
      ];

      // ── 32 (cuisine/salle) ou 22 (global) totaux ─────────────────────────
      case 'frais_personnel': {
        const fpRatioAnnuel = totalCA > 0 ? fp(s(87) / totalCA * 100) : '—';
        if (isGlobal) {
          return [
            fe(s(87)), '—', fpRatioAnnuel, '—',
            fmtHeures(s(61)),
            fmtHeures(s(130)), fmtHeures(s(131)), fmtHeures(s(132)), fmtHeures(s(133)), fmtHeures(s(134)),
            fe(s(72)),
            fmtHeures(s(76)),
            fmtHeures(s(135)), fmtHeures(s(136)), fmtHeures(s(137)), fmtHeures(s(138)), fmtHeures(s(139)),
            fe(s(87)),
            fmtHeures(s(91)), '—',
            '—',
            '—',
          ];
        }
        return [
          fe(s(87)), '—', fpRatioAnnuel, '—',
          fmtHeures(s(61)),
          fmtHeures(s(62)), fmtHeures(s(63)), fmtHeures(s(64)), fmtHeures(s(65)),
          fmtHeures(s(66)), fmtHeures(s(67)), fmtHeures(s(68)), fmtHeures(s(69)),
          fmtHeures(s(70)), fmtHeures(s(71)),
          fe(s(72)),
          fmtHeures(s(76)),
          fmtHeures(s(77)), fmtHeures(s(78)), fmtHeures(s(79)), fmtHeures(s(80)),
          fmtHeures(s(81)), fmtHeures(s(82)), fmtHeures(s(83)), fmtHeures(s(84)),
          fmtHeures(s(85)), fmtHeures(s(86)),
          fe(s(87)),
          fmtHeures(s(91)), '—',
          '—',
          '—',
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
    <div style={{ height: '100vh', background: '#f1f5f9', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
        <table style={{ borderCollapse: 'separate', borderSpacing: 0, background: '#fff' }}>
          <thead>
            <tr style={{ height: 30 }}>
              <th rowSpan={3} style={{ ...thBase, background: BG_DATE, color: '#fff', minWidth: 82, left: 0, top: 0, zIndex: 60, borderRight: '3px solid #475569', borderBottom: '3px solid #475569' }}>
                DATE
              </th>
              <th colSpan={activeSection.cols.length} style={{ ...thBase, background: activeSection.accentBg, color: activeSection.accentColor, top: 0, height: 30, fontSize: 11, zIndex: 40 }}>
                {activeSection.icon} {activeSection.label.toUpperCase()}
              </th>
            </tr>
            <tr style={{ height: 30 }}>
              {groups.map((gr, gi) => {
                const offset = groups.slice(0, gi).reduce((a, x) => a + x.count, 0);
                return (
                  <th key={`g${gi}`} colSpan={gr.count} style={{ ...thBase, background: activeSection.cols[offset].bg, color: '#1e293b', top: 30, height: 30, fontSize: 9, zIndex: 40, borderBottom: '1px solid #94a3b8' }}>
                    {gr.g}
                  </th>
                );
              })}
            </tr>
            <tr style={{ height: 60 }}>
              {activeSection.cols.map((c, ci) => (
                <th key={`col${ci}`} style={{ ...thBase, background: c.bg, color: '#374151', top: 60, height: 60, minWidth: c.w || 65, fontSize: 9, zIndex: 40, borderBottom: '3px solid #374151' }}>
                  {c.l}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {MONTHS_FULL.map((_, mi) => {
              const vals = getSectionValues(activeSection.key, mi);
              const isCurrent = mi === new Date().getMonth() && YEAR === new Date().getFullYear();
              return (
                <tr key={mi} className="rr" style={{ background: isCurrent ? '#eff6ff' : (mi % 2 === 0 ? '#fff' : '#f8fafc') }}>
                  <td style={{ ...tdBase, position: 'sticky', left: 0, zIndex: 20, background: isCurrent ? '#dbeafe' : '#f1f5f9', fontWeight: isCurrent ? 800 : 600, fontSize: 11, color: '#1e293b', borderRight: '3px solid #475569', minWidth: 82, textAlign: 'left', paddingLeft: 8 }}>
                    {MONTHS_SHORT[mi]}
                  </td>
                  {vals.map((v, ci) => {
                    const colDef = activeSection.cols[ci];
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
              {getTotalValues(activeSection.key).map((v, ci) => {
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

      <footer style={{ padding: '10px 28px', borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ color: '#94a3b8', fontSize: 9, letterSpacing: '.06em', textTransform: 'uppercase' }}>IDM Restauration Groupe — Buro Monte</span>
        <span style={{ color: '#cbd5e1', fontSize: 9 }}>Récapitulatif Annuel · {YEAR} · {activeSection.label}</span>
      </footer>
    </div>
  );
}
