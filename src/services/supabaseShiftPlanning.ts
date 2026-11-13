import type { SiteId } from '@/lib/sites';
import { getValidAccessToken } from '@/services/supabaseAuth';

const normalizeSupabaseUrl = (value: string) => value.trim().replace(/\/+$/, '').replace(/\/rest\/v1\/*$/i, '');
const supabaseUrl = normalizeSupabaseUrl(String(import.meta.env.VITE_SUPABASE_URL || ''));
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
const shiftTable = 'suivi_gestion_shift_planning';

export const isShiftPlanningConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const buildHeaders = async (): Promise<Record<string, string>> => {
  const headers: Record<string, string> = { apikey: supabaseAnonKey, 'Content-Type': 'application/json' };
  const accessToken = await getValidAccessToken().catch(() => null);
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return headers;
};

const tableUrl = () => `${supabaseUrl}/rest/v1/${shiftTable}`;

const assertConfigured = () => {
  if (!isShiftPlanningConfigured) throw new Error('Supabase non configuré : VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquant.');
};

const readError = async (response: Response) => {
  const details = await response.text().catch(() => '');
  return details ? ` - ${details}` : '';
};

export const weekDocKey = (mondayIso: string) => `week-${mondayIso}`;

// Lit un document ; null si absent. La forme du contenu est vérifiée par l'appelant.
export async function loadShiftDoc<T>(siteId: SiteId, docKey: string): Promise<T | null> {
  assertConfigured();
  const url = `${tableUrl()}?site_id=eq.${encodeURIComponent(siteId)}&doc_key=eq.${encodeURIComponent(docKey)}&select=data&limit=1`;
  const response = await fetch(url, { headers: await buildHeaders() });
  if (!response.ok) throw new Error(`Lecture planning impossible (${response.status})${await readError(response)}`);
  const rows = await response.json() as Array<{ data: T }>;
  return rows[0]?.data ?? null;
}

export async function saveShiftDoc<T extends object>(siteId: SiteId, docKey: string, data: T): Promise<void> {
  assertConfigured();
  const response = await fetch(`${tableUrl()}?on_conflict=site_id,doc_key`, {
    method: 'POST',
    headers: { ...(await buildHeaders()), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ site_id: siteId, doc_key: docKey, data }),
  });
  if (!response.ok) throw new Error(`Sauvegarde planning impossible (${response.status})${await readError(response)}`);
}
