import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 }
  },
  webServer: {
    command: "corepack pnpm exec vite preview --port 4174 --strictPort",
    port: 4174,
    reuseExistingServer: false,
    timeout: 30_000
  }
});
