import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';

import Home from '@/Home';
import { getValidAccessToken } from '@/services/supabaseAuth';

export default function HomeWithAdminLink() {
  const navigate = useNavigate();
  const [canManageUsers, setCanManageUsers] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkUserManagementAccess = async () => {
      const token = await getValidAccessToken().catch(() => null);
      if (!token) {
        if (mounted) setCanManageUsers(false);
        return;
      }

      const response = await fetch('/api/suiviAccount', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }).catch(() => null);

      if (mounted) setCanManageUsers(Boolean(response?.ok));
    };

    void checkUserManagementAccess();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <Home />
      {canManageUsers && (
        <button
          type="button"
          onClick={() => navigate('/utilisateurs')}
          className="fixed bottom-16 right-4 z-50 inline-flex items-center gap-2 rounded-full border border-cyan-100/30 bg-[#0f766e] px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-white shadow-xl shadow-slate-950/20 transition hover:bg-[#115e59]"
          title="Gestion des utilisateurs"
        >
          <Users className="h-4 w-4" />
          Utilisateurs
        </button>
      )}
    </>
  );
}
