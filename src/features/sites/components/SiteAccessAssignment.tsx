import { useCallback, useEffect, useState } from 'react';

import SiteAccessCheckboxList from '@/components/SiteAccessCheckboxList';
import { normalizeSuiviRole } from '@/lib/suiviPermissions';
import type { SiteId } from '@/lib/sites';
import { getValidAccessToken } from '@/services/supabaseAuth';

type UserRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  site_ids?: SiteId[];
};

type ApiResponse = { ok?: boolean; users?: UserRow[]; error?: string };

// Attribution des sites aux comptes "user" (les admins voient déjà tous les sites), même API et
// même liste de cases à cocher que la gestion des utilisateurs.
export default function SiteAccessAssignment() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const call = useCallback(async (init: RequestInit): Promise<ApiResponse> => {
    const token = await getValidAccessToken();
    if (!token) throw new Error('Session expirée : reconnecte-toi.');
    const response = await fetch('/api/suiviAccount', {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
    const data = await response.json().catch(() => null) as ApiResponse | null;
    if (!response.ok || data?.ok === false) throw new Error(data?.error || `Erreur HTTP ${response.status}`);
    return data || {};
  }, []);

  useEffect(() => {
    call({ method: 'GET' })
      .then(data => setUsers((data.users || []).filter(user => normalizeSuiviRole(user.role) === 'user')))
      .catch(err => setError(err instanceof Error ? err.message : 'Chargement impossible.'));
  }, [call]);

  const toggle = async (user: UserRow, siteId: SiteId) => {
    const current = user.site_ids || [];
    const next = current.includes(siteId) ? current.filter(id => id !== siteId) : [...current, siteId];
    if (next.length === 0) {
      setError('Au moins un site requis pour un compte utilisateur.');
      return;
    }
    setBusyId(user.user_id);
    setError(null);
    try {
      await call({ method: 'PATCH', body: JSON.stringify({ userId: user.user_id, action: 'set-sites', siteIds: next }) });
      setUsers(prev => prev.map(row => (row.user_id === user.user_id ? { ...row, site_ids: next } : row)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Modification des sites impossible.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {users.length === 0 && !error && <p className="text-sm text-slate-500">Aucun compte utilisateur à renseigner.</p>}
      {users.map(user => (
        <div key={user.user_id} className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-2 text-sm font-bold text-slate-800">{user.full_name || user.email}</div>
          <SiteAccessCheckboxList
            selected={user.site_ids || []}
            onToggle={siteId => void toggle(user, siteId)}
            disabled={busyId === user.user_id}
          />
        </div>
      ))}
    </div>
  );
}
