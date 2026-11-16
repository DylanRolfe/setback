"use client";

import { NRCAN_GUIDANCE, type Scenario, type WeeklySchedule } from "@/lib/sim";
import { fmtHours, fmtSetpoint, SourceLink } from "./format";
import { HeadlineSentence } from "./Headline";
import { ScheduleEditor } from "./ScheduleEditor";
import { StepFrame, WeatherNotice } from "./StepFrame";
import {
  copySchedule,
  sameSchedule,
  suggestBasis,
  type RunOutcome,
  type StoredSuggestion,
  type View,
} from "./shared";
import type { WeatherState } from "./useWeather";

interface BetterStepProps {
  scenario: Scenario;
  update: (fn: (s: Scenario) => Scenario) => void;
  weatherState: WeatherState;
  cityName: string;
  outcome: RunOutcome;
  suggestion: StoredSuggestion | null;
  suggestError: string | null;
  onSuggest: () => void;
  go: (view: View) => void;
}

function allSetpoints(schedule: WeeklySchedule): number[] {
  return [...schedule.weekday, ...schedule.weekend].map((p) => p.setpointC);
}

/** NRCan cautions that apply to a schedule: the 17 °C floor and the heat pump setback limit. */
export function ScheduleWarnings({ schedule, heating }: { schedule: WeeklySchedule; heating: Scenario["heating"] }) {
  const temps = allSetpoints(schedule);
  const lowest = Math.min(...temps);
  const spread = Math.max(...temps) - lowest;
  const belowFloor = lowest < NRCAN_GUIDANCE.floorC;
  const bigHeatPumpSetback = heating === "heatpump" && spread > NRCAN_GUIDANCE.heatPumpMaxSetbackC;
  if (!belowFloor && !bigHeatPumpSetback) return null;
  return (
    <div className="grid gap-3">
      {belowFloor ? (
        <div className="callout callout-warn">
          <p>
            <strong>Warning:</strong> this schedule goes down to {fmtSetpoint(lowest)} °C. Natural Resources Canada
            says: &ldquo;{NRCAN_GUIDANCE.floorQuote}&rdquo; (<SourceLink id="keepingHeatIn" />
            ).
          </p>
        </div>
      ) : null}
      {bigHeatPumpSetback ? (
        <div className="callout callout-warn">
          <p>
            <strong>Caution for heat pumps:</strong> this schedule changes by {fmtSetpoint(spread)} °C. Natural
            Resources Canada says: &ldquo;{NRCAN_GUIDANCE.heatPumpQuote}&rdquo; (<SourceLink id="nrcanHeatPump" />
            ). This model does not include backup heat during warm-up, so the saving shown may be too high.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function SuggestionNote({ s }: { s: StoredSuggestion }) {
  if (s.homeC === s.setbackC) {
    return (
      <p>
        The suggestion is {fmtSetpoint(s.homeC)} °C all day. With your comfort minimum of{" "}
        {fmtSetpoint(s.comfortMinC)} °C there is no room for a lower temperature that stays inside Natural Resources
        Canada&rsquo;s advice.
      </p>
    );
  }
  return (
    <>
      <p>
        Suggested: {fmtSetpoint(s.homeC)} °C when you are home and awake, {fmtSetpoint(s.setbackC)} °C when you are
        asleep or out, and warm-up starts {s.preheatMin} minutes early
        {s.comfortMet
          ? `. With that warm-up the simulated room is below your ${fmtSetpoint(s.comfortMinC)} °C minimum for no more than 1% of the hours you are home and awake (${fmtHours(s.hoursBelowMin)} hours this season).`
          : "."}
      </p>
      {s.comfortMet ? null : (
        <p className="mt-2">
          <strong>Note:</strong> even with that warm-up, the simulated room is below your{" "}
          {fmtSetpoint(s.comfortMinC)} °C minimum for {fmtHours(s.hoursBelowMin)} hours of the season while you are
          home and awake. Try a smaller drop in temperature below.
        </p>
      )}
    </>
  );
}

export function BetterStep({
  scenario,
  update,
  weatherState,
  cityName,
  outcome,
  suggestion,
  suggestError,
  onSuggest,
  go,
}: BetterStepProps) {
  const ready = weatherState.status === "ready";
  const current =
    suggestion !== null &&
    suggestion.basis === suggestBasis(scenario) &&
    sameSchedule(suggestion.schedule, scenario.after);
  const unchanged = sameSchedule(scenario.before, scenario.after);

  return (
    <StepFrame
      step={3}
      title="A better schedule"
      back={{ label: "Your schedule now", onClick: () => go("now") }}
      next={{ label: "Results", onClick: () => go("results") }}
    >
      <p>
        A cooler home while you are asleep or out loses less heat. Ask for a schedule built from your routine, or
        make your own below.
      </p>

      <div className="card grid gap-3">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="btn btn-primary"
            aria-disabled={ready ? undefined : true}
            onClick={() => {
              if (ready) onSuggest();
            }}
          >
            Suggest a schedule
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => update((s) => ({ ...s, after: copySchedule(s.before) }))}
          >
            Copy my current schedule
          </button>
        </div>
        <WeatherNotice status={weatherState.status} cityName={cityName} retry={weatherState.retry} />
        <div role="status">
          {suggestError ? (
            <p className="error-text">Error: {suggestError}</p>
          ) : current && suggestion ? (
            <SuggestionNote s={suggestion} />
          ) : unchanged ? (
            <p className="muted">This schedule is the same as your current one, so it saves nothing yet.</p>
          ) : (
            <p className="muted">
              This is your own schedule. Press Suggest a schedule to replace it with one built from your routine.
            </p>
          )}
        </div>
      </div>

      <ScheduleWarnings schedule={scenario.after} heating={scenario.heating} />

      <ScheduleEditor schedule={scenario.after} onChange={(after) => update((s) => ({ ...s, after }))} />

      {outcome.status === "ok" ? (
        <p className="callout">
          <strong>Preview:</strong> <HeadlineSentence run={outcome.run} /> See the details in Results.
        </p>
      ) : outcome.status === "error" ? (
        <p className="callout callout-error">
          <strong>Error:</strong> {outcome.message}
        </p>
      ) : null}
    </StepFrame>
  );
}
