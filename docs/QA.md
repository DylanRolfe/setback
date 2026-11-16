# Setback: QA report

Date of testing: **2026-11-15**. Tester: the QA agent (did not write the app).

**Current status (see section 9):** all ten defects found in the first pass are fixed. The suite was re-run on the
fixed build locally and on the deployed site <https://setback-mocha.vercel.app> (commit `725ab97`): 252 tests, 239 passed, 13 skipped by
design, 0 failed, in both runs. Sections 2 to 8 below are the QA agent's first-pass report on commit `f87e4cb` and are
kept as written, except the Status column in section 4.

## 1. Scope and how to run

**What was tested.** The production static export of Setback (`npm run build`, output in `out/`), served locally by
`qa/serve-out.mjs` on port 4310. **This is a local build, not the deployed site.** No Vercel URL existed when the tests
ran, so nothing in this report is evidence about the deployed site. Section 8 lists the steps to repeat the run there.

**What is in `qa/`.**

| File | Covers |
| --- | --- |
| `playwright.config.ts` | Three projects: `desktop` (Chromium, 1280×800), `mobile` (Pixel 7 emulation, 412×839, touch), `narrow` (Chromium, 320×640). `BASE_URL` from the environment, default `http://localhost:4310`. The local server is started by Playwright only when `BASE_URL` is not set. |
| `helpers.ts` | Shared fixtures. Every test gets an automatic monitor that fails it on any console error or warning, uncaught page error, failed request, HTTP 4xx/5xx response, or request to another origin. |
| `01-demo-flow.spec.ts` | Check 1 |
| `02-manual-path.spec.ts` | Check 2 |
| `03-honesty.spec.ts` | Check 3 |
| `04-scale-share.spec.ts` | Checks 4 and 5 |
| `05-console-network.spec.ts` | Check 6 |
| `06-accessibility.spec.ts` | Check 7 (axe-core) |
| `07-keyboard.spec.ts` | Check 8 (desktop only) |
| `08-layout.spec.ts` | Check 9 |
| `09-motion-print.spec.ts` | Checks 10 and 11 |
| `10-error-paths.spec.ts` | Extra: weather download failures, reload, browser Back |
| `take-screenshots.mjs` | Writes `docs/screenshots/01..06`. Not part of `npm run qa`. |
| `serve-out.mjs` | Static server for `out/` (already existed; not changed). |

**Run locally**

```
npm install
npx playwright install chromium
npm run build
npm run qa
```

**Run against a deployed URL** (same suite, no local server is started)

```
BASE_URL=https://<your-site> npm run qa            # Git Bash, macOS, Linux
$env:BASE_URL = "https://<your-site>"; npm run qa   # PowerShell
```

Useful variations: `npm run qa -- --project=desktop`, `npm run qa -- qa/06-accessibility.spec.ts`.
Output: `test-results/results.json` (machine-readable), `test-results/axe/<project>--<view>.json` (full axe results),
`playwright-report/` (HTML report: `npx playwright show-report`). Screenshots: start the server
(`node qa/serve-out.mjs 4310`) and run `node qa/take-screenshots.mjs` (also accepts `BASE_URL`).

Tests marked `test.fail` are **known defects**: the test asserts the correct behaviour, the app does not do it yet, and
the marker names the defect ID. Playwright counts such a test as "passed" in its one-line summary. This report counts
them separately as "expected fail". When a defect is fixed its test will start to report "unexpected pass": remove the
`test.fail` line then.

## 2. Environment

