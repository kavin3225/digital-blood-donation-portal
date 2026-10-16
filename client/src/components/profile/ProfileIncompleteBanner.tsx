import React from 'react';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import { useTouchRipple, RippleContainer } from '../common/TouchRipple';

interface ProfileIncompleteBannerProps {
  onOpenModal: () => void;
}

export const ProfileIncompleteBanner: React.FC<ProfileIncompleteBannerProps> = ({ onOpenModal }) => {
  const bannerRipple = useTouchRipple();

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 via-rose-500 to-red-600 text-white p-4 sm:p-5 shadow-lg shadow-rose-500/20 mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0 shadow-inner">
            <ShieldAlert className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-black tracking-tight text-white">
                Profile Incomplete: Emergency Requests & Donor Responses Restricted
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/25 font-bold uppercase tracking-wider">
                Action Required
              </span>
            </div>
            <p className="text-xs text-white/90 mt-0.5 leading-relaxed max-w-2xl">
              All user profiles must be fully completed
              (Department, Blood Group, District & Area, Mobile) before submitting blood requests or volunteering.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            bannerRipple.triggerRipple(e);
            onOpenModal();
          }}
          className="relative touch-ripple-container px-5 py-2.5 rounded-2xl bg-white text-slate-900 hover:bg-slate-50 font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2 flex-shrink-0"
        >
          <RippleContainer ripples={bannerRipple.ripples} color="rgba(0,0,0,0.1)" />
          <span className="relative z-10">Complete Profile Now</span>
          <ArrowRight className="w-3.5 h-3.5 relative z-10" />
        </button>
      </div>

      {/* Subtle Background Glow Accent */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
    </div>
  );
};
