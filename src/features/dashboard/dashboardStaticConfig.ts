export const days: string[] = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

export const monthNames: string[] = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

export const tabs: { id: string; label: string }[] = [
  { id: 'PREVISIONS', label: 'Prévisions' },
  { id: 'REALISE', label: 'Réalisé' },
  { id: 'COUT_MATIERE', label: 'Coût matière' },
  { id: 'PERSONNEL', label: 'Personnel' },
  { id: 'FRAIS_GENERAUX', label: 'Frais généraux' },
  { id: 'RESULTATS', label: 'Résultats' },
];

export const viewModes = [
  { id: 'SAISIE', label: 'Saisie' },
  { id: 'ANALYSE', label: 'Analyse' },
  { id: 'COMPLET', label: 'Complet' },
] as const;

export type TableViewMode = (typeof viewModes)[number]['id'];

export const editableCols: number[] = [
  6, 7, 8, 9, 14, 15, 17, 18, 19, 20, 25, 27, 34, 37, 38, 45, 46, 47, 48, 49, 50, 51, 52,
  53, 54, 55, 56, 57, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 77, 78, 79, 80, 81, 82,
  83, 84, 85, 86, 110, 111, 112, 114,
];

export const contextColumns = new Set([
  0, 1, 2, 3, 4, 10, 11, 12,
  21, 22, 23, 29, 30, 31, 32, 33, 35, 36,
  49, 58, 59, 60,
  61, 72, 73, 74, 75, 76, 87, 88, 89, 90, 91, 92,
]);

export const dailyPersonnelRows = [
  ['Cadre', 77, 78],
  ['Agent de maîtrise', 79, 80],
  ['NIV I et II', 81, 82],
  ['NIV III', 83, 84],
  ['Apprenti', 85, 86],
] as const;

export const dailyPersonnelTotals = [
  { label: 'Total heures', col: 76 },
  { label: 'Masse salariale', col: 87 },
  { label: 'Masse / CA', col: 89 },
];
