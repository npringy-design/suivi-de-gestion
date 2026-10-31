import type { SiteId } from '@/lib/sites';
import { getValidAccessToken } from '@/services/supabaseAuth';

export type CloudAppState = {
  allData?: unknown;
  config2025?: unknown;
  customEvents?: unknown;
  edgChargesConfig?: unknown;
  companySettings?: unknown;
  payrollCosts?: unknown;
};

export type CloudSaveOptions = {
  // Clés "annee:mois" modifiées localement depuis la dernière sauvegarde.
  // Seuls ces snapshots mensuels sont poussés : un mois jamais resynchronisé
  // depuis le cloud ne doit pas écraser la version d'un autre poste.
  dirtyMonths?: ReadonlySet<string>;
  dirtySegments?: {
    config2025?: boolean;
    customEvents?: boolean;
    edgChargesConfig?: boolean;
    companySettings?: boolean;
    payrollCosts?: boolean;
  };
};

export type CloudAppStateRecord = {
  value: CloudAppState;
  updated_at: string | null;
};

type CloudSegmentRecord<T = unknown> = {
  value: T;
  updated_at: string | null;
};

type CloudSegmentManifest = {
  version: 2;
  mode: 'monthly_segments';
  months: Array<{ year: string; month: string }>;
  segments: {
    config2025: boolean;
    customEvents: boolean;
    edgChargesConfig: boolean;
    companySettings?: boolean;
    payrollCosts?: boolean;
  };
  savedAt: string;
};

const normalizeSupabaseUrl = (value: string) => value
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/rest\/v1$/i, '')
  .replace(/\/rest\/v1\/+$/i, '');

const rawSupabaseUrl = normalizeSupabaseUrl(String(import.meta.env.VITE_SUPABASE_URL || ''));
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
const appStateTable = String(import.meta.env.VITE_APP_STATE_TABLE || 'suivi_gestion_app_state').trim().replace(/^\/+|\/+$/g, '');
// Clé historique (avant le passage au site_id en colonne dédiée) : conservée uniquement
// pour relire d'éventuelles très anciennes sauvegardes non segmentées.
const legacyAppStateKey = 'global_state_v1';
// IMPORTANT : ce préfixe doit rester 'segments_v2' tel quel (sans espace de nom supplémentaire).
// C'est le préfixe réellement utilisé par les données historiques en production (vérifié en base :
// toutes les clés existantes de hippo_thillois sont "segments_v2:...", jamais préfixées par un
// identifiant d'app/site — l'isolement entre sites est désormais assuré par la colonne site_id de
// la clé primaire (site_id, key), pas par le contenu de la clé). Un préfixe différent ("global_state_v1:
// segments_v2" notamment) rend l'historique invisible à l'appli, qui le recrée vide par-dessus.
const segmentedPrefix = 'segments_v2';
const manifestKey = `${segmentedPrefix}:manifest`;
const isLegacyJwtKey = supabaseAnonKey.startsWith('eyJ');

// Caches en mémoire, partitionnés par site pour ne jamais mélanger deux sites
// pendant une même session (bascule de site sans rechargement de page).
const savedSegmentCache = new Map<SiteId, Map<string, string>>();
const manifestCache = new Map<SiteId, CloudSegmentManifest | null>();

export const isCloudSyncConfigured = Boolean(rawSupabaseUrl && supabaseAnonKey);

const buildHeaders = async () => {
  const requestHeaders: Record<string, string> = {
    apikey: supabaseAnonKey,
    'Content-Type': 'application/json',
  };

  // Les policies RLS de suivi_gestion_app_state sont "to authenticated" :
  // le token de session utilisateur est obligatoire pour lire/écrire.
  const accessToken = await getValidAccessToken().catch(() => null);
  if (accessToken) {
    requestHeaders.Authorization = `Bearer ${accessToken}`;
  } else if (isLegacyJwtKey) {
    requestHeaders.Authorization = `Bearer ${supabaseAnonKey}`;
  }

  return requestHeaders;
};

const appStateUrl = () => `${rawSupabaseUrl}/rest/v1/${appStateTable}`;

const assertConfigured = () => {
  if (!isCloudSyncConfigured) {
    throw new Error('Sauvegarde Supabase non configuree : VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquant.');
  }
};

