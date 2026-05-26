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
        <div className="fixed bottom-5 left-2 z-50 hidden w-[calc(clamp(238px,17vw,280px)-1rem)] px-2 lg:block">
          <button
            type="button"
            onClick={() => navigate('/utilisateurs')}
            className="group relative w-full overflow-hidden rounded-xl border border-cyan-200/15 bg-cyan-100/10 px-3 py-2.5 text-left text-[12.5px] font-black uppercase tracking-[0.12em] text-cyan-50 shadow-inner shadow-black/10 transition-all duration-300 hover:bg-cyan-300/15 hover:text-white"
            title="Gestion des utilisateurs"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cyan-300/10 text-cyan-100 ring-1 ring-cyan-100/20">
                <Users className="h-3.5 w-3.5" />
              </span>
              <span>Utilisateurs</span>
            </div>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-300/0 to-teal-300/0 opacity-0 transition-opacity duration-300 group-hover:opacity-10" />
          </button>
        </div>
      )}
    </>
  );
}
