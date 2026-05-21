/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        parchment:    '#F5E9D4',
        ink:          '#1F2937',
        nightGray:    '#2B2F33',
        nightInk:     '#E6E7E8',
        bookedBrown:  '#7B4B27',
        bookedAccent: '#C8A26B'
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
        sans:  ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
