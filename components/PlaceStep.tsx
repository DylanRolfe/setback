"use client";

import {
  CITIES,
  cityById,
  DEFAULT_FURNACE_EFFICIENCY_PCT,
  FURNACE_OPTIONS,
  heaterCapacityW,
  HEATING_OPTIONS,
  HOME_PRESETS,
  homeById,
  NRCAN_GUIDANCE,
  PROVINCES,
  type Scenario,
} from "@/lib/sim";
import { NumberField } from "./fields";
import { EstimateBadge, fmtNum, SourceLink } from "./format";
import { StepFrame, WeatherNotice } from "./StepFrame";
import type { View } from "./shared";
import type { WeatherState } from "./useWeather";

interface PlaceStepProps {
  scenario: Scenario;
  update: (fn: (s: Scenario) => Scenario) => void;
  weatherState: WeatherState;
  go: (view: View) => void;
}

export function PlaceStep({ scenario, update, weatherState, go }: PlaceStepProps) {
  const city = cityById(scenario.cityId);
  const province = PROVINCES[city.province];
  const weather = weatherState.weather;
  const autoHeaterKW = weather ? heaterCapacityW({ ...scenario, heaterKW: null }, weather) / 1000 : null;
  const furnaceListed = FURNACE_OPTIONS.find((f) => f.efficiencyPct === scenario.furnaceEfficiencyPct);

  return (
    <StepFrame
      step={1}
      title="Your place"
      back={{ label: "Start page", onClick: () => go("landing") }}
      next={{ label: "Your schedule now", onClick: () => go("now") }}
    >
      <p>
        Tell us roughly what your home is like. The home numbers are estimates, not measurements, and you can change
        them.
      </p>

      <div className="card">
        <label className="field-label" htmlFor="city">
          City
        </label>
        <select
          id="city"
          className="input max-w-md"
          value={scenario.cityId}
          aria-describedby="city-hint"
          onChange={(e) => update((s) => ({ ...s, cityId: e.target.value }))}
        >
          {CITIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <p id="city-hint" className="hint">
          {weather
            ? `Uses hourly outdoor temperatures for ${weather.seasonLabel} and ${province.name} emission factors.`
            : `Uses one past heating season of hourly outdoor temperatures and ${province.name} emission factors.`}
        </p>
        <div className="mt-3 empty:hidden">
          <WeatherNotice status={weatherState.status} cityName={city.name} retry={weatherState.retry} />
        </div>
      </div>

      <fieldset className="card">
        <legend className="panel-title float-left mb-3 w-full">Home type</legend>
        <div className="clear-both grid gap-3 sm:grid-cols-3">
          {HOME_PRESETS.map((home) => (
            <label key={home.id} className="choice">
              <input
                type="radio"
                name="home-type"
                value={home.id}
                checked={scenario.homeId === home.id}
                onChange={() =>
                  update((s) => ({ ...s, homeId: home.id, uaWPerK: home.uaWPerK, cMJPerK: home.cMJPerK }))
                }
              />
              <span>
                <span className="block font-semibold">{home.label}</span>
                <span className="block text-sm">{home.description}</span>
                <span className="muted num block text-sm">
                  UA {fmtNum(home.uaWPerK)} W/K, C {fmtNum(home.cMJPerK, 1)} MJ/K (estimates)
                </span>
              </span>
            </label>
          ))}
        </div>
        <p className="hint">
          Choosing a home type fills in two estimates: UA (how fast your home leaks heat) and C (how much heat the
          building itself stores).
        </p>

        <details className="details mt-3">
          <summary>Adjust the estimates</summary>
          <div className="grid gap-4 pb-1 pt-2 sm:grid-cols-3">
            <NumberField
              label={
                <>
                  Heat loss, UA (W/K) <EstimateBadge />
                </>
              }
              value={scenario.uaWPerK}
              min={1}
              max={5000}
              onCommit={(v) => {
                if (v !== null) update((s) => ({ ...s, uaWPerK: v }));
              }}
              hint="How fast your home leaks heat. A bigger number means a larger or leakier home."
            />
            <NumberField
              label={
                <>
                  Thermal mass, C (MJ/K) <EstimateBadge />
                </>
              }
              value={scenario.cMJPerK}
              min={0.1}
              max={1000}
              onCommit={(v) => {
                if (v !== null) update((s) => ({ ...s, cMJPerK: v }));
              }}
              hint="How much heat the building itself stores. A bigger number means it cools down and warms up more slowly."
            />
            <NumberField
              label={
                <>
                  Heater size (kW) <EstimateBadge />
                </>
              }
              value={scenario.heaterKW}
              min={0.1}
              max={200}
              allowBlank
              placeholder="Automatic"
              onCommit={(v) => update((s) => ({ ...s, heaterKW: v }))}
              hint={
                autoHeaterKW !== null
                  ? `How much heat your heating gives when it is on. Leave blank for the automatic estimate: ${fmtNum(autoHeaterKW, 1)} kW for this home and city.`
                  : "How much heat your heating gives when it is on. Leave blank for the automatic estimate."
              }
            />
          </div>
          <p className="hint">
            The home type estimates for {homeById(scenario.homeId).label.toLowerCase()} are UA{" "}
            {fmtNum(homeById(scenario.homeId).uaWPerK)} W/K and C {fmtNum(homeById(scenario.homeId).cMJPerK, 1)} MJ/K.
            Pick the home type again to go back to them.
          </p>
        </details>
      </fieldset>

      <fieldset className="card">
        <legend className="panel-title float-left mb-3 w-full">Heating type</legend>
        <div className="clear-both grid gap-3 sm:grid-cols-3">
          {HEATING_OPTIONS.map((option) => (
            <label key={option.type} className="choice">
              <input
                type="radio"
                name="heating-type"
                value={option.type}
                checked={scenario.heating === option.type}
                onChange={() =>
                  update((s) => ({
                    ...s,
                    heating: option.type,
                    // The price is per cubic metre for gas and per kWh for electricity, so it cannot carry over.
                    priceCents: (s.heating === "gas") === (option.type === "gas") ? s.priceCents : null,
                  }))
                }
              />
              <span>
                <span className="block font-semibold">{option.label}</span>
                <span className="block text-sm">{option.description}</span>
              </span>
            </label>
          ))}
        </div>

        {scenario.heating === "gas" ? (
          <div className="mt-4">
            <label className="field-label" htmlFor="furnace">
              Furnace efficiency
            </label>
            <select
              id="furnace"
              className="input max-w-xl"
              value={String(scenario.furnaceEfficiencyPct)}
              aria-describedby="furnace-hint"
              onChange={(e) => update((s) => ({ ...s, furnaceEfficiencyPct: Number(e.target.value) }))}
            >
              {furnaceListed ? null : (
                <option value={String(scenario.furnaceEfficiencyPct)}>
                  {fmtNum(scenario.furnaceEfficiencyPct, 1)}% (from your share link)
                </option>
              )}
              {FURNACE_OPTIONS.map((f) => (
                <option key={f.efficiencyPct} value={String(f.efficiencyPct)}>
                  {f.label}
                </option>
              ))}
            </select>
            <p id="furnace-hint" className="hint">
              Not sure? Keep {DEFAULT_FURNACE_EFFICIENCY_PCT}%. It gives the smallest gas saving, so the result stays
              cautious.
              {furnaceListed ? (
                <>
                  {" "}
                  Source: <SourceLink id={furnaceListed.sourceId} />.
                </>
              ) : null}
            </p>
          </div>
        ) : null}

        {scenario.heating === "heatpump" ? (
          <div className="callout callout-warn mt-4">
            <p>
              Natural Resources Canada says about heat pumps: &ldquo;{NRCAN_GUIDANCE.heatPumpQuote}&rdquo; (
              <SourceLink id="nrcanHeatPump" />
              ).
            </p>
            <p className="mt-2">
              This model does not include the backup heat that some heat pumps switch on while warming back up. Savings
              from a bigger setback may be overstated.
            </p>
          </div>
        ) : null}
      </fieldset>
    </StepFrame>
  );
}
