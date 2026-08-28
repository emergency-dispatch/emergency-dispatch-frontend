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
        // CAD Dark Theme Palette
        cad: {
          darkest: '#0B0F19',
          dark: '#111827',
          card: '#1F2937',
          border: '#374151',
          hover: '#2D3748',
          accent: '#3B82F6',
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
            DEFAULT: '#EF4444', // Red - Severe
            bg: 'rgba(239, 68, 68, 0.15)',
            border: '#DC2626',
            text: '#F87171',
          },
          5: {
            DEFAULT: '#8B5CF6', // Purple/Violet Alert - Critical/Catastrophic
            bg: 'rgba(139, 92, 246, 0.2)',
            border: '#7C3AED',
            text: '#A78BFA',
          },
        },
        // Hazard Category Colors
        hazard: {
          fire: '#EF4444',
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
          fire: '#EF4444',
          police: '#3B82F6',
          rescue: '#F59E0B',
        },
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flash-critical': 'flashCritical 1.5s infinite',
        'radar-sweep': 'radarSweep 4s linear infinite',
      },
      keyframes: {
        flashCritical: {
          '0%, 100%': { opacity: '1', backgroundColor: 'rgba(239, 68, 68, 0.2)' },
          '50%': { opacity: '0.4', backgroundColor: 'rgba(239, 68, 68, 0.05)' },
        },
        radarSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
}
