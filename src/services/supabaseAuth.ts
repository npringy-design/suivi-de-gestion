import {
  getBrowserStorageItem,
  removeBrowserStorageItem,
  setBrowserStorageItem,
} from '@/lib/browserStorage';
import type { SiteId } from '@/lib/sites';
import { siteIdsForProfile, type SuiviProfileLike } from '@/lib/suiviPermissions';

export type SupabaseAuthUser = {
  id: string;
  email?: string;
  aud?: string;
  role?: string;
};

export type SupabaseAuthSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  token_type: string;
  user: SupabaseAuthUser | null;
};

type SupabaseAuthResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
  user?: SupabaseAuthUser | null;
  error?: string;
  error_description?: string;
  msg?: string;
  message?: string;
};

const normalizeSupabaseUrl = (value: string) => value
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/rest\/v1$/i, '')
  .replace(/\/rest\/v1\/+$/i, '');

const rawSupabaseUrl = normalizeSupabaseUrl(String(import.meta.env.VITE_SUPABASE_URL || ''));
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
const authStorageKey = 'suivi-gestion:auth-session-v1';
const userAccessTable = 'suivi_gestion_user_access';
const userSiteAccessTable = 'suivi_gestion_user_site_access';

export const isSupabaseAuthConfigured = Boolean(rawSupabaseUrl && supabaseAnonKey);

const authUrl = () => `${rawSupabaseUrl}/auth/v1`;
const restUrl = () => `${rawSupabaseUrl}/rest/v1`;

const assertConfigured = () => {
  if (!isSupabaseAuthConfigured) {
    throw new Error('Authentification Supabase non configuree : VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquant.');
  }
};

const buildAuthHeaders = (accessToken?: string) => {
  const headers: Record<string, string> = {
    apikey: supabaseAnonKey,
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
};

const readAuthError = async (response: Response) => {
  const details = await response.text().catch(() => '');

  if (!details) {
    return '';
  }

  try {
    const parsed = JSON.parse(details) as SupabaseAuthResponse;
    return parsed.error_description || parsed.msg || parsed.message || parsed.error || details;
  } catch {
    return details;
  }
};

const nowInSeconds = () => Math.floor(Date.now() / 1000);

const mapAuthSession = (data: SupabaseAuthResponse): SupabaseAuthSession => {
  if (!data.access_token || !data.refresh_token) {
    throw new Error('Reponse Supabase Auth incomplete.');
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: typeof data.expires_at === 'number'
      ? data.expires_at
      : nowInSeconds() + Number(data.expires_in || 3600),
    token_type: data.token_type || 'bearer',
    user: data.user || null,
  };
};

const ensureSuiviGestionAccess = async (session: SupabaseAuthSession): Promise<void> => {
  if (!session.user?.id) {
    clearStoredAuthSession();
    throw new Error('Compte Supabase invalide : utilisateur introuvable.');
  }

  const url = `${restUrl()}/${userAccessTable}?user_id=eq.${encodeURIComponent(session.user.id)}&is_active=eq.true&select=user_id&limit=1`;
  const response = await fetch(url, {
    method: 'GET',
    headers: buildAuthHeaders(session.access_token),
  });

  if (!response.ok) {
    clearStoredAuthSession();
    throw new Error(`Verification des droits Suivi de gestion impossible (${response.status}) : ${await readAuthError(response)}`);
  }

  const rows = await response.json() as Array<{ user_id: string }>;

  if (!rows.length) {
    clearStoredAuthSession();
    throw new Error('Acces refuse : ce compte Supabase n\'est pas autorise sur Suivi de gestion.');
  }
};

export const getStoredAuthSession = (): SupabaseAuthSession | null => {
  const rawSession = getBrowserStorageItem(authStorageKey);

  if (!rawSession) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawSession) as SupabaseAuthSession;
    if (!parsed.access_token || !parsed.refresh_token || !parsed.expires_at) {
      removeBrowserStorageItem(authStorageKey);
      return null;
    }
    return parsed;
  } catch {
    removeBrowserStorageItem(authStorageKey);
    return null;
  }
};

export const storeAuthSession = (session: SupabaseAuthSession) => {
  setBrowserStorageItem(authStorageKey, JSON.stringify(session));
};

export const clearStoredAuthSession = () => {
  removeBrowserStorageItem(authStorageKey);
};

