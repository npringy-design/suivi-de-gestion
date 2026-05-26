import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Lock, RefreshCw, UserPlus, Users } from 'lucide-react';

import {
  signInWithPassword,
  signOut,
  SupabaseAuthSession,
  validateAuthSession,
} from '@/services/supabaseAuth';
import {
  canManageUserTarget,
  getCreatableSuiviRoles,
  getSuiviRoleLabel,
  normalizeSuiviRole,
  type SuiviRole,
} from '@/lib/suiviPermissions';

type Role = SuiviRole;

type UserRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
};

type ApiResponse = {
  ok: boolean;
  users?: UserRow[];
  user?: UserRow;
  total?: number;
  email_sent?: boolean;
  email_warning?: string | null;
  error?: string;
};

type UserManagementPageProps = {
  onBack: () => void;
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR');
};

const normalizeUserRow = (user: UserRow): UserRow => ({
  ...user,
  role: normalizeSuiviRole(user.role),
});

const toApiRole = (role: Role) => {
  if (role === 'global_admin') return 'global_admin';
  if (role === 'super_admin') return 'super_admin';
  return 'user';
};

export default function UserManagementPage({ onBack }: UserManagementPageProps) {
  const [session, setSession] = useState<SupabaseAuthSession | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [formEmail, setFormEmail] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formTempPassword, setFormTempPassword] = useState('');
  const [formRole, setFormRole] = useState<Role>('user');
  const [formSendInvite, setFormSendInvite] = useState(true);
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const bearer = session?.access_token || '';

  const currentUserRow = useMemo(() => {
    const currentUserId = session?.user?.id;
    if (!currentUserId) return null;
    return users.find((user) => user.user_id === currentUserId) || null;
  }, [session?.user?.id, users]);

  const creatableRoles = useMemo(() => getCreatableSuiviRoles(currentUserRow), [currentUserRow]);

  const request = useCallback(async (init?: RequestInit) => {
    const response = await fetch('/api/suiviAccount', {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bearer}`,
        ...(init?.headers || {}),
      },
    });

    const data = await response.json().catch(() => null) as ApiResponse | null;
    if (!response.ok || data?.ok === false) {
      throw new Error(data?.error || `Erreur HTTP ${response.status}`);
    }
    return data || { ok: true };
  }, [bearer]);

  const loadUsers = useCallback(async () => {
    if (!bearer) return;
    setIsLoadingUsers(true);
    setLoadError(null);
    try {
      const data = await request({ method: 'GET' });
      setUsers((data.users || []).map(normalizeUserRow));
    } catch (error) {
      setUsers([]);
      setLoadError(error instanceof Error ? error.message : 'Chargement impossible.');
    } finally {
      setIsLoadingUsers(false);
    }
  }, [bearer, request]);

  useEffect(() => {
    let mounted = true;
    validateAuthSession()
      .then((activeSession) => {
        if (mounted) setSession(activeSession);
      })
      .catch(() => {
        if (mounted) setSession(null);
      })
      .finally(() => {
        if (mounted) setIsCheckingSession(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (session) void loadUsers();
  }, [session, loadUsers]);

  useEffect(() => {
    if (creatableRoles.length > 0 && !creatableRoles.includes(formRole)) {
      setFormRole(creatableRoles[0]);
    }
  }, [creatableRoles, formRole]);

  const activeCount = useMemo(() => users.filter((user) => user.is_active).length, [users]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoginLoading(true);
    setLoginError(null);
    try {
      const activeSession = await signInWithPassword(loginEmail.trim(), loginPassword);
      setSession(activeSession);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Connexion impossible.');
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    setSession(null);
    setUsers([]);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError(null);
    setCreateMessage(null);

    if (!formEmail.trim()) {
      setCreateError('Email requis.');
      return;
    }
    if (!creatableRoles.includes(formRole)) {
      setCreateError('Ton rôle ne permet pas de créer ce niveau d’accès.');
      return;
    }
    if (!formSendInvite && formTempPassword.length < 8) {
      setCreateError('Mot de passe temporaire minimum 8 caractères.');
      return;
    }

    setIsCreating(true);
    try {
      const data = await request({
        method: 'POST',
        body: JSON.stringify({
          email: formEmail.trim(),
          fullName: formFullName.trim() || null,
          tempPassword: formTempPassword,
          role: toApiRole(formRole),
          sendInvite: formSendInvite,
        }),
      });

      setCreateMessage(
        data.email_sent
          ? 'Utilisateur créé. Email d’invitation envoyé.'
          : data.email_warning || 'Utilisateur créé avec mot de passe temporaire.',
      );
      setFormEmail('');
      setFormFullName('');
      setFormTempPassword('');
      setFormRole(creatableRoles[0] || 'user');
      setFormSendInvite(true);
      await loadUsers();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Création impossible.');
    } finally {
      setIsCreating(false);
    }
  };

  const updateRole = async (user: UserRow, role: Role) => {
    if (!canManageUserTarget(currentUserRow, user)) {
      setLoadError('Action refusée : droits insuffisants pour modifier cet utilisateur.');
      return;
    }

    setActionId(user.user_id);
    try {
      const data = await request({
        method: 'PATCH',
        body: JSON.stringify({ userId: user.user_id, role: toApiRole(role), fullName: user.full_name || '' }),
      });
      if (data.user) setUsers((prev) => prev.map((row) => (row.user_id === user.user_id ? normalizeUserRow(data.user!) : row)));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Modification impossible.');
    } finally {
      setActionId(null);
    }
  };

  const toggleActive = async (user: UserRow) => {
    if (!canManageUserTarget(currentUserRow, user)) {
      setLoadError('Action refusée : droits insuffisants pour modifier cet utilisateur.');
      return;
    }

    setActionId(user.user_id);
    try {
      const data = await request({
        method: 'PATCH',
        body: JSON.stringify({ userId: user.user_id, action: 'toggle-active' }),
      });
      if (data.user) setUsers((prev) => prev.map((row) => (row.user_id === user.user_id ? normalizeUserRow(data.user!) : row)));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Changement statut impossible.');
    } finally {
      setActionId(null);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-6 text-center shadow-xl">Vérification de la session...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f1f5f9] to-[#e0f2fe] p-4">
        <div className="mx-auto max-w-4xl">
          <button onClick={onBack} className="mb-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow">
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>
          <div className="grid overflow-hidden rounded-[2rem] bg-white shadow-2xl lg:grid-cols-[1fr_1.1fr]">
            <div className="bg-gradient-to-br from-[#07111f] via-[#0a2430] to-[#0b5f65] p-8 text-white">
              <div className="text-xs font-black uppercase tracking-[0.28em] text-cyan-100">Suivi de gestion</div>
              <h1 className="mt-6 text-3xl font-black">Gestion des utilisateurs</h1>
              <p className="mt-4 text-sm font-semibold text-cyan-50/80">
                Connecte-toi avec un compte super admin ou global admin Suivi pour créer ou gérer les accès.
              </p>
            </div>
            <form onSubmit={handleLogin} className="p-8">
              <h2 className="text-2xl font-black text-slate-900">Connexion admin</h2>
              <label className="mt-6 block text-sm font-bold text-slate-700">Email</label>
              <input className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" type="email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} required />
              <label className="mt-4 block text-sm font-bold text-slate-700">Mot de passe</label>
              <input className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} required />
              {loginError && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{loginError}</div>}
              <button disabled={isLoginLoading} className="mt-6 w-full rounded-xl bg-[#0f766e] px-4 py-3 font-black text-white disabled:bg-slate-300">
                {isLoginLoading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] p-3 lg:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <button onClick={onBack} className="mb-3 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black uppercase text-slate-700">
                <ArrowLeft className="h-4 w-4" /> Retour accueil
              </button>
              <h1 className="flex items-center gap-3 text-2xl font-black uppercase text-slate-900">
                <Users className="h-7 w-7 text-cyan-700" /> Utilisateurs Suivi
              </h1>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {users.length} compte(s), dont {activeCount} actif(s)
                {currentUserRow ? ` · Connecté : ${getSuiviRoleLabel(currentUserRow.role)}` : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => void loadUsers()} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-black uppercase text-white">
                <RefreshCw className="h-4 w-4" /> Actualiser
              </button>
              <button onClick={() => void handleLogout()} className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black uppercase text-slate-700">
                Déconnexion admin
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[390px_1fr]">
          <form onSubmit={handleCreate} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-xl">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black uppercase text-slate-900">
              <UserPlus className="h-5 w-5 text-cyan-700" /> Créer un utilisateur
            </h2>
            <label className="block text-xs font-black uppercase text-slate-500">Email</label>
            <input className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold" type="email" value={formEmail} onChange={(event) => setFormEmail(event.target.value)} required />

            <label className="mt-4 block text-xs font-black uppercase text-slate-500">Nom</label>
            <input className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold" value={formFullName} onChange={(event) => setFormFullName(event.target.value)} placeholder="Optionnel" />

            <label className="mt-4 block text-xs font-black uppercase text-slate-500">Rôle</label>
            <select className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 font-bold" value={formRole} onChange={(event) => setFormRole(event.target.value as Role)}>
              {creatableRoles.map((role) => (
                <option key={role} value={role}>{getSuiviRoleLabel(role)}</option>
              ))}
            </select>
            {creatableRoles.length === 0 && (
              <p className="mt-2 text-xs font-bold text-red-600">Ton rôle ne permet pas de créer de nouvel accès.</p>
            )}

            <label className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-700">
              <input type="checkbox" checked={formSendInvite} onChange={(event) => setFormSendInvite(event.target.checked)} />
              Envoyer un email d’invitation si possible
            </label>

            <label className="mt-4 block text-xs font-black uppercase text-slate-500">Mot de passe temporaire</label>
            <input className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 font-semibold" value={formTempPassword} onChange={(event) => setFormTempPassword(event.target.value)} placeholder="Minimum 8 caractères si pas d’email" />
            <p className="mt-2 text-xs font-semibold text-slate-500">
              Si l’email Supabase ne part pas, ce mot de passe servira à donner les identifiants à la voix.
            </p>

            {createMessage && <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{createMessage}</div>}
            {createError && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{createError}</div>}

            <button disabled={isCreating || creatableRoles.length === 0} className="mt-5 w-full rounded-xl bg-[#0f766e] px-4 py-3 font-black text-white disabled:bg-slate-300">
              {isCreating ? 'Création...' : 'Créer l’utilisateur'}
            </button>
          </form>

          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl">
            {loadError && <div className="border-b border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">{loadError}</div>}
            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full border-collapse">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="p-3 text-left text-xs font-black uppercase">Email</th>
                    <th className="p-3 text-left text-xs font-black uppercase">Nom</th>
                    <th className="p-3 text-left text-xs font-black uppercase">Rôle</th>
                    <th className="p-3 text-left text-xs font-black uppercase">Statut</th>
                    <th className="p-3 text-left text-xs font-black uppercase">Créé le</th>
                    <th className="p-3 text-left text-xs font-black uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingUsers && (
                    <tr><td colSpan={6} className="p-8 text-center font-bold text-slate-500">Chargement...</td></tr>
                  )}
                  {!isLoadingUsers && users.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center font-bold text-slate-400">Aucun utilisateur.</td></tr>
                  )}
                  {!isLoadingUsers && users.map((user) => {
                    const busy = actionId === user.user_id;
                    const canManage = canManageUserTarget(currentUserRow, user);
                    const role = normalizeSuiviRole(user.role);
                    return (
                      <tr key={user.user_id} className="border-t border-slate-100">
                        <td className="p-3 text-sm font-bold text-slate-700">{user.email || '—'}</td>
                        <td className="p-3 text-sm font-semibold text-slate-600">{user.full_name || '—'}</td>
                        <td className="p-3">
                          {role === 'super_admin' ? (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-1 text-xs font-black uppercase text-amber-800">
                              <Lock className="h-3 w-3" /> {getSuiviRoleLabel(role)}
                            </span>
                          ) : (
                            <select disabled={busy || !canManage} value={role} onChange={(event) => void updateRole(user, event.target.value as Role)} className="rounded-lg border border-slate-300 px-2 py-1 text-sm font-bold disabled:bg-slate-100 disabled:text-slate-400">
                              {creatableRoles.map((option) => (
                                <option key={option} value={option}>{getSuiviRoleLabel(option)}</option>
                              ))}
                              {!creatableRoles.includes(role) && <option value={role}>{getSuiviRoleLabel(role)}</option>}
                            </select>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-black uppercase ${user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {user.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="p-3 text-sm font-semibold text-slate-500">{formatDate(user.created_at)}</td>
                        <td className="p-3">
                          <button disabled={busy || !canManage} onClick={() => void toggleActive(user)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-black uppercase text-white disabled:bg-slate-300">
                            {role === 'super_admin' ? 'Intouchable' : busy ? '...' : user.is_active ? 'Désactiver' : 'Réactiver'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
