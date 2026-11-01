import { createContext, FormEvent, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { getBrowserStorageItem, setBrowserStorageItem } from '@/lib/browserStorage';
import { DEFAULT_SITE_ID, type SiteId } from '@/lib/sites';
import {
  fetchSuiviAccessProfile,
  isSupabaseAuthConfigured,
  signInWithPassword,
  signOut,
  SuiviAccessProfile,
  SupabaseAuthSession,
  validateAuthSession,
} from '@/services/supabaseAuth';
import { loadSitesRegistry } from '@/services/supabaseSites';

type AuthGateProps = {
  children: ReactNode;
};

const activeSiteStorageKey = (userId: string) => `suivi-gestion:active-site:user:${userId}`;

const resolveActiveSiteId = (userId: string, siteIds: SiteId[]): SiteId => {
  const stored = getBrowserStorageItem(activeSiteStorageKey(userId));
  if (stored && (siteIds as string[]).includes(stored)) return stored as SiteId;
  return siteIds.includes(DEFAULT_SITE_ID) ? DEFAULT_SITE_ID : siteIds[0];
};

// Session active + déconnexion, exposées aux pages qui veulent afficher un contrôle de
// déconnexion à un endroit précis de leur mise en page (voir Home.tsx) — plus de bouton
// flottant global affiché sur toutes les pages.
// accessProfile/activeSiteId : branche multi-site — siteIds vient de suivi_gestion_user_site_access
// (ou tous les sites pour super_admin/global_admin), activeSiteId est mémorisé par utilisateur.
type AuthSessionContextValue = {
  session: SupabaseAuthSession;
  signOut: () => void;
  accessProfile: SuiviAccessProfile;
  activeSiteId: SiteId;
  setActiveSiteId: (siteId: SiteId) => void;
};

// Exporté pour les tests (rendu de pages consommatrices sans passer par tout AuthGate).
export const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function useAuthSession(): AuthSessionContextValue {
  const context = useContext(AuthSessionContext);
  if (!context) throw new Error('useAuthSession doit être utilisé à l\'intérieur d\'AuthGate.');
  return context;
}

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#4b1f14] text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-8">
        {children}
      </div>
    </div>
  );
}

function AuthLoading() {
  return (
    <AuthShell>
      <div className="rounded-3xl bg-white/10 px-8 py-6 text-center shadow-2xl backdrop-blur">
        <div className="text-sm uppercase tracking-[0.3em] text-yellow-200">Hippopotamus</div>
        <div className="mt-3 text-xl font-semibold">Verification de la session...</div>
      </div>
    </AuthShell>
  );
}

function AuthLogin({
  onAuthenticated, error: externalError,
}: { onAuthenticated: (session: SupabaseAuthSession) => Promise<void>; error: string | null }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const session = await signInWithPassword(email.trim(), password);
      await onAuthenticated(session);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Connexion impossible.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayedError = error || externalError;

  return (
    <AuthShell>
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white text-slate-900 shadow-2xl lg:grid-cols-[1fr_1.1fr]">
        <div className="bg-gradient-to-br from-[#7a2f18] via-[#b6461d] to-[#f2a51a] p-8 text-white lg:p-10">
          <div className="text-sm uppercase tracking-[0.35em] text-yellow-100">Hippopotamus</div>
          <h1 className="mt-8 text-4xl font-black leading-tight">Suivi de gestion</h1>
          <p className="mt-4 max-w-sm text-base text-orange-50">
            Connexion obligatoire avant d'acceder aux chiffres, imports et sauvegardes Supabase.
          </p>
          <div className="mt-10 rounded-2xl bg-black/15 p-4 text-sm text-orange-50">
            Les donnees de l'application ne sont chargees qu'apres validation de la session.
          </div>
        </div>

        <form className="p-8 lg:p-10" onSubmit={handleSubmit}>
          <h2 className="text-2xl font-bold text-slate-950">Connexion</h2>
          <p className="mt-2 text-sm text-slate-600">Utilise le compte cree dans Supabase Auth.</p>

          {!isSupabaseAuthConfigured && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Authentification Supabase non configuree dans Vercel.
            </div>
          )}

          <label className="mt-6 block text-sm font-semibold text-slate-700" htmlFor="auth-email">
            Email
          </label>
          <input
            id="auth-email"
            autoComplete="email"
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            disabled={isSubmitting || !isSupabaseAuthConfigured}
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />

          <label className="mt-5 block text-sm font-semibold text-slate-700" htmlFor="auth-password">
            Mot de passe
          </label>
          <input
            id="auth-password"
            autoComplete="current-password"
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            disabled={isSubmitting || !isSupabaseAuthConfigured}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />

          {displayedError && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {displayedError}
            </div>
          )}

          <button
            className="mt-7 w-full rounded-2xl bg-[#b6461d] px-4 py-3 font-bold text-white shadow-lg transition hover:bg-[#963616] disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={isSubmitting || !isSupabaseAuthConfigured}
            type="submit"
          >
            {isSubmitting ? 'Connexion...' : 'Entrer dans l\'application'}
          </button>
        </form>
      </div>
    </AuthShell>
  );
}

