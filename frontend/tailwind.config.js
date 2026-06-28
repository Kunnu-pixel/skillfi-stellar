export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0B1220',
        paper: '#F2EEE3',
        'paper-deep': '#E7E1D2',
        amber: '#D9A441',
        'amber-deep': '#7A5419',
        teal: '#3FB8AF',
        'teal-deep': '#1B5C57',
      },
      boxShadow: {
        soft: '0 24px 80px rgba(0, 0, 0, 0.14)',
        glow: '0 18px 45px rgba(79, 70, 229, 0.18)',
      },
      borderRadius: {
        xl: '32px',
        lg: '22px',
        md: '16px',
        sm: '10px',
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['IBM Plex Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
