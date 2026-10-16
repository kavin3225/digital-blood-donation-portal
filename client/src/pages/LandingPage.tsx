import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { CampusStats } from '../types';
import { CollegeAuthModalContent } from '../components/auth/CollegeAuthModalContent';
import { Modal } from '../components/common/Modal';
import {
  Droplet,
  Heart,
  Activity,
  ShieldCheck,
  CheckCircle2,
  Users,
  Search,
  ArrowRight,
  Clock,
  MapPin,
  Lock,
  ChevronDown,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useTouchRipple, RippleContainer } from '../components/common/TouchRipple';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<CampusStats | null>(null);

  // Auth Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'register'>('signin');

  const getBloodRipple = useTouchRipple();
  const registerRipple = useTouchRipple();
  const loginNavRipple = useTouchRipple();

  useEffect(() => {
    api
      .getCampusStats()
      .then((res: any) => {
        if (res.success) setStats(res.stats);
      })
      .catch(() => {});
  }, []);

  const handleOpenAuth = (tab: 'signin' | 'register') => {
    if (tab === 'signin') {
      navigate('/login');
      return;
    }
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  const handleGetBloodClick = () => {
    if (user) {
      navigate('/portal');
    } else {
      handleOpenAuth('signin');
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-between selection:bg-rose-600 selection:text-white relative overflow-x-hidden">
      {/* 
        ========================================================================
        HERO SECTION: MATCHING USER SCREENSHOT
        Curved diagonal crimson gradient on the left with circular blood drop logo;
        Clean navigation and impactful title on the right.
        ========================================================================
      */}
      <section className="relative min-h-[580px] lg:min-h-[640px] w-full overflow-hidden border-b border-slate-100 flex flex-col justify-between">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
          <span className="ambient-orb absolute left-[42%] top-24 h-24 w-24 rounded-full bg-rose-200/30 blur-2xl" />
          <span className="ambient-orb ambient-orb--reverse absolute right-[8%] top-[58%] h-36 w-36 rounded-full bg-sky-200/30 blur-3xl" />
          <span className="ambient-orb ambient-orb--slow absolute left-[56%] bottom-8 h-16 w-16 rounded-full bg-amber-200/40 blur-2xl" />
        </div>
        {/* Dynamic Curved Deep Crimson Gradient Wave (Left Section) */}
        <div className="absolute top-0 left-0 bottom-0 w-full lg:w-[48%] pointer-events-none z-0">
          <svg
            className="w-full h-full object-cover"
            viewBox="0 0 600 700"
            preserveAspectRatio="none"
            fill="none"
          >
            <defs>
              <linearGradient id="bloodWaveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#9f1239" />
                <stop offset="40%" stopColor="#881337" />
                <stop offset="85%" stopColor="#4c0519" />
                <stop offset="100%" stopColor="#2e020d" />
              </linearGradient>
            </defs>
            <path
              d="M 0,0 L 320,0 C 180,180 140,380 440,700 L 0,700 Z"
              fill="url(#bloodWaveGrad)"
            />
          </svg>
        </div>

        {/* TOP NAVIGATION BAR */}
        <header className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4 flex items-center justify-between">
          {/* Circular Blood Drop Logo Badge (Top Left over crimson area) */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-white shadow-xl shadow-red-950/20 flex items-center justify-center border-2 border-red-100/50 group-hover:scale-105 transition-transform">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-red-500/40 flex items-center justify-center bg-rose-50/50">
                <Droplet className="w-5 h-5 sm:w-6 sm:h-6 text-rose-700 fill-rose-600 transition-transform group-hover:scale-110" />
              </div>
            </div>
            <div className="hidden sm:block text-left text-white drop-shadow-sm pl-1">
              <span className="block font-black text-sm tracking-tight leading-tight">Blood Donation Portal</span>
              <span className="block text-[10px] text-rose-200/90 font-medium">bitsathy.ac.in</span>
            </div>
          </Link>

          {/* Navigation Links (Home, About Us, Find Blood, Register Now, Log In) */}
          <nav className="flex items-center space-x-5 sm:space-x-8 text-xs sm:text-sm font-semibold text-slate-700">
            <Link
              to="/"
              className="text-slate-900 font-bold border-b-2 border-slate-900 pb-0.5 transition"
            >
              Home
            </Link>

            <a
              href="#about-section"
              className="text-slate-600 hover:text-slate-900 transition hover:border-b-2 hover:border-slate-300 pb-0.5"
            >
              About Us
            </a>

            <Link
              to="/donors/search"
              className="text-slate-600 hover:text-slate-900 transition hover:border-b-2 hover:border-slate-300 pb-0.5"
            >
              Find Blood
            </Link>

            {/* Register Now Link */}
            <button
              type="button"
              onClick={() => handleOpenAuth('register')}
              className="text-slate-600 hover:text-slate-900 transition flex items-center space-x-1"
            >
              <span>Register Now</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Outlined Log In Button (Matches Screenshot) */}
            {user ? (
              <Link
                to="/portal"
                className="py-2 px-5 sm:px-6 rounded-2xl border-2 border-slate-900 hover:bg-slate-900 hover:text-white font-bold text-xs sm:text-sm transition-all active:scale-95 shadow-xs"
              >
                Go to Portal &rarr;
              </Link>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  loginNavRipple.triggerRipple(e);
                  handleOpenAuth('signin');
                }}
                className="relative touch-ripple-container py-2 px-5 sm:px-6 rounded-2xl border-2 border-slate-900 hover:bg-slate-900 hover:text-white text-slate-900 font-bold text-xs sm:text-sm transition-all active:scale-95 shadow-xs"
              >
                <RippleContainer ripples={loginNavRipple.ripples} color="rgba(0,0,0,0.15)" />
                <span className="relative z-10">Log In</span>
              </button>
            )}
          </nav>
        </header>

        {/* HERO BODY CONTENT (Right aligned matching image) */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 flex-1 flex flex-col justify-center">
          <div className="w-full flex justify-end">
            <div className="w-full lg:w-[58%] text-left space-y-6 lg:pl-10">
              {/* Institution Accreditation Tag */}
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                <span>Emergency Blood Network</span>
              </div>

              {/* Exact Main Headline from Image */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.12]">
                Save Life Donate{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-rose-600 to-amber-600">
                  Blood
                </span>
              </h1>

              {/* Tailored Institutional Context Content */}
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl font-normal">
                A digital blood donation and emergency availability portal for students, faculty, and staff.
                Request urgent blood for yourself or a friend using your verified email
                (<strong className="text-slate-800">@bitsathy.ac.in</strong>). Verified
                donors are notified in real-time across Erode, Coimbatore, Tiruppur, and Tamil Nadu.
              </p>

              {/* Action Buttons: "Get Blood Now" & "Register as Donor" */}
              <div className="pt-2 flex flex-wrap items-center gap-3.5">
                {/* Black Rounded Pill Button (Matching user screenshot) */}
                <button
                  type="button"
                  onClick={(e) => {
                    getBloodRipple.triggerRipple(e);
                    handleGetBloodClick();
                  }}
                  className="relative touch-ripple-container px-8 py-3.5 rounded-full bg-black hover:bg-slate-800 text-white font-black text-sm tracking-wide shadow-xl shadow-black/15 transition-all duration-200 active:scale-95 flex items-center space-x-2 group"
                >
                  <RippleContainer ripples={getBloodRipple.ripples} color="rgba(255,255,255,0.2)" />
                  <span className="relative z-10">Get Blood Now</span>
                  <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    registerRipple.triggerRipple(e);
                    handleOpenAuth('register');
                  }}
                  className="relative touch-ripple-container px-7 py-3.5 rounded-full border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm shadow-xs transition-all duration-200 active:scale-95 flex items-center space-x-2"
                >
                  <RippleContainer ripples={registerRipple.ripples} color="rgba(0,0,0,0.06)" />
                  <span className="relative z-10">Register as Donor</span>
                </button>
              </div>

              {/* Quick Trust Highlights */}
              <div className="pt-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Verified @bitsathy.ac.in Only</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Self & Friend Requests</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Privacy Protected Contact Policy</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 
        ========================================================================
        ABOUT US & HOW IT WORKS SECTION
        ========================================================================
      */}
      <section id="about-section" className="py-16 sm:py-24 bg-slate-50/70 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-rose-700">How The Network Operates</h2>
            <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Rapid College Coordination When Seconds Matter
            </h3>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              A trusted emergency network for verified members, with coordinator authorization and no commercial intermediaries.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-7 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
                <Heart className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">1. Verified College Request</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Any student or staff member can submit an emergency blood request for themselves or a college classmate
                directly using their authenticated college email.
              </p>
            </div>

            <div className="bg-white p-7 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">2. Coordinator Review & Broadcast</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Health & NSS coordinators confirm casualty authenticity without exposing sensitive personal numbers,
                then dispatch instant targeted broadcasts to consenting matching donors.
              </p>
            </div>

            <div className="bg-white p-7 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <Activity className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">3. Direct Volunteer Response</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Matching student donors in hostels or nearby towns respond with one touch. Coordinators facilitate
                safe transport and blood donation completion.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 bg-white border-t border-slate-100 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Droplet className="w-4 h-4 text-rose-600 fill-rose-600" />
            <span className="font-bold text-slate-800">
              Digital Blood Donation and Emergency Blood Availability Management Portal
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <Link to="/admin/login" className="hover:text-slate-900 font-bold flex items-center space-x-1 text-slate-600">
              <Lock className="w-3.5 h-3.5" />
              <span>Admin Desk</span>
            </Link>
            <span>&bull;</span>
            <span>Alathukombai, Sathyamangalam, Erode, Tamil Nadu 638401</span>
          </div>
        </div>
      </footer>

      {/* 
        ========================================================================
        AUTHENTICATION MODAL (SIGN IN & NEW REGISTRATION)
        Triggered when user clicks "Log In" or "Register Now" from top navbar.
        The backend enforces the @bitsathy.ac.in domain for password sign-in.
        ========================================================================
      */}
      {authModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setAuthModalOpen(false)}
          title=""
          maxWidth="max-w-2xl"
        >
          <div className="pt-1">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-600 text-white flex items-center justify-center mx-auto shadow-md shadow-red-500/20">
              <Droplet className="w-6 h-6 fill-white" />
            </div>
            <h3 className="mb-4 mt-3 text-center text-xl font-black tracking-tight text-slate-900">{authModalTab === 'signin' ? 'College Sign In' : 'New College Registration'}</h3>
            <CollegeAuthModalContent tab={authModalTab} onTabChange={setAuthModalTab} onClose={() => setAuthModalOpen(false)} />
          </div>
        </Modal>
      )}
    </div>
  );
};
