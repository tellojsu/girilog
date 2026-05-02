/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          primary: '#10B981',
          secondary: '#cceeff',
            temp1: '#4f46e5',
            danger: '#f97316',
            caution: '#bf8ad6',
            temp4: '#cceeff',
        },
      keyframes: {
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        'slideInRight': 'slideInRight 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
      },},
    },
    plugins: [],
  }
