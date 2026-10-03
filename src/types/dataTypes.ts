export type DayDataTheorique = {
  total_ca: number;
  cb: number;
  amex: number;
  tr_papier: number;
  tr_carte: number;
  ancv: number;
  especes: number;
  click_collect: number;
  uber: number;
  deliveroo: number;
  sunday: number;
  commentaire: string;
};

export type DayDataNepting = {
  saisie_reel_nepting: number;
  pourboire_sunday: number;
  commentaire: string;
};

export type DayDataEspeces = {
  mis_au_coffre: number;
  pieces: number;
  commentaire: string;
};

export type DayDataConecs = {
  conecs_reel_nepting: number;
  commentaire: string;
};

export type AncvEntry = {
  valeur: number;
  nombre: string;
};

export type DayDataAncvPapiers = {
  nombre_ancv: string;
  montant_total: number;
  n_bordereaux: string;
  nbre_ancv_enveloppes: string;
  total_enveloppes_ancv: number;
  commentaire: string;
  lignes?: AncvEntry[];
};

export type TrEntry = {
  valeur: number;
  nombre: string;
};

export type DayDataSaisieTR = {
  edenred: TrEntry[];
  pluxee: TrEntry[];
  bimpli: TrEntry[];
  up: TrEntry[];
};

export type DayDataVisuTRPapiers = {
  n_bordereaux: string;
  nbre_tr_enveloppes: string;
  total_enveloppes_tr: string;
  commentaire: string;
};

export type DayDataSunday = {
  reel: number;
  commentaire: string;
};

export type DayDataUber = {
  reel: number;
  commentaire: string;
};

export type DayDataAmexAncv = {
  reel_nepting: number;
  commentaire: string;
};

export type DayDataDeliveroo = {
  reel: number;
  commentaire: string;
};

export type DayDataClickCollect = {
  reel: number;
  commentaire: string;
};

export type DayDataBilanSynthese = {
  ttc_5_5: number;
  ttc_10: number;
  ttc_20: number;
};

export type AchatEntry = {
  date: string;
  fournisseur: string;
  description: string;
  ht: number;
  tva: number;
};

export type AlimentationEntry = {
  date: string;
  montant: number;
};

export type MonthDataDepensesPetiteCaisse = {
  solde_debut_mois: number;
  achats: AchatEntry[];
  alimentations: AlimentationEntry[];
  comptabilisation: {
    c606310: string;
    c606300: string;
    c606400: string;
    c626100: string;
    c627100: string;
    c44566: string;
    c758: string;
  };
  comptage: {
    p100: number;
    p50: number;
    p20: number;
    p10: number;
    p5: number;
    p2: number;
    p1: number;
    p050: number;
    p020: number;
    p010: number;
    p005: number;
    p002: number;
    p001: number;
  };
};

export type VirementEntry = {
  fournisseur: string;
  numFacture: string;
  montantHT: number;
  montantTTC: number;
  dateEcheance: string;
  datePaiementPrevue: string;
  paiementEffectue: boolean;
};

export type MonthDataMiseEnPaiement = {
  period1: VirementEntry[];
  period2: VirementEntry[];
};

export type Config2025Data = {
  mensuel: Record<number, Record<string, string>>;
  hebdo: Record<number, Record<string, string>>;
};

export type EdgChargeMode = 'fixe' | 'pourcentage' | 'manuel';

export type EdgChargeConfig = {
  mode: EdgChargeMode;
  pourcentage?: number;
};

// Configuration globale (pas par mois/année) pilotant l'auto-remplissage du réalisé
// des lignes EDG sous Résultat Gestion — une entrée par clé de ligne EDG concernée.
export type EdgChargesConfig = Record<string, EdgChargeConfig>;

export type CustomEvent = {
  id: string;
  date: string;
  label: string;
};

export type SalarieRow = {
  nom: string;
  heures: string;
  coutGlobal: string;
  provision: string;
  coutHoraire: string;
  department?: PersonnelDepartment;
  importSourceLine?: string;
};

// Totaux « Total général » du bas de page du PDF coûts salariaux (source de vérité du brut / des charges,
// contrairement à la somme des salariés matchés qui rate les non-matchés et les écarts d'arrondi).
export type PayrollPageTotals = {
  brut: number;
  chargesPatronales: number;
  coutGlobal: number;
  heures?: number;
  // ETP exact du mois : heures de TOUTES les lignes du PDF (forfaits jour à 151,67 h, sortants inclus) ÷ 151,67.
  etp?: number;
  forfaitsJour?: number; // nombre de lignes « forfait jour » du PDF
};