| Item | Value |
| --- | --- |
| Build tested | Local static export (`out/`, built 2026-11-15 18:08 local) of committed git HEAD `f87e4cb`. The app code in that commit is identical to `4500813`; `f87e4cb` only adds the QA suite, the screenshots and two devDependencies. **Not the deployed site.** |
| Not covered | Uncommitted edits to `app/layout.tsx`, `components/ActionCard.tsx`, `components/ResultsStep.tsx`, `components/SetbackApp.tsx`, `components/shared.ts`, `components/SkipLink.tsx` and `lib/share.ts` appeared in the working tree at 18:11 to 18:12, after `out/` was built. They were not built and not tested. |
| Served by | `node qa/serve-out.mjs 4310` at `http://localhost:4310` |
| OS | Windows 11 Pro 10.0.26200 |
| Node | 22.21.0 |
| App stack | Next.js 16.4.6, React 19.3.0 |
| Playwright | `@playwright/test` 1.65.1 |
| Browser | Chromium 159.0.8154.6 (Playwright headless shell, build 1255). The only engine used. |
| Mobile | Playwright "Pixel 7" device emulation in that same Chromium (412×839 viewport, device scale 2.625, touch, mobile user agent). An emulation, not a phone. |
| axe-core | 4.14.0 via `@axe-core/playwright` 4.14.0, tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` |
| Final run | 2026-11-15, 77.7 s, 255 tests, 0 unexpected failures, 0 flaky |

## 3. Results

### 3.1 Totals (final run)

| Project | Tests | Passed | Expected fail (open defect) | Unexpected fail | Skipped |
| --- | --- | --- | --- | --- | --- |
| desktop (1280×800) | 85 | 79 | 5 | 0 | 1 |
| mobile (Pixel 7) | 85 | 75 | 4 | 0 | 6 |
| narrow (320×640) | 85 | 75 | 4 | 0 | 6 |
| **All** | **255** | **229** | **13** | **0** | **13** |

Playwright's own summary line reads "242 passed, 13 skipped": that 242 is 229 real passes plus the 13 expected failures.
Skipped: the six keyboard tests run in `desktop` only (12 skips), and the touch-target test does not run in `desktop` (1 skip).

### 3.2 Per check

"Pass" means every assertion of that check passed in that project. "Pass, with DEF-nn" means the check as specified
passed and an extra test for a related defect is an expected fail.

| # | Check | desktop | mobile | narrow | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Demo flow: landing → "Try the Waterloo example" → Results | Pass (7/7) | Pass (7/7) | Pass (7/7) | Headline "8.8%" and "150 kg"; table 9,373 / 8,546 / 827 kWh, 879 / 801 / 78 m³, 1,697 / 1,548 / 150 kg; comfort "6.9 of 1,934"; sanity 1.4% (below NRCan) and 3.3% (CMHC); default week "Week of Jan 26, 2026", coldest week; action card weekdays 5:00 AM 21 °C, 8:30 AM 18 °C, 3:30 PM 21 °C, 11:00 PM 18 °C, weekend 7:00 AM 21 °C, 11:30 PM 18 °C; data table has 168 rows. |
| 2 | Manual path, Back / Next, step navigation | Pass (5/5) | Pass (5/5) | Pass (5/5) | City, home type, heating type, UA edit, block edit / add / remove, routine change, Suggest then edit, Results, Sources. Inline errors for bad values. |
| 3 | Honesty checks in the UI | Pass (11/11), with DEF-01 | Pass (11/11), with DEF-01 | Pass (11/11), with DEF-01 | All eleven specified points pass. One extra test is an expected fail (DEF-01). |
| 4 | "Scale it" at 40 homes | Pass (2/2) | Pass (2/2) | Pass (2/2) | Shows 33,074 kWh, 3,102 m³, 5,990 kg CO2e with the "estimate" badge and "Linear scaling estimate". Each is within 40 × 0.5 of 40 × the displayed single-home value; matches "about 3,100 m³" and "about 5,990 kg" in `docs/SOURCES.md`. |
| 5 | Share link and garbage hash | Pass (19/19), with DEF-09 | Pass (19/19), with DEF-09 | Pass (19/19), with DEF-09 | Link from the card and `location.href` both reproduce Results (numbers, 40 homes, price) in a fresh context. Nine broken hashes, including `#s=xyz`, fall back to the landing page with no error. Five tampered but decodable links render without error. |
| 6 | Console, page errors, network | Pass (4/4) | Pass (4/4) | Pass (4/4) | Zero console errors or warnings, zero page errors, zero failed requests, zero requests to another origin. The same assertions ran at the end of all other tests. |
| 7 | axe-core, WCAG 2.0/2.1 A and AA | Pass (10/10), 0 violations | Pass (10/10), 0 violations | Pass (10/10), 0 violations | 9 scans per project, 27 in total. See 3.3. |
| 8 | Keyboard-only pass | Pass (5/5), with DEF-02 | Not run | Not run | Desktop only, as specified. See 3.4. |
| 9 | Layout | Pass (5/5) | Pass (6/6) | Pass (6/6) | No horizontal page scroll in any view or state. See 3.5 for touch targets and charts, and DEF-05. |
| 10 | `prefers-reduced-motion: reduce` | Pass (2/2) | Pass (2/2) | Pass (2/2) | No running animation, no computed animation or transition longer than 10 ms on any element, `scroll-behavior: auto` everywhere, scroll position does not move after a view change. |
| 11 | Print | Pass (3/3) | Pass (3/3) | Pass (3/3) | In print media only the "Program this tonight" card is visible, with its one-line summary and "Simulation, not measured savings."; no visible text outside it. The Print button calls `window.print()` once. Chromium's PDF of the page is one page. |
| Extra | Weather download failures | Pass (4/4), with DEF-04 | Pass (4/4), with DEF-04 | Pass (4/4), with DEF-04 | Error message with "Try again" on steps 1, 3 and Results; no numbers shown without data; malformed file rejected. |
| Extra | Reload, link withdrawal, browser Back | Pass (2/2), with DEF-03 | Pass (2/2), with DEF-03 | Pass (2/2), with DEF-03 | Reload on Results keeps the scenario. |

Check 3 in detail (all pass in all three projects):

| Point | Result |
| --- | --- |
| UA, C and heater size labeled "estimate" | Pass. Step 1: each home type shows "(estimates)"; the three fields carry an "estimate" badge in their label. Sources: all three rows have kind "estimate". Results: "The heater size is 5.8 kW (estimate)." |
| Results wording says simulated | Pass. Headline: "simulated heating energy ... under these assumptions"; "This is a simulation, not a measurement of your home." |
| NRCan quote exact and linked | Pass. The text is exactly `A drop of 1°C (2°F) over an eight-hour period can save about 2 percent on your heating energy consumption.` on Results and on Sources, linked to the Keeping the Heat In page. The same sentence was found on the live page on 2026-11-15 (section 6). |
| Footer: Open-Meteo link, CC BY 4.0, AI disclosure | Pass on all six views. "Built by Dylan Rolfe with an AI coding agent." |
| Schedule equal to the current one | Pass. "This schedule does not save energy compared with your current one."; Saved column shows 0. |
| Warmer schedule | Pass. "This schedule uses N% more simulated heating energy ..."; Saved column shows "N more". |
| Cost absent until a price is typed | Pass. No "$" anywhere on Results; after typing 50 the row "Cost at your price" appears and equals volume × price; clearing the field removes it. |
| Heat pump caution | Pass. Step 1 quotes "Moderated setbacks of not more than 2°C should be employed" with a link; step 3 repeats it for a setback over 2 °C. |
| Setpoint below 17 °C | Pass in step 3: "Warning: this schedule goes down to 16.5 °C." with the NRCan quote and link. Not shown at exactly 17 °C. Not repeated on Results (DEF-01). |

