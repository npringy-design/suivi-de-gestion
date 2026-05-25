import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Copy, Plus, RotateCcw, Save, Search, Trash2 } from 'lucide-react';

type AccountingCategory =
  | 'Chiffre d’affaires'
  | 'TVA'
  | 'Paiement'
  | 'Écart'
  | 'Ajustement';

type AccountingMappingRow = {
  id: string;
  active: boolean;
  category: AccountingCategory;
  caisseItem: string;
  company: string;
  debitAccount: string;
  creditAccount: string;
  accountingLabel: string;
  rule: string;
  tolerance: string;
  keywords: string;
  notes: string;
};

type ParametrageComptableProps = {
  onBack: () => void;
};

const STORAGE_KEY = 'parametrage_comptable_v1';

const CATEGORIES: AccountingCategory[] = ['Chiffre d’affaires', 'TVA', 'Paiement', 'Écart', 'Ajustement'];

const DEFAULT_MAPPINGS: AccountingMappingRow[] = [
  {
    id: 'ca-ht-5-5',
    active: true,
    category: 'Chiffre d’affaires',
    caisseItem: 'CA HT TVA 5,5 %',
    company: 'Caisse',
    debitAccount: '',
    creditAccount: '707015',
    accountingLabel: 'CAISSE',
    rule: 'Ventes HT rattachées au taux 5,5 %.',
    tolerance: '0,01',
    keywords: 'CA 5,5; TVA 5,5; vente 5,5',
    notes: 'Compte à confirmer avec le cabinet comptable.',
  },
  {
    id: 'ca-ht-10',
    active: true,
    category: 'Chiffre d’affaires',
    caisseItem: 'CA HT TVA 10 %',
    company: 'Caisse',
    debitAccount: '',
    creditAccount: '707010',
    accountingLabel: 'CAISSE',
    rule: 'Ventes HT rattachées au taux 10 %.',
    tolerance: '0,01',
    keywords: 'CA 10; TVA 10; couvert; restaurant',
    notes: 'Souvent le cœur du CA restaurant.',
  },
  {
    id: 'ca-ht-20',
    active: true,
    category: 'Chiffre d’affaires',
    caisseItem: 'CA HT TVA 20 %',
    company: 'Caisse',
    debitAccount: '',
    creditAccount: '707020',
    accountingLabel: 'CAISSE',
    rule: 'Ventes HT rattachées au taux 20 %.',
    tolerance: '0,01',
    keywords: 'CA 20; TVA 20; alcool',
    notes: '',
  },
  {
    id: 'tva-5-5',
    active: true,
    category: 'TVA',
    caisseItem: 'TVA collectée 5,5 %',
    company: 'Caisse',
    debitAccount: '',
    creditAccount: '445715',
    accountingLabel: 'CAISSE',
    rule: 'TVA collectée associée aux ventes 5,5 %.',
    tolerance: '0,01',
    keywords: 'TVA 5,5; 445715',
    notes: '',
  },
  {
    id: 'tva-10',
    active: true,
    category: 'TVA',
    caisseItem: 'TVA collectée 10 %',
    company: 'Caisse',
    debitAccount: '',
    creditAccount: '445710',
    accountingLabel: 'CAISSE',
    rule: 'TVA collectée associée aux ventes 10 %.',
    tolerance: '0,01',
    keywords: 'TVA 10; 445710',
    notes: '',
  },
  {
    id: 'tva-20',
    active: true,
    category: 'TVA',
    caisseItem: 'TVA collectée 20 %',
    company: 'Caisse',
    debitAccount: '',
    creditAccount: '445720',
    accountingLabel: 'CAISSE',
    rule: 'TVA collectée associée aux ventes 20 %.',
    tolerance: '0,01',
    keywords: 'TVA 20; 445720',
    notes: '',
  },
  {
    id: 'especes',
    active: true,
    category: 'Paiement',
    caisseItem: 'Espèces',
    company: 'Caisse espèces',
    debitAccount: '531100',
    creditAccount: '',
    accountingLabel: 'CAISSE',
    rule: 'Encaissement espèces du jour.',
    tolerance: '0,01',
    keywords: 'ESPECES; espèces; cash; coffre',
    notes: 'À rapprocher du réel caisse et des écarts justifiés.',
  },
  {
    id: 'cb',
    active: true,
    category: 'Paiement',
    caisseItem: 'Carte bleue',
    company: 'Nepting / CB',
    debitAccount: '511210',
    creditAccount: '',
    accountingLabel: 'CAISSE - CB',
    rule: 'Cartes bancaires classiques.',
    tolerance: '0,01',
    keywords: 'CB; CARTE BLEUE; CARTE BANCAIRE; NEPTING',
    notes: 'Ne pas mélanger avec AMEX si AMEX est suivi à part.',
  },
  {
    id: 'amex',
    active: true,
    category: 'Paiement',
    caisseItem: 'AMEX',
    company: 'American Express',
    debitAccount: '511220',
    creditAccount: '',
    accountingLabel: 'CAISSE - AMEX',
    rule: 'Encaissements AMEX.',
    tolerance: '0,01',
    keywords: 'AMEX; American Express',
    notes: '',
  },
  {
    id: 'ancv',
    active: true,
    category: 'Paiement',
    caisseItem: 'ANCV',
    company: 'ANCV',
    debitAccount: '511200',
    creditAccount: '',
    accountingLabel: 'CAISSE - ANCV',
    rule: 'Chèques vacances papier ou ANCV selon modèle caisse.',
    tolerance: '0,01',
    keywords: 'ANCV; CHEQUE VACANCES; CHÈQUE VACANCES',
    notes: 'À séparer si ANCV papier et ANCV dématérialisé deviennent deux suivis distincts.',
  },
  {
    id: 'tr-papier',
    active: true,
    category: 'Paiement',
    caisseItem: 'Titres restaurant papier',
    company: 'CRT / TR papier',
    debitAccount: '511230',
    creditAccount: '',
    accountingLabel: 'CAISSE - CRT',
    rule: 'Titres restaurant papier remis ou à remettre.',
    tolerance: '0,01',
    keywords: 'TR PAPIER; CRT; EDENRED; PLUXEE; BIMPLI; UP',
    notes: 'Ne pas additionner deux fois avec les cartes TR.',
  },
  {
    id: 'tr-carte',
    active: true,
    category: 'Paiement',
    caisseItem: 'Cartes titres restaurant',
    company: 'Carte TR',
    debitAccount: '511230',
    creditAccount: '',
    accountingLabel: 'CAISSE - TRD',
    rule: 'Cartes TR dématérialisées.',
    tolerance: '0,01',
    keywords: 'CARTE TR; TR CARTE; CARTE EDENRED; CARTE PLUXEE; CARTE BIMPLI; CARTE UP',
    notes: 'Même compte provisoire que TR papier, à confirmer selon plan comptable.',
  },
  {
    id: 'deliveroo',
    active: true,
    category: 'Paiement',
    caisseItem: 'Deliveroo',
    company: 'Deliveroo',
    debitAccount: '511240',
    creditAccount: '',
    accountingLabel: 'CAISSE - DELIVEROO',
    rule: 'Ventes réglées via Deliveroo.',
    tolerance: '0,01',
    keywords: 'DELIVEROO; DELIVEROO WEB',
    notes: '',
  },
  {
    id: 'uber',
    active: true,
    category: 'Paiement',
    caisseItem: 'Uber Eats',
    company: 'Uber',
    debitAccount: '511250',
    creditAccount: '',
    accountingLabel: 'CAISSE - UBER',
    rule: 'Ventes réglées via Uber Eats.',
    tolerance: '0,01',
    keywords: 'UBER; UBEREATS; UBER EATS; UBEREATS WEB',
    notes: '',
  },
  {
    id: 'sunday',
    active: true,
    category: 'Paiement',
    caisseItem: 'Sunday',
    company: 'Sunday',
    debitAccount: '511260',
    creditAccount: '',
    accountingLabel: 'CAISSE - SUNDAY',
    rule: 'Paiement Sunday ou TPE Sunday.',
    tolerance: '0,01',
    keywords: 'SUNDAY; TPE SUNDAY; SUNDAY TPE; SUNDAY MANUEL',
    notes: '',
  },
  {
    id: 'click-collect',
    active: true,
    category: 'Paiement',
    caisseItem: 'Click & Collect / Mango Pay',
    company: 'Mango Pay',
    debitAccount: '511270',
    creditAccount: '',
    accountingLabel: 'CAISSE - MANGO PAY',
    rule: 'Flux Click & Collect ou paiement web.',
    tolerance: '0,01',
    keywords: 'MANGO PAY; CLICK COLLECT; CLICK & COLLECT; WEB',
    notes: 'Libellé à adapter selon le nom exact de la feuille caisse.',
  },
  {
    id: 'pourboires',
    active: true,
    category: 'Ajustement',
    caisseItem: 'Pourboires',
    company: 'Pourboire',
    debitAccount: '511280',
    creditAccount: '',
    accountingLabel: 'POURBOIRE',
    rule: 'Ligne de pourboire isolée du CA.',
    tolerance: '0,01',
    keywords: 'POURBOIRE; TIPS',
    notes: 'À confirmer : le sens peut changer selon le modèle comptable.',
  },
  {
    id: 'ecart-negatif',
    active: true,
    category: 'Écart',
    caisseItem: 'Écart caisse négatif',
    company: 'Écart caisse',
    debitAccount: '658000',
    creditAccount: '',
    accountingLabel: 'ECART CAISSE',
    rule: 'Charge ou perte de caisse.',
    tolerance: '0,05',
    keywords: 'ECART; ÉCART; MANQUANT; PERTE',
    notes: 'À utiliser seulement si l’écart est validé/justifié.',
  },
  {
    id: 'ecart-positif',
    active: true,
    category: 'Écart',
    caisseItem: 'Écart caisse positif',
    company: 'Écart caisse',
    debitAccount: '',
    creditAccount: '758000',
    accountingLabel: 'ECART CAISSE',
    rule: 'Produit ou excédent de caisse.',
    tolerance: '0,05',
    keywords: 'ECART; ÉCART; EXCEDENT; EXCÉDENT; GAIN',
    notes: 'À utiliser seulement si l’écart est validé/justifié.',
  },
];

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `mapping-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const createEmptyRow = (): AccountingMappingRow => ({
  id: createId(),
  active: true,
  category: 'Paiement',
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

const loadRows = (): AccountingMappingRow[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_MAPPINGS;
    const parsed = JSON.parse(saved) as AccountingMappingRow[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_MAPPINGS;
  } catch {
    return DEFAULT_MAPPINGS;
  }
};

export default function ParametrageComptable({ onBack }: ParametrageComptableProps) {
  const [rows, setRows] = useState<AccountingMappingRow[]>(loadRows);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'Tous' | AccountingCategory>('Tous');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    } catch {
      // Le paramétrage reste utilisable même si le navigateur bloque localStorage.
    }
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
    setRows(DEFAULT_MAPPINGS);
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
              <button
                type="button"
                onClick={onBack}
                className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-cyan-50 ring-1 ring-white/15 transition hover:bg-white/20"
                aria-label="Retour accueil"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <div className="text-xs font-black uppercase tracking-[0.24em] text-cyan-100/70">Paramétrage</div>
                <h1 className="mt-1 text-3xl font-black tracking-tight text-amber-50">Paramétrage comptable</h1>
                <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-cyan-50/78">
                  Table de correspondance entre les rubriques caisse, les compagnies et les comptes comptables attendus. Les colonnes débit et crédit sont séparées pour préparer proprement le futur contrôle de caisse.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-black/20 transition hover:bg-amber-200"
              >
                <Plus className="h-4 w-4" />
                Ajouter une ligne
              </button>
              <button
                type="button"
                onClick={resetDefaults}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-black text-cyan-50 ring-1 ring-white/15 transition hover:bg-white/20"
              >
                <RotateCcw className="h-4 w-4" />
                Réinitialiser
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Lignes actives</div>
            <div className="mt-2 text-3xl font-black text-slate-900">{counters.active}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Comptes débit</div>
            <div className="mt-2 text-3xl font-black text-cyan-800">{counters.debit}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Comptes crédit</div>
            <div className="mt-2 text-3xl font-black text-amber-700">{counters.credit}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">À compléter</div>
            <div className={`mt-2 text-3xl font-black ${counters.warnings > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{counters.warnings}</div>
          </div>
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
                  <input
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Rechercher..."
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 sm:w-64"
                  />
                </label>
                <select
                  value={categoryFilter}
                  onChange={event => setCategoryFilter(event.target.value as 'Tous' | AccountingCategory)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                >
                  <option value="Tous">Toutes les familles</option>
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="max-h-[67vh] overflow-auto">
              <table className="min-w-[1500px] border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th className={thClass}>Actif</th>
                    <th className={thClass}>Famille</th>
                    <th className={thClass}>Élément caisse</th>
                    <th className={thClass}>Compagnie</th>
                    <th className={thClass}>Compte débit</th>
                    <th className={thClass}>Compte crédit</th>
                    <th className={thClass}>Libellé comptable</th>
                    <th className={thClass}>Règle</th>
                    <th className={thClass}>Tolérance €</th>
                    <th className={thClass}>Mots-clés caisse</th>
                    <th className={thClass}>Notes</th>
                    <th className={`${thClass} text-center`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(row => (
                    <tr key={row.id} className={row.active ? 'bg-white hover:bg-cyan-50/40' : 'bg-slate-50 text-slate-400'}>
                      <td className={`${tdClass} text-center`}>
                        <input
                          type="checkbox"
                          checked={row.active}
                          onChange={event => updateRow(row.id, 'active', event.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-cyan-700 focus:ring-cyan-600"
                        />
                      </td>
                      <td className={tdClass}>
                        <select
                          value={row.category}
                          onChange={event => updateRow(row.id, 'category', event.target.value as AccountingCategory)}
                          className={inputClass}
                        >
                          {CATEGORIES.map(category => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      </td>
                      <td className={tdClass}>
                        <input value={row.caisseItem} onChange={event => updateRow(row.id, 'caisseItem', event.target.value)} className={inputClass} />
                      </td>
                      <td className={tdClass}>
                        <input value={row.company} onChange={event => updateRow(row.id, 'company', event.target.value)} className={inputClass} />
                      </td>
                      <td className={tdClass}>
                        <input value={row.debitAccount} onChange={event => updateRow(row.id, 'debitAccount', event.target.value)} className={`${inputClass} font-black text-cyan-800`} />
                      </td>
                      <td className={tdClass}>
                        <input value={row.creditAccount} onChange={event => updateRow(row.id, 'creditAccount', event.target.value)} className={`${inputClass} font-black text-amber-700`} />
                      </td>
                      <td className={tdClass}>
                        <input value={row.accountingLabel} onChange={event => updateRow(row.id, 'accountingLabel', event.target.value)} className={inputClass} />
                      </td>
                      <td className={tdClass}>
                        <textarea value={row.rule} onChange={event => updateRow(row.id, 'rule', event.target.value)} className={`${inputClass} min-h-[58px] resize-y`} />
                      </td>
                      <td className={tdClass}>
                        <input value={row.tolerance} onChange={event => updateRow(row.id, 'tolerance', event.target.value)} inputMode="decimal" className="w-24 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-center text-xs font-black text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
                      </td>
                      <td className={tdClass}>
                        <textarea value={row.keywords} onChange={event => updateRow(row.id, 'keywords', event.target.value)} className={`${inputClass} min-h-[58px] resize-y`} />
                      </td>
                      <td className={tdClass}>
                        <textarea value={row.notes} onChange={event => updateRow(row.id, 'notes', event.target.value)} className={`${inputClass} min-h-[58px] resize-y`} />
                      </td>
                      <td className={`${tdClass} text-center`}>
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => duplicateRow(row)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800"
                            aria-label="Dupliquer la ligne"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeRow(row.id)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                            aria-label="Supprimer la ligne"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="flex flex-col gap-4">
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-[0.12em] text-amber-900">Point de vigilance</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-amber-950/80">
                    Les comptes proposés sont une base de travail issue du modèle visible sur l’export. Ils doivent être confirmés avec le plan comptable réel avant génération d’écritures.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-[0.12em] text-slate-700">Lecture débit / crédit</h3>
              <div className="mt-4 grid gap-3 text-sm font-medium leading-6 text-slate-600">
                <p><span className="font-black text-cyan-800">Débit</span> : moyens de paiement, caisse espèces, comptes d’attente type 511xxx.</p>
                <p><span className="font-black text-amber-700">Crédit</span> : chiffre d’affaires, TVA collectée, produits ou excédents.</p>
                <p>Une ligne peut rester avec une seule colonne remplie. Le contrôle journalier équilibrera ensuite les totaux débit/crédit.</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em] text-slate-700">
                <Save className="h-4 w-4 text-cyan-700" />
                Sauvegarde
              </div>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
                Pour cette première étape, le paramétrage est local au navigateur. La prochaine étape propre sera de le brancher sur le contrôle caisse et, si besoin, sur une sauvegarde partagée.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
