import type { MonthData, PersonnelSchema } from '@/types/dataTypes';
import {
  HOURS_PROJECTION_CUISINE_SALLE,
  HOURS_PROJECTION_GLOBAL,
  HOURS_REALISE_CUISINE_SALLE,
  HOURS_REALISE_GLOBAL,
} from '@/features/dashboard/dashboardColumnIndex';

const GLOBAL_HOUR_COLS = new Set<number>([...HOURS_PROJECTION_GLOBAL, ...HOURS_REALISE_GLOBAL]);
const CUISINE_SALLE_HOUR_COLS = new Set<number>([...HOURS_PROJECTION_CUISINE_SALLE, ...HOURS_REALISE_CUISINE_SALLE]);

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
