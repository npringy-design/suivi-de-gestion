const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const appUrl = process.env.APP_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') || 'https://suivi-de-gestion-8irh.vercel.app';
const table = 'suivi_gestion_user_access';
const siteAccessTable = 'suivi_gestion_user_site_access';
const sitesTable = 'suivi_gestion_sites';

type SuiviRole = 'super_admin' | 'global_admin' | 'user';
type ApiResponse = Record<string, unknown>;

// Sites historiques : repli si suivi_gestion_sites n'existe pas encore (SITES_SETUP.sql non exécuté).
const BUILTIN_SITE_IDS = ['hippo_thillois', 'hippo_cormontreuil'];
const SITE_BRANDS = ['hippo', 'au_bureau'];
const SITE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const json = (res: any, status: number, payload: ApiResponse) => res.status(status).json(payload);
const bad = (res: any, message: string) => json(res, 400, { ok: false, error: message });
const forbid = (res: any, message: string) => json(res, 403, { ok: false, error: message });
const fail = (res: any, message: string) => json(res, 500, { ok: false, error: message });

const headers = (token?: string) => ({
  apikey: serviceKey,
  Authorization: `Bearer ${token || serviceKey}`,
  'Content-Type': 'application/json',
});

const normalizeSupabaseUrl = (value: string) => value
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/rest\/v1$/i, '');

const normalizeRole = (role?: string | null): SuiviRole => {
  if (role === 'super_admin') return 'super_admin';
  if (role === 'global_admin' || role === 'admin') return 'global_admin';
  return 'user';
};

const isAdminRole = (role?: string | null) => {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === 'super_admin' || normalizedRole === 'global_admin';
};

const canCreateRole = (actorRole: SuiviRole, targetRole: SuiviRole) => {
  if (targetRole === 'super_admin') return false;
  if (actorRole === 'super_admin') return targetRole === 'global_admin' || targetRole === 'user';
  if (actorRole === 'global_admin') return targetRole === 'user';
  return false;
};

const canManageTarget = (actorRole: SuiviRole, targetRole: SuiviRole) => {
  if (targetRole === 'super_admin') return false;
  if (actorRole === 'super_admin') return targetRole === 'global_admin' || targetRole === 'user';
  if (actorRole === 'global_admin') return targetRole === 'user';
  return false;
};

const normalizeUserRow = (user: any) => ({
  ...user,
  role: normalizeRole(user?.role),
});

const readBearer = (req: any) => {
  const header = req.headers?.authorization || req.headers?.Authorization;
  if (!header || typeof header !== 'string' || !header.startsWith('Bearer ')) return '';
  return header.slice('Bearer '.length).trim();
};

const readError = async (response: Response) => {
  const text = await response.text().catch(() => '');
  if (!text) return `HTTP ${response.status}`;
  try {
    const parsed = JSON.parse(text);
    return parsed.message || parsed.msg || parsed.error_description || parsed.error || text;
  } catch {
    return text;
  }
};

const assertEnv = () => {
  if (!supabaseUrl || !serviceKey) throw new Error('Variables serveur Supabase manquantes.');
};

const baseSupabaseUrl = () => normalizeSupabaseUrl(supabaseUrl);
const restUrl = () => `${baseSupabaseUrl()}/rest/v1`;
const authUrl = () => `${baseSupabaseUrl()}/auth/v1`;

// Identifiants de site connus (table suivi_gestion_sites), dans l'ordre de création.
const fetchKnownSiteIds = async (): Promise<string[]> => {
  const response = await fetch(
    `${restUrl()}/${sitesTable}?is_active=eq.true&select=site_id&order=created_at.asc`,
    { headers: headers() },
  );
  if (!response.ok) return BUILTIN_SITE_IDS;
  const rows = await response.json() as Array<{ site_id: string }>;
  return rows.length > 0 ? rows.map((row) => row.site_id) : BUILTIN_SITE_IDS;
};

