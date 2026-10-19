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
      const buttonWidth = Math.min(450, googleButtonRef.current.parentElement?.clientWidth || 450);
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: 'standard', theme: 'outline', size: 'large', shape: 'rectangular', text: 'continue_with', width: buttonWidth,
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
    <main className="min-h-screen bg-[#f3f4f8] p-0 text-slate-900 sm:grid sm:place-items-center sm:p-6 lg:p-10">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl overflow-hidden bg-white shadow-xl shadow-slate-900/10 sm:min-h-[min(760px,calc(100vh-3rem))] sm:rounded-[30px] lg:grid-cols-2">
        <aside className="relative flex min-h-[250px] flex-col justify-between overflow-hidden bg-gradient-to-br from-[#641b46] via-[#7f174f] to-[#482080] px-6 py-7 text-white sm:min-h-[300px] sm:px-10 sm:py-9 lg:min-h-[680px] lg:px-12 lg:py-12">
          <div className="relative z-10 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/20 bg-white/10">
              <Droplet className="h-6 w-6 fill-rose-300 text-white" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-lg font-extrabold tracking-tight">Digital Blood</span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-100">Donation Portal</span>
            </span>
          </div>

          <div className="relative z-10 mt-8 max-w-md lg:mt-auto lg:pb-4">
            <h1 className="max-w-sm text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-[2.7rem]">Be there when someone needs you.</h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-rose-50/85 sm:text-base">Connect donors, students, and coordinators when every moment matters.</p>
          </div>

          <div className="relative z-10 mt-6 hidden items-center gap-2 text-xs font-medium text-rose-100/80 lg:flex">
            <span className="h-px w-8 bg-rose-200/60" />
            GIVE HOPE <span className="text-rose-300">·</span> SHARE LIFE
          </div>

          <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-24 h-72 w-72 rounded-full border border-white/10 sm:right-[-5rem] sm:top-1/2 sm:h-[27rem] sm:w-[27rem] sm:-translate-y-1/2">
            <div className="absolute inset-7 rounded-full border border-white/10" />
            <div className="absolute inset-16 rounded-full border border-dashed border-white/15" />
            <div className="absolute left-1/2 top-1/2 grid h-28 w-28 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[2rem] border border-white/20 bg-white/10 shadow-2xl shadow-black/10 backdrop-blur-sm">
              <Droplet className="h-16 w-16 fill-rose-300 text-white" />
            </div>
            <span className="absolute left-[18%] top-[29%] h-3 w-3 rounded-full border-2 border-white/70 bg-rose-300" />
            <span className="absolute bottom-[19%] right-[21%] h-2.5 w-2.5 rounded-full bg-fuchsia-200" />
          </div>
          <svg aria-hidden="true" className="pointer-events-none absolute bottom-8 right-0 hidden h-16 w-[56%] opacity-30 lg:block" viewBox="0 0 420 64" fill="none">
            <path d="M0 34h104l16-1 16-17 17 34 19-47 21 48 17-17h210" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </aside>

        <div className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
          <div className="w-full max-w-[450px]">
            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-700">Secure portal access</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Welcome back</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Sign in with your account to continue to the donation portal.</p>
            </div>

            <form onSubmit={handlePasswordLogin} autoComplete="off" className="space-y-5 text-left">
              <label className="block text-sm font-semibold text-slate-700">Email
                <input required type="email" autoComplete="off" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter your email" className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">Password
                <input required type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100" />
              </label>
              <button disabled={busy} className="w-full rounded-xl bg-gradient-to-r from-[#7f174f] to-[#6828a5] px-4 py-3 text-base font-semibold text-white shadow-lg shadow-fuchsia-900/15 transition hover:-translate-y-0.5 hover:brightness-110 disabled:translate-y-0 disabled:opacity-60">{busy ? 'Signing in…' : 'Login'}</button>
            </form>

            <div className="my-6 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" /><span>OR CONTINUE WITH</span><span className="h-px flex-1 bg-slate-200" /></div>
            <div className="flex min-h-11 justify-center">
              {hasGoogleClientId ? (
                <div ref={googleButtonRef} aria-label="Sign in with Google" />
              ) : (
                <button type="button" disabled className="flex w-full cursor-not-allowed items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-400">
                  <GoogleMark /> Sign in with Google
                </button>
              )}
            </div>

            {!hasGoogleClientId && <p className="mt-3 text-center text-xs text-amber-700">Google sign-in needs an OAuth client ID configuration.</p>}
            {error && <p role="alert" className="mt-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
          </div>
        </div>
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
