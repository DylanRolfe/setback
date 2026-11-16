"use client";

import {
  ACCESSED,
  cityById,
  LIMITATIONS,
  listAssumptions,
  SOURCES,
  type AssumptionRow,
  type Scenario,
  type SourceId,
} from "@/lib/sim";
import { Chem, ExtLink, SourceLink } from "./format";
import { SanityCheck } from "./SanityCheck";
import { StepFrame, WeatherNotice } from "./StepFrame";
import { STEPS, type View } from "./shared";
import type { WeatherState } from "./useWeather";

interface SourcesViewProps {
  scenario: Scenario;
  weatherState: WeatherState;
  backTo: View;
  go: (view: View) => void;
}

const KIND_HELP: { kind: AssumptionRow["kind"]; meaning: string }[] = [
  { kind: "cited", meaning: "read from a public source, linked beside it" },
  { kind: "calculated", meaning: "arithmetic on cited values, with the formula shown" },
  { kind: "estimate", meaning: "an assumption, not a measurement; you can change the home estimates in step 1" },
  { kind: "your input", meaning: "a value you typed or chose" },
  { kind: "model setting", meaning: "a choice about how the simulation runs" },
];

const SYMBOLS: { symbol: string; meaning: string }[] = [
  { symbol: "T", meaning: "The temperature inside the home. The model uses one temperature for the whole home." },
  { symbol: "T_out", meaning: "The temperature outside, taken hour by hour from the weather data." },
  { symbol: "dT/dt", meaning: "How fast the inside temperature is changing." },
  { symbol: "C", meaning: "How much heat the building itself stores (its thermal mass)." },
  { symbol: "UA", meaning: "How fast your home leaks heat for each degree of difference between inside and outside." },
  {
    symbol: "Q_heat",
    meaning: "The heat the heating system gives: its full size when the thermostat calls for heat, and zero when it does not.",
  },
];

function groupRows(rows: AssumptionRow[]): { group: AssumptionRow["group"]; rows: AssumptionRow[] }[] {
  const groups: { group: AssumptionRow["group"]; rows: AssumptionRow[] }[] = [];
  for (const row of rows) {
    const existing = groups.find((g) => g.group === row.group);
    if (existing) existing.rows.push(row);
    else groups.push({ group: row.group, rows: [row] });
  }
  return groups;
}

export function SourcesView({ scenario, weatherState, backTo, go }: SourcesViewProps) {
  const weather = weatherState.weather;
  const city = cityById(scenario.cityId);
  const groups = weather ? groupRows(listAssumptions(scenario, weather)) : [];
  const backLabel = STEPS.find((s) => s.view === backTo)?.label ?? "Start page";
  const sourceIds = Object.keys(SOURCES) as SourceId[];

  return (
    <StepFrame
      title="Sources and assumptions"
      back={{ label: backLabel, onClick: () => go(backTo) }}
      next={backTo === "results" ? undefined : { label: "Results", onClick: () => go("results") }}
    >
      <p>
        Every number in this app is computed by the model, read from a public source, labeled as an estimate, or is a
        setting of the model itself.
        Results are simulations under these assumptions, not measured savings. This page lists what the model uses
        for your current choices.
      </p>

      <section aria-labelledby="assumptions-heading" className="grid gap-4">
        <h3 id="assumptions-heading">What the model uses</h3>
        <ul className="grid gap-1 text-sm">
          {KIND_HELP.map((k) => (
            <li key={k.kind}>
              <span className="badge">{k.kind}</span> {k.meaning}
            </li>
          ))}
        </ul>
        <WeatherNotice status={weatherState.status} cityName={city.name} retry={weatherState.retry} />
        {groups.map((g) => (
          <div
            key={g.group}
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label={`Assumptions: ${g.group}`}
          >
            <table className="table min-w-[40rem]">
              <caption>{g.group}</caption>
              <thead>
                <tr>
                  <th scope="col" className="w-[22%]">
                    Item
                  </th>
                  <th scope="col" className="w-[22%]">
                    Value
                  </th>
                  <th scope="col" className="w-[12%]">
                    Kind
                  </th>
                  <th scope="col">Notes and sources</th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="font-semibold">
                      <Chem text={row.label} />
                    </th>
                    <td>
                      <Chem text={row.value} />
                    </td>
                    <td>
                      <span className="badge">{row.kind}</span>
                    </td>
                    <td>
                      {row.note ? (
                        <p>
                          <Chem text={row.note} />
                        </p>
                      ) : null}
                      {row.sourceIds.length > 0 ? (
                        <ul className="mt-1 grid gap-1 text-sm">
                          {row.sourceIds.map((id) => (
                            <li key={id}>
                              Source: <SourceLink id={id} />
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {!row.note && row.sourceIds.length === 0 ? <span className="muted">No note.</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </section>

      <section aria-labelledby="model-heading" className="card grid gap-3">
        <h3 id="model-heading">The model in one line</h3>
        <p className="equation">C × dT/dt = Q_heat − UA × (T − T_out)</p>
        <p>
          In words: the home warms up when the heating gives more heat than the home is losing, and cools down when
          it gives less.
        </p>
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
          {SYMBOLS.map((s) => (
            <div key={s.symbol} className="contents">
              <dt className="font-mono font-semibold">{s.symbol}</dt>
              <dd>{s.meaning}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="sanity-heading-sources" className="card grid gap-3">
        <h3 id="sanity-heading-sources">Sanity check</h3>
        {weather ? (
          <SanityCheck scenario={scenario} weather={weather} />
        ) : (
          <p className="muted">The sanity check appears when the weather data has loaded.</p>
        )}
      </section>

      <section aria-labelledby="limits-heading" className="card grid gap-3">
        <h3 id="limits-heading">Limits of this model</h3>
        <ul className="grid list-disc gap-2 pl-5">
          {LIMITATIONS.map((line) => (
            <li key={line}>
              <Chem text={line} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="sources-heading" className="grid gap-3">
        <h3 id="sources-heading">All sources</h3>
        <p>
          <ExtLink href="https://open-meteo.com/">Weather data by Open-Meteo.com</ExtLink>, licensed under{" "}
          <ExtLink href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</ExtLink>. Each source below was read
          on {ACCESSED}.
        </p>
        <ul className="grid gap-3">
          {sourceIds.map((id) => {
            const s = SOURCES[id];
            return (
              <li key={id} className="card">
                <p className="font-semibold">
                  <ExtLink href={s.url}>{s.title}</ExtLink>
                </p>
                <p>{s.publisher}</p>
                <p className="mt-1 text-sm">
                  <Chem text={s.detail} />
                </p>
                <p className="muted mt-1 text-sm">
                  Licence: {s.licence}; read on {ACCESSED}.
                </p>
              </li>
            );
          })}
        </ul>
      </section>
    </StepFrame>
  );
}
