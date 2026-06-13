/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        midnight: {
          900: '#0a0a12',
          800: '#11111a',
          700: '#1a1a2e',
          600: '#22223b',
        },
        accent: {
          purple: '#BB86FC',
          pink: '#F50057',
          cyan: '#00E5FF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
};