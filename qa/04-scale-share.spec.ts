// Check 4 ("Scale it") and check 5 (share link, garbage hash).

import {
  actionCard,
  comparisonTable,
  expect,
  expectClean,
  expectExampleResults,
  expectView,
  freshContext,
  gotoLanding,
  headline,
  openExample,
  parseNumber,
  rowCells,
  scaleSection,
  test,
  waitForApp,
  watchContext,
} from "./helpers";

const b64url = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** The packed form of the Waterloo example (see lib/share.ts). */
const EXAMPLE_PACKED = {
  v: 1,
  c: "waterloo",
  h: "apartment",
  ua: 80,
  cm: 11.6,
  hk: null,
  ht: "gas",
  fe: 95,
  r: [420, 1380, 1, 510, 1050, 540, 1410],
  cf: 20,
  b: [[[0, 22]], [[0, 22]]],
  a: [
    [
      [300, 21],
      [510, 18],
      [930, 21],
      [1380, 18],
    ],
    [
      [420, 21],
      [1410, 18],
    ],
  ],
  n: 1,
  p: null,
};

test.describe("4. Scale it", () => {
  test("40 homes shows 40 x the single-home savings with the linear scaling label", async ({ page }) => {
    await openExample(page);
    const scale = scaleSection(page);
    const homes = scale.getByLabel("How many homes like this?");
    await expect(homes).toHaveValue("1");
    await expect(scale.getByText(/Linear scaling estimate/)).toHaveCount(0);

    await homes.fill("40");
    await expect(scale).toContainText("Linear scaling estimate: assumes 40 identical homes and schedules.");
    await expect(scale.getByText("estimate", { exact: true })).toBeVisible();

    const single = {
      energy: parseNumber(await rowCells(page, /^Heating energy, kWh/).nth(2).innerText()),
      gas: parseNumber(await rowCells(page, /^Natural gas, m³/).nth(2).innerText()),
      co2e: parseNumber(await rowCells(page, /^Emissions, kg CO2e/).nth(2).innerText()),
    };
    expect(single).toEqual({ energy: 827, gas: 78, co2e: 150 });

    const items = scale.getByRole("listitem");
    await expect(items).toHaveCount(3);
    await expect(items.nth(0)).toHaveText(/^Heating energy saved: [\d,]+ kWh per season$/);
    await expect(items.nth(1)).toHaveText(/^Natural gas saved: [\d,]+ m³ per season$/);
    await expect(items.nth(2)).toHaveText(/^Emissions saved: [\d,]+ kg CO2e per season$/);
    const scaled = (await items.allInnerTexts()).map(parseNumber);

    // The single-home figures are shown rounded to whole numbers, so 40 x the true
    // value lies within 40 x 0.5 of 40 x the displayed value.
    expect(Math.abs(scaled[0] - 40 * single.energy)).toBeLessThanOrEqual(20);
    expect(Math.abs(scaled[1] - 40 * single.gas)).toBeLessThanOrEqual(20);
    expect(Math.abs(scaled[2] - 40 * single.co2e)).toBeLessThanOrEqual(20);
    // docs/SOURCES.md section 8: "about 3,100 m³ of gas and about 5,990 kg CO2e".
    expect(Math.round(scaled[1] / 10) * 10).toBe(3100);
    expect(Math.round(scaled[2] / 10) * 10).toBe(5990);

    // Back to one home removes the scaled block.
    await homes.fill("1");
    await expect(scale.getByText(/Linear scaling estimate/)).toHaveCount(0);
  });

  test("rejects zero, fractions and values over 10,000", async ({ page }) => {
    await openExample(page);
    const scale = scaleSection(page);
    const homes = scale.getByLabel("How many homes like this?");
    await homes.fill("0");
    await homes.blur();
    await expect(scale.getByText("Error: Enter a number from 1 to 10000.")).toBeVisible();
    await homes.fill("2.5");
    await homes.blur();
    await expect(scale.getByText("Error: Enter a whole number from 1 to 10000.")).toBeVisible();
    await homes.fill("10001");
    await homes.blur();
    await expect(scale.getByText("Error: Enter a number from 1 to 10000.")).toBeVisible();
    await expect(scale.getByText(/Linear scaling estimate/)).toHaveCount(0);
  });
});

