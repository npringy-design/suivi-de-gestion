import { getValidAccessToken } from '@/services/supabaseAuth';

export type CloudAppState = {
  allData?: unknown;
  config2025?: unknown;
  customEvents?: unknown;
  personnelInfos?: unknown;
  edgChargesConfig?: unknown;
};

export type CloudSaveOptions = {
  // Clés "annee:mois" modifiées localement depuis la dernière sauvegarde.
  // Seuls ces snapshots mensuels sont poussés : un mois jamais resynchronisé
  // depuis le cloud ne doit pas écraser la version d'un autre poste.
  dirtyMonths?: ReadonlySet<string>;
  dirtySegments?: {
    config2025?: boolean;
    customEvents?: boolean;
    personnelInfos?: boolean;
    edgChargesConfig?: boolean;
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
    personnelInfos: boolean;
    edgChargesConfig: boolean;
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
const siteId = String(import.meta.env.VITE_SITE_ID || 'hippo_thillois').trim();
const appStateTable = String(import.meta.env.VITE_APP_STATE_TABLE || 'suivi_gestion_app_state').trim().replace(/^\/+|\/+$/g, '');
const appStateKey = String(import.meta.env.VITE_APP_STATE_KEY || `suivi-gestion:${siteId}:global_state_v1`).trim();
const segmentedPrefix = `${appStateKey}:segments_v2`;
const manifestKey = `${segmentedPrefix}:manifest`;
const isLegacyJwtKey = supabaseAnonKey.startsWith('eyJ');

const savedSegmentCache = new Map<string, string>();
let manifestCache: CloudSegmentManifest | null | undefined;

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

const cacheSegment = (key: string, value: unknown) => {
  savedSegmentCache.set(key, JSON.stringify(value ?? null));
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

const fetchStateRecord = async <T = unknown>(key: string): Promise<CloudSegmentRecord<T> | null> => {
  const url = `${appStateUrl()}?key=eq.${encodeURIComponent(key)}&select=value,updated_at&limit=1`;
  const response = await fetch(url, { headers: await buildHeaders() });

  if (!response.ok) {
    throw new Error(`Lecture Supabase impossible (${response.status})${await readError(response)}`);
  }

  const rows = await response.json() as Array<CloudSegmentRecord<T>>;
  const row = rows[0] || null;
  if (row) cacheSegment(key, row.value);
  return row;
};

const monthSegmentKey = (year: string | number, month: string | number) => {
  const normalized = normalizeMonthRef(year, month);
  return `${segmentedPrefix}:allData:${normalized.year}:${normalized.month}`;
};
const configSegmentKey = `${segmentedPrefix}:config2025`;
const customEventsSegmentKey = `${segmentedPrefix}:customEvents`;
const personnelInfosSegmentKey = `${segmentedPrefix}:personnelInfos`;
const edgChargesConfigSegmentKey = `${segmentedPrefix}:edgChargesConfig`;

const fetchSegmentManifest = async (): Promise<CloudSegmentManifest | null> => {
  if (manifestCache !== undefined) return manifestCache;

  const manifestRow = await fetchStateRecord<CloudSegmentManifest>(manifestKey);
  const manifest = manifestRow?.value;

  manifestCache = isSegmentManifest(manifest) ? manifest : null;
  return manifestCache;
};

const fetchCommonSegments = async (manifest: CloudSegmentManifest) => {
  const [configRow, customEventsRow, personnelInfosRow, edgChargesConfigRow] = await Promise.all([
    manifest.segments?.config2025 ? fetchStateRecord(configSegmentKey) : Promise.resolve(null),
    manifest.segments?.customEvents ? fetchStateRecord(customEventsSegmentKey) : Promise.resolve(null),
    manifest.segments?.personnelInfos ? fetchStateRecord(personnelInfosSegmentKey) : Promise.resolve(null),
    manifest.segments?.edgChargesConfig ? fetchStateRecord(edgChargesConfigSegmentKey) : Promise.resolve(null),
  ]);

  return {
    config2025: configRow?.value,
    customEvents: customEventsRow?.value,
    personnelInfos: personnelInfosRow?.value,
    edgChargesConfig: edgChargesConfigRow?.value,
  };
};

const fetchSegmentedCloudAppState = async (): Promise<CloudAppStateRecord | null> => {
  const manifest = await fetchSegmentManifest();

  if (!manifest) {
    return null;
  }

  const [commonSegments, monthRows] = await Promise.all([
    fetchCommonSegments(manifest),
    Promise.all((manifest.months || []).map(async item => {
      const year = String(item.year);
      const month = String(item.month);
      const row = await fetchStateRecord(monthSegmentKey(year, month));
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
  year: string | number,
  month: string | number,
): Promise<CloudAppStateRecord | null> => {
  assertConfigured();

  const manifest = await fetchSegmentManifest();

  if (!manifest) {
    const legacy = await fetchStateRecord<CloudAppState>(appStateKey);
    return legacy ? { value: legacy.value, updated_at: legacy.updated_at } : null;
  }

  const requestedMonth = normalizeMonthRef(year, month);
  const [commonSegments, monthRow] = await Promise.all([
    fetchCommonSegments(manifest),
    fetchStateRecord(monthSegmentKey(requestedMonth.year, requestedMonth.month)),
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
  year: string | number,
  month: string | number,
): Promise<CloudSegmentRecord | null> => {
  assertConfigured();
  const manifest = await fetchSegmentManifest();

  if (!manifest) {
    return null;
  }

  return fetchStateRecord(monthSegmentKey(year, month));
};

export const fetchCloudYearMonths = async (
  year: string | number,
): Promise<Array<{ month: number; value: unknown }>> => {
  assertConfigured();
  const manifest = await fetchSegmentManifest();
  if (!manifest) return [];

  const yearStr = String(year);
  const monthRefs = (manifest.months || []).filter(m => m.year === yearStr);
  if (monthRefs.length === 0) return [];

  const rows = await Promise.all(
    monthRefs.map(async ({ month }) => {
      const row = await fetchStateRecord(monthSegmentKey(yearStr, month));
      return row?.value != null ? { month: Number(month), value: row.value } : null;
    }),
  );

  return rows.filter((r) => r !== null) as Array<{ month: number; value: unknown }>;
};

export const fetchCloudAppState = async (): Promise<CloudAppStateRecord | null> => {
  assertConfigured();

  const segmented = await fetchSegmentedCloudAppState();
  if (segmented) return segmented;

  const legacy = await fetchStateRecord<CloudAppState>(appStateKey);
  return legacy ? { value: legacy.value, updated_at: legacy.updated_at } : null;
};

const saveStateRecord = async (key: string, value: unknown): Promise<CloudSegmentRecord | null> => {
  const serialized = JSON.stringify(value ?? null);
  if (savedSegmentCache.get(key) === serialized) return null;

  const response = await fetch(`${appStateUrl()}?on_conflict=key&select=value,updated_at`, {
    method: 'POST',
    headers: {
      ...(await buildHeaders()),
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify({ key, value }),
  });

  if (!response.ok) {
    throw new Error(`Sauvegarde Supabase impossible (${response.status})${await readError(response)}`);
  }

  savedSegmentCache.set(key, serialized);
  if (key === manifestKey && isSegmentManifest(value)) {
    manifestCache = value;
  }
  const rows = await response.json() as Array<CloudSegmentRecord>;
  return rows[0] || null;
};

export const saveCloudAppState = async (value: CloudAppState, options?: CloudSaveOptions): Promise<CloudAppStateRecord | null> => {
  assertConfigured();

  const allData = value.allData && typeof value.allData === 'object'
    ? value.allData as Record<string, Record<string, unknown>>
    : {};

  // Sans options : sauvegarde complète (amorçage initial du cloud).
  // Avec options : seuls les snapshots marqués modifiés sont poussés.
  const shouldSaveMonth = (year: string, month: string) =>
    !options?.dirtyMonths || options.dirtyMonths.has(`${year}:${month}`);
  const shouldSaveSegment = (segment: 'config2025' | 'customEvents' | 'personnelInfos' | 'edgChargesConfig') =>
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
  const personnelInfos = Array.isArray(value.personnelInfos) ? value.personnelInfos : [];
  const edgChargesConfig = value.edgChargesConfig && typeof value.edgChargesConfig === 'object' ? value.edgChargesConfig : {};

  const existingManifest = await fetchSegmentManifest().catch(() => null);
  const manifestMonths = mergeMonthRefs(
    existingManifest?.months || [],
    monthEntries.map(({ year, month }) => ({ year, month })),
  );

  await Promise.all(monthEntries.map(item => saveStateRecord(monthSegmentKey(item.year, item.month), item.value)));
  await Promise.all([
    shouldSaveSegment('config2025') ? saveStateRecord(configSegmentKey, config2025) : Promise.resolve(null),
    shouldSaveSegment('customEvents') ? saveStateRecord(customEventsSegmentKey, customEvents) : Promise.resolve(null),
    shouldSaveSegment('personnelInfos') ? saveStateRecord(personnelInfosSegmentKey, personnelInfos) : Promise.resolve(null),
    shouldSaveSegment('edgChargesConfig') ? saveStateRecord(edgChargesConfigSegmentKey, edgChargesConfig) : Promise.resolve(null),
  ]);

  const manifest: CloudSegmentManifest = {
    version: 2,
    mode: 'monthly_segments',
    months: manifestMonths,
    segments: {
      config2025: true,
      customEvents: true,
      personnelInfos: true,
      edgChargesConfig: true,
    },
    savedAt: existingManifest?.savedAt || new Date().toISOString(),
  };

  const manifestRow = await saveStateRecord(manifestKey, manifest);
  return {
    value,
    updated_at: manifestRow?.updated_at || null,
  };
};
