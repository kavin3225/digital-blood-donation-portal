import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Bell, CheckCircle2, ClipboardList, LoaderCircle, Megaphone, RefreshCw, Search, Users } from 'lucide-react';
import { api } from '../services/api';

type AdminTab = 'overview' | 'users' | 'requests' | 'responses' | 'announcements';
const tabs: { id: AdminTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: Activity }, { id: 'users', label: 'Profiles', icon: Users },
  { id: 'requests', label: 'Requests', icon: ClipboardList }, { id: 'responses', label: 'Responses', icon: CheckCircle2 },
  { id: 'announcements', label: 'Alerts', icon: Bell },
];

export const AdminManagementPage: React.FC = () => {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [search, setSearch] = useState('');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [userRes, requestRes, responseRes, notificationRes, overviewRes] = await Promise.all([
        api.getAllUsersAdmin({ limit: 200 }), api.getAllRequestsAdmin(), api.getAllDonorResponsesAdmin(),
        api.getAllNotificationsAdmin(), api.getCampusStats(),
      ]);
      setUsers(userRes.users || []); setRequests(requestRes.requests || []);
      setResponses(responseRes.responses || []); setNotifications(notificationRes.notifications || []);
      setStats({ ...(userRes.stats || {}), ...(overviewRes.stats || {}) });
    } catch (err: any) { setError(err.message || 'Could not load administrator records.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const visibleUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? users.filter((u) => [u.name, u.googleEmail, u.registerNumber, u.department, u.bloodGroup, u.district].some((v) => String(v || '').toLowerCase().includes(term))) : users;
  }, [users, search]);
  const visibleRequests = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? requests.filter((r) => [r.requestId, r.patientName, r.requesterName, r.district, r.area, r.bloodGroup].some((v) => String(v || '').toLowerCase().includes(term))) : requests;
  }, [requests, search]);

  const updateAccountStatus = async (user: any) => {
    const status = user.status === 'blocked' ? 'active' : 'blocked';
    setBusy(user._id); setError(''); setNotice('');
    try { await api.toggleAccountStatus(user._id, status, status === 'blocked' ? 'Administrator action' : 'Reactivated by administrator'); await refresh(); setNotice(`${user.googleEmail} is now ${status}.`); }
    catch (err: any) { setError(err.message || 'Could not update account status.'); }
    finally { setBusy(''); }
  };

  const changePortalRole = async (user: any, portalRole: string) => {
    setBusy(user._id); setError('');
    try { await api.updateUserAdmin(user._id, { portalRole }); await refresh(); }
    catch (err: any) { setError(err.message || 'Could not update the portal role.'); }
    finally { setBusy(''); }
  };

  const moderateRequest = async (request: any, status: string) => {
    setBusy(request._id); setError('');
    try { await api.moderateRequestAdmin(request._id, status); await refresh(); }
    catch (err: any) { setError(err.message || 'Could not update the request.'); }
    finally { setBusy(''); }
  };

  const sendAnnouncement = async (event: FormEvent) => {
    event.preventDefault(); setBusy('announcement'); setError(''); setNotice('');
    try { const result = await api.sendPortalAnnouncement(announcementTitle, announcementBody); setNotice(result.message); setAnnouncementTitle(''); setAnnouncementBody(''); await refresh(); }
    catch (err: any) { setError(err.message || 'Announcement could not be saved.'); }
    finally { setBusy(''); }
  };


  const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
  const pill = (text: string) => <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{text || 'â€”'}</span>;
  const formatDate = (value: string) => value ? new Date(value).toLocaleString() : 'â€”';

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-700">Blood Donation Portal</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Administration</h1><p className="mt-1 text-sm text-slate-500">Review campus profiles, coordinate requests, and keep an auditable record.</p></div>
          <button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
        </header>

        {error && <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
        {notice && <div role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

        <nav className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2" aria-label="Administration sections">
          {tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => { setTab(id); setSearch(''); }} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition sm:px-4 ${tab === id ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}><Icon className="h-4 w-4" />{label}</button>)}
        </nav>

        {loading && !users.length ? <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin" /> Loading protected recordsâ€¦</div> : <>
          {tab === 'overview' && <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[['Accounts', stats.total || 0], ['Complete profiles', stats.completeProfiles || 0], ['Willing donors', stats.totalDonors || 0], ['Active broadcasts', stats.activeBroadcasts || 0]].map(([label, value]) => <div key={String(label)} className={card}><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p></div>)}
            </div>
            <div className="mt-5 max-w-xl"><section className={card}><h2 className="font-semibold text-slate-900">Request pipeline</h2><div className="mt-4 space-y-3">{['pending_verification', 'broadcast', 'coordinating', 'fulfilled', 'cancelled'].map((status) => <div key={status} className="flex items-center justify-between border-b border-slate-100 pb-2 text-sm"><span className="capitalize text-slate-600">{status.replace(/_/g, ' ')}</span><strong className="text-slate-900">{requests.filter((r) => r.status === status).length}</strong></div>)}</div></section></div>
          </>}

          {tab === 'users' && <section className={card}><div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-lg font-semibold text-slate-950">Student and staff profiles</h2><p className="text-xs text-slate-500">Private records shown only to authorized administrators.</p></div><label className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, IDâ€¦" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm sm:w-72" /></label></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr>{['Person', 'Profile', 'Blood / availability', 'Role', 'Account', 'Action'].map((h) => <th key={h} className="px-3 py-3 font-semibold">{h}</th>)}</tr></thead><tbody>{visibleUsers.map((u) => <tr key={u._id} className="border-t border-slate-100"><td className="px-3 py-3"><p className="font-semibold text-slate-900">{u.name}</p><p className="mt-1 text-slate-500">{u.googleEmail}</p><p className="mt-1 font-mono text-[10px] text-slate-400">{u.registerNumber}</p></td><td className="px-3 py-3 text-slate-600">{u.userType} Â· {u.department}<br />{u.year} Â· {u.district} / {u.approximateArea}</td><td className="px-3 py-3">{u.bloodGroup}<br /><span className="text-slate-500">{u.currentWillingness}</span></td><td className="px-3 py-3"><select aria-label={`Portal role for ${u.googleEmail}`} disabled={busy === u._id} value={u.portalRole || 'Both'} onChange={(e) => void changePortalRole(u, e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5"><option>Donor</option><option>Requester</option><option>Both</option></select><p className="mt-1 text-[10px] text-slate-400">System: {u.systemRole}</p></td><td className="px-3 py-3">{pill(u.status)}<p className="mt-1 text-[10px] text-slate-400">{u.isProfileComplete ? 'Complete profile' : 'Incomplete profile'}</p></td><td className="px-3 py-3"><button type="button" disabled={busy === u._id} onClick={() => void updateAccountStatus(u)} className={`rounded-lg px-3 py-2 font-semibold ${u.status === 'blocked' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}>{busy === u._id ? 'Savingâ€¦' : u.status === 'blocked' ? 'Reactivate' : 'Suspend'}</button></td></tr>)}</tbody></table>{!visibleUsers.length && <p className="py-12 text-center text-sm text-slate-500">No profiles match this search.</p>}</div></section>}


          {tab === 'requests' && <section className={card}><div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-lg font-semibold text-slate-950">Emergency requests</h2><p className="text-xs text-slate-500">Moderate request lifecycle. Patient contact details are excluded from campus-wide alerts.</p></div><label className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search requestsâ€¦" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm sm:w-72" /></label></div><div className="space-y-3">{visibleRequests.map((r) => <article key={r._id} className="rounded-xl border border-slate-200 p-4"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-slate-900">{r.requestId}</strong>{pill(r.status)}{pill(r.urgency || 'emergency')}</div><p className="mt-2 text-sm text-slate-700">{r.bloodGroup} Â· {r.unitsRequired} unit(s) Â· {r.district}, {r.area}</p><p className="mt-1 text-xs text-slate-500">Requester: {r.requesterName} ({r.requesterEmail}) Â· Required {formatDate(r.requiredBy)} Â· {r.donorResponseCount || 0} donor responses</p></div><div className="flex flex-wrap gap-2">{r.status === 'pending_verification' && <button disabled={busy === r._id} onClick={() => void moderateRequest(r, 'broadcast')} className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-800">Verify & open</button>}{['broadcast', 'coordinating'].includes(r.status) && <button disabled={busy === r._id} onClick={() => void moderateRequest(r, 'fulfilled')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800">Mark fulfilled</button>}{!['fulfilled', 'cancelled', 'rejected'].includes(r.status) && <button disabled={busy === r._id} onClick={() => void moderateRequest(r, 'cancelled')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>}</div></div></article>)}{!visibleRequests.length && <p className="py-10 text-center text-sm text-slate-500">No requests found.</p>}</div></section>}

          {tab === 'responses' && <section className={card}><h2 className="text-lg font-semibold text-slate-950">Donor responses</h2><div className="mt-4 space-y-3">{responses.map((response) => <article key={response._id} className="flex flex-col justify-between gap-2 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center"><div><p className="text-sm font-semibold text-slate-900">{response.donorId?.name || response.donorName} Â· {response.responseType}</p><p className="mt-1 text-xs text-slate-500">{response.donorId?.googleEmail || response.donorEmail} Â· {response.donorBloodGroup} Â· {response.donorArea}</p></div><div className="text-xs text-slate-500">{response.requestId?.requestId || 'Request'} Â· {response.requestId?.status}<br />{formatDate(response.respondedAt)}</div></article>)}{!responses.length && <p className="py-10 text-center text-sm text-slate-500">No donor responses recorded.</p>}</div></section>}

          {tab === 'announcements' && <div className="grid gap-5 lg:grid-cols-2"><section className={card}><div className="mb-4 flex items-center gap-2"><Megaphone className="h-5 w-5 text-rose-700" /><h2 className="text-lg font-semibold text-slate-950">Send portal announcement</h2></div><p className="mb-5 text-xs leading-5 text-slate-500">Stores an alert for active verified accounts that opted into general notifications. Browser push is attempted only for users with a real subscription and configured VAPID keys.</p><form onSubmit={sendAnnouncement} className="space-y-4"><label className="block text-xs font-semibold text-slate-700">Title<input required maxLength={100} value={announcementTitle} onChange={(e) => setAnnouncementTitle(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label><label className="block text-xs font-semibold text-slate-700">Message<textarea required minLength={5} maxLength={500} rows={4} value={announcementBody} onChange={(e) => setAnnouncementBody(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label><button disabled={busy === 'announcement'} className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50"><Megaphone className="h-4 w-4" />{busy === 'announcement' ? 'Savingâ€¦' : 'Publish announcement'}</button></form></section><section className={card}><h2 className="font-semibold text-slate-900">Recent portal notifications ({notifications.length})</h2><div className="mt-4 space-y-3">{notifications.slice(0, 12).map((n) => <div key={n._id} className="border-b border-slate-100 pb-3"><p className="text-xs font-semibold text-slate-800">{n.title}</p><p className="mt-1 text-xs text-slate-500">{n.recipientEmail} Â· {n.channel} Â· {n.deliveryStatus}</p></div>)}{!notifications.length && <p className="text-sm text-slate-500">No alerts recorded.</p>}</div></section></div>}

        </>}
      </div>
    </main>
  );
};

export default AdminManagementPage;
