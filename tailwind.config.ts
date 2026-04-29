import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,js,jsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        // x.com inspired palette
        ink: {
          0: '#000000',
          50: '#0a0a0a',
          100: '#16181c',
          200: '#1d1f23',
          300: '#202327',
          400: '#2f3336',
          500: '#3d4144',
          600: '#71767b',
          700: '#8b8f94',
          800: '#e7e9ea',
          900: '#ffffff',
        },
        accent: {
          DEFAULT: '#D560B2', // Call Stream magenta
          hover: '#C24BA0',
          soft: 'rgba(213, 96, 178, 0.12)',
          ring: 'rgba(213, 96, 178, 0.45)',
        },
        success: '#00ba7c',
        danger: '#f4212e',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: {
        xl2: '20px',
      },
      boxShadow: {
        ring: '0 0 0 2px rgba(213, 96, 178, 0.45)',
      },
    },
  },
  plugins: [],
};

export default config;
