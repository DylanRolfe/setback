"use client";

import { useId, useState } from "react";
import {
  cityById,
  formatClock12,
  homeById,
  type Scenario,
  type ScenarioRun,
  type SchedulePeriod,
} from "@/lib/sim";
import { scenarioToHash } from "@/lib/share";
import { ScheduleWarnings } from "./BetterStep";
import { fmtSetpoint } from "./format";
import { DayBand, daySegments } from "./ScheduleEditor";
import { HeadlineSentence } from "./Headline";

function PeriodList({ title, periods }: { title: string; periods: SchedulePeriod[] }) {
  return (
    <div>
      <h4>{title}</h4>
      <DayBand segments={daySegments(periods)} />
      <ul className="num mt-1 grid gap-1">
        {periods.map((p) => (
          <li key={p.startMin}>
            {formatClock12(p.startMin)}: {fmtSetpoint(p.setpointC)} °C
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ShareState {
  link: string;
  copied: boolean;
  /** The scenario the link was made for. The link is hidden once the scenario changes. */
  scenario: Scenario;
}

export function ActionCard({ scenario, run }: { scenario: Scenario; run: ScenarioRun }) {
  const uid = useId();
  const [share, setShare] = useState<ShareState | null>(null);
  const current = share !== null && share.scenario === scenario ? share : null;
  const city = cityById(scenario.cityId);
  const home = homeById(scenario.homeId);

  async function copyLink() {
    const link = window.location.origin + window.location.pathname + scenarioToHash(scenario);
    let copied = false;
    try {
      await navigator.clipboard.writeText(link);
      copied = true;
    } catch {
      copied = false;
    }
    setShare({ link, copied, scenario });
  }

  return (
    <section aria-labelledby={`${uid}-heading`} className="card print-card">
      <h3 id={`${uid}-heading`}>Program this tonight</h3>
      <p className="print-only mt-1">
        Setback: one home ({home.label.toLowerCase()}) in {city.name}. <HeadlineSentence run={run} /> Simulation, not
        measured savings.
      </p>
      <p className="mt-1">
        Enter these start times and temperatures in your thermostat. Each temperature holds until the next start
        time.
      </p>
      <div className="mt-4 grid gap-x-10 gap-y-6 sm:grid-cols-2">
        <PeriodList title="Weekdays (Mon to Fri)" periods={scenario.after.weekday} />
        <PeriodList title="Weekend (Sat, Sun)" periods={scenario.after.weekend} />
      </div>

      <div className="mt-4">
        <ScheduleWarnings schedule={scenario.after} heating={scenario.heating} />
      </div>

      <div className="no-print mt-5 flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          Print this card
        </button>
        <button type="button" className="btn" onClick={copyLink}>
          Copy share link
        </button>
      </div>
      <div className="no-print mt-3">
        <p role="status" className={current ? "font-semibold" : "sr-only"}>
          {current
            ? current.copied
              ? "Link copied. Anyone who opens it sees this same scenario."
              : "Your browser did not allow copying. Select the link below and copy it yourself."
            : ""}
        </p>
        {current ? (
          <div className="mt-2">
            <label className="field-label" htmlFor={`${uid}-link`}>
              Share link
            </label>
            <input
              id={`${uid}-link`}
              className="input"
              type="text"
              readOnly
              value={current.link}
              onFocus={(e) => e.currentTarget.select()}
            />
            <p className="hint">The link holds your choices in the address itself. Nothing is sent to a server.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
