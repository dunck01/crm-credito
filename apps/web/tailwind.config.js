/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: 'var(--paper)',
        card: 'var(--card)',
        ink: 'var(--ink)',
        'ink-soft': 'var(--ink-soft)',
        line: 'var(--line)',
        'line-strong': 'var(--line-strong)',
        primeiro: 'var(--c-primeiro)',
        'primeiro-bg': 'var(--c-primeiro-bg)',
        semresp: 'var(--c-semresp)',
        'semresp-bg': 'var(--c-semresp-bg)',
        followup: 'var(--c-followup)',
        'followup-bg': 'var(--c-followup-bg)',
        recompra: 'var(--c-recompra)',
        'recompra-bg': 'var(--c-recompra-bg)',
        mensal: 'var(--c-mensal)',
        'mensal-bg': 'var(--c-mensal-bg)',
        semanal: 'var(--c-semanal)',
        'semanal-bg': 'var(--c-semanal-bg)',
        whatsapp: 'var(--whatsapp)',
        'whatsapp-bg': 'var(--whatsapp-bg)',
        'whatsapp-dark': 'var(--whatsapp-dark)',
        lime: {
          DEFAULT: '#C8F542',
          400: '#C8F542',
          500: '#B6E82B',
          glow: 'rgba(200, 245, 66, 0.15)',
        },
        teal: {
          flow: '#2EE6A6',
          400: '#2EE6A6',
          500: '#1ED495',
        },
        coral: {
          DEFAULT: '#FF5C5C',
          400: '#FF5C5C',
          500: '#F04545',
        },
        fintech: {
          ink: '#E8EDF5',
          muted: '#8B97AB',
          lime: '#C8F542',
          'lime-hover': '#B6E82B',
          teal: '#2EE6A6',
          coral: '#FF5C5C',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', '"Plus Jakarta Sans"', 'sans-serif'],
        heading: ['Outfit', '"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      transitionTimingFunction: {
        'credit-desk': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      transitionDuration: {
        'credit-desk': '220ms',
      },
    },
  },
  plugins: [],
};
