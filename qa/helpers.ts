// Shared fixtures and helpers for the Setback QA suite.
//
// Every test imports `test` from this file. It adds an automatic "monitor"
// fixture that records console errors and warnings, uncaught page errors and all
// network requests for the whole browser context, and fails the test if any of
// them is a problem or if any request leaves the site's own origin.

import fs from "node:fs";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import {
  test as base,
  expect,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";

export { expect };

// ---------------------------------------------------------------------------
// Documented numbers of the Waterloo example (docs/SOURCES.md section 8,
// pinned by lib/sim/__tests__/example.test.ts).
// ---------------------------------------------------------------------------

export const EXAMPLE = {
  pct: "8.8%",
  co2eKg: "150 kg",
  energy: ["9,373", "8,546", "827"],
  gas: ["879", "801", "78"],
  co2e: ["1,697", "1,548", "150"],
  comfort: "6.9 of 1,934",
  nrcanPct: "1.4%",
  cmhcPct: "3.3%",
  week: "Week of Jan 26, 2026",
  weekdays: ["5:00 AM: 21 °C", "8:30 AM: 18 °C", "3:30 PM: 21 °C", "11:00 PM: 18 °C"],
  weekend: ["7:00 AM: 21 °C", "11:30 PM: 18 °C"],
} as const;

export const NRCAN_QUOTE =
  "A drop of 1°C (2°F) over an eight-hour period can save about 2 percent on your heating energy consumption.";
export const NRCAN_KEEPING_HEAT_URL =
  "https://www.canada.ca/en/environment-climate-change/services/energy-efficiency/home-energy-efficiency/keeping-heat.html";
export const NRCAN_HEAT_PUMP_URL =
  "https://natural-resources.canada.ca/energy-efficiency/energy-star/heating-cooling-heat-pump";

// ---------------------------------------------------------------------------
// Console and network monitor
// ---------------------------------------------------------------------------

export interface Monitor {
  origin: string;
  /** console.error and console.warning messages. */
  consoleProblems: string[];
  /** Uncaught exceptions in any page of the context. */
  pageErrors: string[];
  /** Every request URL, in order. */
  requests: string[];
  /** Requests that failed at the network level. */
  failedRequests: string[];
  /** Responses with status 400 or higher. */
  badResponses: string[];
  /** Requests to an origin other than the site under test. */
  offOrigin: string[];
}

const isLocalScheme = (url: string) => /^(data|blob|about|chrome-error):/i.test(url);

/** Start recording console, error and network activity for every page of a context. */
export function watchContext(context: BrowserContext, baseURL: string): Monitor {
  const origin = new URL(baseURL).origin;
  const m: Monitor = {
    origin,
    consoleProblems: [],
    pageErrors: [],
    requests: [],
    failedRequests: [],
    badResponses: [],
    offOrigin: [],
  };
  context.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      m.consoleProblems.push(`[${msg.type()}] ${msg.text()} (${msg.location().url})`);
    }
  });
  context.on("weberror", (err) => {
    m.pageErrors.push(err.error().message);
  });
  context.on("request", (req) => {
    const url = req.url();
    if (isLocalScheme(url)) return;
    m.requests.push(`${req.method()} ${url}`);
    if (new URL(url).origin !== origin) m.offOrigin.push(url);
  });
  context.on("requestfailed", (req) => {
    m.failedRequests.push(`${req.method()} ${req.url()} (${req.failure()?.errorText ?? "failed"})`);
  });
  context.on("response", (res) => {
    if (res.status() >= 400) m.badResponses.push(`${res.status()} ${res.url()}`);
  });
  return m;
}

/** Assert that nothing went wrong on the console or the network, and nothing left the origin. */
export function expectClean(m: Monitor, where: string): void {
  expect.soft(m.pageErrors, `uncaught page errors (${where})`).toEqual([]);
  expect.soft(m.consoleProblems, `console errors and warnings (${where})`).toEqual([]);
  expect.soft(m.failedRequests, `failed network requests (${where})`).toEqual([]);
  expect.soft(m.badResponses, `HTTP error responses (${where})`).toEqual([]);
  expect.soft(m.offOrigin, `requests to another origin (${where})`).toEqual([]);
}

export interface QaOptions {
  /** Set with test.use() in specs that break the network on purpose. Uncaught errors and
   *  third-party requests still fail the test; failed requests and console errors do not. */
  allowNetworkErrors: boolean;
}

