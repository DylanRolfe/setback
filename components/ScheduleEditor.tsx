"use client";

// Keyboard-accessible editor for a 5+2 thermostat schedule. No dragging: every
// time block is a time input, a number input and a Remove button.

import { hexToRgb, PALETTE } from "@/lib/palette";
import { useEffect, useId, useRef, useState } from "react";
import {
  formatClock,
  MAX_PERIODS_PER_DAY,
  normalizePeriods,
  parseClock,
  SETPOINT_MAX_C,
  SETPOINT_MIN_C,
  type SchedulePeriod,
  type WeeklySchedule,
} from "@/lib/sim";
import { fmtSetpoint } from "./format";
import { afterPointerUp } from "./pointer";

const MIN_PER_DAY = 24 * 60;

interface Row {
  timeText: string;
  tempText: string;
  tempBad: boolean;
  /** Show this row's errors (set when the person leaves the row). */
  revealed: boolean;
}

interface EditorState {
  rows: Row[];
  /** The committed periods these rows were last in step with. */
  synced: SchedulePeriod[];
}

interface RowErrors {
  time: string | null;
  temp: string | null;
}

function toRows(periods: SchedulePeriod[]): Row[] {
  return periods.map((p) => ({
    timeText: formatClock(p.startMin),
    tempText: String(p.setpointC),
    tempBad: false,
    revealed: false,
  }));
}

function parseTemp(row: Row): number | null {
  if (row.tempBad || row.tempText.trim() === "") return null;
  const n = Number(row.tempText);
  if (!Number.isFinite(n) || n < SETPOINT_MIN_C || n > SETPOINT_MAX_C) return null;
  return n;
}

/** Check every row. Returns the periods (unsorted) only when all rows are usable. */
function analyse(rows: Row[]): { errors: RowErrors[]; periods: SchedulePeriod[] | null } {
  const counts = new Map<number, number>();
  for (const row of rows) {
    const start = parseClock(row.timeText);
    if (start !== null) counts.set(start, (counts.get(start) ?? 0) + 1);
  }
  const periods: SchedulePeriod[] = [];
  let allValid = true;
  const errors = rows.map((row) => {
    const start = parseClock(row.timeText);
    const temp = parseTemp(row);
    let time: string | null = null;
    if (start === null) time = "Enter a start time, for example 06:30.";
    else if ((counts.get(start) ?? 0) > 1) time = "Two blocks start at this time. Change one of them.";
    const tempError =
      temp === null ? `Enter a temperature from ${SETPOINT_MIN_C} to ${SETPOINT_MAX_C} °C.` : null;
    if (time || tempError || start === null || temp === null) allValid = false;
    else periods.push({ startMin: start, setpointC: temp });
    return { time, temp: tempError };
  });
  return { errors, periods: allValid ? periods : null };
}

function sortRows(rows: Row[]): Row[] {
  return rows
    .map((row, index) => ({ row, index, start: parseClock(row.timeText) ?? 0 }))
    .sort((a, b) => a.start - b.start || a.index - b.index)
    .map((x) => x.row);
}

export interface DaySegment {
  startMin: number;
  endMin: number;
  setpointC: number;
  /** True for the stretch before the first block, which keeps the last temperature of the day before. */
  carried: boolean;
}

/** The 24 hours of one day as segments, for a day that follows a day of the same kind. */
export function daySegments(periods: SchedulePeriod[]): DaySegment[] {
  const segments: DaySegment[] = [];
  if (periods.length === 0) return segments;
  if (periods[0].startMin > 0) {
    segments.push({
      startMin: 0,
      endMin: periods[0].startMin,
      setpointC: periods[periods.length - 1].setpointC,
      carried: true,
    });
  }
  periods.forEach((p, i) => {
    segments.push({
      startMin: p.startMin,
      endMin: i + 1 < periods.length ? periods[i + 1].startMin : MIN_PER_DAY,
      setpointC: p.setpointC,
      carried: false,
    });
  });
  return segments;
}

