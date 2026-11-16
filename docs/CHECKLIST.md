# Setback: submission checklist

Green Shift Hacks on Devpost: <https://green-shift-hacks.devpost.com/>. Deadline: Tuesday, Nov 17, 2026, 5:00 PM EST. Target: submitted by 4:00 PM Eastern.

Dylan submits. The AI agent does not submit, record or upload anything.

## Fill these first

The live and repo addresses are filled in. One placeholder is left: replace it everywhere in one search-and-replace pass (in VS Code: Ctrl+Shift+H across the whole folder).

| Placeholder | Replace with | Appears in |
| --- | --- | --- |
| Live app | Done: <https://setback-mocha.vercel.app> | `README.md`, `docs/DEVPOST.md`, `docs/VIDEO_SCRIPT.md`, `docs/SHOTLIST.md` |
| Source code | Done: <https://github.com/DylanRolfe/setback> | `README.md`, `docs/DEVPOST.md` |
| `VIDEO_URL_HERE` | The YouTube video address | `README.md`, `docs/DEVPOST.md`, `docs/SHOTLIST.md`, this file |

Slots only Dylan can fill. Write one true sentence or delete the slot. Do not leave the brackets in.

| Slot | Where |
| --- | --- |
| `[DYLAN: optional one true sentence about your own apartment or residence]` | `docs/DEVPOST.md`, "Inspiration" |
| `[DYLAN: edit the sentence above if you wrote or rewrote parts by hand.]` | `README.md` and `docs/DEVPOST.md`, "AI assistance disclosure" |
| CONFIRM BEFORE SUBMITTING tick list | `README.md` and `docs/DEVPOST.md`, "AI assistance disclosure", and the end of this file |

## Every requirement, and where it is met

Status words: **Done** means it exists in the repo now. **Human step** means only Dylan can do it. **Pending** means another part of the build must finish first.

| # | Requirement | Where it is satisfied (file and section) | Status |
| --- | --- | --- | --- |
| 1 | Complete Devpost project page with a project story | `docs/DEVPOST.md`, "Inspiration" to "AI assistance disclosure" | Text: Done. Human step: paste into Devpost. |
| 2 | All team members listed | `docs/DEVPOST.md`, "Submission fields", Team line. `README.md`, first section. Solo entry: Dylan Rolfe only. | Text: Done. Human step: add yourself as the only team member on Devpost. |
| 3 | Demo video or walkthrough | `docs/VIDEO_SCRIPT.md` (script), `docs/captions.srt` (captions), `docs/SHOTLIST.md` (shots and browser setup) | Script, captions and shot list: Done. Human step: record, upload, add the link. |
| 4 | Source code or clear build instructions | `README.md`, "Run it locally" and "Project structure" | Done: build instructions in `README.md`; public repo at <https://github.com/DylanRolfe/setback>. |
| 5 | Explains the problem | `docs/DEVPOST.md`, "Inspiration" (first paragraph). `README.md`, "The environmental benefit" (first paragraph). | Done |
| 6 | Explains the intended users | `docs/DEVPOST.md`, "Who it is for" | Done |
| 7 | Explains the approach | `docs/DEVPOST.md`, "What it does" and "How we built it". `README.md`, "How the model works". | Done |
| 8 | Explains the expected environmental benefit | `docs/DEVPOST.md`, "Expected environmental benefit" (every input, the result table, the 40-unit estimate, the sanity check). `README.md`, "The environmental benefit" and "Sanity check". `docs/SOURCES.md`, sections 7 and 8. Numbers pinned by `lib/sim/__tests__/example.test.ts`. | Done |
| 9 | Lists the tools used | `docs/DEVPOST.md`, "Built with" and "Tools and data". `README.md`, "Project structure" (stack line) and "Credits". | Done. `docs/QA.md` exists and records the Playwright and axe-core runs. |
| 10 | States the limitations | `docs/DEVPOST.md`, "Limitations". `README.md`, "Limitations". Source list: `LIMITATIONS` in `lib/sim/assumptions.ts`. | Text: Done. In the app: Done, on the live site (Sources and assumptions, "Limits of this model"). |
| 11 | Data permission: only public data with licences that permit reuse, credited | `README.md`, "Data sources and licences" and "Credits". `docs/SOURCES.md`, sections 1 to 6. `public/data/NOTICE.md` (CC BY 4.0 notice for the weather files). No personal data is collected. | Done |
| 12 | Original work created inside the event window (Oct 18 to Nov 17, 2026) | Git history starts Nov 15, 2026 (first commit: "Initial commit from Create Next App"). Pre-existing open-source tools and public datasets are credited in `README.md`, "Credits". | Done: the full history (first commit Nov 15, 2026) is public at <https://github.com/DylanRolfe/setback>. |
| 13 | AI assistance disclosure | `README.md`, "AI assistance disclosure". `docs/DEVPOST.md`, "AI assistance disclosure". `docs/VIDEO_SCRIPT.md`, shot 7. | Text: Done. Human step: tick the CONFIRM BEFORE SUBMITTING items. |
| 14 | Public repo with MIT licence | `LICENSE` (MIT, copyright Dylan Rolfe). `README.md`, "Licence". | Done: public repo <https://github.com/DylanRolfe/setback> with `LICENSE` (MIT). |
| 15 | Public live URL with no login | Static export, no backend, no accounts (`next.config.ts`, `README.md` "Run it locally"). The landing page says "No login. No tracking. Runs in your browser." | Done: <https://setback-mocha.vercel.app> returns the app with no login (checked with a plain HTTP request and by the QA suite on Nov 15). Human step: open it once in a private window yourself. |
| 16 | Screenshots | `README.md`, "Screenshots", expects `docs/screenshots/01-landing.png`, `02-results.png`, `03-chart.png`, `04-action-card.png`, `05-sources.png` | Done: six screenshots in `docs/screenshots/`. Human step: upload them to the Devpost gallery. |
| 17 | Students only, solo allowed | `docs/DEVPOST.md`, Team line (first-year Mechatronics Engineering student, University of Waterloo) | Text: Done. Human step: make sure your Devpost profile says the same. |
| 18 | Submitted before the deadline | Devpost form | Human step: submit by Tue Nov 17, 4:00 PM Eastern. |

