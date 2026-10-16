import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  Heart,
  Activity,
  Search,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  LogIn,
  PencilLine,
} from 'lucide-react';
import { RoleType } from '../../types';
import { ProfileCompletionModal } from '../profile/ProfileCompletionModal';

export const Navbar: React.FC = () => {
  const { user, logout, updateRolePreference, refreshUser } = useAuth();
  const { unreadCount } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const profileName = (user?.email?.split('@')[0]?.replace(/\.(?:[a-z]{2,4}\d{2,4}|\d{2,4})$/i, '').replace(/[._-]+/g, ' ').trim() || user?.name || '').replace(/\b\w/g, (letter) => letter.toUpperCase());
  const savedRole = (user?.portalRole || user?.selectedRole || 'Both') as RoleType;
  const activeRole: RoleType = savedRole === 'Both'
    ? location.pathname.startsWith('/dashboard/requester') ? 'Requester' : 'Donor'
    : savedRole;

  const handleRoleSwitch = async (newRole: RoleType) => {
    try {
      await updateRolePreference(newRole);
      if (newRole === 'Donor') navigate('/dashboard/donor');
      else if (newRole === 'Requester') navigate('/dashboard/requester');
    } catch (e) {
      console.error('Role switch failed:', e);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Personal profile */}
          <div className="flex items-center gap-2">
            {user && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((open) => !open)}
                  className="group inline-flex max-w-56 items-center gap-2.5 rounded-xl border border-sky-300 bg-sky-100 px-3 py-2 text-sky-950 shadow-md shadow-sky-900/10 transition hover:border-sky-400 hover:bg-sky-200 hover:shadow-lg hover:shadow-sky-900/15 active:translate-y-px active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                  aria-label="Show personal details"
                  aria-expanded={profileOpen}
                  aria-controls="personal-details-menu"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-300 text-blue-950 ring-1 ring-sky-400 shadow-sm transition-colors group-hover:bg-sky-400"><User className="h-4 w-4 stroke-[2.5]" /></span>
                  <span className="max-w-32 truncate text-xs font-extrabold tracking-[0.08em] text-slate-950">{(user.email?.split('@')[0]?.replace(/\.ec23$/i, '') || user.name).toUpperCase()}</span>
                </button>
                {profileOpen && createPortal(
                  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-md" onClick={() => setProfileOpen(false)}>
                    <section id="personal-details-menu" className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-7" role="dialog" aria-modal="true" aria-label="Personal details" onClick={(event) => event.stopPropagation()}>
                      <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                        <div>
                          <h2 className="text-lg font-bold text-slate-900">Personal details</h2>
                          <p className="mt-1 text-sm font-semibold text-slate-800">{profileName}</p>
                          <p className="mt-0.5 break-all text-xs text-slate-500">{user.email}</p>
                        </div>
                        <button type="button" onClick={() => setProfileOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close personal details"><X className="h-5 w-5" /></button>
                      </div>
                      <dl className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                        <div><dt className="text-xs text-slate-400">Department</dt><dd className="mt-1 font-medium text-slate-800">{user.department || 'Not provided'}</dd></div>
                        <div><dt className="text-xs text-slate-400">Register number</dt><dd className="mt-1 font-medium text-slate-800">{user.registerNumber || 'Not provided'}</dd></div>
                        <div><dt className="text-xs text-slate-400">Blood group</dt><dd className="mt-1 font-bold text-rose-700">{user.bloodGroup || 'Unknown'}</dd></div>
                        <div><dt className="text-xs text-slate-400">District</dt><dd className="mt-1 font-medium text-slate-800">{user.district || 'Not provided'}</dd></div>
                        <div><dt className="text-xs text-slate-400">Residential type</dt><dd className="mt-1 font-medium text-slate-800">{user.residenceType || 'Not provided'}</dd></div>
                        <div><dt className="text-xs text-slate-400">Area</dt><dd className="mt-1 font-medium text-slate-800">{user.approximateArea || 'Not provided'}</dd></div>
                        <div><dt className="text-xs text-slate-400">Mobile</dt><dd className="mt-1 font-medium text-slate-800">{user.mobile || 'Not provided'}</dd></div>
                      </dl>
                      <div className="mt-6 flex justify-end">
                        <button type="button" onClick={() => { setProfileOpen(false); setEditProfileOpen(true); }} className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-800"><PencilLine className="h-4 w-4" /> Edit personal details</button>
                      </div>
                    </section>
                  </div>,
                  document.body
                )}
              </div>
            )}
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 text-xs font-medium">
            {user ? (
              <>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    location.pathname === '/login'
                      ? 'bg-red-50 text-red-700'
                      : 'text-slate-700 hover:text-red-700 hover:bg-slate-50'
                  }`}
                >
                  Unified Portal
                </Link>
                <Link
                  to="/login/donor"
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-garden-terracotta hover:bg-garden-ivory transition-colors"
                >
                  Donor (Life Garden)
                </Link>
                <Link
                  to="/login/requester"
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-desk-midnight hover:bg-desk-pearl transition-colors"
                >
                  Requester (Response Desk)
                </Link>
              </>
            )}
          </nav>

          {/* Right Action Icons & Profile */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {user ? (
              <>
                <div className="hidden sm:flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1" aria-label="Choose portal role">
                  <button
                    type="button"
                    onClick={() => void handleRoleSwitch('Donor')}
                    aria-pressed={activeRole === 'Donor'}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${activeRole === 'Donor' ? 'bg-rose-700 text-white shadow-md shadow-rose-900/20' : 'text-slate-600 hover:bg-white hover:text-rose-800'}`}
                  >
                    <Heart className="h-4 w-4" /> Donor
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRoleSwitch('Requester')}
                    aria-pressed={activeRole === 'Requester'}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${activeRole === 'Requester' ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-900/15' : 'text-slate-600 hover:bg-white hover:text-slate-950'}`}
                  >
                    <Activity className="h-4 w-4" /> Requester
                  </button>
                </div>

                {/* Notifications Bell */}
                <Link
                  to="/notifications"
                  className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 relative transition active:scale-95"
                  aria-label="View notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </Link>

                {/* Logout Button */}
                <button
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition active:scale-95"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white text-xs font-bold hover:shadow-md hover:shadow-red-500/20 active:scale-95 transition-all shadow-xs"
              >
                <span>College Sign In</span>
                <LogIn className="w-3.5 h-3.5" />
              </Link>
            )}

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:scale-95"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2 animate-in fade-in slide-in-from-top-2">
          {user ? (
            <>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                Signed in as {user.name} ({user.email})
              </div>
              <div className="grid grid-cols-2 gap-2 px-1 py-1">
                <button type="button" onClick={() => { setMobileMenuOpen(false); void handleRoleSwitch('Donor'); }} aria-pressed={activeRole === 'Donor'} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition ${activeRole === 'Donor' ? 'bg-rose-700 text-white shadow-md' : 'border border-rose-200 bg-rose-50 text-rose-800'}`}><Heart className="h-4 w-4" />Donor</button>
                <button type="button" onClick={() => { setMobileMenuOpen(false); void handleRoleSwitch('Requester'); }} aria-pressed={activeRole === 'Requester'} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition ${activeRole === 'Requester' ? 'bg-amber-400 text-slate-950 shadow-md' : 'border border-amber-200 bg-amber-50 text-slate-900'}`}><Activity className="h-4 w-4" />Requester</button>
              </div>
              <Link
                to="/notifications"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-800 hover:bg-slate-100"
              >
                Notifications {unreadCount > 0 && `(${unreadCount})`}
              </Link>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-800 hover:bg-slate-100"
              >
                Profile & Role Preferences
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                  navigate('/');
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-sm font-bold text-red-700 bg-red-50"
              >
                Unified Portal Login
              </Link>
              <Link
                to="/login/donor"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-800 hover:bg-slate-100"
              >
                Donor Login (Life Garden)
              </Link>
              <Link
                to="/login/requester"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-800 hover:bg-slate-100"
              >
                Requester Login (Response Desk)
              </Link>
            </>
          )}
        </div>
      )}
      {user && createPortal(<ProfileCompletionModal isOpen={editProfileOpen} onClose={() => setEditProfileOpen(false)} onCompleted={() => void refreshUser()} />, document.body)}
    </header>
  );
};
