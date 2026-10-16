import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  EmergencyRequest,
  DonorResponseItem,
  RoleType,
  BloodGroupType,
} from '../types';

// Artworks
import { LifeGardenArtwork } from '../components/artworks/LifeGardenArtwork';
import { ResponseDeskArtwork } from '../components/artworks/ResponseDeskArtwork';
import { CampusOrbitArtwork } from '../components/artworks/CampusOrbitArtwork';

// Common UI
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { ProfileCompletionModal } from '../components/profile/ProfileCompletionModal';
import { ProfileIncompleteBanner } from '../components/profile/ProfileIncompleteBanner';
import { TAMIL_NADU_DISTRICTS, CAMPUS_AREA_SUGGESTIONS } from '../utils/districts';

// Icons
import {
  Heart,
  Activity,
  Layers,
  Sparkles,
  CheckCircle,
  Clock,
  MapPin,
  Building2,
  PlusCircle,
  Send,
  Users,
  ShieldAlert,
  ChevronRight,
  Radio,
  CheckCircle2,
  CheckCheck,
  AlertTriangle,
  User,
} from 'lucide-react';

export const UnifiedPortalPage: React.FC = () => {
  const { user, updateRolePreference, refreshUser } = useAuth();

  // Active View Mode inside the Unified Portal: 'Donor' | 'Requester' | 'Both'
  const [activePortalMode, setActivePortalMode] = useState<RoleType>(
    user?.portalRole || user?.selectedRole || 'Both'
  );

  // Profile Enforcement & Dismissible Reminder Modal
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

  // Data states
  const [activeBroadcasts, setActiveBroadcasts] = useState<EmergencyRequest[]>([]);
  const [myRequests, setMyRequests] = useState<EmergencyRequest[]>([]);
  const [myResponses, setMyResponses] = useState<DonorResponseItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Donor Response Modal
  const [selectedRequestForResponse, setSelectedRequestForResponse] = useState<EmergencyRequest | null>(null);
  const [responseType, setResponseType] = useState<'i_can_help' | 'not_available' | 'logistical_help'>('i_can_help');
  const [responseNote, setResponseNote] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [responseSuccessMsg, setResponseSuccessMsg] = useState<string | null>(null);

// Requester Create Emergency Request Modal
  const [createRequestModalOpen, setCreateRequestModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // College Emergency Request Form Fields
  const [requestTarget, setRequestTarget] = useState<'Self' | 'College Friend'>('Self');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientRelationship, setPatientRelationship] = useState('Friend');
  const [reqBloodGroup, setReqBloodGroup] = useState<BloodGroupType>('A+');
  const [reqUrgency, setReqUrgency] = useState<'emergency' | 'within_24h' | 'planned'>('emergency');
  const [reqUnits, setReqUnits] = useState(1);
  const [reqDistrict, setReqDistrict] = useState(user?.district || 'Erode');
  const [reqArea, setReqArea] = useState(user?.approximateArea || 'Sathyamangalam Campus');
  const [showAreaSuggestions, setShowAreaSuggestions] = useState(false);
  const [reqRequiredBy, setReqRequiredBy] = useState('');
  const [reqContactName, setReqContactName] = useState(user?.name || '');
  const [reqContactPhone, setReqContactPhone] = useState(user?.mobile || '');
  const [reqBriefContext, setReqBriefContext] = useState('');

  // Selected Request Detail Modal (for requester timeline and responses)
  const [inspectRequestModal, setInspectRequestModal] = useState<{
    request: EmergencyRequest;
    responses: any[];
  } | null>(null);

  useEffect(() => {
    if (user) {
      if (requestTarget === 'Self') {
        setPatientEmail(user.collegeEmail || user.googleEmail || '');
      }
      if (!reqContactName) setReqContactName(user.name || '');
      if (!reqContactPhone) setReqContactPhone(user.mobile || '');
      if (!reqDistrict) setReqDistrict(user.district || 'Erode');
      if (!reqArea) setReqArea(user.approximateArea || 'Sathyamangalam Campus');
    }
  }, [user, requestTarget]);

  const fetchPortalData = async () => {
    try {
      setLoading(true);
      const [broadcastsRes, myReqsRes, responsesRes] = await Promise.all([
        api.getActiveBroadcasts(),
        api.getMyRequests(),
        api.getMyResponseHistory(),
      ]);

      if (broadcastsRes.success) setActiveBroadcasts(broadcastsRes.requests || []);
      if (myReqsRes.success) setMyRequests(myReqsRes.requests || []);
      if (responsesRes.success) setMyResponses(responsesRes.responses || []);
    } catch (err) {
      console.error('Error fetching portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortalData();
  }, [user]);

  // Synchronize when user role changes
  const handleSwitchMode = async (mode: RoleType) => {
    setActivePortalMode(mode);
    try {
      await updateRolePreference(mode);
    } catch {
      // local switch remains active even if offline
    }
  };

  // Donor: Open response modal with profile enforcement
  const handleOpenDonorResponse = (req: EmergencyRequest) => {
    if (!user?.isProfileComplete) {
      setAttemptedAction('Responding to an emergency blood request');
      setProfileModalOpen(true);
      return;
    }
    setSelectedRequestForResponse(req);
  };

  // Donor: Submit Response
  const handleSubmitDonorResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequestForResponse) return;

    if (!user?.isProfileComplete) {
      setAttemptedAction('Responding to an emergency blood request');
      setProfileModalOpen(true);
      return;
    }

    try {
      setSubmittingResponse(true);
      await api.submitDonorResponse({
        requestId: selectedRequestForResponse._id,
        responseType,
        note: responseNote,
      });
      setResponseSuccessMsg('Response dispatched to college coordination desk!');
      setTimeout(() => {
        setSelectedRequestForResponse(null);
        setResponseSuccessMsg(null);
        setResponseNote('');
        fetchPortalData();
      }, 1800);
    } catch (err: any) {
      alert(err.message || 'Failed to submit response');
    } finally {
      setSubmittingResponse(false);
    }
  };

  // Open Create Request Modal with profile check
  const handleOpenCreateRequest = () => {
    if (!user?.isProfileComplete) {
      setAttemptedAction('Submitting an emergency blood request');
      setProfileModalOpen(true);
      return;
    }
    setCreateRequestModalOpen(true);
  };

  // Requester: Submit Emergency Request
  const handleCreateEmergencyRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    if (!user?.isProfileComplete) {
      setAttemptedAction('Submitting an emergency blood request');
      setProfileModalOpen(true);
      return;
    }

    if (!reqRequiredBy) {
      setCreateError('Please select a required-by date and time.');
      return;
    }

    const isSelf = requestTarget === 'Self';
    const targetEmail = isSelf
      ? (user?.collegeEmail || user?.googleEmail || '')
      : patientEmail.trim().toLowerCase();

    if (!isSelf) {
      if (patientName.trim().length < 2 || (targetEmail && !targetEmail.endsWith('@bitsathy.ac.in'))) {
        setCreateError("Enter your friend's name and, if known, a valid @bitsathy.ac.in email.");
        return;
      }
    }

    try {
      setCreateSubmitting(true);
      const res = await api.createRequest({
        clientRequestKey: crypto.randomUUID(),
        patientReference: isSelf
          ? `${user?.name || 'Self'} (Self)`
          : `College Friend (${patientName.trim()})`,
        patientEmail: targetEmail,
        patientName: isSelf ? user?.name : patientName.trim(),
        relationshipToStudent: isSelf ? 'Self' : patientRelationship,
        requestTarget,
        bloodGroup: reqBloodGroup,
        urgency: reqUrgency,
        unitsRequired: Number(reqUnits),
        district: reqDistrict,
        area: reqArea.trim() || 'Campus',
        requiredBy: new Date(reqRequiredBy).toISOString(),
        contactPersonName: reqContactName.trim() || user?.name || 'College Member',
        contactPersonPhone: reqContactPhone.trim() || user?.mobile || '9999999999',
        briefContext: reqBriefContext.trim(),
      });

      if (res.success) {
        setCreateSuccess('Emergency request sent to campus users. Matching donors can respond now.');
        setTimeout(() => {
          setCreateRequestModalOpen(false);
          setCreateSuccess(null);
          setReqBriefContext('');
          fetchPortalData();
        }, 1800);
      }
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create request');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Requester: Inspect details & responses
  const handleInspectRequest = async (req: EmergencyRequest) => {
    try {
      const res = await api.getRequestDetails(req._id);
      if (res.success) {
        setInspectRequestModal({
          request: res.request,
          responses: res.responses || [],
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered area suggestions
  const filteredAreaSuggestions = CAMPUS_AREA_SUGGESTIONS.filter((s) =>
    s.toLowerCase().includes(reqArea.toLowerCase())
  );

  // Get dynamic container background based on active mode
  const getContainerBg = () => {
    if (activePortalMode === 'Donor') return 'bg-garden-ivory';
    if (activePortalMode === 'Requester') return 'bg-desk-pearl';
    return 'bg-orbit-lilac';
  };

  return (
    <div className={`relative min-h-screen py-6 px-4 sm:px-6 lg:px-8 transition-colors duration-500 ${getContainerBg()}`}>
      {/* Dynamic Background Custom Artwork */}
      {activePortalMode === 'Donor' && <LifeGardenArtwork />}
      {activePortalMode === 'Requester' && <ResponseDeskArtwork />}
      {activePortalMode === 'Both' && <CampusOrbitArtwork />}

      <div className="max-w-7xl mx-auto space-y-6 z-10 relative">
        {/* UNIFIED 3-IN-1 MASTER ROLE CONTROLLER */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-lg shadow-slate-900/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-600 via-rose-600 to-purple-700 text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-slate-900 text-sm sm:text-base">
                  Blood Donation Portal
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 font-mono">
                  All-in-One Workspace
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Switch between donor and requester workspaces.</p>
            </div>
          </div>

          {/* THE 3-WAY MASTER ROLE SWITCHER PILL */}
          <div className="inline-flex rounded-2xl p-1.5 bg-slate-100/90 border border-slate-200 text-xs font-bold shadow-inner">
            <button
              type="button"
              onClick={() => handleSwitchMode('Donor')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center space-x-1.5 ${
                activePortalMode === 'Donor'
                  ? 'bg-garden-terracotta text-white shadow-md shadow-garden-terracotta/25 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Heart className="w-3.5 h-3.5 fill-current" />
              <span>Donor (Life Garden)</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchMode('Requester')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center space-x-1.5 ${
                activePortalMode === 'Requester'
                  ? 'bg-desk-midnight text-white shadow-md shadow-desk-midnight/25 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Requester (Response Desk)</span>
            </button>

          </div>
        </div>

        {/* Keep the reminder visible only until the required profile details are complete. */}
        {user && !user.isProfileComplete && (
          <ProfileIncompleteBanner
            onOpenModal={() => {
              setAttemptedAction(null);
              setProfileModalOpen(true);
            }}
          />
        )}

        {/* ========================================================================= */}
        {/* EXPERIENCE 1: DONOR — LIFE GARDEN */}
        {/* ========================================================================= */}
        {activePortalMode === 'Donor' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Life Garden Header */}
            <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-garden-terracottaLight text-garden-terracottaDark text-xs font-bold">
                  <Heart className="w-3.5 h-3.5 fill-current" />
                  <span>Life Garden Mode &bull; Willing Student Donor Hub</span>
                </div>
                <h1 className="text-2xl font-black text-slate-900">
                  Ready to Donate: {user?.name}
                </h1>
                <p className="text-xs text-slate-600">
                  Self-Reported Blood Group: <span className="font-extrabold text-garden-terracotta">{user?.bloodGroup}</span> &bull; {user?.district} ({user?.approximateArea})
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="px-4 py-2 rounded-2xl bg-garden-terracotta text-white font-black text-xl shadow-md">
                  {user?.bloodGroup}
                </span>
              </div>
            </div>

            {/* Matching Verified Emergency Requests */}
            <div className="space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <span>Active College Emergency Requests Matching {user?.bloodGroup}</span>
                <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 font-bold">
                  {activeBroadcasts.length} Broadcast(s)
                </span>
              </h2>

              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
                  Loading emergency broadcasts...
                </div>
              ) : activeBroadcasts.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 space-y-1">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
                  <p className="text-sm font-bold text-slate-800">No Urgent {user?.bloodGroup} Needs Open</p>
                  <p className="text-xs text-slate-500">Thank you for being on standby. We will alert you immediately if a student or staff member needs blood.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeBroadcasts.map((req) => (
                    <div
                      key={req._id}
                      className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:border-red-200 transition space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="px-3 py-1 rounded-xl bg-red-600 text-white font-black text-sm">
                            {req.bloodGroup}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {req.requestTarget === 'College Friend' ? 'Friend Request' : 'Self Request'}
                          </span>
                        </div>
                        <StatusBadge status={req.status} size="sm" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {req.unitsRequired} Unit(s) in {req.district || 'Erode'} ({req.area || req.hospitalLocation || 'Campus'})
                        </h4>
                        <p className="text-xs text-slate-600 italic line-clamp-2 mt-1">"{req.briefContext}"</p>
                      </div>
                      <div className="text-[11px] text-slate-400">Needed by: {new Date(req.requiredBy).toLocaleString()}</div>
                      <button
                        type="button"
                        onClick={() => handleOpenDonorResponse(req)}
                        disabled={['pending_verification', 'verified'].includes(req.status)}
                        className="w-full py-2.5 rounded-xl bg-garden-terracotta hover:bg-garden-terracottaDark text-white text-xs font-bold shadow transition disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                      >
                        {req.status === 'pending_verification' ? 'Request is awaiting activation' : req.status === 'verified' ? 'Request is ready to open' : 'Respond as Donor'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* My Response History */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 space-y-3">
              <h2 className="text-sm font-bold text-slate-900">My Response History</h2>
              {myResponses.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No previous responses recorded.</p>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {myResponses.map((resp) => (
                    <div key={resp._id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-800 capitalize">{resp.responseType.replace('_', ' ')}</span>
                        {resp.note && <span className="text-slate-500 ml-2">"{resp.note}"</span>}
                      </div>
                      <span className="text-[11px] text-slate-400">{new Date(resp.respondedAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* EXPERIENCE 2: REQUESTER — RESPONSE DESK */}
        {/* ========================================================================= */}
        {activePortalMode === 'Requester' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Response Desk Header */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-desk-amberLight text-desk-midnight text-xs font-bold">
                  <Activity className="w-3.5 h-3.5 text-desk-amberDark" />
                  <span>Response Desk Mode &bull; Emergency Dispatch Workspace</span>
                </div>
                <h1 className="text-2xl font-black text-desk-midnight">
                  Emergency Blood Coordination
                </h1>
                <p className="text-xs text-slate-600 max-w-xl">
                  Submit a blood request for yourself or a friend. Campus users are alerted immediately, and matching donors can respond.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenCreateRequest}
                className="px-5 py-3 rounded-2xl bg-desk-midnight hover:bg-slate-800 text-white font-bold text-xs shadow-md flex items-center space-x-2"
              >
                <PlusCircle className="w-4 h-4 text-desk-amber" />
                <span>Create Emergency Request</span>
              </button>
            </div>

            {/* My Created Requests Queue */}
            <div className="space-y-4">
              <h2 className="text-base font-bold text-slate-900">My Emergency Submissions ({myRequests.length})</h2>

              {myRequests.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
                  <Activity className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-800">No Active Emergency Requests</p>
                  <p className="text-xs text-slate-500">Need blood for yourself or a college friend? Click "Create Emergency Request" above.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myRequests.map((req) => (
                    <div
                      key={req._id}
                      onClick={() => handleInspectRequest(req)}
                      className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm hover:border-slate-300 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-red-600 text-white font-extrabold text-xs">
                            {req.bloodGroup}
                          </span>
                          <span className="font-bold text-sm text-slate-900">
                            {req.unitsRequired} Unit(s) in {req.district || 'Erode'} ({req.area || req.hospitalLocation || 'Campus'})
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {req.requestTarget === 'College Friend' ? 'Friend Request' : 'Self Request'}
                          </span>
                          <StatusBadge status={req.status} size="sm" />
                        </div>
                        <p className="text-xs text-slate-500">
                          {req.patientReference} &bull; Needed by: {new Date(req.requiredBy).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center space-x-3 text-xs">
                        <span className="font-semibold text-slate-800">{req.donorResponseCount || 0} Donors Responded</span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* EXPERIENCE 3: BOTH — CAMPUS ORBIT */}
        {/* ========================================================================= */}
        {activePortalMode === 'Both' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Campus Orbit Header */}
            <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-7 border border-purple-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-orbit-lilacDark text-orbit-plum text-xs font-bold">
                  <Layers className="w-3.5 h-3.5 text-orbit-teal" />
                  <span>Campus Orbit Mode &bull; Dual Volunteering & Requesting</span>
                </div>
                <h1 className="text-2xl font-black text-slate-900">
                  {user?.name} &bull; Dual Orbit
                </h1>
                <p className="text-xs text-slate-600">
                  Synchronous access to volunteer blood responses and student emergency dispatching.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <div className="px-3 py-2 rounded-2xl bg-orbit-plumLight border border-purple-200 text-center">
                  <span className="block text-[10px] font-bold text-orbit-plum">My Blood Group</span>
                  <span className="font-black text-base text-orbit-plum">{user?.bloodGroup}</span>
                </div>
                <div className="px-3 py-2 rounded-2xl bg-orbit-tealLight border border-teal-200 text-center">
                  <span className="block text-[10px] font-bold text-orbit-tealDark">My Requests</span>
                  <span className="font-black text-base text-orbit-tealDark">{myRequests.length}</span>
                </div>
              </div>
            </div>

            {/* Dual Grid: Side-by-Side Donor Alerts and Active Requests */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Orbit: Incoming Volunteer Alerts */}
              <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Heart className="w-4 h-4 text-orbit-plum fill-orbit-plum" />
                    <h2 className="text-sm font-bold text-slate-900">Live Campus Alerts ({activeBroadcasts.length})</h2>
                  </div>
                </div>

                {activeBroadcasts.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-6 text-center">No active blood alerts currently broadcasted.</p>
                ) : (
                  <div className="space-y-3">
                    {activeBroadcasts.slice(0, 3).map((req) => (
                      <div key={req._id} className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-red-600 text-white font-bold text-[10px]">
                              {req.bloodGroup}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-purple-100 text-purple-700">
                              {req.requestTarget === 'College Friend' ? 'Friend' : 'Self'}
                            </span>
                          </div>
                          <h5 className="font-bold text-xs text-slate-900 mt-1">
                            {req.district || 'Erode'} ({req.area || req.hospitalLocation || 'Campus'})
                          </h5>
                          <p className="text-[11px] text-slate-500 mt-0.5">{req.unitsRequired} unit(s) needed</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenDonorResponse(req)}
                          className="px-3 py-1.5 rounded-xl bg-orbit-plum text-white text-[11px] font-bold shadow-sm"
                        >
                          Respond
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Orbit: Emergency Requests Creation & Tracker */}
              <div className="bg-white rounded-3xl p-6 border border-teal-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-orbit-teal" />
                    <h2 className="text-sm font-bold text-slate-900">My Emergency Submissions ({myRequests.length})</h2>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenCreateRequest}
                    className="px-3 py-1 rounded-xl bg-orbit-teal text-white text-[11px] font-bold"
                  >
                    + New
                  </button>
                </div>

                {myRequests.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-6 text-center">No emergency requests created.</p>
                ) : (
                  <div className="space-y-3">
                    {myRequests.slice(0, 3).map((req) => (
                      <div
                        key={req._id}
                        onClick={() => handleInspectRequest(req)}
                        className="p-4 bg-teal-50/50 rounded-2xl border border-teal-100 flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-xs text-slate-900">{req.unitsRequired} Unit(s) {req.bloodGroup}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold">
                              {req.requestTarget === 'College Friend' ? 'Friend' : 'Self'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">{req.district} - {req.area || 'Campus'}</p>
                        </div>
                        <StatusBadge status={req.status} size="sm" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* GLOBAL MODALS ACCESSIBLE ACROSS ALL 3 MODES */}
      {/* ========================================================================= */}

      {/* 1. DONOR RESPONSE MODAL */}
      {selectedRequestForResponse && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedRequestForResponse(null)}
          title={`Respond to Alert: ${selectedRequestForResponse.requestId}`}
        >
          {responseSuccessMsg ? (
            <div className="p-4 bg-green-50 rounded-2xl border border-green-200 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto" />
              <p className="text-xs font-bold text-green-900">{responseSuccessMsg}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitDonorResponse} className="space-y-4 text-xs">
              <div className="p-3 bg-red-50 rounded-2xl border border-red-200 text-red-900">
                <strong>{selectedRequestForResponse.unitsRequired} Unit(s) of {selectedRequestForResponse.bloodGroup} Needed</strong>
                <p className="text-red-700 mt-0.5">
                  Location: {selectedRequestForResponse.district || 'Erode'} ({selectedRequestForResponse.area || selectedRequestForResponse.hospitalLocation || 'Campus'})
                </p>
                {selectedRequestForResponse.briefContext && (
                  <p className="text-[11px] text-red-800 italic mt-1">"{selectedRequestForResponse.briefContext}"</p>
                )}
              </div>

              <div>
                <label className="block font-semibold mb-2">Select Your Action</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setResponseType('i_can_help')}
                    className={`p-3 rounded-xl border text-center font-bold ${
                      responseType === 'i_can_help' ? 'bg-green-50 border-green-600 text-green-900 ring-2 ring-green-600/20' : 'border-slate-200'
                    }`}
                  >
                    I Can Help
                  </button>
                  <button
                    type="button"
                    onClick={() => setResponseType('logistical_help')}
                    className={`p-3 rounded-xl border text-center font-bold ${
                      responseType === 'logistical_help' ? 'bg-blue-50 border-blue-600 text-blue-900 ring-2 ring-blue-600/20' : 'border-slate-200'
                    }`}
                  >
                    Logistical Help
                  </button>
                  <button
                    type="button"
                    onClick={() => setResponseType('not_available')}
                    className={`p-3 rounded-xl border text-center font-bold ${
                      responseType === 'not_available' ? 'bg-slate-50 border-slate-700 text-slate-900 ring-2 ring-slate-700/20' : 'border-slate-200'
                    }`}
                  >
                    Unavailable
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Optional Note for Coordinator</label>
                <input
                  type="text"
                  placeholder="e.g. Free in Block A from 11:30 AM"
                  value={responseNote}
                  onChange={(e) => setResponseNote(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setSelectedRequestForResponse(null)} className="px-4 py-2 border rounded-xl">Cancel</button>
                <button type="submit" disabled={submittingResponse} className="px-4 py-2 bg-red-600 text-white font-bold rounded-xl shadow">Confirm</button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* 2. CREATE EMERGENCY REQUEST MODAL (COLLEGE SELF / FRIEND WORKFLOW) */}
      {createRequestModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setCreateRequestModalOpen(false)}
          title="Create College Emergency Blood Request"
          maxWidth="max-w-xl"
        >
          {createSuccess ? (
            <div className="p-4 bg-green-50 rounded-2xl border border-green-200 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto" />
              <p className="text-xs font-bold text-green-900">{createSuccess}</p>
            </div>
          ) : (
            <form onSubmit={handleCreateEmergencyRequest} className="space-y-3.5 text-xs text-left">
              {createError && (
                <div className="p-2.5 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              {/* REQUEST TARGET: SELF VS COLLEGE FRIEND */}
              <div className="p-3 bg-red-50/60 rounded-2xl border border-red-100 space-y-2">
                <label className="block font-bold text-slate-800">Who is this blood request for? *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRequestTarget('Self')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition flex items-center justify-center space-x-2 ${
                      requestTarget === 'Self'
                        ? 'bg-red-600 text-white border-red-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>Myself (Self)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestTarget('College Friend')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition flex items-center justify-center space-x-2 ${
                      requestTarget === 'College Friend'
                        ? 'bg-red-600 text-white border-red-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>College Friend</span>
                  </button>
                </div>

                {requestTarget === 'Self' ? (
                  <div className="mt-2 text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-red-100 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900">Requester Email: </span>
                      <span className="font-mono">{user?.collegeEmail || user?.googleEmail}</span>
                    </div>
                    <span className="text-green-700 font-bold flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verified College Account</span>
                    </span>
                  </div>
                ) : (
                  <div className="mt-2 space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">Patient’s full name *</label>
                    <input type="text" required value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Patient’s name" className="w-full p-2.5 border rounded-xl text-xs focus:ring-2 focus:ring-red-500 focus:outline-none" />
                    <label className="mt-2 block text-[11px] font-semibold text-slate-700">College email (optional, if known)</label>
                    <input
                      type="email"
                      placeholder="e.g. friendname.cs23@bitsathy.ac.in"
                      value={patientEmail}
                      onChange={(e) => setPatientEmail(e.target.value)}
                      className="w-full p-2.5 border rounded-xl font-mono text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                    />
                    <label className="block text-[11px] font-semibold text-slate-700">Your relationship</label>
                    <input type="text" maxLength={80} value={patientRelationship} onChange={(e) => setPatientRelationship(e.target.value)} className="w-full p-2.5 border rounded-xl text-xs" />
                    <p className="text-[10px] text-slate-500">The patient does not need to sign in or share a password.</p>
                  </div>
                )}
              </div>

              {/* BLOOD GROUP & UNITS */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700">Required Blood Group *</label>
                  <select
                    value={reqBloodGroup}
                    onChange={(e) => setReqBloodGroup(e.target.value as BloodGroupType)}
                    className="w-full p-2.5 border rounded-xl font-bold bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700">Units Required *</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    required
                    value={reqUnits}
                    onChange={(e) => setReqUnits(Number(e.target.value))}
                    className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold mb-1 text-slate-700">Urgency *</label>
                  <select value={reqUrgency} onChange={(e) => setReqUrgency(e.target.value as typeof reqUrgency)} className="w-full p-2.5 border rounded-xl bg-white"><option value="emergency">Emergency · ASAP</option><option value="within_24h">Within 24 hours</option><option value="planned">Scheduled</option></select>
                </div>
              </div>

              {/* DISTRICT & AREA */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700">District *</label>
                  <select
                    value={reqDistrict}
                    onChange={(e) => setReqDistrict(e.target.value)}
                    className="w-full p-2.5 border rounded-xl font-semibold bg-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                  >
                    {TAMIL_NADU_DISTRICTS.map((dist) => (
                      <option key={dist} value={dist}>{dist}</option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <label className="block font-semibold mb-1 text-slate-700">Area / Town *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sathyamangalam / Hostels"
                    value={reqArea}
                    onChange={(e) => {
                      setReqArea(e.target.value);
                      setShowAreaSuggestions(true);
                    }}
                    onFocus={() => setShowAreaSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowAreaSuggestions(false), 200)}
                    className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                  {showAreaSuggestions && filteredAreaSuggestions.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-36 overflow-y-auto">
                      {filteredAreaSuggestions.map((suggestion) => (
                        <div
                          key={suggestion}
                          onMouseDown={() => {
                            setReqArea(suggestion);
                            setShowAreaSuggestions(false);
                          }}
                          className="p-2 hover:bg-slate-50 cursor-pointer text-[11px] text-slate-700 border-b border-slate-100 last:border-b-0"
                        >
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* REQUIRED BY DATE & TIME */}
              <div>
                <label className="block font-semibold mb-1 text-slate-700">Required By Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={reqRequiredBy}
                  onChange={(e) => setReqRequiredBy(e.target.value)}
                  className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              {/* CONTACT DETAILS */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700">Contact Person Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kavin Raja"
                    value={reqContactName}
                    onChange={(e) => setReqContactName(e.target.value)}
                    className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700">Contact Mobile (10 digits) *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="9876543210"
                    value={reqContactPhone}
                    onChange={(e) => setReqContactPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full p-2.5 border rounded-xl font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* SHORT REQUEST NOTE */}
              <div>
                <label className="block font-semibold mb-1 text-slate-700">Short Request Note (optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Surgery scheduled tomorrow morning, or emergency trauma requirement"
                  value={reqBriefContext}
                  onChange={(e) => setReqBriefContext(e.target.value)}
                  className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateRequestModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow transition"
                >
                  {createSubmitting ? 'Submitting...' : 'Submit for Verification'}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* 3. INSPECT REQUEST TIMELINE & RESPONSES MODAL */}
      {inspectRequestModal && (
        <Modal
          isOpen={true}
          onClose={() => setInspectRequestModal(null)}
          title={`Request Timeline: ${inspectRequestModal.request.requestId}`}
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-sm text-slate-900">{inspectRequestModal.request.unitsRequired} Units ({inspectRequestModal.request.bloodGroup})</span>
              <StatusBadge status={inspectRequestModal.request.status} />
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-3 gap-1 text-center text-[10px]">
              <div className="p-1.5 rounded-lg bg-white font-bold text-slate-900 shadow-xs">Submitted</div>
              <div className={`p-1.5 rounded-lg ${['broadcast', 'coordinating', 'fulfilled'].includes(inspectRequestModal.request.status) ? 'bg-white font-bold text-red-700 shadow-xs' : 'text-slate-400'}`}>Sent to campus</div>
              <div className={`p-1.5 rounded-lg ${inspectRequestModal.request.status === 'fulfilled' ? 'bg-white font-bold text-green-700 shadow-xs' : 'text-slate-400'}`}>Fulfilled</div>
            </div>

            <div>
              <h4 className="font-bold text-slate-800 mb-1">Responding Donors ({inspectRequestModal.responses.length})</h4>
              {inspectRequestModal.responses.length === 0 ? (
                <p className="text-slate-400 italic">No responses recorded yet.</p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {inspectRequestModal.responses.map((r: any) => (
                    <div key={r._id} className="p-2 bg-slate-50 rounded-xl flex items-center justify-between">
                      <span>{r.donorName} ({r.donorBloodGroup})</span>
                      <span className="font-semibold text-green-700 capitalize">{r.responseType.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button type="button" onClick={() => setInspectRequestModal(null)} className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold">Done</button>
            </div>
          </div>
        </Modal>
      )}

      {/* 4. PROFILE COMPLETION REMINDER MODAL */}
      <ProfileCompletionModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        attemptedAction={attemptedAction}
        onCompleted={() => {
          setProfileModalOpen(false);
          setAttemptedAction(null);
          refreshUser();
          fetchPortalData();
        }}
      />
    </div>
  );
};
