"use client";

// Hand-written SVG charts for one week: indoor and outdoor temperature, and hourly
// heat delivered. Series differ by line style as well as colour. Each chart has a
// computed text summary, and the hourly values are available as a real table.

import { PALETTE } from "@/lib/palette";
import { useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  coldestWeekIndex,
  dayName,
  formatDate,
  formatHourLabel,
  listWeeks,
  localTimeAt,
  type LocalTime,
  type ScenarioRun,
  type WeatherSeason,
  type WeekInfo,
} from "@/lib/sim";
import { fmtInt, fmtNum, fmtSetpoint, fmtTemp } from "./format";

const COLOR = {
  before: PALETTE.ember,
  after: PALETTE.blue,
  outdoor: PALETTE.muted,
  grid: PALETTE.chartGrid,
  axis: PALETTE.chartAxis,
  text: PALETTE.slate,
  muted: PALETTE.muted,
};

interface WeekData {
  n: number;
  times: LocalTime[];
  outdoor: number[];
  inBefore: number[];
  inAfter: number[];
  kwBefore: number[];
  kwAfter: number[];
  energyBefore: number;
  energyAfter: number;
  heatBefore: number;
  heatAfter: number;
}

function buildWeekData(weather: WeatherSeason, run: ScenarioRun, week: WeekInfo): WeekData {
  const data: WeekData = {
    n: week.hours,
    times: [],
    outdoor: [],
    inBefore: [],
    inAfter: [],
    kwBefore: [],
    kwAfter: [],
    energyBefore: 0,
    energyAfter: 0,
    heatBefore: 0,
    heatAfter: 0,
  };
  for (let k = 0; k < week.hours; k++) {
    const i = week.startIndex + k;
    data.times.push(localTimeAt(weather, i));
    data.outdoor.push(weather.hourlyC[i]);
    data.inBefore.push(run.before.indoorC[i]);
    data.inAfter.push(run.after.indoorC[i]);
    data.kwBefore.push(run.before.heatW[i] / 1000);
    data.kwAfter.push(run.after.heatW[i] / 1000);
    data.energyBefore += run.before.inputKWh[i];
    data.energyAfter += run.after.inputKWh[i];
    data.heatBefore += run.before.heatW[i] / 1000;
    data.heatAfter += run.after.heatW[i] / 1000;
  }
  return data;
}

function niceTicks(min: number, max: number, target: number): number[] {
  const raw = (max - min) / target;
  const steps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50];
  const step = steps.find((s) => s >= raw) ?? 100;
  const out: number[] = [];
  for (let v = Math.ceil(min / step - 1e-9) * step; v <= max + 1e-9; v += step) {
    out.push(Math.round(v * 100) / 100);
  }
  return out;
}

const tickLabel = (v: number) => fmtNum(v, Number.isInteger(v) ? 0 : 1);

/** Width of an element in CSS pixels, so chart text stays a readable size at any width. */
function useWidth(): [RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(640);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = Math.round(el.getBoundingClientRect().width);
      if (w > 0) setWidth(w);
    };
    measure();
    window.addEventListener("resize", measure);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(el);
    return () => {
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, []);
  return [ref, width];
}

interface Frame {
  width: number;
  left: number;
  right: number;
  n: number;
}

const plotWidth = (f: Frame) => f.width - f.left - f.right;
/** x of the centre of hour k. */
const xMid = (f: Frame, k: number) => f.left + ((k + 0.5) / f.n) * plotWidth(f);
/** x of the start of hour k. */
const xEdge = (f: Frame, k: number) => f.left + (k / f.n) * plotWidth(f);

function linePath(values: number[], f: Frame, y: (v: number) => number): string {
  return values.map((v, k) => `${k === 0 ? "M" : "L"}${xMid(f, k).toFixed(1)},${y(v).toFixed(1)}`).join("");
}

function stepPath(values: number[], f: Frame, y: (v: number) => number): string {
  return values
    .map((v, k) => `${k === 0 ? "M" : "L"}${xEdge(f, k).toFixed(1)},${y(v).toFixed(1)}H${xEdge(f, k + 1).toFixed(1)}`)
    .join("");
}

