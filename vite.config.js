import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Keep existing env var naming working (Vercel/CRA style)
  envPrefix: ["VITE_", "REACT_APP_"],
  build: {
    // Keep output folder name consistent with existing deployments
    outDir: "build",
    emptyOutDir: true,
  },
  server: {
    port: 3000,
  },
});
