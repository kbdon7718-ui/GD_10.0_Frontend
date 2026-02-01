import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Keep existing env var naming working (Vercel/CRA style)
  envPrefix: ["VITE_", "REACT_APP_", "CUSTOMER_BACKEND_"],
  build: {
    // Keep output folder name consistent with existing deployments
    outDir: "build",
    emptyOutDir: true,
  },
  server: {
    // Use a different port than the backend (backend defaults to 3000)
    port: 5173,
    // Dev convenience: forward /api/* to backend so relative axios calls work
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