interface PanelProps {
  frame: Frame;
  top: number;
  height: number;
  min: number;
  max: number;
  ticks: number[];
  title: string;
  /** Hours (index into the week) where a new day starts. */
  dayStarts: number[];
  children: (y: (v: number) => number) => ReactNode;
}

function Panel({ frame, top, height, min, max, ticks, title, dayStarts, children }: PanelProps) {
  const y = (v: number) => top + height - ((v - min) / (max - min)) * height;
  return (
    <g>
      <text x={0} y={top - 9} fontSize="12" fontWeight="600" fill={COLOR.text}>
        {title}
      </text>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={frame.left} x2={frame.width - frame.right} y1={y(t)} y2={y(t)} stroke={COLOR.grid} />
          <text x={frame.left - 6} y={y(t) + 4} fontSize="11" textAnchor="end" fill={COLOR.muted}>
            {tickLabel(t)}
          </text>
        </g>
      ))}
      {dayStarts.map((k) => (
        <line key={k} x1={xEdge(frame, k)} x2={xEdge(frame, k)} y1={top} y2={top + height} stroke={COLOR.grid} />
      ))}
      <rect
        x={frame.left}
        y={top}
        width={plotWidth(frame)}
        height={height}
        fill="none"
        stroke={COLOR.axis}
        strokeWidth="1"
      />
      {children(y)}
    </g>
  );
}

function DayLabels({ frame, y, data, dayStarts }: { frame: Frame; y: number; data: WeekData; dayStarts: number[] }) {
  const wide = plotWidth(frame) / 7 >= 56;
  return (
    <g>
      {dayStarts.map((k, i) => {
        const end = i + 1 < dayStarts.length ? dayStarts[i + 1] : data.n;
        const t = data.times[k];
        return (
          <text
            key={k}
            x={(xEdge(frame, k) + xEdge(frame, end)) / 2}
            y={y}
            fontSize="11"
            textAnchor="middle"
            fill={COLOR.muted}
          >
            {wide ? `${dayName(t.dayOfWeek)} ${t.day}` : dayName(t.dayOfWeek)}
          </text>
        );
      })}
    </g>
  );
}

function LegendItem({
  color,
  dashed,
  dotted,
  thin,
  children,
}: {
  color: string;
  dashed?: boolean;
  dotted?: boolean;
  thin?: boolean;
  children: ReactNode;
}) {
  return (
    <li className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className="legend-line"
        style={{
          borderTopColor: color,
          borderTopStyle: dotted ? "dotted" : dashed ? "dashed" : "solid",
          borderTopWidth: thin ? 2 : 3,
        }}
      />
      <span>{children}</span>
    </li>
  );
}

interface WeekChartsProps {
  weather: WeatherSeason;
  run: ScenarioRun;
  comfortMinC: number;
  heaterKW: number;
  heaterIsEstimate: boolean;
}

