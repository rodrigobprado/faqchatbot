import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  use: {
    headless: true,
    viewport: { width: 1440, height: 900 }
  },
  webServer: {
    command: "corepack pnpm exec vite preview --port 4175 --strictPort",
    port: 4175,
    reuseExistingServer: false,
    timeout: 30_000
  }
});
