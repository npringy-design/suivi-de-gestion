import React, { useState, useMemo } from 'react';
import { useData } from './DataContext';
import { getDashboardRowIndices } from './utils';

const CA_N1 = 1_789_254;
const CA_N1_BY_MONTH = [159802,161245,174361,186373,190990,172214,167786,156793,130384,149359,139948,0];
const MONTHS_FULL  = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const MONTHS_SHORT_LABELS = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
const CONTRATS_FG  = [
  { label:'PI Electronique',  montant:3649.32 },
  { label:'Skello',           montant:2465.75 },
  { label:'Au bureau',        montant:2268.49 },
  { label:'Kertel nomotech',  montant:1183.56 },
  { label:'Stelogy nomotech', montant:986.30  },
  { label:'Eeworx',           montant:437.92  },
];
const FG_ANIM_JAN = 150;
const NAV   = '#1e293b';
const AMBER = '#f59e0b';

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

const n  = (v?: string) => parseFloat((v||'0').replace(',','.')) || 0;
const fe = (v: number) => v === 0 ? '0,00 €' : new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(v);
const fp = (v: number) => (isFinite(v)&&!isNaN(v)) ? `${v>=0?'+':''}${v.toFixed(2)}%` : '—';

// ─── Définition des sections et leurs colonnes ────────────────────────────────

type ColDef = { g: string; l: string; bg: string; w: number };

