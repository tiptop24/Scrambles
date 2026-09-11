import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        pitch: "#37003c",
        accent: "#00ff85",
      },
    },
  },
  plugins: [],
};

export default config;
