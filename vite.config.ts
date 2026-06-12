import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  assetsInclude: ["**/*.ttf"],
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Intercept any request starting with /api
      "/api": {
        target: "http://localhost:4000", // Path to your Bun API server
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
