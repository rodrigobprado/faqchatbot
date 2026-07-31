import { defineConfig } from "vite";

export default defineConfig({
  define: {
    __API_URL__: JSON.stringify(process.env.API_PUBLIC_URL ?? "http://localhost:3000")
  },
  build: {
    lib: {
      entry: "src/index.ts",
      name: "ChatWidget",
      fileName: () => "widget.js",
      formats: ["iife"]
    },
    rollupOptions: {
      output: {
        extend: true
      }
    }
  },
  test: {
    environment: "jsdom",
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude: ["src/index.ts", "vite.config.ts", "**/dist/**"],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    }
  }
});
