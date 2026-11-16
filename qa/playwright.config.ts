// Playwright configuration for the Setback QA suite.
//
// Local (default):   npm run build && npm run qa
//   Serves the static export in ./out with qa/serve-out.mjs on port 4310.
// Deployed:          BASE_URL=https://<your-site> npm run qa
//   Runs the same suite against that URL and starts no local server.

import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const LOCAL_PORT = 4310;
const envUrl = process.env.BASE_URL?.trim();
const baseURL = (envUrl && envUrl.length > 0 ? envUrl : `http://localhost:${LOCAL_PORT}`).replace(/\/+$/, "");

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  outputDir: "../test-results",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    ["json", { outputFile: "../test-results/results.json" }],
    ["html", { outputFolder: "../playwright-report", open: "never" }],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "narrow",
      use: { ...devices["Desktop Chrome"], viewport: { width: 320, height: 640 } },
    },
  ],
  // Only start the local static server when no BASE_URL was given.
  webServer: envUrl
    ? undefined
    : {
        command: `node qa/serve-out.mjs ${LOCAL_PORT}`,
        cwd: path.join(__dirname, ".."),
        url: `http://localhost:${LOCAL_PORT}`,
        reuseExistingServer: true,
        timeout: 30_000,
      },
});
