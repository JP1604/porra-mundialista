import type { Config } from 'tailwindcss'
import { fontFamily } from 'tailwindcss/defaultTheme'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        background: '#070C18',
        foreground: '#F1F5F9',
        surface: {
          DEFAULT: '#0F172A',
          elevated: '#162032',
          high: '#1E293B',
        },
        accent: {
          green: '#00D084',
          gold:  '#F59E0B',
        },
        card: {
          DEFAULT: '#0F172A',
          foreground: '#F1F5F9',
        },
        border: 'rgba(255,255,255,0.08)',
        input:  '#1E293B',
        primary: {
          DEFAULT: '#00D084',
          foreground: '#070C18',
        },
        secondary: {
          DEFAULT: '#1E293B',
          foreground: '#F1F5F9',
        },
        muted: {
          DEFAULT: '#1E293B',
          foreground: '#64748B',
        },
        destructive: {
          DEFAULT: '#EF4444',
          foreground: '#FFFFFF',
        },
        popover: {
          DEFAULT: '#0F172A',
          foreground: '#F1F5F9',
        },
        ring: '#00D084',
        score: {
          exact:   '#FFD700',
          diff:    '#00D084',
          winner:  '#3B82F6',
          partial: '#64748B',
          zero:    '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Inter', ...fontFamily.sans],
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.375rem',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
        pulse_live: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.3' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        pulse_live:       'pulse_live 1.5s ease-in-out infinite',
        'fade-in':        'fade-in 0.25s ease-out',
      },
      backgroundImage: {
        'stadium':      'radial-gradient(ellipse at top, #0D1B2A 0%, #070C18 65%)',
        'hero-glow':    'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,208,132,0.12) 0%, transparent 70%)',
        'card-shimmer': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
