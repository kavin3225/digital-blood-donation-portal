import React from 'react';

export const CampusOrbitArtwork: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none -z-10"
    >
      {/* Background Radial Celestial Glows */}
      <div className="absolute top-1/4 left-1/4 w-[650px] h-[650px] bg-orbit-plumLight/80 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2 animate-blob-breathe" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-orbit-tealLight/70 rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2 animate-blob-breathe [animation-delay:4s]" />
      <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-purple-200/30 rounded-full blur-2xl transform -translate-x-1/2 -translate-y-1/2 animate-pulse-glow" />

      {/* Intersecting Elliptical Orbital Trajectories */}
      <svg
        className="w-full h-full opacity-70"
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="orbitPlumGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#581C87" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#581C87" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="orbitTealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0D9488" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#14B8A6" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#0D9488" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Primary Elliptical Orbit Path (Donating Orbit - Plum) */}
        <ellipse
          cx="720"
          cy="450"
          rx="540"
          ry="270"
          stroke="url(#orbitPlumGrad)"
          strokeWidth="2"
          strokeDasharray="12 8"
          transform="rotate(-15 720 450)"
        />

        {/* Secondary Elliptical Orbit Path (Requesting Orbit - Teal) */}
        <ellipse
          cx="720"
          cy="450"
          rx="460"
          ry="220"
          stroke="url(#orbitTealGrad)"
          strokeWidth="2"
          strokeDasharray="10 6"
          transform="rotate(24 720 450)"
        />

        {/* Inner Synchronous Orbit Ring with Pulse */}
        <circle
          cx="720"
          cy="450"
          r="170"
          stroke="#581C87"
          strokeWidth="1.5"
          strokeOpacity="0.25"
          className="animate-pulse-subtle"
        />
        <circle
          cx="720"
          cy="450"
          r="90"
          stroke="#0D9488"
          strokeWidth="1"
          strokeOpacity="0.3"
          strokeDasharray="4 4"
        />

        {/* Clockwise Orbiting Satellite Cluster (Outer Tier) */}
        <g
          className="animate-orbit-spin origin-[720px_450px] motion-reduce:animate-none"
          style={{ transformOrigin: '720px 450px' }}
        >
          {/* Donor Node (Plum Satellite) */}
          <circle cx="280" cy="380" r="13" fill="#581C87" fillOpacity="0.85" />
          <circle cx="280" cy="380" r="24" stroke="#581C87" strokeWidth="1" strokeOpacity="0.4" />
          {/* Faint Satellite Trail */}
          <circle cx="255" cy="370" r="6" fill="#8B5CF6" fillOpacity="0.3" />

          {/* Tertiary Scout Satellite */}
          <circle cx="1160" cy="380" r="7" fill="#8B5CF6" fillOpacity="0.7" />
        </g>

        {/* Counter-Clockwise Orbiting Satellite Cluster (Inner Tier) */}
        <g
          className="animate-orbit-reverse origin-[720px_450px] motion-reduce:animate-none"
          style={{ transformOrigin: '720px 450px' }}
        >
          {/* Requester Node (Teal Satellite) */}
          <circle cx="1160" cy="520" r="11" fill="#0D9488" fillOpacity="0.85" />
          <circle cx="1160" cy="520" r="20" stroke="#0D9488" strokeWidth="1" strokeOpacity="0.4" />
          {/* Faint Satellite Trail */}
          <circle cx="1185" cy="535" r="5" fill="#14B8A6" fillOpacity="0.3" />

          {/* Quaternary Scout Satellite */}
          <circle cx="380" cy="520" r="8" fill="#0D9488" fillOpacity="0.6" />
        </g>

        {/* Subtle Decorative Celestial Stars */}
        <g className="animate-pulse-subtle opacity-40">
          <circle cx="180" cy="180" r="4" fill="#581C87" />
          <circle cx="1280" cy="740" r="5" fill="#0D9488" />
          <circle cx="860" cy="140" r="3" fill="#8B5CF6" />
          <circle cx="560" cy="780" r="3.5" fill="#0D9488" />
        </g>
      </svg>
    </div>
  );
};
