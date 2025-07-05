import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, "client"),
  resolve: {
    alias: {
      "@": resolve(__dirname, "client/src"),
      "@shared": resolve(__dirname, "shared"),
      "@assets": resolve(__dirname, "client/assets"),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    outDir: resolve(__dirname, "dist/client"),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "client/index.html"),
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
});