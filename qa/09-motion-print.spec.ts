// Check 10 (prefers-reduced-motion) and check 11 (print).

import type { Page } from "@playwright/test";
import {
  actionCard,
  EXAMPLE,
  expect,
  expectView,
  goToSources,
  goToStep,
  gotoLanding,
  openExample,
  test,
} from "./helpers";

declare global {
  interface Window {
    __printCalls: number;
  }
}

interface MotionReport {
  /** CSS animations or transitions that are running or pending right now. */
  running: string[];
  /** Elements whose computed animation or transition could last longer than 10 ms. */
  slow: string[];
  /** Computed scroll-behavior values other than "auto". */
  smooth: string[];
  matchesReduce: boolean;
}

async function measureMotion(page: Page): Promise<MotionReport> {
  return page.evaluate(() => {
    const toMs = (value: string) =>
      Math.max(0, ...value.split(",").map((v) => (v.trim().endsWith("ms") ? parseFloat(v) : parseFloat(v) * 1000) || 0));
    const report: { running: string[]; slow: string[]; smooth: string[]; matchesReduce: boolean } = {
      running: [],
      slow: [],
      smooth: [],
      matchesReduce: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    };
    for (const a of document.getAnimations()) {
      const timing = a.effect?.getComputedTiming();
      const duration = typeof timing?.duration === "number" ? timing.duration : 0;
      if ((a.playState === "running" || a.pending) && duration > 10) {
        const target = a.effect instanceof KeyframeEffect ? a.effect.target : null;
        report.running.push(`${a.constructor.name} ${Math.round(duration)}ms on ${target?.tagName ?? "?"}.${target?.className ?? ""}`);
      }
    }
    const nodes: Element[] = [document.documentElement, ...Array.from(document.querySelectorAll("*"))];
    for (const el of nodes) {
      for (const pseudo of [null, "::before", "::after"]) {
        const cs = getComputedStyle(el, pseudo);
        const name = `${el.tagName.toLowerCase()}.${String(el.className)}${pseudo ?? ""}`;
        if (cs.animationName !== "none" && toMs(cs.animationDuration) > 10) {
          report.slow.push(`${name} animation ${cs.animationName} ${cs.animationDuration}`);
        }
        if (toMs(cs.transitionDuration) > 10) {
          report.slow.push(`${name} transition ${cs.transitionProperty} ${cs.transitionDuration}`);
        }
        if (pseudo === null && cs.scrollBehavior !== "auto") report.smooth.push(`${name} scroll-behavior ${cs.scrollBehavior}`);
      }
    }
    return report;
  });
}

async function expectStill(page: Page, where: string): Promise<void> {
  const report = await measureMotion(page);
  expect(report.matchesReduce, `${where}: the page sees prefers-reduced-motion: reduce`).toBe(true);
  expect.soft(report.running, `${where}: running animations or transitions`).toEqual([]);
  expect.soft(report.slow, `${where}: elements with an animation or transition longer than 10 ms`).toEqual([]);
  expect.soft(report.smooth, `${where}: smooth scrolling`).toEqual([]);
}

test.describe("10. prefers-reduced-motion: reduce", () => {
  test.use({ reducedMotion: "reduce" });

  test("no animations, no transitions and no smooth scrolling on any view", async ({ page }) => {
    await gotoLanding(page);
    await expectStill(page, "landing");

    await page.getByRole("button", { name: "Start with my own place" }).click();
    await expectView(page, "Your place");
    await page.getByText("Adjust the estimates").click();
    await page.getByRole("button", { name: "Next: Your schedule now" }).hover();
    await expectStill(page, "step 1");

    await goToStep(page, 2);
    await page.getByRole("button", { name: "Add a time block" }).first().click();
    await expectStill(page, "step 2");

    await goToStep(page, 3);
    await page.getByRole("button", { name: "Suggest a schedule" }).click();
    await expect(page.getByText(/^Suggested:/)).toBeVisible();
    await expectStill(page, "step 3");

    await goToStep(page, 4);
    await page.getByText("Show data table").click();
    await page.getByLabel("Week to show").selectOption({ index: 3 });
    await page.getByLabel("How many homes like this?").fill("40");
    await expectStill(page, "results");

    await goToSources(page);
    await expectStill(page, "sources");
  });

  test("a view change jumps to the new heading at once (no animated scroll)", async ({ page }) => {
    await openExample(page);
    // Scroll to the bottom, then change view with the button at the end of the page.
    await page.getByRole("button", { name: "Next: Sources and assumptions" }).scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => window.scrollY);
    expect(before).toBeGreaterThan(200);
    await page.getByRole("button", { name: "Next: Sources and assumptions" }).click();
    await expectView(page, "Sources and assumptions");
    const first = await page.evaluate(() => window.scrollY);
    await page.waitForTimeout(400);
    const later = await page.evaluate(() => window.scrollY);
    expect(later, "scroll position does not keep moving after the view change").toBe(first);
    await expect(page.getByRole("heading", { name: "Sources and assumptions", level: 2 })).toBeInViewport();
  });
});

