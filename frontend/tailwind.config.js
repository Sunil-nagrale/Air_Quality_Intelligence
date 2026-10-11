/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#173F35',
          500: '#3D7A6B',
          600: '#2A5C50',
          700: '#1F4E42',
          800: '#173F35',
          900: '#0E2721',
          950: '#081713',
        },
        ivory: {
          DEFAULT: '#F6F5EF',
          50: '#FBFBFA',
          100: '#F6F5EF',
          200: '#EFEFE8',
          300: '#E2E0D5',
          400: '#D1CEBF',
        },
        sage: {
          DEFAULT: '#DCE9DF',
          50: '#F4F8F5',
          100: '#DCE9DF',
          200: '#C5DCC9',
          300: '#ADCDB3',
        },
        amber: {
          DEFAULT: '#E9A23B',
          50: '#FEF8EE',
          100: '#FDF0DC',
          200: '#FBE0B7',
          500: '#E9A23B',
          600: '#D48924',
          700: '#B06E16',
        },
        mutedRed: {
          DEFAULT: '#C94B43',
          50: '#FBF4F3',
          100: '#F6E6E5',
          500: '#C94B43',
          600: '#B33B33',
          700: '#942B24',
        },
        risk: {
          good: '#16A34A',
          satisfactory: '#22C55E',
          moderate: '#E9A23B',
          poor: '#EA580C',
          verypoor: '#C94B43',
          severe: '#7F1D1D',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
