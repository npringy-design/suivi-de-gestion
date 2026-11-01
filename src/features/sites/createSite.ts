import { createDefaultEdgChargesConfig } from '@/features/edg/edgChargesConfigDefaults';
import { DEFAULT_COMPANY_SETTINGS } from '@/features/parametres/companySettingsDefaults';
import { normalizePayrollCosts } from '@/features/masseSalariale/payrollDefaults';
import {
  pickUniqueSiteSlug,
  registerSite,
  SITE_SLUG_PATTERN,
  slugifySiteLabel,
  type SiteBrand,
  type SiteDefinition,
} from '@/lib/sites';
import { saveCloudAppState, type CloudAppState } from '@/services/supabaseAppState';
import { fetchAllSiteIds, insertSite } from '@/services/supabaseSites';

// État initial d'un nouveau site : valeurs par défaut et structures vides, aucune donnée d'un autre site.
export const buildSiteBootstrapState = (label: string): CloudAppState => ({
  allData: {},
  config2025: { mensuel: {}, hebdo: {} },
  customEvents: [],
  edgChargesConfig: createDefaultEdgChargesConfig(),
  companySettings: { ...DEFAULT_COMPANY_SETTINGS, companyName: label, locationName: '' },
  payrollCosts: normalizePayrollCosts({}),
});

type SaveAppState = typeof saveCloudAppState;

// Écrit l'état initial pour CE site uniquement. L'identifiant est toujours explicite :
// jamais de repli sur DEFAULT_SITE_ID, qui écraserait les données de Thillois.
export const bootstrapSiteState = async (
  siteId: string,
  label: string,
  save: SaveAppState = saveCloudAppState,
): Promise<void> => {
  if (!SITE_SLUG_PATTERN.test(siteId)) throw new Error(`Identifiant de site invalide : "${siteId}".`);
  await save(siteId, buildSiteBootstrapState(label));
};

export type CreateSiteInput = { label: string; brand: SiteBrand };

export type CreateSiteDeps = {
  fetchTakenIds: () => Promise<Set<string>>;
  insert: typeof insertSite;
  bootstrap: (siteId: string, label: string) => Promise<void>;
};

const defaultDeps: CreateSiteDeps = {
  fetchTakenIds: fetchAllSiteIds,
  insert: insertSite,
  bootstrap: bootstrapSiteState,
};

// Crée le site (identifiant unique vérifié en base), initialise ses données, l'ajoute au registre.
export const createSite = async (
  { label, brand }: CreateSiteInput,
  deps: CreateSiteDeps = defaultDeps,
): Promise<SiteDefinition> => {
  const cleanLabel = label.trim();
  if (!cleanLabel) throw new Error('Nom du site requis.');

  const baseSlug = slugifySiteLabel(cleanLabel);
  if (baseSlug.length < 3) throw new Error('Le nom du site doit contenir au moins 3 lettres ou chiffres.');

  const siteId = pickUniqueSiteSlug(baseSlug, await deps.fetchTakenIds());
  const site = await deps.insert({ siteId, label: cleanLabel, brand });
  await deps.bootstrap(site.siteId, cleanLabel);
  registerSite(site);
  return site;
};
