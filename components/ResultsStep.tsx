"use client";

import type { ReactNode } from "react";
import {
  cityById,
  DEADBAND_C,
  heaterCapacityW,
  homeById,
  SOURCES,
  SUGGEST_COMFORT_SHARE,
  type ComfortCheck,
  type Scenario,
  type ScenarioRun,
  type WeatherSeason,
} from "@/lib/sim";
import { describeSchedule } from "@/lib/sim";
import { MAX_UNITS } from "@/lib/share";
import { ActionCard } from "./ActionCard";
import { NumberField } from "./fields";
import { CO2e, ExtLink, fmtHours, fmtInt, fmtKg, fmtMoney, fmtNum, fmtPct, fmtSetpoint, fmtTemp } from "./format";
import { HeadlineSentence } from "./Headline";
import { SanityCheck } from "./SanityCheck";
import { StepFrame, WeatherNotice } from "./StepFrame";
import { headlineParts, sameSchedule, type RunOutcome, type View } from "./shared";
import type { WeatherState } from "./useWeather";
import { WeekCharts } from "./WeekCharts";

interface ResultsStepProps {
  scenario: Scenario;
  update: (fn: (s: Scenario) => Scenario) => void;
  weatherState: WeatherState;
  outcome: RunOutcome;
  go: (view: View) => void;
}

interface TableRow {
  key: string;
  label: ReactNode;
  before: string;
  after: string;
  saved: string;
}

/** "827" when something was saved, "12 more" when the better schedule uses more. */
function savedText(saved: number, format: (x: number) => string): string {
  const shown = format(Math.abs(saved));
  const isZero = format(0) === shown;
  if (saved >= 0 || isZero) return shown;
  return `${shown} more`;
}

