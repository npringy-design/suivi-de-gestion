import { Plus, Trash2 } from 'lucide-react';

import { useData } from '@/contexts/DataContext';
import { formatEuroSymbol } from '@/lib/formatters';
import { parseMoneyValue } from '@/lib/money';
import type { FixedMonthlyCost } from '@/types/dataTypes';
import { DEFAULT_FIXED_COST_EDG_KEY, EDG_FG_TARGET_ROWS } from '@/features/edg/edgFgMapping';

const INPUT_CLASS = 'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100';
const TH_CLASS = 'sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-3 text-left text-[11px] font-black uppercase tracking-[0.08em] text-slate-500';
const TD_CLASS = 'border-b border-slate-100 px-3 py-2 align-middle';

// Frais fixes mensuels du site (contrats, abonnements) : reportés chaque mois ayant du CA réalisé dans
// l'EDG réalisé et la colonne « Frais fixes mensuels » du Récap annuel. Un mois dont les contrats ont été
// importés depuis l'Excel garde ces montants.
export default function FixedMonthlyCostsSection() {
  const { companySettings, updateCompanySettings } = useData();
  const costs = companySettings.fixedMonthlyCosts ?? [];
  const total = costs.reduce((sum, cost) => sum + (cost.montant > 0 ? cost.montant : 0), 0);

  const save = (next: FixedMonthlyCost[]) => updateCompanySettings({ ...companySettings, fixedMonthlyCosts: next });
  const update = (id: string, patch: Partial<FixedMonthlyCost>) => save(costs.map(cost => (cost.id === id ? { ...cost, ...patch } : cost)));
  const add = () => save([...costs, { id: `fixe-${Date.now()}`, label: '', montant: 0, edgKey: DEFAULT_FIXED_COST_EDG_KEY }]);
  const remove = (id: string) => save(costs.filter(cost => cost.id !== id));

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50/80 p-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-black text-slate-900">Frais fixes mensuels</h2>
          <p className="text-sm font-medium text-slate-500">
            Contrats et abonnements de ce restaurant, reportés chaque mois ayant du CA réalisé (EDG réalisé et Récap annuel).
            Les contrats importés depuis l'Excel pour un mois restent prioritaires pour ce mois.
          </p>
        </div>
        <button type="button" onClick={add} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#0d9488] to-[#0f766e] px-3 py-1.5 text-xs font-black text-white shadow-sm transition hover:brightness-110">
          <Plus className="h-3.5 w-3.5" /> Ajouter
        </button>
      </div>
      <div className="overflow-auto">
        <table className="min-w-[720px] w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className={TH_CLASS}>Libellé</th>
              <th className={TH_CLASS}>Montant mensuel HT</th>
              <th className={TH_CLASS}>Ligne EDG</th>
              <th className={TH_CLASS} />
            </tr>
          </thead>
          <tbody>
            {costs.length === 0 && (
              <tr><td colSpan={4} className={`${TD_CLASS} py-4 text-center text-xs font-medium text-slate-400`}>Aucun frais fixe pour ce restaurant.</td></tr>
            )}
            {costs.map(cost => (
              <tr key={cost.id} className="bg-white hover:bg-cyan-50/40">
                <td className={TD_CLASS}>
                  <input className={INPUT_CLASS} defaultValue={cost.label} placeholder="Ex. contrat caisse" onBlur={event => update(cost.id, { label: event.target.value.trim() })} />
                </td>
                <td className={TD_CLASS}>
                  <input className={`${INPUT_CLASS} text-right`} inputMode="decimal" defaultValue={cost.montant ? String(cost.montant).replace('.', ',') : ''} onBlur={event => update(cost.id, { montant: parseMoneyValue(event.target.value) })} />
                </td>
                <td className={TD_CLASS}>
                  <select className={INPUT_CLASS} value={cost.edgKey} onChange={event => update(cost.id, { edgKey: event.target.value })}>
                    {EDG_FG_TARGET_ROWS.map(row => <option key={row.key} value={row.key}>{row.label}</option>)}
                  </select>
                </td>
                <td className={`${TD_CLASS} w-10`}>
                  <button type="button" onClick={() => remove(cost.id)} className="rounded p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600" aria-label="Supprimer ce frais fixe">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {costs.length > 0 && (
            <tfoot>
              <tr>
                <td className="px-3 py-3 text-xs font-black uppercase tracking-[0.08em] text-slate-500">Total mensuel</td>
                <td className="px-3 py-3 text-right text-sm font-black text-slate-900">{formatEuroSymbol(total)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );
}
