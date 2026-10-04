import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dce7fd",
          200: "#c0d3fb",
          300: "#94b6f8",
          400: "#618ff2",
          500: "#3d69ec",
          600: "#2749e0",
          700: "#1f37ce",
          800: "#2030a7",
          900: "#1f2e84",
          950: "#171e51",
        },
      },
    },
  },
  plugins: [],
};

export default config;