const sanitizeSiteIds = async (value: unknown): Promise<string[]> => {
  const known = await fetchKnownSiteIds();
  const raw = Array.isArray(value) ? value : [];
  const valid = new Set(raw.filter((id): id is string => typeof id === 'string'));
  return known.filter((siteId) => valid.has(siteId));
};

const requireAdmin = async (req: any) => {
  const token = readBearer(req);
  if (!token) return { ok: false as const, status: 401, error: 'Connexion admin requise.' };

  const userResponse = await fetch(`${authUrl()}/user`, { headers: headers(token) });
  if (!userResponse.ok) return { ok: false as const, status: 401, error: 'Session invalide.' };

  const user = await userResponse.json();

  const accessResponse = await fetch(
    `${restUrl()}/${table}?user_id=eq.${encodeURIComponent(user.id)}&is_active=eq.true&role=in.(admin,super_admin,global_admin)&select=user_id,role,is_active&limit=1`,
    { headers: headers(token) },
  );

  if (!accessResponse.ok) return { ok: false as const, status: 403, error: 'Verification admin impossible.' };

  const rows = await accessResponse.json();
  if (!rows.length) return { ok: false as const, status: 403, error: 'Droits admin Suivi requis.' };

  const access = normalizeUserRow(rows[0]);
  if (!isAdminRole(access.role)) return { ok: false as const, status: 403, error: 'Droits admin Suivi requis.' };

  return { ok: true as const, user, access };
};

// Récupère tous les site_id actifs, groupés par user_id (une seule requête pour toute la liste).
const fetchSiteIdsByUser = async (): Promise<Record<string, string[]>> => {
  const response = await fetch(
    `${restUrl()}/${siteAccessTable}?is_active=eq.true&select=user_id,site_id`,
    { headers: headers() },
  );
  if (!response.ok) throw new Error(await readError(response));

  const rows = await response.json();
  const byUser: Record<string, string[]> = {};
  rows.forEach((row: any) => {
    if (typeof row.site_id !== 'string') return;
    const existing = byUser[row.user_id] || [];
    existing.push(row.site_id);
    byUser[row.user_id] = existing;
  });
  return byUser;
};

// Remplace entièrement les sites attribués à un utilisateur (delete puis insert) : pas de demi-mesure,
// la liste envoyée par l'UI est la vérité pour cet utilisateur.
const replaceSiteIds = async (userId: string, siteIds: string[]): Promise<void> => {
  const deleteResponse = await fetch(
    `${restUrl()}/${siteAccessTable}?user_id=eq.${encodeURIComponent(userId)}`,
    { method: 'DELETE', headers: headers() },
  );
  if (!deleteResponse.ok) throw new Error(await readError(deleteResponse));

  if (siteIds.length === 0) return;

  const insertResponse = await fetch(
    `${restUrl()}/${siteAccessTable}`,
    {
      method: 'POST',
      headers: { ...headers(), Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify(siteIds.map((siteId) => ({ user_id: userId, site_id: siteId, is_active: true }))),
    },
  );
  if (!insertResponse.ok) throw new Error(await readError(insertResponse));
};

const listRows = async (res: any) => {
  const response = await fetch(
    `${restUrl()}/${table}?select=user_id,email,full_name,role,is_active,created_at,updated_at&order=created_at.desc`,
    { headers: headers() },
  );

  if (!response.ok) return fail(res, await readError(response));

  const users = await response.json();
  const siteIdsByUser = await fetchSiteIdsByUser();
  const normalizedUsers = users.map((user: any) => ({
    ...normalizeUserRow(user),
    site_ids: siteIdsByUser[user.user_id] || [],
  }));

  return json(res, 200, { ok: true, users: normalizedUsers, total: normalizedUsers.length });
};

const findAuthUserByEmail = async (email: string) => {
  for (let page = 1; page <= 10; page += 1) {
    const response = await fetch(`${authUrl()}/admin/users?page=${page}&per_page=1000`, { headers: headers() });
    if (!response.ok) throw new Error(await readError(response));

    const data = await response.json();
    const users = Array.isArray(data.users) ? data.users : [];
    const found = users.find((item: any) => item.email?.toLowerCase() === email);

    if (found || users.length < 1000) return found || null;
  }

  return null;
};

const createAuthUser = async (
  email: string,
  fullName: string | null,
  tempPassword: string,
  role: string,
  sendInvite: boolean,
) => {
  if (sendInvite) {
    const inviteResponse = await fetch(`${authUrl()}/invite`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        email,
        data: { full_name: fullName || undefined, suivi_role: role },
        redirect_to: appUrl,
      }),
    });

    if (inviteResponse.ok) return { user: await inviteResponse.json(), emailSent: true, warning: null };
  }

  const createResponse = await fetch(`${authUrl()}/admin/users`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || undefined,
        suivi_role: role,
        must_change_password: true,
      },
    }),
  });

  if (!createResponse.ok) throw new Error(await readError(createResponse));

  return {
    user: await createResponse.json(),
    emailSent: false,
    warning: 'Compte cree avec mot de passe temporaire.',
  };
};