### 3.3 Accessibility (axe-core)

**Violations found: 0** in 27 scans (9 views or states × 3 projects): landing; step 1; step 1 with the estimates open,
the heat pump caution and a field error; step 2; step 3; step 3 after Suggest with the 17 °C warning; Results; Results
with the data table open, 40 homes, a price and the share link shown; Sources.

axe reported `color-contrast` as **incomplete** (it could not decide, a person must check) for SVG text: 28 nodes on
Results, 12 to 16 on steps 2 and 3. Checked by calculation from the colours in the source:

| Pair | Ratio | Needs |
| --- | --- | --- |
| Chart text `#1c1917` on the white card | 17.5 : 1 | 4.5 |
| Chart axis and tick text `#57534e` on the white card | 7.6 : 1 | 4.5 |
| Day-bar label `#1c1917` on the coolest and warmest fills | 13.9 and 10.7 : 1 | 4.5 |
| Muted text `#57534e` on the page background | 7.3 : 1 | 4.5 |
| Error text `#b91c1c` on white / on the error callout | 6.5 / 5.9 : 1 | 4.5 |
| White on the primary button `#14532d` | 9.1 : 1 | 4.5 |
| Chart lines: before `#b45309`, after `#0f766e`, outside `#57534e`, on white | 5.0, 5.5, 7.6 : 1 | 3 |
| Focus ring `#1d4ed8` on the page background | 6.4 : 1 | 3 |
| Field border `#78716c` on white | 4.8 : 1 | 3 |

The before and after chart lines have almost the same lightness (1.09 : 1 against each other). They are also told apart
by dash style, and the legend says "(dashed)" and "(solid)", so colour is not the only cue.

Also asserted: `lang="en"`, a page title, exactly one `h1` per view, one `main`, one footer landmark, a labeled step
navigation with `aria-current`, the headline repeated in a polite live region, both charts exposed as images with a
name and a computed text summary, and a data-table alternative.

axe cannot judge reading order, the quality of the announcements or screen-reader behaviour. Those were not tested (section 7).

### 3.4 Keyboard-only pass (desktop)

Using only Tab, Shift+Tab, Enter, Space, arrow keys and typing into fields:

- Skip link is the first stop, becomes visible on focus, and moves focus to `main`; the next Tab lands on the first control in `main`.
- Example: Enter on "Try the Waterloo example"; focus moves to the "Results" heading; arrow keys on "Week to show" change both charts; "Show data table" opens with Enter and its region is reachable; "How many homes like this?" set to 40; "Print this card" reached and activated; "Copy share link" activated with Space; the link field is reachable and selects its text; Shift+Tab walks back.
- Manual path: city by arrow keys; home type and heating type by arrow keys inside the radio groups; "Adjust the estimates" opened with Enter and UA typed; step 2 "Add a time block" moves focus to the new block's start time; the time changed with ArrowUp; a block removed without losing focus; the routine checkbox toggled with Space; step 3 "Suggest a schedule" with Space and another block added; on to Results.
- Step navigation works with Enter and Space and sets `aria-current`.
- After **every** Tab press in these tests the focused element was a real element, visible, inside the viewport, with a 3 px solid outline in `rgb(29, 78, 216)`. Focus moved to the new heading on every view change, in all tests of all projects.

One exception in kind, not a failure: every time field has a fourth tab stop, the clock button that Chromium puts
inside it. While it has focus the app's blue ring is not drawn; the browser draws its own thin dark ring around the
clock icon. A test confirms by screenshot comparison that the field looks different in that state. So an indicator is
visible, but it is the browser's, not the app's.

### 3.5 Layout

- **Horizontal scroll:** none. `document.documentElement.scrollWidth <= clientWidth` held in all three projects on the landing page, step 1 (estimates open, heat pump caution), step 2 (six blocks and an error), step 3 (suggestion and 17 °C warning), Results, Results with the data table open, 10,000 homes, a price of 999.99 and the share link shown, and Sources. The five wide assumption tables scroll inside their own focusable boxes.
- **Touch targets (mobile and narrow):** every button, field, select, disclosure summary, and every radio or checkbox row is at least 44 px high. **Exceptions:** text links are one line of text high, 19 to 21 px. These are the two footer links ("Weather data by Open-Meteo.com", "CC BY 4.0") on every view, and the source links on Sources and Results. Links inside a sentence are exempt from WCAG 2.5.8, and WCAG 2.5.5 (44 px) is level AAA, so this is reported and not logged as a defect. Links that wrap onto two lines measure 39 px or more as a box.
- **Charts:** in every one of the 29 selectable weeks, and for the schedule day bars with one, four and six blocks, every SVG label lies inside its chart and no two labels overlap each other. Charts are at least 240 px wide and never wider than the viewport; the smallest label is at least 10 px high. **Not caught by that test, found by eye:** a data line is drawn across the "your minimum, 20 °C" label (DEF-05).

## 4. Defects

No Critical or Major defect was found. Five Minor, five Cosmetic. All ten are now **Fixed** (section 9).