function ComparisonTable({ scenario, run, weather }: { scenario: Scenario; run: ScenarioRun; weather: WeatherSeason }) {
  const b = run.before.totals;
  const a = run.after.totals;
  const c = run.comparison;
  const isGas = scenario.heating === "gas";
  const rows: TableRow[] = [
    {
      key: "energy",
      label: isGas ? "Heating energy, kWh" : "Heating energy (electricity), kWh",
      before: fmtInt(b.inputEnergyKWh),
      after: fmtInt(a.inputEnergyKWh),
      saved: savedText(c.energySavedKWh, fmtInt),
    },
  ];
  if (isGas) {
    rows.push({
      key: "gas",
      label: "Natural gas, m³",
      before: fmtInt(b.gasM3),
      after: fmtInt(a.gasM3),
      saved: savedText(c.gasSavedM3, fmtInt),
    });
  }
  rows.push({
    key: "co2e",
    label: (
      <>
        Emissions, kg <CO2e />
      </>
    ),
    before: fmtKg(b.co2eKg),
    after: fmtKg(a.co2eKg),
    saved: savedText(c.co2eSavedKg, fmtKg),
  });
  if (b.costCad !== null && a.costCad !== null && c.costSavedCad !== null) {
    rows.push({
      key: "cost",
      label: "Cost at your price",
      before: fmtMoney(b.costCad),
      after: fmtMoney(a.costCad),
      saved: savedText(c.costSavedCad, fmtMoney),
    });
  }

  return (
    <div className="table-scroll" tabIndex={0} role="region" aria-label="Before and after comparison">
      <table className="table">
        <caption>
          One simulated heating season, {weather.seasonLabel}. Before is your schedule now. After is the better
          schedule.
        </caption>
        <thead>
          <tr>
            <th scope="col">Measure</th>
            <th scope="col" className="right">
              Before
            </th>
            <th scope="col" className="right">
              After
            </th>
            <th scope="col" className="right">
              Saved
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th scope="row" className="font-normal">
                {row.label}
              </th>
              <td className="right">{row.before}</td>
              <td className="right">{row.after}</td>
              <td className="right font-semibold">{row.saved}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PriceInput({ scenario, update }: Pick<ResultsStepProps, "scenario" | "update">) {
  const isGas = scenario.heating === "gas";
  const province = cityById(scenario.cityId).province;
  return (
    <NumberField
      label={
        isGas
          ? "Your energy price (optional), in cents per cubic metre of gas"
          : "Your energy price (optional), in cents per kWh of electricity"
      }
      value={scenario.priceCents}
      min={0}
      max={1000}
      allowBlank
      placeholder="No price"
      inputClassName="max-w-[12rem]"
      onCommit={(v) => update((s) => ({ ...s, priceCents: v }))}
      hint={
        isGas ? (
          <>
            The price is your own input. Look for the price per cubic metre on your gas bill. In Ontario, see{" "}
            <ExtLink href={SOURCES.oebGas.url}>
              {SOURCES.oebGas.publisher}: {SOURCES.oebGas.title}
            </ExtLink>
            . Cost is shown only when you type a price.
          </>
        ) : (
          <>
            The price is your own input. Look for the price per kWh on your electricity bill.{" "}
            {province === "ON" ? "For Ontario: " : "For comparison, Ontario prices: "}
            {SOURCES.oebElectricity.detail} (
            <ExtLink href={SOURCES.oebElectricity.url}>
              {SOURCES.oebElectricity.publisher}: {SOURCES.oebElectricity.title}
            </ExtLink>
            ). Cost is shown only when you type a price.
          </>
        )
      }
    />
  );
}

function comfortLine(name: string, c: ComfortCheck, minC: number): ReactNode {
  if (c.homeAwakeHours <= 0 || c.lowestHomeAwakeC === null) {
    return (
      <>
        <strong>{name}:</strong> your routine has no hours at home and awake, so there is nothing to check.
      </>
    );
  }
  const share = (c.hoursBelowMin / c.homeAwakeHours) * 100;
  return (
    <>
      <strong>{name}:</strong> below {fmtSetpoint(minC)} °C for {fmtHours(c.hoursBelowMin)} of{" "}
      {fmtInt(c.homeAwakeHours)} hours at home and awake ({fmtPct(share)}%). Lowest simulated temperature in those
      hours: {fmtTemp(c.lowestHomeAwakeC)} °C.
    </>
  );
}

function ComfortVerdict({ c, minC }: { c: ComfortCheck; minC: number }) {
  if (c.homeAwakeHours <= 0) return null;
  const allowedPct = SUGGEST_COMFORT_SHARE * 100;
  if (c.hoursBelowMin <= 0) {
    return (
      <p>
        <strong>Comfort check passed.</strong> With the better schedule the simulated room never drops below{" "}
        {fmtSetpoint(minC)} °C while you are home and awake.
      </p>
    );
  }
  if (c.hoursBelowMin <= SUGGEST_COMFORT_SHARE * c.homeAwakeHours) {
    return (
      <p>
        <strong>Comfort check passed, with a few cool hours.</strong> With the better schedule the simulated room is
        below {fmtSetpoint(minC)} °C for no more than {fmtNum(allowedPct)}% of the hours you are home and awake. That
        is the limit this tool uses for its own suggestions.
      </p>
    );
  }
  return (
    <p>
      <strong>Comfort check not passed.</strong> With the better schedule the simulated room is below{" "}
      {fmtSetpoint(minC)} °C for more than {fmtNum(allowedPct)}% of the hours you are home and awake. In step 3,
      start the warm-up earlier or use a smaller drop in temperature.
    </p>
  );
}

function WhyItWorks({ run }: { run: ScenarioRun }) {
  const outC = run.before.meanOutdoorC;
  const gapBefore = run.before.meanIndoorC - outC;
  const gapAfter = run.after.meanIndoorC - outC;
  return (
    <div className="grid gap-3">
      <p>
        Heat leaks out of a home faster when the gap between inside and outside is bigger. A home that is cooler for
        some hours loses less heat in total, even after it warms back up. Warming up only puts back the heat stored
        in the building itself, which is less than the loss that was avoided.
      </p>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Average temperatures and heat lost">
        <table className="table">
          <caption>Season averages from this simulation</caption>
          <thead>
            <tr>
              <th scope="col">Measure</th>
              <th scope="col" className="right">
                Before
              </th>
              <th scope="col" className="right">
                After
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" className="font-normal">
                Average temperature inside, °C
              </th>
              <td className="right">{fmtTemp(run.before.meanIndoorC)}</td>
              <td className="right">{fmtTemp(run.after.meanIndoorC)}</td>
            </tr>
            <tr>
              <th scope="row" className="font-normal">
                Average temperature outside, °C
              </th>
              <td className="right">{fmtTemp(outC)}</td>
              <td className="right">{fmtTemp(run.after.meanOutdoorC)}</td>
            </tr>
            <tr>
              <th scope="row" className="font-normal">
                Average gap between inside and outside, °C
              </th>
              <td className="right">{fmtTemp(gapBefore)}</td>
              <td className="right">{fmtTemp(gapAfter)}</td>
            </tr>
            <tr>
              <th scope="row" className="font-normal">
                Heat lost through the walls, windows and air leaks, kWh
              </th>
              <td className="right">{fmtInt(run.before.balance.heatLostKWh)}</td>
              <td className="right">{fmtInt(run.after.balance.heatLostKWh)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        In this simulation the average gap goes from {fmtTemp(gapBefore)} °C to {fmtTemp(gapAfter)} °C, and the heat
        lost over the season goes from {fmtInt(run.before.balance.heatLostKWh)} kWh to{" "}
        {fmtInt(run.after.balance.heatLostKWh)} kWh. Each number is rounded on its own, so the gap can differ by 0.1 °C
        from the difference of the two temperatures shown.
      </p>
    </div>
  );
}

function ScaleIt({ scenario, run, update }: { scenario: Scenario; run: ScenarioRun; update: ResultsStepProps["update"] }) {
  const n = scenario.units;
  const c = run.comparison;
  const isGas = scenario.heating === "gas";
  return (
    <div className="grid gap-3">
      <NumberField
        label="How many homes like this?"
        value={n}
        min={1}
        max={MAX_UNITS}
        step={1}
        integer
        inputClassName="max-w-[10rem]"
        onCommit={(v) => {
          if (v !== null) update((s) => ({ ...s, units: v }));
        }}
        hint="For example, the units on one residence floor. Keep 1 for just your home."
      />
      {n > 1 ? (
        <div className="callout">
          <p>
            <span className="badge">estimate</span> Linear scaling estimate: assumes {fmtInt(n)} identical homes and
            schedules.
          </p>
          <ul className="num mt-2 grid gap-1">
            <li>
              Heating energy saved: <strong>{savedText(c.energySavedKWh * n, fmtInt)} kWh</strong> per season
            </li>
            {isGas ? (
              <li>
                Natural gas saved: <strong>{savedText(c.gasSavedM3 * n, fmtInt)} m³</strong> per season
              </li>
            ) : null}
            <li>
              Emissions saved:{" "}
              <strong>
                {savedText(c.co2eSavedKg * n, fmtKg)} kg <CO2e />
              </strong>{" "}
              per season
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function ResultsStep({ scenario, update, weatherState, outcome, go }: ResultsStepProps) {
  const city = cityById(scenario.cityId);
  const home = homeById(scenario.homeId);
  const weather = weatherState.weather;
  const nav = {
    back: { label: "A better schedule", onClick: () => go("better") },
    next: { label: "Sources and assumptions", onClick: () => go("sources") },
  };

  if (!weather || outcome.status === "waiting") {
    return (
      <StepFrame step={4} title="Results" {...nav}>
        <WeatherNotice
          status={weatherState.status === "ready" ? "loading" : weatherState.status}
          cityName={city.name}
          retry={weatherState.retry}
        />
      </StepFrame>
    );
  }

  if (outcome.status === "error") {
    return (
      <StepFrame step={4} title="Results" {...nav}>
        <div role="alert" className="callout callout-error">
          <p>
            <strong>Error:</strong> {outcome.message}
          </p>
          <p className="mt-2">Go back to the earlier steps to fix this value. Nothing else was lost.</p>
        </div>
      </StepFrame>
    );
  }

  const run = outcome.run;
  const unchanged = sameSchedule(scenario.before, scenario.after);
  const kind = headlineParts(run).kind;

  return (
    <StepFrame step={4} title="Results" {...nav}>
      <div className="no-print">
        <div className="display">
          <p className="headline">
            <HeadlineSentence run={run} emphasis />
          </p>
          <p className="muted mt-4">
          Simulated for one home ({home.label.toLowerCase()}) in {city.name}, over one heating season (
          {weather.seasonLabel}). Compared with your schedule now: {describeSchedule(scenario.before)}. This is a
          simulation, not a measurement of your home.
          </p>
        </div>
        <button type="button" className="btn mt-4" onClick={() => go("sources")}>
          See the assumptions
        </button>
        {unchanged ? (
          <div className="callout mt-3">
            <p>The better schedule is the same as your current one.</p>
            <button type="button" className="btn btn-primary mt-2" onClick={() => go("better")}>
              Go to step 3 to try a better schedule
            </button>
          </div>
        ) : kind === "more" ? (
          <div className="callout callout-warn mt-3">
            <p>The second schedule keeps the home warmer overall than your current one, so it uses more energy.</p>
            <button type="button" className="btn mt-2" onClick={() => go("better")}>
              Go to step 3 to change it
            </button>
          </div>
        ) : null}
      </div>

      <section aria-labelledby="compare-heading" className="no-print grid gap-4">
        <h3 id="compare-heading">Before and after</h3>
        <ComparisonTable scenario={scenario} run={run} weather={weather} />
        <p className="muted text-sm">
          All values are simulated heating energy under these assumptions.{" "}
          {scenario.heating === "gas"
            ? "Heating energy is the energy in the gas burned by the furnace."
            : "For this heating type, all the heating energy is electricity."}{" "}
          Hot water, cooking and everything else on your bill are left out. Each number is rounded on its own, so a
          row can be off by one.
        </p>
        <div className="card">
          <PriceInput scenario={scenario} update={update} />
        </div>
      </section>

      <section aria-labelledby="comfort-heading" className="no-print card grid gap-2">
        <h3 id="comfort-heading">Comfort check</h3>
        <p>{comfortLine("Before, your schedule now", run.before.comfort, scenario.comfortMinC)}</p>
        <p>{comfortLine("After, better schedule", run.after.comfort, scenario.comfortMinC)}</p>
        <ComfortVerdict c={run.after.comfort} minC={scenario.comfortMinC} />
        <p className="muted text-sm">
          The thermostat in the model turns the heat on {fmtNum(DEADBAND_C / 2, 2)} °C below each setting and off{" "}
          {fmtNum(DEADBAND_C / 2, 2)} °C above it (an estimate), so the room drifts a little around the setting.
        </p>
      </section>

      <section aria-labelledby="chart-heading" className="no-print card grid gap-4">
        <h3 id="chart-heading">One week, hour by hour</h3>
        <WeekCharts
          key={scenario.cityId}
          weather={weather}
          run={run}
          comfortMinC={scenario.comfortMinC}
          heaterKW={heaterCapacityW(scenario, weather) / 1000}
          heaterIsEstimate={scenario.heaterKW === null}
        />
      </section>

      <section aria-labelledby="why-heading" className="no-print card grid gap-3">
        <h3 id="why-heading">Why this works</h3>
        <WhyItWorks run={run} />
      </section>

      <section aria-labelledby="sanity-heading" className="no-print card grid gap-3">
        <h3 id="sanity-heading">Sanity check</h3>
        <SanityCheck scenario={scenario} weather={weather} />
      </section>

      <section aria-labelledby="scale-heading" className="no-print card grid gap-3">
        <h3 id="scale-heading">Scale it</h3>
        <ScaleIt scenario={scenario} run={run} update={update} />
      </section>

      <ActionCard scenario={scenario} run={run} />
    </StepFrame>
  );
}