// Création d'un site : réservée au super_admin. Insert simple (pas d'upsert) : un identifiant déjà pris
// est refusé (409) sans toucher au site existant.
const createSite = async (req: any, res: any, actorRole: SuiviRole) => {
  if (actorRole !== 'super_admin') return forbid(res, 'Création de site réservée au super admin.');

  const siteId = String(req.body?.siteId || '').trim();
  const label = String(req.body?.label || '').trim();
  const brand = String(req.body?.brand || '');

  if (!SITE_SLUG_PATTERN.test(siteId) || siteId.length < 3 || siteId.length > 40) return bad(res, 'Identifiant de site invalide.');
  if (!label || label.length > 80) return bad(res, 'Nom du site requis (80 caractères maximum).');
  if (!SITE_BRANDS.includes(brand)) return bad(res, 'Enseigne invalide.');

  const response = await fetch(
    `${restUrl()}/${sitesTable}?select=site_id,label,brand,is_active`,
    {
      method: 'POST',
      headers: { ...headers(), Prefer: 'return=representation' },
      body: JSON.stringify({ site_id: siteId, label, brand, is_active: true }),
    },
  );

  if (response.status === 409) return json(res, 409, { ok: false, error: 'Ce site existe déjà.' });
  if (!response.ok) return fail(res, await readError(response));

  const rows = await response.json();
  return json(res, 201, { ok: true, site: rows[0] });
};

const createRow = async (req: any, res: any, actorRole: SuiviRole) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const fullName = String(req.body?.fullName || '').trim() || null;
  const tempPassword = String(req.body?.tempPassword || '');
  const role = normalizeRole(String(req.body?.role || 'user'));
  const sendInvite = Boolean(req.body?.sendInvite);
  // Sites ignorés pour les rôles admin : super_admin/global_admin ont déjà accès à tous les sites.
  const siteIds = await sanitizeSiteIds(req.body?.siteIds);

  if (!email) return bad(res, 'Email requis.');
  if (!canCreateRole(actorRole, role)) return forbid(res, 'Droits insuffisants pour creer ce role.');
  if (!sendInvite && tempPassword.length < 8) return bad(res, 'Mot de passe temporaire minimum 8 caracteres.');
  if (!isAdminRole(role) && siteIds.length === 0) return bad(res, 'Au moins un site requis pour un compte utilisateur.');

  let authUser = await findAuthUserByEmail(email);
  let emailSent = false;
  let warning: string | null = null;

  if (!authUser) {
    const created = await createAuthUser(email, fullName, tempPassword, role, sendInvite);
    authUser = created.user;
    emailSent = created.emailSent;
    warning = created.warning;
  }

  const row = {
    user_id: authUser.id,
    email,
    full_name: fullName,
    role,
    is_active: true,
  };

  const accessResponse = await fetch(
    `${restUrl()}/${table}?on_conflict=user_id&select=user_id,email,full_name,role,is_active,created_at,updated_at`,
    {
      method: 'POST',
      headers: { ...headers(), Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(row),
    },
  );

  if (!accessResponse.ok) return fail(res, await readError(accessResponse));

  const rows = await accessResponse.json();
  const effectiveSiteIds = isAdminRole(role) ? [] : siteIds;
  await replaceSiteIds(authUser.id, effectiveSiteIds);

  return json(res, 201, {
    ok: true,
    user: { ...normalizeUserRow(rows[0]), site_ids: effectiveSiteIds },
    email_sent: emailSent,
    email_warning: warning,
  });
};

