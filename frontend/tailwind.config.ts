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
        // 프로토타입 .urgent-dot blink. 사이클의 대부분(0~70%)을 full opacity로
        // 머물고 80% 부근에서 짧게 0.25로 dim. 너무 자주 깜빡이지 않는 차분한 톤.
        'blink-soft': {
          '0%, 70%, 100%': { opacity: '1' },
          '85%': { opacity: '0.25' },
        },
      },
      animation: {
        'blink-soft': 'blink-soft 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
