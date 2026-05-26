import { FormEvent, useEffect, useState } from 'react';

import {
  isSupabaseAuthConfigured,
  signInWithPassword,
  signOut,
  SupabaseAuthSession,
  validateAuthSession,
} from '@/services/supabaseAuth';

type AuthGateProps = {
  children: React.ReactNode;
};

function AuthShell({ children }: { children: React.ReactNode }) {
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

function AuthLogin({ onAuthenticated }: { onAuthenticated: (session: SupabaseAuthSession) => void }) {
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
      onAuthenticated(session);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Connexion impossible.');
    } finally {
      setIsSubmitting(false);
    }
  };

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

          {error && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
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

function AuthenticatedApp({ children, session, onSignOut }: AuthGateProps & { session: SupabaseAuthSession; onSignOut: () => void }) {
  return (
    <>
      {children}
      <button
        className="fixed bottom-4 right-4 z-50 rounded-full border border-white/40 bg-slate-950/75 px-4 py-2 text-xs font-semibold text-white shadow-xl backdrop-blur transition hover:bg-slate-900"
        onClick={onSignOut}
        title={session.user?.email || 'Session active'}
        type="button"
      >
        Deconnexion
      </button>
    </>
  );
}

export default function AuthGate({ children }: AuthGateProps) {
  const [session, setSession] = useState<SupabaseAuthSession | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;

    validateAuthSession()
      .then((activeSession) => {
        if (isMounted) {
          setSession(activeSession);
        }
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
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setSession(null);
  };

  if (isCheckingSession) {
    return <AuthLoading />;
  }

  if (!session) {
    return <AuthLogin onAuthenticated={setSession} />;
  }

  return (
    <AuthenticatedApp session={session} onSignOut={handleSignOut}>
      {children}
    </AuthenticatedApp>
  );
}
