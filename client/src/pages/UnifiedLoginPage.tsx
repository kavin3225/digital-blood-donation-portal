import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FormEvent } from 'react';
import { Droplet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RoleType } from '../types';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const studentDashboard = (role: RoleType) => role === 'Donor' ? '/dashboard/donor' : role === 'Requester' ? '/dashboard/requester' : '/dashboard/both';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: { client_id: string; callback: (response: { credential: string }) => void; hd: string }) => void;
          renderButton: (element: HTMLElement, options: Record<string, string | number | boolean>) => void;
        };
      };
    };
  }
}

export const UnifiedLoginPage: React.FC = () => {
  const { user, loginWithGoogle, loginWithPassword } = useAuth();
  const navigate = useNavigate();
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const hasGoogleClientId = Boolean(googleClientId && googleClientId.endsWith('.apps.googleusercontent.com'));

  useEffect(() => {
    if (user?.systemRole === 'admin') navigate('/admin', { replace: true });
    else if (user?.systemRole === 'coordinator') navigate('/coordinator', { replace: true });
    else if (user) navigate(studentDashboard(user.portalRole || user.selectedRole), { replace: true });
  }, [user, navigate]);

  const handlePasswordLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await loginWithPassword(email, password);
      const account = result.user;
      if (account?.systemRole === 'admin') navigate('/admin', { replace: true });
      else if (account?.systemRole === 'coordinator') navigate('/coordinator', { replace: true });
      else navigate(studentDashboard(account?.portalRole || account?.selectedRole || 'Both'), { replace: true });
    } catch (cause: any) {
      setError(cause.message || 'Login failed. Check your email and password.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!hasGoogleClientId || !googleButtonRef.current) return;

    let timer: number | undefined;
    const mountGoogleButton = () => {
      if (!window.google?.accounts.id || !googleButtonRef.current) return false;
      window.google.accounts.id.initialize({
        client_id: googleClientId!,
        hd: 'bitsathy.ac.in',
        callback: async ({ credential }) => {
          setBusy(true);
          setError('');
          try {
            const result = await loginWithGoogle(credential);
            const account = result.user;
            if (account?.systemRole === 'admin') navigate('/admin', { replace: true });
            else if (account?.systemRole === 'coordinator') navigate('/coordinator', { replace: true });
            else navigate(studentDashboard(account?.portalRole || account?.selectedRole || 'Both'), { replace: true });
          } catch (cause: any) {
            setError(cause.message || 'Sign in with your Google account failed.');
          } finally {
            setBusy(false);
          }
        },
      });
      googleButtonRef.current.replaceChildren();
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: 'standard', theme: 'outline', size: 'large', shape: 'rectangular', text: 'continue_with', width: 340,
      });
      return true;
    };

    if (!mountGoogleButton()) {
      timer = window.setInterval(() => {
        if (mountGoogleButton() && timer) window.clearInterval(timer);
      }, 100);
    }
    return () => { if (timer) window.clearInterval(timer); };
  }, [hasGoogleClientId, loginWithGoogle, navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#dce5f5] via-[#f4f2ff] to-[#e4e8f8] px-4 py-8">
      <section className="w-full max-w-lg rounded-[28px] border border-white/80 bg-white px-7 py-9 text-center shadow-[0_28px_70px_rgba(55,48,110,0.2)] sm:px-10">
        <h1 className="mb-7 flex items-center justify-center gap-3 text-left">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-rose-100 to-violet-100 shadow-inner">
            <Droplet className="h-7 w-7 fill-rose-600 text-rose-700" aria-hidden="true" />
          </span>
          <span className="leading-tight">
            <span className="block bg-gradient-to-r from-rose-700 via-violet-700 to-indigo-700 bg-clip-text text-xl font-extrabold tracking-tight text-transparent sm:text-2xl">Digital Blood</span>
            <span className="mt-1 block text-sm font-semibold tracking-[0.16em] text-[#343b59] uppercase">Donation Portal</span>
          </span>
        </h1>
        <form onSubmit={handlePasswordLogin} className="space-y-4 text-left">
          <label className="block text-sm font-medium text-slate-800">Email
            <input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter your email" className="mt-1.5 w-full rounded-lg border border-[#dfe4f1] bg-[#f0f2f9] px-3 py-2.5 text-sm font-normal outline-none transition focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-100" />
          </label>
          <label className="block text-sm font-medium text-slate-800">Password
            <input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" className="mt-1.5 w-full rounded-lg border border-[#dfe4f1] bg-[#f0f2f9] px-3 py-2.5 text-sm font-normal outline-none transition focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-100" />
          </label>
          <button disabled={busy} className="w-full rounded-lg bg-gradient-to-r from-[#783bea] to-[#6440ee] px-4 py-2.5 text-base font-semibold text-white shadow-md shadow-violet-300/40 transition hover:brightness-95 disabled:opacity-60">{busy ? 'Signing in…' : 'Login'}</button>
        </form>
        <div className="my-4 flex items-center gap-3 text-xs text-slate-500"><span className="h-px flex-1 bg-slate-200" /><span>Or</span><span className="h-px flex-1 bg-slate-200" /></div>
        <div className="flex min-h-11 justify-center">
          {hasGoogleClientId ? (
            <div ref={googleButtonRef} aria-label="Sign in with Google" />
          ) : (
            <button type="button" disabled className="flex w-full cursor-not-allowed items-center justify-center gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-400">
              <GoogleMark /> Sign in with Google
            </button>
          )}
        </div>

        {!hasGoogleClientId && <p className="mt-2 text-center text-xs text-amber-700">Google sign-in needs an OAuth client ID configuration.</p>}
        {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      </section>
      {busy && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm" role="status" aria-live="polite">
          <div className="surface-enter w-full max-w-xs rounded-3xl border border-white/70 bg-white/95 p-7 text-center shadow-2xl shadow-slate-950/20">
            <div className="relative mx-auto mb-4 grid h-16 w-16 place-items-center">
              <span className="absolute inset-0 rounded-full border-4 border-violet-100 border-t-violet-600 animate-spin motion-reduce:animate-none" />
              <Droplet className="h-7 w-7 animate-pulse fill-rose-600 text-rose-700 motion-reduce:animate-none" aria-hidden="true" />
            </div>
            <p className="text-base font-bold text-slate-800">Signing you in</p>
            <p className="mt-1 text-sm text-slate-500">Verifying your account securely…</p>
          </div>
        </div>
      )}
    </main>
  );
};

const GoogleMark: React.FC = () => (
  <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(0 4)" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.73 7.18l7.66 5.95c4.48-4.14 7.11-10.24 7.11-17.6Z" />
    <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.88.93 7.55 2.56 10.78l7.97-6.19Z" transform="translate(0 4)" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.66-5.95c-2.13 1.43-4.86 2.27-8.24 2.27-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
  </svg>
);

export default UnifiedLoginPage;
