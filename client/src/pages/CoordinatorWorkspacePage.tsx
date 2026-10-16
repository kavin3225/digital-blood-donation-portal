import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { EmergencyRequest } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { ActionConfirmModal } from '../components/common/ActionConfirmModal';
import { useToast } from '../context/ToastContext';
import {
  ShieldAlert,
  CheckCircle2,
  Radio,
  Users,
  Eye,
  Phone,
  Mail,
  Building,
  Clock,
  User,
  GraduationCap,
  MapPin,
  AlertTriangle,
} from 'lucide-react';

export const CoordinatorWorkspacePage: React.FC = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Action Modals
  const [verifyModalReq, setVerifyModalReq] = useState<EmergencyRequest | null>(null);
  const [verifyNotes, setVerifyNotes] = useState('');

  const [broadcastModalReq, setBroadcastModalReq] = useState<EmergencyRequest | null>(null);
  const [rejectModalReq, setRejectModalReq] = useState<EmergencyRequest | null>(null);
  const [fulfillModalReq, setFulfillModalReq] = useState<EmergencyRequest | null>(null);

  // Donor Responses Drawer / Modal
  const [viewResponsesReq, setViewResponsesReq] = useState<EmergencyRequest | null>(null);
  const [donorResponses, setDonorResponses] = useState<any[]>([]);
  const [unlockedContact, setUnlockedContact] = useState<any | null>(null);

  const fetchCoordinatorQueue = async () => {
    try {
      setLoading(true);
      const res = await api.getCoordinatorRequests();
      if (res.success) {
        setRequests(res.requests || []);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch coordination queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoordinatorQueue();
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyModalReq) return;
    try {
      await api.verifyRequest(verifyModalReq._id, verifyNotes);
      toast.success(`Request ${verifyModalReq.requestId} verified for broadcast.`);
      setVerifyModalReq(null);
      setVerifyNotes('');
      fetchCoordinatorQueue();
    } catch (err: any) {
      toast.error(err.message || 'Failed to verify request');
    }
  };

  const handleConfirmBroadcast = async () => {
    if (!broadcastModalReq) return;
    try {
      const res = await api.broadcastRequest(broadcastModalReq._id);
      toast.success(res.message || 'Emergency broadcast dispatched to eligible student donors!');
      setBroadcastModalReq(null);
      fetchCoordinatorQueue();
    } catch (err: any) {
      toast.error(err.message || 'Broadcast failed or cooldown active');
    }
  };

  const handleConfirmReject = async (reason: string) => {
    if (!rejectModalReq) return;
    try {
      await api.rejectRequest(rejectModalReq._id, reason);
      toast.success(`Emergency request ${rejectModalReq.requestId} rejected.`);
      setRejectModalReq(null);
      fetchCoordinatorQueue();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject request');
    }
  };

  const handleConfirmFulfill = async (notes: string) => {
    if (!fulfillModalReq) return;
    try {
      await api.fulfillRequest(fulfillModalReq._id, notes);
      toast.success(`Request ${fulfillModalReq.requestId} marked as fulfilled and closed.`);
      setFulfillModalReq(null);
      fetchCoordinatorQueue();
    } catch (err: any) {
      toast.error(err.message || 'Failed to fulfill request');
    }
  };

  const handleOpenResponses = async (req: EmergencyRequest) => {
    try {
      setViewResponsesReq(req);
      setUnlockedContact(null);
      const res = await api.getRequestDetails(req._id);
      if (res.success) {
        setDonorResponses(res.responses || []);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load donor responses');
    }
  };

  const handleUnlockContact = async (responseId: string) => {
    try {
      const res = await api.viewDonorContact(responseId);
      if (res.success) {
        setUnlockedContact(res.donorContact);
        toast.success('Donor phone and contact unlocked for coordinator outreach.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to access contact details');
    }
  };

  const handleUpdateFollowUp = async (responseId: string, status: string) => {
    try {
      await api.updateFollowUp(responseId, { coordinatorFollowUp: status });
      toast.success(`Follow-up status updated to ${status.replace('_', ' ')}`);
      if (viewResponsesReq) handleOpenResponses(viewResponsesReq);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update follow-up');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              <span>College Health & NSS Coordination Desk</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Student Emergency Verification & Broadcast Queue
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Verify student casualty requests submitted by peers or family, initiate privacy-compliant targeted broadcasts, and track donor fulfillment.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold font-mono">
              Queue: {requests.length} Requests
            </span>
          </div>
        </div>

        {/* Requests Queue Table / Cards */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
            Loading coordination queue...
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">Coordination Queue is Clear</h3>
            <p className="text-xs text-slate-500">No pending emergency verification requests require review.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div
                key={req._id}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="px-3 py-1 rounded-xl bg-red-600 text-white font-black text-sm">
                      {req.bloodGroup}
                    </span>
                    <span className="text-base font-bold text-slate-900">{req.unitsRequired} Unit(s)</span>
                    <StatusBadge status={req.status} size="sm" />
                    <span className="text-xs font-mono text-slate-400">{req.requestId}</span>
                  </div>

                  {/* Student Casualty & Peer Submitter Badge */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-red-600" />
                      <span>Affected Student & Requester Context</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                      <div>
                        <span className="text-slate-400">Student:</span>{' '}
                        <strong className="text-slate-900">{req.affectedStudentName || 'Student'}</strong>
                        {req.affectedStudentRegNo && (
                          <span className="font-mono text-slate-500 ml-1">({req.affectedStudentRegNo})</span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-400">Student Email:</span>{' '}
                        <span className="font-mono text-slate-900">{req.affectedStudentEmail || req.requesterEmail || 'bitsathy.ac.in'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Relationship:</span>{' '}
                        <span className="font-semibold text-slate-800">{req.relationshipToStudent || 'Peer / Family Request'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Attendant Contact:</span>{' '}
                        <strong>{req.contactPersonName}</strong> ({req.contactPersonPhone})
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                    <div className="flex items-center space-x-1.5">
                      <Building className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>
                        <strong className="text-slate-800">Admitted At:</strong> {req.hospital} ({req.hospitalLocation})
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>
                        <strong className="text-slate-800">Required By:</strong> {new Date(req.requiredBy).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-red-50/50 rounded-2xl border border-red-100 text-xs text-slate-700 italic">
                    "{req.briefContext}"
                  </div>

                  {req.coordinatorNotes && (
                    <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-xl border border-amber-200">
                      <strong>Verification Note:</strong> {req.coordinatorNotes}
                    </div>
                  )}
                </div>

                {/* Coordinator Action Buttons */}
                <div className="flex flex-col sm:flex-row lg:flex-col gap-2 min-w-[200px] border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6 justify-center">
                  {req.status === 'pending_verification' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setVerifyModalReq(req)}
                        className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow transition"
                      >
                        Verify & Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectModalReq(req)}
                        className="py-2 px-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {req.status === 'verified' && (
                    <button
                      type="button"
                      onClick={() => setBroadcastModalReq(req)}
                      className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow flex items-center justify-center space-x-1.5 transition active:scale-95"
                    >
                      <Radio className="w-4 h-4 animate-pulse" />
                      <span>Broadcast to Matching Donors</span>
                    </button>
                  )}

                  {['broadcast', 'coordinating'].includes(req.status) && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenResponses(req)}
                        className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Manage Donors & Responses</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFulfillModalReq(req)}
                        className="py-2 px-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition"
                      >
                        Confirm Fulfilled
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* VERIFY MODAL */}
      {verifyModalReq && (
        <Modal isOpen={true} onClose={() => setVerifyModalReq(null)} title={`Verify Request: ${verifyModalReq.requestId}`}>
          <form onSubmit={handleVerify} className="space-y-4 text-xs">
            <p className="text-slate-600">
              Confirm that you have checked the student casualty / surgery requirement at {verifyModalReq.hospital}.
            </p>
            <div>
              <label className="block font-semibold mb-1">Coordinator Verification Notes *</label>
              <textarea
                required
                rows={3}
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                placeholder="e.g. Verified with emergency duty doctor / casualty attendant. Surgery scheduled."
                className="w-full p-2.5 border rounded-xl"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button type="button" onClick={() => setVerifyModalReq(null)} className="px-4 py-2 border rounded-xl">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl shadow">
                Approve for Broadcast
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* BESPOKE ACTION CONFIRM MODAL: BROADCAST */}
      {broadcastModalReq && (
        <ActionConfirmModal
          isOpen={Boolean(broadcastModalReq)}
          onClose={() => setBroadcastModalReq(null)}
          onConfirm={handleConfirmBroadcast}
          title="Dispatch Emergency Campus Broadcast"
          subtitle="Push targeted notifications to all active matching student donors on campus"
          decisionType="broadcast"
          targetInfo={{
            name: `${broadcastModalReq.bloodGroup} (${broadcastModalReq.unitsRequired} Units)`,
            email: broadcastModalReq.affectedStudentEmail || broadcastModalReq.affectedStudentName || 'Student',
            detail: `Facility: ${broadcastModalReq.hospital} (${broadcastModalReq.hospitalLocation})`,
          }}
          confirmButtonText="Dispatch Broadcast Now"
          requiresReason={false}
        />
      )}

      {/* BESPOKE ACTION CONFIRM MODAL: REJECT */}
      {rejectModalReq && (
        <ActionConfirmModal
          isOpen={Boolean(rejectModalReq)}
          onClose={() => setRejectModalReq(null)}
          onConfirm={handleConfirmReject}
          title={`Reject Emergency Request (${rejectModalReq.requestId})`}
          subtitle="Provide institutional justification for denying this emergency submission"
          decisionType="block"
          targetInfo={{
            name: `${rejectModalReq.bloodGroup} - ${rejectModalReq.unitsRequired} Units`,
            email: rejectModalReq.affectedStudentEmail || 'Student Casualty',
            detail: `Admitted at: ${rejectModalReq.hospital}`,
          }}
          presetReasons={[
            '❌ Requirement already fulfilled by local blood bank',
            '⚠️ Unreachable emergency attendant / invalid contact',
            '🚫 Duplicate submission for same student casualty',
            '📋 Physical verification failed / Non-student claim',
          ]}
          confirmButtonText="Confirm Rejection"
          requiresReason={true}
        />
      )}

      {/* BESPOKE ACTION CONFIRM MODAL: FULFILL */}
      {fulfillModalReq && (
        <ActionConfirmModal
          isOpen={Boolean(fulfillModalReq)}
          onClose={() => setFulfillModalReq(null)}
          onConfirm={handleConfirmFulfill}
          title={`Confirm Fulfilled (${fulfillModalReq.requestId})`}
          subtitle="Document successful blood donation and close campus broadcast"
          decisionType="approve"
          targetInfo={{
            name: `${fulfillModalReq.bloodGroup} - ${fulfillModalReq.unitsRequired} Units`,
            email: fulfillModalReq.affectedStudentEmail || 'Student Casualty',
            detail: `Facility: ${fulfillModalReq.hospital}`,
          }}
          presetReasons={[
            '✅ Blood donated successfully by student volunteers',
            '✅ Hospital requirement satisfied through donor response',
            '✅ Patient stabilized and emergency closed by NSS desk',
          ]}
          confirmButtonText="Confirm & Close Request"
          requiresReason={false}
        />
      )}

      {/* MANAGE DONOR RESPONSES & AUTHORIZED CONTACT VIEW MODAL */}
      {viewResponsesReq && (
        <Modal
          isOpen={true}
          onClose={() => setViewResponsesReq(null)}
          title={`Donor Responses: ${viewResponsesReq.requestId}`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-5 text-xs">
            {/* Unlocked Contact Details Banner */}
            {unlockedContact && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2 text-emerald-900 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">
                    {unlockedContact.name} ({unlockedContact.registerNumber})
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800 text-[10px] font-bold">
                    Audit Logged: Coordinator Contact View
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center space-x-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      Mobile: <strong>{unlockedContact.mobile}</strong>
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Mail className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      Email: <strong>{unlockedContact.email}</strong>
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Dept: {unlockedContact.department}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      Area: {unlockedContact.residenceType} &bull; {unlockedContact.approximateArea}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="font-bold text-slate-800">Responding Volunteers ({donorResponses.length})</h4>
              {donorResponses.length === 0 ? (
                <p className="text-slate-400 italic">No responses recorded yet.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {donorResponses.map((r: any) => (
                    <div
                      key={r._id}
                      className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900">{r.donorName}</span>
                          <span className="px-2 py-0.5 rounded-lg bg-red-100 text-red-800 font-bold text-[10px]">
                            {r.donorBloodGroup}
                          </span>
                          <span className="text-slate-500">({r.donorArea})</span>
                        </div>
                        {r.note && <p className="text-slate-600 italic mt-1">"{r.note}"</p>}
                        <div className="text-[11px] text-slate-400 mt-1">
                          Follow-Up:{' '}
                          <span className="font-semibold text-slate-700 capitalize">
                            {r.coordinatorFollowUp.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleUnlockContact(r._id)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-[11px] flex items-center space-x-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Phone</span>
                        </button>

                        <select
                          value={r.coordinatorFollowUp}
                          onChange={(e) => handleUpdateFollowUp(r._id, e.target.value)}
                          className="p-1.5 rounded-xl border border-slate-300 text-[11px] bg-white font-medium"
                        >
                          <option value="pending">Pending</option>
                          <option value="contacted">Contacted</option>
                          <option value="matched_at_hospital">Matched at Medical Facility</option>
                          <option value="donated">Donated</option>
                          <option value="not_selected">Not Selected</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewResponsesReq(null)}
                className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
