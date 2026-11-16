"use client";

import { DEFAULT_ROUTINE, SETPOINT_MAX_C, SETPOINT_MIN_C, type Routine, type Scenario } from "@/lib/sim";
import { NumberField, TimeField } from "./fields";
import { ScheduleEditor } from "./ScheduleEditor";
import { StepFrame } from "./StepFrame";
import type { View } from "./shared";

interface NowStepProps {
  scenario: Scenario;
  update: (fn: (s: Scenario) => Scenario) => void;
  go: (view: View) => void;
}

export function NowStep({ scenario, update, go }: NowStepProps) {
  const routine = scenario.routine;
  const isExample = JSON.stringify(routine) === JSON.stringify(DEFAULT_ROUTINE);
  const setRoutine = (patch: Partial<Routine>) =>
    update((s) => ({ ...s, routine: { ...s.routine, ...patch } }));
  const awayIgnored = routine.outOnWeekdays && routine.weekdayReturnMin <= routine.weekdayLeaveMin;

  return (
    <StepFrame
      step={2}
      title="Your schedule now"
      back={{ label: "Your place", onClick: () => go("place") }}
      next={{ label: "A better schedule", onClick: () => go("better") }}
    >
      <p>
        Enter the temperatures your thermostat is set to today. If you never change it, keep one time block for the
        whole day.
      </p>

      <ScheduleEditor schedule={scenario.before} onChange={(before) => update((s) => ({ ...s, before }))} />

      <section aria-labelledby="routine-heading" className="grid gap-4">
        <div>
          <h3 id="routine-heading">When are you home and awake?</h3>
          <p className="mt-1">
            {isExample ? (
              <>
                <span className="badge">illustrative example</span> These times are an illustrative example, not a
                real user. Change them to match your days.
              </>
            ) : (
              "These are the times you entered."
            )}{" "}
            They are used for the comfort check and for the suggested schedule.
          </p>
        </div>

        <fieldset className="card">
          <legend className="float-left mb-3 w-full text-lg font-semibold">Weekday routine (Mon to Fri)</legend>
          <div className="clear-both grid gap-4 sm:grid-cols-2">
            <TimeField
              label="Wake-up time"
              value={routine.weekdayWakeMin}
              onCommit={(m) => setRoutine({ weekdayWakeMin: m })}
            />
            <TimeField
              label="Bedtime"
              value={routine.weekdaySleepMin}
              onCommit={(m) => setRoutine({ weekdaySleepMin: m })}
              hint="A bedtime after midnight is fine, for example 00:30."
            />
          </div>
          <label className="choice mt-4">
            <input
              type="checkbox"
              checked={routine.outOnWeekdays}
              onChange={(e) => setRoutine({ outOnWeekdays: e.target.checked })}
            />
            <span className="font-semibold">I am out on weekdays</span>
          </label>
          {routine.outOnWeekdays ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <TimeField
                label="Leave home at"
                value={routine.weekdayLeaveMin}
                onCommit={(m) => setRoutine({ weekdayLeaveMin: m })}
              />
              <TimeField
                label="Get back at"
                value={routine.weekdayReturnMin}
                onCommit={(m) => setRoutine({ weekdayReturnMin: m })}
              />
            </div>
          ) : null}
          {awayIgnored ? (
            <p className="error-text" role="status">
              Note: the time you get back must be later than the time you leave. Until it is, the model treats you as
              home all day.
            </p>
          ) : null}
        </fieldset>

        <fieldset className="card">
          <legend className="float-left mb-3 w-full text-lg font-semibold">Weekend routine (Sat and Sun)</legend>
          <div className="clear-both grid gap-4 sm:grid-cols-2">
            <TimeField
              label="Wake-up time"
              value={routine.weekendWakeMin}
              onCommit={(m) => setRoutine({ weekendWakeMin: m })}
            />
            <TimeField
              label="Bedtime"
              value={routine.weekendSleepMin}
              onCommit={(m) => setRoutine({ weekendSleepMin: m })}
              hint="A bedtime after midnight is fine, for example 00:30."
            />
          </div>
        </fieldset>

        <div className="card">
          <NumberField
            label="Coldest you are comfortable with while home and awake (°C)"
            value={scenario.comfortMinC}
            min={SETPOINT_MIN_C}
            max={SETPOINT_MAX_C}
            step={0.5}
            unit="°C"
            inputClassName="max-w-[10rem]"
            onCommit={(v) => {
              if (v !== null) update((s) => ({ ...s, comfortMinC: v }));
            }}
            hint="The comfort check counts the hours when the simulated room is colder than this while you are home and awake."
          />
        </div>
      </section>
    </StepFrame>
  );
}
