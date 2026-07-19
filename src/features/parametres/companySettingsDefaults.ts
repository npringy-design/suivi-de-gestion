import type { CompanySettings } from '@/types/dataTypes';

export const BUILTIN_CAISSE_SYSTEMS = [
  'Saisie Théorique', 'CB Nepting', 'Espèces', 'Conecs', 'ANCV Papiers',
  'Saisie TR', 'Sunday', 'Uber', 'Amex / ANCV', 'Deliveroo', 'Click & Collect', 'Remise TR',
] as const;

export const CAISSE_ICON_OPTIONS = [
  'CreditCard', 'Smartphone', 'Wallet', 'Banknote', 'ShoppingBag', 'Store', 'Package',
] as const;

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  enseigne: 'Hippopotamus',
  localisation: 'Thillois',
  exerciceFiscalStart: 0,
  weatherLat: 49.2567,
  weatherLon: 3.955,
  caisseSystemes: [],
  purchaseSections: [
    {
      id: 'liquides',
      name: 'Achats liquides HT',
      suppliers: [
        { id: 'c10',          name: 'C10',          storeColumn: 45 },
        { id: 'richard_vins', name: 'Richard Vins', storeColumn: 46 },
        { id: 'cafe_richard', name: 'Café Richard', storeColumn: 47 },
        { id: 'storia',       name: 'Storia',       storeColumn: 48 },
      ],
    },
    {
      id: 'solides',
      name: 'Achats solides HT',
      suppliers: [
        { id: 'brake',              name: 'Brake',                  storeColumn: 49 },
        { id: 'pomona',             name: 'Pomona F&L',             storeColumn: 50 },
        { id: 'socopa',             name: 'Socopa',                 storeColumn: 51 },
        { id: 'episaveur',          name: 'Episaveur',              storeColumn: 52 },
        { id: 'mammafiore',         name: 'Mammafiore',             storeColumn: 53 },
        { id: 'compagnie_desserts', name: 'Compagnie des Desserts', storeColumn: 54 },
        { id: 'distripate',         name: 'Distripate',             storeColumn: 55 },
        { id: 'metro',              name: 'Metro/Dépannage',        storeColumn: 56 },
        { id: 'martel',             name: 'Martel',                 storeColumn: 57 },
      ],
    },
    {
      id: 'frais_generaux',
      name: 'Frais généraux',
      suppliers: [
        { id: 'entretien', name: 'Entretien et réparation', storeColumn: 97 },
        { id: 'ecolab',    name: 'Ecolab/Diversey',         storeColumn: 101 },
        { id: 'marketing', name: 'Marketing local',          storeColumn: 105 },
      ],
    },
  ],
  personnelRateMode: 'categories',
  personnelRates: {
    cadre:    38.54,
    maitrise: 20.85,
    niv12:    16.04,
    niv3:     18.35,
    apprenti:  8.39,
  },
  splitCuisineSalle: true,
  objectifFraisPersonnel: 35,
  productiviteCible: 50,
};

export const MONTH_NAMES_FULL = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export const PERSONNEL_RATE_LABELS: Record<string, string> = {
  cadre:    'Cadre',
  maitrise: 'Maîtrise',
  niv12:    'Niveau I et II',
  niv3:     'Niveau III',
  apprenti: 'Apprenti',
};
