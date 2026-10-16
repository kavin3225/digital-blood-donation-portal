import React from 'react';

export const ResponseDeskArtwork: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none -z-10"
    >
      {/* Background Technical Grid with Soft Glowing Centre */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `linear-gradient(to right, #0F172A 1px, transparent 1px), linear-gradient(to bottom, #0F172A 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-amber-200/25 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2 animate-pulse-glow" />
      <div className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-slate-400/20 rounded-full blur-3xl transform animate-pulse-subtle" />

      {/* High-visibility Signal Sweeper and Coordinate Nodes */}
      <svg
        className="w-full h-full"
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="ecgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.1" />
            <stop offset="40%" stopColor="#F59E0B" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#EF4444" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Subtle Horizontal Telemetry Axis */}
        <line x1="0" y1="180" x2="1440" y2="180" stroke="#0F172A" strokeWidth="1" strokeOpacity="0.08" />
        <line x1="0" y1="520" x2="1440" y2="520" stroke="#0F172A" strokeWidth="1" strokeOpacity="0.08" />
        <line x1="0" y1="760" x2="1440" y2="760" stroke="#0F172A" strokeWidth="1" strokeOpacity="0.08" />

        {/* Vertical Grid Reference Lines */}
        <line x1="280" y1="0" x2="280" y2="900" stroke="#0F172A" strokeWidth="1" strokeOpacity="0.08" />
        <line x1="920" y1="0" x2="920" y2="900" stroke="#0F172A" strokeWidth="1" strokeOpacity="0.08" />
        <line x1="1260" y1="0" x2="1260" y2="900" stroke="#0F172A" strokeWidth="1" strokeOpacity="0.08" />

        {/* Tactical Radar Pulse & Beam in Upper Right */}
        <g className="opacity-50">
          <circle cx="1200" cy="220" r="160" stroke="#F59E0B" strokeWidth="1" strokeDasharray="6 4" strokeOpacity="0.3" />
          <circle cx="1200" cy="220" r="100" stroke="#F59E0B" strokeWidth="1.2" strokeOpacity="0.4" />
          <circle cx="1200" cy="220" r="45" stroke="#EF4444" strokeWidth="1.5" strokeOpacity="0.6" className="animate-ping" style={{ animationDuration: '4s' }} />
          <circle cx="1200" cy="220" r="5" fill="#EF4444" />

          {/* Radar Scanning Line */}
          <line
            x1="1200"
            y1="220"
            x2="1340"
            y2="140"
            stroke="#F59E0B"
            strokeWidth="2"
            strokeOpacity="0.7"
            className="radar-sweep-beam"
            style={{ transformOrigin: '1200px 220px' }}
          />
        </g>

        {/* Lower Left Tactical Coordinate Crosshair */}
        <g opacity="0.4">
          <circle cx="220" cy="680" r="55" stroke="#0F172A" strokeWidth="1.5" strokeDasharray="4 4" />
          <line x1="140" y1="680" x2="300" y2="680" stroke="#0F172A" strokeWidth="1" />
          <line x1="220" y1="600" x2="220" y2="760" stroke="#0F172A" strokeWidth="1" />
          <rect x="216" y="676" width="8" height="8" fill="#F59E0B" />
        </g>

        {/* Active Animated ECG Heartbeat Waveform Line */}
        <path
          d="M 0 520 L 400 520 L 420 500 L 435 540 L 450 470 L 465 560 L 480 510 L 495 525 L 510 520 L 900 520 L 920 500 L 935 540 L 950 460 L 965 570 L 980 510 L 995 525 L 1010 520 L 1440 520"
          stroke="url(#ecgGrad)"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ecg-line"
        />

        {/* Dynamic Sweeping Telemetry Nodes */}
        <g className="animate-signal-sweep motion-reduce:animate-none opacity-40">
          <line x1="0" y1="760" x2="240" y2="760" stroke="#F59E0B" strokeWidth="2.5" />
          <circle cx="240" cy="760" r="3.5" fill="#EF4444" />
        </g>
      </svg>
    </div>
  );
};
