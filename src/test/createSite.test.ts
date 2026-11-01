import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildSiteBootstrapState, bootstrapSiteState, createSite, type CreateSiteDeps } from '@/features/sites/createSite';
import {
  getSiteBrand, getSiteIds, getSiteLabel, normalizeSiteIds, pickUniqueSiteSlug, registerSite, setSitesRegistry,
  slugifySiteLabel,
} from '@/lib/sites';
import { canCreateSites } from '@/lib/suiviPermissions';

const EXISTING_SITES = ['hippo_thillois', 'hippo_cormontreuil'];

afterEach(() => {
  setSitesRegistry([]);
});

describe('slug de site', () => {
  it('génère un kebab-case sans accent et gère les collisions', () => {
    expect(slugifySiteLabel("  Au Bureau Épernay !! ")).toBe('au-bureau-epernay');
    expect(pickUniqueSiteSlug('au-bureau', new Set(['au-bureau', 'au-bureau-2']))).toBe('au-bureau-3');
    expect(pickUniqueSiteSlug('nouveau', new Set(EXISTING_SITES))).toBe('nouveau');
  });
});

describe('registre de sites', () => {
  it('garde les sites historiques par défaut et accepte un site créé', () => {
    expect(getSiteIds()).toEqual(EXISTING_SITES);
    registerSite({ siteId: 'au-bureau-reims', label: 'Au Bureau Reims', brand: 'au_bureau' });
    expect(getSiteLabel('au-bureau-reims')).toBe('Au Bureau Reims');
    expect(getSiteBrand('au-bureau-reims')).toBe('au_bureau');
    expect(normalizeSiteIds(['au-bureau-reims', 'inconnu', 'hippo_thillois'])).toEqual(['hippo_thillois', 'au-bureau-reims']);
  });

  it('repli explicite sur hippo pour un site inconnu', () => {
    expect(getSiteBrand('inconnu')).toBe('hippo');
    expect(getSiteLabel('inconnu')).toBe('inconnu');
  });
});

describe('garde de création de site', () => {
  it('réservée au super_admin actif', () => {
    expect(canCreateSites({ role: 'super_admin' })).toBe(true);
    expect(canCreateSites({ role: 'super_admin', is_active: false })).toBe(false);
    expect(canCreateSites({ role: 'global_admin' })).toBe(false);
    expect(canCreateSites({ role: 'user' })).toBe(false);
    expect(canCreateSites(null)).toBe(false);
  });
});

describe('createSite', () => {
  const makeDeps = (taken: string[]): CreateSiteDeps & { calls: string[] } => {
    const calls: string[] = [];
    return {
      calls,
      fetchTakenIds: async () => new Set(taken),
      insert: async ({ siteId, label, brand }) => { calls.push(`insert:${siteId}`); return { siteId, label, brand }; },
      bootstrap: async (siteId) => { calls.push(`bootstrap:${siteId}`); },
    };
  };

  it('insère puis initialise, avec un identifiant unique', async () => {
    const deps = makeDeps([...EXISTING_SITES, 'au-bureau-reims']);
    const site = await createSite({ label: 'Au Bureau Reims', brand: 'au_bureau' }, deps);
    expect(site.siteId).toBe('au-bureau-reims-2');
    expect(deps.calls).toEqual(['insert:au-bureau-reims-2', 'bootstrap:au-bureau-reims-2']);
    expect(getSiteIds()).toContain('au-bureau-reims-2');
  });

  it('refuse un nom vide ou trop court sans rien écrire', async () => {
    const deps = makeDeps(EXISTING_SITES);
    await expect(createSite({ label: '  ', brand: 'hippo' }, deps)).rejects.toThrow();
    await expect(createSite({ label: 'A!', brand: 'hippo' }, deps)).rejects.toThrow();
    expect(deps.calls).toEqual([]);
  });
});

describe('bootstrap : aucun accès aux sites existants', () => {
  const NEW_SITE = 'site-de-test';
  let requests: Array<{ url: string; method: string; body: string }>;

  beforeEach(() => {
    requests = [];
    vi.resetModules();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      requests.push({ url: String(url), method, body: String(init?.body ?? '') });
      const payload = method === 'GET' ? [] : [{ value: {}, updated_at: null }];
      return new Response(JSON.stringify(payload), { status: 200 });
    }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("n'écrit et ne lit que des clés (site_id, key) du nouveau site", async () => {
    const { bootstrapSiteState: bootstrap } = await import('@/features/sites/createSite');
    await bootstrap(NEW_SITE, 'Site de test');

    expect(requests.length).toBeGreaterThan(0);
    const writes = requests.filter(request => request.method !== 'GET');
    expect(writes.length).toBeGreaterThan(0);
    writes.forEach(request => {
      expect(JSON.parse(request.body).site_id).toBe(NEW_SITE);
    });
    requests.filter(request => request.method === 'GET').forEach(request => {
      expect(request.url).toContain(`site_id=eq.${NEW_SITE}`);
    });
    const everything = requests.map(request => `${request.url} ${request.body}`).join('\n');
    EXISTING_SITES.forEach(siteId => expect(everything).not.toContain(siteId));
  });

  it('refuse un identifiant vide ou invalide (jamais de repli sur le site par défaut)', async () => {
    const save = vi.fn();
    await expect(bootstrapSiteState('', 'Vide', save)).rejects.toThrow();
    await expect(bootstrapSiteState('Hippo_Thillois', 'Casse', save)).rejects.toThrow();
    expect(save).not.toHaveBeenCalled();
  });

  it('prépare des structures vides propres au site', () => {
    const state = buildSiteBootstrapState('Site de test');
    expect(state.allData).toEqual({});
    expect(state.customEvents).toEqual([]);
    expect((state.companySettings as { companyName: string }).companyName).toBe('Site de test');
  });
});
