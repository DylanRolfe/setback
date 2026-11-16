// Check 1: the zero-setup demo. Landing -> "Try the Waterloo example" -> Results,
// with the documented numbers (docs/SOURCES.md section 8).

import {
  actionCard,
  comparisonTable,
  EXAMPLE,
  expect,
  expectExampleResults,
  expectView,
  gotoLanding,
  headline,
  rowCells,
  test,
} from "./helpers";

test.describe("1. Demo flow: Waterloo example", () => {
  test("landing page offers the example and the manual path", async ({ page }) => {
    await gotoLanding(page);
    await expect(page).toHaveTitle(/Setback/);
    await expect(page.getByRole("button", { name: "Try the Waterloo example" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Start with my own place" })).toBeVisible();
    await expect(page.getByText("No login. No tracking. Runs in your browser.").first()).toBeVisible();
    await expect(page.getByRole("main")).toContainText("They are not measured savings.");
  });

  test("one click reaches Results with the documented headline and table", async ({ page }) => {
    await gotoLanding(page);
    await page.getByRole("button", { name: "Try the Waterloo example" }).click();
    await expectView(page, "Results");

    await expect(headline(page)).toHaveText(
      "This schedule cuts your simulated heating energy by 8.8% (about 150 kg CO2e this season) under these assumptions."
    );
    await expect(page.getByRole("main")).toContainText(
      "Simulated for one home (apartment) in Waterloo, Ontario, over one heating season (Oct 1, 2025 to Apr 30, 2026)."
    );

    await expect(comparisonTable(page).getByRole("columnheader")).toHaveText(["Measure", "Before", "After", "Saved"]);
    await expect(rowCells(page, /^Heating energy, kWh/)).toHaveText([...EXAMPLE.energy]);
    await expect(rowCells(page, /^Natural gas, m³/)).toHaveText([...EXAMPLE.gas]);
    await expect(rowCells(page, /^Emissions, kg CO2e/)).toHaveText([...EXAMPLE.co2e]);
    await expectExampleResults(page);
  });

  test("comfort check shows 6.9 of 1,934 hours", async ({ page }) => {
    await gotoLanding(page);
    await page.getByRole("button", { name: "Try the Waterloo example" }).click();
    await expectView(page, "Results");
    const comfort = page.getByRole("region", { name: "Comfort check" });
    await expect(comfort).toContainText("below 20 °C for 6.9 of 1,934 hours at home and awake");
    await expect(comfort).toContainText("below 20 °C for 0 of 1,934 hours at home and awake");
  });

  test("sanity check shows 1.4% (NRCan, below) and 3.3% (CMHC)", async ({ page }) => {
    await gotoLanding(page);
    await page.getByRole("button", { name: "Try the Waterloo example" }).click();
    await expectView(page, "Results");
    const sanity = page.getByRole("region", { name: "Sanity check" });
    await expect(sanity).toContainText("Our model gives 1.4%, which is below NRCan’s “about 2 percent”.");
    await expect(sanity).toContainText("1.4% of simulated heating energy");
    await expect(sanity).toContainText("Our model gives 3.3%, which is below CMHC’s 6.5%.");
    await expect(sanity).toContainText("3.3% of simulated heating energy, for your home and city");
  });

  test("the chart opens on the coldest week, Jan 26, 2026", async ({ page }) => {
    await gotoLanding(page);
    await page.getByRole("button", { name: "Try the Waterloo example" }).click();
    await expectView(page, "Results");
    const week = page.getByLabel("Week to show");
    const selected = await week.evaluate((el: HTMLSelectElement) => el.selectedOptions[0].text);
    expect(selected).toContain(EXAMPLE.week);
    expect(selected).toContain("coldest week");

    const chart = page.getByRole("region", { name: "One week, hour by hour" });
    await expect(chart.getByRole("img", { name: /Simulated indoor temperature and outdoor temperature/ })).toBeVisible();
    await expect(chart.getByRole("img", { name: /Simulated heat delivered each hour/ })).toBeVisible();
    await expect(chart.locator("figcaption").first()).toContainText(`${EXAMPLE.week}.`);
    await expect(chart.locator("figcaption").last()).toContainText(`${EXAMPLE.week}.`);

    // Changing the week updates both charts.
    await week.selectOption({ label: "Week of Jan 19, 2026 (average -12.2 °C outside)" });
    await expect(chart.locator("figcaption").first()).toContainText("Week of Jan 19, 2026.");
    await expect(chart.locator("figcaption").last()).toContainText("Week of Jan 19, 2026.");
  });

  test("the data table disclosure lists every hour of the week", async ({ page }) => {
    await gotoLanding(page);
    await page.getByRole("button", { name: "Try the Waterloo example" }).click();
    await expectView(page, "Results");
    await page.getByText("Show data table").click();
    const table = page.getByRole("table", { name: "Hourly simulated values, week of Jan 26, 2026" });
    await expect(table).toBeVisible();
    await expect(table.getByRole("columnheader")).toHaveText([
      "Day",
      "Hour",
      "Outside (°C)",
      "Inside, now (°C)",
      "Inside, better (°C)",
      "Heat, now (kW)",
      "Heat, better (kW)",
    ]);
    // 7 days x 24 hours, plus the header row.
    await expect(table.getByRole("row")).toHaveCount(7 * 24 + 1);
  });

  test("the action card lists the suggested schedule", async ({ page }) => {
    await gotoLanding(page);
    await page.getByRole("button", { name: "Try the Waterloo example" }).click();
    await expectView(page, "Results");
    const card = actionCard(page);
    await expect(card.getByRole("heading", { name: "Weekdays (Mon to Fri)" })).toBeVisible();
    await expect(card.getByRole("heading", { name: "Weekend (Sat, Sun)" })).toBeVisible();
    await expect(card.getByRole("list").nth(0).getByRole("listitem")).toHaveText([...EXAMPLE.weekdays]);
    await expect(card.getByRole("list").nth(1).getByRole("listitem")).toHaveText([...EXAMPLE.weekend]);
    await expect(card.getByRole("button", { name: "Print this card" })).toBeVisible();
    await expect(card.getByRole("button", { name: "Copy share link" })).toBeVisible();
  });
});
