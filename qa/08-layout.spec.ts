// Check 9: layout. No horizontal page scroll on any view (the 320 px "narrow"
// project is the hard case), touch targets at least 44 px high on the small-screen
// projects, and chart text that is not clipped or overlapping.

import type { Page } from "@playwright/test";
import {
  expect,
  expectNoHorizontalScroll,
  expectView,
  goToSources,
  goToStep,
  gotoLanding,
  openExample,
  startOwnPlace,
  test,
  weekdaysEditor,
} from "./helpers";

interface SmallControl {
  what: string;
  height: number;
  width: number;
}

interface TargetReport {
  /** Buttons, fields, selects, summaries, radios and checkboxes (measured on their label) under 44 px high. */
  controls: SmallControl[];
  /** Text links under 44 px high. Reported, not failed: links inside a sentence are exempt in WCAG 2.5.8. */
  links: SmallControl[];
  checked: number;
}

/** Measure every visible interactive control on the page. */
async function measureTargets(page: Page): Promise<TargetReport> {
  return page.evaluate(() => {
    const MIN = 44;
    const report: { controls: SmallControl[]; links: SmallControl[]; checked: number } = {
      controls: [],
      links: [],
      checked: 0,
    };
    const describe = (el: Element) => {
      const text =
        el.getAttribute("aria-label") ||
        (el instanceof HTMLInputElement || el instanceof HTMLSelectElement ? el.labels?.[0]?.textContent : null) ||
        el.textContent ||
        "";
      return `${el.tagName.toLowerCase()} "${text.trim().replace(/\s+/g, " ").slice(0, 60)}"`;
    };
    const elements = Array.from(document.querySelectorAll("button, a[href], input, select, textarea, summary"));
    for (const el of elements) {
      if (!(el instanceof HTMLElement) || !el.checkVisibility()) continue;
      let box = el.getBoundingClientRect();
      if (el instanceof HTMLInputElement && (el.type === "radio" || el.type === "checkbox")) {
        // The whole label row is the tap target for a radio or checkbox.
        const label = el.closest("label");
        if (label) box = label.getBoundingClientRect();
      }
      if (box.width === 0 || box.height === 0) continue;
      // The skip link is off-screen until it has focus.
      if (box.bottom < 0) continue;
      report.checked += 1;
      if (box.height >= MIN - 0.5) continue;
      const entry = { what: describe(el), height: Math.round(box.height * 10) / 10, width: Math.round(box.width) };
      if (el.tagName === "A") report.links.push(entry);
      else report.controls.push(entry);
    }
    return report;
  });
}

interface ChartTextReport {
  svgs: number;
  texts: number;
  clipped: string[];
  overlapping: string[];
}

/** Every <text> of every SVG must lie inside its SVG box and must not overlap another label. */
async function measureChartText(page: Page): Promise<ChartTextReport> {
  return page.evaluate(() => {
    const report: { svgs: number; texts: number; clipped: string[]; overlapping: string[] } = {
      svgs: 0,
      texts: 0,
      clipped: [],
      overlapping: [],
    };
    for (const svg of Array.from(document.querySelectorAll("main svg"))) {
      if (!(svg instanceof SVGSVGElement) || !svg.checkVisibility()) continue;
      const frame = svg.getBoundingClientRect();
      if (frame.width === 0) continue;
      report.svgs += 1;
      const boxes: { label: string; r: DOMRect }[] = [];
      for (const t of Array.from(svg.querySelectorAll("text"))) {
        const r = t.getBoundingClientRect();
        const label = (t.textContent ?? "").trim();
        if (r.width === 0 || label === "") continue;
        report.texts += 1;
        boxes.push({ label, r });
        const tolerance = 1;
        if (
          r.left < frame.left - tolerance ||
          r.right > frame.right + tolerance ||
          r.top < frame.top - tolerance ||
          r.bottom > frame.bottom + tolerance
        ) {
          report.clipped.push(
            `"${label}" box ${Math.round(r.left)}..${Math.round(r.right)} x ${Math.round(r.top)}..${Math.round(r.bottom)} outside svg ${Math.round(frame.left)}..${Math.round(frame.right)} x ${Math.round(frame.top)}..${Math.round(frame.bottom)}`
          );
        }
      }
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i].r;
          const b = boxes[j].r;
          const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          // More than a 2 px sliver in both directions counts as overlapping labels.
          if (w > 2 && h > 2) report.overlapping.push(`"${boxes[i].label}" overlaps "${boxes[j].label}" by ${Math.round(w)}x${Math.round(h)} px`);
        }
      }
    }
    return report;
  });
}

