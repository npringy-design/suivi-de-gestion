import { supabaseAdmin } from './supabaseAdmin.js';

export type SuiviRole = 'admin' | 'user';

const readBearerToken = (req: any): string | null => {
  const header = req.headers?.authorization || req.headers?.Authorization;
  if (!header || typeof header !== 'string') return null;
  if (!header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
};

export const requireSuiviAdmin = async (req: any) => {
  const token = readBearerToken(req);
  if (!token) {
    return { ok: false as const, status: 401, error: 'Token Bearer manquant.' };
  }

  const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !userData?.user) {
    return { ok: false as const, status: 401, error: 'Session invalide ou expirée.' };
  }

  const { data: access, error: accessError } = await supabaseAdmin
    .from('suivi_gestion_user_access')
    .select('user_id, email, role, is_active')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (accessError || !access) {
    return { ok: false as const, status: 403, error: 'Accès Suivi de gestion introuvable.' };
  }

  if (!access.is_active) {
    return { ok: false as const, status: 403, error: 'Accès Suivi de gestion inactif.' };
  }

  if (access.role !== 'admin') {
    return { ok: false as const, status: 403, error: 'Droits administrateur Suivi de gestion requis.' };
  }

  return { ok: true as const, user: userData.user, access };
};
