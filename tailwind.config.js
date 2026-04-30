/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Pretendard Variable'", "'Pretendard'", "-apple-system", "'Helvetica Neue'", "sans-serif"],
      },
      colors: {
        blue: {
          50: '#EAF2FE', 100: '#D0E6FF', 200: '#A8CEFF', 300: '#75B3FF',
          400: '#4D9AFF', 500: '#0066FF', 600: '#0066FF', 700: '#005EEB',
          800: '#0052CC', 900: '#0042A3', 950: '#001F52',
        },
        gray: {
          50: '#F7F7F8', 100: '#F4F4F5', 200: '#EDEDEF', 300: '#E4E4E7',
          400: '#CACACF', 500: '#9696A0', 600: '#70737C', 700: '#4C4C56',
          800: '#37383C', 900: '#171719', 950: '#0F0F10',
        },
        emerald: {
          50: '#E8FFF0', 100: '#CCFFDD', 500: '#00BF40', 600: '#00A63B', 700: '#008C33',
        },
        red: {
          50: '#FFF0F0', 100: '#FFD6D6', 400: '#FF5C5C', 500: '#FF4242', 600: '#F52E2E', 700: '#E01F1F',
        },
        amber: {
          50: '#FFF5E0', 100: '#FFEABD', 400: '#FFAB00', 500: '#FF8C00', 600: '#E67A00', 700: '#CC6B00',
        },
        slate: {
          50: '#F7F7F8', 600: '#3C3C44', 700: '#2F2F37', 800: '#212128', 900: '#1A1A21', 950: '#17171D',
        },
      },
      borderRadius: {
        'sm': '6px', 'md': '10px', 'lg': '16px', 'xl': '24px', '2xl': '32px',
      },
      boxShadow: {
        'sm': '0 1px 4px rgba(23,23,23,0.06)',
        'DEFAULT': '0 2px 8px rgba(0,0,0,0.08)',
        'md': '0 4px 16px rgba(0,0,0,0.12)',
        'lg': '0 8px 32px rgba(0,0,0,0.16)',
      },
    },
  },
  plugins: [],
}
