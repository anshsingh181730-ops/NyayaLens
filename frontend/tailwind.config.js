/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nyaya: {
          navy900: '#0B1F3A',
          navy700: '#14305A',
          ivory: '#F8F5EE',
          border: '#E4DED0',
          gold: '#C9A227',
          text: '#1B2433',
          muted: '#5B6577',
          highlight: '#FFF1B8',
          // Status tokens
          supported: '#1F7A5C',
          supportedBg: '#EAF5F1',
          partly: '#C98A00',
          partlyBg: '#FCF6E8',
          notSupported: '#B3261E',
          notSupportedBg: '#FBEAE9',
          info: '#2F6DB5',
          infoBg: '#EAF1FA',
        }
      },
      fontFamily: {
        serif: ['Merriweather', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      borderRadius: {
        'card': '12px',
      },
      boxShadow: {
        'subtle': '0 2px 8px rgba(11, 31, 58, 0.05)',
        'elevated': '0 8px 24px rgba(11, 31, 58, 0.08)',
      }
    },
  },
  plugins: [],
}
