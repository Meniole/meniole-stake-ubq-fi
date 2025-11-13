import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const defaultHost = process.env.PLAYWRIGHT_BASE_HOST ?? "127.0.0.1";
const serverHost =
  process.env.PLAYWRIGHT_HOST ?? (isCI ? "0.0.0.0" : defaultHost);
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://${defaultHost}:${port}`;

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
    command: `bun x --bun vite preview --host ${serverHost} --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120000,
    env: {
      NODE_ENV: "production",
    },
  },
});
