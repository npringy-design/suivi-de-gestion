import { getValidAccessToken } from '@/services/supabaseAuth';

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

export const isCloudSyncConfigured = Boolean(rawSupabaseUrl && supabaseAnonKey);

const buildHeaders = async () => {
  const accessToken = await getValidAccessToken();

  if (!accessToken) {
    throw new Error('Session Supabase absente ou expiree. Reconnexion necessaire.');
  }

  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
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

export const fetchCloudAppState = async (): Promise<CloudAppStateRecord | null> => {
  assertConfigured();

  const url = `${appStateUrl()}?key=eq.${encodeURIComponent(appStateKey)}&select=value,updated_at&limit=1`;
  const response = await fetch(url, { headers: await buildHeaders() });

  if (!response.ok) {
    throw new Error(`Lecture Supabase impossible (${response.status})${await readError(response)}`);
  }

  const rows = await response.json() as Array<CloudAppStateRecord>;
  return rows[0] || null;
};

export const saveCloudAppState = async (value: CloudAppState): Promise<CloudAppStateRecord | null> => {
  assertConfigured();

  const response = await fetch(`${appStateUrl()}?on_conflict=key&select=value,updated_at`, {
    method: 'POST',
    headers: {
      ...await buildHeaders(),
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify({
      key: appStateKey,
      value,
    }),
  });

  if (!response.ok) {
    throw new Error(`Sauvegarde Supabase impossible (${response.status})${await readError(response)}`);
  }

  const rows = await response.json() as Array<CloudAppStateRecord>;
  return rows[0] || null;
};
