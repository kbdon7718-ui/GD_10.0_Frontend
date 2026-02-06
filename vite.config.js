import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ["VITE_", "REACT_APP_", "CUSTOMER_BACKEND_"]);
  const apiBase = String(env.VITE_API_URL || "https://gd-10-0-backend-1.onrender.com")
    .trim()
    .replace(/\/+$/, "");

  return {
    plugins: [react()],
    // Keep existing env var naming working (Vercel/CRA style)
    envPrefix: ["VITE_", "REACT_APP_", "CUSTOMER_BACKEND_"],
    build: {
      // Keep output folder name consistent with existing deployments
      outDir: "build",
      emptyOutDir: true,
    },
    server: {
      port: 5173,
      // Dev convenience: forward /api/* to backend so relative axios calls work
      proxy: {
        "/api": {
          target: apiBase,
          changeOrigin: true,
        },
      },
    },
  };
});
