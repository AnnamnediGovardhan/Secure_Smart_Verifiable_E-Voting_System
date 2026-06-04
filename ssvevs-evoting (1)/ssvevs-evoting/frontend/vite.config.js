import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Node API gateway
      "/api": { target: "http://localhost:4000", changeOrigin: true },
      // Local fingerprint device agent. Strip the /device prefix so a call to
      // /device/fingerprint/capture reaches the agent's /fingerprint/capture route.
      "/device": {
        target: "http://127.0.0.1:8085",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/device/, ""),
      },
    },
  },
});
