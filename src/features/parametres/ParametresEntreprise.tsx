import { useState, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Building2,
  ShoppingCart,
  CreditCard,
  Smartphone,
  Wallet,
  Banknote,
  ShoppingBag,
  Store,
  Package,
  FileText,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Wine,
  Beef,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { useData } from '@/contexts/DataContext';
import type { CompanySettings, PurchaseSection, PurchaseSupplier } from '@/contexts/DataContext';
import type { CaisseSysteme } from '@/types/dataTypes';
import { MONTH_NAMES_FULL, CAISSE_ICON_OPTIONS } from '@/features/parametres/companySettingsDefaults';

type Props = { onBack: () => void };

// ─── Styles communs ──────────────────────────────────────────────────────────

const CARD = 'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm';
const CARD_HEADER = 'flex items-center gap-3 border-b border-slate-100 px-5 py-4 bg-gradient-to-r from-[#0f4c5c] to-[#0c3d4a]';
const CARD_TITLE = 'text-base font-black text-white';
const LABEL = 'text-[10px] font-black uppercase tracking-[0.18em] text-slate-500';
const INPUT = [
  'w-full rounded-lg border border-slate-200 bg-white',
  'px-3 py-2 text-sm font-semibold text-slate-800',
  'outline-none transition',
  'focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20',
  'placeholder:text-slate-400',
].join(' ');
const BTN_TEAL = [
  'flex items-center gap-1.5 rounded-lg px-3 py-1.5',
  'bg-gradient-to-r from-[#0d9488] to-[#0f766e]',
  'text-xs font-black text-white shadow-sm',
  'transition hover:brightness-110',
].join(' ');

// ─── Icon maps ────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  CreditCard, Smartphone, Wallet, Banknote, ShoppingBag, Store, Package, FileText,
  Wine, Beef, Sparkles,
};

function CaisseIcon({ name, cls }: { name: string; cls?: string }) {
  const Icon = ICON_MAP[name] ?? CreditCard;
  return <Icon className={cls ?? 'h-4 w-4'} />;
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
          <input
            className={INPUT}
            value={settings.companyName}
            onChange={e => onChange({ ...settings, companyName: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className={LABEL}>Localisation</div>
          <input
            className={INPUT}
            value={settings.locationName}
            onChange={e => handleLocationChange(e.target.value)}
          />
          {geoLoading && <p className="text-[10px] text-slate-400">Recherche en cours…</p>}
          {geoResult === 'error' && <p className="text-[10px] text-red-500">Ville introuvable — coordonnées météo inchangées.</p>}
          {geoResult && geoResult !== 'error' && (
            <p className="text-[10px] text-emerald-600">
              ✓ Météo : {geoResult.name}, {geoResult.admin1}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <div className={LABEL}>Exercice fiscal — mois de début</div>
          <select
            className={INPUT}
            value={settings.fiscalStart}
            onChange={e => onChange({ ...settings, fiscalStart: Number(e.target.value) })}
          >
            {MONTH_NAMES_FULL.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
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
  const SectionIcon = ICON_MAP[section.icon ?? ''] ?? ShoppingCart;

  const addSupplier = () => {
    const id = 'sup_' + Date.now();
    onChange({ ...section, suppliers: [...section.suppliers, { id, name: 'Nouveau fournisseur', storeColumn: null }] });
  };

  const updateSupplier = (idx: number, name: string) => {
    const next = section.suppliers.map((s, i) => i === idx ? { ...s, name } : s);
    onChange({ ...section, suppliers: next });
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
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-600">
          <SectionIcon className="h-4 w-4" />
        </div>
        {editingName ? (
          <input
            autoFocus
            className="flex-1 rounded border border-teal-300 bg-white px-2 py-1 text-sm font-black text-slate-800 outline-none"
            value={section.name}
            onChange={e => onChange({ ...section, name: e.target.value })}
            onBlur={() => setEditingName(false)}
            onKeyDown={e => { if (e.key === 'Enter') setEditingName(false); }}
          />
        ) : (
          <button
            className="flex-1 text-left text-sm font-black text-slate-800 hover:text-teal-600"
            onClick={() => setEditingName(true)}
          >
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
        <button onClick={addSupplier} className="mt-1 flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-400 transition hover:border-teal-400 hover:text-teal-600">
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
    const id = 'sec_' + Date.now();
    onChange({ ...settings, purchaseSections: [...settings.purchaseSections, { id, name: 'Nouvelle section', suppliers: [] }] });
  };

  const updateSection = (idx: number, section: PurchaseSection) => {
    const next = settings.purchaseSections.map((s, i) => i === idx ? section : s);
    onChange({ ...settings, purchaseSections: next });
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

const COLOR_OPTIONS = [
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#f59e0b', label: 'Ambre' },
  { value: '#10b981', label: 'Émeraude' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#ef4444', label: 'Rouge' },
  { value: '#3b82f6', label: 'Bleu' },
];

function SystemeRow({ sys, onChange, onDelete }: {
  sys: CaisseSysteme;
  onChange: (s: CaisseSysteme) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: sys.accentColor + '22' }}>
        <CaisseIcon name={sys.icon} cls="h-4 w-4" />
      </div>
      <input
        className="flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none"
        value={sys.name}
        onChange={e => onChange({ ...sys, name: e.target.value })}
      />
      {sys.custom && (
        <span className="shrink-0 rounded-full bg-teal-100 px-2 py-0.5 text-[9px] font-black text-teal-700">personnalisé</span>
      )}
      <select
        className="rounded border border-slate-200 bg-white px-1 py-1 text-xs text-slate-600 outline-none"
        value={sys.icon}
        onChange={e => onChange({ ...sys, icon: e.target.value })}
      >
        {CAISSE_ICON_OPTIONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
      </select>
      <select
        className="rounded border border-slate-200 bg-white px-1 py-1 text-xs text-slate-600 outline-none"
        value={sys.accentColor}
        onChange={e => onChange({ ...sys, accentColor: e.target.value })}
      >
        {COLOR_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>
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
  );
}

function SectionSystemesEncaissement({ settings, onChange }: {
  settings: CompanySettings;
  onChange: (s: CompanySettings) => void;
}) {
  const systemes = settings.caisseSystemes ?? [];

  const addSysteme = () => {
    const id = 'sys_' + Date.now();
    const newSys: CaisseSysteme = { id, name: 'Nouveau système', icon: 'CreditCard', accentColor: '#06b6d4', custom: true };
    onChange({ ...settings, caisseSystemes: [...systemes, newSys] });
  };

  const updateSysteme = (idx: number, sys: CaisseSysteme) => {
    const next = systemes.map((s, i) => i === idx ? sys : s);
    onChange({ ...settings, caisseSystemes: next });
  };

  const deleteSysteme = (idx: number) => {
    onChange({ ...settings, caisseSystemes: systemes.filter((_, i) => i !== idx) });
  };

  return (
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
        <button onClick={addSysteme} className={BTN_TEAL}>
          <Plus className="h-3.5 w-3.5" /> Nouveau système personnalisé
        </button>
      </div>
    </div>
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

        {/* Header — reste sombre */}
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
