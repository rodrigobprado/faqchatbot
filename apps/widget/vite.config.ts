import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const contractsEntry = fileURLToPath(new URL("../../packages/contracts/src/index.js", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@faqchatbot/contracts": contractsEntry
    }
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
