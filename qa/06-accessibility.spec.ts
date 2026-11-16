// Check 7: axe-core, WCAG 2.0 and 2.1 levels A and AA, on every view, in every project.
// Full results are saved under test-results/axe/<project>--<view>.json.

import {
  expect,
  goToSources,
  goToStep,
  gotoLanding,
  openExample,
  runAxe,
  startOwnPlace,
  test,
  weekdaysEditor,
} from "./helpers";

test.describe("7. Accessibility (axe-core, WCAG 2.0/2.1 A and AA)", () => {
  test("landing", async ({ page }, testInfo) => {
    await gotoLanding(page);
    expect(await runAxe(page, testInfo, "landing")).toEqual([]);
  });

  test("step 1, Your place", async ({ page }, testInfo) => {
    await startOwnPlace(page);
    expect(await runAxe(page, testInfo, "step-1")).toEqual([]);
  });

  test("step 1 with the estimates open, heat pump caution and a field error", async ({ page }, testInfo) => {
    await startOwnPlace(page);
    await page.getByText("Adjust the estimates").click();
    await page.getByRole("radio", { name: /^Heat pump/ }).check();
    const ua = page.getByLabel(/Heat loss, UA \(W\/K\)/);
    await ua.fill("0");
    await ua.blur();
    await expect(page.getByText("Error: Enter a number from 1 to 5000.")).toBeVisible();
    expect(await runAxe(page, testInfo, "step-1-open-heatpump-error")).toEqual([]);
  });

  test("step 2, Your schedule now", async ({ page }, testInfo) => {
    await startOwnPlace(page);
    await goToStep(page, 2);
    expect(await runAxe(page, testInfo, "step-2")).toEqual([]);
  });

  test("step 3, A better schedule (suggested, with a 17 °C warning)", async ({ page }, testInfo) => {
    await startOwnPlace(page);
    await goToStep(page, 3);
    expect(await runAxe(page, testInfo, "step-3")).toEqual([]);
    await page.getByRole("button", { name: "Suggest a schedule" }).click();
    await expect(page.getByText(/^Suggested:/)).toBeVisible();
    await weekdaysEditor(page).getByLabel("Temperature (°C), block 2").fill("16");
    await expect(page.getByText(/^Warning: this schedule goes down to 16 °C\./)).toBeVisible();
    expect(await runAxe(page, testInfo, "step-3-suggested-warning")).toEqual([]);
  });

  test("Results", async ({ page }, testInfo) => {
    await openExample(page);
    expect(await runAxe(page, testInfo, "results")).toEqual([]);
  });

  test("Results with the data table, scaled values, price and share link shown", async ({ page }, testInfo) => {
    await openExample(page);
    await page.getByText("Show data table").click();
    await expect(page.getByRole("table", { name: /Hourly simulated values/ })).toBeVisible();
    await page.getByLabel("How many homes like this?").fill("40");
    await page.getByLabel(/^Your energy price/).fill("50");
    await page.getByRole("button", { name: "Copy share link" }).click();
    await expect(page.getByLabel("Share link")).toBeVisible();
    expect(await runAxe(page, testInfo, "results-data-table-open")).toEqual([]);
  });

  test("Sources and assumptions", async ({ page }, testInfo) => {
    await openExample(page);
    await goToSources(page);
    expect(await runAxe(page, testInfo, "sources")).toEqual([]);
  });

  test("document basics: language, title, one h1, landmarks", async ({ page }) => {
    await gotoLanding(page);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page).toHaveTitle("Setback: heating schedule energy and CO2e simulator");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("contentinfo")).toHaveCount(1);
    await page.getByRole("button", { name: "Start with my own place" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("banner")).toHaveCount(1);
    await expect(page.getByRole("navigation", { name: "Steps" })).toHaveCount(1);
  });

  test("the headline result is announced through a polite live region", async ({ page }) => {
    await openExample(page);
    const live = page.locator('[aria-live="polite"]');
    await expect(live).toHaveCount(1);
    await expect(live).toHaveText(
      "This schedule cuts your simulated heating energy by 8.8% (about 150 kg CO2e this season) under these assumptions."
    );
    // Charts have a text alternative: an accessible name plus the computed summary.
    const chart = page.getByRole("region", { name: "One week, hour by hour" });
    const temperature = chart.getByRole("img", { name: /Simulated indoor temperature and outdoor temperature, hour by hour/ });
    await expect(temperature).toHaveAccessibleName(/Week of Jan 26, 2026\. Simulated heating energy this week: 524 kWh/);
    const heat = chart.getByRole("img", { name: /Simulated heat delivered each hour, in kilowatts/ });
    await expect(heat).toHaveAccessibleName(/The heater size is 5\.8 kW \(estimate\)\./);
  });
});
