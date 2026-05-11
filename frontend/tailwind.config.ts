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
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Apple SD Gothic Neo',
          'Noto Sans KR',
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
        // urgent-dot blink. 50/50 cadence ─ 꺼진 구간에도 어둡게 빨강이 남아
        // "켜짐 ↔ 어두운 켜짐"으로 자연스러운 깜빡임.
        'blink-soft': {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0.3' },
        },
      },
      animation: {
        'blink-soft': 'blink-soft 1.4s steps(1, end) infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
