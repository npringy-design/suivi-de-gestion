import { getSiteIds, getSiteLabel, getSiteBrand, type SiteId } from '@/lib/sites';
import { getSiteBrandTheme } from '@/lib/siteBrandTheme';

// Liste de cases à cocher pour choisir les sites autorisés d'un compte "user" — utilisée à la
// fois dans le formulaire de création et dans le tableau d'édition de UserManagementPage. Une
// pastille de couleur par enseigne (voir @/lib/siteBrandTheme) aide à repérer vite les sites d'une
// même enseigne quand plusieurs enseignes existeront.
export default function SiteAccessCheckboxList({
  selected, onToggle, disabled = false, labelClassName = 'text-sm font-semibold text-slate-700',
}: {
  selected: SiteId[];
  onToggle: (siteId: SiteId) => void;
  disabled?: boolean;
  labelClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {getSiteIds().map((siteId) => (
        <label key={siteId} className={`flex items-center gap-2 ${labelClassName}`}>
          <input
            type="checkbox"
            disabled={disabled}
            checked={selected.includes(siteId)}
            onChange={() => onToggle(siteId)}
          />
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: getSiteBrandTheme(getSiteBrand(siteId)).brandDot }} />
          {getSiteLabel(siteId)}
        </label>
      ))}
    </div>
  );
}
