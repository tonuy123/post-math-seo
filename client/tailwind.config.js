/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      // WordPress-inspired palette (kept from legacy styles.css as CSS vars).
      // Will be expanded as we convert the legacy CSS to Tailwind in Phase 2.
      colors: {
        wp: {
          blue:       '#2271b1',
          'blue-hover': '#135e96',
          'blue-dark':  '#0a4b78',
          gray:       '#f0f0f1',
          'gray-dark': '#c3c4c7',
          white:      '#ffffff',
          red:        '#d63638',
          green:      '#00a32a',
          orange:     '#dba617',
        },
        ink: {
          primary:   '#1d2327',
          secondary: '#50575e',
          muted:     '#646970',
          link:      '#2271b1',
        },
      },
      fontFamily: {
        sans: [
          'Open Sans',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      borderRadius: {
        DEFAULT: '4px',
      },
    },
  },
  plugins: [],
};
