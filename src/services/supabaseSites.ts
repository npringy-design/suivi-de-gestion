import { parseSiteBrand, setSitesRegistry, type SiteBrand, type SiteDefinition } from '@/lib/sites';
import { getValidAccessToken } from '@/services/supabaseAuth';

const sitesTable = 'suivi_gestion_sites';

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '')
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/rest\/v1\/?$/i, '');
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

type SiteRow = {
  site_id: string;
  label: string;
  brand: string;
  is_active: boolean;
};

const buildHeaders = async (): Promise<Record<string, string>> => {
  const accessToken = await getValidAccessToken().catch(() => null);
  return {
    apikey: supabaseAnonKey,
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
};

const fetchSiteRows = async (): Promise<SiteRow[]> => {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/${sitesTable}?select=site_id,label,brand,is_active&order=created_at.asc`,
    { headers: await buildHeaders() },
  );
  if (!response.ok) throw new Error(`Lecture des sites impossible (${response.status}).`);
  return await response.json() as SiteRow[];
};

const toDefinition = (row: SiteRow): SiteDefinition => ({
  siteId: row.site_id,
  label: row.label || row.site_id,
  // Enseigne illisible : repli explicite sur 'hippo' (la contrainte SQL l'interdit normalement).
  brand: parseSiteBrand(row.brand) ?? 'hippo',
});

// Charge les sites actifs dans le registre @/lib/sites. Table absente ou illisible : le registre
// garde les sites historiques et l'appli continue de fonctionner (retourne false).
export const loadSitesRegistry = async (): Promise<boolean> => {
  try {
    const rows = await fetchSiteRows();
    setSitesRegistry(rows.filter(row => row.is_active).map(toDefinition));
    return true;
  } catch {
    return false;
  }
};

// Tous les identifiants existants, inactifs compris : sert à garantir l'unicité d'un nouveau site.
// Échoue (sans repli) si la table est illisible : créer un site sans cette vérification est interdit.
export const fetchAllSiteIds = async (): Promise<Set<string>> =>
  new Set((await fetchSiteRows()).map(row => row.site_id));

// L'insertion passe par l'API serveur, qui vérifie le rôle super_admin (pas de policy d'écriture SQL).
export const insertSite = async (site: { siteId: string; label: string; brand: SiteBrand }): Promise<SiteDefinition> => {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new Error('Session expirée : reconnecte-toi.');

  const response = await fetch('/api/suiviAccount', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ action: 'create-site', siteId: site.siteId, label: site.label, brand: site.brand }),
  });
  const data = await response.json().catch(() => null) as { ok?: boolean; error?: string; site?: SiteRow } | null;
  if (!response.ok || data?.ok === false || !data?.site) {
    throw new Error(data?.error || `Création du site impossible (${response.status}).`);
  }
  return toDefinition(data.site);
};
