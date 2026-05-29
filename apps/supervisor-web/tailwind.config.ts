import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        joy: {
          50: '#f0f9ff', 100: '#e0f2fe',
          500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 900: '#0c4a6e',
        },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':    'fade-in 0.3s ease-out',
        'count-up':   'count-up 0.4s ease-out',
      },
      keyframes: {
        'fade-in':  { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'count-up': { from: { opacity: '0', transform: 'scale(0.8)' },     to: { opacity: '1', transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
} satisfies Config
