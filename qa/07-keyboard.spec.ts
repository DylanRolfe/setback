// Check 8: keyboard-only pass (desktop project). No mouse and no programmatic
// focus: only Tab, Shift+Tab, Enter, Space, arrow keys and typing into fields.
//
// After every Tab the focused element must be a real, visible element inside the
// viewport with a visible focus indicator (an outline or a box shadow).

import type { Locator, Page, TestInfo } from "@playwright/test";
import { expect, expectView, gotoLanding, headline, scaleSection, test, weekdaysEditor } from "./helpers";

declare global {
  interface Window {
    __printCalls: number;
  }
}

interface FocusInfo {
  description: string;
  isBody: boolean;
  visible: boolean;
  inViewport: boolean;
  outline: string;
  hasIndicator: boolean;
}

async function focusInfo(page: Page): Promise<FocusInfo> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body || el === document.documentElement) {
      return { description: "body", isBody: true, visible: false, inViewport: false, outline: "", hasIndicator: false };
    }
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const outlineWidth = parseFloat(cs.outlineWidth) || 0;
    const hasOutline = cs.outlineStyle !== "none" && outlineWidth > 0 && cs.outlineColor !== "rgba(0, 0, 0, 0)";
    const hasShadow = cs.boxShadow !== "none";
    // Chromium puts a fourth tab stop inside every time field: the clock (picker) button. While it has
    // focus the field is still document.activeElement but no longer matches :focus, and the browser
    // draws its own ring around the clock icon. A separate test checks that ring with a screenshot.
    const onPickerButton = el instanceof HTMLInputElement && el.type === "time" && !el.matches(":focus");
    const labelledBy = el.getAttribute("aria-labelledby");
    const label =
      el.getAttribute("aria-label") ||
      (labelledBy ? document.getElementById(labelledBy.split(" ")[0])?.textContent : "") ||
      (el instanceof HTMLInputElement || el instanceof HTMLSelectElement
        ? (el.labels?.[0]?.textContent ?? el.name)
        : el.textContent) ||
      "";
    return {
      description: `${el.tagName.toLowerCase()}${el.getAttribute("type") ? `[${el.getAttribute("type")}]` : ""} "${label.trim().replace(/\s+/g, " ").slice(0, 70)}"${onPickerButton ? " (clock button inside the field)" : ""}`,
      isBody: false,
      visible: r.width > 0 && r.height > 0 && cs.visibility === "visible" && cs.display !== "none" && Number(cs.opacity) > 0,
      inViewport: r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth,
      outline: `${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor}`,
      hasIndicator: hasOutline || hasShadow || onPickerButton,
    };
  });
}

class KeyboardWalk {
  readonly stops: string[] = [];
  constructor(
    private readonly page: Page,
    private readonly testInfo: TestInfo
  ) {}

  /** Check the element that has focus right now. */
  async check(where: string): Promise<FocusInfo> {
    const info = await focusInfo(this.page);
    this.stops.push(`${where}: ${info.description} | outline ${info.outline}`);
    expect.soft(info.isBody, `${where}: focus is on a real element, not lost to <body>`).toBe(false);
    expect.soft(info.visible, `${where}: focused element is visible (${info.description})`).toBe(true);
    expect.soft(info.inViewport, `${where}: focused element is inside the viewport (${info.description})`).toBe(true);
    expect
      .soft(info.hasIndicator, `${where}: focused element has a visible focus indicator (${info.description}; outline ${info.outline})`)
      .toBe(true);
    return info;
  }

  /** Press a key once and check where focus landed. */
  async press(key: string): Promise<FocusInfo> {
    await this.page.keyboard.press(key);
    return this.check(key);
  }

  /** Press Tab (or Shift+Tab) until `target` has focus. Returns the number of presses. */
  async tabTo(target: Locator, name: string, key: "Tab" | "Shift+Tab" = "Tab", max = 80): Promise<number> {
    for (let i = 1; i <= max; i++) {
      await this.page.keyboard.press(key);
      await this.check(`${key} towards "${name}" #${i}`);
      const reached = await target.evaluateAll((els) => els.some((el) => el === document.activeElement));
      if (reached) return i;
    }
    throw new Error(`"${name}" was not reached with ${max} presses of ${key}. Stops:\n${this.stops.join("\n")}`);
  }

  async attach(): Promise<void> {
    await this.testInfo.attach("keyboard-stops.txt", { body: this.stops.join("\n"), contentType: "text/plain" });
  }
}

