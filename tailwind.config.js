/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './features/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#F5F7FA',
          secondary: '#FFFFFF',
        },
        hero: {
          start: '#1A1D2E',
          end: '#2A2D3E',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          hover: '#F9FAFB',
        },
        accent: {
          DEFAULT: '#2AABEE',
          light: '#E8F6FD',
          soft: 'rgba(42, 171, 238, 0.1)',
        },
        txt: {
          primary: '#0F1419',
          secondary: '#6B7280',
          muted: '#9CA3AF',
          hero: '#FFFFFF',
        },
        border: {
          DEFAULT: '#E5E7EB',
          light: '#F3F4F6',
        },
      },
      fontFamily: {
        sans: ['Inter_400Regular'],
        medium: ['Inter_500Medium'],
        semibold: ['Inter_600SemiBold'],
        bold: ['Inter_700Bold'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
      },
    },
  },
  plugins: [],
};
