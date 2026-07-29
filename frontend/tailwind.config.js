/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          950: '#091410',
          900: '#112018',
          800: '#1a3a1c',
          700: '#245228',
          600: '#2f6b34',
          500: '#3a8440',
          400: '#5aa362',
          300: '#85c28b',
          100: '#dcf0de',
        },
        saffron: {
          800: '#7c4d08',
          700: '#a0640a',
          600: '#c47a0f',
          500: '#e08f1a',
          400: '#f5a623',
          300: '#f8c06a',
          200: '#f5d89e',
          100: '#fef6e4',
          50: '#fefaf0',
        },
        cream: {
          50: '#fdfaf4',
          100: '#f8f2e2',
          200: '#efe4c8',
          300: '#ddd0b0',
        },
        crimson: {
          700: '#991b1b',
          600: '#b91c1c',
          500: '#dc2626',
          200: '#fecaca',
          100: '#fee2e2',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        body: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      animation: {
        'fade-up': 'fadeUp 0.7s ease both',
        'fade-up-d1': 'fadeUp 0.7s 0.12s ease both',
        'fade-up-d2': 'fadeUp 0.7s 0.24s ease both',
        'fade-up-d3': 'fadeUp 0.7s 0.36s ease both',
        'fade-up-d4': 'fadeUp 0.7s 0.48s ease both',
        'slide-in': 'slideIn 0.38s ease both',
        float: 'float 4s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(22px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
}