export const test = base.extend<QaOptions & { monitor: Monitor }>({
  allowNetworkErrors: [false, { option: true }],
  monitor: [
    async ({ context, baseURL, allowNetworkErrors }, provide, testInfo) => {
      const m = watchContext(context, baseURL ?? "http://localhost:4310");
      await provide(m);
      await testInfo.attach("console-and-network.json", {
        body: JSON.stringify(m, null, 2),
        contentType: "application/json",
      });
      if (allowNetworkErrors) {
        expect.soft(m.pageErrors, "uncaught page errors (whole test)").toEqual([]);
        expect.soft(m.offOrigin, "requests to another origin (whole test)").toEqual([]);
      } else {
        expectClean(m, "whole test");
      }
    },
    { auto: true },
  ],
});

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

export type ViewTitle =
  | "Your place"
  | "Your schedule now"
  | "A better schedule"
  | "Results"
  | "Sources and assumptions";

/** Wait until React has attached its handlers, so the first click is not lost. */
export async function waitForApp(page: Page): Promise<void> {
  await page
    .waitForFunction(
      () => {
        const button = document.querySelector("main button");
        return button !== null && Object.keys(button).some((k) => k.startsWith("__reactProps"));
      },
      undefined,
      { timeout: 15_000 }
    )
    .catch(() => undefined);
}

export async function gotoLanding(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Setback", level: 1 })).toBeVisible();
  await waitForApp(page);
}

/** The view heading. Every view change must move focus to it. */
export function viewHeading(page: Page, title: ViewTitle): Locator {
  return page.getByRole("heading", { name: title, level: 2, exact: true });
}

export async function expectView(page: Page, title: ViewTitle): Promise<void> {
  const heading = viewHeading(page, title);
  await expect(heading).toBeVisible();
  await expect(heading, `focus moves to the "${title}" heading`).toBeFocused();
}

/** The one-sentence result at the top of Results. */
export function headline(page: Page): Locator {
  return page.getByRole("main").getByText(/^This schedule (cuts|uses|does not save)/);
}

export async function openExample(page: Page): Promise<void> {
  await gotoLanding(page);
  await page.getByRole("button", { name: "Try the Waterloo example" }).click();
  await expectView(page, "Results");
  await expect(headline(page)).toBeVisible();
}

export async function startOwnPlace(page: Page): Promise<void> {
  await gotoLanding(page);
  await page.getByRole("button", { name: "Start with my own place" }).click();
  await expectView(page, "Your place");
}

/** Use the step navigation at the top of the page. */
export async function goToStep(page: Page, step: 1 | 2 | 3 | 4): Promise<void> {
  const titles: ViewTitle[] = ["Your place", "Your schedule now", "A better schedule", "Results"];
  await page
    .getByRole("navigation", { name: "Steps" })
    .getByRole("button", { name: new RegExp(`^Step ${step}:`) })
    .click();
  await expectView(page, titles[step - 1]);
}

export async function goToSources(page: Page): Promise<void> {
  await page
    .getByRole("navigation", { name: "Steps" })
    .getByRole("button", { name: "Sources and assumptions" })
    .click();
  await expectView(page, "Sources and assumptions");
}

/** A brand-new browser context (no storage, no history) with the same device settings as the project. */
export async function freshContext(browser: Browser, testInfo: TestInfo): Promise<BrowserContext> {
  const use = testInfo.project.use;
  return browser.newContext({
    baseURL: use.baseURL,
    viewport: use.viewport,
    userAgent: use.userAgent,
    deviceScaleFactor: use.deviceScaleFactor,
    isMobile: use.isMobile,
    hasTouch: use.hasTouch,
  });
}

// Locators used by several specs --------------------------------------------

export const comparisonTable = (page: Page) => page.getByRole("table", { name: /One simulated heating season/ });
export const actionCard = (page: Page) => page.getByRole("region", { name: "Program this tonight" });
export const scaleSection = (page: Page) => page.getByRole("region", { name: "Scale it" });
export const weekdaysEditor = (page: Page) => page.getByRole("group", { name: "Weekdays (Mon to Fri)" });
export const weekendEditor = (page: Page) => page.getByRole("group", { name: "Weekend (Sat and Sun)" });

