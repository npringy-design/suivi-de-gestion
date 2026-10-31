import { Building2 } from 'lucide-react';

import { useAuthSession } from '@/AuthGate';
import { getSiteLabel, type SiteId } from '@/lib/sites';

// Sélecteur de site : masqué si l'utilisateur n'a accès qu'à un seul site (cas de la grande
// majorité des comptes "user"). Le changement de site recharge la page (voir AuthGate.handleChangeSite).
export default function SiteSwitcher({ className = '' }: { className?: string }) {
  const { accessProfile, activeSiteId, setActiveSiteId } = useAuthSession();
  const availableSiteIds = accessProfile.siteIds;

  if (availableSiteIds.length <= 1) {
    return null;
  }

  return (
    <label
      className={`flex items-center gap-1.5 rounded-lg bg-cyan-950/60 px-2 py-1.5 text-cyan-100/70 transition-colors hover:bg-cyan-900/70 hover:text-white ${className}`}
      title="Changer de site"
    >
      <Building2 className="h-4 w-4 shrink-0" />
      <select
        aria-label="Site actif"
        className="bg-transparent text-xs font-semibold text-cyan-50 outline-none [&>option]:text-slate-900"
        onChange={(event) => setActiveSiteId(event.target.value as SiteId)}
        value={activeSiteId}
      >
        {availableSiteIds.map((siteId) => (
          <option key={siteId} value={siteId}>
            {getSiteLabel(siteId)}
          </option>
        ))}
      </select>
    </label>
  );
}
