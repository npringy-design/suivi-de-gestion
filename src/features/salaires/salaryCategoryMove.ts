import type { PersonnelCategory, SalarieRow } from '@/types/dataTypes';

export type SalariesByCategory = Record<PersonnelCategory, SalarieRow[]>;

export const createBlankSalarieRow = (): SalarieRow => ({ nom: '', heures: '', coutGlobal: '', provision: '', coutHoraire: '' });

// Ligne vide par défaut d'une catégorie sans salarié (nom, heures et coût global non renseignés).
export const isBlankSalarieRow = (row: SalarieRow) =>
  row.nom.trim() === '' && row.heures.trim() === '' && row.coutGlobal.trim() === '';

// Déplace la ligne complète (nom, heures, coût global, service, ligne PDF…) d'une catégorie à une autre.
// La provision, le coût horaire et les moyennes sont calculés au rendu : rien à recalculer ici.
// - la ligne arrive en dernier dans la catégorie cible ;
// - une catégorie cible qui ne contient que la ligne vide par défaut est remplacée par la ligne déplacée ;
// - une catégorie d'origine devenue vide retrouve sa ligne vide par défaut.
export const moveSalarieRow = (
  categories: SalariesByCategory,
  from: PersonnelCategory,
  index: number,
  to: PersonnelCategory,
): SalariesByCategory => {
  const row = categories[from][index];
  if (from === to || !row) return categories;

  const remaining = categories[from].filter((_, rowIndex) => rowIndex !== index);
  const target = categories[to];
  const targetOnlyBlank = target.length === 1 && isBlankSalarieRow(target[0]);

  return {
    ...categories,
    [from]: remaining.length > 0 ? remaining : [createBlankSalarieRow()],
    [to]: targetOnlyBlank ? [row] : [...target, row],
  };
};
