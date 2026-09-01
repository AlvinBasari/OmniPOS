/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="deep-zinc-dark"]'],
  theme: {
    extend: {
      colors: {
        app: 'var(--bg-app)',
        surface: 'var(--bg-surface)',
        card: 'var(--bg-card)',
        'card-hover': 'var(--bg-card-hover)',
        subtle: 'var(--bg-subtle)',
        'border-subtle': 'var(--border-subtle)',
        'border-strong': 'var(--border-strong)',
        'border-focus': 'var(--border-focus)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        primary: 'var(--primary)',
        'primary-hover': 'var(--primary-hover)',
        'primary-text': 'var(--primary-text)',
        'status-success': 'var(--status-success)',
        'status-warning': 'var(--status-warning)',
        'status-danger': 'var(--status-danger)',
        'status-info': 'var(--status-info)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Geist Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
