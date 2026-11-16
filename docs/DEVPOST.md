# Setback: Devpost text

Notes for Dylan (do not paste this block): the live and repo addresses are filled in; replace `VIDEO_URL_HERE` after you upload the video. Fill or delete every `[DYLAN: ...]` slot. Tick the CONFIRM BEFORE SUBMITTING list at the bottom. The "Submission fields" go into their own Devpost boxes. Everything from "Inspiration" down goes into the project story. The story is about 1,500 words because every input and source of the example is listed. If you want it shorter, cut "Challenges", "What we learned" and "What's next" first. Do not cut "Expected environmental benefit", "Limitations" or "AI assistance disclosure".

## Submission fields

- **Project name:** Setback
- **Tagline (110 characters):** See how much heating energy and CO2e your thermostat schedule wastes, and get a better one to program tonight.
- **Built with:** next.js, react, typescript, tailwindcss, vitest, playwright, axe-core, svg, vercel, open-meteo
- **Try it out:** https://setback-mocha.vercel.app
- **Source code:** https://github.com/DylanRolfe/setback
- **Demo video:** VIDEO_URL_HERE
- **Team:** Dylan Rolfe (solo). First-year Mechatronics Engineering student, University of Waterloo, Ontario, Canada.

---

## Inspiration

**The problem.** Keeping a home at full comfort temperature while everyone is asleep or out burns fuel that nobody benefits from. The usual advice, "turn the heat down", is too vague to act on.

Natural Resources Canada's rule of thumb is: "A drop of 1°C (2°F) over an eight-hour period can save about 2 percent on your heating energy consumption." ([Keeping the Heat In, section 9.1.2](https://www.canada.ca/en/environment-climate-change/services/energy-efficiency/home-energy-efficiency/keeping-heat.html)) It does not say which times to program, what that adds up to for your home, or whether you will wake up cold. Setback turns the advice into one specific schedule with a number attached, and says how sure that number is.

[DYLAN: optional one true sentence about your own apartment or residence]

## What it does

Pick a city, a home type and a heating type (gas furnace, electric baseboard or heat pump). Enter the thermostat schedule you use now, then click "Suggest a schedule" or write your own. Setback simulates both over one real heating season of hourly weather and shows:

- the simulated saving in energy, gas or electricity, and kg CO2e
- a comfort check: hours below your minimum while home and awake
- a chart of the coldest week: outdoor temperature, indoor temperature, heating power
- a sanity check against published figures
- "Scale it", for a number of identical homes
- a printable card, "Program this tonight", and a share link that holds every input

"Try the Waterloo example" runs the whole flow in one click.

## Who it is for

A renter or student in a cold Canadian city who controls a thermostat. No account, smart thermostat or utility data is needed.

## How we built it

- **Model:** a single-zone thermal model, `C * dT/dt = Q_heat - UA * (T - T_out)`, with an on/off thermostat, run in 60-second steps over 5,088 hours of weather. Each step uses the exact solution of the equation, so energy balances to rounding error.
- **Data:** hourly temperatures for five Canadian cities, downloaded once at build time. Emission factors from Canada's National Inventory Report.
- **App:** a static site. The simulation runs in the browser. No backend, database, LLM, analytics, cookies or runtime API calls.
- **Tests:** 54 unit tests on the simulation, including the example below, and 252 browser checks (Playwright and axe-core) on desktop, phone and 320 px widths, run on the live site. The first QA pass found ten minor defects; all are fixed and listed in `docs/QA.md`.

## Expected environmental benefit

Less gas burned (or electricity used) for space heating, and less CO2e, with no new hardware. Here is one worked example. **It is a simulation under stated assumptions, not a measured saving.**

Every input:

- **Weather:** Waterloo, Ontario, hourly, Oct 1, 2025 to Apr 30, 2026. [Open-Meteo Historical Weather API](https://open-meteo.com/en/docs/historical-weather-api), CC BY 4.0. Reanalysis data, not a weather-station record.
- **Home:** apartment preset, 70 m², heat loss UA 80 W/K, thermal mass C 11.6 MJ/K, heater 5.8 kW. Estimates, not a measured home. UA was chosen so the simulated seasonal heat output sits inside the range in NRCan's [Comprehensive Energy Use Database](https://oee.nrcan.gc.ca/corporate/statistics/neud/dpa/menus/trends/comprehensive/trends_res_on.cfm) for Ontario apartments.
- **Heating:** gas furnace, 95% efficiency, the minimum for furnaces made since July 3, 2019 ([Energy Efficiency Regulations, s. 259](https://laws-lois.justice.gc.ca/eng/regulations/SOR-2016-311/section-259.html)).
- **Emissions:** 1.931 kg CO2e per m³ of gas in Ontario, combustion only. Calculated from [NIR 1990–2024, Annex 6](https://data-donnees.az.ec.gc.ca/data/substances/monitor/canada-s-official-greenhouse-gas-inventory/D-Emission-Factors/?lang=en) (1,921 g CO2, 0.037 g CH4, 0.035 g N2O per m³; warming potentials 28 and 265). Energy content 38.39 MJ per m³ ([ECCC](https://www.canada.ca/en/environment-climate-change/services/climate-change/pricing-pollution-how-it-will-work/output-based-pricing-system/federal-greenhouse-gas-offset-system/emission-factors-reference-values.html)).
- **Routine (illustrative example, not a real user):** weekdays up 7:00, out 8:30 to 17:30, bed 23:00. Weekends up 9:00, bed 23:30. Comfort minimum 20 °C.
- **Before:** 22 °C all day, every day.
- **After (the app's suggestion):** weekdays 5:00 AM 21 °C, 8:30 AM 18 °C, 3:30 PM 21 °C, 11:00 PM 18 °C. Weekends 7:00 AM 21 °C, 11:30 PM 18 °C.

Result, per apartment, per season:

| | Before | After | Saved |
| --- | --- | --- | --- |
| Gas energy | 9,373 kWh | 8,546 kWh | 827 kWh (8.8%) |
| Natural gas | 879 m³ | 801 m³ | 78 m³ |
| CO2e | 1,697 kg | 1,548 kg | 150 kg |

Comfort check: 6.9 of 1,934 home-and-awake hours below 20 °C.

**Scaled estimate.** For 40 identical units (for example a residence floor): about 3,100 m³ of gas and about 5,990 kg CO2e per season. This is a straight multiplication. It assumes identical homes and schedules.

**Sanity check.** The app runs two published cases through the same model:

| Case | Published | This model |
| --- | --- | --- |
| 1 °C lower for eight hours a night | NRCan: "about 2 percent" | 1.4% |
| 22 °C to 18 °C, 11 p.m. to 6 a.m. | [CMHC test house, Ottawa](https://assets.cmhc-schl.gc.ca/sf/project/archive/publications/rhse-penrse/63816.pdf): 6.5% | 3.3% |

The model lands **below both**. The likely reasons: it leaves out free heat from the sun, people and appliances, and its single thermal mass cools slowly. Both make the percentage lean low. The model was not tuned up to match, because that would need assumptions that cannot be cited. Every constant and quote is in `docs/SOURCES.md` and in the app's "Sources and assumptions" view.

## Tools and data

- **Tools:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Vitest, hand-written SVG charts, Playwright and axe-core for checks, Vercel. Started from the open-source `create-next-app` template. Typeface: Archivo by Omnibus-Type (SIL Open Font License), served from the site itself.
- **Data:** Weather data by [Open-Meteo.com](https://open-meteo.com/) (CC BY 4.0). Emission factors and statistics from Environment and Climate Change Canada and Natural Resources Canada (contains information licensed under the [Open Government Licence – Canada](https://open.canada.ca/en/open-government-licence-canada)). Guidance and comparison figures from Natural Resources Canada and CMHC, with credit. Price pointers: Ontario Energy Board.
- **Licences:** code is MIT, weather files are CC BY 4.0. Only public data with terms that permit reuse is used. No personal data is collected.

## Challenges

- **The model lands below published figures.** One thermal mass makes the room cool slowly (time constants of 25 to 40 hours), which limits the simulated saving. The app shows the gap instead of hiding it, and the model was left untuned.
- **Comfort.** The warm-up time had to be chosen by simulation: the shortest of 30 to 180 minutes that keeps the room below the comfort minimum for at most 1% of home-and-awake hours.
- **Daylight saving time** made hourly local time tricky, so each weather file carries its own UTC offsets.
- **Sources move.** *Keeping the Heat In* is an NRCan guide now published under an Environment and Climate Change Canada address, so the quotes were re-checked on the live page.

## What we learned

- A model can balance energy exactly and still disagree with published figures. The honest move is to report the gap.
- The same schedule saves very different CO2e depending on the heat source. Quebec's grid is 2.6 g CO2e per kWh, against 73 in Ontario. With electric heat in Montreal the schedule saves energy but almost no CO2e, and the app shows that plainly.

## Limitations

- These are simulations, not measured savings. Nobody's meter was read.
- The home is one zone with estimated heat loss (UA) and thermal mass (C). Real homes have warm and cold rooms, and results depend on those estimates.
- Free heat from the sun, people and appliances, and heat shared with neighbours, are not modeled. This makes the percentage lean low.
- The heat pump curve is approximate and backup heat is not modeled, so heat pump savings may be overstated. NRCan advises setbacks of no more than 2 °C for heat pumps.
- Humidity and how warm a room feels are not modeled. NRCan advises not going below 17 °C.
- Furnace fans, pilot lights and duct losses are not counted. Gas emissions are combustion only. Grid emissions use a yearly provincial average.
- The weather is one past heating season. Another winter changes the totals.
- Nothing is saved unless the schedule is programmed and left running. Renters who cannot control their thermostat cannot act on it. "Scale it" assumes identical homes and schedules.

## What's next

Ideas, not built yet: compare the model with real meter data from volunteers who agree to share it; add solar and internal heat gains if the inputs can be cited; add more cities and more than one winter.

## AI assistance disclosure

I built Setback using an AI coding agent (Claude Fable 5.2, in Claude Code) with sub-agents for research, frontend, QA and submission text. The agent and its sub-agents wrote the code, the tests and the first drafts of these documents from my project brief. No AI model runs inside the product.

[DYLAN: edit the sentence above if you wrote or rewrote parts by hand.]

**What I decided:** the idea and the target user; the one impact to target (wasted space-heating energy and CO2e); the model (transparent single-zone 1R1C, real hourly weather, on/off thermostat, gas furnace, electric baseboard or heat pump); the demo flow; what is out of scope (accounts, databases, smart-thermostat or utility APIs, cooling, multi-zone, hardware, chatbots, gamification); the stack (Next.js static export on Vercel, TypeScript, no backend, no LLM in the product); the honesty rules and the limitations to state; and that I record the video and submit myself.

**What I reviewed:**

CONFIRM BEFORE SUBMITTING (Dylan: tick only what is true, delete what is not, then delete this line and the boxes)

- [ ] I opened the live app and ran the full flow, from the Waterloo example to the share link.
- [ ] I read every source in `docs/SOURCES.md` and opened the quoted NRCan pages to check the quotes.
- [ ] I read the README and this text, and they match what the app does.
- [ ] I recorded the demo video myself.
