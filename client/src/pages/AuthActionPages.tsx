import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { CheckCircle2, KeyRound, Mail, ShieldCheck } from 'lucide-react';

const AuthActionShell: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <main className="flex min-h-[65vh] items-center justify-center bg-slate-50 px-4 py-12">
    <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-900/5 sm:p-9">
      <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-700"><ShieldCheck className="h-6 w-6" /></div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
      {children}
    </section>
  </main>
);

export const VerifyEmailPage: React.FC = () => {
  const [params] = useSearchParams();
  const started = useRef(false);
  const [message, setMessage] = useState('Verifying your email link…');
  const [success, setSuccess] = useState(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const email = params.get('email') || '';
    const token = params.get('token') || '';
    if (!email || !token) { setMessage('This verification link is incomplete.'); return; }
    api.verifyEmailAddress({ email, token }).then((result) => { setSuccess(true); setMessage(result.message); }).catch((error: any) => setMessage(error.message || 'This verification link is invalid or expired.'));
  }, [params]);
  return <AuthActionShell title={success ? 'Email verified' : 'Email verification'}><p role="status" className="mt-3 text-sm leading-6 text-slate-600">{message}</p>{success && <p className="mt-4 flex items-center gap-2 text-xs text-emerald-700"><CheckCircle2 className="h-4 w-4" /> You can sign in now.</p>}<Link to="/login" className="mt-6 inline-flex w-full justify-center rounded-xl bg-rose-700 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-800">Continue to sign in</Link></AuthActionShell>;
};

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage(''); setError('');
    try { const result = await api.requestPasswordReset(email); setMessage(result.message); }
    catch (err: any) { setError(err.message || 'Could not request a reset link.'); }
    finally { setBusy(false); }
  };
  return <AuthActionShell title="Reset your password"><p className="mt-2 text-sm leading-6 text-slate-500">Enter your college email. If your account uses a password, we’ll send a one-time reset link.</p><form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-xs font-semibold text-slate-700">College email<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@bitsathy.ac.in" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-100" /></label>{message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">{message}</p>}{error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}<button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50"><Mail className="h-4 w-4" />{busy ? 'Sending…' : 'Email reset link'}</button></form><Link to="/login" className="mt-5 block text-center text-xs font-semibold text-slate-500 hover:text-rose-700">Back to sign in</Link></AuthActionShell>;
};

export const ResetPasswordPage: React.FC = () => {
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get('email') || '');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage(''); setError('');
    try { const result = await api.resetPassword({ email, token: params.get('token') || '', password }); setMessage(result.message); }
    catch (err: any) { setError(err.message || 'This reset link is invalid or expired.'); }
    finally { setBusy(false); }
  };
  return <AuthActionShell title="Choose a new password"><p className="mt-2 text-sm leading-6 text-slate-500">Choose exactly 6 digits. Reset links expire after 30 minutes.</p><form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-xs font-semibold text-slate-700">College email<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-100" /></label><label className="block text-xs font-semibold text-slate-700">New password (6 digits)<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0, 6))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-100" /></label>{message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">{message}</p>}{error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}<button disabled={busy || !params.get('token')} className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50"><KeyRound className="h-4 w-4" />{busy ? 'Updating…' : 'Save password'}</button></form><Link to="/login" className="mt-5 block text-center text-xs font-semibold text-slate-500 hover:text-rose-700">Back to sign in</Link></AuthActionShell>;
};
