import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Copy, Plus, RotateCcw, Save, Search, Trash2 } from 'lucide-react';

import {
  ACCOUNTING_CATEGORIES,
  CAISSE_KEY_OPTIONS,
  DEFAULT_ACCOUNTING_MAPPINGS,
  loadAccountingMappings,
  saveAccountingMappings,
  type AccountingCaisseKey,
  type AccountingCategory,
  type AccountingMappingRow,
} from '@/accountingConfig';

type ParametrageComptableProps = {
  onBack: () => void;
};

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `mapping-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const createEmptyRow = (): AccountingMappingRow => ({
  id: createId(),
  active: true,
  category: 'Paiement',
  caisseKey: '',
  caisseItem: '',
  company: '',
  debitAccount: '',
  creditAccount: '',
  accountingLabel: '',
  rule: '',
  tolerance: '0,01',
  keywords: '',
  notes: '',
});

export default function ParametrageComptable({ onBack }: ParametrageComptableProps) {
  const [rows, setRows] = useState<AccountingMappingRow[]>(loadAccountingMappings);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'Tous' | AccountingCategory>('Tous');

  useEffect(() => {
    saveAccountingMappings(rows);
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(row => {
      const matchesCategory = categoryFilter === 'Tous' || row.category === categoryFilter;
      const matchesSearch = !q || Object.values(row).some(value => String(value).toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [rows, search, categoryFilter]);

  const counters = useMemo(() => {
    const activeRows = rows.filter(row => row.active);
    return {
      active: activeRows.length,
      debit: activeRows.filter(row => row.debitAccount.trim()).length,
      credit: activeRows.filter(row => row.creditAccount.trim()).length,
      warnings: activeRows.filter(row => !row.debitAccount.trim() && !row.creditAccount.trim()).length,
    };
  }, [rows]);

  const updateRow = <K extends keyof AccountingMappingRow>(id: string, field: K, value: AccountingMappingRow[K]) => {
    setRows(currentRows => currentRows.map(row => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const addRow = () => setRows(currentRows => [...currentRows, createEmptyRow()]);

  const duplicateRow = (row: AccountingMappingRow) => {
    setRows(currentRows => [...currentRows, { ...row, id: createId(), caisseItem: `${row.caisseItem} copie` }]);
  };

  const removeRow = (id: string) => {
    setRows(currentRows => currentRows.filter(row => row.id !== id));
  };

  const resetDefaults = () => {
    if (!window.confirm('Remettre le paramétrage comptable par défaut ? Les lignes personnalisées seront perdues.')) return;
    setRows(DEFAULT_ACCOUNTING_MAPPINGS);
  };

  const inputClass = 'w-full min-w-[130px] rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100';
  const thClass = 'sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-3 text-left text-[11px] font-black uppercase tracking-[0.08em] text-slate-500';
  const tdClass = 'border-b border-slate-100 px-3 py-2 align-top';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/40 to-amber-50/40 p-4 text-slate-900 sm:p-6">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
        <header className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-[#07111f] via-[#0a2430] to-[#073d43] p-5 text-white shadow-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <button type="button" onClick={onBack} className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-cyan-50 ring-1 ring-white/15 transition hover:bg-white/20" aria-label="Retour accueil">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <div className="text-xs font-black uppercase tracking-[0.24em] text-cyan-100/70">Paramétrage</div>
                <h1 className="mt-1 text-3xl font-black tracking-tight text-amber-50">Paramétrage comptable</h1>
                <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-cyan-50/78">
                  Table de correspondance entre les rubriques caisse, les clés de calcul, les compagnies et les comptes comptables attendus.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={addRow} className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-black/20 transition hover:bg-amber-200">
                <Plus className="h-4 w-4" /> Ajouter une ligne
              </button>
              <button type="button" onClick={resetDefaults} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-black text-cyan-50 ring-1 ring-white/15 transition hover:bg-white/20">
                <RotateCcw className="h-4 w-4" /> Réinitialiser
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Lignes actives</div><div className="mt-2 text-3xl font-black text-slate-900">{counters.active}</div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Comptes débit</div><div className="mt-2 text-3xl font-black text-cyan-800">{counters.debit}</div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Comptes crédit</div><div className="mt-2 text-3xl font-black text-amber-700">{counters.credit}</div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">À compléter</div><div className={`mt-2 text-3xl font-black ${counters.warnings > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{counters.warnings}</div></div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/80 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">Correspondances caisse → compta</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">Sauvegarde automatique dans le navigateur pour cette première version.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher..." className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 sm:w-64" />
                </label>
                <select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value as 'Tous' | AccountingCategory)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100">
                  <option value="Tous">Toutes les familles</option>
                  {ACCOUNTING_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
                </select>
              </div>
            </div>

            <div className="max-h-[67vh] overflow-auto">
              <table className="min-w-[1650px] border-separate border-spacing-0 text-sm">
                <thead><tr>
                  <th className={thClass}>Actif</th><th className={thClass}>Famille</th><th className={thClass}>Élément caisse</th><th className={thClass}>Clé caisse</th><th className={thClass}>Compagnie</th><th className={thClass}>Compte débit</th><th className={thClass}>Compte crédit</th><th className={thClass}>Libellé comptable</th><th className={thClass}>Règle</th><th className={thClass}>Tolérance €</th><th className={thClass}>Mots-clés caisse</th><th className={thClass}>Notes</th><th className={`${thClass} text-center`}>Actions</th>
                </tr></thead>
                <tbody>
                  {filteredRows.map(row => (
                    <tr key={row.id} className={row.active ? 'bg-white hover:bg-cyan-50/40' : 'bg-slate-50 text-slate-400'}>
                      <td className={`${tdClass} text-center`}><input type="checkbox" checked={row.active} onChange={event => updateRow(row.id, 'active', event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-cyan-700 focus:ring-cyan-600" /></td>
                      <td className={tdClass}><select value={row.category} onChange={event => updateRow(row.id, 'category', event.target.value as AccountingCategory)} className={inputClass}>{ACCOUNTING_CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}</select></td>
                      <td className={tdClass}><input value={row.caisseItem} onChange={event => updateRow(row.id, 'caisseItem', event.target.value)} className={inputClass} /></td>
                      <td className={tdClass}><select value={row.caisseKey} onChange={event => updateRow(row.id, 'caisseKey', event.target.value as AccountingCaisseKey)} className="w-full min-w-[150px] rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-black text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100">{CAISSE_KEY_OPTIONS.map(option => <option key={option.value || 'none'} value={option.value}>{option.label}</option>)}</select></td>
                      <td className={tdClass}><input value={row.company} onChange={event => updateRow(row.id, 'company', event.target.value)} className={inputClass} /></td>
                      <td className={tdClass}><input value={row.debitAccount} onChange={event => updateRow(row.id, 'debitAccount', event.target.value)} className={`${inputClass} font-black text-cyan-800`} /></td>
                      <td className={tdClass}><input value={row.creditAccount} onChange={event => updateRow(row.id, 'creditAccount', event.target.value)} className={`${inputClass} font-black text-amber-700`} /></td>
                      <td className={tdClass}><input value={row.accountingLabel} onChange={event => updateRow(row.id, 'accountingLabel', event.target.value)} className={inputClass} /></td>
                      <td className={tdClass}><textarea value={row.rule} onChange={event => updateRow(row.id, 'rule', event.target.value)} className={`${inputClass} min-h-[58px] resize-y`} /></td>
                      <td className={tdClass}><input value={row.tolerance} onChange={event => updateRow(row.id, 'tolerance', event.target.value)} inputMode="decimal" className="w-24 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-center text-xs font-black text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" /></td>
                      <td className={tdClass}><textarea value={row.keywords} onChange={event => updateRow(row.id, 'keywords', event.target.value)} className={`${inputClass} min-h-[58px] resize-y`} /></td>
                      <td className={tdClass}><textarea value={row.notes} onChange={event => updateRow(row.id, 'notes', event.target.value)} className={`${inputClass} min-h-[58px] resize-y`} /></td>
                      <td className={`${tdClass} text-center`}><div className="flex justify-center gap-2"><button type="button" onClick={() => duplicateRow(row)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800" aria-label="Dupliquer la ligne"><Copy className="h-4 w-4" /></button><button type="button" onClick={() => removeRow(row.id)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700" aria-label="Supprimer la ligne"><Trash2 className="h-4 w-4" /></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="flex flex-col gap-4">
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div><h3 className="text-sm font-black uppercase tracking-[0.12em] text-amber-900">Point de vigilance</h3><p className="mt-2 text-sm font-semibold leading-6 text-amber-950/80">Les comptes et les clés sont une base de brouillon. Le 580000 et la dernière ligne 531100 restent à confirmer avant export officiel.</p></div></div></div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-sm font-black uppercase tracking-[0.12em] text-slate-700">Lecture débit / crédit</h3><div className="mt-4 grid gap-3 text-sm font-medium leading-6 text-slate-600"><p><span className="font-black text-cyan-800">Débit</span> : 531100 total TTC et comptes 511xxx.</p><p><span className="font-black text-amber-700">Crédit</span> : CA, TVA, pourboires, écarts positifs.</p><p>La clé caisse détermine quelle valeur de la synthèse alimente la ligne.</p></div></div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em] text-slate-700"><Save className="h-4 w-4 text-cyan-700" /> Sauvegarde</div><p className="mt-3 text-sm font-medium leading-6 text-slate-600">Sauvegarde locale navigateur. Les lignes existantes sont migrées automatiquement avec leur clé caisse.</p></div>
          </aside>
        </section>
      </div>
    </div>
  );
}
