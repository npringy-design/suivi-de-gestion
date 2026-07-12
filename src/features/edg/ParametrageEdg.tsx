import { ArrowLeft, Settings } from 'lucide-react';

import { useData } from '@/contexts/DataContext';
import type { EdgChargeMode } from '@/types/dataTypes';
import { EDG_CHARGE_ROWS } from '@/features/edg/edgChargesConfigDefaults';

type ParametrageEdgProps = {
  onBack: () => void;
};

const MODE_OPTIONS: { value: EdgChargeMode; label: string }[] = [
  { value: 'fixe', label: 'Fixe' },
  { value: 'pourcentage', label: 'Pourcentage' },
  { value: 'manuel', label: 'Manuel' },
];

export default function ParametrageEdg({ onBack }: ParametrageEdgProps) {
  const { edgChargesConfig, updateEdgChargesConfig } = useData();

  const inputClass = 'w-full min-w-[130px] rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100';
  const thClass = 'sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-3 text-left text-[11px] font-black uppercase tracking-[0.08em] text-slate-500';
  const tdClass = 'border-b border-slate-100 px-3 py-3 align-top';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/40 to-amber-50/40 p-4 text-slate-900 sm:p-6">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-5">
        <header className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-[#07111f] via-[#0a2430] to-[#073d43] p-5 text-white shadow-xl">
          <div className="flex items-start gap-4">
            <button type="button" onClick={onBack} className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-cyan-50 ring-1 ring-white/15 transition hover:bg-white/20" aria-label="Retour accueil">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="text-xs font-black uppercase tracking-[0.24em] text-cyan-100/70">Paramétrage</div>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-amber-50">Paramètre EDG</h1>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-cyan-50/78">
                Pilote l'auto-remplissage du réalisé des 17 lignes EDG sous Résultat Gestion (loyer, amortissements, redevances...)
                qui varient peu d'un mois à l'autre. Fixe : recopie le budget saisi ce mois-ci. Pourcentage : applique un % du CA
                réalisé du mois. Manuel : aucune auto-valeur, saisie libre comme avant.
              </p>
            </div>
          </div>
        </header>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-1 border-b border-slate-200 bg-slate-50/80 p-4">
            <h2 className="text-lg font-black text-slate-900">Lignes sous Résultat Gestion</h2>
            <p className="text-sm font-medium text-slate-500">Sauvegarde automatique à chaque changement.</p>
          </div>

          <div className="max-h-[70vh] overflow-auto">
            <table className="min-w-[640px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className={thClass}>Ligne EDG</th>
                  <th className={thClass}>Mode</th>
                  <th className={thClass}>Pourcentage</th>
                </tr>
              </thead>
              <tbody>
                {EDG_CHARGE_ROWS.map(({ key, label }) => {
                  const cfg = edgChargesConfig[key] || { mode: 'manuel' as EdgChargeMode };
                  return (
                    <tr key={key} className="bg-white hover:bg-cyan-50/40">
                      <td className={`${tdClass} font-semibold text-slate-800`}>{label}</td>
                      <td className={tdClass}>
                        <select
                          value={cfg.mode}
                          onChange={event => updateEdgChargesConfig(key, { ...cfg, mode: event.target.value as EdgChargeMode })}
                          className={inputClass}
                        >
                          {MODE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </td>
                      <td className={tdClass}>
                        {cfg.mode === 'pourcentage' ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={cfg.pourcentage ?? 0}
                              onChange={event => {
                                const cleaned = event.target.value.replace(/[^0-9.,-]/g, '').replace(',', '.');
                                const parsed = parseFloat(cleaned);
                                updateEdgChargesConfig(key, { ...cfg, pourcentage: isNaN(parsed) ? 0 : parsed });
                              }}
                              className="w-24 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-center text-xs font-black text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                            />
                            <span className="text-xs font-bold text-slate-500">% du CA réalisé</span>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <Settings className="h-5 w-5 shrink-0 text-cyan-700" />
          <p className="text-sm font-medium leading-6 text-slate-600">
            Cette configuration est globale (indépendante du mois/année) et synchronisée entre les postes, comme la configuration
            de saisie 2025. La saisie manuelle sur une ligne dans EDG Mensuel reste toujours prioritaire sur l'auto-valeur.
          </p>
        </div>
      </div>
    </div>
  );
}
