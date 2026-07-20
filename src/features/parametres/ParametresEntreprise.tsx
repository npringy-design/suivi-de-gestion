import { useState, useCallback, useRef } from 'react';
import {
  ArrowLeft, Building2, ShoppingCart, CreditCard, Smartphone, Wallet, Banknote,
  ShoppingBag, Store, Package, FileText, Receipt, Coins, Truck, UtensilsCrossed,
  Coffee, Wine, Star, Tag, Zap, Clock, BarChart2, Beef, Sparkles,
  Plus, Trash2, GripVertical, ChevronDown, ChevronUp, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { useData } from '@/contexts/DataContext';
import type { CompanySettings, PurchaseSection, PurchaseSupplier } from '@/contexts/DataContext';
import type { CaisseSysteme, CaisseColumn } from '@/types/dataTypes';
import { MONTH_NAMES_FULL } from '@/features/parametres/companySettingsDefaults';

type Props = { onBack: () => void };

// ─── Styles ──────────────────────────────────────────────────────────────────

const CARD = 'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm';
const CARD_HEADER = 'flex items-center gap-3 border-b border-slate-100 px-5 py-4 bg-gradient-to-r from-[#0f4c5c] to-[#0c3d4a]';
const CARD_TITLE = 'text-base font-black text-white';
const LABEL = 'text-[10px] font-black uppercase tracking-[0.18em] text-slate-500';
const INPUT = [
  'w-full rounded-lg border border-slate-200 bg-white',
  'px-3 py-2 text-sm font-semibold text-slate-800',
  'outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 placeholder:text-slate-400',
].join(' ');
const BTN_TEAL = [
  'flex items-center gap-1.5 rounded-lg px-3 py-1.5',
  'bg-gradient-to-r from-[#0d9488] to-[#0f766e]',
  'text-xs font-black text-white shadow-sm transition hover:brightness-110',
].join(' ');

// ─── Icônes ───────────────────────────────────────────────────────────────────

const ICON_OPTIONS: { key: string; label: string }[] = [
  { key: 'CreditCard',      label: 'Carte bancaire' },
  { key: 'Smartphone',      label: 'Mobile' },
  { key: 'Wallet',          label: 'Portefeuille' },
  { key: 'Banknote',        label: 'Billet' },
  { key: 'ShoppingBag',     label: 'Sac de courses' },
  { key: 'Store',           label: 'Boutique' },
  { key: 'Package',         label: 'Colis' },
  { key: 'FileText',        label: 'Document' },
  { key: 'Receipt',         label: 'Ticket de caisse' },
  { key: 'Coins',           label: 'Pièces' },
  { key: 'Building2',       label: 'Bâtiment' },
  { key: 'Truck',           label: 'Livraison' },
  { key: 'UtensilsCrossed', label: 'Couverts' },
  { key: 'Coffee',          label: 'Café' },
  { key: 'Wine',            label: 'Vin' },
  { key: 'Star',            label: 'Étoile' },
  { key: 'Tag',             label: 'Étiquette' },
  { key: 'Zap',             label: 'Énergie' },
  { key: 'Clock',           label: 'Horloge' },
  { key: 'BarChart2',       label: 'Graphique' },
];

const ICON_MAP: Record<string, LucideIcon> = {
  CreditCard, Smartphone, Wallet, Banknote, ShoppingBag, Store, Package, FileText,
  Receipt, Coins, Building2, Truck, UtensilsCrossed, Coffee, Wine, Star, Tag, Zap,
  Clock, BarChart2, Beef, Sparkles, ShoppingCart,
};

function CaisseIcon({ name, cls }: { name: string; cls?: string }) {
  const Icon = ICON_MAP[name] ?? CreditCard;
  return <Icon className={cls ?? 'h-4 w-4'} />;
}

// ─── Palette de couleurs ──────────────────────────────────────────────────────

const COLOR_PALETTE = [
  { value: '#0d9488', label: 'Teal' },
  { value: '#3b82f6', label: 'Bleu' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#ec4899', label: 'Rose' },
  { value: '#f97316', label: 'Orange' },
  { value: '#f59e0b', label: 'Ambre' },
  { value: '#10b981', label: 'Vert' },
  { value: '#ef4444', label: 'Rouge' },
];

// ─── IconPicker ───────────────────────────────────────────────────────────────

function IconPicker({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  return (
    <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-8 sm:gap-1.5">
      {ICON_OPTIONS.map(({ key, label }) => {
        const selected = value === key;
        const Icon = ICON_MAP[key] ?? CreditCard;
        return (
          <button
            key={key}
            type="button"
            title={label}
            onClick={() => onChange(key)}
            className={[
              'flex h-10 w-10 items-center justify-center rounded-lg border-2 transition-all duration-100',
              selected
                ? 'border-[#0d9488] bg-[rgba(13,148,136,0.1)] text-[#0d9488]'
                : 'border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8] hover:bg-[#f0fdfa] hover:border-[#99f6e4]',
            ].join(' ')}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}

// ─── ColorPicker ─────────────────────────────────────────────────────────────

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {COLOR_PALETTE.map(c => (
        <button
          key={c.value}
          type="button"
          title={c.label}
          onClick={() => onChange(c.value)}
          className={[
            'h-[30px] w-[30px] rounded-full border-[3px] transition-all duration-100',
            value === c.value ? 'scale-[1.15] border-slate-900' : 'border-transparent hover:scale-110',
          ].join(' ')}
          style={{ background: c.value }}
        />
      ))}
    </div>
  );
}

// ─── Modale création système ──────────────────────────────────────────────────

type ColType = 'calculAuto' | 'saisie' | 'ecartCalc' | 'commentaire';
type ColSource = 'ca_ht' | 'couverts' | 'libre';

type NewSysColumn = {
  id: string;
  name: string;
  type: ColType;
  source?: ColSource;
  colA?: string;
  colB?: string;
};

const COL_TYPE_LABELS: Record<ColType, string> = {
  calculAuto:  'Calculé auto',
  saisie:      'Saisie manuelle',
  ecartCalc:   'Écart calculé',
  commentaire: 'Commentaire',
};

const COL_SOURCE_LABELS: Record<ColSource, string> = {
  ca_ht:    'CA HT du jour (suivi quotidien)',
  couverts: 'Nombre de couverts',
  libre:    'Valeur libre',
};

const DEFAULT_RECO_COLUMNS: NewSysColumn[] = [
  { id: 'col_theorique', name: 'CA Théorique',  type: 'calculAuto', source: 'ca_ht' },
  { id: 'col_reel',      name: 'Réel encaissé', type: 'saisie' },
  { id: 'col_ecart',     name: 'Écart',         type: 'ecartCalc', colA: 'col_theorique', colB: 'col_reel' },
];

type NewSysForm = {
  name: string;
  description: string;
  icon: string;
  color: string;
  inputType: 'daily' | 'reconciliation';
  columns: NewSysColumn[];
};

const SEL_CLS = 'rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-700 outline-none focus:border-teal-400 transition';

function NewSystemModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (sys: CaisseSysteme) => void;
}) {
  const [form, setForm] = useState<NewSysForm>({
    name: '', description: '', icon: 'CreditCard', color: '#0d9488',
    inputType: 'daily',
    columns: DEFAULT_RECO_COLUMNS.map(c => ({ ...c })),
  });
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const updateCol = (id: string, patch: Partial<NewSysColumn>) =>
    setForm(f => ({ ...f, columns: f.columns.map(c => c.id === id ? { ...c, ...patch } : c) }));

  const removeCol = (id: string) =>
    setForm(f => ({ ...f, columns: f.columns.filter(c => c.id !== id) }));

  const addCol = () =>
    setForm(f => ({
      ...f,
      columns: [...f.columns, { id: 'col_' + Date.now(), name: 'Nouvelle colonne', type: 'saisie' as const }],
    }));

  const reorder = (from: number, to: number) => {
    const arr = [...form.columns];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    setForm(f => ({ ...f, columns: arr }));
  };

  const handleCreate = () => {
    if (!form.name.trim()) return;
    onCreate({
      id: 'sys_' + Date.now(),
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      icon: form.icon,
      accentColor: form.color,
      custom: true,
      inputType: form.inputType,
      columns: form.inputType === 'reconciliation' ? (form.columns as CaisseColumn[]) : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" style={{ maxHeight: '92vh' }}>

        {/* En-tête sombre */}
        <div className="shrink-0 px-6 py-5" style={{ background: 'linear-gradient(135deg, #07111f, #0a2430, #073d43)' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-black text-white">Nouveau système d'encaissement</h3>
              <p className="mt-0.5 text-xs" style={{ color: 'rgba(165,243,252,0.6)' }}>
                Configurez l'identité, le type de tableau et les colonnes.
              </p>
            </div>
            <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 text-white/40 transition hover:text-white/90">
              <X className="h-4 w-4" />
            </button>
          </div>
          {/* Prévisualisation */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: form.color + '33', color: form.color }}>
              <CaisseIcon name={form.icon} cls="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-black text-white">{form.name || <span className="opacity-40">Nom du système</span>}</div>
              {form.description && <div className="truncate text-xs" style={{ color: 'rgba(165,243,252,0.6)' }}>{form.description}</div>}
            </div>
          </div>
        </div>

        {/* Corps scrollable */}
        <div className="flex flex-col gap-5 overflow-y-auto px-6 py-5">

          {/* Identité */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <div className={LABEL}>Nom *</div>
              <input className={INPUT} placeholder="Ex. : Lyf Pay" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className={LABEL}>Description courte</div>
              <input className={INPUT} placeholder="Optionnel" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>

          {/* Icône */}
          <div className="flex flex-col gap-2">
            <div className={LABEL}>Icône</div>
            <IconPicker value={form.icon} onChange={icon => setForm(f => ({ ...f, icon }))} />
          </div>

          {/* Couleur */}
          <div className="flex flex-col gap-2">
            <div className={LABEL}>Couleur d'accent</div>
            <ColorPicker value={form.color} onChange={color => setForm(f => ({ ...f, color }))} />
          </div>

          {/* Type de tableau */}
          <div className="flex flex-col gap-2">
            <div className={LABEL}>Type de tableau</div>
            <div className="flex gap-3">
              {([
                { value: 'daily',         label: 'Montant journalier', desc: 'Idéal : espèces, pourboires, petite caisse.' },
                { value: 'reconciliation', label: 'Rapprochement',      desc: 'Idéal : CB, tickets resto, livraison.' },
              ] as const).map(opt => (
                <div
                  key={opt.value}
                  onClick={() => setForm(f => ({ ...f, inputType: opt.value }))}
                  className={[
                    'flex-1 cursor-pointer rounded-xl border-2 p-4 transition-all',
                    form.inputType === opt.value
                      ? 'border-[#0d9488] bg-[rgba(13,148,136,0.06)]'
                      : 'border-slate-200 hover:border-slate-300',
                  ].join(' ')}
                >
                  <div className={`text-sm font-black ${form.inputType === opt.value ? 'text-[#0d9488]' : 'text-slate-800'}`}>
                    {opt.label}
                  </div>
                  <div className="mt-1 text-[11px] leading-snug text-slate-400">{opt.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Colonnes */}
          {form.inputType === 'reconciliation' && (
            <div className="flex flex-col gap-2">
              <div className={LABEL}>Colonnes du tableau</div>
              <div className="flex flex-col gap-1.5">
                {form.columns.map((col, i) => (
                  <div
                    key={col.id}
                    draggable
                    onDragStart={() => setDragIdx(i)}
                    onDragOver={e => { e.preventDefault(); if (dragIdx !== i) setDragOverIdx(i); }}
                    onDragLeave={() => setDragOverIdx(null)}
                    onDrop={e => {
                      e.preventDefault();
                      if (dragIdx !== null && dragIdx !== i) reorder(dragIdx, i);
                      setDragIdx(null); setDragOverIdx(null);
                    }}
                    onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                    className={[
                      'rounded-lg border p-2 transition-all',
                      dragOverIdx === i && dragIdx !== i ? 'border-teal-500 bg-teal-50/50' : 'border-slate-200 bg-slate-50',
                      dragIdx === i ? 'opacity-40' : '',
                    ].join(' ')}
                  >
                    {/* Ligne principale */}
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-slate-300 active:cursor-grabbing" />
                      <input
                        className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-300"
                        value={col.name}
                        onChange={e => updateCol(col.id, { name: e.target.value })}
                        placeholder="Nom de la colonne"
                      />
                      <select
                        className={SEL_CLS}
                        value={col.type}
                        onChange={e => {
                          const t = e.target.value as ColType;
                          updateCol(col.id, {
                            type: t,
                            source: t === 'calculAuto' ? 'ca_ht' : undefined,
                            colA: undefined,
                            colB: undefined,
                          });
                        }}
                      >
                        {(Object.entries(COL_TYPE_LABELS) as [ColType, string][]).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => { if (form.columns.length > 2) removeCol(col.id); }}
                        disabled={form.columns.length <= 2}
                        className="shrink-0 rounded p-1 text-slate-300 disabled:opacity-20 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {/* Source (calculAuto) */}
                    {col.type === 'calculAuto' && (
                      <div className="ml-6 mt-1.5 flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Source</span>
                        <select className={SEL_CLS} value={col.source ?? 'ca_ht'}
                          onChange={e => updateCol(col.id, { source: e.target.value as ColSource })}>
                          {(Object.entries(COL_SOURCE_LABELS) as [ColSource, string][]).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {/* Colonnes A − B (ecartCalc) */}
                    {col.type === 'ecartCalc' && (
                      <div className="ml-6 mt-1.5 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">A</span>
                        <select className={SEL_CLS} value={col.colA ?? ''}
                          onChange={e => updateCol(col.id, { colA: e.target.value })}>
                          <option value="">— choisir —</option>
                          {form.columns.filter(c => c.id !== col.id).map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <span className="text-xs font-black text-slate-400">−</span>
                        <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">B</span>
                        <select className={SEL_CLS} value={col.colB ?? ''}
                          onChange={e => updateCol(col.id, { colB: e.target.value })}>
                          <option value="">— choisir —</option>
                          {form.columns.filter(c => c.id !== col.id).map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ))}
                <button onClick={addCol}
                  className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-400 hover:border-teal-400 hover:text-teal-600">
                  <Plus className="h-3.5 w-3.5" /> Ajouter une colonne
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Pied */}
        <div className="shrink-0 flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Annuler
          </button>
          <button
            onClick={handleCreate}
            disabled={!form.name.trim()}
            className="rounded-lg bg-gradient-to-r from-[#f59e0b] to-[#d97706] px-5 py-2 text-sm font-black text-white shadow-sm disabled:opacity-40"
          >
            Créer le système
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Section 1 : Identité ─────────────────────────────────────────────────────

type GeoResult = { name: string; admin1: string } | null | 'error';

function SectionIdentite({ settings, onChange }: {
  settings: CompanySettings;
  onChange: (s: CompanySettings) => void;
}) {
  const [geoResult, setGeoResult] = useState<GeoResult>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolveGeo = useCallback(async (city: string) => {
    if (!city.trim()) { setGeoResult(null); return; }
    setGeoLoading(true);
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=fr`,
      );
      const json: { results?: { name: string; admin1: string; latitude: number; longitude: number }[] } = await res.json();
      const hit = json.results?.[0];
      if (hit) {
        setGeoResult({ name: hit.name, admin1: hit.admin1 });
        onChange({ ...settings, locationName: city, weatherLat: hit.latitude, weatherLon: hit.longitude });
      } else {
        setGeoResult('error');
      }
    } catch {
      setGeoResult('error');
    } finally {
      setGeoLoading(false);
    }
  }, [settings, onChange]);

  const handleLocationChange = (value: string) => {
    onChange({ ...settings, locationName: value });
    setGeoResult(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => resolveGeo(value), 800);
  };

  return (
    <div className={CARD}>
      <div className={CARD_HEADER}>
        <Building2 className="h-4 w-4 text-teal-300" />
        <span className={CARD_TITLE}>Identité du site</span>
      </div>
      <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <div className={LABEL}>Enseigne</div>
          <input className={INPUT} value={settings.companyName}
            onChange={e => onChange({ ...settings, companyName: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className={LABEL}>Localisation</div>
          <input className={INPUT} value={settings.locationName}
            onChange={e => handleLocationChange(e.target.value)} />
          {geoLoading && <p className="text-[10px] text-slate-400">Recherche en cours…</p>}
          {geoResult === 'error' && <p className="text-[10px] text-red-500">Ville introuvable — coordonnées météo inchangées.</p>}
          {geoResult && geoResult !== 'error' && (
            <p className="text-[10px] text-emerald-600">✓ Météo : {geoResult.name}, {geoResult.admin1}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <div className={LABEL}>Exercice fiscal — mois de début</div>
          <select className={INPUT} value={settings.fiscalStart}
            onChange={e => onChange({ ...settings, fiscalStart: Number(e.target.value) })}>
            {MONTH_NAMES_FULL.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

// ─── Section 2 : Sections d'achats ────────────────────────────────────────────

function SupplierRow({ supplier, onChangeName, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: {
  supplier: PurchaseSupplier;
  onChangeName: (name: string) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <GripVertical className="h-3.5 w-3.5 shrink-0 text-slate-300" />
      <input
        className="flex-1 bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400 focus:text-slate-900"
        value={supplier.name}
        onChange={e => onChangeName(e.target.value)}
      />
      <div className="flex shrink-0 gap-0.5">
        <button disabled={isFirst} onClick={onMoveUp} className="rounded p-1 text-slate-400 disabled:opacity-20 hover:text-slate-700"><ChevronUp className="h-3 w-3" /></button>
        <button disabled={isLast} onClick={onMoveDown} className="rounded p-1 text-slate-400 disabled:opacity-20 hover:text-slate-700"><ChevronDown className="h-3 w-3" /></button>
        <button
          onClick={() => {
            if (window.confirm(`Supprimer "${supplier.name}" ? Les données saisies seront masquées (non supprimées).`)) {
              onDelete();
            }
          }}
          className="rounded p-1 text-slate-300 hover:text-red-500"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function SectionAchatsCard({ section, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: {
  section: PurchaseSection;
  onChange: (s: PurchaseSection) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editingName, setEditingName] = useState(false);
  const [editingIcon, setEditingIcon] = useState(false);
  const SectionIcon = ICON_MAP[section.icon ?? ''] ?? ShoppingCart;

  const addSupplier = () => {
    onChange({ ...section, suppliers: [...section.suppliers, { id: 'sup_' + Date.now(), name: 'Nouveau fournisseur', storeColumn: null }] });
  };

  const updateSupplier = (idx: number, name: string) => {
    onChange({ ...section, suppliers: section.suppliers.map((s, i) => i === idx ? { ...s, name } : s) });
  };

  const deleteSupplier = (idx: number) => {
    onChange({ ...section, suppliers: section.suppliers.filter((_, i) => i !== idx) });
  };

  const moveSupplier = (idx: number, dir: -1 | 1) => {
    const arr = [...section.suppliers];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    onChange({ ...section, suppliers: arr });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <button
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-600 transition hover:bg-teal-200"
          onClick={() => setEditingIcon(e => !e)}
          title="Changer l'icône"
        >
          <SectionIcon className="h-4 w-4" />
        </button>
        {editingName ? (
          <input
            className="flex-1 rounded border border-teal-300 bg-white px-2 py-1 text-sm font-black text-slate-800 outline-none"
            value={section.name}
            onChange={e => onChange({ ...section, name: e.target.value })}
            onBlur={() => setEditingName(false)}
            onKeyDown={e => { if (e.key === 'Enter') setEditingName(false); }}
          />
        ) : (
          <button className="flex-1 text-left text-sm font-black text-slate-800 hover:text-teal-600"
            onClick={() => setEditingName(true)}>
            {section.name}
          </button>
        )}
        <div className="flex gap-0.5">
          <button disabled={isFirst} onClick={onMoveUp} className="rounded p-1 text-slate-400 disabled:opacity-20 hover:text-slate-700"><ChevronUp className="h-3.5 w-3.5" /></button>
          <button disabled={isLast} onClick={onMoveDown} className="rounded p-1 text-slate-400 disabled:opacity-20 hover:text-slate-700"><ChevronDown className="h-3.5 w-3.5" /></button>
          <button
            onClick={() => {
              if (window.confirm(`Supprimer la section "${section.name}" et ses ${section.suppliers.length} fournisseur(s) ? Les données seront masquées.`)) {
                onDelete();
              }
            }}
            className="rounded p-1 text-slate-300 hover:text-red-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {editingIcon && (
        <div className="mb-3 rounded-lg border border-slate-200 bg-white p-3">
          <IconPicker
            value={section.icon ?? 'ShoppingCart'}
            onChange={icon => { onChange({ ...section, icon }); setEditingIcon(false); }}
          />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        {section.suppliers.map((sup, idx) => (
          <SupplierRow
            key={sup.id}
            supplier={sup}
            onChangeName={name => updateSupplier(idx, name)}
            onDelete={() => deleteSupplier(idx)}
            onMoveUp={() => moveSupplier(idx, -1)}
            onMoveDown={() => moveSupplier(idx, 1)}
            isFirst={idx === 0}
            isLast={idx === section.suppliers.length - 1}
          />
        ))}
        <button onClick={addSupplier}
          className="mt-1 flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-400 transition hover:border-teal-400 hover:text-teal-600">
          <Plus className="h-3.5 w-3.5" /> Ajouter un fournisseur
        </button>
      </div>
    </div>
  );
}

function SectionAchats({ settings, onChange }: {
  settings: CompanySettings;
  onChange: (s: CompanySettings) => void;
}) {
  const addSection = () => {
    onChange({ ...settings, purchaseSections: [...settings.purchaseSections, { id: 'sec_' + Date.now(), name: 'Nouvelle section', suppliers: [] }] });
  };

  const updateSection = (idx: number, section: PurchaseSection) => {
    onChange({ ...settings, purchaseSections: settings.purchaseSections.map((s, i) => i === idx ? section : s) });
  };

  const deleteSection = (idx: number) => {
    onChange({ ...settings, purchaseSections: settings.purchaseSections.filter((_, i) => i !== idx) });
  };

  const moveSection = (idx: number, dir: -1 | 1) => {
    const arr = [...settings.purchaseSections];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    onChange({ ...settings, purchaseSections: arr });
  };

  return (
    <div className={CARD}>
      <div className={CARD_HEADER}>
        <ShoppingCart className="h-4 w-4 text-teal-300" />
        <span className={CARD_TITLE}>Sections d'achats (coût matière)</span>
      </div>
      <div className="flex flex-col gap-3 p-5">
        {settings.purchaseSections.map((section, idx) => (
          <SectionAchatsCard
            key={section.id}
            section={section}
            onChange={s => updateSection(idx, s)}
            onDelete={() => deleteSection(idx)}
            onMoveUp={() => moveSection(idx, -1)}
            onMoveDown={() => moveSection(idx, 1)}
            isFirst={idx === 0}
            isLast={idx === settings.purchaseSections.length - 1}
          />
        ))}
        <button onClick={addSection} className={BTN_TEAL}>
          <Plus className="h-3.5 w-3.5" /> Ajouter une section
        </button>
      </div>
    </div>
  );
}

// ─── Section 3 : Systèmes d'encaissement ─────────────────────────────────────

function SystemeRow({ sys, onChange, onDelete }: {
  sys: CaisseSysteme;
  onChange: (s: CaisseSysteme) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      <div className="flex items-center gap-3 px-3 py-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{ background: sys.accentColor + '22', color: sys.accentColor }}>
          <CaisseIcon name={sys.icon} cls="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <input
            className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none"
            value={sys.name}
            onChange={e => onChange({ ...sys, name: e.target.value })}
          />
          {sys.description && <div className="truncate text-[11px] text-slate-400">{sys.description}</div>}
        </div>
        {sys.custom && (
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black text-amber-700">personnalisé</span>
        )}
        {sys.inputType === 'reconciliation' && (
          <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-black text-violet-700">rapprochement</span>
        )}
        <button onClick={() => setExpanded(e => !e)} className="rounded p-1 text-slate-400 hover:text-slate-700">
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={() => {
            if (window.confirm(`Supprimer "${sys.name}" ? Les données saisies seront masquées.`)) {
              onDelete();
            }
          }}
          className="rounded p-1 text-slate-300 hover:text-red-500"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {expanded && (
        <div className="flex flex-col gap-3 border-t border-slate-200 bg-white p-3">
          <div className="flex flex-col gap-1.5">
            <div className={LABEL}>Icône</div>
            <IconPicker value={sys.icon} onChange={icon => onChange({ ...sys, icon })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className={LABEL}>Couleur d'accent</div>
            <ColorPicker value={sys.accentColor} onChange={accentColor => onChange({ ...sys, accentColor })} />
          </div>
        </div>
      )}
    </div>
  );
}

function SectionSystemesEncaissement({ settings, onChange }: {
  settings: CompanySettings;
  onChange: (s: CompanySettings) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const systemes = settings.caisseSystemes ?? [];

  const handleCreate = (sys: CaisseSysteme) => {
    onChange({ ...settings, caisseSystemes: [...systemes, sys] });
  };

  const updateSysteme = (idx: number, sys: CaisseSysteme) => {
    onChange({ ...settings, caisseSystemes: systemes.map((s, i) => i === idx ? sys : s) });
  };

  const deleteSysteme = (idx: number) => {
    onChange({ ...settings, caisseSystemes: systemes.filter((_, i) => i !== idx) });
  };

  return (
    <>
      {showModal && <NewSystemModal onClose={() => setShowModal(false)} onCreate={handleCreate} />}
      <div className={CARD}>
        <div className={CARD_HEADER}>
          <CreditCard className="h-4 w-4 text-teal-300" />
          <span className={CARD_TITLE}>Systèmes d'encaissement</span>
        </div>
        <div className="p-5">
          <div className="mb-4 flex flex-col gap-2">
            {systemes.map((sys, idx) => (
              <SystemeRow
                key={sys.id}
                sys={sys}
                onChange={s => updateSysteme(idx, s)}
                onDelete={() => deleteSysteme(idx)}
              />
            ))}
          </div>
          <button onClick={() => setShowModal(true)} className={BTN_TEAL}>
            <Plus className="h-3.5 w-3.5" /> Nouveau système personnalisé
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ParametresEntreprise({ onBack }: Props) {
  const { companySettings, updateCompanySettings } = useData();
  const [local, setLocal] = useState<CompanySettings>(companySettings);
  const [saved, setSaved] = useState(false);

  const prevRemoteRef = useRef(companySettings);
  if (prevRemoteRef.current !== companySettings && !saved) {
    prevRemoteRef.current = companySettings;
    setLocal(prev => ({ ...companySettings, ...prev }));
  }

  const handleSave = useCallback(() => {
    updateCompanySettings(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [local, updateCompanySettings]);

  return (
    <div className="min-h-screen p-4 sm:p-6" style={{ background: '#f8fafc' }}>
      <div className="mx-auto flex max-w-[1100px] flex-col gap-5">

        <header className="overflow-hidden rounded-3xl border border-cyan-200/15 bg-[rgba(6,31,40,0.9)] p-5 shadow-xl">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={onBack}
              className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-cyan-50 ring-1 ring-white/15 transition hover:bg-white/20"
              aria-label="Retour accueil"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <div className="text-xs font-black uppercase tracking-[0.24em] text-cyan-100/60">Paramétrage</div>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-amber-50">Paramètres Entreprise</h1>
              <p className="mt-2 text-sm font-medium text-cyan-50/70">
                Identité du site, sections d'achats, systèmes d'encaissement — utilisés par le Suivi Quotidien V2.
              </p>
            </div>
            <button
              onClick={handleSave}
              className={[
                'mt-1 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black shadow-lg transition',
                saved
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-[#0d9488] to-[#0f766e] text-white hover:brightness-110',
              ].join(' ')}
            >
              {saved ? '✓ Sauvegardé' : 'Sauvegarder'}
            </button>
          </div>
        </header>

        <SectionIdentite settings={local} onChange={setLocal} />
        <SectionAchats settings={local} onChange={setLocal} />
        <SectionSystemesEncaissement settings={local} onChange={setLocal} />

      </div>
    </div>
  );
}
