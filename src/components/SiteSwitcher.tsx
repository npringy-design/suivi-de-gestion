import { Building2 } from 'lucide-react';

import { useAuthSession } from '@/AuthGate';
import { getSiteLabel, getSiteBrand, type SiteId } from '@/lib/sites';
import { getSiteBrandTheme } from '@/lib/siteBrandTheme';

// Sélecteur de site : masqué si l'utilisateur n'a accès qu'à un seul site (cas de la grande
// majorité des comptes "user"). Le changement de site recharge la page (voir AuthGate.handleChangeSite).
// Teinté selon l'enseigne du site actif (voir @/lib/siteBrandTheme) : une petite pastille de couleur
// rappelle sur quel site on se trouve avant même de lire le nom.
export default function SiteSwitcher({ className = '' }: { className?: string }) {
  const { accessProfile, activeSiteId, setActiveSiteId } = useAuthSession();
  const availableSiteIds = accessProfile.siteIds;

  if (availableSiteIds.length <= 1) {
    return null;
  }

  const theme = getSiteBrandTheme(getSiteBrand(activeSiteId));

  return (
    <label
      className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition-colors ${className}`}
      style={{ backgroundColor: theme.iconBtnBg, color: theme.iconBtnText }}
      onMouseEnter={(event) => { event.currentTarget.style.backgroundColor = theme.iconBtnBgHover; }}
      onMouseLeave={(event) => { event.currentTarget.style.backgroundColor = theme.iconBtnBg; }}
      title="Changer de site"
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: theme.brandDot }} />
      <Building2 className="h-4 w-4 shrink-0" />
      <select
        aria-label="Site actif"
        className="bg-transparent text-xs font-semibold outline-none [&>option]:text-slate-900"
        style={{ color: theme.sidebarHeaderTitle }}
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