async function expectTargets(page: Page, where: string, sink: string[]): Promise<void> {
  const report = await measureTargets(page);
  expect(report.checked, `${where}: controls were measured`).toBeGreaterThan(0);
  for (const link of report.links) sink.push(`${where}: link ${link.what} is ${link.height} px high`);
  expect
    .soft(
      report.controls.map((c) => `${c.what} is ${c.height} px high`),
      `${where}: controls under 44 px high`
    )
    .toEqual([]);
}

async function expectChartText(page: Page, where: string, minSvgs: number): Promise<void> {
  const report = await measureChartText(page);
  expect(report.svgs, `${where}: number of charts`).toBeGreaterThanOrEqual(minSvgs);
  expect(report.texts, `${where}: chart labels found`).toBeGreaterThan(0);
  expect.soft(report.clipped, `${where}: chart text outside its chart`).toEqual([]);
  expect.soft(report.overlapping, `${where}: overlapping chart labels`).toEqual([]);
}

test.describe("9. Layout", () => {
  test("no horizontal page scroll on any view", async ({ page }) => {
    await gotoLanding(page);
    await expectNoHorizontalScroll(page, "landing");

    await page.getByRole("button", { name: "Start with my own place" }).click();
    await expectView(page, "Your place");
    await expectNoHorizontalScroll(page, "step 1");
    await page.getByText("Adjust the estimates").click();
    await page.getByRole("radio", { name: /^Heat pump/ }).check();
    await expectNoHorizontalScroll(page, "step 1, estimates open, heat pump caution");
    await page.getByRole("radio", { name: /^Gas furnace/ }).check();

    await goToStep(page, 2);
    await expectNoHorizontalScroll(page, "step 2");
    const weekdays = weekdaysEditor(page);
    for (let i = 0; i < 5; i++) await weekdays.getByRole("button", { name: "Add a time block" }).click();
    await weekdays.getByLabel("Temperature (°C), block 2").fill("99");
    await weekdays.getByLabel("Temperature (°C), block 2").blur();
    await expect(weekdays.getByText("Error: Enter a temperature from 5 to 30 °C.")).toBeVisible();
    await expectNoHorizontalScroll(page, "step 2, six blocks and an error");
    await weekdays.getByLabel("Temperature (°C), block 2").fill("20");

    await goToStep(page, 3);
    await page.getByRole("button", { name: "Suggest a schedule" }).click();
    await expect(page.getByText(/^Suggested:/)).toBeVisible();
    await weekdaysEditor(page).getByLabel("Temperature (°C), block 2").fill("15");
    await expect(page.getByText(/^Warning: this schedule goes down to 15 °C\./)).toBeVisible();
    await expectNoHorizontalScroll(page, "step 3, suggested, 17 °C warning");

    await goToStep(page, 4);
    await expectNoHorizontalScroll(page, "results");
    await page.getByText("Show data table").click();
    await expect(page.getByRole("table", { name: /Hourly simulated values/ })).toBeVisible();
    await page.getByLabel("How many homes like this?").fill("10000");
    await page.getByLabel(/^Your energy price/).fill("999.99");
    await page.getByRole("button", { name: "Copy share link" }).click();
    await expect(page.getByLabel("Share link")).toBeVisible();
    await expectNoHorizontalScroll(page, "results, data table open, 10,000 homes, price, share link");

    await goToSources(page);
    await expectNoHorizontalScroll(page, "sources");
  });

  test("wide tables scroll inside their own box and can be reached by keyboard", async ({ page }) => {
    await openExample(page);
    await goToSources(page);
    const regions = page.getByRole("region", { name: /^Assumptions: / });
    // Weather, Your home, Heating system, Emissions, Schedules and routine, Suggested schedule, Sanity check.
    await expect(regions).toHaveCount(7);
    for (const region of await regions.all()) {
      await expect(region).toHaveAttribute("tabindex", "0");
      const fits = await region.evaluate((el) => el.getBoundingClientRect().right <= document.documentElement.clientWidth + 0.5);
      expect(fits, "assumption table box stays inside the viewport").toBe(true);
    }
  });

  test("touch targets are at least 44 px high", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "desktop", "Touch target size is checked in the mobile and narrow projects");
    const links: string[] = [];

    await gotoLanding(page);
    await expectTargets(page, "landing", links);

    await page.getByRole("button", { name: "Start with my own place" }).click();
    await expectView(page, "Your place");
    await page.getByText("Adjust the estimates").click();
    await expectTargets(page, "step 1", links);

    await goToStep(page, 2);
    await weekdaysEditor(page).getByRole("button", { name: "Add a time block" }).click();
    await expectTargets(page, "step 2", links);

    await goToStep(page, 3);
    await page.getByRole("button", { name: "Suggest a schedule" }).click();
    await expect(page.getByText(/^Suggested:/)).toBeVisible();
    await expectTargets(page, "step 3", links);

    await goToStep(page, 4);
    await page.getByRole("button", { name: "Copy share link" }).click();
    await expect(page.getByLabel("Share link")).toBeVisible();
    await expectTargets(page, "results", links);

    await goToSources(page);
    await expectTargets(page, "sources", links);

    // Exceptions, reported in docs/QA.md: text links are shorter than 44 px.
    await testInfo.attach("links-under-44px.txt", { body: links.join("\n"), contentType: "text/plain" });
    testInfo.annotations.push({ type: "links under 44 px", description: `${links.length} text links (see attachment)` });
  });

  test("schedule day bars: text is not clipped and labels do not overlap", async ({ page }) => {
    await startOwnPlace(page);
    await goToStep(page, 2);
    await expectChartText(page, "step 2 day bars, one block", 2);
    const weekdays = weekdaysEditor(page);
    for (let i = 0; i < 5; i++) await weekdays.getByRole("button", { name: "Add a time block" }).click();
    await expect(weekdays.getByText("6 of 6 blocks used.")).toBeVisible();
    await expectChartText(page, "step 2 day bars, six blocks", 2);

    await goToStep(page, 3);
    await page.getByRole("button", { name: "Suggest a schedule" }).click();
    await expect(page.getByText(/^Suggested:/)).toBeVisible();
    await expectChartText(page, "step 3 day bars, suggested schedule", 2);
  });

  test("week charts: text is not clipped and labels do not overlap, for every week", async ({ page }) => {
    await openExample(page);
    await expectChartText(page, "results, coldest week", 2);
    const week = page.getByLabel("Week to show");
    const count = await week.locator("option").count();
    expect(count).toBe(29);
    // Every week of the season: axis ranges and label positions change with the data.
    for (let i = 0; i < count; i++) {
      await week.selectOption({ index: i });
      await expectChartText(page, `results, week option ${i + 1}`, 2);
    }
  });

  test("charts keep a readable size", async ({ page }) => {
    await openExample(page);
    const chart = page.getByRole("region", { name: "One week, hour by hour" });
    for (const name of [/Simulated indoor temperature and outdoor temperature/, /Simulated heat delivered each hour/]) {
      const svg = chart.getByRole("img", { name });
      const box = await svg.boundingBox();
      expect(box, "chart is rendered").not.toBeNull();
      if (!box) continue;
      const viewport = page.viewportSize();
      expect(box.width).toBeGreaterThanOrEqual(240);
      expect(box.x + box.width).toBeLessThanOrEqual((viewport?.width ?? 0) + 0.5);
      // Chart text is drawn 1:1 with CSS pixels, so its smallest label stays legible.
      const smallest = await svg.evaluate((el) =>
        Math.min(...Array.from(el.querySelectorAll("text")).map((t) => t.getBoundingClientRect().height))
      );
      expect(smallest, "smallest chart label height in CSS px").toBeGreaterThanOrEqual(10);
    }
  });
});
