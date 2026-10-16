import React from 'react';

export const LifeGardenArtwork: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none -z-10"
    >
      {/* Background Soft Breathing Organic Gradients */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-garden-terracottaLight/70 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/4 animate-blob-breathe" />
      <div className="absolute bottom-0 left-0 w-[650px] h-[650px] bg-garden-sageLight/80 rounded-full blur-3xl transform -translate-x-1/4 translate-y-1/4 animate-blob-breathe [animation-delay:3s]" />
      <div className="absolute top-1/2 left-1/3 w-[350px] h-[350px] bg-amber-100/50 rounded-full blur-2xl transform -translate-x-1/2 -translate-y-1/2" />

      {/* Organic Curved Paths and Botanical Petal SVG */}
      <svg
        className="w-full h-full opacity-70"
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="gardenPath1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#588157" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#D95D39" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#588157" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="petalGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D95D39" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#B84523" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="petalGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#588157" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#3A5A40" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        {/* Serene organic flowing contours */}
        <path
          d="M-50 450 C 250 350, 400 650, 750 500 C 1100 350, 1300 600, 1550 450"
          stroke="url(#gardenPath1)"
          strokeWidth="2.5"
          strokeDasharray="8 6"
          className="opacity-50"
        />
        <path
          d="M-50 650 C 350 550, 500 800, 950 600 C 1200 480, 1400 700, 1550 580"
          stroke="#D95D39"
          strokeWidth="1.8"
          strokeOpacity="0.25"
        />
        <path
          d="M-50 250 C 300 150, 600 380, 950 220 C 1250 90, 1380 320, 1550 200"
          stroke="#588157"
          strokeWidth="1.5"
          strokeOpacity="0.2"
        />

        {/* Layer 1: Swaying Petals (Gentle Float) */}
        <g className="animate-petal-float motion-reduce:animate-none">
          {/* Petal 1 (Terracotta) */}
          <path
            d="M 280 220 C 300 180, 340 190, 350 230 C 360 270, 310 290, 290 260 Z"
            fill="url(#petalGrad1)"
          />
          {/* Petal 2 (Sage) */}
          <path
            d="M 1150 180 C 1190 150, 1220 180, 1210 220 C 1200 260, 1140 250, 1130 210 Z"
            fill="url(#petalGrad2)"
          />
          {/* Petal 3 (Terracotta) */}
          <path
            d="M 850 680 C 890 650, 920 690, 900 720 C 870 750, 830 720, 840 680 Z"
            fill="url(#petalGrad1)"
          />
        </g>

        {/* Layer 2: Drifting Petals (Deep Drift) */}
        <g className="animate-petal-drift motion-reduce:animate-none">
          {/* Petal 4 (Sage Leaf) */}
          <path
            d="M 180 720 C 210 680, 250 710, 240 750 C 220 790, 170 770, 175 730 Z"
            fill="url(#petalGrad2)"
          />
          {/* Petal 5 (Terracotta) */}
          <path
            d="M 680 140 C 710 110, 740 130, 735 160 C 730 190, 690 180, 680 150 Z"
            fill="url(#petalGrad1)"
          />
          {/* Petal 6 (Sage) */}
          <path
            d="M 1320 540 C 1350 510, 1380 530, 1375 570 C 1360 610, 1310 590, 1315 550 Z"
            fill="url(#petalGrad2)"
          />
        </g>

        {/* Layer 3: Swaying organic seeds / dew drops */}
        <g className="animate-petal-sway motion-reduce:animate-none">
          <circle cx="420" cy="180" r="7" fill="#D95D39" fillOpacity="0.4" />
          <circle cx="445" cy="205" r="4.5" fill="#588157" fillOpacity="0.5" />
          <circle cx="1080" cy="320" r="6" fill="#588157" fillOpacity="0.4" />
          <circle cx="1240" cy="620" r="8" fill="#D95D39" fillOpacity="0.3" />
          <circle cx="210" cy="340" r="5" fill="#588157" fillOpacity="0.35" />
          <circle cx="980" cy="740" r="6.5" fill="#D95D39" fillOpacity="0.35" />
        </g>
      </svg>
    </div>
  );
};
