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
        // Canonical Foundation Tokens
        background: '#111310',
        surface: {
          DEFAULT: '#191C17',
          elevated: '#22261F',
          active: '#2B3026',
        },
        border: {
          DEFAULT: '#363B30',
          strong: '#505745',
        },
        foreground: {
          DEFAULT: '#F3F0E7',
          muted: '#B0B2A7',
          subtle: '#85897D',
        },
        // Canonical Brand and Interaction Tokens
        primary: {
          DEFAULT: '#C7F36B',
          hover: '#D8FF8A',
          pressed: '#A9D94E',
          foreground: '#171A12',
        },
        focus: {
          ring: '#D8FF8A',
        },
        // Canonical Semantic States
        success: {
          DEFAULT: '#C7F36B',
          surface: '#202A16',
        },
        danger: {
          DEFAULT: '#FF6B55',
          surface: '#321D19',
        },
        warning: {
          DEFAULT: '#FFC66D',
          surface: '#302718',
        },
        info: {
          DEFAULT: '#86B7FF',
          surface: '#1D2735',
        },
        // Landing-page Visual Accents
        coral: '#FF6B55',
        lime: '#C7F36B',
        chalk: '#F3F0E7',
        graphite: '#272A23',

        // Backward-compatible semantic aliases mapped to Obsidian / Lime / Coral
        canvas: {
          DEFAULT: '#111310',
          subtle: '#141712',
          surface: '#191C17',
          card: '#191C17',
          border: '#363B30',
          hover: '#22261F',
        },
        text: {
          primary: '#F3F0E7',
          secondary: '#B0B2A7',
          muted: '#85897D',
        },
        accent: {
          chaos: '#C7F36B',      // Acid Lime brand accent
          lime: '#C7F36B',
          coral: '#FF6B55',      // Signal Coral failure / fracture accent
          success: '#C7F36B',    // Acid Lime verified recovery
          failure: '#FF6B55',    // Signal Coral failure
          info: '#86B7FF',       // Clean informational blue
          purple: '#C7F36B',     // Map legacy purple to acid lime
          cyan: '#86B7FF',
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'JetBrains Mono', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        'glow-lime': '0 0 20px -3px rgba(199, 243, 107, 0.20)',
        'glow-coral': '0 0 20px -3px rgba(255, 107, 85, 0.25)',
        'glow-card': '0 10px 30px -10px rgba(0, 0, 0, 0.6)',
      }
    },
  },
  plugins: [],
}