| ID | Severity | View | Steps to reproduce | Expected | Actual | Test | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DEF-01 | Minor | Results, printed card | 1. Open the site, press "Try the Waterloo example". 2. Step 3. 3. Weekdays, "Temperature (°C), block 2": type 15. The NRCan 17 °C warning appears. 4. Step 4, Results. | The warning that a schedule below 17 °C risks moisture stays with the schedule where it is handed over: on Results and on the card that is printed. Same for the heat pump caution. | Results and the "Program this tonight" card list "8:30 AM: 15 °C" with no warning. The text "17°C" appears nowhere on Results. Same for the heat pump caution: choose Heat pump in step 1 with a setback over 2 °C; Results shows no caution. The cautions exist only in steps 1 and 3. | `03-honesty.spec.ts`, "Results repeats the 17 °C warning ...", expected fail in all 3 projects | Fixed in `725ab97` |
| DEF-02 | Minor | Results (any view after the landing page) | 1. Press "Try the Waterloo example". The address ends in `#s=...`. 2. Press Shift+Tab until "Skip to main content" has focus, press Enter. 3. Look at the address bar. 4. Reload. | The address keeps the share link; a reload returns to the same Results. | The address becomes `http://localhost:4310/#main`. A reload shows the landing page and the scenario is gone. Copying the address after using the skip link gives a link that opens the landing page. "Copy share link" still gives a correct link. | `07-keyboard.spec.ts`, "using the skip link on Results keeps the share link ...", expected fail (desktop) | Fixed in `725ab97` |
| DEF-03 | Minor | All steps | 1. Open the site. 2. "Start with my own place". 3. "Next: Your schedule now". 4. Press the browser's Back button (or the Android back gesture). | The app returns to step 1. | The browser leaves the site (previous page or blank tab). View changes are not put in the browser history. Going forward again opens Results, not the step that was open. No data is lost, because the scenario is in the hash. | `10-error-paths.spec.ts`, "the browser Back button returns to the previous step", expected fail in all 3 projects | Fixed in `725ab97` |
| DEF-04 | Minor | Landing → Results | 1. Go offline (or block `/data/weather-waterloo.json`). 2. Load the site. 3. Press "Try the Waterloo example": "Error: the example weather data did not load." (correct). 4. Go online again. 5. Press "Try the Waterloo example" again. | Results with the example numbers. | Results opens with "Error: the weather data for Waterloo, Ontario did not load. Check your connection and try again." and no numbers, although the download in step 5 succeeded. Pressing "Try again" there shows the numbers. Cause visible in the code: the page-level weather state still holds the first failure. | `10-error-paths.spec.ts`, "after a failed download, trying again once the network is back shows Results", expected fail in all 3 projects; the workaround has its own passing test | Fixed in `725ab97` |
| DEF-05 | Cosmetic | Results, "One week, hour by hour" | 1. Press "Try the Waterloo example". 2. Look at the right end of the "Inside (°C), simulated" chart. Clearest at 320 px wide. | The label "your minimum, 20 °C" is readable. | The teal "better schedule" line is drawn over the label. At 1280 px one stroke crosses it (visible in `docs/screenshots/03-chart.png`); at 320 px several strokes cross it and it is hard to read. The label is the only place that says what the dotted line is. | None (found by eye; the automated check only compares labels with each other) | Fixed in `725ab97` |
| DEF-06 | Cosmetic | Step 3 | 1. Press "Try the Waterloo example". 2. Step 3. Read the note under "Suggest a schedule". 3. Step 4, read "Comfort check". | The two statements agree. | Step 3 says warm-up starts 120 minutes early "so the simulated room is back above your 20 °C minimum when you need it." Results says the room is below 20 °C for 6.9 of 1,934 hours at home and awake, lowest 19.4 °C. The suggestion's own rule allows up to 1% of hours below; the note states it as none. | None (wording) | Fixed in `725ab97` |
| DEF-07 | Cosmetic | Sources and assumptions; Results, Sanity check | 1. Open Sources. Read the first sentence, then the "Kind" column. 2. On Results read the NRCan verdict. | Every number shown is computed, cited, or labeled "estimate", as the first sentence and `docs/PLAN.md` rule 2 say. | Three numbers carry a fourth label, "model setting": "60 seconds" (time step), "30 to 180 minutes" (warm-up lead time) and "1%" (comfort share); with electric heating also "100% (COP 1)". The range "We count 1.5% to 2.5% as in line with it" has no label and no row on Sources. The values are explained; only the claim "computed, cited or estimate" does not cover them. | None (provenance audit, section 5) | Fixed in `725ab97` |
| DEF-08 | Minor | Results; Sources and assumptions | 1. Press "Try the Waterloo example". 2. On Results and then on Sources, look for what the "before" schedule is. | The inputs that produce the headline are visible where the headline is, or on Sources: the "before" schedule (22 °C all day, every day), the routine (up 7:00, out 8:30 to 17:30, bed 23:00; weekends 9:00 to 23:30) and the comfort minimum (20 °C). | Results says only "Before is your schedule now." Neither Results nor Sources states 22 °C all day or the routine times; they can be seen only by opening step 2. The 8.8% depends directly on that baseline. The comfort minimum does show on Results ("below 20 °C", "your minimum, 20 °C") but has no row on Sources and no label saying it is a default. | None (provenance audit, section 5) | Fixed in `725ab97` |
| DEF-09 | Cosmetic | Results, "Scale it" | 1. Build a share link whose homes value is very large (`"n": 1000000000` in the payload; the test does this). 2. Open it. | At most 10,000 homes, the limit the field enforces when typing. | The field shows 100000 with no error and the card shows "assumes 100,000 identical homes" with 82,685,614 kWh. The link decoder's limit is ten times the field's. | `04-scale-share.spec.ts`, "a link cannot carry more homes than the Scale it field accepts", expected fail in all 3 projects | Fixed in `725ab97` |
| DEF-10 | Cosmetic | Results, "Why this works" | 1. Press "Try the Waterloo example". 2. Read the "Season averages" table, After column. | Rows agree, or the rounding note is next to this table. | Average inside 20.1, average outside 0.1, average gap 19.9 (20.1 − 0.1 = 20.0). Each value is rounded on its own. The sentence "Each number is rounded on its own, so a row can be off by one" is in the "Before and after" section, not here. | None | Fixed in `725ab97` |

