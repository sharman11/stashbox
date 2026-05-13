import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        hero: {
          top: '#0B3D2E',
          mid: '#145A42',
          bot: '#1E7A5C',
        },
        accent: {
          DEFAULT: '#1DB954',
          dark: '#166534',
          light: '#E6F4EA',
        },
        ink: {
          DEFAULT: '#0F1419',
          soft: '#6B7280',
          muted: '#9CA3AF',
        },
        paper: '#F5F7FA',
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'hero-gradient':
          'linear-gradient(160deg, #0B3D2E 0%, #145A42 50%, #1E7A5C 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
