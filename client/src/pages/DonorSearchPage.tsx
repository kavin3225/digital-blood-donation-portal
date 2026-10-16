import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SanitizedDonor, BloodGroupType } from '../types';
import { Search, Filter, ShieldCheck, Heart, MapPin, Building, Info, AlertTriangle } from 'lucide-react';

export const DonorSearchPage: React.FC = () => {
  const [donors, setDonors] = useState<SanitizedDonor[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [bloodGroup, setBloodGroup] = useState<string>('All');
  const [area, setArea] = useState<string>('All');
  const [residenceType, setResidenceType] = useState<string>('All');
  const [willingness, setWillingness] = useState<string>('All');

  const fetchDonors = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (bloodGroup !== 'All') params.bloodGroup = bloodGroup;
      if (area !== 'All') params.area = area;
      if (residenceType !== 'All') params.residenceType = residenceType;
      if (willingness !== 'All') params.willingness = willingness;

      const res = await api.searchDonors(params);
      if (res.success) {
        setDonors(res.donors || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonors();
  }, [bloodGroup, area, residenceType, willingness]);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header & Policy Notice */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold">
                <Heart className="w-3.5 h-3.5 fill-red-600" />
                <span>Verified Student Donor Directory</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Privacy-Safe Student Donor Search
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Search registered donors by self-reported blood group and campus hostel block.
              </p>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center space-x-3 text-xs text-emerald-800">
              <ShieldCheck className="w-6 h-6 text-emerald-600 flex-shrink-0" />
              <div>
                <strong className="block font-bold">Privacy Guaranteed</strong>
                <span>Student phone numbers are protected from public scraping. Contact is routed via coordinators.</span>
              </div>
            </div>
          </div>

          {/* Clinical Disclaimer Callout */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-2.5 text-xs text-amber-900 leading-relaxed">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Notice:</strong> This is a student donor coordination registry, not a live hospital blood bank inventory.
              Blood compatibility and clinical eligibility are verified at the medical center before collection.
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group</label>
            <select
              value={bloodGroup}
              onChange={e => setBloodGroup(e.target.value)}
              className="w-full text-xs p-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white font-bold"
            >
              <option value="All">All Blood Groups</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Hostel / Campus Zone</label>
            <select
              value={area}
              onChange={e => setArea(e.target.value)}
              className="w-full text-xs p-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white font-medium"
            >
              <option value="All">All Campus Hostels & Zones</option>
              <option value="Block A">Hostel Block A</option>
              <option value="Block B">Hostel Block B</option>
              <option value="Block C">Hostel Block C</option>
              <option value="Sathyamangalam">Sathyamangalam Town</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Residence Type</label>
            <select
              value={residenceType}
              onChange={e => setResidenceType(e.target.value)}
              className="w-full text-xs p-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white font-medium"
            >
              <option value="All">All Residence Types</option>
              <option value="Hostel">Campus Hostel Resident</option>
              <option value="Day Scholar">Day Scholar</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Current Willingness</label>
            <select
              value={willingness}
              onChange={e => setWillingness(e.target.value)}
              className="w-full text-xs p-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white font-medium"
            >
              <option value="All">All Statuses</option>
              <option value="Willing">Willing & Available</option>
              <option value="Temporarily Unavailable">Temporarily Unavailable</option>
            </select>
          </div>
        </div>

        {/* Donors List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>Showing {donors.length} registered student donors</span>
            <span>Sorted by donor name</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
              Searching verified donor records...
            </div>
          ) : donors.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
              <Search className="w-8 h-8 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Donors Matched Filter</h3>
              <p className="text-xs text-slate-500">Try broadening your blood group or campus zone criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {donors.map(d => (
                <div
                  key={d.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-8 h-8 rounded-xl bg-red-600 text-white font-black text-xs flex items-center justify-center">
                          {d.bloodGroup}
                        </span>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                            Self-Reported Blood Group
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 leading-tight">{d.name}</h4>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                        Registered Donor
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1 pt-1">
                      <div className="flex items-center space-x-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <span>Dept of {d.department} ({d.year} Year)</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{d.residenceType} &bull; {d.approximateArea}</span>
                      </div>
                    </div>

                    {d.nonDonationHelp && d.nonDonationHelp !== 'None' && (
                      <span className="inline-block px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        Additional: {d.nonDonationHelp}
                      </span>
                    )}
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-end text-[11px]">
                    <span className="text-slate-400">Contact via Coordinator</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