test.describe("5. Share link", () => {
  test("the link from the action card reproduces Results in a fresh browser context", async ({ page, browser, baseURL }, testInfo) => {
    await openExample(page);
    await scaleSection(page).getByLabel("How many homes like this?").fill("40");
    await page.getByLabel("Your energy price (optional), in cents per cubic metre of gas").fill("50");
    await expect(rowCells(page, /^Cost at your price/)).toHaveCount(3);

    await actionCard(page).getByRole("button", { name: "Copy share link" }).click();
    const field = actionCard(page).getByLabel("Share link");
    await expect(field).toBeVisible();
    const link = await field.inputValue();
    expect(link).toMatch(/#s=[A-Za-z0-9_-]+$/);
    expect(new URL(link).origin).toBe(new URL(baseURL ?? "").origin);
    await expect(actionCard(page).getByRole("status")).toHaveText(
      /Link copied\. Anyone who opens it sees this same scenario\.|Your browser did not allow copying\. Select the link below and copy it yourself\./
    );
    await expect(actionCard(page)).toContainText("Nothing is sent to a server.");

    // The address bar carries the same link (it is updated a moment after each change).
    await expect.poll(() => page.url(), { timeout: 5000 }).toBe(link);

    const originalCost = await rowCells(page, /^Cost at your price/).allInnerTexts();
    const originalScale = await scaleSection(page).getByRole("listitem").allInnerTexts();

    // Fresh context: no cookies, no storage, no history.
    const context = await freshContext(browser, testInfo);
    const monitor = watchContext(context, baseURL ?? "");
    const fresh = await context.newPage();
    await fresh.goto(link);
    await expectView(fresh, "Results");
    await expectExampleResults(fresh);
    await expect(rowCells(fresh, /^Cost at your price/)).toHaveText(originalCost);
    await expect(scaleSection(fresh).getByLabel("How many homes like this?")).toHaveValue("40");
    await expect(scaleSection(fresh).getByRole("listitem")).toHaveText(originalScale);
    await expect(fresh.getByLabel("Your energy price (optional), in cents per cubic metre of gas")).toHaveValue("50");
    await expect(fresh.getByRole("region", { name: "Sanity check" })).toContainText("Our model gives 1.4%");
    expectClean(monitor, "fresh context");
    await context.close();
  });

  test("location.href after Results is a working share link", async ({ page, browser, baseURL }, testInfo) => {
    await openExample(page);
    await expect.poll(() => page.url(), { timeout: 5000 }).toMatch(/#s=[A-Za-z0-9_-]+$/);
    const href = await page.evaluate(() => window.location.href);

    const context = await freshContext(browser, testInfo);
    const monitor = watchContext(context, baseURL ?? "");
    const fresh = await context.newPage();
    await fresh.goto(href);
    await expectView(fresh, "Results");
    await expectExampleResults(fresh);
    expectClean(monitor, "fresh context");
    await context.close();
  });

  test("a hand-built link for the example decodes to the same numbers", async ({ page }) => {
    await page.goto(`/#s=${b64url(EXAMPLE_PACKED)}`);
    await expectView(page, "Results");
    await expectExampleResults(page);
  });

  test("copying the link puts it on the clipboard when the browser allows it", async ({ page, context, browserName }, testInfo) => {
    test.skip(browserName !== "chromium", "Clipboard permissions can only be granted in Chromium");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await openExample(page);
    await actionCard(page).getByRole("button", { name: "Copy share link" }).click();
    const field = actionCard(page).getByLabel("Share link");
    await expect(field).toBeVisible();
    const status = actionCard(page).getByRole("status");
    await expect(status).not.toHaveText("");
    const message = await status.innerText();
    testInfo.annotations.push({ type: "clipboard", description: message });
    if (message.startsWith("Link copied")) {
      const clip = await page.evaluate(() => navigator.clipboard.readText());
      expect(clip).toBe(await field.inputValue());
    } else {
      // The fallback: the link is on screen for manual copying.
      expect(message).toBe("Your browser did not allow copying. Select the link below and copy it yourself.");
      await expect(field).toHaveValue(/#s=/);
    }
  });

  for (const [name, hash] of [
    ["#s=xyz", "#s=xyz"],
    ["empty payload", "#s="],
    ["not base64", "#s=%%%"],
    ["base64 of broken JSON", `#s=${Buffer.from("{{{").toString("base64url")}`],
    ["unknown version", `#s=${b64url({ ...EXAMPLE_PACKED, v: 2 })}`],
    ["unknown city", `#s=${b64url({ ...EXAMPLE_PACKED, c: "<img src=x onerror=alert(1)>" })}`],
    ["schedule with seven blocks", `#s=${b64url({ ...EXAMPLE_PACKED, a: [[[0, 21], [60, 18], [120, 21], [180, 18], [240, 21], [300, 18], [360, 20]], [[420, 21]]] })}`],
    ["temperature out of range", `#s=${b64url({ ...EXAMPLE_PACKED, a: [[[0, 99]], [[0, 21]]] })}`],
    ["unrelated hash", "#main"],
  ] as const) {
    test(`a broken link (${name}) falls back to the landing page without errors`, async ({ page }) => {
      await page.goto(`/${hash}`);
      await expect(page.getByRole("heading", { name: "Setback", level: 1 })).toBeVisible();
      await waitForApp(page);
      await expect(page.getByRole("button", { name: "Try the Waterloo example" })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Steps" })).toHaveCount(0);
      await expect(headline(page)).toHaveCount(0);

      // The page still works: the defaults are intact.
      await page.getByRole("button", { name: "Try the Waterloo example" }).click();
      await expectView(page, "Results");
      await expectExampleResults(page);
    });
  }

  for (const [name, packed, expected] of [
    ["extreme UA and C are clamped", { ...EXAMPLE_PACKED, ua: 1e300, cm: 1e-300 }, /^This schedule/],
    ["furnace efficiency 0 is clamped", { ...EXAMPLE_PACKED, fe: 0 }, /^This schedule cuts/],
    ["tiny heater", { ...EXAMPLE_PACKED, hk: 1e-9 }, /^This schedule/],
    ["duplicate start times", { ...EXAMPLE_PACKED, a: [[[300, 21], [300, 18]], [[420, 21]]] }, /^This schedule/],
    ["negative price is dropped", { ...EXAMPLE_PACKED, p: -3 }, /^This schedule cuts/],
  ] as const) {
    test(`a tampered but decodable link (${name}) renders Results without errors`, async ({ page }) => {
      await page.goto(`/#s=${b64url(packed)}`);
      await expectView(page, "Results");
      await expect(headline(page)).toHaveText(expected);
      await expect(comparisonTable(page)).toBeVisible();
      await expect(page.getByRole("alert").filter({ hasText: "Error" })).toHaveCount(0);
    });
  }

  // DEF-09: the share link accepts more homes than the "Scale it" field allows.
  test("a link cannot carry more homes than the Scale it field accepts (10,000)", async ({ page }) => {
    test.fail(true, "DEF-09: the link decoder clamps homes to 100,000 while the field's limit is 10,000");
    await page.goto(`/#s=${b64url({ ...EXAMPLE_PACKED, n: 1e9 })}`);
    await expectView(page, "Results");
    const homes = scaleSection(page).getByLabel("How many homes like this?");
    await expect(homes).toHaveValue(/^d+$/);
    expect(Number(await homes.inputValue())).toBeLessThanOrEqual(10000);
  });

  test("changing the hash while the app is open loads the shared scenario", async ({ page }) => {
    await gotoLanding(page);
    await page.evaluate((h) => {
      window.location.hash = h;
    }, `s=${b64url(EXAMPLE_PACKED)}`);
    await expectView(page, "Results");
    await expectExampleResults(page);
  });
});