const readError = async (response: Response) => {
  const details = await response.text().catch(() => '');
  return details ? ` - ${details}` : '';
};

const segmentCacheFor = (siteId: SiteId): Map<string, string> => {
  let cache = savedSegmentCache.get(siteId);
  if (!cache) {
    cache = new Map<string, string>();
    savedSegmentCache.set(siteId, cache);
  }
  return cache;
};

const cacheSegment = (siteId: SiteId, key: string, value: unknown) => {
  segmentCacheFor(siteId).set(key, JSON.stringify(value ?? null));
};

const isSegmentManifest = (value: unknown): value is CloudSegmentManifest => {
  return Boolean(
    value &&
    typeof value === 'object' &&
    (value as CloudSegmentManifest).version === 2 &&
    (value as CloudSegmentManifest).mode === 'monthly_segments' &&
    Array.isArray((value as CloudSegmentManifest).months)
  );
};

const normalizeMonthRef = (year: string | number, month: string | number) => ({
  year: String(year),
  month: String(month),
});

const monthRefKey = (item: { year: string; month: string }) => `${item.year}:${item.month}`;

const mergeMonthRefs = (
  existing: Array<{ year: string; month: string }>,
  current: Array<{ year: string; month: string }>,
) => {
  const monthMap = new Map<string, { year: string; month: string }>();

  existing.forEach(item => {
    const normalized = normalizeMonthRef(item.year, item.month);
    monthMap.set(monthRefKey(normalized), normalized);
  });

  current.forEach(item => {
    const normalized = normalizeMonthRef(item.year, item.month);
    monthMap.set(monthRefKey(normalized), normalized);
  });

  return Array.from(monthMap.values()).sort((a, b) => {
    const yearDiff = Number(a.year) - Number(b.year);
    if (yearDiff !== 0) return yearDiff;
    return Number(a.month) - Number(b.month);
  });
};

const fetchStateRecord = async <T = unknown>(siteId: SiteId, key: string): Promise<CloudSegmentRecord<T> | null> => {
  const url = `${appStateUrl()}?site_id=eq.${encodeURIComponent(siteId)}&key=eq.${encodeURIComponent(key)}&select=value,updated_at&limit=1`;
  const response = await fetch(url, { headers: await buildHeaders() });

  if (!response.ok) {
    throw new Error(`Lecture Supabase impossible (${response.status})${await readError(response)}`);
  }

  const rows = await response.json() as Array<CloudSegmentRecord<T>>;
  const row = rows[0] || null;
  if (row) cacheSegment(siteId, key, row.value);
  return row;
};

const monthSegmentKey = (year: string | number, month: string | number) => {
  const normalized = normalizeMonthRef(year, month);
  return `${segmentedPrefix}:allData:${normalized.year}:${normalized.month}`;
};
const configSegmentKey = `${segmentedPrefix}:config2025`;
const customEventsSegmentKey = `${segmentedPrefix}:customEvents`;
const edgChargesConfigSegmentKey = `${segmentedPrefix}:edgChargesConfig`;
const companySettingsSegmentKey = `${segmentedPrefix}:companySettings`;
const payrollCostsSegmentKey = `${segmentedPrefix}:payrollCosts`;

const fetchSegmentManifest = async (siteId: SiteId): Promise<CloudSegmentManifest | null> => {
  if (manifestCache.has(siteId)) return manifestCache.get(siteId) ?? null;

  const manifestRow = await fetchStateRecord<CloudSegmentManifest>(siteId, manifestKey);
  const manifest = manifestRow?.value;

  const resolved = isSegmentManifest(manifest) ? manifest : null;
  manifestCache.set(siteId, resolved);
  return resolved;
};

const fetchCommonSegments = async (siteId: SiteId, manifest: CloudSegmentManifest) => {
  const [configRow, customEventsRow, edgChargesConfigRow, companySettingsRow, payrollCostsRow] = await Promise.all([
    manifest.segments?.config2025 ? fetchStateRecord(siteId, configSegmentKey) : Promise.resolve(null),
    manifest.segments?.customEvents ? fetchStateRecord(siteId, customEventsSegmentKey) : Promise.resolve(null),
    manifest.segments?.edgChargesConfig ? fetchStateRecord(siteId, edgChargesConfigSegmentKey) : Promise.resolve(null),
    manifest.segments?.companySettings ? fetchStateRecord(siteId, companySettingsSegmentKey) : Promise.resolve(null),
    manifest.segments?.payrollCosts ? fetchStateRecord(siteId, payrollCostsSegmentKey) : Promise.resolve(null),
  ]);

  return {
    config2025: configRow?.value,
    customEvents: customEventsRow?.value,
    edgChargesConfig: edgChargesConfigRow?.value,
    companySettings: companySettingsRow?.value,
    payrollCosts: payrollCostsRow?.value,
  };
};

