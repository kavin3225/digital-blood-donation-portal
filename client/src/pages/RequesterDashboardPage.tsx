import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { EmergencyRequest, BloodGroupType } from '../types';
import { ResponseDeskArtwork } from '../components/artworks/ResponseDeskArtwork';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { ActionConfirmModal } from '../components/common/ActionConfirmModal';
import { ProfileCompletionModal } from '../components/profile/ProfileCompletionModal';
import { ProfileIncompleteBanner } from '../components/profile/ProfileIncompleteBanner';
import { TAMIL_NADU_DISTRICTS, CAMPUS_AREA_SUGGESTIONS } from '../utils/districts';
import { useToast } from '../context/ToastContext';
import {
  Activity,
  PlusCircle,
  Building2,
  MapPin,
  Clock,
  Phone,
  User,
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

export const RequesterDashboardPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [myRequests, setMyRequests] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Cancel Confirmation Modal State
  const [cancelConfirmReq, setCancelConfirmReq] = useState<EmergencyRequest | null>(null);

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

  // Create Request Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // College Emergency Request Form Fields
  const [requestTarget, setRequestTarget] = useState<'Self' | 'College Friend'>('Self');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientName, setPatientName] = useState('');
  const [relationship, setRelationship] = useState('Friend');
  const [bloodGroup, setBloodGroup] = useState<BloodGroupType>('A+');
  const [urgency, setUrgency] = useState<'emergency' | 'within_24h' | 'planned'>('emergency');
  const clientRequestKey = useRef(crypto.randomUUID());
  const [unitsRequired, setUnitsRequired] = useState(1);
  const [district, setDistrict] = useState(user?.district || 'Erode');
  const [area, setArea] = useState(user?.approximateArea || 'Sathyamangalam Campus');
  const [areaSearch, setAreaSearch] = useState('');
  const [showAreaSuggestions, setShowAreaSuggestions] = useState(false);
  const [requiredByDate, setRequiredByDate] = useState('');
  const [contactPersonName, setContactPersonName] = useState(user?.name || '');
  const [contactPersonPhone, setContactPersonPhone] = useState(user?.mobile || '');
  const [briefContext, setBriefContext] = useState('');

  // Selected Request for Response View / Detail
  const [selectedRequestDetails, setSelectedRequestDetails] = useState<{
    request: EmergencyRequest;
    responses: any[];
  } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      if (requestTarget === 'Self') {
        setPatientEmail(user.collegeEmail || user.googleEmail || '');
      }
      if (!contactPersonName) setContactPersonName(user.name || '');
      if (!contactPersonPhone) setContactPersonPhone(user.mobile || '');
      if (!district) setDistrict(user.district || 'Erode');
      if (!area) setArea(user.approximateArea || 'Sathyamangalam Campus');
    }
  }, [user, requestTarget]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.getMyRequests();
      if (res.success) {
        setMyRequests(res.requests || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const handleOpenCreateModal = () => {
    if (!user?.isProfileComplete) {
      setAttemptedAction('Submitting an emergency blood request');
      setProfileModalOpen(true);
      return;
    }
    setCreateModalOpen(true);
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!user?.isProfileComplete) {
      setAttemptedAction('Submitting an emergency blood request');
      setProfileModalOpen(true);
      return;
    }

    if (requestTarget === 'College Friend') {
      const emailTrim = patientEmail.trim().toLowerCase();
      if (patientName.trim().length < 2) {
        setFormError('Enter your friend’s full name.');
        return;
      }
      if (emailTrim && !emailTrim.endsWith('@bitsathy.ac.in')) {
        setFormError('If known, the patient email must use @bitsathy.ac.in.');
        return;
      }
    }

    if (!requiredByDate) {
      setFormError('Please select a required-by date and time.');
      return;
    }

    if (!area.trim()) {
      setFormError('Please provide the area/town for this request.');
      return;
    }

    const cleanPhone = contactPersonPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setFormError('Please enter a valid 10-digit emergency contact phone number.');
      return;
    }

    try {
      setFormSubmitting(true);
      const res = await api.createRequest({
        clientRequestKey: clientRequestKey.current,
        requestTarget,
        patientEmail: requestTarget === 'Self' ? (user?.collegeEmail || user?.googleEmail) : patientEmail.trim().toLowerCase(),
        patientName: requestTarget === 'Self' ? user?.name : patientName.trim(),
        relationshipToStudent: requestTarget === 'Self' ? 'Self' : relationship,
        bloodGroup,
        urgency,
        unitsRequired: Number(unitsRequired),
        district,
        area: area.trim(),
        requiredBy: new Date(requiredByDate).toISOString(),
        contactPersonName: contactPersonName.trim(),
        contactPersonPhone: cleanPhone,
        briefContext: briefContext.trim(),
      });

      if (res.success) {
        clientRequestKey.current = crypto.randomUUID();
        setFormSuccess('Emergency request sent to campus users. Donors with the matching blood group can respond now.');
        setTimeout(() => {
          setCreateModalOpen(false);
          setFormSuccess(null);
          setBriefContext('');
          if (requestTarget === 'College Friend') setPatientEmail('');
          fetchRequests();
        }, 1800);
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit emergency request.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleOpenDetails = async (req: EmergencyRequest) => {
    try {
      setDetailsLoading(true);
      const res = await api.getRequestDetails(req._id);
      if (res.success) {
        setSelectedRequestDetails({
          request: res.request,
          responses: res.responses || [],
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleConfirmCancel = async (reason: string) => {
    if (!cancelConfirmReq) return;
    try {
      await api.cancelRequest(cancelConfirmReq._id, reason || 'Cancelled by requester');
      toast.success(`Emergency request ${cancelConfirmReq.requestId} cancelled.`);
      fetchRequests();
      if (selectedRequestDetails) setSelectedRequestDetails(null);
      setCancelConfirmReq(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel request');
    }
  };

  return (
    <div className="relative min-h-screen bg-desk-pearl py-8 px-4 sm:px-6 lg:px-8">
      <ResponseDeskArtwork />

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

        {/* Editorial Tactical Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-desk-amberLight text-desk-midnight text-xs font-semibold">
              <Activity className="w-3.5 h-3.5 text-desk-amberDark" />
              <span>Response Desk &bull; Emergency Coordination Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-desk-midnight tracking-tight">
              Emergency Request Central
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl">
              Submit an urgent request for yourself or a college friend. Campus users receive an alert immediately, and matching donors can respond.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-2xl bg-desk-midnight hover:bg-slate-800 text-white font-bold text-xs shadow-md shadow-slate-900/10 transition active:scale-[0.99]"
          >
            <PlusCircle className="w-4 h-4 text-desk-amber" />
            <span>Create Emergency Request</span>
          </button>
        </div>

        {/* ACTIVE REQUESTS & TIMELINE WORKSPACE */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <span>My Emergency Requests</span>
              <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 font-bold">
                {myRequests.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 hidden sm:block">Click any request to view live responses & timeline</p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
              Loading requests...
            </div>
          ) : myRequests.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
              <Activity className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Active Emergency Requests</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                You have not submitted any emergency requests. If a student or patient requires blood, click "Create Emergency Request" to begin.
              </p>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-desk-midnight text-white text-xs font-semibold inline-flex items-center space-x-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5 text-desk-amber" />
                <span>Submit First Request</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {myRequests.map(req => (
                <div
                  key={req._id}
                  onClick={() => handleOpenDetails(req)}
                  className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                      <span className="px-3 py-1 rounded-xl bg-red-600 text-white font-black text-sm">
                        {req.bloodGroup}
                      </span>
                      <span className="text-base font-bold text-slate-900">{req.unitsRequired} Unit(s) Needed</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {req.requestTarget === 'College Friend' ? 'For College Friend' : 'Self Request'}
                      </span>
                      <StatusBadge status={req.status} size="sm" />
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-desk-amberDark" />
                        <span>{req.area}, {req.district || 'Erode'}</span>
                      </span>
                      {req.requestTarget === 'College Friend' && req.patientEmail && (
                        <span className="flex items-center space-x-1 font-mono text-[11px] text-slate-400">
                          <span>Patient: {req.patientEmail}</span>
                        </span>
                      )}
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Needed by: {new Date(req.requiredBy).toLocaleString()}</span>
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-1 italic">
                      "{req.briefContext}"
                    </p>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-900 block">
                        {req.donorResponseCount || 0} Donor Responses
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">{req.requestId}</span>
                    </div>
                    {!['fulfilled', 'cancelled', 'rejected', 'expired'].includes(req.status) && <div className="flex gap-2" onClick={(event) => event.stopPropagation()}>
                      <button type="button" onClick={async () => { await api.closeRequest(req._id, 'fulfilled'); await fetchRequests(); }} className="rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100">Fulfilled</button>
                      <button type="button" onClick={async () => { await api.closeRequest(req._id, 'cancelled'); await fetchRequests(); }} className="rounded-lg bg-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-200">Cancel</button>
                    </div>}
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>


      </div>

      {/* CREATE EMERGENCY REQUEST MODAL */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create Emergency Blood Request" maxWidth="max-w-2xl">
        {formSuccess ? (
          <div className="p-6 bg-green-50 border border-green-200 rounded-2xl text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
            <h4 className="text-sm font-bold text-green-900">{formSuccess}</h4>
            <p className="text-xs text-green-700">Your request is open to matching donors. Personal contact details remain private in campus alerts.</p>
          </div>
        ) : (
          <form onSubmit={handleCreateRequest} className="space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {formError}
              </div>
            )}

            {/* Target: Self or College Friend */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Who Needs Blood? *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRequestTarget('Self')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition border ${
                    requestTarget === 'Self'
                      ? 'bg-desk-midnight text-white border-desk-midnight shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>For Myself</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRequestTarget('College Friend')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition border ${
                    requestTarget === 'College Friend'
                      ? 'bg-desk-midnight text-white border-desk-midnight shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>For College Friend</span>
                </button>
              </div>

              {requestTarget === 'College Friend' ? (
                <div className="pt-1">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Friend’s Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Patient’s full name"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                  />
                  <label className="mt-3 block text-[11px] font-bold text-slate-700 mb-1">College Email (optional, if known)</label>
                  <input type="email" placeholder="friend.ec23@bitsathy.ac.in" value={patientEmail} onChange={(e) => setPatientEmail(e.target.value)} className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-mono" />
                  <label className="mt-3 block text-[11px] font-bold text-slate-700 mb-1">Your relationship to the student</label>
                  <input type="text" maxLength={80} value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="Friend, classmate, family…" className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white" />
                  <p className="text-[10px] text-slate-500 mt-1">
                  Your friend does not need to share passwords or login. You are submitting on their behalf as a verified student or staff requester.
                  </p>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 font-mono">
                  <span className="text-[11px] font-bold text-emerald-700">Prefilled:</span>
                  <span>{user?.collegeEmail || user?.googleEmail}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Required Blood Group *
                </label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value as BloodGroupType)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-desk-amber bg-white font-bold"
                >
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'].map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Urgency *</label>
                <select value={urgency} onChange={(event) => setUrgency(event.target.value as typeof urgency)} className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"><option value="emergency">Emergency · as soon as possible</option><option value="within_24h">Needed within 24 hours</option><option value="planned">Scheduled</option></select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Units Required (1 - 10) *
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  required
                  value={unitsRequired}
                  onChange={(e) => setUnitsRequired(Number(e.target.value))}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-desk-amber"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  District *
                </label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-desk-amber bg-white font-medium"
                >
                  {TAMIL_NADU_DISTRICTS.map((dist) => (
                    <option key={dist} value={dist}>
                      {dist === 'Erode' ? 'Erode (Campus District)' : dist}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Area / Town / Campus Hostel *
                </label>
                <input
                  type="text"
                  required
                  value={area}
                  onFocus={() => setShowAreaSuggestions(true)}
                  onChange={(e) => {
                    setArea(e.target.value);
                    setAreaSearch(e.target.value);
                    setShowAreaSuggestions(true);
                  }}
                  placeholder="e.g. Sathyamangalam Campus"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-desk-amber"
                />
                {showAreaSuggestions && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-36 overflow-y-auto">
                    {CAMPUS_AREA_SUGGESTIONS.filter((s) =>
                      s.toLowerCase().includes((areaSearch || area).toLowerCase())
                    ).map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => {
                          setArea(sug);
                          setShowAreaSuggestions(false);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-[11px] font-medium text-slate-700 border-b border-slate-50 last:border-b-0"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Required By Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={requiredByDate}
                  onChange={(e) => setRequiredByDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-desk-amber"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Person Name *
                </label>
                <input
                  type="text"
                  required
                  value={contactPersonName}
                  onChange={(e) => setContactPersonName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-desk-amber"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={15}
                  value={contactPersonPhone}
                  onChange={(e) => setContactPersonPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-desk-amber font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Short Request Note (optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Emergency blood requirement for surgical stabilization / urgent transfusion."
                value={briefContext}
                onChange={(e) => setBriefContext(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-desk-amber"
              />
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formSubmitting}
                className="px-5 py-2.5 rounded-xl bg-desk-midnight hover:bg-slate-800 text-white text-xs font-bold shadow disabled:opacity-50 flex items-center space-x-1.5"
              >
                <span>{formSubmitting ? 'Submitting...' : 'Submit Request'}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* REQUEST DETAIL & RESPONSES MODAL */}
      {selectedRequestDetails && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedRequestDetails(null)}
          title={`Request Details: ${selectedRequestDetails.request.requestId}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 rounded-xl bg-red-600 text-white font-black text-sm">
                  {selectedRequestDetails.request.bloodGroup}
                </span>
                <span className="text-base font-bold text-slate-900">
                  {selectedRequestDetails.request.unitsRequired} Unit(s) Needed
                </span>
              </div>
              <StatusBadge status={selectedRequestDetails.request.status} />
            </div>

            {/* Status Timeline */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Lifecycle Status Timeline</h4>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-2 text-center text-[11px]">
                <div className={`p-2 rounded-xl ${selectedRequestDetails.request.status ? 'bg-white font-bold text-slate-900 shadow-sm' : 'text-slate-400'}`}>
                  1. Submitted
                </div>
                <div className={`p-2 rounded-xl ${['broadcast', 'coordinating', 'fulfilled'].includes(selectedRequestDetails.request.status) ? 'bg-white font-bold text-red-700 shadow-sm' : 'text-slate-400'}`}>
                  2. Sent to campus
                </div>
                <div className={`p-2 rounded-xl ${selectedRequestDetails.request.status === 'fulfilled' ? 'bg-white font-bold text-green-700 shadow-sm' : 'text-slate-400'}`}>
                  3. Fulfilled
                </div>
              </div>
            </div>

            {/* Coordinator Notes */}
            {selectedRequestDetails.request.coordinatorNotes && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                <strong>Coordinator Note:</strong> {selectedRequestDetails.request.coordinatorNotes}
              </div>
            )}

            {/* Donor Responses List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Willing Donor Responses ({selectedRequestDetails.responses.length})</span>
                <span className="text-[11px] text-slate-400">Coordinators manage direct patient contacts</span>
              </h4>

              {selectedRequestDetails.responses.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">No student donors have responded yet.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedRequestDetails.responses.map((resp: any) => (
                    <div key={resp._id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{resp.donorName}</span>
                        <span className="text-slate-500 ml-2">({resp.donorBloodGroup} &bull; {resp.donorArea})</span>
                        {resp.note && <p className="text-[11px] text-slate-600 italic mt-0.5">"{resp.note}"</p>}
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-800">
                        {resp.responseType.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              {['pending_verification', 'verified', 'broadcast'].includes(selectedRequestDetails.request.status) ? (
                <button
                  type="button"
                  onClick={() => setCancelConfirmReq(selectedRequestDetails.request)}
                  className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition active:scale-95"
                >
                  Cancel Request
                </button>
              ) : <div />}

              <button
                type="button"
                onClick={() => setSelectedRequestDetails(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bespoke Institutional Cancel Confirmation Modal */}
      {cancelConfirmReq && (
        <ActionConfirmModal
          isOpen={Boolean(cancelConfirmReq)}
          onClose={() => setCancelConfirmReq(null)}
          onConfirm={handleConfirmCancel}
          title={`Cancel Request: ${cancelConfirmReq.requestId}`}
          subtitle="Deactivate broadcasts and mark request as cancelled"
          decisionType="cancel"
          targetInfo={{
            name: `${cancelConfirmReq.bloodGroup} (${cancelConfirmReq.unitsRequired} Units)`,
            email: cancelConfirmReq.affectedStudentEmail || 'Student Casualty',
            detail: `Facility: ${cancelConfirmReq.hospital} (${cancelConfirmReq.hospitalLocation})`,
          }}
          presetReasons={[
            'Blood already arranged from blood bank / student donors',
            'Patient condition stabilized / surgery postponed',
            'Created duplicate submission by mistake',
            'Alternative volunteer reached privately',
          ]}
          confirmButtonText="Confirm Cancellation"
          requiresReason={false}
        />
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