const SECTIONS: { key: string; label: string; icon: string; accentBg: string; accentColor: string; cols: ColDef[] }[] = [
  {
    key: 'budget', label: 'Budget', icon: '🎯',
    accentBg: '#92400e', accentColor: '#fff',
    cols: [
      { g:'CA',              l:'CA HT\nMidi',         bg:BG_BUDG, w:70 },
      { g:'CA',              l:'CA HT\nSoir',         bg:BG_BUDG, w:70 },
      { g:'CA',              l:'CA HT\nLimonade',     bg:BG_BUDG, w:70 },
      { g:'CA',              l:'CA HT\nJour',         bg:BG_BUDG, w:75 },
      { g:'CA',              l:'Cumul\nDepuis le 01', bg:BG_BUDG, w:80 },
      { g:'CA',              l:'VAR\nVS N-1',         bg:BG_HATCH,w:65 },
      { g:'COUVERT\nMIDI',   l:'NB CVTS',             bg:BG_BUDG, w:65 },
      { g:'COUVERT\nMIDI',   l:'CVTS MOY HT',         bg:BG_BUDG, w:75 },
      { g:'COUVERT\nSOIR',   l:'NB CVTS',             bg:BG_BUDG, w:65 },
      { g:'COUVERT\nSOIR',   l:'CVTS MOY HT',         bg:BG_BUDG, w:75 },
      { g:'COUVERT\nJOUR',   l:'NB CVTS',             bg:BG_BUDG, w:65 },
      { g:'COUVERT\nJOUR',   l:'CVTS MOY',            bg:BG_BUDG, w:65 },
      { g:'COUVERT\nJOUR',   l:'CVTS CUMUL',          bg:BG_BUDG, w:75 },
      { g:'COUVERT\nJOUR',   l:'VAR VS N-1',          bg:BG_HATCH,w:65 },
      { g:'LIMONADE',        l:'NB CVTS\nJour',       bg:BG_BUDG, w:65 },
      { g:'LIMONADE',        l:'CVTS MOY HT',         bg:BG_BUDG, w:75 },
      { g:'LIMONADE',        l:'VAR VS N-1',          bg:BG_HATCH,w:65 },
      { g:'VAE',             l:'CA HT VAE',           bg:BG_BUDG, w:70 },
    ],
  },
  {
    key: 'realise', label: 'Réalisé', icon: '📊',
    accentBg: '#1e40af', accentColor: '#fff',
    cols: [
      { g:'CA HT',                   l:'VAR\nVS N-1',              bg:BG_HATCH, w:65 },
      { g:'CA HT',                   l:'CA HT\nVAE',               bg:BG_REAL2, w:70 },
      { g:'CA HT',                   l:'CA HT\nMidi',              bg:BG_REAL2, w:70 },
      { g:'CA HT',                   l:'Ecart au\nBudget\nMidi',   bg:'#fff',   w:65 },
      { g:'CA HT',                   l:'CA HT\nSoir',              bg:BG_REAL2, w:70 },
      { g:'CA HT',                   l:'Ecart au\nBudget\nSoir',   bg:'#fff',   w:65 },
      { g:'CA HT',                   l:'CA HT\nLimonade',          bg:BG_REAL2, w:70 },
      { g:'CA HT',                   l:'Ecart au\nBudget\nLimo',   bg:'#fff',   w:65 },
      { g:'CA HT',                   l:'CAHT\nMois',               bg:BG_REAL2, w:75 },
      { g:'CA HT',                   l:'VAR VS N-1',               bg:BG_HATCH, w:65 },
      { g:'CA HT',                   l:'Cumul\nDepuis Janv.',      bg:BG_REAL2, w:80 },
      { g:'CA HT',                   l:'Ecart\nBudget Mois',       bg:'#fff',   w:65 },
      { g:'CA HT',                   l:'Ecart\nDepuis 01/01',      bg:'#fff',   w:70 },
      { g:'CA HT',                   l:'Tendance\nAnnuel',         bg:'#fff',   w:65 },
      { g:'CA HT',                   l:'Tendance\nVAR % -1',       bg:'#fff',   w:65 },
      { g:'CA HT',                   l:'RAPPEL CA\nN-1',           bg:BG_HATCH, w:75 },
      { g:'COUVERTS\nRESTAURANT',    l:'MIDI\nNB CVTS',            bg:BG_REAL2, w:65 },
      { g:'COUVERTS\nRESTAURANT',    l:'MIDI\nCVTS MOY',           bg:BG_REAL2, w:65 },
      { g:'COUVERTS\nRESTAURANT',    l:'SOIR\nNB CVTS',            bg:BG_REAL2, w:65 },
      { g:'COUVERTS\nRESTAURANT',    l:'SOIR\nCVTS MOY',           bg:BG_REAL2, w:65 },
      { g:'COUVERTS\nRESTAURANT',    l:'JOUR\nNB CVTS',            bg:BG_REAL2, w:65 },
      { g:'COUVERTS\nRESTAURANT',    l:'JOUR\nCVTS MOY',           bg:BG_REAL2, w:65 },
      { g:'COUVERTS\nRESTAURANT',    l:'JOUR\nCVTS CUMUL',         bg:BG_REAL2, w:70 },
      { g:'COUVERTS\nRESTAURANT',    l:'Ecart\nBudget Cvts',       bg:'#fff',   w:65 },
      { g:'COUVERTS\nRESTAURANT',    l:'Ecart\nMoy CVTS',          bg:'#fff',   w:65 },
      { g:'COUVERTS\nRESTAURANT',    l:'VAR VS N-1',               bg:BG_HATCH, w:65 },
      { g:'COUVERTS\nLIMONADE',      l:'JOUR\nNB CVTS',            bg:BG_REAL2, w:65 },
      { g:'COUVERTS\nLIMONADE',      l:'JOUR\nCVTS MOY',           bg:BG_REAL2, w:65 },
      { g:'COUVERTS\nLIMONADE',      l:'JOUR\nCVTS CUMUL',         bg:BG_REAL2, w:70 },
      { g:'COUVERTS\nLIMONADE',      l:'Ecart\nBudget Cvts',       bg:'#fff',   w:65 },
      { g:'COUVERTS\nLIMONADE',      l:'Ecart\nMoy CVTS',          bg:'#fff',   w:65 },
      { g:'COUVERTS\nLIMONADE',      l:'VAR VS N-1',               bg:BG_HATCH, w:65 },
      { g:'',                        l:'RAPPEL CA\nN-1',           bg:BG_HATCH, w:80 },
    ],
  },
  {
    key: 'cout_matiere', label: 'Coût Matière', icon: '🛒',
    accentBg: '#166534', accentColor: '#fff',
    cols: [
      { g:'DEMARQUES',          l:'Personnel',            bg:BG_CM,  w:65 },
      { g:'DEMARQUES',          l:'Ratio\nPerso',         bg:BG_FP,  w:55 },
      { g:'DEMARQUES',          l:'Cuisine',              bg:BG_CM,  w:65 },
      { g:'DEMARQUES',          l:'Ratio\nCuisine',       bg:BG_FP,  w:55 },
      { g:'DEMARQUES',          l:'TOTAL',                bg:BG_CM3, w:65 },
      { g:'ACHATS\nLIQUIDE HT', l:'C10',                  bg:BG_CM,  w:65 },
      { g:'ACHATS\nLIQUIDE HT', l:'Richard\nVins',        bg:BG_CM,  w:70 },
      { g:'ACHATS\nLIQUIDE HT', l:'Café\nRichard',        bg:BG_CM,  w:70 },
      { g:'ACHATS\nLIQUIDE HT', l:'Storia',               bg:BG_CM,  w:60 },
      { g:'ACHATS\nSOLIDES HT', l:'Brake',                bg:BG_CM,  w:60 },
      { g:'ACHATS\nSOLIDES HT', l:'Pomona\nF&L',          bg:BG_CM,  w:65 },
      { g:'ACHATS\nSOLIDES HT', l:'Socopa',               bg:BG_CM,  w:60 },
      { g:'ACHATS\nSOLIDES HT', l:'Episaveur',            bg:BG_CM,  w:65 },
      { g:'ACHATS\nSOLIDES HT', l:'Mamma\nfiore',         bg:BG_CM,  w:65 },
      { g:'ACHATS\nSOLIDES HT', l:'Cie des\nDesserts',    bg:BG_CM,  w:65 },
      { g:'ACHATS\nSOLIDES HT', l:'Distripate',           bg:BG_CM,  w:65 },
      { g:'ACHATS\nSOLIDES HT', l:'Metro /\nDép.',        bg:BG_CM,  w:65 },
      { g:'ACHATS\nSOLIDES HT', l:'Martel',               bg:BG_CM,  w:60 },
      { g:'ACHAT HT',           l:'Total HT',             bg:BG_CM2, w:75 },
      { g:'ACHAT HT',           l:'Cumul HT',             bg:BG_CM2, w:75 },
      { g:'RATIO',              l:'Sans le\nStock',        bg:BG_CM,  w:65 },
      { g:'',                   l:'Marge\nRéelle',         bg:'#fff', w:70 },
      { g:'',                   l:'Variation\nStock',      bg:'#fff', w:75 },
    ],
  },
  {
    key: 'frais_personnel', label: 'Frais Personnel', icon: '👥',
    accentBg: '#7c2d12', accentColor: '#fff',
    cols: [
      { g:'',                          l:'Coût\nGlobal',              bg:'#fff', w:75 },
      { g:'Productivité\nCible 50,00', l:'Productivité\nRéelle',      bg:'#fff', w:70 },
      { g:'Budget FP\n35,00%',         l:'Frais Perso\n%',            bg:'#fff', w:70 },
      { g:'',                          l:'Ratio\nAnnuel %',           bg:'#fff', w:65 },
      { g:'PROJECTION S/C\nSKELLO',   l:'Total\nHeures',              bg:BG_FP,  w:60 },
      { g:'PROJECTION S/C\nSKELLO',   l:'Cadre\nCuisine',            bg:BG_FP,  w:65 },
      { g:'PROJECTION S/C\nSKELLO',   l:'Cadre\nSalle',              bg:BG_FP,  w:65 },
      { g:'PROJECTION S/C\nSKELLO',   l:'Maîtrise\nCuisine',         bg:BG_FP,  w:70 },
      { g:'PROJECTION S/C\nSKELLO',   l:'Maîtrise\nSalle',           bg:BG_FP,  w:70 },
      { g:'PROJECTION S/C\nSKELLO',   l:'NIV I-II\nCuisine',         bg:BG_FP,  w:70 },
      { g:'PROJECTION S/C\nSKELLO',   l:'NIV I-II\nSalle',           bg:BG_FP,  w:70 },
      { g:'PROJECTION S/C\nSKELLO',   l:'NIV III\nCuisine',          bg:BG_FP,  w:70 },
      { g:'PROJECTION S/C\nSKELLO',   l:'NIV III\nSalle',            bg:BG_FP,  w:70 },
      { g:'PROJECTION S/C\nSKELLO',   l:'Apprenti\nCuisine',         bg:BG_FP,  w:70 },
      { g:'PROJECTION S/C\nSKELLO',   l:'Apprenti\nSalle',           bg:BG_FP,  w:70 },
      { g:'PROJECTION S/C\nSKELLO',   l:'Coût\nGlobal',              bg:'#fff', w:80 },
      { g:'FRAIS PERSONNEL\nREALISE', l:'Total\nHeures',              bg:BG_FP,  w:60 },
      { g:'FRAIS PERSONNEL\nREALISE', l:'Cadre\nCuisine',             bg:BG_FP,  w:60 },
      { g:'FRAIS PERSONNEL\nREALISE', l:'Cadre\nSalle',               bg:BG_FP,  w:60 },
      { g:'FRAIS PERSONNEL\nREALISE', l:'Maîtrise\nCuisine',          bg:BG_FP,  w:65 },
      { g:'FRAIS PERSONNEL\nREALISE', l:'Maîtrise\nSalle',            bg:BG_FP,  w:65 },
      { g:'FRAIS PERSONNEL\nREALISE', l:'NIV I-II\nCuisine',          bg:BG_FP,  w:65 },
      { g:'FRAIS PERSONNEL\nREALISE', l:'NIV I-II\nSalle',            bg:BG_FP,  w:65 },
      { g:'FRAIS PERSONNEL\nREALISE', l:'NIV III\nCuisine',           bg:BG_FP,  w:65 },
      { g:'FRAIS PERSONNEL\nREALISE', l:'NIV III\nSalle',             bg:BG_FP,  w:65 },
      { g:'FRAIS PERSONNEL\nREALISE', l:'Apprenti\nCuisine',          bg:BG_FP,  w:65 },
      { g:'FRAIS PERSONNEL\nREALISE', l:'Apprenti\nSalle',            bg:BG_FP,  w:65 },
      { g:'FRAIS PERSONNEL\nREALISE', l:'FP Réel\nMois',              bg:'#fff', w:80 },
      { g:'',                          l:"Ecart Budget\nNB d'Heure",  bg:BG_FG,  w:80 },
      { g:'',                          l:'Ecart Budget\nS/C%',        bg:BG_FG,  w:70 },
      { g:'',                          l:'VAR VS N-1',                bg:BG_HATCH,w:65},
      { g:'',                          l:'Ratio\nHebdo %',            bg:'#fff', w:65 },
    ],
  },
  {
    key: 'frais_generaux', label: 'Frais Généraux', icon: '📋',
    accentBg: '#78350f', accentColor: '#fff',
    cols: [
      { g:'',                           l:'Frais Perso\nRéel Mois',       bg:BG_FG2, w:80 },
      { g:'',                           l:'Ecart au\nBudget NB Heure',    bg:BG_FG,  w:80 },
      { g:'',                           l:'Ecart au\nBudget S/C%',        bg:BG_FG,  w:70 },
      { g:'',                           l:'VAR VS N-1',                   bg:BG_HATCH,w:65},
      { g:'Entretien &\nRéparation',    l:'Montant HT', bg:BG_FG,  w:80 },
      { g:'Entretien &\nRéparation',    l:'% CA',       bg:BG_FP,  w:55 },
      { g:'Petit Matériel\n& Vaisselles',l:'Montant HT', bg:BG_FG, w:80 },
      { g:'Petit Matériel\n& Vaisselles',l:'% CA',       bg:BG_FP, w:55 },
      { g:'Tenue du\nPersonnel',        l:'Montant HT', bg:BG_FG,  w:80 },
      { g:'Tenue du\nPersonnel',        l:'% CA',       bg:BG_FP,  w:55 },
      { g:'Animation',                  l:'Montant HT', bg:BG_FG2, w:80 },
      { g:'Animation',                  l:'% CA',       bg:BG_FP,  w:55 },
      { g:'Ecolab /\nDiversey',         l:'Montant HT', bg:BG_FG,  w:80 },
      { g:'Ecolab /\nDiversey',         l:'% CA',       bg:BG_FP,  w:55 },
      { g:'HACCP\nDivers',              l:'Montant HT', bg:BG_FG,  w:75 },
      { g:'HACCP\nDivers',              l:'% CA',       bg:BG_FP,  w:55 },
      { g:'Matériel\nBureau',           l:'Montant HT', bg:BG_FG,  w:75 },
      { g:'Matériel\nBureau',           l:'% CA',       bg:BG_FP,  w:55 },
      { g:'Frais de\nTransports',       l:'Montant HT', bg:BG_FG,  w:75 },
      { g:'Frais de\nTransports',       l:'% CA',       bg:BG_FP,  w:55 },
      { g:'Marketing\nLocal',           l:'Montant HT', bg:BG_FG,  w:75 },
      { g:'Marketing\nLocal',           l:'% CA',       bg:BG_FP,  w:55 },
      { g:'Énergie',                    l:'Montant HT', bg:BG_FG,  w:80 },
      { g:'Énergie',                    l:'% CA',       bg:BG_FP,  w:55 },
      { g:'Divers',                     l:'Montant HT', bg:BG_FG,  w:80 },
      { g:'Divers',                     l:'% CA',       bg:BG_FP,  w:55 },
      { g:'TOTAL FG\n(Hors Contrat)',   l:'Montant HT', bg:BG_CM2, w:90 },
      { g:'TOTAL FG\n(Hors Contrat)',   l:'% CA',       bg:BG_CM2, w:55 },
      { g:'CONTRAT FG\nANNUEL',        l:'PI Electronique',  bg:'#f0fdf4', w:95 },
      { g:'CONTRAT FG\nANNUEL',        l:'Skello',           bg:'#f0fdf4', w:75 },
      { g:'CONTRAT FG\nANNUEL',        l:'Au bureau',        bg:'#f0fdf4', w:75 },
      { g:'CONTRAT FG\nANNUEL',        l:'Kertel nomotech',  bg:'#f0fdf4', w:90 },
      { g:'CONTRAT FG\nANNUEL',        l:'Stelogy nomotech', bg:'#f0fdf4', w:95 },
      { g:'CONTRAT FG\nANNUEL',        l:'Eeworx',           bg:'#f0fdf4', w:70 },
    ],
  },
  {
    key: 'resultats', label: 'Résultats Annuels', icon: '🏆',
    accentBg: '#1e3a5f', accentColor: '#fff',
    cols: [
      { g:'CA',      l:'CA HT Réalisé',    bg:BG_RES, w:100 },
      { g:'CA',      l:'CA Budget',        bg:BG_RES, w:90  },
      { g:'CA',      l:'VAR % N-1',        bg:BG_RES, w:80  },
      { g:'CA',      l:'Différence N-1',   bg:BG_RES, w:95  },
      { g:'CA',      l:'Diff. Budget',     bg:BG_RES, w:90  },
      { g:'TICKETS', l:'Couverts\nAnnuel', bg:BG_BUDG,w:75  },
      { g:'TICKETS', l:'Moy Cvts\n/jour',  bg:BG_BUDG,w:70  },
      { g:'TICKETS', l:'TM\nAnnuel',       bg:BG_BUDG,w:70  },
      { g:'MARGE',   l:'Stock\nInitial',   bg:BG_CM,  w:80  },
      { g:'MARGE',   l:'Stock\nFinal',     bg:BG_CM,  w:80  },
      { g:'MARGE',   l:'Variation\nStock', bg:BG_CM,  w:80  },
      { g:'MARGE',   l:'Total Achat\nHors Metro', bg:BG_CM, w:95 },
    ],
  },
];

