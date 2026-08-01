import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude: [
        "src/main.ts",
        "src/modules/app.module.ts",
        "src/modules/**/*.module.ts",
        "src/db/migrate.ts",
        "src/db/seed.ts",
        "**/*.config.ts",
        "**/dist/**"
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    }
  }
});