Observations that are **not** logged as defects:

- Time formats are mixed: time fields show the browser's format (12-hour in this Chromium), the day summary and error examples use 24-hour ("05:00 to 08:30", "for example 06:30"), the action card uses 12-hour ("5:00 AM").
- Scroll boxes around tables are tab stops even where the table fits and nothing scrolls (3 extra stops on Results, 5 on Sources at desktop width).
- The document title is the same on every view.
- The exported HTML has no `<noscript>` message. Without JavaScript the landing page shows but its buttons do nothing. Not tested further.
- The landing page downloads `/data/weather-waterloo.json` (same origin, static) before any button is pressed.
- The clock button inside time fields shows the browser's focus ring, not the app's (3.4).

## 5. Number-provenance audit

Done by reading the Results and Sources views of the Waterloo example at 1280×800, and the code that produces them.
Kinds: **(a)** computed by the model, **(b)** cited with a working source link, **(c)** labeled estimate.
"Link" means the link was present beside the number and returned HTTP 200 (section 6).

### Results view

| Number shown | Where | Kind | Notes |
| --- | --- | --- | --- |
| 8.8%, 150 kg CO2e | Headline | (a) | 827 / 9,373 = 8.82%. |
| Oct 1, 2025 to Apr 30, 2026 | Sub-headline, table caption | (b) | Season of the weather file; Open-Meteo, linked on Sources and in the footer. |
| 9,373 / 8,546 / 827 kWh | Before and after | (a) | 9,373 − 8,546 = 827. |
| 879 / 801 / 78 m³ | Before and after | (a) | 9,373 kWh × 3.6 / 38.39 MJ per m³ = 879. |
| 1,697 / 1,548 / 150 kg | Before and after | (a) | 879 × 1.931 = 1,697. 1,697 − 1,548 = 149; shown 150; the rounding note is next to the table. |
| Cost row | Before and after | (a) from the user's own price | Absent until a price is typed. No price is assumed. |
| 20 °C (comfort minimum) | Comfort check, chart label | **None of the three** | A default input. Not labeled as a default or estimate, no row on Sources. See DEF-08. |
| 0 and 6.9 of 1,934 hours; 0% and 0.4%; 21.7 °C and 19.4 °C | Comfort check | (a) | 6.9 / 1,934 = 0.36%. |
| 1% (comfort limit) | Comfort check | **None of the three** | "the limit this tool uses for its own suggestions". Sources lists it as "model setting". See DEF-07. |
| 0.25 °C | Comfort check | (c) | "(an estimate)"; Sources: deadband 0.5 °C, estimate. |
| Week list: 29 weeks with average outdoor temperatures | Chart selector | (a) from (b) | Averages of the cited weather data. |
| 524 and 491 kWh; 21.9 and 18.0 °C; −15.0 and −25.7 °C | Temperature chart summary | (a); outdoor values (b) | |
| 498 and 467 kWh; 5.8 kW peak | Heat chart summary | (a) | 524 × 0.95 = 498. |
| 5.8 kW heater size | Heat chart summary | (c) | "(estimate)". |
| Axis ticks, day numbers, hourly table (168 rows) | Charts, data table | (a); outdoor column (b) | |
| 22.0 / 20.1, 0.1 / 0.1, 21.9 / 19.9 °C, 8,904 / 8,110 kWh | Why this works | (a) | 9,373 × 0.95 = 8,904. Gap rounding: DEF-10. |
| "1°C (2°F)", "eight-hour", "about 2 percent" | Sanity check, quote | (b) | Exact quote, link, found on the live page. |
| 22 °C all day versus 21 °C, 11 p.m. to 7 a.m. | Sanity check, NRCan test case | (a) test design from (b) | Built from the quote (1 °C, eight hours) and the user's warmest setting. |
| 1.4% | Sanity check | (a) | |
| 1.5% to 2.5% | Sanity check, NRCan verdict | **None of the three** | The authors' reading of "about 2 percent". Stated as "We count ...", documented in `docs/SOURCES.md` section 7, not labeled in the app and not on Sources. See DEF-07. |
| 22 °C, 18 °C, 11 p.m. to 6 a.m., 6.5% | Sanity check, CMHC | (b) | Link to the CMHC PDF, HTTP 200. The PDF text was not read by QA. |
| 3.3% | Sanity check | (a) | |
| 40 homes; 33,074 kWh, 3,102 m³, 5,990 kg | Scale it | (c) | User input × (a), labeled "estimate ... Linear scaling estimate". |
| 5:00 AM 21 °C, 8:30 AM 18 °C, 3:30 PM 21 °C, 11:00 PM 18 °C; 7:00 AM 21 °C, 11:30 PM 18 °C | Program this tonight | (a) from (c) | Suggestion rule (21 °C, 3 °C lower: estimate with NRCan sources on Sources) applied to the routine; 120-minute warm-up chosen by simulation. The routine itself: see next row. |
| The "before" schedule (22 °C all day) and the routine times | Not shown on Results or Sources | **None of the three** | They drive the headline. Step 2 labels the routine "illustrative example"; the landing page says "an illustrative routine, not a real user". The 22 °C baseline is not labeled anywhere outside step 2. See DEF-08. |

