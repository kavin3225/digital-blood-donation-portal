import React from 'react';
import { ShieldCheck, Heart, Info } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-xs py-10 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center space-x-2 text-white font-bold text-sm mb-2">
              <Heart className="w-4 h-4 text-red-500 fill-red-500" />
              <span>Digital Blood Donation and Emergency Blood Availability Management Portal</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Sathyamangalam, Erode District, Tamil Nadu 638401.
            </p>
          </div>

          <div>
            <div className="flex items-center space-x-2 text-white font-bold text-sm mb-2">
              <Info className="w-4 h-4 text-amber-400" />
              <span>Clinical Suitability Notice</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              This portal is an emergency coordination platform for willing student volunteers. All donor blood groups
              are self-reported. Final donor suitability, screening, cross-matching, and collection are strictly performed
              by the authorized hospital blood bank.
            </p>
          </div>

          <div>
            <div className="flex items-center space-x-2 text-white font-bold text-sm mb-2">
              <ShieldCheck className="w-4 h-4 text-green-400" />
              <span>Student Privacy & Ethics</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Personal contact details remain protected. General directory views never expose phone numbers or exact room
              locations. All communications are mediated through verified college coordinators.
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-slate-500 text-[11px] gap-2">
          <div>
            &copy; {new Date().getFullYear()} Digital Blood Donation Portal. All rights reserved.
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-slate-600">College email accounts ending in @bitsathy.ac.in</span>
            <span>Emergency Coordination Desk: +91 4295 226000</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
