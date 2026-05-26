const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const appUrl = process.env.APP_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') || 'https://suivi-de-gestion-8irh.vercel.app';
const table = 'suivi_gestion_user_access';
const roles = new Set(['admin', 'user']);

type ApiResponse = Record<string, unknown>;

const json = (res: any, status: number, payload: ApiResponse) => res.status(status).json(payload);
const bad = (res: any, message: string) => json(res, 400, { ok: false, error: message });
const forbid = (res: any, message: string) => json(res, 403, { ok: false, error: message });
const fail = (res: any, message: string) => json(res, 500, { ok: false, error: message });

const headers = (token?: string) => ({
  apikey: serviceKey,
  Authorization: `Bearer ${token || serviceKey}`,
  'Content-Type': 'application/json',
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

const restUrl = () => `${supabaseUrl.replace(/\/+$/, '')}/rest/v1`;
const authUrl = () => `${supabaseUrl.replace(/\/+$/, '')}/auth/v1`;

const requireAdmin = async (req: any) => {
  const token = readBearer(req);
  if (!token) return { ok: false as const, status: 401, error: 'Connexion admin requise.' };

  const userResponse = await fetch(`${authUrl()}/user`, { headers: headers(token) });
  if (!userResponse.ok) return { ok: false as const, status: 401, error: 'Session invalide.' };

  const user = await userResponse.json();
  const accessResponse = await fetch(`${restUrl()}/${table}?user_id=eq.${encodeURIComponent(user.id)}&is_active=eq.true&role=eq.admin&select=user_id&limit=1`, {
    headers: headers(token),
  });

  if (!accessResponse.ok) return { ok: false as const, status: 403, error: 'Verification admin impossible.' };
  const rows = await accessResponse.json();
  if (!rows.length) return { ok: false as const, status: 403, error: 'Droits admin Suivi requis.' };

  return { ok: true as const, user };
};

const listRows = async (res: any) => {
  const response = await fetch(`${restUrl()}/${table}?select=user_id,email,full_name,role,is_active,created_at,updated_at&order=created_at.desc`, {
    headers: headers(),
  });
  if (!response.ok) return fail(res, await readError(response));
  const users = await response.json();
  return json(res, 200, { ok: true, users, total: users.length });
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

const createAuthUser = async (email: string, fullName: string | null, tempPassword: string, role: string, sendInvite: boolean) => {
  if (sendInvite) {
    const inviteResponse = await fetch(`${authUrl()}/invite`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ email, data: { full_name: fullName || undefined, suivi_role: role }, redirect_to: appUrl }),
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
      user_metadata: { full_name: fullName || undefined, suivi_role: role, must_change_password: true },
    }),
  });

  if (!createResponse.ok) throw new Error(await readError(createResponse));
  return { user: await createResponse.json(), emailSent: false, warning: 'Compte cree avec mot de passe temporaire.' };
};

const createRow = async (req: any, res: any) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const fullName = String(req.body?.fullName || '').trim() || null;
  const tempPassword = String(req.body?.tempPassword || '');
  const role = String(req.body?.role || 'user');
  const sendInvite = Boolean(req.body?.sendInvite);

  if (!email) return bad(res, 'Email requis.');
  if (!roles.has(role)) return bad(res, 'Role invalide.');
  if (!sendInvite && tempPassword.length < 8) return bad(res, 'Mot de passe temporaire minimum 8 caracteres.');

  let authUser = await findAuthUserByEmail(email);
  let emailSent = false;
  let warning: string | null = null;

  if (!authUser) {
    const created = await createAuthUser(email, fullName, tempPassword, role, sendInvite);
    authUser = created.user;
    emailSent = created.emailSent;
    warning = created.warning;
  }

  const row = { user_id: authUser.id, email, full_name: fullName, role, is_active: true };
  const accessResponse = await fetch(`${restUrl()}/${table}?on_conflict=user_id&select=user_id,email,full_name,role,is_active,created_at,updated_at`, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(row),
  });

  if (!accessResponse.ok) return fail(res, await readError(accessResponse));
  const rows = await accessResponse.json();
  return json(res, 201, { ok: true, user: rows[0], email_sent: emailSent, email_warning: warning });
};

const patchRow = async (req: any, res: any) => {
  const userId = String(req.body?.userId || '');
  if (!userId) return bad(res, 'Utilisateur requis.');

  if (req.body?.action === 'toggle-active') {
    const currentResponse = await fetch(`${restUrl()}/${table}?user_id=eq.${encodeURIComponent(userId)}&select=is_active&limit=1`, { headers: headers() });
    if (!currentResponse.ok) return fail(res, await readError(currentResponse));
    const currentRows = await currentResponse.json();
    if (!currentRows.length) return bad(res, 'Utilisateur introuvable.');

    const response = await fetch(`${restUrl()}/${table}?user_id=eq.${encodeURIComponent(userId)}&select=user_id,email,full_name,role,is_active,created_at,updated_at`, {
      method: 'PATCH',
      headers: { ...headers(), Prefer: 'return=representation' },
      body: JSON.stringify({ is_active: !currentRows[0].is_active }),
    });
    if (!response.ok) return fail(res, await readError(response));
    const rows = await response.json();
    return json(res, 200, { ok: true, user: rows[0] });
  }

  const role = String(req.body?.role || 'user');
  if (!roles.has(role)) return bad(res, 'Role invalide.');

  const patch: Record<string, unknown> = { role };
  if (typeof req.body?.fullName === 'string') patch.full_name = req.body.fullName.trim() || null;

  const response = await fetch(`${restUrl()}/${table}?user_id=eq.${encodeURIComponent(userId)}&select=user_id,email,full_name,role,is_active,created_at,updated_at`, {
    method: 'PATCH',
    headers: { ...headers(), Prefer: 'return=representation' },
    body: JSON.stringify(patch),
  });
  if (!response.ok) return fail(res, await readError(response));
  const rows = await response.json();
  return json(res, 200, { ok: true, user: rows[0] });
};

export default async function handler(req: any, res: any) {
  try {
    assertEnv();
    const admin = await requireAdmin(req);
    if (!admin.ok) return admin.status === 401 ? json(res, 401, { ok: false, error: admin.error }) : forbid(res, admin.error);

    if (req.method === 'GET') return listRows(res);
    if (req.method === 'POST') return createRow(req, res);
    if (req.method === 'PATCH') return patchRow(req, res);

    res.setHeader('Allow', 'GET, POST, PATCH');
    return json(res, 405, { ok: false, error: 'Methode non autorisee.' });
  } catch (error: any) {
    return fail(res, error?.message || 'Erreur inattendue.');
  }
}