export const signInWithPassword = async (email: string, password: string): Promise<SupabaseAuthSession> => {
  assertConfigured();

  const response = await fetch(`${authUrl()}/token?grant_type=password`, {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(`Connexion impossible (${response.status}) : ${await readAuthError(response)}`);
  }

  const data = await response.json() as SupabaseAuthResponse;
  const session = mapAuthSession(data);
  await ensureSuiviGestionAccess(session);
  storeAuthSession(session);
  return session;
};

export const refreshAuthSession = async (refreshToken: string): Promise<SupabaseAuthSession> => {
  assertConfigured();

  const response = await fetch(`${authUrl()}/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    clearStoredAuthSession();
    throw new Error(`Session expiree (${response.status}) : ${await readAuthError(response)}`);
  }

  const data = await response.json() as SupabaseAuthResponse;
  const session = mapAuthSession(data);
  await ensureSuiviGestionAccess(session);
  storeAuthSession(session);
  return session;
};

export const getValidAccessToken = async (): Promise<string | null> => {
  const session = getStoredAuthSession();

  if (!session) {
    return null;
  }

  if (session.expires_at > nowInSeconds() + 60) {
    return session.access_token;
  }

  const refreshedSession = await refreshAuthSession(session.refresh_token).catch(() => null);
  return refreshedSession?.access_token || null;
};

export const validateAuthSession = async (): Promise<SupabaseAuthSession | null> => {
  assertConfigured();

  const session = getStoredAuthSession();

  if (!session) {
    return null;
  }

  const activeSession = session.expires_at <= nowInSeconds() + 60
    ? await refreshAuthSession(session.refresh_token)
    : session;

  const response = await fetch(`${authUrl()}/user`, {
    method: 'GET',
    headers: buildAuthHeaders(activeSession.access_token),
  });

  if (!response.ok) {
    clearStoredAuthSession();
    return null;
  }

  const user = await response.json() as SupabaseAuthUser;
  const validatedSession = { ...activeSession, user };
  await ensureSuiviGestionAccess(validatedSession);
  storeAuthSession(validatedSession);
  return validatedSession;
};

export type SuiviAccessProfile = {
  role: string;
  accessScope: string;
  siteIds: SiteId[];
};

// Appelé juste après l'obtention d'une session valide (AuthGate) : récupère le rôle Suivi
// et les sites autorisés (tous pour super_admin/global_admin, liste explicite sinon).
export const fetchSuiviAccessProfile = async (session: SupabaseAuthSession): Promise<SuiviAccessProfile> => {
  if (!session.user?.id) {
    throw new Error('Compte Supabase invalide : utilisateur introuvable.');
  }

  const [accessResponse, siteAccessResponse] = await Promise.all([
    fetch(
      `${restUrl()}/${userAccessTable}?user_id=eq.${encodeURIComponent(session.user.id)}&is_active=eq.true&select=role,access_scope&limit=1`,
      { headers: buildAuthHeaders(session.access_token) },
    ),
    fetch(
      `${restUrl()}/${userSiteAccessTable}?user_id=eq.${encodeURIComponent(session.user.id)}&is_active=eq.true&select=site_id`,
      { headers: buildAuthHeaders(session.access_token) },
    ),
  ]);

  if (!accessResponse.ok) {
    throw new Error(`Lecture du profil Suivi impossible (${accessResponse.status}) : ${await readAuthError(accessResponse)}`);
  }

  const accessRows = await accessResponse.json() as Array<{ role: string; access_scope: string | null }>;
  const access = accessRows[0];

  if (!access) {
    throw new Error('Acces refuse : ce compte Supabase n\'est pas autorise sur Suivi de gestion.');
  }

  const siteRows = siteAccessResponse.ok
    ? await siteAccessResponse.json() as Array<{ site_id: string }>
    : [];

  const profile: SuiviProfileLike = {
    role: access.role,
    access_scope: access.access_scope,
    site_ids: siteRows.map(row => row.site_id),
  };

  return {
    role: access.role,
    accessScope: access.access_scope || 'current_site',
    siteIds: siteIdsForProfile(profile),
  };
};

export const signOut = async () => {
  const session = getStoredAuthSession();

  if (session && isSupabaseAuthConfigured) {
    await fetch(`${authUrl()}/logout`, {
      method: 'POST',
      headers: buildAuthHeaders(session.access_token),
    }).catch(() => undefined);
  }

  clearStoredAuthSession();
};