test.describe("11. Print", () => {
  test("print media shows only the action card", async ({ page }) => {
    await openExample(page);
    await page.getByLabel("How many homes like this?").fill("40");
    await page.getByText("Show data table").click();
    await page.emulateMedia({ media: "print" });

    const card = actionCard(page);
    await expect(card).toBeVisible();
    await expect(card.getByRole("heading", { name: "Program this tonight" })).toBeVisible();
    await expect(card.getByRole("list").nth(0).getByRole("listitem")).toHaveText([...EXAMPLE.weekdays]);
    await expect(card.getByRole("list").nth(1).getByRole("listitem")).toHaveText([...EXAMPLE.weekend]);
    for (const item of await card.getByRole("listitem").all()) await expect(item).toBeVisible();

    // The printed card carries its own one-line summary, with the simulation caveat.
    const summary = card.getByText(/^Setback: one home \(apartment\) in Waterloo, Ontario\./);
    await expect(summary).toBeVisible();
    await expect(summary).toContainText("This schedule cuts your simulated heating energy by 8.8% (about 150 kg CO2e this season)");
    await expect(summary).toContainText("Simulation, not measured savings.");

    // Everything else is hidden.
    await expect(page.getByRole("banner")).toBeHidden();
    await expect(page.getByRole("navigation", { name: "Steps" })).toBeHidden();
    await expect(page.getByRole("contentinfo")).toBeHidden();
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeHidden();
    await expect(page.getByRole("heading", { name: "Results", level: 2 })).toBeHidden();
    await expect(page.getByRole("table", { name: /One simulated heating season/ })).toBeHidden();
    await expect(page.getByRole("region", { name: "Comfort check" })).toBeHidden();
    await expect(page.getByRole("region", { name: "One week, hour by hour" })).toBeHidden();
    await expect(page.getByRole("region", { name: "Why this works" })).toBeHidden();
    await expect(page.getByRole("region", { name: "Sanity check" })).toBeHidden();
    await expect(page.getByRole("region", { name: "Scale it" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Print this card" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Copy share link" })).toBeHidden();
    await expect(page.getByRole("button", { name: /^Back:/ })).toBeHidden();
    await expect(page.getByRole("button", { name: /^Next:/ })).toBeHidden();

    // Generic check: no visible text anywhere outside the card.
    const stray = await card.evaluate((cardEl) => {
      const found: string[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = (node.textContent ?? "").trim();
        const parent = node.parentElement;
        if (!text || !parent || cardEl.contains(parent)) continue;
        if (parent.closest("script, style, noscript, template")) continue;
        if (!parent.checkVisibility()) continue;
        const r = parent.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        found.push(`${parent.tagName.toLowerCase()}: "${text.slice(0, 50)}"`);
      }
      return found;
    });
    expect(stray, "visible text outside the action card in print media").toEqual([]);

    // Back on screen, the summary line is hidden again and the page is whole.
    await page.emulateMedia({ media: "screen" });
    await expect(summary).toBeHidden();
    await expect(page.getByRole("banner")).toBeVisible();
  });

  test("the Print button calls window.print once", async ({ page }) => {
    await page.addInitScript(() => {
      window.__printCalls = 0;
      window.print = () => {
        window.__printCalls += 1;
      };
    });
    await openExample(page);
    await actionCard(page).getByRole("button", { name: "Print this card" }).click();
    expect(await page.evaluate(() => window.__printCalls)).toBe(1);
  });

  test("the printed card fits on one page (Chromium PDF)", async ({ page, browserName }, testInfo) => {
    test.skip(browserName !== "chromium", "page.pdf() is only available in Chromium");
    await openExample(page);
    const pdf = await page.pdf({ format: "Letter", printBackground: true });
    await testInfo.attach("action-card.pdf", { body: pdf, contentType: "application/pdf" });
    const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    expect(pages, "number of pages in the printed PDF").toBe(1);
  });
});
