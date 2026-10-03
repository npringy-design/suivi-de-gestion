export const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
] as const;

export const MONTH_NAMES_SHORT = [
  'janv', 'févr', 'mars', 'avr', 'mai', 'juin',
  'juil', 'août', 'sept', 'oct', 'nov', 'déc',
] as const;

// Heures mensuelles d'un temps plein (35 h) : base de l'ETP et heures comptées pour un forfait jour.
export const FULL_TIME_MONTHLY_HOURS = 151.67;

export const MONTH_NAMES_UPPER =MONTH_NAMES.map(m => m.toUpperCase()) as unknown as readonly string[];