const clock = (min: number) => (min >= MIN_PER_DAY ? "24:00" : formatClock(min));

/** The 24 hours of a day as a band of temperature: warm amber for higher settings,
 *  cold blue for lower ones. Decorative: the text summary beside it says the same thing. */
export function DayBand({ segments }: { segments: DaySegment[] }) {
  // Diverging scale around 19.5 °C: cold blue at 17 °C and below, amber at 22 °C and above.
  const cold = hexToRgb(PALETTE.bandCold);
  const neutral = hexToRgb(PALETTE.bandNeutral);
  const warm = hexToRgb(PALETTE.bandWarm);
  const fill = (c: number) => {
    const t = Math.min(1, Math.max(-1, (c - 19.5) / 2.5));
    const end = t < 0 ? cold : warm;
    const mix = neutral.map((v, i) => Math.round(v + (end[i] - v) * Math.abs(t)));
    return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
  };
  const pct = (min: number) => (min / MIN_PER_DAY) * 100;
  const ticks = [0, 6, 12, 18, 24];
  return (
    <svg aria-hidden="true" focusable="false" width="100%" height="70" className="dayband mt-2">
      {segments.map((s) => {
        const width = pct(s.endMin - s.startMin);
        return (
          <g key={s.startMin}>
            <rect
              x={`${pct(s.startMin)}%`}
              y="0"
              width={`${width}%`}
              height="44"
              fill={fill(s.setpointC)}
              stroke={PALETTE.paper}
              strokeWidth="2"
            />
            {width >= 11 ? (
              <text
                x={`${pct(s.startMin) + width / 2}%`}
                y="29"
                textAnchor="middle"
                fontSize="16"
                fontWeight="700"
                fill={PALETTE.slate}
              >
                {fmtSetpoint(s.setpointC)}°
              </text>
            ) : null}
          </g>
        );
      })}
      {ticks.map((h) => (
        <g key={h}>
          <line
            x1={`${(h / 24) * 100}%`}
            x2={`${(h / 24) * 100}%`}
            y1="44"
            y2="50"
            stroke={PALETTE.borderStrong}
            strokeWidth="1"
          />
          <text
            x={`${(h / 24) * 100}%`}
            y="63"
            textAnchor={h === 0 ? "start" : h === 24 ? "end" : "middle"}
            fontSize="12"
            fill={PALETTE.muted}
          >
            {String(h).padStart(2, "0")}:00
          </text>
        </g>
      ))}
    </svg>
  );
}

interface DayEditorProps {
  legend: string;
  /** "weekday" or "weekend", used in the carry-over note. */
  kind: "weekday" | "weekend";
  periods: SchedulePeriod[];
  /** Last temperature of the other kind of day (it carries into Monday or Saturday morning). */
  otherLastC: number;
  onChange: (periods: SchedulePeriod[]) => void;
}

