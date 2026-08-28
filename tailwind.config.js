/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // High-Tech CAD & Landing Palette
        brand: {
          bg: '#0F172A',      // Dark high-tech base background
          surface: '#131D33', // Elevated card surface
          elevated: '#1E293B',// Secondary elevated surface
          border: '#334155',  // Sharp card border
          red: '#DC2626',     // Emergency Red
          'red-glow': 'rgba(220, 38, 38, 0.4)',
          blue: '#2563EB',    // Electric Blue
          'blue-glow': 'rgba(37, 99, 235, 0.4)',
          cyan: '#06B6D4',
          emerald: '#10B981',
          amber: '#F59E0B',
        },
        // CAD Dark Theme Palette
        cad: {
          darkest: '#0B0F19',
          dark: '#0F172A',
          card: '#131D33',
          border: '#1E293B',
          hover: '#1E293B',
          accent: '#2563EB',
          red: '#DC2626',
        },
        // Emergency Severity Levels
        severity: {
          1: {
            DEFAULT: '#10B981', // Emerald - Low
            bg: 'rgba(16, 185, 129, 0.15)',
            border: '#059669',
            text: '#34D399',
          },
          2: {
            DEFAULT: '#F59E0B', // Amber - Moderate
            bg: 'rgba(245, 158, 11, 0.15)',
            border: '#D97706',
            text: '#FBBF24',
          },
          3: {
            DEFAULT: '#F97316', // Orange - High
            bg: 'rgba(249, 115, 22, 0.15)',
            border: '#EA580C',
            text: '#FB923C',
          },
          4: {
            DEFAULT: '#DC2626', // Emergency Red - Severe
            bg: 'rgba(220, 38, 38, 0.18)',
            border: '#DC2626',
            text: '#F87171',
          },
          5: {
            DEFAULT: '#8B5CF6', // Purple/Violet Alert - Critical
            bg: 'rgba(139, 92, 246, 0.2)',
            border: '#7C3AED',
            text: '#A78BFA',
          },
        },
        // Hazard Category Colors
        hazard: {
          fire: '#DC2626',
          hazmat: '#EAB308',
          traffic: '#F97316',
          medical: '#EC4899',
          weapon: '#8B5CF6',
          collapse: '#64748B',
          flood: '#06B6D4',
        },
        // Response Unit Colors
        unit: {
          ambulance: '#10B981',
          fire: '#DC2626',
          police: '#2563EB',
          rescue: '#F59E0B',
        },
      },
      boxShadow: {
        'glow-red': '0 0 25px -3px rgba(220, 38, 38, 0.5), 0 0 10px -2px rgba(220, 38, 38, 0.4)',
        'glow-red-lg': '0 0 45px -5px rgba(220, 38, 38, 0.65), 0 0 20px -2px rgba(220, 38, 38, 0.5)',
        'glow-blue': '0 0 25px -3px rgba(37, 99, 235, 0.45), 0 0 10px -2px rgba(37, 99, 235, 0.35)',
        'glow-cyan': '0 0 25px -3px rgba(6, 182, 212, 0.45)',
        'glass-panel': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flash-critical': 'flashCritical 1.5s infinite',
        'radar-sweep': 'radarSweep 4s linear infinite',
        'beacon-ping': 'beaconPing 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'scanline': 'scanline 6s linear infinite',
        'float-slow': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        flashCritical: {
          '0%, 100%': { opacity: '1', backgroundColor: 'rgba(220, 38, 38, 0.2)' },
          '50%': { opacity: '0.4', backgroundColor: 'rgba(220, 38, 38, 0.05)' },
        },
        radarSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        beaconPing: {
          '75%, 100%': {
            transform: 'scale(2.2)',
            opacity: '0',
          },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
}
