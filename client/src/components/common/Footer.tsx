import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowUpRight, Droplet, Heart, MapPin, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="relative isolate overflow-hidden border-t border-white/10 bg-[#111225] text-slate-300">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="ambient-orb absolute -left-24 top-20 h-72 w-72 rounded-full bg-rose-600/15 blur-[100px]" />
        <div className="ambient-orb ambient-orb--slow absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-violet-600/15 blur-[110px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-300/50 to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-7 pt-10 sm:px-6 sm:pb-8 sm:pt-14 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition duration-300 hover:-translate-y-1 hover:border-rose-300/25 hover:bg-white/[0.06]">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15 text-rose-300 ring-1 ring-rose-300/15">
              <Droplet className="h-5 w-5 fill-current" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-bold text-white">Built for the BIT community</h3>
            <p className="mt-2 text-xs leading-5 text-slate-400">A campus coordination portal connecting verified college accounts with willing student donors.</p>
            <p className="mt-4 flex items-center gap-2 text-xs text-slate-400"><MapPin className="h-3.5 w-3.5 text-rose-300" aria-hidden="true" />Alathukombai, Sathyamangalam, Tamil Nadu</p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition duration-300 hover:-translate-y-1 hover:border-amber-300/25 hover:bg-white/[0.06]">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300 ring-1 ring-amber-300/15">
              <Activity className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-bold text-white">Hospital-led donation care</h3>
            <p className="mt-2 text-xs leading-5 text-slate-400">Blood groups are self-reported. The hospital blood bank handles eligibility, screening, cross-matching, and collection.</p>
            <p className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-amber-200"><Heart className="h-3.5 w-3.5 fill-current" aria-hidden="true" />Donate only when medically eligible</p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition duration-300 hover:-translate-y-1 hover:border-emerald-300/25 hover:bg-white/[0.06]">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-300/15">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-bold text-white">Privacy comes first</h3>
            <p className="mt-2 text-xs leading-5 text-slate-400">Contact details stay protected. Requests are coordinated through verified college workflows and consent settings.</p>
            <Link to="/profile" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-emerald-200 transition hover:text-white">
              Review my sharing settings <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </section>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-5 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Digital Blood Donation Portal · Bannari Amman Institute of Technology</span>
          <span className="text-slate-400">College access: @bitsathy.ac.in</span>
        </div>
      </div>
    </footer>
  );
};
