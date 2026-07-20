import type { CompanySettings, CaisseSysteme } from '@/types/dataTypes';

export const DEFAULT_CAISSE_SYSTEMS: CaisseSysteme[] = [
  { id: 'sys_saisie_theorique', name: 'Saisie Théorique', icon: 'FileText',   accentColor: '#06b6d4', route: '/saisie-theorique' },
  { id: 'sys_cb_nepting',       name: 'CB Nepting',       icon: 'CreditCard', accentColor: '#3b82f6', route: '/cb-nepting' },
  { id: 'sys_especes',          name: 'Espèces',           icon: 'Banknote',   accentColor: '#10b981', route: '/especes' },
  { id: 'sys_conecs',           name: 'Conecs',            icon: 'Wallet',     accentColor: '#8b5cf6', route: '/conecs' },
  { id: 'sys_ancv_papiers',     name: 'ANCV Papiers',      icon: 'Package',    accentColor: '#f59e0b', route: '/ancv-papiers' },
  { id: 'sys_saisie_tr',        name: 'Saisie TR',         icon: 'Smartphone', accentColor: '#06b6d4', route: '/saisie-tr' },
  { id: 'sys_sunday',           name: 'Sunday',            icon: 'Store',      accentColor: '#ef4444', route: '/sunday' },
  { id: 'sys_uber',             name: 'Uber',              icon: 'ShoppingBag',accentColor: '#10b981', route: '/uber' },
  { id: 'sys_amex_ancv',        name: 'Amex / ANCV',       icon: 'CreditCard', accentColor: '#8b5cf6', route: '/amex-ancv' },
  { id: 'sys_deliveroo',        name: 'Deliveroo',         icon: 'ShoppingBag',accentColor: '#ef4444', route: '/deliveroo' },
  { id: 'sys_click_collect',    name: 'Click & Collect',   icon: 'Store',      accentColor: '#3b82f6', route: '/click-collect' },
  { id: 'sys_remise_tr',        name: 'Remise TR',         icon: 'Wallet',     accentColor: '#f59e0b', route: '/remise-tr' },
];

export const CAISSE_ICON_OPTIONS = [
  'CreditCard', 'Smartphone', 'Wallet', 'Banknote', 'ShoppingBag', 'Store', 'Package', 'FileText',
] as const;

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  companyName: 'Hippopotamus',
  locationName: 'Thillois',
  fiscalStart: 0,
  weatherLat: 49.2567,
  weatherLon: 3.955,
  caisseSystemes: DEFAULT_CAISSE_SYSTEMS,
  purchaseSections: [
    {
      id: 'liquides',
      name: 'Achats liquides HT',
      icon: 'Wine',
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
      icon: 'Beef',
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
      icon: 'Sparkles',
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