export type MonthDataSalariesConfig = {
  locked: boolean;
  categories: Record<string, SalarieRow[]>;
  tauxCibles?: Record<string, number>; // taux horaire cible €/h par catégorie (cadre, maitrise, niv12, niv3, apprenti)
  totals?: PayrollPageTotals; // totaux du PDF coûts salariaux (absent sur les imports antérieurs)
};

export type PersonnelSchema = 'global' | 'cuisine_salle';

export type PersonnelCategory = 'cadre' | 'maitrise' | 'niv12' | 'niv3' | 'apprenti';
export type PersonnelDepartment = 'cuisine' | 'salle';

// Salarié d'une ligne du PDF coûts salariaux : catégorie et service proposés (dernier import ou emploi), modifiables dans l'aperçu.
export type PayrollPerson = {
  id: string; // identifiant de ligne dans l'aperçu (« ligne-N »)
  nom: string;
  category: PersonnelCategory;
  department: PersonnelDepartment;
};

// Ligne du PDF salaires dont on sait extraire heures + coût global
export type PayrollCandidateLine = {
  line: string;
  heures: number;
  coutGlobal: number;
};

// 'recognized' : nom déjà présent dans un import précédent (catégorie et service repris) ;
// 'new' : nom jamais vu, catégorie et service déduits de l'emploi (« Nouveau, à confirmer »).
export type SalaryImportRowStatus = 'recognized' | 'new' | 'manual' | 'ignored';

export type SalaryImportPreviewRow = {
  personnel: PayrollPerson;
  status: SalaryImportRowStatus;
  // Provenance de la catégorie proposée, conservée pour le tri et pour rétablir le statut après « Ignorer »
  origin: 'recognized' | 'new';
  // Statut à restaurer quand on annule un « Ignorer »
  statusBeforeIgnore?: Exclude<SalaryImportRowStatus, 'ignored'>;
  heures: number;
  coutGlobal: number;
  sourceLine: string;
  // Emploi lu dans le PDF (aide à confirmer catégorie et service d'un nouveau salarié)
  jobTitle?: string;
  // Date de sortie du PDF : salarié sortant, exclu par défaut des taux horaires (solde de tout compte)
  exitDate?: string;
};

export type SalaryImportPreview = {
  id: string;
  fileName: string;
  sourceLabel: string;
  targetLabel: string;
  targetMonth: number;
  targetYear: number; // année du mois cible (peut différer de l'année affichée)
  rows: SalaryImportPreviewRow[];
  // Totaux de bas de page du PDF (null si le format n'est pas reconnu)
  totals: PayrollPageTotals | null;
};

// ============================================================================
// Types migrés depuis src/types.ts
// ============================================================================

export interface DebouncedInputProps {
  value: string | number;
  onChange: (value: string | number) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
  placeholder?: string;
  dataRow: string;
  dataCol: string;
}

export interface RowDefinition {
  type: string;
  label: string;
  key: string;
  style: string;
}

export interface EmployeeRow {
  nom: string;
  equipe: string;
  heuresPayees: string;
  coutTotalCharge: string;
}

export interface SimulationRow {
  poste: string;
  heuresHebdo: string;
  heuresMensuels: string;
  nombre: string;
  montant: string;
}

export interface RoleData {
  h: string;
  n: string;
}

export interface DepartmentEquipe {
  cadre: RoleData;
  maitrise: RoleData;
  niv12: RoleData;
  niv3: RoleData;
  apprenti: RoleData;
}

export interface EquipeStructure {
  cuisine: DepartmentEquipe;
  salle: DepartmentEquipe;
}

export interface ConfigSalarieRow {
  [key: string]: string | number;
}

export interface RouteWrapperProps {
  Component: React.ComponentType;
  backPath: string;
}

export type NumericValue = string | number | undefined;

export type FormatterFunction = (value: unknown) => string;

export interface GroupDefinition {
  type: string;
  label: string;
  key: string;
  style: string;
  rows?: GroupDefinition[];
}

export type PurchaseSupplier = {
  id: string;
  name: string;
  // Indice de colonne dans dashboardColumns pour les fournisseurs par défaut.
  // null pour les fournisseurs ajoutés par l'utilisateur.
  storeColumn: number | null;
};

export type PurchaseSection = {
  id: string;
  name: string;
  icon?: string;
  suppliers: PurchaseSupplier[];
};

export type CaisseColumnSource = 'ca_ht' | 'couverts' | 'libre';

