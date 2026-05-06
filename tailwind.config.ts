import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        paper: "#fbfaf7",
        ink: "#20201d",
        muted: "#6d6a62",
        line: "#ddd8cd",
        focus: "#2f6f73",
        mist: "#eff4f1"
      },
      boxShadow: {
        soft: "0 16px 50px rgba(32, 32, 29, 0.08)"
      },
      keyframes: {
        grow: {
          "0%": { opacity: "0", transform: "scale(.82) translateY(6px)" },
          "70%": { opacity: "1", transform: "scale(1.05) translateY(0)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" }
        },
        fadeShrink: {
          "0%": { opacity: "1", transform: "scale(1)" },
          "100%": { opacity: ".45", transform: "scale(.92)" }
        }
      },
      animation: {
        grow: "grow 420ms cubic-bezier(.2, .9, .25, 1.2)",
        fadeShrink: "fadeShrink 220ms ease-out"
      }
    }
  },
  plugins: []
};

export default config;
