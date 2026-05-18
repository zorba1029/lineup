import type { Config } from 'tailwindcss';

/**
 * Wanted Design System 도입(feat/ui-update) 이후 색상은 모두 `wd-*` semantic
 * 토큰을 통해 사용. CSS variables(`--wd-*`)는 `src/styles/index.css` :root에 정의.
 * legacy 단일 톤(`primary/accent/green/...`)은 마이그레이션 완료 후 제거됨.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* Wanted Design System — semantic 토큰 (index.css :root에서 정의) */
        wd: {
          /* Foreground */
          'fg-primary':    'var(--wd-fg-primary)',
          'fg-secondary':  'var(--wd-fg-secondary)',
          'fg-tertiary':   'var(--wd-fg-tertiary)',
          'fg-quaternary': 'var(--wd-fg-quaternary)',
          'fg-disabled':   'var(--wd-fg-disabled)',
          'fg-inverse':    'var(--wd-fg-inverse)',
          'fg-on-primary': 'var(--wd-fg-on-primary)',

          /* Background */
          'bg-primary':        'var(--wd-bg-primary)',
          'bg-secondary':      'var(--wd-bg-secondary)',
          'bg-tertiary':       'var(--wd-bg-tertiary)',
          'bg-quaternary':     'var(--wd-bg-quaternary)',
          'bg-inverse':        'var(--wd-bg-inverse)',
          'bg-surface':        'var(--wd-bg-surface)',
          'bg-surface-tinted': 'var(--wd-bg-surface-tinted)',

          /* Semantic */
          'primary':         'var(--wd-color-primary)',
          'primary-hover':   'var(--wd-color-primary-hover)',
          'primary-press':   'var(--wd-color-primary-press)',
          'primary-soft':    'var(--wd-color-primary-soft)',
          'primary-faint':   'var(--wd-color-primary-faint)',
          'positive':        'var(--wd-color-positive)',
          'positive-soft':   'var(--wd-color-positive-soft)',
          'negative':        'var(--wd-color-negative)',
          'negative-soft':   'var(--wd-color-negative-soft)',
          'cautionary':      'var(--wd-color-cautionary)',
          'cautionary-soft': 'var(--wd-color-cautionary-soft)',
          'informative':     'var(--wd-color-informative)',
          'informative-soft':'var(--wd-color-informative-soft)',
          'accent':          'var(--wd-color-accent)',
          'accent-soft':     'var(--wd-color-accent-soft)',

          /* Border */
          'border-subtle':  'var(--wd-border-subtle)',
          'border-default': 'var(--wd-border-default)',
          'border-strong':  'var(--wd-border-strong)',
        },
      },
      fontFamily: {
        sans: [
          'Pretendard Variable',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'Apple SD Gothic Neo',
          'Noto Sans KR',
          'sans-serif',
        ],
        display: [
          'Wanted Sans Variable',
          'Wanted Sans',
          'Pretendard Variable',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
      },
      maxWidth: {
        mobile: '480px',
      },
      keyframes: {
        // open status dot pulse (ring expansion via box-shadow)
        'wd-pulse': {
          '0%':   { boxShadow: '0 0 0 0 rgba(0, 102, 255, 0.45)' },
          '70%':  { boxShadow: '0 0 0 8px rgba(0, 102, 255, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(0, 102, 255, 0)' },
        },
        // urgent dot fade blink
        'wd-blink': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.35' },
        },
        // NewPostBanner dot ring (흰)
        'wd-newpost-pulse': {
          '0%':   { boxShadow: '0 0 0 4px rgba(255, 255, 255, 0.50)' },
          '100%': { boxShadow: '0 0 0 8px rgba(255, 255, 255, 0)' },
        },
        // bottom sheet slide-up entry
        'wd-slide-up': {
          from: { transform: 'translateY(40px)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
      },
      animation: {
        'wd-pulse':         'wd-pulse 1.8s ease-out infinite',
        'wd-blink':         'wd-blink 1.4s ease-in-out infinite',
        'wd-newpost-pulse': 'wd-newpost-pulse 1.6s ease-out infinite',
        'wd-slide-up':      'wd-slide-up 280ms cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
