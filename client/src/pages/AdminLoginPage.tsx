import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, KeyRound, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('bloodadmin@bitsathy.ac.in');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { user, loginWithPassword, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.systemRole === 'admin') navigate('/admin', { replace: true });
  }, [user, navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await loginWithPassword(email, password);
      if (result.user?.systemRole !== 'admin') {
        await logout();
        throw new Error('This account does not have administrator access.');
      }
      navigate('/admin', { replace: true });
    } catch (cause: any) {
      setError(cause.message || 'Could not send the administrator sign-in link.');
    } finally {
      setBusy(false);
    }
  };

  return <main className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden bg-slate-950 px-4 py-14 text-white">
    <div className="pointer-events-none absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(#94a3b8 0.7px, transparent 0.7px)', backgroundSize: '24px 24px' }} />
    <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-rose-900/40 blur-3xl" />
    <div className="relative w-full max-w-md">
      <Link to="/login" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"><ArrowLeft className="h-4 w-4" /> Portal sign in</Link>
      <section className="rounded-3xl border border-white/10 bg-slate-900/90 p-7 shadow-2xl backdrop-blur-xl sm:p-9">
        <div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-rose-700"><ShieldCheck className="h-6 w-6" /></div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-300">Restricted workspace</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Administrator sign in</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">Sign in with the password assigned to your server-allowlisted administrator account.</p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block text-xs font-semibold text-slate-300">Admin college email<input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="bloodadmin@bitsathy.ac.in" className="mt-1.5 w-full rounded-xl border border-white/10 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none focus:ring-4 focus:ring-rose-300/30" /></label>
          <label className="block text-xs font-semibold text-slate-300">Password<input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none focus:ring-4 focus:ring-rose-300/30" /></label>
          {message && <p role="status" className="rounded-xl bg-emerald-950/70 p-3 text-xs leading-5 text-emerald-200">{message}</p>}
          {error && <p role="alert" className="rounded-xl bg-rose-950/70 p-3 text-xs leading-5 text-rose-200">{error}</p>}
          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:opacity-50"><KeyRound className="h-4 w-4" />{busy ? 'Signing in…' : 'Sign in as administrator'}</button>
        </form>
        <p className="mt-5 text-center text-xs leading-5 text-slate-500">Only active accounts on the server admin allowlist can sign in. Admin access is rate limited and logged.</p>
      </section>
    </div>
  </main>;
};

export const AdminEmailLinkPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const started = useRef(false);
  const [message, setMessage] = useState('Verifying your secure sign-in link…');
  const [error, setError] = useState('');

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const email = params.get('email') || '';
    const token = params.get('token') || '';
    if (!email || !token) {
      setError('This sign-in link is incomplete. Request a new one.');
      setMessage('');
      return;
    }
    api.verifyAdminLoginLink({ email, token })
      .then(async () => {
        await refreshUser();
        setMessage('Signed in. Opening the administrator portal…');
        navigate('/admin', { replace: true });
      })
      .catch((cause: any) => {
        setError(cause.message || 'This sign-in link is invalid or expired.');
        setMessage('');
      });
  }, [navigate, params, refreshUser]);

  return <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-950 px-4 py-14 text-white">
    <section className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-8 text-center shadow-2xl">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-700"><ShieldCheck className="h-6 w-6" /></div>
      <h1 className="mt-5 text-xl font-semibold">Administrator sign in</h1>
      {message && <p role="status" className="mt-3 text-sm text-slate-300">{message}</p>}
      {error && <><p role="alert" className="mt-3 rounded-xl bg-rose-950/70 p-3 text-sm text-rose-200">{error}</p><Link to="/admin/sign-in" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-rose-300 hover:text-white"><ArrowLeft className="h-4 w-4" />Request a new link</Link></>}
    </section>
  </main>;
};

export default AdminLoginPage;
