import type { CompanySettings, CaisseSysteme, PurchaseSection } from '@/types/dataTypes';
import type { SiteBrand } from '@/lib/sites';

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
  schoolZone: 'B',
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

// Fournisseurs Au Bureau : mêmes colonnes de stockage (45–57) que Hippo, libellés propres à l'enseigne.
const AU_BUREAU_FRAIS_GENERAUX_SECTION = DEFAULT_COMPANY_SETTINGS.purchaseSections.find(s => s.id === 'frais_generaux');

export const AU_BUREAU_PURCHASE_SECTIONS: PurchaseSection[] = [
  {
    id: 'liquides',
    name: 'Achats liquides HT',
    icon: 'Wine',
    suppliers: [
      { id: 'c10',          name: 'C10',          storeColumn: 45 },
      { id: 'richard_vins', name: 'Richard Vins', storeColumn: 46 },
      { id: 'cafe_richard', name: 'Café Richard', storeColumn: 47 },
    ],
  },
  {
    id: 'solides',
    name: 'Achats solides HT',
    icon: 'Beef',
    suppliers: [
      { id: 'auribault',   name: 'Auribault',        storeColumn: 48 },
      { id: 'sysco',       name: 'Sysco',            storeColumn: 49 },
      { id: 'pomona',      name: 'Pomona F&L',       storeColumn: 50 },
      { id: 'socopa',      name: 'Socopa',           storeColumn: 51 },
      { id: 'episaveurs',  name: 'Episaveurs',       storeColumn: 52 },
      { id: 'sdv',         name: 'SDV',              storeColumn: 53 },
      { id: 'tete_chou',   name: 'Tête de chou',     storeColumn: 54 },
      { id: 'domafrais',   name: 'Domafrais',        storeColumn: 55 },
      { id: 'metro',       name: 'Metro/Dépannage',  storeColumn: 56 },
      { id: 'martel',      name: 'Martel',           storeColumn: 57 },
    ],
  },
  ...(AU_BUREAU_FRAIS_GENERAUX_SECTION ? [AU_BUREAU_FRAIS_GENERAUX_SECTION] : []),
];

// Réglages par défaut d'un site selon son enseigne. Hippo : DEFAULT_COMPANY_SETTINGS inchangé.
// À n'utiliser que pour un site sans réglages enregistrés : ne jamais écraser des réglages existants.
export const getDefaultCompanySettings = (brand: SiteBrand): CompanySettings =>
  brand === 'au_bureau'
    ? { ...DEFAULT_COMPANY_SETTINGS, companyName: 'Au Bureau', purchaseSections: AU_BUREAU_PURCHASE_SECTIONS }
    : DEFAULT_COMPANY_SETTINGS;

const SUPPLIER_SECTION_IDS: readonly string[] = ['liquides', 'solides'];

// Remplace les sections liquides/solides par celles d'Au Bureau ; Frais généraux et sections ajoutées intacts.
export const withAuBureauSuppliers = (settings: CompanySettings): CompanySettings => {
  const kept = settings.purchaseSections.filter(section => !SUPPLIER_SECTION_IDS.includes(section.id));
  const auBureau = AU_BUREAU_PURCHASE_SECTIONS.filter(section => SUPPLIER_SECTION_IDS.includes(section.id));
  return { ...settings, purchaseSections: [...auBureau, ...kept] };
};

const isDefaultSupplierSection = (current: PurchaseSection | undefined, reference: PurchaseSection | undefined): boolean =>
  current !== undefined
  && reference !== undefined
  && current.name === reference.name
  && current.suppliers.length === reference.suppliers.length
  && current.suppliers.every((supplier, i) => {
    const expected = reference.suppliers[i];
    return supplier.id === expected.id && supplier.name === expected.name && supplier.storeColumn === expected.storeColumn;
  });

// Site Au Bureau dont les sections liquides/solides sont strictement celles de Hippo (jamais
// personnalisées) : renvoie les réglages avec les fournisseurs Au Bureau, sinon null (rien à faire).
export const migrateAuBureauPurchaseSections = (settings: CompanySettings): CompanySettings | null => {
  const untouched = SUPPLIER_SECTION_IDS.every(id => isDefaultSupplierSection(
    settings.purchaseSections.find(section => section.id === id),
    DEFAULT_COMPANY_SETTINGS.purchaseSections.find(section => section.id === id),
  ));
  return untouched ? withAuBureauSuppliers(settings) : null;
};
