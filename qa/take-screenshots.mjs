// Takes the README screenshots into docs/screenshots/.
//
//   node qa/take-screenshots.mjs                      (needs the local server: node qa/serve-out.mjs 4310)
//   BASE_URL=https://<your-site> node qa/take-screenshots.mjs
//
// Not part of `npm run qa`, so a test run never rewrites the committed images.

import { mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "@playwright/test";

const baseURL = (process.env.BASE_URL?.trim() || "http://localhost:4310").replace(/\/+$/, "");
const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "screenshots");
mkdirSync(outDir, { recursive: true });
const file = (name) => join(outDir, name);

/** Remove the focus ring that follows a view change, so it does not appear in the picture. */
const blur = (page) => page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());

async function openExample(page) {
  await page.goto(`${baseURL}/`);
  await page.getByRole("heading", { name: "Setback", level: 1 }).waitFor();
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Try the Waterloo example" }).click();
  await page.getByRole("heading", { name: "Results", level: 2 }).waitFor();
  await page.getByRole("main").getByText(/^This schedule cuts/).waitFor();
  await blur(page);
}

/** Page-coordinate box around one or more elements, with a margin. */
async function boxAround(page, locators, margin = 16) {
  const boxes = [];
  for (const locator of locators) {
    await locator.scrollIntoViewIfNeeded();
    boxes.push(
      await locator.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left + window.scrollX, top: r.top + window.scrollY, right: r.right + window.scrollX, bottom: r.bottom + window.scrollY };
      })
    );
  }
  const left = Math.max(0, Math.min(...boxes.map((b) => b.left)) - margin);
  const top = Math.max(0, Math.min(...boxes.map((b) => b.top)) - margin);
  const right = Math.max(...boxes.map((b) => b.right)) + margin;
  const bottom = Math.max(...boxes.map((b) => b.bottom)) + margin;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

const browser = await chromium.launch();
try {
  // ---- Desktop, 1280 x 800 -------------------------------------------------
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const page = await desktop.newPage();

  await page.goto(`${baseURL}/`);
  await page.getByRole("heading", { name: "Setback", level: 1 }).waitFor();
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: file("01-landing.png") });

  await openExample(page);
  // Top of Results: header, step navigation, headline and the before/after table.
  const table = page.getByRole("region", { name: "Before and after comparison" });
  const tableBox = await boxAround(page, [table], 0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: file("02-results.png"),
    fullPage: true,
    clip: { x: 0, y: 0, width: 1280, height: Math.ceil(tableBox.y + tableBox.height + 12) },
  });

  // "One week, hour by hour": both charts, coldest week (the default).
  const chart = page.getByRole("region", { name: "One week, hour by hour" });
  await page.screenshot({ path: file("03-chart.png"), fullPage: true, clip: await boxAround(page, [chart]) });

  // "Scale it" at 40 homes together with the "Program this tonight" card.
  await page.getByLabel("How many homes like this?").fill("40");
  await page.getByText("Linear scaling estimate").waitFor();
  await blur(page);
  const scale = page.getByRole("region", { name: "Scale it" });
  const card = page.getByRole("region", { name: "Program this tonight" });
  await page.screenshot({ path: file("04-action-card.png"), fullPage: true, clip: await boxAround(page, [scale, card]) });

  await page.getByRole("button", { name: "Next: Sources and assumptions" }).click();
  await page.getByRole("heading", { name: "Sources and assumptions", level: 2 }).waitFor();
  await blur(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: file("05-sources.png") });
  await desktop.close();

  // ---- Pixel 7 --------------------------------------------------------------
  const mobile = await browser.newContext({ ...devices["Pixel 7"] });
  const phone = await mobile.newPage();
  await openExample(phone);
  await phone.evaluate(() => window.scrollTo(0, 0));
  await phone.screenshot({ path: file("06-mobile-results.png") });
  if (statSync(file("06-mobile-results.png")).size > 400 * 1024) {
    // Device-pixel output is too heavy for the README: fall back to CSS pixels.
    await phone.screenshot({ path: file("06-mobile-results.png"), scale: "css" });
  }
  await mobile.close();
} finally {
  await browser.close();
}

for (const name of ["01-landing.png", "02-results.png", "03-chart.png", "04-action-card.png", "05-sources.png", "06-mobile-results.png"]) {
  console.log(`${name}  ${Math.round(statSync(file(name)).size / 1024)} KB`);
}
