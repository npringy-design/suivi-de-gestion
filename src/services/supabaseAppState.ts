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

const rawSupabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '');
const siteId = String(import.meta.env.VITE_SITE_ID || 'hippo_thillois');
const appStateKey = String(import.meta.env.VITE_APP_STATE_KEY || `gestion:${siteId}:global_state_v1`);

export const isCloudSyncConfigured = Boolean(rawSupabaseUrl && supabaseAnonKey);

const headers = {
  apikey: supabaseAnonKey,
  Authorization: `Bearer ${supabaseAnonKey}`,
  'Content-Type': 'application/json',
};

const appStateUrl = () => `${rawSupabaseUrl}/rest/v1/app_state`;

const assertConfigured = () => {
  if (!isCloudSyncConfigured) {
    throw new Error('Synchronisation Supabase non configuree : VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquant.');
  }
};

export const fetchCloudAppState = async (): Promise<CloudAppStateRecord | null> => {
  assertConfigured();

  const url = `${appStateUrl()}?key=eq.${encodeURIComponent(appStateKey)}&select=value,updated_at&limit=1`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Lecture Supabase impossible (${response.status})`);
  }

  const rows = await response.json() as Array<CloudAppStateRecord>;
  return rows[0] || null;
};

export const saveCloudAppState = async (value: CloudAppState): Promise<CloudAppStateRecord | null> => {
  assertConfigured();

  const response = await fetch(`${appStateUrl()}?on_conflict=key&select=value,updated_at`, {
    method: 'POST',
    headers: {
      ...headers,
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify({
      key: appStateKey,
      value,
    }),
  });

  if (!response.ok) {
    throw new Error(`Sauvegarde Supabase impossible (${response.status})`);
  }

  const rows = await response.json() as Array<CloudAppStateRecord>;
  return rows[0] || null;
};
