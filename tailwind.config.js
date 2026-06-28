/** @type {import('tailwindcss').Config} */
import colors from "tailwindcss/colors"

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",   
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        blueCustom: '#4960FE',
        purple: '#3f3cbb',
        midnight: '#121063',
        metal: '#565584',
        tahiti: '#3ab7bf',
        silver: '#ecebff',
        bubblegum: '#ff77e9',
        bermuda: '#78dcca',
        pageBg: '#F0F2F5',
      },
    },
  },
  plugins: [],
}
