/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Donor: Life Garden palette
        garden: {
          ivory: '#FAF8F5',
          ivoryDark: '#F2EFE9',
          terracotta: '#D95D39',
          terracottaDark: '#B84523',
          terracottaLight: '#FDEEE9',
          sage: '#588157',
          sageDark: '#3A5A40',
          sageLight: '#E8EFE9',
        },
        // Requester: Response Desk palette
        desk: {
          pearl: '#F8FAFC',
          pearlDark: '#E2E8F0',
          midnight: '#0F172A',
          midnightCard: '#1E293B',
          amber: '#F59E0B',
          amberDark: '#D97706',
          amberLight: '#FEF3C7',
          signalRed: '#EF4444',
        },
        // Both: Campus Orbit palette
        orbit: {
          lilac: '#F6F4FF',
          lilacDark: '#EDE9FE',
          plum: '#581C87',
          plumDark: '#3B0764',
          plumLight: '#FAF5FF',
          teal: '#0D9488',
          tealDark: '#0F766E',
          tealLight: '#CCFBF1',
        },
        // BIT Identity Brand Colors
        bit: {
          maroon: '#800000',
          navy: '#002147',
          gold: '#DAA520',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', 'Cabinet Grotesk', 'system-ui', 'sans-serif'],
      },
      animation: {
        'petal-float': 'petalFloat 7s ease-in-out infinite',
        'petal-drift': 'petalDrift 11s ease-in-out infinite',
        'petal-sway': 'petalSway 9s ease-in-out infinite',
        'orbit-spin': 'orbitSpin 22s linear infinite',
        'orbit-reverse': 'orbitReverse 28s linear infinite',
        'orbit-fast': 'orbitSpin 12s linear infinite',
        'pulse-subtle': 'pulseSubtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-glow': 'pulseGlow 2.5s ease-in-out infinite',
        'radar-sweep': 'radarSweep 4s linear infinite',
        'ecg-pulse': 'ecgPulse 2.8s ease-in-out infinite',
        'signal-sweep': 'signalSweep 3.5s ease-in-out infinite',
        'shimmer-light': 'shimmerLight 3s linear infinite',
        'blob-breathe': 'blobBreathe 8s ease-in-out infinite',
        'touch-ripple': 'touchRipple 0.6s cubic-bezier(0, 0, 0.2, 1) forwards',
      },
      keyframes: {
        petalFloat: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg) scale(1)' },
          '50%': { transform: 'translateY(-18px) rotate(8deg) scale(1.05)' },
        },
        petalDrift: {
          '0%, 100%': { transform: 'translate(0px, 0px) rotate(0deg)' },
          '33%': { transform: 'translate(14px, -15px) rotate(-10deg)' },
          '66%': { transform: 'translate(-10px, -24px) rotate(6deg)' },
        },
        petalSway: {
          '0%, 100%': { transform: 'translate(0px, 0px) rotate(4deg)' },
          '50%': { transform: 'translate(-16px, -12px) rotate(-8deg)' },
        },
        orbitSpin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        orbitReverse: {
          '0%': { transform: 'rotate(360deg)' },
          '100%': { transform: 'rotate(0deg)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.02)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(0.98)' },
          '50%': { opacity: '0.8', transform: 'scale(1.04)' },
        },
        radarSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        ecgPulse: {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
        signalSweep: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        shimmerLight: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        blobBreathe: {
          '0%, 100%': { transform: 'scale(1) translate(0px, 0px)' },
          '50%': { transform: 'scale(1.08) translate(10px, -10px)' },
        },
        touchRipple: {
          '0%': { transform: 'scale(0)', opacity: '0.6' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
      }
    },
  },
  plugins: [],
}
