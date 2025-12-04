/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Aquí registramos tu fuente. "Bookman Old Style" es el nombre estándar.
        bookman: ['"Bookman Old Style"', 'Bookman', 'URW Bookman L', 'serif'],
      },
    },
  },
  plugins: [],
}