// Check 2: the manual path through all four steps and the Sources view,
// including Back / Next and the step navigation.

import {
  comparisonTable,
  expect,
  expectView,
  goToSources,
  goToStep,
  gotoLanding,
  headline,
  startOwnPlace,
  test,
  weekdaysEditor,
  weekendEditor,
} from "./helpers";

test.describe("2. Manual path", () => {
  test("step 1 to Results to Sources with edits at every step", async ({ page }) => {
    await startOwnPlace(page);
    await expect(page.getByText("Step 1 of 4")).toBeVisible();

    // --- Step 1: city, home type, heating type, estimates -------------------
    const city = page.getByLabel("City", { exact: true });
    await expect(city).toHaveValue("waterloo");
    await city.selectOption({ label: "Calgary, Alberta" });
    await expect(page.getByText(/Uses hourly outdoor temperatures for Oct 1, 2025 to Apr 30, 2026 and Alberta emission factors\./)).toBeVisible();

    await page.getByRole("radio", { name: /^Townhouse/ }).check();
    await expect(page.getByRole("radio", { name: /^Townhouse/ })).toBeChecked();
    await expect(page.getByRole("radio", { name: /^Apartment/ })).not.toBeChecked();

    await expect(page.getByLabel("Furnace efficiency")).toBeVisible();
    await page.getByRole("radio", { name: /^Heat pump/ }).check();
    await expect(page.getByLabel("Furnace efficiency")).toBeHidden();
    await page.getByRole("radio", { name: /^Electric baseboard/ }).check();
    await expect(page.getByRole("radio", { name: /^Electric baseboard/ })).toBeChecked();
    await expect(page.getByLabel("Furnace efficiency")).toBeHidden();

    const ua = page.getByLabel(/Heat loss, UA \(W\/K\)/);
    await expect(ua).toBeHidden();
    await page.getByText("Adjust the estimates").click();
    await expect(ua).toBeVisible();
    await expect(ua).toHaveValue("145");
    await expect(page.getByLabel(/Thermal mass, C \(MJ\/K\)/)).toHaveValue("15.4");
    await expect(page.getByLabel(/Heater size \(kW\)/)).toHaveValue("");
    await ua.fill("150");
    await expect(ua).toHaveValue("150");

    // A value that cannot be used shows an inline error once the field is left, and is not applied.
    await ua.fill("0");
    await ua.blur();
    await expect(page.getByText("Error: Enter a number from 1 to 5000.")).toBeVisible();
    await expect(ua).toHaveAttribute("aria-invalid", "true");
    await ua.fill("150");
    await ua.blur();
    await expect(page.getByText("Error: Enter a number from 1 to 5000.")).toBeHidden();

    await page.getByRole("button", { name: "Next: Your schedule now" }).click();
    await expectView(page, "Your schedule now");
    await expect(page.getByText("Step 2 of 4")).toBeVisible();

    // --- Step 2: edit a block, add and remove a block, change the routine ---
    const weekdays = weekdaysEditor(page);
    await expect(weekdays.getByText("1 of 6 blocks used.")).toBeVisible();
    await expect(weekdays.getByRole("button", { name: "Remove block 1" })).toBeDisabled();
    await weekdays.getByLabel("Temperature (°C), block 1").fill("21.5");
    await expect(weekdays.getByText("00:00 to 24:00: 21.5 °C.")).toBeVisible();

    await weekdays.getByRole("button", { name: "Add a time block" }).click();
    await expect(weekdays.getByText("2 of 6 blocks used.")).toBeVisible();
    await expect(weekdays.getByLabel("Starts at, block 2")).toHaveValue("12:00");
    await expect(weekdays.getByLabel("Starts at, block 2")).toBeFocused();
    await weekdays.getByLabel("Starts at, block 2").fill("22:30");
    await weekdays.getByLabel("Temperature (°C), block 2").fill("19");
    await expect(weekdays.getByText("22:30 to 24:00: 19 °C")).toBeVisible();

    await weekdays.getByRole("button", { name: "Remove block 2" }).click();
    await expect(weekdays.getByText("1 of 6 blocks used.")).toBeVisible();
    await expect(weekdays.getByText("00:00 to 24:00: 21.5 °C.")).toBeVisible();

    // The weekend editor is independent.
    await expect(weekendEditor(page).getByText("00:00 to 24:00: 22 °C.")).toBeVisible();

    await expect(page.getByText("These times are an illustrative example, not a real user.")).toBeVisible();
    const weekdayRoutine = page.getByRole("group", { name: "Weekday routine (Mon to Fri)" });
    await weekdayRoutine.getByLabel("Wake-up time").fill("06:30");
    await expect(page.getByText("These are the times you entered.")).toBeVisible();
    await expect(page.getByText("These times are an illustrative example, not a real user.")).toBeHidden();
    await weekdayRoutine.getByLabel("Get back at").fill("18:00");
    await expect(weekdayRoutine.getByLabel("Leave home at")).toHaveValue("08:30");

    await page.getByRole("button", { name: "Next: A better schedule" }).click();
    await expectView(page, "A better schedule");
    await expect(page.getByText("Step 3 of 4")).toBeVisible();

    // --- Step 3: suggest, then edit the suggestion -------------------------
    await expect(page.getByText("This is your own schedule. Press Suggest a schedule")).toBeVisible();
    await page.getByRole("button", { name: "Suggest a schedule" }).click();
    await expect(
      page.getByText(/Suggested: 21 °C when you are home and awake, 18 °C when you are asleep or out, and warm-up starts \d+ minutes early/)
    ).toBeVisible();
    const better = weekdaysEditor(page);
    await expect(better.getByText("4 of 6 blocks used.")).toBeVisible();
    await expect(page.getByText(/^Preview: This schedule cuts your simulated heating energy by/)).toBeVisible();

    await better.getByLabel("Temperature (°C), block 1").fill("20.5");
    await expect(page.getByText("This is your own schedule. Press Suggest a schedule")).toBeVisible();
    await expect(page.getByText(/^Suggested:/)).toBeHidden();

    await page.getByRole("button", { name: "Next: Results" }).click();
    await expectView(page, "Results");
    await expect(page.getByText("Step 4 of 4")).toBeVisible();

    // --- Results reflect the choices ---------------------------------------
    await expect(headline(page)).toContainText("This schedule cuts your simulated heating energy by");
    await expect(page.getByRole("main")).toContainText("Simulated for one home (townhouse) in Calgary, Alberta");
    await expect(comparisonTable(page).getByRole("row", { name: /^Heating energy \(electricity\), kWh/ })).toBeVisible();
    await expect(comparisonTable(page).getByRole("row", { name: /^Natural gas/ })).toHaveCount(0);

    // --- Sources and assumptions -------------------------------------------
    await page.getByRole("button", { name: "Next: Sources and assumptions" }).click();
    await expectView(page, "Sources and assumptions");
    const home = page.getByRole("table", { name: "Your home" });
    await expect(home.getByRole("row", { name: /^Heat loss \(UA\)/ })).toContainText("150 W/K");
    await expect(home.getByRole("row", { name: /^Heat loss \(UA\)/ })).toContainText("your input");
    await expect(home.getByRole("row", { name: /^Thermal mass \(C\)/ })).toContainText("15.4 MJ/K");
    await expect(home.getByRole("row", { name: /^Thermal mass \(C\)/ })).toContainText("estimate");
    await expect(page.getByRole("table", { name: "Weather" })).toContainText("Outdoor temperature, Calgary");
    await expect(page.getByRole("table", { name: "Emissions" })).toContainText("Grid electricity, Alberta");
    await expect(page.getByRole("table", { name: "Emissions" })).toContainText("346 g CO2e per kWh used");
    await expect(page.getByRole("table", { name: "Heating system" })).toContainText("Electric baseboard efficiency");

    await page.getByRole("button", { name: "Back: Results" }).click();
    await expectView(page, "Results");
  });

  test("Back and Next walk the steps in order", async ({ page }) => {
    await startOwnPlace(page);
    await page.getByRole("button", { name: "Next: Your schedule now" }).click();
    await expectView(page, "Your schedule now");
    await page.getByRole("button", { name: "Next: A better schedule" }).click();
    await expectView(page, "A better schedule");
    await page.getByRole("button", { name: "Next: Results" }).click();
    await expectView(page, "Results");
    await page.getByRole("button", { name: "Next: Sources and assumptions" }).click();
    await expectView(page, "Sources and assumptions");

    await page.getByRole("button", { name: "Back: Results" }).click();
    await expectView(page, "Results");
    await page.getByRole("button", { name: "Back: A better schedule" }).click();
    await expectView(page, "A better schedule");
    await page.getByRole("button", { name: "Back: Your schedule now" }).click();
    await expectView(page, "Your schedule now");
    await page.getByRole("button", { name: "Back: Your place" }).click();
    await expectView(page, "Your place");
    await page.getByRole("button", { name: "Back: Start page" }).click();
    await expect(page.getByRole("button", { name: "Try the Waterloo example" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Steps" })).toHaveCount(0);
  });

  test("step navigation jumps to any step and marks the current one", async ({ page }) => {
    await startOwnPlace(page);
    const nav = page.getByRole("navigation", { name: "Steps" });
    await expect(nav.getByRole("button", { name: /^Step 1:/ })).toHaveAttribute("aria-current", "step");

    await goToStep(page, 3);
    await expect(nav.getByRole("button", { name: /^Step 3:/ })).toHaveAttribute("aria-current", "step");
    await expect(nav.getByRole("button", { name: /^Step 1:/ })).not.toHaveAttribute("aria-current", /.*/);

    await goToStep(page, 4);
    await expect(nav.getByRole("button", { name: /^Step 4:/ })).toHaveAttribute("aria-current", "step");

    await goToStep(page, 2);
    await expect(nav.getByRole("button", { name: /^Step 2:/ })).toHaveAttribute("aria-current", "step");

    await goToSources(page);
    await expect(nav.getByRole("button", { name: "Sources and assumptions" })).toHaveAttribute("aria-current", "page");
    // Back from Sources returns to the step it was opened from.
    await page.getByRole("button", { name: "Back: Your schedule now" }).click();
    await expectView(page, "Your schedule now");

    await goToStep(page, 1);
    await expect(nav.getByRole("button", { name: /^Step 1:/ })).toHaveAttribute("aria-current", "step");
  });

  test("Sources opens from the landing page and returns to it", async ({ page }) => {
    await gotoLanding(page);
    await page.getByRole("main").getByRole("button", { name: "Sources and assumptions" }).click();
    await expectView(page, "Sources and assumptions");
    await expect(page.getByRole("table", { name: "Your home" })).toBeVisible();
    await page.getByRole("button", { name: "Back: Start page" }).click();
    await expect(page.getByRole("button", { name: "Try the Waterloo example" })).toBeVisible();
  });

  test("schedule editor rejects duplicate start times and out-of-range temperatures", async ({ page }) => {
    await startOwnPlace(page);
    await goToStep(page, 2);
    const weekdays = weekdaysEditor(page);
    await weekdays.getByRole("button", { name: "Add a time block" }).click();
    await weekdays.getByLabel("Starts at, block 2").fill("00:00");
    await weekdays.getByLabel("Temperature (°C), block 2").fill("40");
    await weekdays.getByLabel("Temperature (°C), block 2").blur();
    await expect(weekdays.getByText("Error: Two blocks start at this time. Change one of them.").first()).toBeVisible();
    await expect(weekdays.getByText("Error: Enter a temperature from 5 to 30 °C.")).toBeVisible();
    await expect(weekdays.getByText("Last complete version of this day")).toBeVisible();

    // Up to six blocks per day.
    await weekdays.getByLabel("Starts at, block 2").fill("06:00");
    await weekdays.getByLabel("Temperature (°C), block 2").fill("20");
    for (let i = 0; i < 4; i++) await weekdays.getByRole("button", { name: "Add a time block" }).click();
    await expect(weekdays.getByText("6 of 6 blocks used.")).toBeVisible();
    await expect(weekdays.getByRole("button", { name: "Add a time block" })).toBeDisabled();

    await page.getByRole("button", { name: "Copy weekdays to weekend" }).click();
    await expect(page.getByText("The weekend now uses the same time blocks as weekdays.")).toBeVisible();
    await expect(weekendEditor(page).getByText("6 of 6 blocks used.")).toBeVisible();
  });
});
