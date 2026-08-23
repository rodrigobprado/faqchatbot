import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 20_000,
    hookTimeout: 20_000,
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude: [
        "src/main.ts",
        "src/modules/app.module.ts",
        "src/modules/**/*.module.ts",
        "src/common/**/*.ts",
        "src/db/database.module.ts",
        "src/db/database.service.ts",
        "src/db/repositories/roles.repository.ts",
        "src/db/repositories/tenant-agent-configs.repository.ts",
        "src/db/repositories/tenant-configs.repository.ts",
        "src/db/repositories/user-roles.repository.ts",
        "src/db/migrate.ts",
        "src/db/seed.ts",
        "src/modules/auth/**/*.controller.ts",
        "src/modules/auth/**/*.module.ts",
        "src/modules/tenants/**/*.controller.ts",
        "src/modules/tenants/**/*.module.ts",
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
