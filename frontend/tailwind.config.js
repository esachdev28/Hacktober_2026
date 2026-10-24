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
        canvas: {
          DEFAULT: '#090D16',
          subtle: '#0E1422',
          surface: '#141C2E',
          card: '#1A2338',
          border: '#23304B',
          hover: '#293856',
        },
        text: {
          primary: '#F8FAFC',
          secondary: '#94A3B8',
          muted: '#64748B',
        },
        accent: {
          chaos: '#F59E0B',      // Injected fault / warning amber
          success: '#10B981',    // Verified recovery green
          failure: '#EF4444',    // Actual failure red
          info: '#3B82F6',       // Blue for informational events
          purple: '#8B5CF6',     // AI analysis / diagnostic purple
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