const patchRow = async (req: any, res: any, actorRole: SuiviRole) => {
  const userId = String(req.body?.userId || '');
  if (!userId) return bad(res, 'Utilisateur requis.');

  const targetResponse = await fetch(
    `${restUrl()}/${table}?user_id=eq.${encodeURIComponent(userId)}&select=user_id,role,is_active&limit=1`,
    { headers: headers() },
  );

  if (!targetResponse.ok) return fail(res, await readError(targetResponse));

  const targetRows = await targetResponse.json();
  if (!targetRows.length) return bad(res, 'Utilisateur introuvable.');

  const target = normalizeUserRow(targetRows[0]);
  const targetRole = normalizeRole(target.role);

  if (!canManageTarget(actorRole, targetRole)) {
    return forbid(res, 'Droits insuffisants pour modifier cet utilisateur.');
  }

  if (req.body?.action === 'toggle-active') {
    const response = await fetch(
      `${restUrl()}/${table}?user_id=eq.${encodeURIComponent(userId)}&select=user_id,email,full_name,role,is_active,created_at,updated_at`,
      {
        method: 'PATCH',
        headers: { ...headers(), Prefer: 'return=representation' },
        body: JSON.stringify({ is_active: !target.is_active }),
      },
    );

    if (!response.ok) return fail(res, await readError(response));

    const rows = await response.json();
    return json(res, 200, { ok: true, user: normalizeUserRow(rows[0]) });
  }

  if (req.body?.action === 'set-sites') {
    if (isAdminRole(targetRole)) {
      return bad(res, 'Les comptes super admin / global admin ont déjà accès à tous les sites.');
    }
    const siteIds = await sanitizeSiteIds(req.body?.siteIds);
    if (siteIds.length === 0) return bad(res, 'Au moins un site requis pour un compte utilisateur.');

    await replaceSiteIds(userId, siteIds);
    return json(res, 200, { ok: true, siteIds });
  }

  const role = normalizeRole(String(req.body?.role || 'user'));

  if (!canCreateRole(actorRole, role)) {
    return forbid(res, 'Droits insuffisants pour attribuer ce role.');
  }

  const patch: Record<string, unknown> = { role };

  if (typeof req.body?.fullName === 'string') {
    patch.full_name = req.body.fullName.trim() || null;
  }

  const response = await fetch(
    `${restUrl()}/${table}?user_id=eq.${encodeURIComponent(userId)}&select=user_id,email,full_name,role,is_active,created_at,updated_at`,
    {
      method: 'PATCH',
      headers: { ...headers(), Prefer: 'return=representation' },
      body: JSON.stringify(patch),
    },
  );

  if (!response.ok) return fail(res, await readError(response));

  const rows = await response.json();
  return json(res, 200, { ok: true, user: normalizeUserRow(rows[0]) });
};

export default async function handler(req: any, res: any) {
  try {
    assertEnv();

    const admin = await requireAdmin(req);
    if (!admin.ok) {
      return admin.status === 401
        ? json(res, 401, { ok: false, error: admin.error })
        : forbid(res, admin.error);
    }

    const actorRole = normalizeRole(admin.access.role);

    if (req.method === 'GET') return listRows(res);
    if (req.method === 'POST') {
      return req.body?.action === 'create-site' ? createSite(req, res, actorRole) : createRow(req, res, actorRole);
    }
    if (req.method === 'PATCH') return patchRow(req, res, actorRole);

    res.setHeader('Allow', 'GET, POST, PATCH');
    return json(res, 405, { ok: false, error: 'Methode non autorisee.' });
  } catch (error: any) {
    return fail(res, error?.message || 'Erreur inattendue.');
  }
}
