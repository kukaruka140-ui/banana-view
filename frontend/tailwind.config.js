/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#16151A",
        panel: "#1F1E26",
        panel2: "#2A2832",
        cream: "#F5F1E8",
        banana: "#FFD23F",
        bananaDark: "#E0AE1A",
        grape: "#6B4FA0",
        coral: "#FF6B6B",
        mist: "#9A96A8",
      },
      fontFamily: {
        display: ["Baloo 2", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        blob: "2rem",
      },
      keyframes: {
        floatUp: {
          "0%": { transform: "translateY(0) scale(0.6)", opacity: "0" },
          "15%": { opacity: "1", transform: "translateY(-10px) scale(1)" },
          "100%": { transform: "translateY(-220px) scale(1.1)", opacity: "0" },
        },
        popIn: {
          "0%": { transform: "scale(0.85)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        pulseDot: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        floatUp: "floatUp 2.4s ease-out forwards",
        popIn: "popIn 0.18s ease-out",
        pulseDot: "pulseDot 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}

