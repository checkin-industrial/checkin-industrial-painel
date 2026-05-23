var _a;
/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// Em dev, o proxy redireciona /api e /uploads pro backend. O target padrao
// aponta pra producao; sobrescreva via env `VITE_DEV_PROXY_TARGET` pra apontar
// pro docker-compose local (http://localhost:8080).
var devProxyTarget = (_a = process.env.VITE_DEV_PROXY_TARGET) !== null && _a !== void 0 ? _a : "https://api.senailp.com.br/turismoindustrial_api";
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        host: "localhost",
        proxy: {
            "/api": { target: devProxyTarget, changeOrigin: true },
            "/uploads": { target: devProxyTarget, changeOrigin: true },
        },
    },
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["./src/test/setup.ts"],
        css: false,
    },
});
