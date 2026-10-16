import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { DEPARTMENTS } from '../../utils/districts';
import { BloodGroupType } from '../../types';
import { useTouchRipple, RippleContainer } from '../common/TouchRipple';
import {
  ShieldAlert,
  CheckCircle2,
  User,
  GraduationCap,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

interface ProfileCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: () => void;
  attemptedAction?: string | null;
}

const nameFromEmail = (email = '') => {
  const localPart = email.split('@')[0] || '';
  const readableName = localPart.replace(/\.(?:[a-z]{2,4}\d{2,4}|\d{2,4})$/i, '').replace(/[._-]+/g, ' ').trim();
  return readableName.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const ProfileCompletionModal: React.FC<ProfileCompletionModalProps> = ({
  isOpen,
  onClose,
  onCompleted,
  attemptedAction,
}) => {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();

  const initialName = nameFromEmail(user?.googleEmail || user?.email || '');
  const [name, setName] = useState(initialName || user?.name || '');
  const [department, setDepartment] = useState(user?.department || DEPARTMENTS[0]);
  const [bloodGroup, setBloodGroup] = useState<BloodGroupType>(user?.bloodGroup || 'Unknown');
  const [mobile, setMobile] = useState(user?.mobile || '');
  const [district, setDistrict] = useState(user?.district || 'Erode');
  const [area, setArea] = useState(user?.approximateArea || 'Sathyamangalam Campus');
  const [residenceType, setResidenceType] = useState<'Hostel' | 'Day Scholar' | ''>(user?.isProfileComplete ? user.residenceType || '' : '');
  const [consentAlerts, setConsentAlerts] = useState<boolean>(
    user?.consentEmergencyCommunications !== false
  );
  const [shareContact, setShareContact] = useState<boolean>(Boolean(user?.shareContactWithRequesters));

  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const saveRipple = useTouchRipple();

  useEffect(() => {
    if (user) {
      setName(nameFromEmail(user.googleEmail || user.email || '') || user.name || '');
      setDepartment(user.department || DEPARTMENTS[0]);
      setBloodGroup(user.bloodGroup || 'Unknown');
      setMobile(user.mobile || '');
      setDistrict(user.district || 'Erode');
      setArea(user.approximateArea || 'Sathyamangalam Campus');
      setResidenceType(user.isProfileComplete ? user.residenceType || '' : '');
      setConsentAlerts(user.consentEmergencyCommunications !== false);
      setShareContact(Boolean(user.shareContactWithRequesters));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Form validations
    if (!name.trim() || name.trim().length < 2) {
      setValidationError('Please enter your full official name.');
      return;
    }

    if (!residenceType) {
      setValidationError('Please choose Day Scholar or Hostel.');
      return;
    }

    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      setValidationError('Please enter a valid 10-digit mobile number for emergency coordination.');
      return;
    }

    if (!area.trim()) {
      setValidationError('Please specify your residential area or campus hostel.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await updateProfile({
        name: name.trim(),
        userType: 'Student',
        department,
        bloodGroup,
        mobile: cleanMobile,
        district: user?.district || district || 'Erode',
        approximateArea: area.trim() || 'Sathyamangalam Campus',
        residenceType,
        consentEmergencyCommunications: consentAlerts,
        shareContactWithRequesters: shareContact,
      });

      if (res.success) {
        sessionStorage.removeItem('bit_profile_modal_dismissed');
        toast.success(
          'Profile completed successfully! Blood requests and donor actions are now fully unlocked.'
        );
        if (onCompleted) onCompleted();
        onClose();
      }
    } catch (err: any) {
      setValidationError(err.message || 'Failed to update profile. Please check all fields.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('bit_profile_modal_dismissed', 'true');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleDismiss} title="" maxWidth="max-w-2xl">
      <div className="space-y-5 text-left pt-1">
        {/* Header Badge */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-600 text-white flex items-center justify-center shadow-md shadow-red-500/20 flex-shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">{user?.isProfileComplete ? 'Edit College Profile' : 'Complete College Profile'}</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200">
                  Required Action
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Student Emergency Network
              </p>
            </div>
          </div>
        </div>

        {/* Action Restriction Context Alert */}
        {attemptedAction && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center space-x-2 text-xs text-red-700 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>
              <strong>Action Restricted:</strong> You must complete your profile before you can{' '}
              <span className="font-bold underline">{attemptedAction}</span>.
            </span>
          </div>
        )}

        {validationError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center space-x-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Profile Completion Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500"><GraduationCap className="h-4 w-4" /> Student account</div>
            <label className="flex items-start space-x-2.5 pt-1 cursor-pointer">
              <input type="checkbox" checked={shareContact} onChange={(e) => setShareContact(e.target.checked)} className="w-4 h-4 rounded text-red-600 focus:ring-red-500 mt-0.5" />
              <span className="text-[11px] text-slate-600 leading-snug">If I volunteer to help, I allow my phone number to be shared directly with this request’s owner.</span>
            </label>
          </div>

          {/* BASIC IDENTITY FIELDS */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                readOnly
                placeholder="Your name from your email"
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-slate-50 font-medium text-slate-600"
              />
              <p className="mt-1 text-[10px] text-slate-500">Fetched from your signed-in email address and cannot be changed.</p>
            </div>
          </div>

          {/* DEPARTMENT */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Department / Branch *</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium bg-white"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* BLOOD GROUP & MOBILE NUMBER */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Blood Group *</label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value as BloodGroupType)}
                className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 font-bold bg-white text-red-700"
              >
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'].map((bg) => (
                  <option key={bg} value={bg}>
                    {bg === 'Unknown' ? 'Unknown (Not tested yet)' : bg}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Mobile Phone Number *</label>
              <input
                type="tel"
                required
                maxLength={15}
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
              />
            </div>
          </div>

          {/* RESIDENCE TYPE */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Residential Type *</label>
            <select
              required
              value={residenceType}
              onChange={(e) => setResidenceType(e.target.value as 'Hostel' | 'Day Scholar' | '')}
              className="w-full p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium bg-white"
            >
              <option value="" disabled hidden></option>
              <option value="Day Scholar">Day Scholar</option>
              <option value="Hostel">Hostel</option>
            </select>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            {/* Emergency Alert Consent */}
            <label className="flex items-start space-x-2.5 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={consentAlerts}
                onChange={(e) => setConsentAlerts(e.target.checked)}
                className="w-4 h-4 rounded text-red-600 focus:ring-red-500 mt-0.5"
              />
              <span className="text-[11px] text-slate-600 leading-snug">
                I consent to receive urgent blood request broadcasts from the emergency network when matching requests occur.
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleDismiss}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition rounded-xl"
            >
              Dismiss for Now
            </button>

            <button
              type="submit"
              disabled={submitting}
              onClick={(e) => saveRipple.triggerRipple(e)}
              className="relative touch-ripple-container px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-bold shadow-md shadow-red-500/20 transition active:scale-95 disabled:opacity-50 flex items-center space-x-1.5"
            >
              <RippleContainer ripples={saveRipple.ripples} color="rgba(255, 255, 255, 0.2)" />
              <span className="relative z-10">{submitting ? 'Saving Profile...' : user?.isProfileComplete ? 'Save Profile Changes' : 'Save & Complete Profile'}</span>
              <ArrowRight className="w-3.5 h-3.5 relative z-10" />
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
