import type { CompanySettings, EdgChargesConfig, FixedMonthlyCost, MonthData } from '@/types/dataTypes';

// Catégories Frais Généraux du Suivi quotidien : 4 blocs × 3 groupes de colonnes (clés « box-groupe »,
// mêmes positions que fgBoxNames de Dashboard.tsx et les clés calculées fg-total-<box>-<groupe>).
export const FG_CATEGORIES: { key: string; box: number; group: number; label: string }[] = [
  { key: '0-0', box: 0, group: 0, label: 'Entretien et réparation' },
  { key: '1-0', box: 1, group: 0, label: 'Petit matériel et vaisselle' },
  { key: '2-0', box: 2, group: 0, label: 'Tenue du personnel' },
  { key: '3-0', box: 3, group: 0, label: 'Animation' },
  { key: '0-1', box: 0, group: 1, label: 'Ecolab / Diversey' },
  { key: '1-1', box: 1, group: 1, label: 'HACCP divers' },
  { key: '2-1', box: 2, group: 1, label: 'Matériel de bureau' },
  { key: '3-1', box: 3, group: 1, label: 'Frais de transport' },
  { key: '0-2', box: 0, group: 2, label: 'Marketing local' },
  { key: '1-2', box: 1, group: 2, label: 'Autres frais' },
  { key: '2-2', box: 2, group: 2, label: 'Énergie' },
  { key: '3-2', box: 3, group: 2, label: 'Divers' },
];

// Lignes EDG (publicité, FG d'exploitation, FG d'occupation) pouvant recevoir des frais généraux
// ou des frais fixes mensuels. Libellés identiques à EdgMensuel.
export const EDG_FG_TARGET_ROWS: { key: string; label: string }[] = [
  { key: 'prestation_anim', label: 'Prestation animation + décoration' },
  { key: 'pub_locale', label: 'Publicité locale + Com Agence + Annonces' },
  { key: 'comm_encaissement', label: 'Comm. / encaissement' },
  { key: 'materiel_outillage', label: 'Matériel et outillage' },
  { key: 'blanchissage', label: 'Blanchissage-Entretien matériel' },
  { key: 'vetement_pro', label: 'Vêtement professionnel' },
  { key: 'ptt', label: 'PTT+Telephone+Internet' },
  { key: 'enlev_fonds', label: 'Enlèv.fonds et trait. déchets' },
  { key: 'transport', label: 'Transport et déplacement' },
  { key: 'honoraires_comptables', label: 'Honoraires comptables + juridiques (+ CAC)' },
  { key: 'honoraires_divers', label: 'Honoraires divers' },
  { key: 'contrats_maintenance', label: 'Contrats maintenance' },
  { key: 'entretien_locaux', label: 'Entretien & répar. locaux.' },
  { key: 'nettoyage_locaux', label: 'Nettoyage locaux & ext.' },
  { key: 'surveillance', label: 'Surveillance-Sécurité-Voiturier' },
  { key: 'energie', label: 'Energie' },
  { key: 'gaz_eau', label: 'Gaz-Eau' },
  { key: 'assurances', label: 'Assurances' },
];

export const DEFAULT_EDG_FG_MAPPING: Record<string, string> = {
  '0-0': 'entretien_locaux',
  '1-0': 'materiel_outillage',
  '2-0': 'vetement_pro',
  '3-0': 'prestation_anim',
  '0-1': 'nettoyage_locaux',
  '1-1': 'honoraires_divers',
  '2-1': 'materiel_outillage',
  '3-1': 'transport',
  '0-2': 'pub_locale',
  '1-2': 'honoraires_divers',
  '2-2': 'energie',
  '3-2': 'honoraires_divers',
};

export const DEFAULT_FIXED_COST_EDG_KEY = 'contrats_maintenance';

export const resolveEdgFgMapping = (mapping: Record<string, string> | undefined): Record<string, string> =>
  ({ ...DEFAULT_EDG_FG_MAPPING, ...(mapping ?? {}) });

export type EdgAutoContext = {
  // Budget EDG du mois (edgMensuel) : source des lignes en mode « fixe » de Paramètre EDG.
  edgBudget?: Record<string, string>;
  chargesConfig?: EdgChargesConfig;
  edgFgMapping?: Record<string, string>;
  fixedMonthlyCosts?: FixedMonthlyCost[];
};

export const buildEdgAutoContext = (
  monthData: MonthData | undefined,
  chargesConfig: EdgChargesConfig,
  settings: Pick<CompanySettings, 'edgFgMapping' | 'fixedMonthlyCosts'>,
): EdgAutoContext => ({
  edgBudget: monthData?.edgMensuel,
  chargesConfig,
  edgFgMapping: settings.edgFgMapping,
  fixedMonthlyCosts: settings.fixedMonthlyCosts,
});
