import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { EmergencyRequest, DonorResponseItem } from '../types';
import { CampusOrbitArtwork } from '../components/artworks/CampusOrbitArtwork';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { ProfileCompletionModal } from '../components/profile/ProfileCompletionModal';
import { ProfileIncompleteBanner } from '../components/profile/ProfileIncompleteBanner';
import { RequestOwnerActions } from '../components/request/RequestOwnerActions';
import { TAMIL_NADU_DISTRICTS, CAMPUS_AREA_SUGGESTIONS } from '../utils/districts';
import { useToast } from '../context/ToastContext';
import {
  Layers,
  Heart,
  Activity,
  PlusCircle,
  Building2,
  MapPin,
  Clock,
  Send,
  CheckCircle,
  Sparkles,
  User,
  Users,
} from 'lucide-react';

export const BothDashboardPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'donating' | 'requesting'>('donating');

  // Shared state
  const [incomingBroadcasts, setIncomingBroadcasts] = useState<EmergencyRequest[]>([]);
  const [myCreatedRequests, setMyCreatedRequests] = useState<EmergencyRequest[]>([]);
  const [myResponses, setMyResponses] = useState<DonorResponseItem[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Quick Action Modal states
  const [respondModalReq, setRespondModalReq] = useState<EmergencyRequest | null>(null);
  const [responseType, setResponseType] = useState<'i_can_help' | 'not_available' | 'logistical_help'>('i_can_help');
  const [responseNote, setResponseNote] = useState('');
  const [responseSubmitting, setResponseSubmitting] = useState(false);

  // Emergency Request Creation States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newRequestTarget, setNewRequestTarget] = useState<'Self' | 'College Friend'>('Self');
  const [newPatientEmail, setNewPatientEmail] = useState('');
  const [newPatientName, setNewPatientName] = useState('');
  const [newRelationship, setNewRelationship] = useState('Friend');
  const [newBloodGroup, setNewBloodGroup] = useState('A+');
  const [newUrgency, setNewUrgency] = useState<'emergency' | 'within_24h' | 'planned'>('emergency');
  const [newUnits, setNewUnits] = useState(1);
  const [newDistrict, setNewDistrict] = useState(user?.district || 'Erode');
  const [newArea, setNewArea] = useState('');
  const [newRequiredBy, setNewRequiredBy] = useState('');
  const [newContext, setNewContext] = useState('');
  const [createSubmitting, setCreateSubmitting] = useState(false);

  useEffect(() => {
    if (user && newRequestTarget === 'Self') {
      setNewPatientEmail(user.collegeEmail || user.googleEmail || '');
    }
  }, [user, newRequestTarget]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [broadcastsRes, myReqRes, respRes] = await Promise.all([
        api.getActiveBroadcasts(),
        api.getMyRequests(),
        api.getMyResponseHistory(),
      ]);

      if (broadcastsRes.success) setIncomingBroadcasts(broadcastsRes.requests || []);
      if (myReqRes.success) setMyCreatedRequests(myReqRes.requests || []);
      if (respRes.success) setMyResponses(respRes.responses || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleOpenRespond = (req: EmergencyRequest) => {
    if (!user?.isProfileComplete) {
      setAttemptedAction('Responding to emergency blood donation request');
      setProfileModalOpen(true);
      return;
    }
    setRespondModalReq(req);
  };

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!respondModalReq) return;

    if (!user?.isProfileComplete) {
      setAttemptedAction('Responding to emergency blood donation request');
      setProfileModalOpen(true);
      return;
    }

    try {
      setResponseSubmitting(true);
      await api.submitDonorResponse({
        requestId: respondModalReq._id,
        responseType,
        note: responseNote,
      });
      setRespondModalReq(null);
      setResponseNote('');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit response');
    } finally {
      setResponseSubmitting(false);
    }
  };

  const handleOpenCreateModal = () => {
    if (!user?.isProfileComplete) {
      setAttemptedAction('Submitting an emergency blood request');
      setProfileModalOpen(true);
      return;
    }
    setNewArea('');
    setCreateModalOpen(true);
  };

  const handleCreateEmergency = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.isProfileComplete) {
      setAttemptedAction('Submitting an emergency blood request');
      setProfileModalOpen(true);
      return;
    }

    if (newRequestTarget === 'College Friend') {
      const email = newPatientEmail.trim().toLowerCase();
      if (newPatientName.trim().length < 2 || (email && !email.endsWith('@bitsathy.ac.in'))) {
        alert('Enter your friend’s name and, if known, a valid @bitsathy.ac.in email.');
        return;
      }
    }

    try {
      setCreateSubmitting(true);
      const result = await api.createRequest({
        clientRequestKey: crypto.randomUUID(),
        requestTarget: newRequestTarget,
        patientEmail: newRequestTarget === 'Self' ? (user?.collegeEmail || user?.googleEmail) : newPatientEmail.trim().toLowerCase(),
        patientName: newRequestTarget === 'Self' ? user?.name : newPatientName.trim(),
        relationshipToStudent: newRequestTarget === 'Self' ? 'Self' : newRelationship,
        bloodGroup: newBloodGroup,
        urgency: newUrgency,
        unitsRequired: Number(newUnits),
        district: newDistrict,
        area: newArea.trim(),
        requiredBy: new Date(newRequiredBy).toISOString(),
        contactPersonName: user?.name || 'Student Attendant',
        contactPersonPhone: user?.mobile || '9999999999',
        briefContext: newContext.trim(),
      });
      if (result.success) toast.success('Blood request submitted. Campus users have been notified.');
      setCreateModalOpen(false);
      setNewContext('');
      if (newRequestTarget === 'College Friend') setNewPatientEmail('');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit emergency request');
    } finally {
      setCreateSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-orbit-lilac py-8 px-4 sm:px-6 lg:px-8">
      <CampusOrbitArtwork />

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

        {/* PROMINENT TACTILE MODE SWITCH */}
        <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-sm flex items-center justify-center max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setActiveTab('donating')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
              activeTab === 'donating'
                ? 'bg-orbit-plum text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Heart className="w-4 h-4 fill-current" />
            <span>Donating Mode</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('requesting')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
              activeTab === 'requesting'
                ? 'bg-orbit-teal text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Requesting Mode</span>
          </button>
        </div>

        {/* CONDITIONAL WORKSPACE VIEWS */}
        {activeTab === 'donating' ? (
          /* DONATING MODE WORKSPACE */
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            {/* Matching Active Broadcasts */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">
                  Active Emergency Alerts Across Campus ({incomingBroadcasts.length})
                </h3>
              </div>

              {incomingBroadcasts.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-500">
                  No active emergency broadcasts are currently open across campus.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {incomingBroadcasts.map(req => (
                    <div key={req._id} className="p-6 bg-white rounded-3xl border border-purple-100 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-lg bg-red-600 text-white font-extrabold text-xs">
                          {req.bloodGroup}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {req.requestTarget === 'College Friend' ? 'For College Friend' : 'Self Request'}
                        </span>
                        <StatusBadge status={req.status} size="sm" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">{req.unitsRequired} Unit(s) Needed</h4>
                      <p className="text-xs text-slate-500 flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-orbit-plum" />
                        <span>{req.area}, {req.district || 'Erode'}</span>
                      </p>
                      <p className="text-xs text-slate-600 line-clamp-2 italic">"{req.briefContext}"</p>
                      <button
                        type="button"
                        onClick={() => handleOpenRespond(req)}
                        className="w-full py-2 rounded-xl bg-orbit-plum text-white text-xs font-semibold hover:bg-orbit-plumDark transition"
                      >
                        Respond as Volunteer
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* REQUESTING MODE WORKSPACE */
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-white rounded-3xl p-6 border border-teal-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Need Blood for an Emergency?</h3>
                <p className="text-xs text-slate-500">
                  Request blood for yourself or a college friend. Reviewed by college health coordinators.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="px-4 py-2.5 rounded-xl bg-orbit-teal hover:bg-orbit-tealDark text-white text-xs font-bold shadow flex items-center space-x-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Request</span>
              </button>
            </div>

            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900">My Emergency Requests ({myCreatedRequests.length})</h3>
              {myCreatedRequests.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-500">
                  You have not submitted any emergency requests in Requesting mode.
                </div>
              ) : (
                <div className="space-y-3">
                  {myCreatedRequests.map(req => (
                    <div key={req._id} className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-slate-900">{req.unitsRequired} Units ({req.bloodGroup})</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {req.requestTarget === 'College Friend' ? 'For College Friend' : 'Self Request'}
                          </span>
                          <StatusBadge status={req.status} size="sm" />
                        </div>
                        <p className="text-xs text-slate-500 flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{req.area}, {req.district || 'Erode'}</span>
                        </p>
                      </div>
                      <RequestOwnerActions request={req} onChanged={() => void fetchData()} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* QUICK RESPOND MODAL */}
      {respondModalReq && (
        <Modal isOpen={true} onClose={() => setRespondModalReq(null)} title="Respond to Blood Request">
          <form onSubmit={handleSubmitResponse} className="space-y-4">
            <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs space-y-1">
              <p className="font-bold text-red-900">{respondModalReq.unitsRequired} Units of {respondModalReq.bloodGroup} Needed</p>
              <p className="text-red-700">{respondModalReq.area}, {respondModalReq.district || 'Erode'}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setResponseType('i_can_help')}
                className={`p-3 rounded-xl border font-bold ${responseType === 'i_can_help' ? 'bg-green-50 border-green-600 text-green-900' : 'border-slate-200'}`}
              >
                I Can Help
              </button>
              <button
                type="button"
                onClick={() => setResponseType('logistical_help')}
                className={`p-3 rounded-xl border font-bold ${responseType === 'logistical_help' ? 'bg-blue-50 border-blue-600 text-blue-900' : 'border-slate-200'}`}
              >
                Logistical Help
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Note (Optional)</label>
              <input
                type="text"
                value={responseNote}
                onChange={e => setResponseNote(e.target.value)}
                placeholder="e.g. Free after 12 PM in Block A"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button type="button" onClick={() => setRespondModalReq(null)} className="px-4 py-2 border rounded-xl text-xs">Cancel</button>
              <button type="submit" disabled={responseSubmitting} className="px-4 py-2 bg-orbit-plum text-white rounded-xl text-xs font-bold">Submit</button>
            </div>
          </form>
        </Modal>
      )}

      {/* CREATE EMERGENCY MODAL */}
      {createModalOpen && (
        <Modal isOpen={true} onClose={() => setCreateModalOpen(false)} title="Create College Emergency Blood Request">
          <form onSubmit={handleCreateEmergency} className="space-y-4 text-xs">
            {/* Target: Self or Friend */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Who Needs Blood? *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewRequestTarget('Self')}
                  className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center space-x-2 border transition ${
                    newRequestTarget === 'Self'
                      ? 'bg-orbit-teal text-white border-orbit-teal shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>For Myself</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewRequestTarget('College Friend')}
                  className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center space-x-2 border transition ${
                    newRequestTarget === 'College Friend'
                      ? 'bg-orbit-teal text-white border-orbit-teal shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>For College Friend</span>
                </button>
              </div>

              {newRequestTarget === 'College Friend' ? (
                <div className="pt-1">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Friend’s full name *</label>
                  <input type="text" required placeholder="Patient’s full name" value={newPatientName} onChange={e => setNewPatientName(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white" />
                  <label className="mt-3 block text-[11px] font-bold text-slate-700 mb-1">College email (optional)</label>
                  <input
                    type="email"
                    placeholder="friend.ec23@bitsathy.ac.in"
                    value={newPatientEmail}
                    onChange={e => setNewPatientEmail(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-mono bg-white"
                  />
                  <label className="mt-3 block text-[11px] font-bold text-slate-700 mb-1">Relationship</label>
                  <input type="text" maxLength={80} value={newRelationship} onChange={e => setNewRelationship(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white" />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Friend does not need to share passwords. You submit on their behalf as a verified student or staff requester.
                  </p>
                </div>
              ) : (
                <div className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 font-mono">
                  <span className="font-bold text-emerald-700">Prefilled: </span>
                  {user?.collegeEmail || user?.googleEmail}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold mb-1">Blood Group *</label>
                <select value={newBloodGroup} onChange={e => setNewBloodGroup(e.target.value)} className="w-full p-2.5 border rounded-xl font-bold bg-white">
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Units (1 - 10) *</label>
                <input type="number" min={1} max={10} required value={newUnits} onChange={e => setNewUnits(Number(e.target.value))} className="w-full p-2.5 border rounded-xl" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold mb-1">District *</label>
                <select value={newDistrict} onChange={e => setNewDistrict(e.target.value)} className="w-full p-2.5 border rounded-xl bg-white">
                  {TAMIL_NADU_DISTRICTS.map(dist => <option key={dist} value={dist}>{dist}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Area / Town *</label>
                <input required value={newArea} onChange={e => setNewArea(e.target.value)} placeholder="e.g. Campus Hostel / Sathyamangalam" className="w-full p-2.5 border rounded-xl" />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Urgency *</label>
              <select value={newUrgency} onChange={e => setNewUrgency(e.target.value as typeof newUrgency)} className="mb-3 w-full p-2.5 border rounded-xl bg-white"><option value="emergency">Emergency · ASAP</option><option value="within_24h">Within 24 hours</option><option value="planned">Scheduled</option></select>
              <label className="block font-semibold mb-1">Required By Date & Time *</label>
              <input type="datetime-local" required value={newRequiredBy} onChange={e => setNewRequiredBy(e.target.value)} className="w-full p-2.5 border rounded-xl" />
            </div>

            <div>
              <label className="block font-semibold mb-1">Short Request Note (optional)</label>
              <textarea rows={2} value={newContext} onChange={e => setNewContext(e.target.value)} placeholder="Emergency blood requirement details..." className="w-full p-2.5 border rounded-xl" />
            </div>

            <div className="flex justify-end space-x-2">
              <button type="button" onClick={() => setCreateModalOpen(false)} className="px-4 py-2 border rounded-xl">Cancel</button>
              <button type="submit" disabled={createSubmitting} className="px-4 py-2 bg-orbit-teal text-white font-bold rounded-xl">Submit Request</button>
            </div>
          </form>
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
