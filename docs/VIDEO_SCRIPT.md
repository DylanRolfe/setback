# Setback: demo video script

Notes for Dylan:

- Length: 344 spoken words, about 2 minutes 50 seconds at a natural pace (about 2.3 words per second, with numbers counted as the words you actually say).
- **The timings in `docs/captions.srt` are estimates. Nudge them after recording** so each caption matches your voice. In YouTube Studio you can drag each caption in the subtitle editor after uploading the file.
- The SAY lines below match `docs/captions.srt` word for word. If you change a word here, change it in the captions too.
- Every number you say is from the documented example in `docs/SOURCES.md` (sections 7 and 8) or from the weather file. Do not round them differently or add new ones.
- Say "CO2e" as "C O two E". Say "8.8" as "eight point eight".
- Record the screen on the live app at https://setback-mocha.vercel.app. Browser setup and the exact state for each shot are in `docs/SHOTLIST.md`.
- The shots follow the order of the "4 Results" page from top to bottom, so you only ever scroll down.

Each shot has two parts: ON SCREEN (what to click and show) and SAY (the exact words).

---

## Shot 1. Landing (0:00 to 0:15)

**ON SCREEN:** The landing page at https://setback-mocha.vercel.app, with the heading "Setback" and the sentence "See exactly how much energy and CO2e your heating schedule wastes, and get a better one to program tonight." Rest the mouse near the button "Try the Waterloo example". Do not click yet.

**SAY:**

> We are often told to turn the heat down, but rarely when, by how much, or what it saves. Setback works that out for one home and gives you a schedule to set tonight.

## Shot 2. The example, the headline and the table (0:16 to 0:58)

**ON SCREEN:** Click "Try the Waterloo example". The app opens "4 Results". Pause for a second so the page settles. Point at the headline: "This schedule cuts your simulated heating energy by 8.8% (about 150 kg CO2e this season) under these assumptions." Then scroll to "Before and after" and point along the row "Natural gas, m³": 879, 801, 78.

**SAY:**

> I click Try the Waterloo example. It is an illustrative example, not a real user: a Waterloo apartment with a gas furnace, at 22 degrees all day. The suggested schedule: 21 degrees when home and awake, 18 when asleep or out. The result: simulated heating energy falls 8.8 percent, about 150 kilograms of CO2e this season, under these assumptions. Gas use falls from 879 to 801 cubic metres. That is 78 cubic metres not burned, for one apartment, in one season.

## Shot 3. Comfort check and the coldest week (0:59 to 1:28)

**ON SCREEN:** Scroll to "Comfort check". Point at the line "After, better schedule: below 20 °C for 6.9 of 1,934 hours at home and awake". Then scroll to "One week, hour by hour". Leave "Week to show" on its default: "Week of Jan 26, 2026 (average -15.0 °C outside), coldest week". In the top chart, trace one weekday night along the solid line "Inside, better schedule": it falls after 11:00 PM. In the lower chart, "Heat delivered each hour (kW), simulated", show the solid line at zero while the room cools, then the warm-up from 5:00 AM.

**SAY:**

> Comfort check: the room is below 20 degrees for 6.9 of the 1,934 home-and-awake hours. This is the coldest week, the week of January 26, averaging minus 15 outside. At night the indoor temperature drifts down toward 18 degrees and the heating power is off while it falls. A cooler room loses less heat. That is the saving.

## Shot 4. Sanity check (1:29 to 1:53)

**ON SCREEN:** Scroll past "Why this works" to "Sanity check". In the card "Natural Resources Canada rule of thumb", point at the quote ("A drop of 1°C (2°F) over an eight-hour period can save about 2 percent on your heating energy consumption."), then at "This model: 1.4%" and the verdict "which is below NRCan's". Then point at the card "Canada Mortgage and Housing Corporation test house" (6.5% published, 3.3% from the model, "below") and the line "Why the model leans low".

**SAY:**

> Now the honest part. Natural Resources Canada's rule of thumb is about 2 percent for a drop of 1 degree over eight hours. My model gives 1.4 percent. It lands below that, and below a CMHC test house figure too, so this estimate leans low. I report that instead of tuning the model.

## Shot 5. Scale it (1:54 to 2:11)

**ON SCREEN:** Scroll to "Scale it". Click the field "How many homes like this?", clear it and type 40. A box labeled "estimate" appears. Point at "Natural gas saved" (the screen shows 3,102 m³, which the script rounds to about 3,100) and "Emissions saved: 5,990 kg CO2e per season".

**SAY:**

> In Scale it, I enter 40 homes like this. That is about 3,100 cubic metres of gas and about 5,990 kilograms of CO2e per season. That is straight multiplication, assuming identical homes.

## Shot 6. Action card and share link (2:12 to 2:25)

**ON SCREEN:** Scroll to the card "Program this tonight". Point down the two lists: "Weekdays (Mon to Fri)" 5:00 AM 21 °C, 8:30 AM 18 °C, 3:30 PM 21 °C, 11:00 PM 18 °C, and "Weekend (Sat, Sun)" 7:00 AM 21 °C, 11:30 PM 18 °C. Hover over "Print this card" without clicking. Click "Copy share link" and show the message "Link copied. Anyone who opens it sees this same scenario."

**SAY:**

> The card, Program this tonight, lists the exact times and temperatures. I can print it or copy a share link. The link holds every input. There is no backend.

## Shot 7. Sources, limits and disclosure (2:26 to 2:51)

**ON SCREEN:** Click the button "Sources and assumptions" at the bottom of the page (it is also in the step bar at the top). Scroll slowly through "What the model uses" so the kind labels ("cited", "calculated", "estimate") and the source links are visible. Keep scrolling to "Limits of this model" and stop there for the last two sentences.

**SAY:**

> Sources and assumptions lists every constant, its source, and which values are estimates. The limits: this is a simulation, not a measured saving, from a single-zone model with estimated home values and one past winter. I built Setback with an AI coding agent, Claude Fable 5.2 in Claude Code, and the README lists what I decided myself.

---

## Numbers spoken, and where each one comes from

| Spoken | Source |
| --- | --- |
| 22 degrees all day (before) | `docs/SOURCES.md` section 8, "Before" |
| 21 degrees and 18 degrees (after) | Section 8, "After (suggested)" |
| 8.8 percent, 150 kilograms of CO2e | Section 8, "Saved" column |
| 879 to 801 cubic metres, 78 cubic metres | Section 8, natural gas row |
| Below 20 degrees for 6.9 of 1,934 hours | Section 8, comfort row |
| Week of January 26, minus 15 outside | Computed from the Waterloo weather file (coldest Monday-to-Sunday week, mean -15.0 °C) |
| About 2 percent for 1 degree over eight hours | NRCan, *Keeping the Heat In*, section 9.1.2 (`docs/SOURCES.md` section 3) |
| 1.4 percent | Section 7, NRCan test case |
| 40 homes, about 3,100 cubic metres, about 5,990 kilograms | Section 8, scaled linearly to 40 identical units |

The simulated values (every row except the NRCan figure and the coldest week) are pinned by `lib/sim/__tests__/example.test.ts`. The coldest week is worked out by the app from the weather file, so check it on screen before recording.

## If something on screen does not match

Stop and check before recording. The numbers above should appear exactly as written when the example is loaded. If the app shows different numbers, the model or the data changed after this script was written, and the script, the captions, the README and the Devpost text must all be updated to match the app.