### Sources and assumptions view

| Number shown | Kind in the app | Audit | Notes |
| --- | --- | --- | --- |
| 5,088 hourly values; rounded to 0.1 °C | cited | (b) | Open-Meteo link, HTTP 200. |
| UA 80 W/K | estimate | (c) | Plus a link to NRCan CEUD for the plausibility range; "21 °C" in the note is part of that explanation. |
| C 11.6 MJ/K = 70 m² × 165,000 J/K per m² | estimate | (c) with (b) | 70 × 165,000 = 11.55 MJ/K, shown 11.6. 165,000 found on the linked LBL page. The 70 m² floor area is part of the estimate. |
| Heater 5.8 kW = 1.5 × heat to hold 22 °C in the coldest hour | estimate | (c) | 1.5 × 80 W/K × (22 + 26.2) K = 5.78 kW. |
| Deadband 0.5 °C (0.25 below, 0.25 above) | estimate | (c) | |
| Time step 60 seconds | model setting | **None of the three** | DEF-07. |
| Furnace efficiency 95%; "since July 2019" | cited | (b) | "95%" and "July 3, 2019" found on the linked regulation page. |
| 1,921 g CO2 per m³ | cited | (b) | "1 921" found on the linked ECCC page. The annex link returns 200 but is a file listing loaded by script; the file was not opened by QA. |
| 0.037 g CH4, 0.035 g N2O per m³ | cited | (b) | Both found on the linked ECCC page. |
| CH4 = 28, N2O = 265 | cited | (b) | Both found on the linked ECCC page, with "Fifth Assessment". |
| 1.931 kg CO2e per m³ = 1,921 + 0.037 × 28 + 0.035 × 265 g | calculated | (a) | = 1,931.3 g. Formula shown. |
| 38.39 MJ per m³ | cited | (b) | Found on the linked ECCC page. |
| 21 °C at home, 3 °C lower (2 °C for heat pumps), never below 17 °C | estimate | (c) with (b) | Three NRCan links; "two to three degrees", the 17 °C sentence and the 2 °C sentence found on the live pages. |
| 30 to 180 minutes; at most 1% | model setting | **None of the three** | DEF-07. |
| Sanity check block | same as Results | same | |
| "October 2025 to April 2026", "2 °C", "17 °C" in Limits | text | (b) | Repeat cited values. |
| All sources list: table numbers, "2024", 90% / 95% and dates, 60% / 78–84% / 90–98%, 110,000 / 165,000 / 260,000 J/K, COP 2.3 at −15 °C, 3.1 at +9 °C, 1.5 at −21.1 °C, 3.0 at +4.9 °C, 6.5%, 11.2 / 13.2 / 9.1 / 14.6 / 18.9 ¢/kWh, "read on 2026-11-15" | cited | (b) | Every entry has a link that returned 200. Found on the live page: 90%, 95% and both dates; 110000, 165000, 260000; all five OEB prices and "November 1, 2026"; "2.3", "3.1" and "-15" on the CanmetENERGY page. Not checked by QA: the two PDFs and the NIR annex files. |

**Numbers that are none of the three:** the comfort minimum default (20 °C), the example's baseline schedule and routine
(not shown at all on these two views), the "1%" comfort limit, the "1.5% to 2.5%" band, "60 seconds", and
"30 to 180 minutes". All are explained somewhere in the app or in `docs/SOURCES.md`; none is invented data. They are
logged as DEF-07 and DEF-08.

## 6. Link check

2026-11-15, `curl` with a generic User-Agent, following redirects. HEAD and then GET. No link returned 403.
"Content" is a plain text search of the downloaded page; it is strong evidence for whole sentences and weak for short numbers.