## Before you paste: quick consistency check

- [ ] The live app, with "Try the Waterloo example", shows 8.8%, about 150 kg CO2e, 879 m³, 801 m³, 78 m³, and 6.9 of 1,934 hours. If not, the documents are out of date.
- [ ] The "Sanity check" section shows 1.4% against NRCan's "about 2 percent" and 3.3% against CMHC's 6.5%, both with the verdict "below".
- [ ] "Scale it" with 40 shows 3,102 m³ of natural gas (about 3,100 in the documents) and 5,990 kg CO2e.
- [ ] "Week to show" opens on "Week of Jan 26, 2026 (average -15.0 °C outside), coldest week".
- [ ] `npm test` passes (54 unit tests) and, if you want to re-run the browser checks, `npm run qa` passes (252 tests, 13 skipped by design).
- [ ] The button and section names in the app match the names used in `README.md`, `docs/VIDEO_SCRIPT.md` and `docs/SHOTLIST.md`. The names in the documents were checked against the code on Nov 15; check them once more on the live site while you rehearse the video.
- [ ] No `VIDEO_URL_HERE` or `[DYLAN:` text is left in `README.md` or `docs/DEVPOST.md`.

## CONFIRM BEFORE SUBMITTING

These are the "what Dylan reviewed" statements in `README.md` and `docs/DEVPOST.md`. Tick only what is true. Delete or reword anything that is not true, in all three places.

- [ ] I opened the live app and ran the full flow, from the Waterloo example to the share link.
- [ ] I read every source in `docs/SOURCES.md` and opened the quoted NRCan pages to check the quotes. (`docs/SOURCES.md`, section 9, says this review is tracked here.)
- [ ] I read the README and the Devpost text, and they match what the app does.
- [ ] I recorded the demo video myself.
- [ ] I submitted the project on Devpost myself.

## Remaining human steps, in order

1. Done by the agent on Nov 15 with Dylan's go-ahead: public repo <https://github.com/DylanRolfe/setback> with the full history, deployed at <https://setback-mocha.vercel.app>. Still for Dylan: open the live address in a private window and run the Waterloo example.
2. Replace the `VIDEO_URL_HERE` placeholder in one pass after step 3. The live and repo addresses are already filled in.
3. Record the video from `docs/VIDEO_SCRIPT.md` (setup in `docs/SHOTLIST.md`) around Tue Nov 17, 11:00 AM. Upload it to YouTube with `docs/captions.srt` and nudge the caption timings.
4. Paste `docs/DEVPOST.md` into Devpost: the fields at the top into their own boxes, the rest into the project story. Add the screenshots and the three links. Add yourself as the only team member. Submit by Tue Nov 17, 4:00 PM Eastern.
5. Tick the CONFIRM BEFORE SUBMITTING items above, and make the lists in `README.md` and `docs/DEVPOST.md` say the same thing. Do this before the final paste in step 4, so the published text is true.
