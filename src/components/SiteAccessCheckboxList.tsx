import { SITE_IDS, getSiteLabel, type SiteId } from '@/lib/sites';

// Liste de cases à cocher pour choisir les sites autorisés d'un compte "user" — utilisée à la
// fois dans le formulaire de création et dans le tableau d'édition de UserManagementPage.
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
      {SITE_IDS.map((siteId) => (
        <label key={siteId} className={`flex items-center gap-2 ${labelClassName}`}>
          <input
            type="checkbox"
            disabled={disabled}
            checked={selected.includes(siteId)}
            onChange={() => onToggle(siteId)}
          />
          {getSiteLabel(siteId)}
        </label>
      ))}
    </div>
  );
}
