/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  safelist: ["bg-info", "text-info-foreground"],
  theme: {
    extend: {
      colors: {
        info: "var(--info)",
        "info-foreground": "var(--info-foreground)",
      },
    },
  },
  plugins: [],
}