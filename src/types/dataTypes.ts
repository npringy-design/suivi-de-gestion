export type DayDataTheorique = {
  total_ca: string;
  cb: string;
  amex: string;
  tr_papier: string;
  tr_carte: string;
  ancv: string;
  especes: string;
  click_collect: string;
  uber: string;
  deliveroo: string;
  sunday: string;
  commentaire: string;
};

export type DayDataNepting = {
  saisie_reel_nepting: string;
  pourboire_sunday: string;
  commentaire: string;
};

export type DayDataEspeces = {
  mis_au_coffre: string;
  pieces: string;
  commentaire: string;
};

export type DayDataConecs = {
  conecs_reel_nepting: string;
  commentaire: string;
};

export type DayDataAncvPapiers = {
  nombre_ancv: string;
  montant_total: string;
  n_bordereaux: string;
  nbre_ancv_enveloppes: string;
  total_enveloppes_ancv: string;
  commentaire: string;
};

export type TrEntry = {
  valeur: string;
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
  reel: string;
  commentaire: string;
};

export type DayDataUber = {
  reel: string;
  commentaire: string;
};

export type DayDataAmexAncv = {
  reel_nepting: string;
  commentaire: string;
};

export type DayDataDeliveroo = {
  reel: string;
  commentaire: string;
};

export type DayDataClickCollect = {
  reel: string;
  commentaire: string;
};

export type DayDataBilanSynthese = {
  ttc_5_5: string;
  ttc_10: string;
  ttc_20: string;
};

export type AchatEntry = {
  date: string;
  fournisseur: string;
  description: string;
  ht: string;
  tva: string;
};

export type AlimentationEntry = {
  date: string;
  montant: string;
};

export type MonthDataDepensesPetiteCaisse = {
  solde_debut_mois: string;
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
    p100: string;
    p50: string;
    p20: string;
    p10: string;
    p5: string;
    p2: string;
    p1: string;
    p050: string;
    p020: string;
    p010: string;
    p005: string;
    p002: string;
    p001: string;
  };
};

export type VirementEntry = {
  fournisseur: string;
  numFacture: string;
  montantHT: string;
  montantTTC: string;
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

export type PersonnelCategory = 'cadre' | 'maitrise' | 'niv12' | 'niv3' | 'apprenti';
export type PersonnelDepartment = 'cuisine' | 'salle';

export type PersonnelInfo = {
  id: string;
  nom: string;
  category: PersonnelCategory;
  department: PersonnelDepartment;
  aliases: string;
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
  edgMensuel?: Record<string, string>;
  edgMensuelRealise?: Record<string, string>;
  edgMensuelN1?: Record<string, string>;
  miseEnPaiement?: MonthDataMiseEnPaiement;
  salariesConfig?: MonthDataSalariesConfig;
};