export function WeekCharts({ weather, run, comfortMinC, heaterKW, heaterIsEstimate }: WeekChartsProps) {
  const uid = useId();
  const weeks = useMemo(() => listWeeks(weather), [weather]);
  const coldest = useMemo(() => coldestWeekIndex(weeks), [weeks]);
  const [picked, setPicked] = useState<number | null>(null);
  const [tableOpen, setTableOpen] = useState(false);
  const [ref, measured] = useWidth();

  const index = picked !== null && picked < weeks.length ? picked : coldest;
  const week = weeks[index];
  const data = useMemo(() => (week ? buildWeekData(weather, run, week) : null), [weather, run, week]);

  if (!week || !data) {
    return <p className="callout">This weather file has no complete week to chart.</p>;
  }

  const width = Math.max(240, Math.min(measured, 1100));
  const frame: Frame = { width, left: 36, right: 8, n: data.n };
  const dayStarts = data.times.map((t, k) => (t.hour === 0 ? k : -1)).filter((k) => k >= 0);
  const weekLabel = formatDate(week.year, week.month, week.day);

  // Temperature chart geometry.
  const indoorAll = [...data.inBefore, ...data.inAfter, comfortMinC];
  const inMin = Math.floor(Math.min(...indoorAll) - 0.5);
  const inMax = Math.ceil(Math.max(...indoorAll) + 0.5);
  const outMin = Math.floor(Math.min(...data.outdoor) - 1);
  const outMax = Math.ceil(Math.max(...data.outdoor) + 1);
  const inTop = 24;
  const inHeight = 170;
  const outTop = inTop + inHeight + 34;
  const outHeight = 110;
  const tempHeight = outTop + outHeight + 26;

  // Heat chart geometry.
  const kwMax = Math.max(heaterKW, ...data.kwBefore, ...data.kwAfter, 0.5);
  const kwTop = 24;
  const kwHeight = 150;
  const heatHeight = kwTop + kwHeight + 26;

  const lowBefore = Math.min(...data.inBefore);
  const lowAfter = Math.min(...data.inAfter);
  const lowOut = Math.min(...data.outdoor);
  const peakKW = Math.max(...data.kwBefore, ...data.kwAfter);

  const tempSummary = `Week of ${weekLabel}. Simulated heating energy this week: ${fmtInt(data.energyBefore)} kWh with your schedule now and ${fmtInt(data.energyAfter)} kWh with the better schedule. Lowest simulated indoor temperature: ${fmtTemp(lowBefore)} °C now and ${fmtTemp(lowAfter)} °C with the better schedule. Outside it averaged ${fmtTemp(week.meanOutdoorC)} °C and fell to ${fmtTemp(lowOut)} °C.`;
  const heatSummary = `Week of ${weekLabel}. Simulated heat delivered to the home this week: ${fmtInt(data.heatBefore)} kWh with your schedule now and ${fmtInt(data.heatAfter)} kWh with the better schedule. The highest hourly average was ${fmtNum(peakKW, 1)} kW. The heater size is ${fmtNum(heaterKW, 1)} kW${heaterIsEstimate ? " (estimate)" : ""}.`;

  return (
    <div className="grid gap-6">
      <div>
        <label className="field-label" htmlFor={`${uid}-week`}>
          Week to show
        </label>
        <select
          id={`${uid}-week`}
          className="input max-w-xl"
          value={index}
          onChange={(e) => setPicked(Number(e.target.value))}
        >
          {weeks.map((w, i) => (
            <option key={w.startIndex} value={i}>
              Week of {formatDate(w.year, w.month, w.day)} (average {fmtTemp(w.meanOutdoorC)} °C outside)
              {i === coldest ? ", coldest week" : ""}
            </option>
          ))}
        </select>
      </div>

      <figure>
        <ul className="mb-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <LegendItem color={COLOR.before} dashed>
            Inside, your schedule now (dashed)
          </LegendItem>
          <LegendItem color={COLOR.after}>Inside, better schedule (solid)</LegendItem>
          <LegendItem color={COLOR.outdoor} thin>
            Outside (thin grey)
          </LegendItem>
          <LegendItem color={COLOR.text} thin dotted>
            Your minimum, {fmtSetpoint(comfortMinC)} °C (dotted)
          </LegendItem>
        </ul>
        <div ref={ref}>
          <svg
            role="img"
            aria-labelledby={`${uid}-t-title ${uid}-t-desc`}
            viewBox={`0 0 ${width} ${tempHeight}`}
            width="100%"
            className="block"
          >
            <title id={`${uid}-t-title`}>Simulated indoor temperature and outdoor temperature, hour by hour</title>
            <desc id={`${uid}-t-desc`}>{tempSummary}</desc>
            <Panel
              frame={frame}
              top={inTop}
              height={inHeight}
              min={inMin}
              max={inMax}
              ticks={niceTicks(inMin, inMax, 5)}
              title="Inside (°C), simulated"
              dayStarts={dayStarts}
            >
              {(y) => (
                <>
                  <line
                    x1={frame.left}
                    x2={width - frame.right}
                    y1={y(comfortMinC)}
                    y2={y(comfortMinC)}
                    stroke={COLOR.text}
                    strokeWidth="1"
                    strokeDasharray="1 4"
                  />
                  <path
                    d={linePath(data.inBefore, frame, y)}
                    fill="none"
                    stroke={COLOR.before}
                    strokeWidth="2"
                    strokeDasharray="7 4"
                    strokeLinejoin="round"
                  />
                  <path
                    d={linePath(data.inAfter, frame, y)}
                    fill="none"
                    stroke={COLOR.after}
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </>
              )}
            </Panel>
            <Panel
              frame={frame}
              top={outTop}
              height={outHeight}
              min={outMin}
              max={outMax}
              ticks={niceTicks(outMin, outMax, 4)}
              title="Outside (°C)"
              dayStarts={dayStarts}
            >
              {(y) => (
                <path
                  d={linePath(data.outdoor, frame, y)}
                  fill="none"
                  stroke={COLOR.outdoor}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              )}
            </Panel>
            <DayLabels frame={frame} y={outTop + outHeight + 17} data={data} dayStarts={dayStarts} />
          </svg>
        </div>
        <figcaption className="mt-2 text-sm">{tempSummary}</figcaption>
      </figure>

      <figure>
        <ul className="mb-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <LegendItem color={COLOR.before} dashed>
            Heat, your schedule now (dashed)
          </LegendItem>
          <LegendItem color={COLOR.after}>Heat, better schedule (solid)</LegendItem>
        </ul>
        <svg
          role="img"
          aria-labelledby={`${uid}-h-title ${uid}-h-desc`}
          viewBox={`0 0 ${width} ${heatHeight}`}
          width="100%"
          className="block"
        >
          <title id={`${uid}-h-title`}>Simulated heat delivered each hour, in kilowatts</title>
          <desc id={`${uid}-h-desc`}>{heatSummary}</desc>
          <Panel
            frame={frame}
            top={kwTop}
            height={kwHeight}
            min={0}
            max={kwMax}
            ticks={niceTicks(0, kwMax, 4)}
            title="Heat delivered each hour (kW), simulated"
            dayStarts={dayStarts}
          >
            {(y) => (
              <>
                <path
                  d={stepPath(data.kwBefore, frame, y)}
                  fill="none"
                  stroke={COLOR.before}
                  strokeWidth="1.75"
                  strokeDasharray="5 3"
                />
                <path d={stepPath(data.kwAfter, frame, y)} fill="none" stroke={COLOR.after} strokeWidth="1.75" />
              </>
            )}
          </Panel>
          <DayLabels frame={frame} y={kwTop + kwHeight + 17} data={data} dayStarts={dayStarts} />
        </svg>
        <figcaption className="mt-2 text-sm">
          {heatSummary}
        </figcaption>
      </figure>

      <details className="details" onToggle={(e) => setTableOpen(e.currentTarget.open)}>
        <summary>Show data table</summary>
        {tableOpen ? (
          <div
            className="table-scroll mt-2 max-h-[28rem] overflow-y-auto"
            tabIndex={0}
            role="region"
            aria-label={`Hourly values for the week of ${weekLabel}`}
          >
            <table className="table">
              <caption>Hourly simulated values, week of {weekLabel}</caption>
              <thead>
                <tr>
                  <th scope="col">Day</th>
                  <th scope="col">Hour</th>
                  <th scope="col" className="right">
                    Outside (°C)
                  </th>
                  <th scope="col" className="right">
                    Inside, now (°C)
                  </th>
                  <th scope="col" className="right">
                    Inside, better (°C)
                  </th>
                  <th scope="col" className="right">
                    Heat, now (kW)
                  </th>
                  <th scope="col" className="right">
                    Heat, better (kW)
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.times.map((t, k) => {
                  const [day, hour] = formatHourLabel(t).split(", ");
                  return (
                    <tr key={k}>
                      <td className="whitespace-nowrap">{day}</td>
                      <td>{hour}</td>
                      <td className="right">{fmtTemp(data.outdoor[k])}</td>
                      <td className="right">{fmtTemp(data.inBefore[k])}</td>
                      <td className="right">{fmtTemp(data.inAfter[k])}</td>
                      <td className="right">{fmtNum(data.kwBefore[k], 2)}</td>
                      <td className="right">{fmtNum(data.kwAfter[k], 2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </details>
    </div>
  );
}
