import { defineConfig, devices } from "@playwright/test";

const port = 4173;
const baseHost = "127.0.0.1";
const isCI = !!process.env.CI;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://${baseHost}:${port}`;

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["github"], ["line"]] : "list",
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        baseURL,
        trace: "retain-on-failure",
      },
    },
  ],
  webServer: {
    command: `bun x --bun vite preview --host 0.0.0.0 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 60000,
  },
});
