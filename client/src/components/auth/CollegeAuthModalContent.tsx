import React, { useState } from 'react';
import { Activity, Check, Eye, EyeOff, Heart } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BloodGroupType, RoleType } from '../../types';
import { DEPARTMENTS, STUDY_YEARS } from '../../utils/districts';

interface CollegeAuthModalContentProps {
  tab: 'signin' | 'register';
  onTabChange: (tab: 'signin' | 'register') => void;
  onClose: () => void;
}

const bloodGroups: BloodGroupType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];
const inputClass = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-100';
const labelClass = 'block text-xs font-semibold text-slate-700';

export const CollegeAuthModalContent: React.FC<CollegeAuthModalContentProps> = ({ tab, onTabChange, onClose }) => {
  const { loginWithPassword, registerWithPassword } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<RoleType>(() => {
    const saved = localStorage.getItem('bit_portal_role_preference');
    return saved === 'Requester' ? 'Requester' : 'Donor';
  });
  const [name, setName] = useState('');
  const [registerNumber, setRegisterNumber] = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [year, setYear] = useState(STUDY_YEARS[0]);
  const [bloodGroup, setBloodGroup] = useState<BloodGroupType>('Unknown');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSigninPassword, setShowSigninPassword] = useState(false);
  const [district, setDistrict] = useState('Erode');
  const [area, setArea] = useState('Sathyamangalam Campus');
  const [willingness, setWillingness] = useState('Willing');
  const [contactConsent, setContactConsent] = useState(false);
  const [shareContact, setShareContact] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const goToAccount = (account: any) => {
    onClose();
    navigate(account?.systemRole === 'admin' ? '/admin' : account?.systemRole === 'coordinator' ? '/coordinator' : account?.portalRole === 'Donor' ? '/dashboard/donor' : account?.portalRole === 'Requester' ? '/dashboard/requester' : '/dashboard/both');
  };

  const chooseRole = (selected: RoleType) => {
    setRole(selected);
    localStorage.setItem('bit_portal_role_preference', selected);
  };

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await loginWithPassword(email, password);
      goToAccount(result.user);
    } catch (cause: any) {
      setError(cause.message || 'Sign in failed. Check your college email and password.');
    } finally { setBusy(false); }
  };

  const register = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter them.');
      return;
    }
    setBusy(true); setError(''); setNotice('');
    try {
      await registerWithPassword({
        name, email, password, userType: 'Student', registerNumber, department,
        year,
        bloodGroup, mobile, district, approximateArea: area, role,
        currentWillingness: willingness,
        consentEmergencyCommunications: contactConsent,
        shareContactWithRequesters: shareContact,
      });
      setNotice('Registration received. Check your college inbox for the verification link before signing in.');
      setPassword(''); setConfirmPassword('');
    } catch (cause: any) {
      setError(cause.message || 'Registration failed. Check your details and try again.');
    } finally { setBusy(false); }
  };

  return <div className="max-h-[78vh] space-y-4 overflow-y-auto px-0.5 pb-1 text-left">
    <div className="text-center"><p className="text-xs text-slate-500">Use your <strong className="text-slate-800">@bitsathy.ac.in</strong> college email</p></div>

    <div className="grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-100 p-1" role="tablist" aria-label="College account access">
      {(['signin', 'register'] as const).map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => { setError(''); setNotice(''); onTabChange(item); }} className={`rounded-lg px-3 py-2.5 text-xs font-bold transition ${tab === item ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>{item === 'signin' ? 'Sign In' : 'New Registration'}</button>)}
    </div>

    {tab === 'register' && <fieldset>
      <legend className="mb-2 text-xs font-bold text-slate-800">Select your portal role</legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {(['Donor', 'Requester'] as RoleType[]).map((item) => <button key={item} type="button" aria-pressed={role === item} onClick={() => chooseRole(item)} className={`flex min-h-14 items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${role === item ? 'border-rose-400 bg-rose-50 text-rose-900 ring-2 ring-rose-100' : 'border-slate-200 bg-white text-slate-700 hover:border-rose-200'}`}>
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${role === item ? 'bg-rose-700 text-white' : 'bg-slate-100 text-slate-600'}`}>{item === 'Donor' ? <Heart className="h-4 w-4" /> : <Activity className="h-4 w-4" />}</span>
          <span className="text-xs font-bold">{item}</span>{role === item && <Check className="ml-auto h-4 w-4 text-rose-700" />}
        </button>)}
      </div>
    </fieldset>}

    {tab === 'signin' ? <form onSubmit={signIn} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <label className={labelClass}>College email<input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@bitsathy.ac.in" className={inputClass} /></label>
      <label className={labelClass}>Password<span className="relative mt-1 block"><input required type={showSigninPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" className={`${inputClass} pr-11`} /><button type="button" aria-label={showSigninPassword ? 'Hide password' : 'Show password'} onClick={() => setShowSigninPassword((value) => !value)} className="absolute right-2 top-2.5 rounded-md p-1.5 text-slate-500 hover:bg-slate-100">{showSigninPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>
      <div className="flex items-center justify-between gap-2"><Link to="/forgot-password" onClick={onClose} className="text-xs font-medium text-rose-700 hover:underline">Forgot password?</Link><button disabled={busy} className="rounded-xl bg-rose-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-800 disabled:opacity-50">{busy ? 'Signing in…' : 'Sign in'}</button></div>
  </form> : <form onSubmit={register} className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
      <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">Student account registration</div>
      <div className="grid gap-2.5 sm:grid-cols-2">
        <label className={labelClass}>Full name<input required value={name} onChange={(event) => setName(event.target.value)} className={inputClass} autoComplete="name" /></label>
        <label className={labelClass}>Student register number<input required value={registerNumber} onChange={(event) => setRegisterNumber(event.target.value)} className={inputClass} /></label>
        <label className={labelClass}>Department<select value={department} onChange={(event) => setDepartment(event.target.value)} className={inputClass}>{DEPARTMENTS.map((entry) => <option key={entry}>{entry}</option>)}</select></label>
        <label className={labelClass}>Year of study<select value={year} onChange={(event) => setYear(event.target.value)} className={inputClass}>{STUDY_YEARS.map((entry) => <option key={entry}>{entry}</option>)}</select></label>
        <label className={labelClass}>College email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@bitsathy.ac.in" className={inputClass} /></label>
        <label className={labelClass}>Mobile number<input required type="tel" inputMode="numeric" autoComplete="tel" value={mobile} onChange={(event) => setMobile(event.target.value)} className={inputClass} /></label>
        <fieldset className="sm:col-span-2"><legend className={labelClass}>Blood group</legend><div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">{bloodGroups.map((entry) => <button key={entry} type="button" aria-pressed={bloodGroup === entry} onClick={() => setBloodGroup(entry)} className={`min-h-9 rounded-lg border px-2 text-xs font-bold ${bloodGroup === entry ? 'border-rose-600 bg-rose-700 text-white' : 'border-slate-200 text-slate-600'}`}>{entry}</button>)}</div></fieldset>
        <label className={labelClass}>District<input required value={district} onChange={(event) => setDistrict(event.target.value)} className={inputClass} /></label>
        <label className={labelClass}>Area / campus location<input required value={area} onChange={(event) => setArea(event.target.value)} className={inputClass} /></label>
        <label className={`${labelClass} sm:col-span-2`}>Donor availability<select value={willingness} onChange={(event) => setWillingness(event.target.value)} className={inputClass}><option>Willing</option><option>Temporarily Unavailable</option><option>Not Willing</option></select></label>
        <label className="sm:col-span-2 flex items-start gap-2 text-xs leading-5 text-slate-600"><input type="checkbox" checked={contactConsent} onChange={(event) => setContactConsent(event.target.checked)} className="mt-1 accent-rose-700" />I consent to relevant emergency alerts.</label>
        <label className="sm:col-span-2 flex items-start gap-2 text-xs leading-5 text-slate-600"><input type="checkbox" checked={shareContact} onChange={(event) => setShareContact(event.target.checked)} className="mt-1 accent-rose-700" />I consent to sharing my phone with a requester if I volunteer.</label>
        <label className={`${labelClass} sm:col-span-2`}>Create password (6 digits)<span className="relative mt-1 block"><input required type={showPassword ? 'text' : 'password'} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value.replace(/\D/g, '').slice(0, 6))} className={`${inputClass} pr-11`} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-2.5 rounded-md p-1.5 text-slate-500 hover:bg-slate-100">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>
        <label className={`${labelClass} sm:col-span-2`}>Confirm password<span className="relative mt-1 block"><input required type={showConfirmPassword ? 'text' : 'password'} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value.replace(/\D/g, '').slice(0, 6))} className={`${inputClass} pr-11`} /><button type="button" aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'} onClick={() => setShowConfirmPassword((value) => !value)} className="absolute right-2 top-2.5 rounded-md p-1.5 text-slate-500 hover:bg-slate-100">{showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>
      </div>
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-800">{error}</p>}{notice && <p role="status" className="rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-800">{notice}</p>}
      <button disabled={busy || password !== confirmPassword} className="w-full rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Creating your account…' : 'Create account'}</button>
    </form>}

    {tab === 'signin' && (error || notice) && <p role={error ? 'alert' : 'status'} className={`rounded-lg p-2.5 text-xs ${error ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800'}`}>{error || notice}</p>}

  </div>;
};
