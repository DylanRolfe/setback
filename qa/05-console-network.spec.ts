// Check 6: on every view, no console errors or warnings, no uncaught errors, no
// failed requests, and no request to any origin other than the site itself.
//
// The same assertions also run automatically at the end of every other test in
// the suite (see the "monitor" fixture in helpers.ts). This spec visits each view
// on purpose and reports what was requested.

import {
  expect,
  expectClean,
  expectView,
  goToSources,
  goToStep,
  gotoLanding,
  openExample,
  startOwnPlace,
  test,
  weekdaysEditor,
} from "./helpers";

test.describe("6. Console and network", () => {
  test("landing page", async ({ page, monitor }) => {
    await gotoLanding(page);
    await page.waitForLoadState("networkidle");
    expectClean(monitor, "landing");
    expect(monitor.requests.length).toBeGreaterThan(0);
    // The only data request the landing page may make is the static weather file for the default city.
    for (const request of monitor.requests.filter((r) => r.includes("/data/"))) {
      expect(request).toBe(`GET ${monitor.origin}/data/weather-waterloo.json`);
    }
  });

  test("steps 1 to 3 on the manual path, with a city change", async ({ page, monitor }) => {
    await startOwnPlace(page);
    await page.waitForLoadState("networkidle");
    expectClean(monitor, "step 1");

    await page.getByLabel("City", { exact: true }).selectOption({ label: "Montreal, Quebec" });
    await expect(page.getByText(/Quebec emission factors\./)).toBeVisible();
    await page.getByText("Adjust the estimates").click();
    await page.waitForLoadState("networkidle");
    expectClean(monitor, "step 1 after city change");

    await goToStep(page, 2);
    await weekdaysEditor(page).getByRole("button", { name: "Add a time block" }).click();
    expectClean(monitor, "step 2");

    await goToStep(page, 3);
    await page.getByRole("button", { name: "Suggest a schedule" }).click();
    await expect(page.getByText(/^Suggested:/)).toBeVisible();
    expectClean(monitor, "step 3");

    const data = monitor.requests.filter((r) => r.includes("/data/"));
    expect(data).toEqual([
      `GET ${monitor.origin}/data/weather-waterloo.json`,
      `GET ${monitor.origin}/data/weather-montreal.json`,
    ]);
  });

  test("Results (all cards opened) and Sources", async ({ page, monitor }, testInfo) => {
    await openExample(page);
    await page.getByText("Show data table").click();
    await expect(page.getByRole("table", { name: /Hourly simulated values/ })).toBeVisible();
    await page.getByLabel("Week to show").selectOption({ index: 0 });
    await page.getByLabel("How many homes like this?").fill("40");
    await page.getByLabel(/^Your energy price/).fill("45");
    await page.getByRole("button", { name: "Copy share link" }).click();
    await expect(page.getByLabel("Share link")).toBeVisible();
    await page.waitForLoadState("networkidle");
    expectClean(monitor, "results");

    await goToSources(page);
    await page.waitForLoadState("networkidle");
    expectClean(monitor, "sources");

    // Everything the whole visit requested, for the report.
    await testInfo.attach("requests.txt", { body: monitor.requests.join("\n"), contentType: "text/plain" });
    for (const request of monitor.requests) {
      const url = request.replace(/^[A-Z]+ /, "");
      expect(new URL(url).origin, `same-origin request: ${url}`).toBe(monitor.origin);
    }
    // The only data request is the static weather file for the example city.
    expect(monitor.requests.filter((r) => r.includes("/data/"))).toEqual([
      `GET ${monitor.origin}/data/weather-waterloo.json`,
    ]);
  });

  test("every city's weather file loads", async ({ page, monitor }) => {
    await startOwnPlace(page);
    const city = page.getByLabel("City", { exact: true });
    for (const [label, province] of [
      ["Toronto, Ontario", "Ontario"],
      ["Montreal, Quebec", "Quebec"],
      ["Calgary, Alberta", "Alberta"],
      ["Vancouver, British Columbia", "British Columbia"],
      ["Waterloo, Ontario", "Ontario"],
    ] as const) {
      await city.selectOption({ label });
      await expect(
        page.getByText(`Uses hourly outdoor temperatures for Oct 1, 2025 to Apr 30, 2026 and ${province} emission factors.`)
      ).toBeVisible();
      await expect(page.getByRole("alert").filter({ hasText: "did not load" })).toHaveCount(0);
    }
    await goToStep(page, 4);
    await expectView(page, "Results");
    expectClean(monitor, "all cities");
    expect(monitor.requests.filter((r) => r.includes("/data/")).length).toBe(5);
  });
});