export type CaisseColumn = {
  id: string;
  name: string;
  type: 'saisie' | 'calcule' | 'calculAuto' | 'ecartCalc' | 'commentaire';
  source?: CaisseColumnSource; // pour calculAuto
  colA?: string; // id colonne pour ecartCalc
  colB?: string; // id colonne pour ecartCalc
};

export type CaisseSysteme = {
  id: string;
  name: string;
  description?: string;
  icon: string;
  accentColor: string;
  route?: string;
  custom?: boolean;
  inputType?: 'daily' | 'reconciliation';
  columns?: CaisseColumn[];
};

export type CompanySettings = {
  companyName: string;
  locationName: string;
  // Mois de début de l'exercice fiscal (0=Janvier, 11=Décembre).
  fiscalStart: number;
  purchaseSections: PurchaseSection[];
  personnelRateMode: 'categories' | 'average' | 'import';
  personnelRates: Record<PersonnelCategory, number>;
  splitCuisineSalle: boolean;
  // Objectif frais de personnel en %.
  objectifFraisPersonnel: number;
  // Productivité cible (CA HT / h travaillée).
  productiviteCible: number;
  // Coordonnées géographiques pour la météo.
  weatherLat?: number;
  weatherLon?: number;
  // Zone scolaire (A/B/C) du restaurant : pilote le calendrier des vacances (défaut B).
  schoolZone?: SchoolZone;
  caisseSystemes?: CaisseSysteme[];
};

export type MonthData = {
  theorique: Record<number, DayDataTheorique>;
  nepting: Record<number, DayDataNepting>;
  especes: Record<number, DayDataEspeces>;
  conecs: Record<number, DayDataConecs>;
  ancvPapiers: Record<number, DayDataAncvPapiers>;
  saisieTR: Record<number, DayDataSaisieTR>;
  visuTRPapiers: Record<number, DayDataVisuTRPapiers>;
  sunday: Record<number, DayDataSunday>;
  uber: Record<number, DayDataUber>;
  amexAncv: Record<number, DayDataAmexAncv>;
  deliveroo: Record<number, DayDataDeliveroo>;
  clickCollect: Record<number, DayDataClickCollect>;
  bilanSynthese: Record<number, DayDataBilanSynthese>;
  depensesPetiteCaisse?: MonthDataDepensesPetiteCaisse;
  dashboard?: Record<string, string>;
  caisseDynamique?: Record<string, string>;
  edgMensuel?: Record<string, string>;
  edgMensuelRealise?: Record<string, string>;
  miseEnPaiement?: MonthDataMiseEnPaiement;
  salariesConfig?: MonthDataSalariesConfig;
  personnelSchema?: PersonnelSchema;
};

// --- Analyse des écarts réalisé vs budget (features/analyse) ---

export type SchoolHolidayPeriod = {
  name: string;
  schoolYear: string;
  start: string; // YYYY-MM-DD, premier jour de vacances
  end: string; // YYYY-MM-DD, dernier jour de vacances (inclus)
  summer?: boolean;
};

export type SchoolZone = 'A' | 'B' | 'C';

export type SchoolHolidayCalendar = {
  zone: SchoolZone;
  periods: SchoolHolidayPeriod[];
};

export type AnalyseService = 'midi' | 'soir' | 'journee';

export type AnalyseVacationMode = 'all' | 'vacances' | 'hors_vacances' | 'hors_vacances_avec_ete';

export type AnalysePeriodMode = 'plage' | 'mois';

export type AnalyseThresholds = {
  ecartPct: number; // ex. -15 : alerte si l'écart % est <= à cette valeur
  ecartEuroJour: number; // ex. -100 : alerte si l'écart moyen €/jour est <= à cette valeur
};

export type AnalyseFilters = {
  periodMode: AnalysePeriodMode;
  startDate: string;
  endDate: string;
  monthKeys: string[]; // "YYYY-M" (mois 0-11)
  weekdays: number[]; // 0 = dimanche ; vide = tous
  service: AnalyseService;
  vacationMode: AnalyseVacationMode;
};

export type AnalyseServiceValues = {
  caMidi: number;
  caSoir: number;
  caLimo: number;
  cvMidi: number;
  cvSoir: number;
  cvLimo: number;
};

export type AnalyseDaySample = {
  date: string; // YYYY-MM-DD
  weekday: number;
  budget: AnalyseServiceValues;
  reel: AnalyseServiceValues & { vae: number };
};

