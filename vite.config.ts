import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: "localhost",
    proxy: {
      "/api": {
        target: "https://api.senailp.com.br/turismoindustrial_api",
        changeOrigin: true,
      },
      "/uploads": {
        target: "https://api.senailp.com.br/turismoindustrial_api",
        changeOrigin: true,
      },
    },
  }
});
