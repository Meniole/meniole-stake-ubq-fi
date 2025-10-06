import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import type { UserConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  css: {
    devSourcemap: true,
  },
  build: {
    cssCodeSplit: false,
    outDir: "dist",
  },
  worker: {
    format: "es",
  },
  optimizeDeps: {
    exclude: ["secp256k1"],
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
}) as UserConfig;
