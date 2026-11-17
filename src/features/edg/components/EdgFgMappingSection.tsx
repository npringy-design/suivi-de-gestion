import { useData } from '@/contexts/DataContext';
import { EDG_FG_TARGET_ROWS, FG_CATEGORIES, resolveEdgFgMapping } from '@/features/edg/edgFgMapping';

const SELECT_CLASS = 'w-full min-w-[220px] rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100';
const TH_CLASS = 'sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-3 text-left text-[11px] font-black uppercase tracking-[0.08em] text-slate-500';
const TD_CLASS = 'border-b border-slate-100 px-3 py-3 align-top';

// Rattachement des catégories Frais Généraux du Suivi quotidien aux lignes du réalisé EDG (par site).
export default function EdgFgMappingSection() {
  const { companySettings, updateCompanySettings } = useData();
  const mapping = resolveEdgFgMapping(companySettings.edgFgMapping);

  const setTarget = (categoryKey: string, edgKey: string) => {
    updateCompanySettings({ ...companySettings, edgFgMapping: { ...mapping, [categoryKey]: edgKey } });
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-1 border-b border-slate-200 bg-slate-50/80 p-4">
        <h2 className="text-lg font-black text-slate-900">Frais généraux du Suivi quotidien → lignes EDG</h2>
        <p className="text-sm font-medium text-slate-500">
          Le total mensuel de chaque catégorie alimente le réalisé de la ligne EDG choisie (plusieurs catégories peuvent
          aller sur la même ligne). Sauvegarde automatique, propre à ce restaurant.
        </p>
      </div>
      <div className="overflow-auto">
        <table className="min-w-[640px] w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className={TH_CLASS}>Catégorie Suivi quotidien</th>
              <th className={TH_CLASS}>Ligne EDG</th>
            </tr>
          </thead>
          <tbody>
            {FG_CATEGORIES.map(category => (
              <tr key={category.key} className="bg-white hover:bg-cyan-50/40">
                <td className={`${TD_CLASS} font-semibold text-slate-800`}>{category.label}</td>
                <td className={TD_CLASS}>
                  <select value={mapping[category.key] ?? ''} onChange={event => setTarget(category.key, event.target.value)} className={SELECT_CLASS}>
                    <option value="">Non reporté dans l'EDG</option>
                    {EDG_FG_TARGET_ROWS.map(row => <option key={row.key} value={row.key}>{row.label}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
