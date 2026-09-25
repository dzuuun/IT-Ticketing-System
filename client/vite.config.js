import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(() => {
  const configuredBase = process.env.VITE_PUBLIC_BASE_PATH || "/";
  const base = configuredBase.endsWith("/")
    ? configuredBase
    : `${configuredBase}/`;

  return {
    base,
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: "http://localhost:5000",
          changeOrigin: true,
        },
        "/auth": {
          target: "http://localhost:5000",
          changeOrigin: true,
        },
        "/uploads": {
          target: "http://localhost:5000",
          changeOrigin: true,
        },
      },
    },
  };
});
