import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { EmergencyRequest, DonorResponseItem } from '../types';
import { LifeGardenArtwork } from '../components/artworks/LifeGardenArtwork';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { ProfileCompletionModal } from '../components/profile/ProfileCompletionModal';
import { ProfileIncompleteBanner } from '../components/profile/ProfileIncompleteBanner';
import {
  Heart,
  CheckCircle,
  Clock,
  MapPin,
  AlertCircle,
  Building2,
  Calendar,
  Send,
  Truck,
  RotateCcw,
} from 'lucide-react';

export const DonorDashboardPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [activeRequests, setActiveRequests] = useState<EmergencyRequest[]>([]);
  const [myResponses, setMyResponses] = useState<DonorResponseItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Response Modal State
  const [selectedRequest, setSelectedRequest] = useState<EmergencyRequest | null>(null);
  const [responseType, setResponseType] = useState<'i_can_help' | 'not_available' | 'logistical_help'>('i_can_help');
  const [responseNote, setResponseNote] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [responseSuccessMessage, setResponseSuccessMessage] = useState<string | null>(null);

// Profile Completion Enforcement & Dismissible Reminder Modal
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [attemptedAction, setAttemptedAction] = useState<string | null>(null);

  useEffect(() => {
    if (user && !user.isProfileComplete) {
      const dismissed = sessionStorage.getItem('bit_profile_modal_dismissed');
      if (!dismissed) {
        setProfileModalOpen(true);
      }
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch active broadcasts matching this donor's blood group
      const reqRes = await api.getActiveBroadcasts(user?.bloodGroup);
      if (reqRes.success) {
        setActiveRequests(reqRes.requests || []);
      }
      const respRes = await api.getMyResponseHistory();
      if (respRes.success) {
        setMyResponses(respRes.responses || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleOpenResponse = (req: EmergencyRequest) => {
    if (!user?.isProfileComplete) {
      setAttemptedAction('Responding to emergency blood donation request');
      setProfileModalOpen(true);
      return;
    }
    setSelectedRequest(req);
  };

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    if (!user?.isProfileComplete) {
      setAttemptedAction('Responding to emergency blood donation request');
      setProfileModalOpen(true);
      return;
    }

    try {
      setSubmittingResponse(true);
      await api.submitDonorResponse({
        requestId: selectedRequest._id,
        responseType,
        note: responseNote,
      });
      setResponseSuccessMessage('Your response has been transmitted to the college coordination desk!');
      setTimeout(() => {
        setSelectedRequest(null);
        setResponseSuccessMessage(null);
        setResponseNote('');
        fetchData();
      }, 2000);
    } catch (err: any) {
      alert(err.message || 'Failed to submit response');
    } finally {
      setSubmittingResponse(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-garden-ivory py-8 px-4 sm:px-6 lg:px-8">
      <LifeGardenArtwork />

      <div className="max-w-6xl mx-auto space-y-8 z-10 relative">
        {/* Persistent Incomplete Profile Banner */}
        {user && !user.isProfileComplete && (
          <ProfileIncompleteBanner
            onOpenModal={() => {
              setAttemptedAction(null);
              setProfileModalOpen(true);
            }}
          />
        )}

        {/* RELEVANT EMERGENCY BLOOD REQUESTS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <span>Active College Emergency Requests Matching {user?.bloodGroup}</span>
                <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 font-bold">
                  {activeRequests.length} Active
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Matching requests appear here as soon as they are submitted. Review each request and respond if you can help.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
              Loading campus emergency alerts...
            </div>
          ) : activeRequests.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-slate-200/80 space-y-2">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Urgent {user?.bloodGroup} Requests Right Now</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No matching requests are available right now. Keep your availability confirmed so coordinators can alert you when an emergency occurs.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeRequests.map(req => {
                const hasResponded = myResponses.some(r => {
                  const reqId = typeof r.requestId === 'string' ? r.requestId : r.requestId?._id;
                  return reqId === req._id;
                });

                return (
                  <div
                    key={req._id}
                    className="bg-white rounded-3xl p-6 border border-red-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <StatusBadge status={req.status} />
                        <span className="text-[11px] font-mono text-slate-400">{req.requestId}</span>
                      </div>

                      <div>
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="px-2.5 py-0.5 rounded-lg bg-red-600 text-white font-extrabold text-sm">
                            {req.bloodGroup}
                          </span>
                          <h3 className="text-base font-bold text-slate-900 leading-snug">{req.unitsRequired} Unit(s) Needed</h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {req.requestTarget === 'College Friend' ? 'For College Friend' : 'Self Request'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 flex items-center space-x-1 mt-1.5 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-garden-terracotta flex-shrink-0" />
                          <span>{req.area}, {req.district || 'Erode'}</span>
                        </p>
                      </div>

                      <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-slate-700 leading-relaxed">
                        <p className="font-semibold text-slate-800 mb-0.5">Situation Note:</p>
                        <p>{req.briefContext}</p>
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-red-500" />
                        <span>Required by: {new Date(req.requiredBy).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      {hasResponded ? (
                        <div className="flex items-center justify-between text-xs text-green-700 font-semibold bg-green-50 px-3 py-2 rounded-xl border border-green-200">
                          <span>You have responded to this alert</span>
                          <button
                            type="button"
                            onClick={() => handleOpenResponse(req)}
                            className="underline text-slate-600 hover:text-slate-900 font-normal"
                          >
                            Update response
                          </button>
                        </div>
                      ) : ['pending_verification', 'verified'].includes(req.status) ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-800">
                          {req.status === 'pending_verification' ? 'Request is awaiting activation' : 'Open for donor responses'}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenResponse(req)}
                          className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-md shadow-red-500/20 transition active:scale-[0.99]"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Respond to Emergency</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RESPONSE HISTORY */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900">My Response History</h2>
            <p className="text-xs text-slate-500">Record of your recent volunteer responses and coordinator coordination notes.</p>
          </div>

          {myResponses.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No previous emergency responses recorded.</p>
          ) : (
            <div className="divide-y divide-slate-100 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="pb-3 font-semibold">Request</th>
                    <th className="pb-3 font-semibold">My Action</th>
                    <th className="pb-3 font-semibold">Coordinator Follow-Up</th>
                    <th className="pb-3 font-semibold">Responded Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {myResponses.map(resp => {
                    const reqObj: any = typeof resp.requestId === 'object' ? resp.requestId : null;
                    return (
                      <tr key={resp._id} className="py-2.5">
                        <td className="py-3 font-medium text-slate-900">
                          {reqObj ? `${reqObj.requestId} (${reqObj.bloodGroup} at ${reqObj.hospital})` : 'Emergency Request'}
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              resp.responseType === 'i_can_help'
                                ? 'bg-green-100 text-green-800'
                                : resp.responseType === 'logistical_help'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {resp.responseType === 'i_can_help'
                              ? 'I can help'
                              : resp.responseType === 'logistical_help'
                              ? 'Logistical Help'
                              : 'Not Available'}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="font-medium capitalize text-slate-800">
                            {resp.coordinatorFollowUp.replace('_', ' ')}
                          </span>
                          {resp.coordinatorNotes && (
                            <span className="block text-[11px] text-slate-400 italic">
                              "{resp.coordinatorNotes}"
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-slate-400 font-mono text-[11px]">
                          {new Date(resp.respondedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* DONOR RESPONSE MODAL */}
      {selectedRequest && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedRequest(null)}
          title={`Respond to ${selectedRequest.requestId}`}
        >
          {responseSuccessMessage ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center space-y-2">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto" />
              <p className="text-xs font-bold text-green-900">{responseSuccessMessage}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitResponse} className="space-y-4">
              <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs space-y-1">
                <p className="font-bold text-red-900">
                  {selectedRequest.unitsRequired} Unit(s) of {selectedRequest.bloodGroup} Needed
                </p>
                <p className="text-red-700">Hospital: {selectedRequest.hospital} ({selectedRequest.hospitalLocation})</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-2">Select Your Action</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setResponseType('i_can_help')}
                    className={`p-3 rounded-xl border text-xs font-medium text-left transition ${
                      responseType === 'i_can_help'
                        ? 'border-green-600 bg-green-50 text-green-900 ring-2 ring-green-600/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="block font-bold">I Can Help</span>
                    <span className="text-[11px] text-slate-500">Ready to donate if matched</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResponseType('logistical_help')}
                    className={`p-3 rounded-xl border text-xs font-medium text-left transition ${
                      responseType === 'logistical_help'
                        ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-600/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="block font-bold">Logistical Help</span>
                    <span className="text-[11px] text-slate-500">Provide transport or support</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResponseType('not_available')}
                    className={`p-3 rounded-xl border text-xs font-medium text-left transition ${
                      responseType === 'not_available'
                        ? 'border-slate-800 bg-slate-50 text-slate-900 ring-2 ring-slate-800/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="block font-bold">Not Available</span>
                    <span className="text-[11px] text-slate-500">Cannot assist this time</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Optional Note for College Coordinator
                </label>
                <textarea
                  rows={2}
                  value={responseNote}
                  onChange={e => setResponseNote(e.target.value)}
                  placeholder="e.g. Currently in Hostel Block B, free from 11:30 AM onwards..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingResponse}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow disabled:opacity-50"
                >
                  {submittingResponse ? 'Submitting...' : 'Confirm Response'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Profile Completion Modal */}
      <ProfileCompletionModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        attemptedAction={attemptedAction}
        onCompleted={() => {
          setProfileModalOpen(false);
          setAttemptedAction(null);
          refreshUser();
        }}
      />
    </div>
  );
};
