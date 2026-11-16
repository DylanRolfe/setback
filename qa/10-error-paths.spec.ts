// Extra checks outside the numbered list: what the app does when the one request
// it makes (the static weather file) fails or returns nonsense. The network is
// broken on purpose here, so failed requests and the browser's own "Failed to load
// resource" console line are allowed; uncaught errors are still a failure.

import {
  actionCard,
  expect,
  expectExampleResults,
  expectView,
  goToStep,
  gotoLanding,
  headline,
  scaleSection,
  test,
} from "./helpers";

const WEATHER = "**/data/weather-*.json";

test.describe("Extra: weather data failures", () => {
  test.use({ allowNetworkErrors: true });

  test("example: a failed weather download shows an error and stays on the landing page", async ({ page }) => {
    await page.route(WEATHER, (route) => route.abort("failed"));
    await gotoLanding(page);
    await page.getByRole("button", { name: "Try the Waterloo example" }).click();
    await expect(
      page.getByText("Error: the example weather data did not load. Check your connection and try again.")
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Try the Waterloo example" })).toBeVisible();
    await expect(headline(page)).toHaveCount(0);
  });

  // DEF-04: after one failed download, a successful second try still shows the old error on Results.
  test("example: after a failed download, trying again once the network is back shows Results", async ({ page }) => {
    test.fail(true, "DEF-04: Results shows a stale weather error until Try again is pressed");
    await page.route(WEATHER, (route) => route.abort("failed"));
    await gotoLanding(page);
    await page.getByRole("button", { name: "Try the Waterloo example" }).click();
    await expect(
      page.getByText("Error: the example weather data did not load. Check your connection and try again.")
    ).toBeVisible();

    await page.unroute(WEATHER);
    await page.getByRole("button", { name: "Try the Waterloo example" }).click();
    await expectView(page, "Results");
    await expect(headline(page)).toContainText("8.8%", { timeout: 4000 });
  });

  test("example: the Try again button on Results recovers from DEF-04", async ({ page }) => {
    await page.route(WEATHER, (route) => route.abort("failed"));
    await gotoLanding(page);
    await page.getByRole("button", { name: "Try the Waterloo example" }).click();
    await expect(
      page.getByText("Error: the example weather data did not load. Check your connection and try again.")
    ).toBeVisible();
    await page.unroute(WEATHER);
    await page.getByRole("button", { name: "Try the Waterloo example" }).click();
    await expectView(page, "Results");
    await page.getByRole("button", { name: "Try again" }).click();
    await expectExampleResults(page);
  });

  test("manual path: error message with Try again on step 1, step 3 and Results; no numbers are invented", async ({ page }) => {
    await page.route(WEATHER, (route) => route.fulfill({ status: 503, body: "unavailable" }));
    await gotoLanding(page);
    await page.getByRole("button", { name: "Start with my own place" }).click();
    await expectView(page, "Your place");
    const alert = page.getByRole("alert").filter({ hasText: "did not load" });
    await expect(alert).toContainText("Error: the weather data for Waterloo, Ontario did not load. Check your connection and try again.");
    await expect(alert.getByRole("button", { name: "Try again" })).toBeVisible();

    await goToStep(page, 3);
    await expect(page.getByRole("button", { name: "Suggest a schedule" })).toHaveAttribute("aria-disabled", "true");
    // The button is aria-disabled, so Playwright would wait for it; press it anyway.
    await page.getByRole("button", { name: "Suggest a schedule" }).click({ force: true });
    await expect(page.getByText(/^Suggested:/)).toHaveCount(0);
    await expect(page.getByText(/^Preview:/)).toHaveCount(0);

    await goToStep(page, 4);
    await expect(page.getByRole("alert").filter({ hasText: "did not load" })).toBeVisible();
    await expect(headline(page)).toHaveCount(0);
    await expect(page.getByRole("table")).toHaveCount(0);
    await expect(actionCard(page)).toHaveCount(0);
    await expect(scaleSection(page)).toHaveCount(0);

    // Recovery without reloading the page.
    await page.unroute(WEATHER);
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(headline(page)).toHaveText("This schedule does not save energy compared with your current one.");
    await expect(page.getByRole("alert").filter({ hasText: "did not load" })).toHaveCount(0);
  });

  test("a weather file with the wrong shape is rejected instead of crashing", async ({ page }) => {
    await page.route(WEATHER, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ hourlyC: [] }) })
    );
    await gotoLanding(page);
    await page.getByRole("button", { name: "Try the Waterloo example" }).click();
    await expect(
      page.getByText("Error: the example weather data did not load. Check your connection and try again.")
    ).toBeVisible();
    await page.getByRole("button", { name: "Start with my own place" }).click();
    await expectView(page, "Your place");
    await expect(page.getByRole("alert").filter({ hasText: "did not load" })).toBeVisible();
    await goToStep(page, 4);
    await expect(headline(page)).toHaveCount(0);
  });
});

test.describe("Extra: share link housekeeping", () => {
  test("the copied link is withdrawn as soon as the scenario changes", async ({ page }) => {
    await gotoLanding(page);
    await page.getByRole("button", { name: "Try the Waterloo example" }).click();
    await expectView(page, "Results");
    await actionCard(page).getByRole("button", { name: "Copy share link" }).click();
    const field = actionCard(page).getByLabel("Share link");
    await expect(field).toBeVisible();
    const first = await field.inputValue();

    await scaleSection(page).getByLabel("How many homes like this?").fill("12");
    await expect(field).toHaveCount(0);

    await actionCard(page).getByRole("button", { name: "Copy share link" }).click();
    await expect(field).toBeVisible();
    expect(await field.inputValue()).not.toBe(first);
  });

  test("a reload on Results keeps the scenario", async ({ page }) => {
    await gotoLanding(page);
    await page.getByRole("button", { name: "Try the Waterloo example" }).click();
    await expectView(page, "Results");
    await scaleSection(page).getByLabel("How many homes like this?").fill("40");
    await expect.poll(() => page.url(), { timeout: 5000 }).toMatch(/#s=[A-Za-z0-9_-]+$/);
    await page.waitForTimeout(500);
    await page.reload();
    await expectView(page, "Results");
    await expectExampleResults(page);
    await expect(scaleSection(page).getByLabel("How many homes like this?")).toHaveValue("40");
  });

  // DEF-03: the browser's own Back button is not wired to the steps.
  test("the browser Back button returns to the previous step", async ({ page }) => {
    test.fail(true, "DEF-03: view changes are not in the browser history, so Back leaves the app");
    await gotoLanding(page);
    await page.getByRole("button", { name: "Start with my own place" }).click();
    await expectView(page, "Your place");
    await page.getByRole("button", { name: "Next: Your schedule now" }).click();
    await expectView(page, "Your schedule now");
    await page.goBack();
    await expect(page.getByRole("heading", { name: "Your place", level: 2 })).toBeVisible({ timeout: 3000 });
  });
});