// ─── Données par mois ─────────────────────────────────────────────────────────

interface RecapAnnuelProps { onBack: () => void; }

export default function RecapAnnuel({ onBack }: RecapAnnuelProps) {
  const { data, selectedYear } = useData();
  const YEAR = selectedYear;
  const MONTHS_SHORT = MONTHS_SHORT_LABELS.map(m => `${m}-${YEAR.toString().slice(-2)}`);
  const [activeTab, setActiveTab] = useState<string>(SECTIONS[0].key);

  const dashboardTotals = useMemo(() => MONTHS_FULL.map((_, mi) => {
    const md = data[mi]?.dashboard || {};
    const indices = getDashboardRowIndices(mi, YEAR);
    const totals: Record<number, number> = {};
    for (let i = 0; i < 110; i++) totals[i] = 0;
    Object.values(indices).forEach(rIdx => {
      for (let cIdx = 0; cIdx < 110; cIdx++) {
        const val = parseFloat(md[`${rIdx}-${cIdx}`] || '0');
        if (!isNaN(val)) totals[cIdx] += val;
      }
    });
    if (totals[6]  > 0) totals[7]  = totals[0] / totals[6];
    if (totals[8]  > 0) totals[9]  = totals[1] / totals[8];
    if (totals[10] > 0) totals[11] = totals[3] / totals[10];
    if (totals[14] > 0) totals[15] = totals[2] / totals[14];
    if (totals[33] > 0) totals[34] = totals[18] / totals[33];
    if (totals[35] > 0) totals[36] = totals[20] / totals[35];
    if (totals[37] > 0) totals[38] = (totals[18] + totals[20]) / totals[37];
    if (totals[43] > 0) totals[44] = totals[22] / totals[43];
    return totals;
  }), [data, YEAR]);

  const caByMonth = useMemo(() =>
    MONTHS_FULL.map((_, mi) => dashboardTotals[mi][24] || 0),
  [dashboardTotals]);

  const totalCA = caByMonth.reduce((s, v) => s + v, 0);

  // Génère les valeurs d'une section pour un mois donné
  const getSectionValues = (sectionKey: string, mi: number): string[] => {
    const ca   = caByMonth[mi];
    const caN1 = CA_N1_BY_MONTH[mi];
    const varP = caN1 > 0 && ca > 0 ? ((ca - caN1) / caN1) * 100 : -100;
    const diff = ca > 0 ? ca - caN1 : -caN1;
    const isJan = mi === 0;
    const dt = dashboardTotals[mi];

    switch (sectionKey) {
      case 'budget': return [
        fe(dt[0]), fe(dt[1]), fe(dt[2]), fe(dt[3]), fe(dt[4]), fp(dt[5]),
        dt[6].toString(), fe(dt[7]), dt[8].toString(), fe(dt[9]),
        dt[10].toString(), fe(dt[11]), dt[12].toString(), fp(dt[13]),
        dt[14].toString(), fe(dt[15]), fp(dt[16]),
        fe(dt[17]),
      ];
      case 'realise': return [
        fp(varP),
        fe(dt[17]), fe(dt[18]), fe(dt[19]),
        fe(dt[20]), fe(dt[21]),
        fe(dt[22]), fe(dt[23]),
        ca>0?fe(ca):'0,00 €', fp(varP),
        ca>0?fe(ca):'0,00 €',
        fe(dt[27]), fe(dt[28]),
        fe(dt[30]), fp(dt[31]),
        fe(caN1),
        dt[33].toString(), fe(dt[34]), dt[35].toString(), fe(dt[36]),
        dt[37].toString(), fe(dt[38]), dt[39].toString(), dt[40].toString(), dt[41].toString(),
        fp(dt[42]),
        dt[43].toString(), fe(dt[44]), dt[45].toString(), dt[46].toString(), dt[47].toString(),
        fp(dt[48]),
        fe(caN1),
      ];
      case 'cout_matiere': return [
        fe(dt[51]), fp(dt[52]), fe(dt[53]), fp(dt[54]), fe(dt[55]),
        fe(dt[57]), fe(dt[58]), fe(dt[59]), fe(dt[60]),
        fe(dt[61]), fe(dt[62]), fe(dt[63]), fe(dt[64]), fe(dt[65]), fe(dt[66]), fe(dt[67]), fe(dt[68]), fe(dt[69]),
        fe(dt[70]), fe(dt[71]), fp(dt[72]),
        '0,00 €', '0,00 €',
      ];
      case 'frais_personnel': return [
        fe(dt[101]), dt[102].toString(), fp(dt[103]), fp(dt[104]),
        dt[75].toString(), dt[76].toString(), dt[77].toString(), dt[78].toString(), dt[79].toString(),
        dt[80].toString(), dt[81].toString(), dt[82].toString(), dt[83].toString(), dt[84].toString(), dt[85].toString(),
        fe(dt[86]),
        dt[90].toString(), dt[91].toString(), dt[92].toString(), dt[93].toString(), dt[94].toString(),
        dt[95].toString(), dt[96].toString(), dt[97].toString(), dt[98].toString(), dt[99].toString(), dt[100].toString(),
        fe(dt[101]),
        dt[104].toString(), fp(dt[105]), fp(dt[105]), fp(dt[102]),
      ];
      case 'frais_generaux': return [
        fe(dt[99]), dt[103].toString(), fp(dt[104]), fp(dt[105]),
        ...Array(11).fill(null).flatMap((_, i) => {
          const isAnim = i === 3 && isJan;
          const val = isAnim ? FG_ANIM_JAN : 0;
          const pct = ca > 0 && val > 0 ? `${((val/ca)*100).toFixed(2)}%` : '—';
          return [isAnim ? fe(val) : '0,00 €', pct];
        }),
        isJan ? fe(FG_ANIM_JAN) : '0,00 €',
        ca>0&&isJan ? `${((FG_ANIM_JAN/ca)*100).toFixed(2)}%` : '—',
        ...CONTRATS_FG.map(c => isJan ? fe(c.montant) : ''),
      ];
      case 'resultats': return [
        ca>0?fe(ca):'0,00 €', '0,00',
        fp(varP),
        ca>0?fe(diff):fe(-caN1), '0,00',
        dt[37].toString(), fe(dt[38]), '—',
        '0,00 €','0,00 €','0,00 €','0,00 €',
      ];
      default: return [];
    }
  };

  const getTotalValues = (sectionKey: string): string[] => {
    const totalVarP = totalCA > 0 ? ((totalCA - CA_N1) / CA_N1) * 100 : -100;
    switch (sectionKey) {
      case 'budget':          return ['0,00','0,00','0,00','0,00','0,00','—','0','','0','','0','','0','—','0','','—','0,00'];
      case 'realise':         return [fp(totalVarP),'0,00','0,00','0','0,00','0','0,00','0',totalCA>0?fe(totalCA):'0,00',fp(totalVarP),totalCA>0?fe(totalCA):'0,00','0,00','0,00','0','0',fe(CA_N1),'0','','0','','0','','0','0','0','-100,00%','0','','0','0','0','-100,00%',fe(CA_N1)];
      case 'cout_matiere':    return ['0,00','—','0,00','—','0,00',...Array(13).fill('0,00'),'0,00','0,00','—','0,00','0,00'];
      case 'frais_personnel': return ['0 €','—','—','—',...Array(12).fill('0:00'),...Array(12).fill('0:00'),'0:00','0,00%','—','—'];
      case 'frais_generaux':  return ['0,00','0:00','0,00%','—',...Array(11).fill(null).flatMap(()=>['0,00 €','—']),fe(FG_ANIM_JAN),'—',...CONTRATS_FG.map(c=>fe(c.montant))];
      case 'resultats':       return [totalCA>0?fe(totalCA):'0,00 €','0,00',fp(totalVarP),fe(totalCA-CA_N1),'0,00','0','0','—','0,00 €','0,00 €','0,00 €','0,00 €'];
      default: return [];
    }
  };

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

  const activeSection = SECTIONS.find(s => s.key === activeTab) || SECTIONS[0];

  // Dériver les groupes de l'onglet actif
  const groups: { g: string; count: number }[] = [];
  activeSection.cols.forEach(c => {
    const last = groups[groups.length - 1];
    if (last && last.g === c.g) last.count++;
    else groups.push({ g: c.g, count: 1 });
  });

  return (
    <div style={{ height: '100vh', background: '#f1f5f9', fontFamily: "'DM Sans', system-ui, sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap'); *{box-sizing:border-box} button{outline:none} .rr:hover td{background:#eff6ff!important}`}</style>

      {/* HEADER */}
      <header style={{ background: NAV, height: 52, padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#94a3b8', cursor: 'pointer', background: 'none', border: 'none', padding: '6px 0', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', transition: 'color .2s', textTransform: 'uppercase', letterSpacing: '.05em' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#fff')} onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Retour Accueil
        </button>
        <div style={{ color: '#fff', fontSize: 15, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase' }}>
          📋 Récapitulatif Annuel · {YEAR}
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
            <button
              key={sec.key}
              onClick={() => setActiveTab(sec.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                background: isActive ? sec.accentBg : '#f8fafc',
                border: `1.5px solid ${isActive ? sec.accentBg : '#e2e8f0'}`,
                boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                transition: 'all .15s',
              }}
            >
              <span style={{ fontSize: 14 }}>{sec.icon}</span>
              <span style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? sec.accentColor : '#334155', letterSpacing: '.02em', lineHeight: 1.3 }}>{sec.label}</span>
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

      {/* TABLEAU */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 0, background: '#fff' }}>
          <thead>
            {/* ROW 1 — section titre */}
            <tr style={{ height: 30 }}>
              <th rowSpan={3} style={{ ...thBase, background: BG_DATE, color: '#fff', minWidth: 82, left: 0, top: 0, zIndex: 60, borderRight: '3px solid #475569', borderBottom: '3px solid #475569' }}>
                DATE
              </th>
              <th colSpan={activeSection.cols.length} style={{ ...thBase, background: activeSection.accentBg, color: activeSection.accentColor, top: 0, height: 30, fontSize: 11, zIndex: 40 }}>
                {activeSection.icon} {activeSection.label.toUpperCase()}
              </th>
            </tr>
            {/* ROW 2 — groupes */}
            <tr style={{ height: 30 }}>
              {groups.map((g, gi) => (
                <th key={`g${gi}`} colSpan={g.count} style={{ ...thBase, background: activeSection.cols[groups.slice(0,gi).reduce((a,x)=>a+x.count,0)].bg, color: '#1e293b', top: 30, height: 30, fontSize: 9, zIndex: 40, borderBottom: '1px solid #94a3b8' }}>
                  {g.g}
                </th>
              ))}
            </tr>
            {/* ROW 3 — labels colonnes */}
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
              const isCurrent = mi === new Date().getMonth();
              return (
                <tr key={mi} className="rr" style={{ background: isCurrent ? '#eff6ff' : (mi%2===0?'#fff':'#f8fafc') }}>
                  <td style={{ ...tdBase, position:'sticky', left:0, zIndex:20, background: isCurrent?'#dbeafe':'#f1f5f9', fontWeight: isCurrent?800:600, fontSize:11, color:'#1e293b', borderRight:'3px solid #475569', minWidth:82, textAlign:'left', paddingLeft:8 }}>
                    {MONTHS_SHORT[mi]}
                  </td>
                  {vals.map((v, ci) => {
                    const colDef = activeSection.cols[ci];
                    const isNeg = typeof v==='string' && v.startsWith('-') && (v.includes('%')||v.includes('€')) && v!=='—';
                    const isPos = typeof v==='string' && v.startsWith('+');
                    return (
                      <td key={ci} style={{
                        ...tdBase,
                        background: colDef?.bg || '#fff',
                        color: isNeg ? '#dc2626' : isPos ? '#16a34a' : v==='—' ? '#94a3b8' : '#334155',
                        fontWeight: isNeg||isPos ? 700 : 500,
                        minWidth: colDef?.w || 65,
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
              <td style={{ ...tdBase, position:'sticky', left:0, zIndex:20, background:BG_YELL, fontWeight:800, fontSize:12, color:'#713f12', borderRight:'3px solid #ca8a04', borderTop:'2px solid #ca8a04', textAlign:'left', paddingLeft:8 }}>
                TOTAL
              </td>
              {getTotalValues(activeSection.key).map((v, ci) => {
                const isNeg = typeof v==='string' && v.startsWith('-') && (v.includes('%')||v.includes('€')) && v!=='—';
                const isPos = typeof v==='string' && v.startsWith('+');
                return (
                  <td key={ci} style={{
                    ...tdBase, background:BG_YELL,
                    fontWeight:800, fontSize:11,
                    color: isNeg?'#dc2626':isPos?'#16a34a':'#713f12',
                    borderTop:'2px solid #ca8a04',
                  }}>
                    {v}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      <footer style={{ padding:'10px 28px', borderTop:'1px solid #e2e8f0', background:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <span style={{ color:'#94a3b8', fontSize:9, letterSpacing:'.06em', textTransform:'uppercase' }}>IDM Restauration Groupe — Buro Monte</span>
        <span style={{ color:'#cbd5e1', fontSize:9 }}>Récapitulatif Annuel · {YEAR} · {activeSection.label}</span>
      </footer>
    </div>
  );
}
