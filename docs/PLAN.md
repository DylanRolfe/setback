# Setback: build plan

Green Shift Hacks (Devpost). Solo entry by Dylan Rolfe. Judged on one criterion:
**Environmental Impact: how clearly the project reduces waste, emissions, resource use, or environmental harm.**
Every decision below is made to make the environmental benefit clearer, more specific and more credible.

## 1. What we are building

A static web app that turns "turn the heat down" into a specific thermostat schedule with a computed saving.
The user picks a city, a home type and a heating type, enters the schedule they use now, tries a better one,
and sees before-versus-after heating energy, natural gas, CO2e and a comfort check for one real heating season.

Out of scope: accounts, database, smart-thermostat or utility APIs, meter upload, cooling, multi-zone models,
hardware, chatbot, gamification, whole-life carbon footprints.

## 2. Honesty rules (apply to code, UI and docs)

1. No invented statistics, testimonials, studies or quotes.
2. Every number is (a) computed by the model from documented inputs, (b) taken from a cited public source listed in
   `docs/SOURCES.md` and shown in the app's "Sources and assumptions" panel, or (c) labeled "estimate" with its assumptions.
3. Quotes from sources are character-exact and were read on the live page before being used.
4. Results are called simulations under stated assumptions, never measured savings.
5. AI assistance is disclosed in the README and the Devpost text.

## 3. Stack

- Next.js 16 (App Router) + TypeScript, `output: "export"` (static HTML/CSS/JS), Tailwind CSS 4, hosted on Vercel.
- No backend, no database, no LLM, no analytics, no cookies, no runtime API calls.
- Simulation is a pure TypeScript module in `lib/sim` that runs in the browser.
- Charts are hand-written SVG, each with a text summary and a data-table alternative.
- Tests: Vitest for `lib/sim`; Playwright + axe-core for the deployed site (QA).

## 4. File tree

```
app/
  layout.tsx            page shell, metadata, skip link
  page.tsx              renders <SetbackApp />
  globals.css           Tailwind + design tokens + focus styles + print styles
components/             all UI (client components)
lib/
  sim/
    types.ts            shared types (SimInput, SimResult, WeeklySchedule, ...)
    model.ts            1R1C exact-step model, thermostat, simulate(), compare()
    schedule.ts         weekly setpoints, routine, suggestSchedule(), clock helpers
    heating.ts          gas / electric / heat pump input energy, COP curve
    weather.ts          local time from the weather file, week list
    factors.ts          cited emission factors, energy content, prices, sources registry
    presets.ts          cities, home presets (estimates), heating defaults, default routine
    scenario.ts         Scenario <-> SimInput, run before/after, NRCan sanity check
    __tests__/          Vitest tests
  share.ts              encode/decode the scenario in the URL hash
public/data/
  weather-<city>.json   hourly outdoor temperature for one season (Open-Meteo, CC BY 4.0)
scripts/
  fetch-weather.mjs     build-time download of the weather files
docs/
  PLAN.md  SOURCES.md  QA.md  DEVPOST.md  VIDEO_SCRIPT.md  captions.srt  SHOTLIST.md  CHECKLIST.md
```

## 5. The model

Single zone, one resistance and one capacitance (1R1C):

```
C * dT/dt = Q_heat - UA * (T - T_out)
```

- `T` indoor temperature, `T_out` outdoor temperature (hourly data, held constant within each hour).
- `UA` heat-loss coefficient in W/K; `C` effective thermal capacitance in J/K.
- `Q_heat` is the heater output: `heaterCapacityW` when the thermostat calls for heat, otherwise 0.
- Thermostat: on/off with a deadband (default 0.5 °C wide). On below setpoint - 0.25, off above setpoint + 0.25.
- Time step: 60 s sub-steps inside each hour of weather data, over Oct 1 to Apr 30 (5,088 hours).
- Each sub-step uses the exact solution of the equation for constant inputs
  (`T` relaxes toward `T_out + Q_heat/UA` with time constant `C/UA`), so energy is conserved to rounding error.
- Heating systems: gas furnace (`fuel = heat / efficiency`), electric baseboard (`electricity = heat`),
  air-source heat pump (`electricity = heat / COP(T_out)`, COP never below 1).
