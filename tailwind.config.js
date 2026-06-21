/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--c-primary)',
        'primary-dark': 'var(--c-primary-dark)',
        secondary: 'var(--c-secondary)',
        'secondary-dk': 'var(--c-secondary-dk)',
        accent: 'var(--c-accent)',
        background: 'var(--c-bg)',
        surface: 'var(--c-surface)',
        'surface-2': 'var(--c-surface-2)',
        text: 'var(--c-text)',
        'text-muted': 'var(--c-text-muted)',
        'text-light': 'var(--c-text-light)',
        'text-faint': 'var(--c-text-faint)',
        border: 'var(--c-border)',
        error: 'var(--c-error)',
        'error-bg': 'var(--c-error-bg)',
        success: 'var(--c-success)',
        'success-bg': 'var(--c-success-bg)',
      },
      fontFamily: { sans: ['Assistant', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
