// Identifiants de site pour le mode multi-site. Ajouter un site = ajouter sa valeur ici
// ET dans le CHECK constraint SQL (suivi_gestion_app_state / suivi_gestion_user_site_access).
export const SITE_IDS = ['hippo_thillois', 'hippo_cormontreuil'] as const;

export type SiteId = (typeof SITE_IDS)[number];

export const DEFAULT_SITE_ID: SiteId = 'hippo_thillois';

export const SITE_LABELS: Record<SiteId, string> = {
  hippo_thillois: 'Hippopotamus Thillois',
  hippo_cormontreuil: 'Hippo Cormontreuil',
};

const SITE_ID_SET = new Set<string>(SITE_IDS);

export const isSiteId = (value: unknown): value is SiteId =>
  typeof value === 'string' && SITE_ID_SET.has(value);

export const getSiteLabel = (siteId: SiteId): string => SITE_LABELS[siteId] || siteId;

// Dédoublonne et ne garde que les identifiants de site valides, dans l'ordre de SITE_IDS.
export const normalizeSiteIds = (value: unknown): SiteId[] => {
  const raw = Array.isArray(value) ? value : [];
  const valid = new Set(raw.filter(isSiteId));
  return SITE_IDS.filter(siteId => valid.has(siteId));
};
