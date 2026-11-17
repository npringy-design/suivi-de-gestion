// Index nommés des colonnes du Suivi quotidien (cellules « ligne-colonne » de MonthData.dashboard).
// Source unique pour les calculs partagés entre pages : un index ne s'écrit plus en chiffre en dur.
// dashboardColumnIndex.test.ts vérifie chaque nom contre les en-têtes de dashboardColumns.ts.
export const COL = {
  // Budget / prévision
  BUDGET_CA_MIDI: 0,
  BUDGET_CA_SOIR: 1,
  BUDGET_CA_LIMONADE: 2,
  BUDGET_CA_JOUR: 3,
  BUDGET_CA_CUMUL: 4,
  BUDGET_CVTS_MIDI: 6,
  BUDGET_TM_MIDI: 7,
  BUDGET_CVTS_SOIR: 8,
  BUDGET_TM_SOIR: 9,
  BUDGET_CVTS_JOUR: 10,
  BUDGET_TM_JOUR: 11,
  BUDGET_CVTS_LIMONADE: 14,
  BUDGET_TM_LIMONADE: 15,
  // Réalisé CA
  REALISE_CA_VAE: 17,
  REALISE_CA_MIDI: 18,
  REALISE_CA_SOIR: 19,
  REALISE_CA_LIMONADE: 20,
  REALISE_CA_JOUR: 21,
  REALISE_ECART_BUDGET: 22,
  REALISE_CA_CUMUL: 23,
  // Réalisé couverts
  REALISE_CVTS_MIDI: 25,
  REALISE_CVTS_SOIR: 27,
  REALISE_CVTS_JOUR: 29,
  REALISE_TM_JOUR: 30,
  REALISE_CVTS_LIMONADE: 34,
  REALISE_CVTS_COMPLET_JOUR: 120,
  // Démarques
  DEMARQUE_PERSONNEL: 39,
  DEMARQUE_OPERATIONNEL: 41,
  DEMARQUE_TOTAL: 43,
  // Coût matière
  ACHAT_PREMIER: 45,
  ACHAT_DERNIER: 57,
  ACHAT_TOTAL: 58,
  // Frais de personnel
  HEURES_PROJECTION: 61,
  COUT_PROJECTION: 72,
  HEURES_REALISE: 76,
  COUT_REALISE: 87,
  // Contrats mensualisés
  CONTRAT_NOM: 106,
  CONTRAT_MONTANT: 107,
} as const;

// Heures par catégorie, schéma cuisine/salle (paires cuisine, salle) et schéma global (une colonne).
export const HOURS_PROJECTION_CUISINE_SALLE = [62, 63, 64, 65, 66, 67, 68, 69, 70, 71] as const;
export const HOURS_REALISE_CUISINE_SALLE = [77, 78, 79, 80, 81, 82, 83, 84, 85, 86] as const;
export const HOURS_PROJECTION_GLOBAL = [130, 131, 132, 133, 134] as const;
export const HOURS_REALISE_GLOBAL = [135, 136, 137, 138, 139] as const;