export type AnalyseAggregate = {
  n: number;
  cvReel: number; // moyennes par jour
  cvBudget: number;
  cvEcart: number;
  cvEcartPct: number | null;
  // Ticket moyen restaurant (CA midi + soir / couverts) ; null si aucun couvert.
  tmReel: number | null;
  tmBudget: number | null;
  tmEcart: number | null;
  tmEcartPct: number | null;
  caReel: number;
  caBudget: number;
  caEcart: number;
  caEcartPct: number | null;
  impactCa: number; // écart moyen × n
};

export type AnalyseAlertLevel = 'none' | 'warning' | 'critical';

export type AnalyseDetail = {
  n: number;
  restaurantCaReel: number; // midi + soir, moyenne par jour
  restaurantCaBudget: number;
  limoCaReel: number;
  limoCaBudget: number;
  limoCvReel: number; // réalisé seul, pas de budget de couverts comparé
  vaeReel: number; // réalisé seul, pas de budget VAE
  caJourAvecVae: number; // moyenne réalisée journée + VAE, sans budget
};

export type AnalyseWeekdayRow = {
  weekday: number;
  midi: AnalyseAggregate;
  soir: AnalyseAggregate;
  journee: AnalyseAggregate;
};

// --- Planification budgétaire (features/planification) ---

export type PlanService = 'midi' | 'soir';

export type PlanVacationStatus = 'vacances' | 'hors_vacances' | 'ete';

// fiable : n >= 8 ; faible : 3 <= n < 8 (orange) ; critique : n < 3, repli ou aucune donnée (rouge).
export type PlanConfidence = 'fiable' | 'faible' | 'critique';

// groupe : moyenne du groupe exact ; repli : jour de semaine seul (statut vacances ignoré) ;
// aucune : aucun historique ; ferme : service fermé la plupart du temps dans le groupe.
export type PlanSource = 'groupe' | 'repli' | 'aucune' | 'ferme';

export type PlanEstimator = 'moyenne' | 'mediane';

export type PlanSettings = {
  targetYear: number;
  recentWeightPct: number; // poids de l'année N-1 en % (l'année N-2 pèse le complément)
  cvGrowthPct: number;
  tmGrowthPct: number;
  cvGrowthByMonth: Record<number, number>; // surcharge par mois (0-11)
  tmGrowthByMonth: Record<number, number>;
};

export type PlanServiceProposal = {
  cv: number;
  tm: number;
  ca: number;
  n: number;
  confidence: PlanConfidence;
  source: PlanSource;
  estimator: PlanEstimator;
  manual: boolean;
};

export type PlanDay = {
  date: string; // YYYY-MM-DD
  month: number;
  day: number;
  weekday: number;
  status: PlanVacationStatus;
  midi: PlanServiceProposal;
  soir: PlanServiceProposal;
};

export type PlanManualOverride = Partial<Record<PlanService, { cv: number; tm: number }>>;

export type PlanWriteMode = 'ecraser' | 'completer';

// --- Masse salariale & charges (features/masseSalariale) ---

// Ligne par salarié : structure prévue pour une saisie/import détaillé ultérieur.
export type PayrollEmployeeLine = {
  name: string;
  hours?: number;
  gross: number;
  employerCharges: number;
};

export type PayrollMonthEntry = {
  // Brut et charges saisis : facultatifs. Le coût global (brut + charges) est repris automatiquement
  // de Config Salaires ; saisir le brut suffit alors à en déduire les charges.
  gross?: number; // masse salariale brute totale
  employerCharges?: number; // charges patronales totales
  hours?: number; // heures normales + majorées
  budgetGross?: number; // budget masse salariale brute (optionnel)
  budgetEmployerCharges?: number; // budget charges patronales (optionnel)
  note?: string; // annotation libre (absence prolongée, apprentis…)
  employees?: PayrollEmployeeLine[];
};

export type PayrollAlertThresholds = {
  grossToRevenuePct: number; // seuil masse salariale brute / CA
  totalCostToRevenuePct: number; // seuil coût global / CA
};

// Nombre de forfaits jour à compter dans l'ETP estimé (mois importés sans ETP exact) à partir du mois `from` (« AAAA-MM »).
export type PayrollForfaitsJourPeriod = {
  from: string;
  count: number;
};

// Clé des mois : "AAAA-MM" (MM de 01 à 12).
export type PayrollCostsData = {
  months: Record<string, PayrollMonthEntry>;
  alertThresholds: PayrollAlertThresholds;
  forfaitsJourPeriods: PayrollForfaitsJourPeriod[];
};
