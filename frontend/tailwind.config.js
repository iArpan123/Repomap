/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#ffffff",
          500: "#ffffff",
          600: "#e5e5e5",
          700: "#cccccc",
          900: "#111111",
        },
      },
    },
  },
  plugins: [],
};