function DayEditor({ legend, kind, periods, otherLastC, onChange }: DayEditorProps) {
  const uid = useId();
  const [stored, setStored] = useState<EditorState>(() => ({ rows: toRows(periods), synced: periods }));
  const [status, setStatus] = useState("");
  const focusNext = useRef<string | null>(null);

  // The schedule was replaced from outside (Suggest, Copy, a share link): start again from it.
  let state = stored;
  if (stored.synced !== periods) {
    state = { rows: toRows(periods), synced: periods };
    setStored(state);
  }

  useEffect(() => {
    if (focusNext.current) {
      document.getElementById(focusNext.current)?.focus();
      focusNext.current = null;
    }
  });

  const rows = state.rows;
  const { errors } = analyse(rows);

  /** Keep the rows as typed, and pass the schedule on whenever every row is usable. */
  function apply(nextRows: Row[]) {
    const result = analyse(nextRows);
    if (result.periods) {
      const next = normalizePeriods(result.periods);
      setStored({ rows: nextRows, synced: next });
      onChange(next);
    } else {
      setStored({ rows: nextRows, synced: state.synced });
    }
  }

  function editRow(index: number, patch: Partial<Row>) {
    apply(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  /** On leaving a row: show any errors, and put the rows in time order once they are all usable. */
  function leaveRow() {
    afterPointerUp(() =>
      setStored((prev) => {
        const result = analyse(prev.rows);
        const revealed = prev.rows.map((row, i) => ({
          ...row,
          revealed: Boolean(result.errors[i].time || result.errors[i].temp),
        }));
        return { rows: result.periods ? sortRows(revealed) : revealed, synced: prev.synced };
      })
    );
  }

  function addRow() {
    // Put the new block in the middle of the longest stretch without a change.
    const used = [...new Set(rows.map((r) => parseClock(r.timeText)).filter((n): n is number => n !== null))].sort(
      (a, b) => a - b
    );
    let start = 6 * 60;
    let longest = -1;
    used.forEach((from, i) => {
      const to = i + 1 < used.length ? used[i + 1] : used[0] + MIN_PER_DAY;
      if (to - from > longest) {
        longest = to - from;
        start = (from + Math.round((to - from) / 2 / 30) * 30) % MIN_PER_DAY;
      }
    });
    while (used.includes(start)) start = (start + 30) % MIN_PER_DAY;
    const last = rows[rows.length - 1];
    const fresh: Row = {
      timeText: formatClock(start),
      tempText: last && parseTemp(last) !== null ? last.tempText : "20",
      tempBad: false,
      revealed: false,
    };
    const combined = [...rows, fresh];
    const nextRows = analyse(combined).periods ? sortRows(combined) : combined;
    apply(nextRows);
    focusNext.current = `${uid}-time-${nextRows.indexOf(fresh)}`;
    setStatus(`Time block added. ${legend} now has ${nextRows.length} blocks.`);
  }

  function removeRow(index: number) {
    const nextRows = rows.filter((_, i) => i !== index);
    apply(nextRows);
    focusNext.current =
      nextRows.length > 1 ? `${uid}-remove-${Math.min(index, nextRows.length - 1)}` : `${uid}-add`;
    setStatus(
      `Time block removed. ${legend} now has ${nextRows.length} ${nextRows.length === 1 ? "block" : "blocks"}.`
    );
  }

  const segments = daySegments(periods);
  const first = periods[0];
  const carries = first !== undefined && first.startMin > 0;
  const ownLastC = periods.length > 0 ? periods[periods.length - 1].setpointC : otherLastC;
  const pending = analyse(rows).periods === null;

  return (
    <fieldset className="card">
      <legend className="panel-title float-left mb-3 w-full">{legend}</legend>
      <ol className="clear-both grid gap-3">
        {rows.map((row, i) => {
          const err = row.revealed ? errors[i] : { time: null, temp: null };
          const timeId = `${uid}-time-${i}`;
          const tempId = `${uid}-temp-${i}`;
          return (
            <li
              key={i}
              className="rounded bg-bg p-3"
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) leaveRow();
              }}
            >
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[8.5rem] flex-1">
                  <label className="field-label" htmlFor={timeId}>
                    Starts at<span className="sr-only">, block {i + 1}</span>
                  </label>
                  <input
                    id={timeId}
                    className="input"
                    type="time"
                    value={row.timeText}
                    aria-invalid={err.time ? true : undefined}
                    aria-describedby={err.time ? `${timeId}-error` : undefined}
                    onChange={(e) => editRow(i, { timeText: e.target.value })}
                  />
                </div>
                <div className="min-w-[8.5rem] flex-1">
                  <label className="field-label" htmlFor={tempId}>
                    Temperature (°C)<span className="sr-only">, block {i + 1}</span>
                  </label>
                  <input
                    id={tempId}
                    className="input"
                    type="number"
                    inputMode="decimal"
                    step={0.5}
                    min={SETPOINT_MIN_C}
                    max={SETPOINT_MAX_C}
                    value={row.tempText}
                    aria-invalid={err.temp ? true : undefined}
                    aria-describedby={err.temp ? `${tempId}-error` : undefined}
                    onChange={(e) =>
                      editRow(i, { tempText: e.target.value, tempBad: e.target.validity.badInput })
                    }
                  />
                </div>
                <button
                  type="button"
                  id={`${uid}-remove-${i}`}
                  className="btn"
                  disabled={rows.length <= 1}
                  onClick={() => removeRow(i)}
                >
                  Remove<span className="sr-only"> block {i + 1}</span>
                </button>
              </div>
              {err.time ? (
                <p id={`${timeId}-error`} className="error-text">
                  Error: {err.time}
                </p>
              ) : null}
              {err.temp ? (
                <p id={`${tempId}-error`} className="error-text">
                  Error: {err.temp}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          id={`${uid}-add`}
          className="btn"
          disabled={rows.length >= MAX_PERIODS_PER_DAY}
          onClick={addRow}
        >
          Add a time block
        </button>
        <span className="hint">
          {rows.length} of {MAX_PERIODS_PER_DAY} blocks used.
        </span>
      </div>
      <p role="status" className="sr-only">
        {status}
      </p>

      <div className="mt-4 border-t border-line pt-3">
        <p className="font-semibold">
          {pending ? "Last complete version of this day" : "What this day looks like"}
        </p>
        <p className="num">
          {segments.map((s, i) => (
            <span key={s.startMin}>
              {i > 0 ? ", " : ""}
              {clock(s.startMin)} to {clock(s.endMin)}: {fmtSetpoint(s.setpointC)} °C
              {s.carried ? " (still set from the night before)" : ""}
            </span>
          ))}
          .
        </p>
        {carries && otherLastC !== ownLastC ? (
          <p className="hint">
            {kind === "weekday" ? "On Mondays" : "On Saturdays"}, the time before {clock(first.startMin)} uses the
            last {kind === "weekday" ? "weekend" : "weekday"} temperature ({fmtSetpoint(otherLastC)} °C) instead.
          </p>
        ) : null}
        <DayBand segments={segments} />
      </div>
    </fieldset>
  );
}

interface ScheduleEditorProps {
  schedule: WeeklySchedule;
  onChange: (schedule: WeeklySchedule) => void;
}

export function ScheduleEditor({ schedule, onChange }: ScheduleEditorProps) {
  const [copied, setCopied] = useState(false);
  const sameBlocks = JSON.stringify(schedule.weekday) === JSON.stringify(schedule.weekend);
  const lastOf = (periods: SchedulePeriod[]) => periods[periods.length - 1].setpointC;

  return (
    <div className="grid gap-4">
      <p>
        A time block lasts until the next one starts. Before the first block of a day, the last block of the day
        before still applies.
      </p>
      <DayEditor
        legend="Weekdays (Mon to Fri)"
        kind="weekday"
        periods={schedule.weekday}
        otherLastC={lastOf(schedule.weekend)}
        onChange={(weekday) => onChange({ ...schedule, weekday })}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn"
          onClick={() => {
            onChange({ ...schedule, weekend: schedule.weekday.map((p) => ({ ...p })) });
            setCopied(true);
          }}
        >
          Copy weekdays to weekend
        </button>
        <p role="status" className="hint">
          {copied && sameBlocks ? "The weekend now uses the same time blocks as weekdays." : ""}
        </p>
      </div>
      <DayEditor
        legend="Weekend (Sat and Sun)"
        kind="weekend"
        periods={schedule.weekend}
        otherLastC={lastOf(schedule.weekday)}
        onChange={(weekend) => onChange({ ...schedule, weekend })}
      />
    </div>
  );
}
