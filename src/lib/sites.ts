// Registre des sites du mode multi-site. La liste vient de la table suivi_gestion_sites, chargée
// au démarrage par AuthGate (voir @/services/supabaseSites). Tant qu'elle n'est pas chargée (ou si la
// table n'existe pas encore), le registre contient les deux sites historiques.
export type SiteId = string;

// Enseigne de chaque site : sert uniquement à choisir la nuance de couleur (voir
// @/lib/siteBrandTheme) — pas de logique d'accès basée sur l'enseigne pour l'instant.
export type SiteBrand = 'hippo' | 'au_bureau';

export type SiteDefinition = {
  siteId: SiteId;
  label: string;
  brand: SiteBrand;
};

// Compat historique (clés locales sans suffixe de site, voir DataContext.tsx).
export const DEFAULT_SITE_ID: SiteId = 'hippo_thillois';

const BUILTIN_SITES: SiteDefinition[] = [
  { siteId: 'hippo_thillois', label: 'Hippopotamus Thillois', brand: 'hippo' },
  { siteId: 'hippo_cormontreuil', label: 'Hippo Cormontreuil', brand: 'hippo' },
];

const FALLBACK_BRAND: SiteBrand = 'hippo';

let registry = new Map<SiteId, SiteDefinition>(BUILTIN_SITES.map(site => [site.siteId, site]));

export const parseSiteBrand = (value: unknown): SiteBrand | null =>
  value === 'hippo' || value === 'au_bureau' ? value : null;

// Remplace le registre par les sites lus en base. Liste vide = on garde les sites historiques.
export const setSitesRegistry = (sites: readonly SiteDefinition[]) => {
  registry = new Map<SiteId, SiteDefinition>((sites.length > 0 ? sites : BUILTIN_SITES).map(site => [site.siteId, site]));
};

export const registerSite = (site: SiteDefinition) => {
  registry = new Map(registry).set(site.siteId, site);
};

export const getSites = (): SiteDefinition[] => [...registry.values()];

export const getSiteIds = (): SiteId[] => [...registry.keys()];

export const isSiteId = (value: unknown): value is SiteId =>
  typeof value === 'string' && registry.has(value);

export const getSiteLabel = (siteId: SiteId): string => registry.get(siteId)?.label || siteId;

// Enseigne inconnue ou absente : repli explicite sur 'hippo' (jamais d'état indéfini).
export const getSiteBrand = (siteId: SiteId): SiteBrand => registry.get(siteId)?.brand ?? FALLBACK_BRAND;

// Dédoublonne et ne garde que les identifiants de site connus, dans l'ordre du registre.
export const normalizeSiteIds = (value: unknown): SiteId[] => {
  const raw = Array.isArray(value) ? value : [];
  const valid = new Set(raw.filter(isSiteId));
  return getSiteIds().filter(siteId => valid.has(siteId));
};

// Identifiant de site : kebab-case, sans accent, 3 à 40 caractères.
export const SITE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const slugifySiteLabel = (label: string): string =>
  label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');

// Premier identifiant libre à partir du slug de base : base, base-2, base-3...
export const pickUniqueSiteSlug = (baseSlug: string, takenIds: ReadonlySet<string>): string => {
  if (!takenIds.has(baseSlug)) return baseSlug;
  let suffix = 2;
  while (takenIds.has(`${baseSlug}-${suffix}`)) suffix += 1;
  return `${baseSlug}-${suffix}`;
};