| # | URL | HEAD | GET | Content spot check |
| --- | --- | --- | --- | --- |
| 1 | https://open-meteo.com/ | 200 | 200 | Not checked |
| 2 | https://creativecommons.org/licenses/by/4.0/ | 200 | 200 | Not checked |
| 3 | https://open-meteo.com/en/docs/historical-weather-api | 200 | 200 | Not checked |
| 4 | https://oee.nrcan.gc.ca/corporate/statistics/neud/dpa/menus/trends/comprehensive/trends_res_on.cfm | no response | 200 | Menu page; "Table 32" and "Gross Output Thermal Requirements" found. The table itself was not opened. HEAD got no response, GET worked. |
| 5 | https://simulationresearch.lbl.gov/modelica/releases/v10.1.1/help/Buildings_ThermalZones_ISO13790_Data.html | 200 | 200 | 110000, 165000, 260000 found |
| 6 | https://laws-lois.justice.gc.ca/eng/regulations/SOR-2016-311/section-259.html | 200 | 200 | "95%", "90%", "July 3, 2019", "December 31, 2009" found |
| 7 | https://data-donnees.az.ec.gc.ca/data/substances/monitor/canada-s-official-greenhouse-gas-inventory/D-Emission-Factors/?lang=en | 200 | 200 | 2.2 KB shell that loads a file listing by script. **Needs a manual look in a browser.** |
| 8 | https://data-donnees.az.ec.gc.ca/data/substances/monitor/canada-s-official-greenhouse-gas-inventory/C-Tables-Electricity-Canada-Provinces-Territories/?lang=en | 200 | 200 | Same as 7. **Needs a manual look in a browser.** |
| 9 | https://www.canada.ca/en/environment-climate-change/services/climate-change/pricing-pollution-how-it-will-work/output-based-pricing-system/federal-greenhouse-gas-offset-system/emission-factors-reference-values.html | 200 | 200 | "Version 4.0", "1 921", "38.39", "0.037", "0.035" found |
| 10 | https://www.canada.ca/en/environment-climate-change/services/climate-change/greenhouse-gas-emissions/quantification-guidance/global-warming-potentials.html | 200 | 200 | "28", "265", "Fifth Assessment" found |
| 11 | https://www.canada.ca/en/environment-climate-change/services/energy-efficiency/home-energy-efficiency/keeping-heat.html | 200 | 200 | Both quoted sentences found character for character; "9.1.2" found |
| 12 | https://natural-resources.canada.ca/energy-efficiency/energy-star/products/list-certified-products/smart-thermostats | 200 | 200 | The "A good guide is to program 17°C ..." sentence found; "two to three degrees" found |
| 13 | https://natural-resources.canada.ca/energy-efficiency/energy-star/heating-cooling-heat-pump | 200 | 200 | "Moderated setbacks of not more than 2°C should be employed", "between 2.0 and 5.4", "1.1 to 3.7" found |
| 14 | https://natural-resources.canada.ca/maps-tools-publications/publications/cooling-heating-season-performance-assessment-mini-split-cold-climate-air-source-heat-pump-canadian-centre-housing-technology | 200 | 200 | "2.3", "3.1", "-15" found (weak) |
| 15 | https://natural-resources.canada.ca/sites/nrcan/files/energy/pdf/energystar/Heating_With_Gas.pdf | 200 | 200 (PDF, 1.36 MB) | Not read |
| 16 | https://assets.cmhc-schl.gc.ca/sf/project/archive/publications/rhse-penrse/63816.pdf | 200 | 200 (PDF, 0.97 MB) | Not read |
| 17 | https://www.oeb.ca/consumer-information-and-protection/electricity-rates | 200 | 200 | 11.2, 13.2, 9.1, 14.6, 18.9 and "November 1, 2026" found |
| 18 | https://www.oeb.ca/consumer-information-and-protection/natural-gas-rates | 200 | 200 | Not checked |

Result: 18 of 18 links return 200 on GET. None failed. Links 7 and 8 need a person to confirm the files are listed.
Every external link in the app opens in a new tab with `rel="noopener noreferrer"` and says "(opens in a new tab)".

## 7. What was not tested

- **The deployed site.** No Vercel URL existed. Everything here is the local static export. Hosting behaviour (headers, caching, 404 page, anything Vercel injects such as analytics or the preview toolbar, which would break the "no third-party requests" check) is untested.
- **The uncommitted source edits** listed in section 2.
- **Real phones.** "mobile" is Chromium emulating a Pixel 7. No real Android or iOS device, no real touch, no on-screen keyboard, no native time or select pickers.
- **Safari and Firefox.** Chromium only. Time fields, number fields, `:focus-visible`, select keyboard behaviour and printing differ between engines.
- **Screen readers.** No NVDA, JAWS, VoiceOver or TalkBack. Names, roles and the live region were checked through the accessibility tree and axe only.
- **Real printing.** Print was checked with print-media emulation and Chromium's PDF output (one page). No printer and no print preview in another browser.
- **Clipboard permission prompts.** The copy test granted the permission up front; in that state "Link copied." appeared and the clipboard held the link. The browser's real prompt, and the "Your browser did not allow copying" fallback on a real denial, were not exercised.
- Windows High Contrast / forced colours, browser zoom and text-only zoom (the 320 px project stands in for 400% zoom at 1280 px), dark mode (the app is light-only by design), slow networks and load time, right-to-left, and use without JavaScript.
- The content of the two cited PDFs and the NIR annex files (section 6).
- The simulation itself beyond the documented example and the consistency checks in section 5. It has its own Vitest suite in `lib/sim/__tests__`.

## 8. Re-test once the Vercel URL exists

1. `BASE_URL=https://<vercel-url> npm run qa`. Expect the same totals as section 3.1, minus any defect fixed since. A fixed defect shows as an "unexpected pass": remove its `test.fail` line and set its status here.
2. If check 6 fails with requests to another origin, read the `console-and-network.json` attachment of the failing test in `playwright-report/`. A Vercel preview URL injects a toolbar from `vercel.live`; use the production URL, or turn the toolbar off.
3. `BASE_URL=https://<vercel-url> node qa/take-screenshots.mjs` if the README should show the deployed site.
4. By hand, on a real Android phone and a real iPhone: the demo flow, a schedule edit in step 2 (native time picker), "Copy share link", opening that link in another browser, and the browser Back gesture (DEF-03).
5. By hand, in Safari and Firefox on desktop: the demo flow, Tab through Results, and print preview of the action card.
6. By hand, with one screen reader (NVDA with Firefox or VoiceOver with Safari): the demo flow, listening for the headline announcement and the chart descriptions.
7. Open links 7 and 8 of section 6 in a browser and confirm the annex files are listed.
8. Update section 2 (build tested = deployed URL and commit) and the Status column of section 4.

