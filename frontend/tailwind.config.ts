import type { Config } from 'tailwindcss';

/**
 * 프로토타입(`ideation/hn_sharing/neighbor-borrow-app.html`)의 디자인 토큰을 그대로 옮김.
 * mockup artifact `linenb-screen-mockups`와 동일.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* 기존 단일 톤(legacy) — 점진 마이그레이션 동안 유지. 새 컴포넌트는 wd-* 사용 권장. */
        primary: {
          DEFAULT: '#5B6EF7',
          light: '#EEF0FF',
          dark: '#4354D9',
        },
        accent: '#FF6B6B',
        green: {
          DEFAULT: '#26C281',
          light: '#E8FAF2',
        },
        yellow: '#FFB74D',
        bg: '#F4F6FB',
        card: '#FFFFFF',
        text: '#1E2340',
        sub: '#7B849C',
        border: '#E6E9F4',

        /* Wanted Design System — semantic 토큰 (index.css의 :root에서 정의) */
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
      borderRadius: {
        lnb: '16px',
        'lnb-sm': '10px',
      },
      maxWidth: {
        mobile: '480px',
      },
      boxShadow: {
        lnb: '0 4px 20px rgba(91,110,247,0.10)',
        'lnb-sm': '0 2px 8px rgba(0,0,0,0.07)',
      },
      keyframes: {
        // legacy — 다른 곳에서 안 쓰면 추후 제거.
        'blink-soft': {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0.3' },
        },
        // Wanted DS — open status pulse (ring expansion via box-shadow)
        'wd-pulse': {
          '0%':   { boxShadow: '0 0 0 0 rgba(0, 102, 255, 0.45)' },
          '70%':  { boxShadow: '0 0 0 8px rgba(0, 102, 255, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(0, 102, 255, 0)' },
        },
        // Wanted DS — urgent dot fade blink
        'wd-blink': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.35' },
        },
        // Wanted DS — NewPostBanner dot ring expansion (흰 ring)
        'wd-newpost-pulse': {
          '0%':   { boxShadow: '0 0 0 4px rgba(255, 255, 255, 0.50)' },
          '100%': { boxShadow: '0 0 0 8px rgba(255, 255, 255, 0)' },
        },
        // Wanted DS — bottom sheet slide-up entry
        'wd-slide-up': {
          from: { transform: 'translateY(40px)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
      },
      animation: {
        'blink-soft':       'blink-soft 1.4s steps(1, end) infinite',
        'wd-pulse':         'wd-pulse 1.8s ease-out infinite',
        'wd-blink':         'wd-blink 1.4s ease-in-out infinite',
        'wd-newpost-pulse': 'wd-newpost-pulse 1.6s ease-out infinite',
        'wd-slide-up':      'wd-slide-up 280ms cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