function AuthenticatedApp({
  children, session, accessProfile, activeSiteId, onSignOut, onChangeSite,
}: AuthGateProps & {
  session: SupabaseAuthSession;
  accessProfile: SuiviAccessProfile;
  activeSiteId: SiteId;
  onSignOut: () => void;
  onChangeSite: (siteId: SiteId) => void;
}) {
  return (
    <AuthSessionContext.Provider value={{
      session, signOut: onSignOut, accessProfile, activeSiteId, setActiveSiteId: onChangeSite,
    }}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export default function AuthGate({ children }: AuthGateProps) {
  const [session, setSession] = useState<SupabaseAuthSession | null>(null);
  const [accessProfile, setAccessProfile] = useState<SuiviAccessProfile | null>(null);
  const [activeSiteId, setActiveSiteId] = useState<SiteId | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Charge le rôle et les sites autorisés, puis active la session seulement si cette
  // étape réussit : un compte sans accès à aucun site ne doit jamais entrer dans l'appli.
  const activateSession = useCallback(async (nextSession: SupabaseAuthSession) => {
    // Le registre des sites doit être chargé avant le profil : les admins reçoivent « tous les sites ».
    await loadSitesRegistry();
    const profile = await fetchSuiviAccessProfile(nextSession);
    if (profile.siteIds.length === 0) {
      throw new Error('Ce compte n\'a accès à aucun site. Contacte un administrateur Suivi de gestion.');
    }
    const userId = nextSession.user?.id || '';
    const resolvedSiteId = resolveActiveSiteId(userId, profile.siteIds);
    setSession(nextSession);
    setAccessProfile(profile);
    setActiveSiteId(resolvedSiteId);
    setLoginError(null);
  }, []);

  useEffect(() => {
    let isMounted = true;

    validateAuthSession()
      .then(async (activeSession) => {
        if (!isMounted) return;
        if (!activeSession) {
          setSession(null);
          return;
        }
        await activateSession(activeSession);
      })
      .catch(() => {
        if (isMounted) {
          setSession(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activateSession]);

  const handleAuthenticated = async (nextSession: SupabaseAuthSession) => {
    try {
      await activateSession(nextSession);
    } catch (error) {
      await signOut();
      setLoginError(error instanceof Error ? error.message : 'Accès refusé.');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setSession(null);
    setAccessProfile(null);
    setActiveSiteId(null);
  };

  // Changer de site recharge entièrement la page plutôt que de basculer l'état React à chaud :
  // tout le cache local et les abonnements cloud de DataContext supposent un site stable pendant
  // la vie du composant (voir DataContext.tsx), et un rechargement garantit un état propre.
  const handleChangeSite = (siteId: SiteId) => {
    if (siteId === activeSiteId) return;
    if (session?.user?.id) {
      setBrowserStorageItem(activeSiteStorageKey(session.user.id), siteId);
    }
    window.location.reload();
  };

  if (isCheckingSession) {
    return <AuthLoading />;
  }

  if (!session || !accessProfile || !activeSiteId) {
    return <AuthLogin onAuthenticated={handleAuthenticated} error={loginError} />;
  }

  return (
    <AuthenticatedApp
      session={session}
      accessProfile={accessProfile}
      activeSiteId={activeSiteId}
      onSignOut={handleSignOut}
      onChangeSite={handleChangeSite}
    >
      {children}
    </AuthenticatedApp>
  );
}