## 9. Fixes and re-test (after the first pass)

The lead agent fixed the defects; the QA agent did not change app code. The fixes are in commit `725ab97`.

| ID | Fix | How it was re-tested |
| --- | --- | --- |
| DEF-01 | The NRCan 17 °C warning and the heat pump caution are shown on the "Program this tonight" card, so they appear on Results and on the printed card. | `03-honesty.spec.ts`, now passing in all 3 projects |
| DEF-02 | The skip link moves focus to the main content without changing the address. | `07-keyboard.spec.ts`, now passing (desktop) |
| DEF-03 | Each step is a browser-history entry. Back returns to the previous step and keeps edits. | `10-error-paths.spec.ts`, now passing in all 3 projects |
| DEF-04 | After a failed download, a successful second try refreshes the page-level weather state. | `10-error-paths.spec.ts`, now passing in all 3 projects. The test for the old workaround was removed because the "Try again" button no longer appears in that case. |
| DEF-05 | The "your minimum" label was moved out of the plot into the chart legend ("Your minimum, 20 °C (dotted)"). | By eye in `docs/screenshots/03-chart.png` (retaken); chart-label overlap test passing |
| DEF-06 | The note under "Suggest a schedule" now states the rule as it is: below the minimum for no more than 1% of home-and-awake hours, with the simulated hours. | Read in the code (`components/BetterStep.tsx`); no automated test |
| DEF-07 | The first sentence of Sources names the fourth label, "a setting of the model itself". The sanity-check ranges (1.5% to 2.5%, 6.0% to 7.0%) have their own rows on Sources and are called "our own reading" on Results. | Read in the code (`lib/sim/assumptions.ts`, `components/SanityCheck.tsx`); axe-core and layout tests passing with the new rows |
| DEF-08 | Results states the baseline next to the headline ("Compared with your schedule now: 22 °C all day, every day"). Sources has a "Schedules and routine" table with the before schedule, the after schedule, the home-and-awake routine and the comfort minimum, each labeled estimate (default) or your input. | Read in the code; layout test updated to expect 7 assumption tables, passing |
| DEF-09 | The share-link decoder and the "Scale it" field use one shared limit of 10,000. | `04-scale-share.spec.ts`, now passing in all 3 projects |
| DEF-10 | A rounding note sits directly under the season averages. | Read in the code; no automated test |

Test changes made with the fixes: the five `test.fail` markers were removed; one obsolete test (the DEF-04 workaround)
was removed; one selector was made exact ("Sanity check" now also names a table on Sources); one expected count went
from 5 to 7 tables.

### Re-test totals

| Run | Target | Commit | Tests | Passed | Failed | Skipped |
| --- | --- | --- | --- | --- | --- | --- |
| Local | static export in `out/`, served on `localhost:4310` | `725ab97` | 252 | 239 | 0 | 13 |
| Deployed | <https://setback-mocha.vercel.app> (Vercel production) | `725ab97` | 252 | 239 | 0 | 13 |

Both runs: 2026-11-15, Chromium via Playwright 1.65.1, projects desktop 1280×800, mobile (Pixel 7 emulation) and
narrow 320×640. The 13 skips are by design (keyboard tests run on desktop only; the touch-target test does not run on
desktop). The deployed run includes the console, network and third-party-request checks and the axe-core scans, so
those results now hold for the production site and not only for the local build.

### Visual restyle (Nov 16)

After the re-test above, the app was restyled (new colours, the Archivo typeface served from the site's own files, a
24-hour temperature band on the landing page and on the action card, a dark panel for the headline result). No
wording, number or behaviour changed. The suite was run again on the local build of the restyled app and on the deployed site
<https://setback-mocha.vercel.app> (commit `b5726bb`): 252 tests, 239 passed, 13 skipped by design, 0 failed, in both runs. That run includes the axe-core contrast checks, the 320 px layout checks, the
keyboard pass and the check that no request goes to another origin. The screenshots in `docs/screenshots/` were retaken.

### Design audit and polish (Nov 16)

A code-level design audit followed the restyle and its findings were fixed in the same pass: the "Step N of 4" label
moved from above the step heading to beside it; callouts and quotes lost their coloured side bars; bordered boxes
inside panels were removed; the plus and minus marks on disclosures are drawn instead of typed; form-panel titles
match the other panel titles; a focus ring no longer changes the corner shape of the control it is on; text selection,
the text caret, checkboxes and scrollbars take the palette; the colours used by the charts and the day band now come
from one file (`lib/palette.ts`) that a unit test keeps equal to the CSS tokens; and the example is computed once
instead of three times. No wording of results, number or behaviour changed. Unit tests: 57 passing. Browser suite on
the local build: 252 tests, 239 passed, 13 skipped by design, 0 failed. Screenshots retaken.

Known and left as is: there is no dark theme; chart text is a fixed 11 to 12 px and does not grow with the browser's
text-size setting; the "Setback" wordmark on the landing page is larger than a usual display size on wide screens, on
purpose.

### Still not tested

Everything in section 7 except the deployed URL still stands: real phones, Safari, Firefox, screen readers, real
printing, real clipboard permission prompts, forced colours, browser zoom, and use without JavaScript. The fixes for
DEF-06, DEF-07, DEF-08 and DEF-10 are wording and content changes that were checked by reading the code and by eye,
not by a dedicated automated test. The manual steps 4 to 7 of section 8 are still to do.
