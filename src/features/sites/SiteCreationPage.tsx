import { FormEvent, useMemo, useState } from 'react';
import { ArrowLeft, Building2, Lock } from 'lucide-react';

import { useAuthSession } from '@/AuthGate';
import { canCreateSites } from '@/lib/suiviPermissions';
import { getSiteLabel, parseSiteBrand, slugifySiteLabel, type SiteBrand, type SiteDefinition } from '@/lib/sites';
import { createSite } from './createSite';
import SiteAccessAssignment from './components/SiteAccessAssignment';

const BRAND_OPTIONS: Array<{ value: SiteBrand; label: string }> = [
  { value: 'hippo', label: 'Hippopotamus' },
  { value: 'au_bureau', label: 'Au Bureau' },
];

export default function SiteCreationPage({ onBack }: { onBack: () => void }) {
  const { accessProfile } = useAuthSession();
  const [label, setLabel] = useState('');
  const [brand, setBrand] = useState<SiteBrand>('hippo');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<SiteDefinition | null>(null);

  const slugPreview = useMemo(() => slugifySiteLabel(label), [label]);

  if (!canCreateSites({ role: accessProfile.role })) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow">
          <Lock className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-sm font-semibold text-slate-700">Création de site réservée au super admin.</p>
          <button type="button" onClick={onBack} className="mt-4 text-sm font-bold text-cyan-700">Retour</button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsCreating(true);
    try {
      setCreated(await createSite({ label, brand }));
      setLabel('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-2xl space-y-6">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-slate-600">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>
        <h1 className="flex items-center gap-2 text-3xl font-black"><Building2 className="h-7 w-7 text-cyan-700" /> Sites</h1>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Créer un site</h2>
          <label className="block text-sm font-semibold text-slate-700">
            Nom affiché
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={label}
              onChange={event => setLabel(event.target.value)}
              maxLength={80}
              required
            />
          </label>
          <p className="text-xs text-slate-500">Identifiant : <code>{slugPreview || '—'}</code> (suffixe ajouté s'il existe déjà)</p>
          <label className="block text-sm font-semibold text-slate-700">
            Enseigne
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={brand}
              onChange={event => setBrand(parseSiteBrand(event.target.value) ?? 'hippo')}
            >
              {BRAND_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <button
            type="submit"
            disabled={isCreating || slugPreview.length < 3}
            className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-bold text-white disabled:bg-slate-300"
          >
            {isCreating ? 'Création…' : 'Créer le site'}
          </button>
        </form>

        {created && (
          <section className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6">
            <h2 className="text-lg font-bold text-emerald-900">« {getSiteLabel(created.siteId)} » créé</h2>
            <p className="text-sm text-slate-600">
              Attribue-le aux comptes utilisateurs (les admins y ont déjà accès). Recharge la page pour le voir dans ton sélecteur de site.
            </p>
            <SiteAccessAssignment />
            <button type="button" onClick={() => window.location.reload()} className="text-sm font-bold text-cyan-700">
              Recharger la page
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
