/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#edf7fb",
          100: "#d7eef6",
          200: "#addceb",
          300: "#7cc3dd",
          400: "#4aa7ca",
          500: "#2f8db2",
          600: "#25708f",
          700: "#215b74",
          800: "#214d60",
          900: "#1f4150"
        },
        ink: {
          900: "#0f172a",
          800: "#172554",
          700: "#243b53"
        },
        sand: "#f6f4ef",
        accent: "#f59e0b"
      },
      boxShadow: {
        panel: "0 24px 70px rgba(15, 23, 42, 0.08)"
      },
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui"],
        arabic: ["Tajawal", "ui-sans-serif", "system-ui"]
      }
    }
  },
  plugins: []
};
