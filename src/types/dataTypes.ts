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

export type DayDataAncvPapiers = {
  nombre_ancv: string;
  montant_total: number;
  n_bordereaux: string;
  nbre_ancv_enveloppes: string;
  total_enveloppes_ancv: number;
  commentaire: string;
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

export type MonthDataSalariesConfig = {
  locked: boolean;
  categories: Record<string, SalarieRow[]>;
};

export type PersonnelSchema = 'global' | 'cuisine_salle';

export type PersonnelCategory = 'cadre' | 'maitrise' | 'niv12' | 'niv3' | 'apprenti';
export type PersonnelDepartment = 'cuisine' | 'salle';

export type PersonnelInfo = {
  id: string;
  nom: string;
  category: PersonnelCategory;
  department: PersonnelDepartment;
  aliases: string;
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
  edgMensuel?: Record<string, string>;
  edgMensuelRealise?: Record<string, string>;
  edgMensuelN1?: Record<string, string>;
  miseEnPaiement?: MonthDataMiseEnPaiement;
  salariesConfig?: MonthDataSalariesConfig;
  personnelSchema?: PersonnelSchema;
};
