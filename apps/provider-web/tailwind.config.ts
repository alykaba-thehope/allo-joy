import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        joy: {
          50:  '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          900: '#0c4a6e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'ping-slow':   'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'slide-up':    'slide-up 0.25s ease-out',
        'fade-in':     'fade-in 0.2s ease-out',
        'countdown':   'countdown linear forwards',
      },
      keyframes: {
        'slide-up': {
          from: { transform: 'translateY(16px)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'countdown': {
          from: { width: '100%' },
          to:   { width: '0%' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
