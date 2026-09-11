/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ndmu: {
          green: {
            50: "#f4f7f5",
            100: "#e8f5ee",
            200: "#cfe7d9",
            300: "#a9d1b9",
            400: "#69ad83",
            500: "#087247",
            600: "#07633f",
            700: "#075c3b",
            800: "#075c3b",
            900: "#043b2a",
            950: "#022a1d",
          },
          gold: {
            50: "#fff9e8",
            100: "#fff0bc",
            200: "#fbe391",
            300: "#f7d668",
            400: "#f3c94d",
            500: "#f3c94d",
            600: "#d4a934",
            700: "#ae8423",
            800: "#89641c",
            900: "#694b16",
          },
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        display: ["Georgia", "Times New Roman", "serif"],
      },
    },
  },
  plugins: [],
};
