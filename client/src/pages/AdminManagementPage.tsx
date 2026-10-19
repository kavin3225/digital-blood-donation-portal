import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Bell, CheckCircle2, ClipboardList, Clock3, LoaderCircle, Megaphone, MessageCircle, RefreshCw, Search, ShieldCheck, Users, X } from 'lucide-react';
import { api } from '../services/api';
import { AdminSupportInbox } from '../components/admin/AdminSupportInbox';
import { Modal } from '../components/common/Modal';

type AdminTab = 'overview' | 'users' | 'requests' | 'responses' | 'announcements' | 'support';
const tabs: { id: AdminTab; label: string; icon: React.ElementType }[] = [
  { id: 'requests', label: 'Requests', icon: ClipboardList }, { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'users', label: 'Profiles', icon: Users }, { id: 'responses', label: 'Responses', icon: CheckCircle2 },
  { id: 'support', label: 'Support', icon: MessageCircle },
  { id: 'announcements', label: 'Alerts', icon: Bell },
];

export const AdminManagementPage: React.FC = () => {
  const [tab, setTab] = useState<AdminTab>('requests');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userHistory, setUserHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRequestIds, setSelectedRequestIds] = useState<Set<string>>(new Set());
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [responses, setResponses] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadSupportCount, setUnreadSupportCount] = useState(0);
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

  const updateUnreadSupportCount = useCallback((count: number) => setUnreadSupportCount(count), []);
  const refreshUnreadSupportCount = useCallback(async () => {
    try {
      const result = await api.getSupportConversationsAdmin();
      setUnreadSupportCount((result.conversations || []).reduce((count: number, conversation: any) => count + (conversation.unreadCount || 0), 0));
    } catch {
      // Keep the last known badge state if the support inbox is temporarily unavailable.
    }
  }, []);

  useEffect(() => {
    void refreshUnreadSupportCount();
    const timer = window.setInterval(() => void refreshUnreadSupportCount(), 15000);
    return () => window.clearInterval(timer);
  }, [refreshUnreadSupportCount]);

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

  const openUserDetails = async (user: any) => {
    setSelectedUser(user); setUserHistory([]); setHistoryLoading(true); setError('');
    try {
      const result = await api.getUserAuditHistory(user._id);
      setUserHistory(result.logs || []);
    } catch (err: any) {
      setError(err.message || "Could not load this user's activity history.");
    } finally { setHistoryLoading(false); }
  };

  const changeSystemRole = async (user: any, systemRole: 'student' | 'coordinator') => {
    if (systemRole === 'coordinator' && !window.confirm(`Give ${user.googleEmail} coordinator access? Coordinators can review emergency requests and coordinate donor responses.`)) return;
    setBusy(user._id); setError(''); setNotice('');
    try {
      const result = await api.setUserSystemRoleAdmin(user._id, systemRole);
      await refresh();
      setSelectedUser({ ...user, systemRole });
      setNotice(result.message || `Updated ${user.googleEmail} to ${systemRole}.`);
    } catch (err: any) { setError(err.message || 'Could not update system access.'); }
    finally { setBusy(''); }
  };

  const moderateRequest = async (request: any, status: string) => {
    setBusy(request._id); setError('');
    try { await api.moderateRequestAdmin(request._id, status); await refresh(); }
    catch (err: any) { setError(err.message || 'Could not update the request.'); }
    finally { setBusy(''); }
  };

  const permanentlyDeleteRequest = async (request: any) => {
    if (!window.confirm(`Permanently delete ${request.requestId} and all its donor responses? This cannot be undone.`)) return;
    setBusy(request._id); setError(''); setNotice('');
    try {
      await api.permanentlyDeleteRequest(request._id);
      await refresh();
      setNotice(`Request ${request.requestId} was permanently deleted.`);
    } catch (err: any) { setError(err.message || 'Could not permanently delete the request.'); }
    finally { setBusy(''); }
  };

  const toggleSelectAllRequests = () => {
    setSelectedRequestIds((current) => current.size === requests.length && requests.length > 0
      ? new Set()
      : new Set(requests.map((request) => request._id)));
  };

  const permanentlyDeleteSelectedRequests = async () => {
    const count = selectedRequestIds.size;
    if (!count) return;
    setBusy('bulk-delete'); setError(''); setNotice('');
    try {
      const result = await api.permanentlyDeleteAdminRequests([...selectedRequestIds]);
      setSelectedRequestIds(new Set());
      setBulkDeleteModalOpen(false);
      await refresh();
      setNotice(`${result.deletedCount ?? count} selected request(s) and related donor responses were permanently deleted.`);
    } catch (err: any) { setError(err.message || 'Could not permanently delete the selected requests.'); }
    finally { setBusy(''); }
  };

  const sendAnnouncement = async (event: FormEvent) => {
    event.preventDefault(); setBusy('announcement'); setError(''); setNotice('');
    try { const result = await api.sendPortalAnnouncement(announcementTitle, announcementBody); setNotice(result.message); setAnnouncementTitle(''); setAnnouncementBody(''); await refresh(); }
    catch (err: any) { setError(err.message || 'Announcement could not be saved.'); }
    finally { setBusy(''); }
  };


  const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
  const pill = (text: string) => <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{text || 'ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â'}</span>;
  const formatDate = (value: string) => value ? new Date(value).toLocaleString() : 'ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â';

  const allRequestsSelected = requests.length > 0 && requests.every((request) => selectedRequestIds.has(request._id));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-700">Blood Donation Portal</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Administration</h1><p className="mt-1 text-sm text-slate-500">Review campus profiles, coordinate requests, and keep an auditable record.</p></div>
          <div className="flex flex-wrap items-center gap-2">
            {tab === 'requests' && <>
              <button type="button" onClick={toggleSelectAllRequests} disabled={!requests.length || busy === 'bulk-delete'} className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">{allRequestsSelected ? 'Clear selection' : 'Select all requests'}</button>
              {selectedRequestIds.size > 0 && <button type="button" onClick={() => setBulkDeleteModalOpen(true)} disabled={busy === 'bulk-delete'} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50">{busy === 'bulk-delete' ? 'Deleting...' : `Delete selected (${selectedRequestIds.size})`}</button>}
            </>}
            <button type="button" onClick={() => void refresh()} disabled={loading || busy === 'bulk-delete'} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
          </div>
        </header>

        {error && <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
        {notice && <div role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

        <nav className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2" aria-label="Administration sections">
          {tabs.map(({ id, label, icon: Icon }) => {
            const isRequests = id === 'requests';
            const isActive = tab === id;
            const openRequestsCount = requests.filter((request) => !['fulfilled', 'cancelled', 'rejected'].includes(request.status)).length;
            return <button key={id} type="button" onClick={() => { setTab(id); setSearch(''); }} aria-current={isActive ? 'page' : undefined} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition sm:px-4 ${isRequests ? (isActive ? 'bg-rose-700 text-white shadow-sm ring-2 ring-rose-200' : 'bg-rose-50 text-rose-800 hover:bg-rose-100') : (isActive ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900')}`}><Icon className="h-4 w-4" />{label}{isRequests && openRequestsCount > 0 && <span aria-label={`${openRequestsCount} open requests`} className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-rose-700 text-white'}`}>{openRequestsCount}</span>}{id === 'support' && unreadSupportCount > 0 && <span aria-label={`${unreadSupportCount} unread support messages`} className="h-2 w-2 rounded-full bg-red-500" />}</button>;
          })}
        </nav>

        {loading && !users.length ? <div className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin" /> Loading protected records…</div> : <>
          {tab === 'overview' && <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[['Accounts', stats.total || 0], ['Complete profiles', stats.completeProfiles || 0], ['Willing donors', stats.totalDonors || 0], ['Active broadcasts', stats.activeBroadcasts || 0]].map(([label, value]) => <div key={String(label)} className={card}><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p></div>)}
            </div>
            <div className="mt-5 max-w-xl"><section className={card}><h2 className="font-semibold text-slate-900">Request pipeline</h2><div className="mt-4 space-y-3">{['pending_verification', 'broadcast', 'coordinating', 'fulfilled', 'cancelled'].map((status) => <div key={status} className="flex items-center justify-between border-b border-slate-100 pb-2 text-sm"><span className="capitalize text-slate-600">{status.replace(/_/g, ' ')}</span><strong className="text-slate-900">{requests.filter((r) => r.status === status).length}</strong></div>)}</div></section></div>
          </>}

          {tab === 'users' && <section className={card}><div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-lg font-semibold text-slate-950">Student and staff profiles</h2><p className="text-xs text-slate-500">Admin accounts are hidden. Click a name or profile to view history and manage coordinator access.</p></div><label className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, ID…" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm sm:w-72" /></label></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr>{['Person', 'Profile', 'Blood / availability', 'Role', 'Account', 'Action'].map((h) => <th key={h} className="px-3 py-3 font-semibold">{h}</th>)}</tr></thead><tbody>{visibleUsers.map((u) => <tr key={u._id} className="border-t border-slate-100"><td className="px-3 py-3"><button type="button" onClick={() => void openUserDetails(u)} className="text-left font-semibold text-slate-900 hover:text-rose-700 hover:underline">{u.name}</button><p className="mt-1 text-slate-500">{u.googleEmail}</p><p className="mt-1 font-mono text-[10px] text-slate-400">{u.registerNumber}</p></td><td className="px-3 py-3 text-slate-600"><button type="button" onClick={() => void openUserDetails(u)} className="text-left hover:text-rose-700">{u.userType} · {u.department}<br />{u.year} · {u.district} / {u.approximateArea}</button></td><td className="px-3 py-3">{u.bloodGroup}<br /><span className="text-slate-500">{u.currentWillingness}</span></td><td className="px-3 py-3"><span className="font-medium text-slate-700">{u.portalRole || 'Both'}</span><p className="mt-1 text-[10px] text-slate-500">{u.systemRole === 'coordinator' ? 'Coordinator' : 'Standard user'}</p></td><td className="px-3 py-3">{pill(u.status)}<p className="mt-1 text-[10px] text-slate-400">{u.isProfileComplete ? 'Complete profile' : 'Incomplete profile'}</p></td><td className="px-3 py-3"><button type="button" disabled={busy === u._id} onClick={() => void updateAccountStatus(u)} className={`rounded-lg px-3 py-2 font-semibold ${u.status === 'blocked' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}>{busy === u._id ? 'Saving…' : u.status === 'blocked' ? 'Reactivate' : 'Suspend'}</button></td></tr>)}</tbody></table>{!visibleUsers.length && <p className="py-12 text-center text-sm text-slate-500">No profiles match this search.</p>}</div></section>}


          {tab === 'requests' && <section className={card}>
            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div><h2 className="text-lg font-semibold text-slate-950">Emergency requests</h2><p className="text-xs text-slate-500">Moderate request lifecycle. Patient contact details are excluded from campus-wide alerts.</p></div>
              <label className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search requests..." className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm sm:w-72" /></label>
            </div>
            <div className="space-y-3">
              {visibleRequests.map((r) => <article key={r._id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><input type="checkbox" checked={selectedRequestIds.has(r._id)} aria-label={`Select ${r.requestId}`} onChange={(event) => setSelectedRequestIds((current) => { const next = new Set(current); event.target.checked ? next.add(r._id) : next.delete(r._id); return next; })} className="h-4 w-4 accent-rose-700" /><strong className="text-sm text-slate-900">{r.requestId}</strong>{pill(r.status)}{pill(r.urgency || 'emergency')}</div>
                    <p className="mt-2 text-sm text-slate-700">{r.bloodGroup} · {r.unitsRequired} unit(s) · {r.district}, {r.area}</p>
                    <p className="mt-1 text-xs text-slate-500">Requester: {r.requesterName} ({r.requesterEmail}) · Required {formatDate(r.requiredBy)} · {r.donorResponseCount || 0} donor responses</p>
                    {r.requesterRemark && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">Requester remark: {r.requesterRemark}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">{r.status === 'pending_verification' && <button disabled={busy === r._id} onClick={() => void moderateRequest(r, 'broadcast')} className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-800">Verify &amp; open</button>}{['broadcast', 'coordinating'].includes(r.status) && <button disabled={busy === r._id} onClick={() => void moderateRequest(r, 'fulfilled')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800">Mark fulfilled</button>}{!['fulfilled', 'cancelled', 'rejected'].includes(r.status) && <button disabled={busy === r._id} onClick={() => void moderateRequest(r, 'cancelled')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>}<button disabled={busy === r._id} onClick={() => void permanentlyDeleteRequest(r)} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50">Delete permanently</button></div>
                </div>
              </article>)}
              {!visibleRequests.length && <p className="py-10 text-center text-sm text-slate-500">No requests found.</p>}
            </div>
          </section>}
          {tab === 'responses' && <section className={card}><h2 className="text-lg font-semibold text-slate-950">Donor responses</h2><div className="mt-4 space-y-3">{responses.map((response) => <article key={response._id} className="flex flex-col justify-between gap-2 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center"><div><p className="text-sm font-semibold text-slate-900">{response.donorId?.name || response.donorName} · {response.responseType}</p><p className="mt-1 text-xs text-slate-500">{response.donorId?.googleEmail || response.donorEmail} · {response.donorBloodGroup} · {response.donorArea}</p></div><div className="text-xs text-slate-500">{response.requestId?.requestId || 'Request'} · {response.requestId?.status}<br />{formatDate(response.respondedAt)}</div></article>)}{!responses.length && <p className="py-10 text-center text-sm text-slate-500">No donor responses recorded.</p>}</div></section>}

          {tab === 'support' && <AdminSupportInbox onUnreadCountChange={updateUnreadSupportCount} />}

          {tab === 'announcements' && <div className="grid gap-5 lg:grid-cols-2"><section className={card}><div className="mb-4 flex items-center gap-2"><Megaphone className="h-5 w-5 text-rose-700" /><h2 className="text-lg font-semibold text-slate-950">Send portal announcement</h2></div><p className="mb-5 text-xs leading-5 text-slate-500">Stores an alert for active verified accounts that opted into general notifications. Browser push is attempted only for users with a real subscription and configured VAPID keys.</p><form onSubmit={sendAnnouncement} className="space-y-4"><label className="block text-xs font-semibold text-slate-700">Title<input required maxLength={100} value={announcementTitle} onChange={(e) => setAnnouncementTitle(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label><label className="block text-xs font-semibold text-slate-700">Message<textarea required minLength={5} maxLength={500} rows={4} value={announcementBody} onChange={(e) => setAnnouncementBody(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm" /></label><button disabled={busy === 'announcement'} className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50"><Megaphone className="h-4 w-4" />{busy === 'announcement' ? 'Saving…' : 'Publish announcement'}</button></form></section><section className={card}><h2 className="font-semibold text-slate-900">Recent portal notifications ({notifications.length})</h2><div className="mt-4 space-y-3">{notifications.slice(0, 12).map((n) => <div key={n._id} className="border-b border-slate-100 pb-3"><p className="text-xs font-semibold text-slate-800">{n.title}</p><p className="mt-1 text-xs text-slate-500">{n.recipientEmail} · {n.channel} · {n.deliveryStatus}</p></div>)}{!notifications.length && <p className="text-sm text-slate-500">No alerts recorded.</p>}</div></section></div>}


          {selectedUser && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedUser(null); }}>
            <section role="dialog" aria-modal="true" aria-labelledby="user-detail-title" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
              <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-rose-700">User profile and history</p><h2 id="user-detail-title" className="mt-1 text-xl font-semibold text-slate-950">{selectedUser.name}</h2><p className="mt-1 text-sm text-slate-500">{selectedUser.googleEmail}</p></div><button type="button" onClick={() => setSelectedUser(null)} aria-label="Close user details" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
              <div className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2"><p><span className="text-slate-500">Account:</span> {selectedUser.status}</p><p><span className="text-slate-500">Profile:</span> {selectedUser.isProfileComplete ? 'Complete' : 'Incomplete'}</p><p><span className="text-slate-500">Type / department:</span> {selectedUser.userType} | {selectedUser.department || 'Not set'}</p><p><span className="text-slate-500">Blood group:</span> {selectedUser.bloodGroup || 'Not set'}</p><p><span className="text-slate-500">Portal role:</span> {selectedUser.portalRole || 'Both'}</p><p><span className="text-slate-500">System access:</span> {selectedUser.systemRole === 'coordinator' ? 'Coordinator' : 'Standard user'}</p><p><span className="text-slate-500">Registered:</span> {formatDate(selectedUser.createdAt)}</p><p><span className="text-slate-500">Last profile update:</span> {formatDate(selectedUser.updatedAt)}</p></div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-slate-900">Coordinator access</h3><p className="mt-1 text-xs text-slate-500">Grant or remove access for this active, verified college account.</p></div>{selectedUser.status === 'active' && <button type="button" disabled={busy === selectedUser._id} onClick={() => void changeSystemRole(selectedUser, selectedUser.systemRole === 'coordinator' ? 'student' : 'coordinator')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${selectedUser.systemRole === 'coordinator' ? 'border border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-rose-700 text-white hover:bg-rose-800'} disabled:opacity-50`}><ShieldCheck className="h-4 w-4" />{busy === selectedUser._id ? 'Saving...' : selectedUser.systemRole === 'coordinator' ? 'Remove coordinator access' : 'Make coordinator'}</button>}</div>
              <div className="mt-7"><h3 className="flex items-center gap-2 font-semibold text-slate-900"><Clock3 className="h-4 w-4" />Activity history</h3>{historyLoading ? <p className="py-8 text-center text-sm text-slate-500">Loading history...</p> : userHistory.length ? <ol className="mt-3 max-h-64 space-y-3 overflow-y-auto">{userHistory.map((entry) => <li key={entry._id} className="rounded-xl border border-slate-200 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold text-slate-800">{String(entry.action || 'Activity').replace(/_/g, ' ').toLowerCase()}</span><time className="text-xs text-slate-500">{formatDate(entry.timestamp)}</time></div><p className="mt-1 text-xs text-slate-500">{entry.actorEmail || 'System'} | {entry.targetEntity || 'Account'}</p></li>)}</ol> : <p className="mt-3 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">No recorded activity found for this account yet.</p>}</div>
            </section>
          </div>}

        </>}
      </div>
      <Modal isOpen={bulkDeleteModalOpen} onClose={() => setBulkDeleteModalOpen(false)} title="Permanently delete requests">
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-600">Permanently delete all <strong className="text-slate-900">{selectedRequestIds.size} selected request(s)</strong>, including requests submitted by other users, and their donor responses? This cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setBulkDeleteModalOpen(false)} disabled={busy === 'bulk-delete'} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
            <button type="button" onClick={() => void permanentlyDeleteSelectedRequests()} disabled={busy === 'bulk-delete' || !selectedRequestIds.size} className="rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50">{busy === 'bulk-delete' ? 'Deleting...' : 'Delete permanently'}</button>
          </div>
        </div>
      </Modal>
    </main>
  );
};

export default AdminManagementPage;