const fetchSegmentedCloudAppState = async (siteId: SiteId): Promise<CloudAppStateRecord | null> => {
  const manifest = await fetchSegmentManifest(siteId);

  if (!manifest) {
    return null;
  }

  const [commonSegments, monthRows] = await Promise.all([
    fetchCommonSegments(siteId, manifest),
    Promise.all((manifest.months || []).map(async item => {
      const year = String(item.year);
      const month = String(item.month);
      const row = await fetchStateRecord(siteId, monthSegmentKey(year, month));
      return row ? { year, month, value: row.value } : null;
    })),
  ]);

  const allData: Record<string, Record<string, unknown>> = {};
  monthRows.filter(Boolean).forEach(item => {
    if (!item) return;
    allData[item.year] = allData[item.year] || {};
    allData[item.year][item.month] = item.value;
  });

  return {
    value: {
      allData,
      ...commonSegments,
    },
    updated_at: null,
  };
};

export const fetchCloudAppBootstrap = async (
  siteId: SiteId,
  year: string | number,
  month: string | number,
): Promise<CloudAppStateRecord | null> => {
  assertConfigured();

  const manifest = await fetchSegmentManifest(siteId);

  if (!manifest) {
    const legacy = await fetchStateRecord<CloudAppState>(siteId, legacyAppStateKey);
    return legacy ? { value: legacy.value, updated_at: legacy.updated_at } : null;
  }

  const requestedMonth = normalizeMonthRef(year, month);
  const [commonSegments, monthRow] = await Promise.all([
    fetchCommonSegments(siteId, manifest),
    fetchStateRecord(siteId, monthSegmentKey(requestedMonth.year, requestedMonth.month)),
  ]);

  const allData: Record<string, Record<string, unknown>> = {};
  if (monthRow?.value && typeof monthRow.value === 'object') {
    allData[requestedMonth.year] = {
      [requestedMonth.month]: monthRow.value,
    };
  }

  return {
    value: {
      allData,
      ...commonSegments,
    },
    updated_at: null,
  };
};

export const fetchCloudMonth = async (
  siteId: SiteId,
  year: string | number,
  month: string | number,
): Promise<CloudSegmentRecord | null> => {
  assertConfigured();
  const manifest = await fetchSegmentManifest(siteId);

  if (!manifest) {
    return null;
  }

  return fetchStateRecord(siteId, monthSegmentKey(year, month));
};

export const fetchCloudYearMonths = async (
  siteId: SiteId,
  year: string | number,
): Promise<Array<{ month: number; value: unknown }>> => {
  assertConfigured();
  const manifest = await fetchSegmentManifest(siteId);
  if (!manifest) return [];

  const yearStr = String(year);
  const monthRefs = (manifest.months || []).filter(m => m.year === yearStr);
  if (monthRefs.length === 0) return [];

  const rows = await Promise.all(
    monthRefs.map(async ({ month }) => {
      const row = await fetchStateRecord(siteId, monthSegmentKey(yearStr, month));
      return row?.value != null ? { month: Number(month), value: row.value } : null;
    }),
  );

  return rows.filter((r) => r !== null) as Array<{ month: number; value: unknown }>;
};

export const fetchCloudAppState = async (siteId: SiteId): Promise<CloudAppStateRecord | null> => {
  assertConfigured();

  const segmented = await fetchSegmentedCloudAppState(siteId);
  if (segmented) return segmented;

  const legacy = await fetchStateRecord<CloudAppState>(siteId, legacyAppStateKey);
  return legacy ? { value: legacy.value, updated_at: legacy.updated_at } : null;
};