- Emissions: gas m3 x kg CO2e per m3, or kWh x grid kg CO2e per kWh for the province.
- Comfort check: hours when the person is home and awake (from their routine) and the indoor temperature is below
  their chosen minimum.

Why a setback saves energy: heat loss is proportional to (indoor - outdoor). A cooler room for some hours loses
less heat in total. Warming it back up only replaces the heat stored in the building's mass, which is less than
the loss that was avoided. The simulated indoor-temperature trace shows this directly.

## 6. Interfaces (source of truth is `lib/sim/types.ts`)

```ts
simulate(input: SimInput): SimResult            // one schedule, one season
compare(before: SimResult, after: SimResult): Comparison
suggestSchedule(routine, { homeC, setbackC, preheatMin }): WeeklySchedule
buildWeeklySetpoints(schedule): Float64Array    // setpoint for each minute of the week
listWeeks(weather): WeekInfo[]                  // Monday-to-Sunday weeks for the chart
```

Scenario (the UI state that is also encoded in the URL hash):

```ts
interface Scenario {
  v: 1;
  cityId: string;                 // "waterloo" | "toronto" | "montreal" | "calgary" | "vancouver"
  homeId: string;                 // "apartment" | "townhouse" | "detached"
  uaWPerK: number; cMJPerK: number; heaterKW: number;   // editable estimates
  heating: "gas" | "electric" | "heatpump";
  furnaceEfficiencyPct: number;
  routine: Routine;
  comfortMinC: number;
  before: WeeklySchedule;
  after: WeeklySchedule;
  units: number;                  // "Scale it" multiplier (1 = off)
  price: number | null;           // optional energy price for the fuel in use
}
```

Weather file schema (`public/data/weather-<city>.json`): see `WeatherSeason` in `lib/sim/types.ts`.
UTC start time + run-length UTC offsets + 5,088 hourly temperatures + source, licence and attribution.

## 7. Who does what

| Agent | Owns | Notes |
| --- | --- | --- |
| A. Lead / Architect | `docs/PLAN.md`, integration, scope, final calls | Also wrote the core of `lib/sim` so the interfaces were real before the UI started. |
| B. Simulation and Data | `lib/sim`, `public/data`, `docs/SOURCES.md` | Two research sub-agents read every cited value on the live source; the lead spot-checked the emission factors. |
| C. Frontend / UX + Accessibility | `app/`, `components/` | 3-step flow, results, chart, action card, share link, Sources panel. |
| D. QA | `docs/QA.md` | Playwright (desktop + mobile), axe-core, keyboard pass on the deployed URL. |
| E. Submission | `README.md`, `docs/DEVPOST.md`, `VIDEO_SCRIPT.md`, `captions.srt`, `SHOTLIST.md`, `CHECKLIST.md` | Paste-ready text. The human submits. |

## 8. Checkpoints (Eastern time)

| Checkpoint | When | Done means |
| --- | --- | --- |
| C0 | Sun Nov 15, 11:00 PM | PLAN.md; scaffold builds; Waterloo weather JSON saved; factor sources identified |
| C1 | Mon Nov 16, 12:00 PM | simulation passes all tests; results appear in a bare UI |
| DEMO GATE | Mon Nov 16, 6:00 PM | full demo flow works on the live Vercel URL, desktop and phone, no console errors |
| C2 | Mon Nov 16, 11:00 PM | QA fixes merged; accessibility checks pass; Sources panel complete |
| C3 | Tue Nov 17, 10:00 AM | all docs complete; final QA on production |
| FINISH | Tue Nov 17, 2:00 PM | frozen except critical fixes |

No polish or extras before the DEMO GATE. If at risk, cut in this order: extra cities, heat pump, scale toggle.

## 9. Human-only steps

1. Create the public GitHub repo `setback` and import it into Vercel (or approve the agent's deploy).
2. Record the 2 to 3 minute video from `docs/VIDEO_SCRIPT.md`; upload to YouTube with `docs/captions.srt`.
3. Paste `docs/DEVPOST.md` into Devpost, add screenshots and links, and submit. The agent does not submit.
