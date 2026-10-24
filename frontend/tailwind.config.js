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
          DEFAULT: '#080B12',
          subtle: '#0D1220',
          surface: '#111827',
          card: '#172033',
          border: '#253148',
          hover: '#1E293B',
        },
        text: {
          primary: '#F8FAFC',
          secondary: '#94A3B8',
          muted: '#64748B',
        },
        accent: {
          chaos: '#FF9F0A',      // Electric amber/orange
          success: '#10B981',    // Restrained emerald green
          failure: '#EF4444',    // Clear red
          info: '#38BDF8',       // Blue-cyan for informational events
          purple: '#A855F7',     // AI analysis / diagnostic purple
          cyan: '#06B6D4',
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'JetBrains Mono', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        'glow-amber': '0 0 25px -5px rgba(255, 159, 10, 0.15)',
        'glow-emerald': '0 0 25px -5px rgba(16, 185, 129, 0.15)',
        'glow-card': '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
      }
    },
  },
  plugins: [],
}
