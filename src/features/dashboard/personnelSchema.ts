import type { MonthData, PersonnelSchema } from '@/types/dataTypes';

const GLOBAL_HOUR_COLS = new Set([130, 131, 132, 133, 134, 135, 136, 137, 138, 139]);
const CUISINE_SALLE_HOUR_COLS = new Set([
  62, 63, 64, 65, 66, 67, 68, 69, 70, 71,
  77, 78, 79, 80, 81, 82, 83, 84, 85, 86,
]);

const hasHoursIn = (cells: Record<string, string>, cols: ReadonlySet<number>): boolean =>
  Object.entries(cells).some(([key, value]) => {
    const match = /^\d+-(\d+)$/.exec(key);
    return match !== null && cols.has(Number(match[1])) && String(value ?? '').trim() !== '';
  });

// Schéma du personnel d'un mois, identique sur toutes les pages (Suivi quotidien, Accueil, EDG, Récap,
// Reporting) : 1) schéma enregistré par l'import ; 2) sinon, colonnes d'heures réellement saisies ;
// 3) sinon, réglage du site (splitCuisineSalle, défaut cuisine/salle comme l'affichage du Suivi quotidien).
export const resolvePersonnelSchema = (
  monthData: MonthData | undefined,
  splitCuisineSalle = true,
): PersonnelSchema => {
  if (monthData?.personnelSchema) return monthData.personnelSchema;
  const cells = monthData?.dashboard ?? {};
  const hasGlobal = hasHoursIn(cells, GLOBAL_HOUR_COLS);
  const hasCuisineSalle = hasHoursIn(cells, CUISINE_SALLE_HOUR_COLS);
  if (hasGlobal && !hasCuisineSalle) return 'global';
  if (hasCuisineSalle && !hasGlobal) return 'cuisine_salle';
  return splitCuisineSalle ? 'cuisine_salle' : 'global';
};
