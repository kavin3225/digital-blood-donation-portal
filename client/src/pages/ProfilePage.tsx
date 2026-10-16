import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { RoleType, NonDonationHelpType } from '../types';
import { api } from '../services/api';
import { Heart, Activity, CheckCircle2, PencilLine } from 'lucide-react';
import { ProfileCompletionModal } from '../components/profile/ProfileCompletionModal';

export const ProfilePage: React.FC = () => {
  const { user, updateRolePreference, refreshUser } = useAuth();
  const [selectedRole, setSelectedRole] = useState<RoleType>(user?.portalRole === 'Requester' || user?.selectedRole === 'Requester' ? 'Requester' : 'Donor');
  const [nonDonationHelp, setNonDonationHelp] = useState<NonDonationHelpType>(user?.nonDonationHelp || 'None');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (selectedRole !== user?.portalRole) {
        await updateRolePreference(selectedRole);
      }
      await api.updateAvailabilityFreshness({ nonDonationHelp });
      await refreshUser();
      setNotice('Preferences updated successfully. All previous request and response history has been retained.');
      setTimeout(() => setNotice(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {notice && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-xs text-green-900 font-medium flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {/* Role Preference Settings */}
        <form onSubmit={handleSavePreferences} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 text-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-slate-900">Portal Role Preference</h2>
              <p className="text-slate-500">
                Select which role workspace you wish to use. You can change this at any time without losing any created requests or response logs.
              </p>
            </div>
            <button type="button" onClick={() => setEditProfileOpen(true)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500">
              <PencilLine className="h-4 w-4" /> Edit personal profile
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedRole('Donor')}
              className={`p-4 rounded-2xl border text-left transition ${
                selectedRole === 'Donor'
                  ? 'border-garden-terracotta bg-garden-terracottaLight text-slate-900 ring-2 ring-garden-terracotta/30'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <Heart className="w-5 h-5 text-garden-terracotta mb-2" />
              <span className="block font-bold">Donor</span>
              <span className="text-[11px] text-slate-500">Respond to emergency blood needs</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('Requester')}
              className={`p-4 rounded-2xl border text-left transition ${
                selectedRole === 'Requester'
                  ? 'border-desk-amberDark bg-desk-amberLight text-slate-900 ring-2 ring-desk-amber/30'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <Activity className="w-5 h-5 text-desk-amberDark mb-2" />
              <span className="block font-bold">Requester</span>
              <span className="text-[11px] text-slate-500">Submit urgent patient blood needs</span>
            </button>

          </div>

          <div className="border-t border-slate-100 pt-5 space-y-4">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-slate-900">Non-Donation Logistical Help</h2>
              <p className="text-slate-500">
                Willing to assist peers without donating blood directly (e.g. transport, health desk coordination)?
              </p>
            </div>

            <select
              value={nonDonationHelp}
              onChange={e => setNonDonationHelp(e.target.value as NonDonationHelpType)}
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-xs"
            >
              <option value="None">None (Blood Donor Only)</option>
              <option value="Transport">Logistical Support (Hospital Attendant / Guidance)</option>
              <option value="Desk Coordination">Campus Coordination Desk Volunteer</option>
              <option value="Logistics">Attendant / Patient Support</option>
            </select>
          </div>

          <div className="border-t border-slate-100 pt-5 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile Preferences'}
            </button>
          </div>
        </form>
      </div>
      <ProfileCompletionModal isOpen={editProfileOpen} onClose={() => setEditProfileOpen(false)} onCompleted={() => void refreshUser()} />
    </div>
  );
};