async function replaceValue(page: Page, text: string): Promise<void> {
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type(text);
}

test.describe("8. Keyboard-only pass", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "The keyboard pass runs in the desktop project only");
    await page.addInitScript(() => {
      window.__printCalls = 0;
      window.print = () => {
        window.__printCalls += 1;
      };
    });
  });

  test("skip link is the first stop and moves focus to the main content", async ({ page }, testInfo) => {
    const walk = new KeyboardWalk(page, testInfo);
    await gotoLanding(page);
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).not.toBeInViewport();

    await walk.press("Tab");
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();

    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();
    // The next Tab lands on the first control inside main, not back in the header.
    await walk.press("Tab");
    await expect(page.getByRole("button", { name: "Try the Waterloo example" })).toBeFocused();

    // On an inner view the skip link jumps past the header and the step navigation.
    await page.keyboard.press("Enter");
    await expectView(page, "Results");
    await walk.tabTo(skip, "Skip to main content", "Shift+Tab", 12);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();
    await walk.press("Tab");
    await expect(page.getByRole("button", { name: "See the assumptions" })).toBeFocused();
    await walk.attach();
  });

  // DEF-02: activating the skip link on Results replaces the share link in the address bar.
  test("using the skip link on Results keeps the share link in the address bar", async ({ page }, testInfo) => {
    const walk = new KeyboardWalk(page, testInfo);
    await gotoLanding(page);
    await walk.tabTo(page.getByRole("button", { name: "Try the Waterloo example" }), "Try the Waterloo example");
    await page.keyboard.press("Enter");
    await expectView(page, "Results");
    await expect.poll(() => page.url(), { timeout: 5000 }).toMatch(/#s=[A-Za-z0-9_-]+$/);

    await walk.tabTo(page.getByRole("link", { name: "Skip to main content" }), "Skip to main content", "Shift+Tab", 12);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();
    await page.waitForTimeout(600);
    expect(page.url(), "address bar after using the skip link").toMatch(/#s=[A-Za-z0-9_-]+$/);
  });

  test("run the example, change the week, scale to 40, reach Print and Copy share link", async ({ page }, testInfo) => {
    const walk = new KeyboardWalk(page, testInfo);
    await gotoLanding(page);

    await walk.tabTo(page.getByRole("button", { name: "Try the Waterloo example" }), "Try the Waterloo example");
    await page.keyboard.press("Enter");
    await expectView(page, "Results");
    await walk.check("Results heading after the view change");
    await expect(headline(page)).toContainText("8.8%");

    // Change the chart week with the arrow keys.
    const week = page.getByLabel("Week to show");
    await walk.tabTo(week, "Week to show");
    const chart = page.getByRole("region", { name: "One week, hour by hour" });
    await expect(chart.locator("figcaption").first()).toContainText("Week of Jan 26, 2026.");
    await page.keyboard.press("ArrowUp");
    await expect(chart.locator("figcaption").first()).toContainText("Week of Jan 19, 2026.");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await expect(chart.locator("figcaption").first()).toContainText("Week of Feb 2, 2026.");
    await expect(week).toBeFocused();

    // Open the data table with the keyboard and reach the scrollable region.
    const summary = page.getByText("Show data table");
    await walk.tabTo(summary, "Show data table");
    await page.keyboard.press("Enter");
    const hourly = page.getByRole("region", { name: "Hourly values for the week of Feb 2, 2026" });
    await expect(hourly).toBeVisible();
    await walk.tabTo(hourly, "Hourly values table region", "Tab", 3);

    // Scale it: 40 homes.
    const homes = scaleSection(page).getByLabel("How many homes like this?");
    await walk.tabTo(homes, "How many homes like this?");
    await replaceValue(page, "40");
    await expect(scaleSection(page)).toContainText("Linear scaling estimate: assumes 40 identical homes and schedules.");
    await expect(homes).toBeFocused();

    // Print this card.
    const print = page.getByRole("button", { name: "Print this card" });
    await walk.tabTo(print, "Print this card");
    await page.keyboard.press("Enter");
    expect(await page.evaluate(() => window.__printCalls)).toBe(1);

    // Copy share link: the very next stop.
    await walk.press("Tab");
    const copy = page.getByRole("button", { name: "Copy share link" });
    await expect(copy).toBeFocused();
    await page.keyboard.press("Space");
    const field = page.getByLabel("Share link");
    await expect(field).toBeVisible();
    await expect(copy).toBeFocused();
    await walk.press("Tab");
    await expect(field).toBeFocused();
    const selection = await field.evaluate((el: HTMLInputElement) => ({
      start: el.selectionStart,
      end: el.selectionEnd,
      length: el.value.length,
    }));
    expect(selection.start).toBe(0);
    expect(selection.end).toBe(selection.length);

    // Shift+Tab walks back the same way.
    await walk.press("Shift+Tab");
    await expect(copy).toBeFocused();
    await walk.press("Shift+Tab");
    await expect(print).toBeFocused();

    // On to the Back / Next buttons at the end of the view.
    await walk.tabTo(page.getByRole("button", { name: "Next: Sources and assumptions" }), "Next: Sources and assumptions");
    await page.keyboard.press("Enter");
    await expectView(page, "Sources and assumptions");
    await walk.check("Sources heading after the view change");
    await walk.attach();
  });

  test("complete the manual path through step 3, adding a schedule block", async ({ page }, testInfo) => {
    const walk = new KeyboardWalk(page, testInfo);
    await gotoLanding(page);

    await walk.tabTo(page.getByRole("button", { name: "Start with my own place" }), "Start with my own place");
    await page.keyboard.press("Enter");
    await expectView(page, "Your place");
    await walk.check("step 1 heading after the view change");

    // City: arrow keys change the value.
    const city = page.getByLabel("City", { exact: true });
    await walk.tabTo(city, "City", "Tab", 3);
    await page.keyboard.press("ArrowDown");
    await expect(city).toHaveValue("toronto");

    // Home type: Tab enters the group on the checked radio, arrows move the choice.
    await walk.press("Tab");
    await expect(page.getByRole("radio", { name: /^Apartment/ })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("radio", { name: /^Townhouse/ })).toBeChecked();
    await expect(page.getByRole("radio", { name: /^Townhouse/ })).toBeFocused();
    await walk.check("Townhouse radio after ArrowDown");

    // Adjust the estimates: open the disclosure and edit UA.
    await walk.press("Tab");
    await expect(page.getByText("Adjust the estimates")).toBeFocused();
    const ua = page.getByLabel(/Heat loss, UA \(W\/K\)/);
    await expect(ua).toBeHidden();
    await page.keyboard.press("Enter");
    await expect(ua).toBeVisible();
    await walk.press("Tab");
    await expect(ua).toBeFocused();
    await replaceValue(page, "150");
    await expect(ua).toHaveValue("150");

    // Heating type.
    const gas = page.getByRole("radio", { name: /^Gas furnace/ });
    await walk.tabTo(gas, "Gas furnace", "Tab", 6);
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: /^Electric baseboard/ })).toBeChecked();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: /^Heat pump/ })).toBeChecked();
    await expect(page.getByText(/Natural Resources Canada says about heat pumps:/)).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(gas).toBeChecked();
    await walk.check("Gas furnace radio after arrow keys");

    await walk.tabTo(page.getByRole("button", { name: "Next: Your schedule now" }), "Next: Your schedule now", "Tab", 6);
    await page.keyboard.press("Enter");
    await expectView(page, "Your schedule now");
    await walk.check("step 2 heading after the view change");

    // Step 2: add a time block; focus moves to the new block's start time.
    const weekdays = weekdaysEditor(page);
    await walk.tabTo(weekdays.getByRole("button", { name: "Add a time block" }), "Add a time block (weekdays)", "Tab", 12);
    await page.keyboard.press("Enter");
    await expect(weekdays.getByText("2 of 6 blocks used.")).toBeVisible();
    const newStart = weekdays.getByLabel("Starts at, block 2");
    await expect(newStart).toBeFocused();
    await walk.check("new block start time after Add a time block");
    await expect(newStart).toHaveValue("12:00");
    await page.keyboard.press("ArrowUp");
    await expect(newStart).toHaveValue("13:00");

    const newTemp = weekdays.getByLabel("Temperature (°C), block 2");
    await walk.tabTo(newTemp, "Temperature, block 2", "Tab", 5);
    await replaceValue(page, "19");
    await expect(weekdays.getByText("13:00 to 24:00: 19 °C")).toBeVisible();

    // Remove it again with the keyboard: focus must not be lost.
    await walk.press("Tab");
    await expect(weekdays.getByRole("button", { name: "Remove block 2" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(weekdays.getByText("1 of 6 blocks used.")).toBeVisible();
    await walk.check("after removing block 2");
    await expect(weekdays.getByRole("button", { name: "Add a time block" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(weekdays.getByText("2 of 6 blocks used.")).toBeVisible();

    // The routine checkbox toggles with Space.
    const out = page.getByRole("checkbox", { name: "I am out on weekdays" });
    await walk.tabTo(out, "I am out on weekdays", "Tab", 30);
    await page.keyboard.press("Space");
    await expect(out).not.toBeChecked();
    await expect(page.getByLabel("Leave home at")).toBeHidden();
    await page.keyboard.press("Space");
    await expect(out).toBeChecked();

    await walk.tabTo(page.getByRole("button", { name: "Next: A better schedule" }), "Next: A better schedule", "Tab", 20);
    await page.keyboard.press("Enter");
    await expectView(page, "A better schedule");
    await walk.check("step 3 heading after the view change");

    // Step 3: suggest, then add a block to the suggestion.
    await walk.press("Tab");
    await expect(page.getByRole("button", { name: "Suggest a schedule" })).toBeFocused();
    await page.keyboard.press("Space");
    await expect(page.getByText(/^Suggested:/)).toBeVisible();
    const better = weekdaysEditor(page);
    await expect(better.getByText("4 of 6 blocks used.")).toBeVisible();
    await walk.tabTo(better.getByRole("button", { name: "Add a time block" }), "Add a time block (step 3 weekdays)", "Tab", 40);
    await page.keyboard.press("Space");
    await expect(better.getByText("5 of 6 blocks used.")).toBeVisible();
    const focused = await walk.check("new block start time in step 3");
    expect(focused.description).toMatch(/^input\[time\] "Starts at, block \d"/);

    await walk.tabTo(page.getByRole("button", { name: "Next: Results" }), "Next: Results", "Tab", 60);
    await page.keyboard.press("Enter");
    await expectView(page, "Results");
    await walk.check("Results heading after the view change");
    await expect(headline(page)).toBeVisible();
    await walk.attach();
  });

  test("the clock button inside a time field shows a focus ring of its own", async ({ page }, testInfo) => {
    const walk = new KeyboardWalk(page, testInfo);
    await gotoLanding(page);
    await walk.tabTo(page.getByRole("button", { name: "Start with my own place" }), "Start with my own place");
    await page.keyboard.press("Enter");
    await expectView(page, "Your place");
    await walk.tabTo(page.getByRole("button", { name: "Next: Your schedule now" }), "Next: Your schedule now", "Tab", 12);
    await page.keyboard.press("Enter");
    await expectView(page, "Your schedule now");

    const start = weekdaysEditor(page).getByLabel("Starts at, block 1");
    const unfocused = await start.screenshot();
    // Hours, minutes, AM/PM, then the clock button.
    for (let i = 0; i < 3; i++) {
      await walk.press("Tab");
      await expect(start).toBeFocused();
    }
    const onSegment = await start.screenshot();
    const last = await walk.press("Tab");
    expect(last.description).toContain("(clock button inside the field)");
    const onClock = await start.screenshot();
    await testInfo.attach("time-field-clock-button-focused.png", { body: onClock, contentType: "image/png" });
    expect(onClock.equals(unfocused), "the field looks different while the clock button has focus").toBe(false);
    expect(onClock.equals(onSegment), "the clock-button ring differs from the text-segment state").toBe(false);
    // One more Tab leaves the field.
    await walk.press("Tab");
    await expect(weekdaysEditor(page).getByLabel("Temperature (°C), block 1")).toBeFocused();
    await walk.attach();
  });

  test("step navigation works with the keyboard and shows the current step", async ({ page }, testInfo) => {
    const walk = new KeyboardWalk(page, testInfo);
    await gotoLanding(page);
    await walk.tabTo(page.getByRole("button", { name: "Start with my own place" }), "Start with my own place");
    await page.keyboard.press("Enter");
    await expectView(page, "Your place");

    const nav = page.getByRole("navigation", { name: "Steps" });
    await walk.tabTo(nav.getByRole("button", { name: /^Step 3:/ }), "Step 3", "Shift+Tab", 6);
    await page.keyboard.press("Enter");
    await expectView(page, "A better schedule");
    await expect(nav.getByRole("button", { name: /^Step 3:/ })).toHaveAttribute("aria-current", "step");

    await walk.tabTo(nav.getByRole("button", { name: "Sources and assumptions" }), "Sources and assumptions", "Shift+Tab", 6);
    await page.keyboard.press("Space");
    await expectView(page, "Sources and assumptions");
    await walk.attach();
  });
});