const saveStateRecord = async (siteId: SiteId, key: string, value: unknown): Promise<CloudSegmentRecord | null> => {
  const serialized = JSON.stringify(value ?? null);
  if (segmentCacheFor(siteId).get(key) === serialized) return null;

  const response = await fetch(`${appStateUrl()}?on_conflict=site_id,key&select=value,updated_at`, {
    method: 'POST',
    headers: {
      ...(await buildHeaders()),
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify({ site_id: siteId, key, value }),
  });

  if (!response.ok) {
    throw new Error(`Sauvegarde Supabase impossible (${response.status})${await readError(response)}`);
  }

  segmentCacheFor(siteId).set(key, serialized);
  if (key === manifestKey && isSegmentManifest(value)) {
    manifestCache.set(siteId, value);
  }
  const rows = await response.json() as Array<CloudSegmentRecord>;
  return rows[0] || null;
};

export const saveCloudAppState = async (
  siteId: SiteId,
  value: CloudAppState,
  options?: CloudSaveOptions,
): Promise<CloudAppStateRecord | null> => {
  assertConfigured();

  const allData = value.allData && typeof value.allData === 'object'
    ? value.allData as Record<string, Record<string, unknown>>
    : {};

  // Sans options : sauvegarde complète (amorçage initial du cloud).
  // Avec options : seuls les snapshots marqués modifiés sont poussés.
  const shouldSaveMonth = (year: string, month: string) =>
    !options?.dirtyMonths || options.dirtyMonths.has(`${year}:${month}`);
  const shouldSaveSegment = (segment: 'config2025' | 'customEvents' | 'edgChargesConfig') =>
    !options?.dirtySegments || options.dirtySegments[segment] === true;

  const monthEntries = Object.entries(allData).flatMap(([year, months]) => {
    if (!months || typeof months !== 'object') return [];
    return Object.entries(months as Record<string, unknown>)
      .filter(([, monthValue]) => monthValue && typeof monthValue === 'object')
      .map(([month, monthValue]) => ({ year: String(year), month: String(month), value: monthValue }))
      .filter(item => shouldSaveMonth(item.year, item.month));
  });

  const config2025 = value.config2025 && typeof value.config2025 === 'object' ? value.config2025 : {};
  const customEvents = Array.isArray(value.customEvents) ? value.customEvents : [];
  const edgChargesConfig = value.edgChargesConfig && typeof value.edgChargesConfig === 'object' ? value.edgChargesConfig : {};
  const companySettings = value.companySettings && typeof value.companySettings === 'object' ? value.companySettings : null;
  const payrollCosts = value.payrollCosts && typeof value.payrollCosts === 'object' ? value.payrollCosts : null;

  const existingManifest = await fetchSegmentManifest(siteId).catch(() => null);
  const manifestMonths = mergeMonthRefs(
    existingManifest?.months || [],
    monthEntries.map(({ year, month }) => ({ year, month })),
  );

  await Promise.all(monthEntries.map(item => saveStateRecord(siteId, monthSegmentKey(item.year, item.month), item.value)));
  await Promise.all([
    shouldSaveSegment('config2025') ? saveStateRecord(siteId, configSegmentKey, config2025) : Promise.resolve(null),
    shouldSaveSegment('customEvents') ? saveStateRecord(siteId, customEventsSegmentKey, customEvents) : Promise.resolve(null),
    shouldSaveSegment('edgChargesConfig') ? saveStateRecord(siteId, edgChargesConfigSegmentKey, edgChargesConfig) : Promise.resolve(null),
    (shouldSaveSegment as (s: string) => boolean)('companySettings') && companySettings
      ? saveStateRecord(siteId, companySettingsSegmentKey, companySettings)
      : Promise.resolve(null),
    (shouldSaveSegment as (s: string) => boolean)('payrollCosts') && payrollCosts
      ? saveStateRecord(siteId, payrollCostsSegmentKey, payrollCosts)
      : Promise.resolve(null),
  ]);

  const manifest: CloudSegmentManifest = {
    version: 2,
    mode: 'monthly_segments',
    months: manifestMonths,
    segments: {
      config2025: true,
      customEvents: true,
      edgChargesConfig: true,
      companySettings: companySettings != null,
      payrollCosts: payrollCosts != null || existingManifest?.segments?.payrollCosts === true,
    },
    savedAt: existingManifest?.savedAt || new Date().toISOString(),
  };

  const manifestRow = await saveStateRecord(siteId, manifestKey, manifest);
  return {
    value,
    updated_at: manifestRow?.updated_at || null,
  };
};
