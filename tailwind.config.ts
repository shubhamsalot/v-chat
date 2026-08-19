import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0D0D0F",
        surface: {
          DEFAULT: "#16161A",
          muted: "#1F1F24",
          border: "#2A2A32",
        },
        text: {
          DEFAULT: "#F2F2F0",
          muted: "#8E8E98",
          dark: "#5A5A64",
        },
        accent: {
          DEFAULT: "#FF4B2B",
          hover: "#E03E20",
          subtle: "rgba(255, 75, 43, 0.12)",
        },
        danger: "#E53E3E",
        success: "#38A169",
      },
      borderRadius: {
        DEFAULT: "4px",
        md: "6px",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        display: [
          "Impact",
          "Oswald",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
