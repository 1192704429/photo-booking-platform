import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  base: "/",
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      antd: path.resolve(rootDir, "node_modules/antd"),
      "@ant-design/icons": path.resolve(rootDir, "node_modules/@ant-design/icons"),
    },
  },
  server: {
    port: 4174,
    host: "0.0.0.0",
  },
  build: {
    outDir: "dist",
  },
  optimizeDeps: {
    include: ["antd", "@ant-design/icons"],
  },
});
