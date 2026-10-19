import React, { useState } from 'react';
import { Pencil, Save, Trash2, X } from 'lucide-react';
import { EmergencyRequest } from '../../types';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export const RequestOwnerActions: React.FC<{ request: EmergencyRequest; onChanged: () => void }> = ({ request, onChanged }) => {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [remark, setRemark] = useState(request.requesterRemark || '');
  const [busy, setBusy] = useState(false);

  const saveRemark = async () => {
    setBusy(true);
    try {
      await api.updateOwnRequestRemark(request._id, remark.trim());
      setEditing(false);
      toast.success('Request remark saved.');
      onChanged();
    } catch (error: any) { toast.error(error.message || 'Could not save the remark.'); }
    finally { setBusy(false); }
  };

  const deleteRequest = async () => {
    const confirmed = window.confirm(`Permanently delete this ${request.bloodGroup} blood request? This also deletes its donor responses and cannot be undone.`);
    if (!confirmed) return;
    setBusy(true);
    try {
      await api.permanentlyDeleteRequest(request._id);
      toast.success('Your request was permanently deleted.');
      onChanged();
    } catch (error: any) { toast.error(error.message || 'Could not delete the request.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="mt-3 border-t border-slate-100 pt-3" onClick={(event) => event.stopPropagation()}>
      {request.requesterRemark && !editing && <p className="mb-2 text-xs text-slate-600"><span className="font-semibold text-slate-700">Your remark:</span> {request.requesterRemark}</p>}
      {editing && <div className="mb-2 space-y-2"><label className="sr-only" htmlFor={`request-remark-${request._id}`}>Request remark</label><textarea id={`request-remark-${request._id}`} maxLength={500} rows={2} value={remark} onChange={(event) => setRemark(event.target.value)} placeholder="Add a note for yourself and the admin team…" className="w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-rose-400" /><div className="flex gap-2"><button type="button" disabled={busy} onClick={() => void saveRemark()} className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"><Save className="h-3 w-3" />Save remark</button><button type="button" onClick={() => { setRemark(request.requesterRemark || ''); setEditing(false); }} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600"><X className="h-3 w-3" />Cancel</button></div></div>}
      <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => { setRemark(request.requesterRemark || ''); setEditing((current) => !current); }} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"><Pencil className="h-3 w-3" />{request.requesterRemark ? 'Edit remark' : 'Add remark'}</button><button type="button" disabled={busy} onClick={() => void deleteRequest()} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"><Trash2 className="h-3 w-3" />Delete permanently</button></div>
    </div>
  );
};
