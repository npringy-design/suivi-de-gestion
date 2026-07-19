import { useState, useCallback } from 'react';
import {
  ArrowLeft,
  Building2,
  ShoppingCart,
  Users,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import { useData } from '@/contexts/DataContext';
import type { CompanySettings, PurchaseSection, PurchaseSupplier } from '@/contexts/DataContext';
import { MONTH_NAMES_FULL, PERSONNEL_RATE_LABELS } from '@/features/parametres/companySettingsDefaults';
import { parseMoneyValue } from '@/lib/money';

type Props = { onBack: () => void };

// ─── Styles communs ──────────────────────────────────────────────────────────

const CARD = 'overflow-hidden rounded-2xl border border-cyan-200/15 bg-[rgba(6,31,40,0.8)] shadow-lg';
const CARD_HEADER = 'flex items-center gap-3 border-b border-cyan-200/10 px-5 py-4';
const CARD_TITLE = 'text-base font-black text-amber-50';
const LABEL = 'text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/60';
const INPUT = [
  'w-full rounded-lg border border-cyan-200/20 bg-[rgba(6,31,40,0.6)]',
  'px-3 py-2 text-sm font-semibold text-amber-50',
  'outline-none transition',
  'focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20',
  'placeholder:text-cyan-100/30',
].join(' ');
const BTN_AMBER = [
  'flex items-center gap-1.5 rounded-lg px-3 py-1.5',
  'bg-gradient-to-r from-[#f59e0b] to-[#d97706]',
  'text-xs font-black text-white shadow-md',
  'transition hover:brightness-110',
].join(' ');
// ─── Section 1 : Identité ─────────────────────────────────────────────────────

function SectionIdentite({ settings, onChange }: {
  settings: CompanySettings;
  onChange: (s: CompanySettings) => void;
}) {
  return (
    <div className={CARD}>
      <div className={CARD_HEADER}>
        <Building2 className="h-4 w-4 text-cyan-300" />
        <span className={CARD_TITLE}>Identité du site</span>
      </div>
      <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <div className={LABEL}>Enseigne</div>
          <input
            className={INPUT}
            value={settings.enseigne}
            onChange={e => onChange({ ...settings, enseigne: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className={LABEL}>Localisation</div>
          <input
            className={INPUT}
            value={settings.localisation}
            onChange={e => onChange({ ...settings, localisation: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className={LABEL}>Exercice fiscal — mois de début</div>
          <select
            className={INPUT}
            value={settings.exerciceFiscalStart}
            onChange={e => onChange({ ...settings, exerciceFiscalStart: Number(e.target.value) })}
          >
            {MONTH_NAMES_FULL.map((m, i) => (
              <option key={i} value={i} style={{ background: '#07111f' }}>{m}</option>
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
    <div className="flex items-center gap-2 rounded-lg border border-cyan-200/10 bg-[rgba(6,31,40,0.4)] px-3 py-2">
      <GripVertical className="h-3.5 w-3.5 shrink-0 text-cyan-100/30" />
      <input
        className="flex-1 bg-transparent text-sm font-semibold text-amber-50/90 outline-none placeholder:text-cyan-100/30 focus:text-amber-50"
        value={supplier.name}
        onChange={e => onChangeName(e.target.value)}
      />
      <div className="flex shrink-0 gap-0.5">
        <button disabled={isFirst} onClick={onMoveUp} className="rounded p-1 text-cyan-100/40 disabled:opacity-20 hover:text-cyan-100">
          <ChevronUp className="h-3 w-3" />
        </button>
        <button disabled={isLast} onClick={onMoveDown} className="rounded p-1 text-cyan-100/40 disabled:opacity-20 hover:text-cyan-100">
          <ChevronDown className="h-3 w-3" />
        </button>
        <button onClick={onDelete} className="rounded p-1 text-cyan-100/30 hover:text-red-400">
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
    <div className="rounded-xl border border-cyan-200/10 bg-[rgba(6,31,40,0.5)] p-4">
      <div className="mb-3 flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-cyan-100/30" />
        <input
          className="flex-1 bg-transparent text-sm font-black text-amber-50 outline-none placeholder:text-cyan-100/30"
          value={section.name}
          onChange={e => onChange({ ...section, name: e.target.value })}
          placeholder="Nom de la section"
        />
        <div className="flex gap-0.5">
          <button disabled={isFirst} onClick={onMoveUp} className="rounded p-1 text-cyan-100/40 disabled:opacity-20 hover:text-cyan-100"><ChevronUp className="h-3.5 w-3.5" /></button>
          <button disabled={isLast} onClick={onMoveDown} className="rounded p-1 text-cyan-100/40 disabled:opacity-20 hover:text-cyan-100"><ChevronDown className="h-3.5 w-3.5" /></button>
          <button onClick={onDelete} className="rounded p-1 text-cyan-100/30 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
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
        <button onClick={addSupplier} className="mt-1 flex items-center gap-1.5 rounded-lg border border-dashed border-cyan-200/20 px-3 py-2 text-xs font-semibold text-cyan-100/50 transition hover:border-cyan-200/40 hover:text-cyan-100/80">
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
        <ShoppingCart className="h-4 w-4 text-cyan-300" />
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
        <button onClick={addSection} className={BTN_AMBER}>
          <Plus className="h-3.5 w-3.5" /> Ajouter une section
        </button>
      </div>
    </div>
  );
}

// ─── Section 3 : Grille salariale ────────────────────────────────────────────

const CATEGORY_KEYS = ['cadre', 'maitrise', 'niv12', 'niv3', 'apprenti'] as const;

function SectionGrilleSalariale({ settings, onChange }: {
  settings: CompanySettings;
  onChange: (s: CompanySettings) => void;
}) {
  return (
    <div className={CARD}>
      <div className={CARD_HEADER}>
        <Users className="h-4 w-4 text-cyan-300" />
        <span className={CARD_TITLE}>Grille salariale</span>
      </div>
      <div className="p-5">
        {/* Mode selector */}
        <div className="mb-5 flex flex-col gap-2">
          <span className={LABEL}>Mode de calcul des frais de personnel</span>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'categories' as const, label: 'Par catégorie' },
              { value: 'average' as const, label: 'Taux moyen unique', disabled: true },
              { value: 'import' as const, label: 'Import paie', disabled: true },
            ].map(({ value, label, disabled }) => (
              <button
                key={value}
                disabled={disabled}
                onClick={() => !disabled && onChange({ ...settings, personnelRateMode: value })}
                className={[
                  'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-black transition',
                  settings.personnelRateMode === value
                    ? 'bg-gradient-to-r from-[#078892] to-[#0f5d66] text-white shadow-md'
                    : 'border border-cyan-200/15 text-cyan-100/60 hover:border-cyan-200/30',
                  disabled ? 'cursor-not-allowed opacity-50' : '',
                ].join(' ')}
              >
                {label}
                {disabled && (
                  <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-black text-amber-400">bientôt</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Taux par catégorie */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {CATEGORY_KEYS.map(cat => (
            <div key={cat} className="flex flex-col gap-1.5">
              <label className={LABEL}>{PERSONNEL_RATE_LABELS[cat]}</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  className={INPUT + ' pr-8'}
                  value={settings.personnelRates[cat]}
                  onChange={e => onChange({
                    ...settings,
                    personnelRates: { ...settings.personnelRates, [cat]: parseMoneyValue(e.target.value) },
                  })}
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-cyan-100/40">€/h</span>
              </div>
            </div>
          ))}
        </div>

        {/* Autres réglages */}
        <div className="grid grid-cols-1 gap-4 border-t border-cyan-200/10 pt-5 sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onChange({ ...settings, splitCuisineSalle: !settings.splitCuisineSalle })}
              className={[
                'relative h-6 w-11 rounded-full transition',
                settings.splitCuisineSalle ? 'bg-gradient-to-r from-[#078892] to-[#0f5d66]' : 'bg-cyan-100/15',
              ].join(' ')}
            >
              <span className={[
                'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
                settings.splitCuisineSalle ? 'left-[calc(100%-22px)]' : 'left-0.5',
              ].join(' ')} />
            </button>
            <span className="text-sm font-semibold text-cyan-100/80">Séparation Cuisine / Salle</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="objectif-frais" className={LABEL}>Objectif frais de personnel</label>
            <div className="relative">
              <input
                id="objectif-frais"
                type="number"
                step="0.1"
                className={INPUT + ' pr-6'}
                value={settings.objectifFraisPersonnel}
                onChange={e => onChange({ ...settings, objectifFraisPersonnel: parseMoneyValue(e.target.value) })}
              />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-cyan-100/40">%</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="productivite-cible" className={LABEL}>Productivité cible</label>
            <div className="relative">
              <input
                id="productivite-cible"
                type="number"
                step="0.01"
                className={INPUT + ' pr-8'}
                value={settings.productiviteCible}
                onChange={e => onChange({ ...settings, productiviteCible: parseMoneyValue(e.target.value) })}
              />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-cyan-100/40">€/h</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ParametresEntreprise({ onBack }: Props) {
  const { companySettings, updateCompanySettings } = useData();
  const [local, setLocal] = useState<CompanySettings>(companySettings);
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(() => {
    updateCompanySettings(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [local, updateCompanySettings]);

  return (
    <div
      className="min-h-screen p-4 sm:p-6"
      style={{ background: 'linear-gradient(135deg, #07111f 0%, #0a2430 50%, #073d43 100%)' }}
    >
      <div className="mx-auto flex max-w-[1100px] flex-col gap-5">

        {/* Header */}
        <header className="overflow-hidden rounded-3xl border border-cyan-200/15 bg-[rgba(6,31,40,0.8)] p-5 shadow-xl">
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
                Identité du site, sections d'achats et grille salariale — utilisés par le Suivi Quotidien V2.
              </p>
            </div>
            <button
              onClick={handleSave}
              className={[
                'mt-1 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black shadow-lg transition',
                saved
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white hover:brightness-110',
              ].join(' ')}
            >
              {saved ? '✓ Sauvegardé' : 'Sauvegarder'}
            </button>
          </div>
        </header>

        <SectionIdentite settings={local} onChange={setLocal} />
        <SectionAchats settings={local} onChange={setLocal} />
        <SectionGrilleSalariale settings={local} onChange={setLocal} />

      </div>
    </div>
  );
}