/** The numeric cells of one row of the before/after table. */
export function rowCells(page: Page, rowName: RegExp): Locator {
  return comparisonTable(page).getByRole("row", { name: rowName }).getByRole("cell");
}

/** "3,104" -> 3104 */
export function parseNumber(text: string): number {
  const match = /-?[\d,]+(\.\d+)?/.exec(text);
  if (!match) throw new Error(`No number in "${text}"`);
  return Number(match[0].replace(/,/g, ""));
}

/** Assert the documented numbers of the Waterloo example on the Results view. */
export async function expectExampleResults(page: Page): Promise<void> {
  await expect(headline(page)).toContainText(EXAMPLE.pct);
  await expect(headline(page)).toContainText(EXAMPLE.co2eKg);
  await expect(rowCells(page, /^Heating energy, kWh/)).toHaveText([...EXAMPLE.energy]);
  await expect(rowCells(page, /^Natural gas, m³/)).toHaveText([...EXAMPLE.gas]);
  await expect(rowCells(page, /^Emissions, kg CO2e/)).toHaveText([...EXAMPLE.co2e]);
  await expect(page.getByRole("region", { name: "Comfort check" })).toContainText(EXAMPLE.comfort);
  const lists = actionCard(page).getByRole("list");
  await expect(lists.nth(0).getByRole("listitem")).toHaveText([...EXAMPLE.weekdays]);
  await expect(lists.nth(1).getByRole("listitem")).toHaveText([...EXAMPLE.weekend]);
}

// ---------------------------------------------------------------------------
// Accessibility (axe-core)
// ---------------------------------------------------------------------------

export const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

export interface AxeSummary {
  id: string;
  impact: string | null | undefined;
  help: string;
  nodes: string[];
}

/** Run axe-core on the current page. Saves the full result under test-results/axe/ and returns a summary. */
export async function runAxe(page: Page, testInfo: TestInfo, label: string): Promise<AxeSummary[]> {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  const summary: AxeSummary[] = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.map((n) => `${n.target.join(" ")} :: ${n.failureSummary ?? ""}`),
  }));
  const record = {
    project: testInfo.project.name,
    view: label,
    url: page.url(),
    tags: AXE_TAGS,
    passes: results.passes.length,
    // "Incomplete" means axe could not decide and a person has to look (see docs/QA.md).
    incomplete: results.incomplete.map((i) => ({
      id: i.id,
      nodes: i.nodes.map((n) => `${n.target.join(" ")} :: ${n.html.slice(0, 120)}`),
    })),
    violations: summary,
  };
  const dir = path.join(testInfo.config.rootDir, "..", "test-results", "axe");
  fs.mkdirSync(dir, { recursive: true });
  const file = `${testInfo.project.name}--${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`;
  fs.writeFileSync(path.join(dir, file), JSON.stringify(record, null, 2));
  await testInfo.attach(`axe ${label}`, { body: JSON.stringify(record, null, 2), contentType: "application/json" });
  return summary;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export interface OverflowReport {
  scrollWidth: number;
  clientWidth: number;
  /** Elements whose right edge is past the viewport and that are not inside a scroll container. */
  offenders: string[];
}

/** Horizontal page overflow: the document must not be wider than the viewport. */
export async function measureOverflow(page: Page): Promise<OverflowReport> {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const offenders: string[] = [];
    if (doc.scrollWidth > doc.clientWidth) {
      const insideScroller = (el: Element): boolean => {
        for (let p = el.parentElement; p; p = p.parentElement) {
          const ox = getComputedStyle(p).overflowX;
          if (ox === "auto" || ox === "scroll" || ox === "hidden") return true;
        }
        return false;
      };
      for (const el of Array.from(document.querySelectorAll("body *"))) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > doc.clientWidth + 0.5 && !insideScroller(el)) {
          const text = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
          offenders.push(`${el.tagName.toLowerCase()}.${el.className} right=${Math.round(r.right)} "${text}"`);
        }
        if (offenders.length >= 8) break;
      }
    }
    return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, offenders };
  });
}

export async function expectNoHorizontalScroll(page: Page, where: string): Promise<void> {
  const report = await measureOverflow(page);
  expect
    .soft(
      report.scrollWidth,
      `${where}: page is ${report.scrollWidth}px wide in a ${report.clientWidth}px viewport. ${report.offenders.join(" | ")}`
    )
    .toBeLessThanOrEqual(report.clientWidth);
}
