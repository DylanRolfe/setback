// Check 3: honesty rules that must be visible in the UI (docs/PLAN.md section 2).

import {
  comparisonTable,
  expect,
  expectView,
  goToSources,
  goToStep,
  gotoLanding,
  headline,
  NRCAN_HEAT_PUMP_URL,
  NRCAN_KEEPING_HEAT_URL,
  NRCAN_QUOTE,
  openExample,
  parseNumber,
  rowCells,
  startOwnPlace,
  test,
  weekdaysEditor,
} from "./helpers";

const FLOOR_QUOTE =
  "In general, it is best not to reduce the temperature lower than 17°C (63°F), as there is a risk of moisture build-up in the exterior walls.";
const HEAT_PUMP_QUOTE = "Moderated setbacks of not more than 2°C should be employed";

test.describe("3. Honesty checks", () => {
  test("UA, C and heater size are labeled as estimates in step 1", async ({ page }) => {
    await startOwnPlace(page);
    await expect(page.getByText("The home numbers are estimates, not measurements, and you can change them.")).toBeVisible();
    // Each home type shows its UA and C with the word "estimates".
    await expect(page.getByRole("radio", { name: /^Apartment.*UA 80 W\/K, C 11\.6 MJ\/K \(estimates\)/ })).toBeVisible();
    await expect(page.getByRole("radio", { name: /^Townhouse.*UA 145 W\/K, C 15\.4 MJ\/K \(estimates\)/ })).toBeVisible();
    await expect(page.getByRole("radio", { name: /^Detached house.*UA 220 W\/K, C 19\.8 MJ\/K \(estimates\)/ })).toBeVisible();

    await page.getByText("Adjust the estimates").click();
    // The "estimate" badge is part of each label.
    await expect(page.getByLabel(/^Heat loss, UA \(W\/K\)\s*estimate$/)).toBeVisible();
    await expect(page.getByLabel(/^Thermal mass, C \(MJ\/K\)\s*estimate$/)).toBeVisible();
    await expect(page.getByLabel(/^Heater size \(kW\)\s*estimate$/)).toBeVisible();
    await expect(page.getByText(/Leave blank for the automatic estimate: 5\.8 kW for this home and city\./)).toBeVisible();
  });

  test("UA, C and heater size are labeled as estimates on Sources and on Results", async ({ page }) => {
    await openExample(page);
    await expect(page.getByRole("region", { name: "One week, hour by hour" })).toContainText(
      "The heater size is 5.8 kW (estimate)."
    );
    await goToSources(page);
    const home = page.getByRole("table", { name: "Your home" });
    for (const [row, value] of [
      [/^Heat loss \(UA\)/, "80 W/K"],
      [/^Thermal mass \(C\)/, "11.6 MJ/K"],
      [/^Heater size/, "5.8 kW"],
    ] as const) {
      const cells = home.getByRole("row", { name: row }).getByRole("cell");
      await expect(cells.nth(0)).toHaveText(value);
      await expect(cells.nth(1)).toHaveText("estimate");
    }
  });

  test("results wording says simulated, not measured", async ({ page }) => {
    await openExample(page);
    await expect(headline(page)).toContainText("simulated heating energy");
    await expect(headline(page)).toContainText("under these assumptions");
    const main = page.getByRole("main");
    await expect(main).toContainText("This is a simulation, not a measurement of your home.");
    await expect(main).toContainText("All values are simulated heating energy under these assumptions.");
    await expect(comparisonTable(page)).toContainText("One simulated heating season");
    await expect(main).not.toContainText(/you (will|would) save/i);
    await expect(main).not.toContainText(/measured saving[s]? of/i);
    await goToSources(page);
    await expect(page.getByRole("main")).toContainText(
      "Results are simulations under these assumptions, not measured savings."
    );
    await expect(page.getByRole("main")).toContainText("These are simulations, not measured savings. Nobody's meter was read.");
  });

  test("the NRCan quote is character-exact and linked to its source", async ({ page }) => {
    await openExample(page);
    for (const view of ["Results", "Sources and assumptions"] as const) {
      if (view === "Sources and assumptions") await goToSources(page);
      const sanity = page.getByRole("region", { name: "Sanity check", exact: true });
      const quote = sanity.getByRole("blockquote");
      await expect(quote, `${view}: exactly one NRCan quote`).toHaveCount(1);
      const text = (await quote.innerText()).trim();
      expect(text, `${view}: quote text`).toBe(`“${NRCAN_QUOTE}”`);
      const link = sanity.getByRole("link", { name: /Keeping the Heat In, section 9\.1\.2, Thermostats/ });
      await expect(link).toHaveAttribute("href", NRCAN_KEEPING_HEAT_URL);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", /noopener/);
    }
  });

  test("the footer credits Open-Meteo with CC BY 4.0 and discloses AI assistance on every view", async ({ page }) => {
    await gotoLanding(page);
    const footer = page.getByRole("contentinfo");
    const check = async (where: string) => {
      await expect(footer, where).toBeVisible();
      await expect(footer.getByRole("link", { name: /Weather data by Open-Meteo\.com/ }), where).toHaveAttribute(
        "href",
        "https://open-meteo.com/"
      );
      await expect(footer.getByRole("link", { name: /CC BY 4\.0/ }), where).toHaveAttribute(
        "href",
        "https://creativecommons.org/licenses/by/4.0/"
      );
      await expect(footer, where).toContainText("Built by Dylan Rolfe with an AI coding agent.");
      await expect(footer, where).toContainText("Simulation, not measured savings.");
    };
    await check("landing");
    await page.getByRole("button", { name: "Start with my own place" }).click();
    await expectView(page, "Your place");
    await check("step 1");
    await goToStep(page, 2);
    await check("step 2");
    await goToStep(page, 3);
    await check("step 3");
    await goToStep(page, 4);
    await check("results");
    await goToSources(page);
    await check("sources");
  });

  test("a schedule equal to the current one says it does not save energy", async ({ page }) => {
    await startOwnPlace(page);
    await goToStep(page, 3);
    await expect(page.getByText("This schedule is the same as your current one, so it saves nothing yet.")).toBeVisible();
    await expect(page.getByText("Preview: This schedule does not save energy compared with your current one.")).toBeVisible();
    await goToStep(page, 4);
    await expect(headline(page)).toHaveText("This schedule does not save energy compared with your current one.");
    await expect(page.getByText("The better schedule is the same as your current one.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Go to step 3 to try a better schedule" })).toBeVisible();
    // Nothing is claimed as saved.
    await expect(rowCells(page, /^Heating energy, kWh/).nth(2)).toHaveText("0");
    await expect(rowCells(page, /^Natural gas, m³/).nth(2)).toHaveText("0");
    await expect(rowCells(page, /^Emissions, kg CO2e/).nth(2)).toHaveText("0");
  });

  test("a warmer schedule says it uses more energy", async ({ page }) => {
    await startOwnPlace(page);
    await goToStep(page, 3);
    await weekdaysEditor(page).getByLabel("Temperature (°C), block 1").fill("24");
    await expect(page.getByText(/^Preview: This schedule uses [\d.]+% more simulated heating energy than your current one/)).toBeVisible();
    await goToStep(page, 4);
    await expect(headline(page)).toHaveText(
      /^This schedule uses [\d.]+% more simulated heating energy than your current one \(about [\d,.]+ kg CO2e more this season\) under these assumptions\.$/
    );
    await expect(
      page.getByText("The second schedule keeps the home warmer overall than your current one, so it uses more energy.")
    ).toBeVisible();
    await expect(rowCells(page, /^Heating energy, kWh/).nth(2)).toHaveText(/^[\d,]+ more$/);
    await expect(rowCells(page, /^Emissions, kg CO2e/).nth(2)).toHaveText(/^[\d,.]+ more$/);
    // The headline never says "cuts" or "saves" here.
    await expect(headline(page)).not.toContainText(/cuts|saves/);
  });

  test("cost is absent until a price is typed, then present and consistent", async ({ page }) => {
    await openExample(page);
    const main = page.getByRole("main");
    await expect(comparisonTable(page).getByRole("row", { name: /^Cost at your price/ })).toHaveCount(0);
    await expect(main).not.toContainText("$");
    await expect(main).toContainText("Cost is shown only when you type a price.");

    const price = page.getByLabel("Your energy price (optional), in cents per cubic metre of gas");
    await expect(price).toHaveValue("");
    await price.fill("50");
    const cost = rowCells(page, /^Cost at your price/);
    await expect(cost).toHaveCount(3);
    const [before, after, saved] = (await cost.allInnerTexts()).map(parseNumber);
    // 879 / 801 / 78 cubic metres at $0.50, each within the rounding of the displayed volume.
    expect(Math.abs(before - 879 * 0.5)).toBeLessThanOrEqual(0.26);
    expect(Math.abs(after - 801 * 0.5)).toBeLessThanOrEqual(0.26);
    expect(Math.abs(saved - 78 * 0.5)).toBeLessThanOrEqual(0.26);
    await expect(cost.nth(0)).toHaveText(/^\$[\d,]+\.\d\d$/);

    await price.fill("");
    await expect(comparisonTable(page).getByRole("row", { name: /^Cost at your price/ })).toHaveCount(0);
    await expect(main).not.toContainText("$");
  });

  test("heat pump shows the NRCan heat pump caution", async ({ page }) => {
    await startOwnPlace(page);
    await expect(page.getByText(HEAT_PUMP_QUOTE)).toHaveCount(0);
    await page.getByRole("radio", { name: /^Heat pump/ }).check();
    const caution = page.getByText(/Natural Resources Canada says about heat pumps:/);
    await expect(caution).toBeVisible();
    await expect(caution).toContainText(`“${HEAT_PUMP_QUOTE}”`);
    await expect(caution.getByRole("link", { name: /Heating and cooling with a heat pump/ })).toHaveAttribute(
      "href",
      NRCAN_HEAT_PUMP_URL
    );
    await expect(page.getByText("Savings from a bigger setback may be overstated.")).toBeVisible();

    // A setback larger than 2 °C in step 3 repeats the caution.
    await goToStep(page, 3);
    await weekdaysEditor(page).getByRole("button", { name: "Add a time block" }).click();
    await weekdaysEditor(page).getByLabel("Temperature (°C), block 2").fill("18");
    const stepCaution = page.getByText(/^Caution for heat pumps: this schedule changes by/);
    await expect(stepCaution).toBeVisible();
    await expect(stepCaution).toContainText("this schedule changes by 4 °C");
    await expect(stepCaution).toContainText(`“${HEAT_PUMP_QUOTE}”`);

    // The suggestion for a heat pump stays inside the 2 °C advice.
    await page.getByRole("button", { name: "Suggest a schedule" }).click();
    await expect(page.getByText(/Suggested: 21 °C when you are home and awake, 19 °C when you are asleep or out/)).toBeVisible();
    await expect(stepCaution).toBeHidden();
  });

  test("a setpoint below 17 °C shows the NRCan 17 °C warning", async ({ page }) => {
    await startOwnPlace(page);
    await goToStep(page, 3);
    await expect(page.getByText(/^Warning:/)).toHaveCount(0);
    await weekdaysEditor(page).getByLabel("Temperature (°C), block 1").fill("17");
    await expect(page.getByText(/^Warning:/)).toHaveCount(0);
    await weekdaysEditor(page).getByLabel("Temperature (°C), block 1").fill("16.5");
    const warning = page.getByText(/^Warning: this schedule goes down to 16\.5 °C\./);
    await expect(warning).toBeVisible();
    await expect(warning).toContainText(`“${FLOOR_QUOTE}”`);
    await expect(warning.getByRole("link", { name: /Keeping the Heat In/ })).toHaveAttribute(
      "href",
      NRCAN_KEEPING_HEAT_URL
    );
  });

  // DEF-01: the cautions shown in step 3 are not repeated where the schedule is handed over.
  test("Results repeats the 17 °C warning next to a schedule that goes below 17 °C", async ({ page }) => {
    await openExample(page);
    await goToStep(page, 3);
    await weekdaysEditor(page).getByLabel("Temperature (°C), block 2").fill("15");
    await expect(page.getByText(/^Warning: this schedule goes down to 15 °C\./)).toBeVisible();
    await goToStep(page, 4);
    await expect(page.getByRole("region", { name: "Program this tonight" })).toContainText("8:30 AM: 15 °C");
    await expect(page.getByRole("main")).toContainText("17°C", { timeout: 3000 });
  });

  test("the example routine is labeled as illustrative", async ({ page }) => {
    await gotoLanding(page);
    await expect(page.getByRole("main")).toContainText("The example uses an illustrative routine, not a real user.");
    await page.getByRole("button", { name: "Start with my own place" }).click();
    await expectView(page, "Your place");
    await goToStep(page, 2);
    await expect(page.getByText("illustrative example", { exact: true })).toBeVisible();
    await expect(page.getByText("These times are an illustrative example, not a real user.")).toBeVisible();
  });
});
