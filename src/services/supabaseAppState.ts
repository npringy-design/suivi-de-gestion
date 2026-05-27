export type CloudAppState = {
  allData?: unknown;
  config2025?: unknown;
  customEvents?: unknown;
  personnelInfos?: unknown;
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

export const isCloudSyncConfigured = Boolean(rawSupabaseUrl && supabaseAnonKey);

const buildHeaders = () => {
  const requestHeaders: Record<string, string> = {
    apikey: supabaseAnonKey,
    'Content-Type': 'application/json',
  };

  if (isLegacyJwtKey) {
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

const fetchStateRecord = async <T = unknown>(key: string): Promise<CloudSegmentRecord<T> | null> => {
  const url = `${appStateUrl()}?key=eq.${encodeURIComponent(key)}&select=value,updated_at&limit=1`;
  const response = await fetch(url, { headers: buildHeaders() });

  if (!response.ok) {
    throw new Error(`Lecture Supabase impossible (${response.status})${await readError(response)}`);
  }

  const rows = await response.json() as Array<CloudSegmentRecord<T>>;
  const row = rows[0] || null;
  if (row) cacheSegment(key, row.value);
  return row;
};

const monthSegmentKey = (year: string, month: string) => `${segmentedPrefix}:allData:${year}:${month}`;
const configSegmentKey = `${segmentedPrefix}:config2025`;
const customEventsSegmentKey = `${segmentedPrefix}:customEvents`;
const personnelInfosSegmentKey = `${segmentedPrefix}:personnelInfos`;

const fetchSegmentedCloudAppState = async (): Promise<CloudAppStateRecord | null> => {
  const manifestRow = await fetchStateRecord<CloudSegmentManifest>(manifestKey);
  const manifest = manifestRow?.value;

  if (!manifest || manifest.version !== 2 || manifest.mode !== 'monthly_segments') {
    return null;
  }

  const [configRow, customEventsRow, personnelInfosRow, monthRows] = await Promise.all([
    manifest.segments?.config2025 ? fetchStateRecord(configSegmentKey) : Promise.resolve(null),
    manifest.segments?.customEvents ? fetchStateRecord(customEventsSegmentKey) : Promise.resolve(null),
    manifest.segments?.personnelInfos ? fetchStateRecord(personnelInfosSegmentKey) : Promise.resolve(null),
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
      config2025: configRow?.value,
      customEvents: customEventsRow?.value,
      personnelInfos: personnelInfosRow?.value,
    },
    updated_at: manifestRow.updated_at,
  };
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
      ...buildHeaders(),
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify({ key, value }),
  });

  if (!response.ok) {
    throw new Error(`Sauvegarde Supabase impossible (${response.status})${await readError(response)}`);
  }

  savedSegmentCache.set(key, serialized);
  const rows = await response.json() as Array<CloudSegmentRecord>;
  return rows[0] || null;
};

export const saveCloudAppState = async (value: CloudAppState): Promise<CloudAppStateRecord | null> => {
  assertConfigured();

  const allData = value.allData && typeof value.allData === 'object'
    ? value.allData as Record<string, Record<string, unknown>>
    : {};

  const monthEntries = Object.entries(allData).flatMap(([year, months]) => {
    if (!months || typeof months !== 'object') return [];
    return Object.entries(months as Record<string, unknown>)
      .filter(([, monthValue]) => monthValue && typeof monthValue === 'object')
      .map(([month, monthValue]) => ({ year: String(year), month: String(month), value: monthValue }));
  });

  const config2025 = value.config2025 && typeof value.config2025 === 'object' ? value.config2025 : {};
  const customEvents = Array.isArray(value.customEvents) ? value.customEvents : [];
  const personnelInfos = Array.isArray(value.personnelInfos) ? value.personnelInfos : [];

  await Promise.all(monthEntries.map(item => saveStateRecord(monthSegmentKey(item.year, item.month), item.value)));
  await Promise.all([
    saveStateRecord(configSegmentKey, config2025),
    saveStateRecord(customEventsSegmentKey, customEvents),
    saveStateRecord(personnelInfosSegmentKey, personnelInfos),
  ]);

  const manifest: CloudSegmentManifest = {
    version: 2,
    mode: 'monthly_segments',
    months: monthEntries.map(({ year, month }) => ({ year, month })),
    segments: {
      config2025: true,
      customEvents: true,
      personnelInfos: true,
    },
    savedAt: new Date().toISOString(),
  };

  const manifestRow = await saveStateRecord(manifestKey, manifest);
  return {
    value,
    updated_at: manifestRow?.updated_at || null,
  };
};
