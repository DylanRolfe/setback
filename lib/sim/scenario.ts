// The Scenario is everything the user can change. It is the UI state and the
// payload of the share link. This file turns a Scenario into simulation runs.

import { CMHC_BENCHMARK, emissionFactorsFor, NRCAN_GUIDANCE } from "./factors";
import { compare, defaultHeaterCapacityW, simulate } from "./model";
import {
  cityById,
  DEADBAND_C,
  DEFAULT_BEFORE_SETPOINT_C,
  DEFAULT_CITY_ID,
  DEFAULT_COMFORT_MIN_C,
  DEFAULT_FURNACE_EFFICIENCY_PCT,
  DEFAULT_HOME_ID,
  DEFAULT_ROUTINE,
  HEAT_PUMP_COP_CURVE,
  HEATER_DESIGN_INDOOR_C,
  HEATER_SIZING_FACTOR,
  homeById,
  SUGGEST_COMFORT_SHARE,
  SUGGEST_HEAT_PUMP_DROP_C,
  SUGGEST_HOME_C,
  SUGGEST_PREHEAT_OPTIONS_MIN,
  SUGGEST_SETBACK_DROP_C,
} from "./presets";
import { constantSchedule, suggestSchedule } from "./schedule";
import {
  Comparison,
  HeatingType,
  Routine,
  SimInput,
  SimResult,
  WeatherSeason,
  WeeklySchedule,
} from "./types";

export interface Scenario {
  /** Schema version of the share link. */
  v: 1;
  cityId: string;
  homeId: string;
  /** Heat-loss coefficient, W/K (estimate, editable). */
  uaWPerK: number;
  /** Thermal capacitance, MJ/K (estimate, editable). */
  cMJPerK: number;
  /** Heater output in kW, or null to use the sizing rule (estimate). */
  heaterKW: number | null;
  heating: HeatingType;
  furnaceEfficiencyPct: number;
  routine: Routine;
  /** Lowest acceptable temperature while home and awake, °C. */
  comfortMinC: number;
  /** "Your schedule now". */
  before: WeeklySchedule;
  /** "A better schedule". */
  after: WeeklySchedule;
  /** "Scale it": number of identical homes (1 = just this one). */
  units: number;
  /** Optional price in cents per cubic metre (gas) or cents per kWh (electric), or null. */
  priceCents: number | null;
}

export function defaultScenario(): Scenario {
  const home = homeById(DEFAULT_HOME_ID);
  return {
    v: 1,
    cityId: DEFAULT_CITY_ID,
    homeId: home.id,
    uaWPerK: home.uaWPerK,
    cMJPerK: home.cMJPerK,
    heaterKW: null,
    heating: "gas",
    furnaceEfficiencyPct: DEFAULT_FURNACE_EFFICIENCY_PCT,
    routine: { ...DEFAULT_ROUTINE },
    comfortMinC: DEFAULT_COMFORT_MIN_C,
    before: constantSchedule(DEFAULT_BEFORE_SETPOINT_C),
    after: constantSchedule(DEFAULT_BEFORE_SETPOINT_C),
    units: 1,
    priceCents: null,
  };
}

/** Heater output actually used, in W: the user's value or the sizing-rule estimate. */
export function heaterCapacityW(scenario: Scenario, weather: WeatherSeason): number {
  if (scenario.heaterKW !== null && Number.isFinite(scenario.heaterKW)) return scenario.heaterKW * 1000;
  return defaultHeaterCapacityW(scenario.uaWPerK, weather, HEATER_SIZING_FACTOR, HEATER_DESIGN_INDOOR_C);
}

export function buildSimInput(scenario: Scenario, weather: WeatherSeason, schedule: WeeklySchedule): SimInput {
  const province = cityById(scenario.cityId).province;
  const price = scenario.priceCents;
  const hasPrice = price !== null && Number.isFinite(price) && price >= 0;
  return {
    weather,
    building: {
      uaWPerK: scenario.uaWPerK,
      cJPerK: scenario.cMJPerK * 1e6,
      heaterCapacityW: heaterCapacityW(scenario, weather),
    },
    heating: {
      type: scenario.heating,
      furnaceEfficiency: scenario.furnaceEfficiencyPct / 100,
      copCurve: HEAT_PUMP_COP_CURVE,
    },
    schedule,
    routine: scenario.routine,
    comfortMinC: scenario.comfortMinC,
    factors: emissionFactorsFor(province),
    prices: hasPrice
      ? scenario.heating === "gas"
        ? { gasCadPerM3: (price as number) / 100 }
        : { electricityCadPerKWh: (price as number) / 100 }
      : undefined,
    deadbandC: DEADBAND_C,
  };
}

export interface ScenarioRun {
  before: SimResult;
  after: SimResult;
  comparison: Comparison;
}

/** Run the "now" and "better" schedules through the same home, weather and heating system. */
export function runScenario(scenario: Scenario, weather: WeatherSeason): ScenarioRun {
  const before = simulate(buildSimInput(scenario, weather, scenario.before));
  const after = simulate(buildSimInput(scenario, weather, scenario.after));
  return { before, after, comparison: compare(before, after) };
}

/** Highest setpoint anywhere in a schedule. */
export function maxSetpoint(schedule: WeeklySchedule): number {
  return Math.max(...schedule.weekday.map((p) => p.setpointC), ...schedule.weekend.map((p) => p.setpointC));
}

export interface Suggestion {
  schedule: WeeklySchedule;
  /** Setpoint while home and awake, °C. */
  homeC: number;
  /** Setpoint while asleep or out, °C. */
  setbackC: number;
  /** Warm-up lead time chosen, minutes. */
  preheatMin: number;
  /** True when the comfort target was met (see SUGGEST_COMFORT_SHARE). */
  comfortMet: boolean;
  /** Simulated hours below the comfort minimum while home and awake, with this schedule. */
  hoursBelowMin: number;
}

/** Build a setback schedule from the person's routine.
 *
 *  - While home and awake: 21 °C, or the warmest temperature they use now if that is lower,
 *    but never less than half a degree above their comfort minimum.
 *  - While asleep or out: 3 °C lower (2 °C for a heat pump, per NRCan), never below NRCan's 17 °C floor
 *    unless the comfort temperature itself forces it.
 *  - Warm-up starts early. The shortest lead time is chosen for which the simulated room is below the
 *    comfort minimum for at most 1% of home-and-awake hours. */
export function suggestForScenario(scenario: Scenario, weather: WeatherSeason): Suggestion {
  const homeC = Math.max(Math.min(SUGGEST_HOME_C, maxSetpoint(scenario.before)), scenario.comfortMinC + 0.5);
  const drop = scenario.heating === "heatpump" ? SUGGEST_HEAT_PUMP_DROP_C : SUGGEST_SETBACK_DROP_C;
  const setbackC = Math.min(homeC, Math.max(NRCAN_GUIDANCE.floorC, homeC - drop));

  let chosen: Suggestion | null = null;
  for (const preheatMin of SUGGEST_PREHEAT_OPTIONS_MIN) {
    const schedule = suggestSchedule(scenario.routine, { homeC, setbackC, preheatMin });
    const result = simulate(buildSimInput(scenario, weather, schedule));
    const allowed = SUGGEST_COMFORT_SHARE * result.comfort.homeAwakeHours;
    const comfortMet = result.comfort.hoursBelowMin <= allowed;
    chosen = { schedule, homeC, setbackC, preheatMin, comfortMet, hoursBelowMin: result.comfort.hoursBelowMin };
    if (comfortMet) break;
  }
  return chosen as Suggestion;
}

/** The zero-setup demo: Waterloo apartment, gas furnace, 22 °C all day versus the suggested schedule. */
export function exampleScenario(weather: WeatherSeason): Scenario {
  const scenario = defaultScenario();
  scenario.after = suggestForScenario(scenario, weather).schedule;
  return scenario;
}

export type Verdict = "below" | "inside" | "above";

/** Range read as matching NRCan's "about 2 percent": the values that round to 2. Our reading. */
export const NRCAN_RANGE_PCT = { low: 1.5, high: 2.5 } as const;
/** Range read as matching CMHC's 6.5% for one test house. Our reading. */
export const CMHC_RANGE_PCT = { low: 6.0, high: 7.0 } as const;

export interface Benchmark {
  id: "nrcan" | "cmhc";
  /** What was simulated, in plain words. */
  description: string;
  /** Saving the model computes for that case, percent of heating energy. */
  modelPct: number;
  /** Published figure, percent. */
  publishedPct: number;
  /** Range treated as "matching" the published figure, percent. */
  rangeLowPct: number;
  rangeHighPct: number;
  verdict: Verdict;
}

function verdictFor(modelPct: number, low: number, high: number): Verdict {
  if (modelPct < low) return "below";
  if (modelPct > high) return "above";
  return "inside";
}

function nightSetback(baseC: number, setbackC: number, startMin: number, endMin: number): WeeklySchedule {
  const day = [
    { startMin: endMin, setpointC: baseC },
    { startMin, setpointC: setbackC },
  ];
  return { weekday: day, weekend: day };
}

/** Sanity check: run the published test cases through this model, with the user's home, city and
 *  heating system, and report honestly where the model lands.
 *
 *  NRCan's rule of thumb is "about 2 percent" for 1 °C over eight hours. "About 2" is read as the
 *  rounding interval 1.5% to 2.5%.
 *  CMHC's figure is 6.5% for one test house in Ottawa (22 °C to 18 °C, 11 p.m. to 6 a.m.). It is read
 *  as 6.0% to 7.0%. Different house, city and winter, so it is context, not a pass/fail test. */
export function sanityCheck(scenario: Scenario, weather: WeatherSeason): Benchmark[] {
  const run = (schedule: WeeklySchedule) => simulate(buildSimInput(scenario, weather, schedule));

  const base = Math.max(NRCAN_GUIDANCE.floorC + 1, Math.min(25, maxSetpoint(scenario.before)));
  const nrcanBefore = run(constantSchedule(base));
  const nrcanAfter = run(nightSetback(base, base - NRCAN_GUIDANCE.setbackDropC, 23 * 60, 7 * 60));
  const nrcanPct = compare(nrcanBefore, nrcanAfter).energySavedFraction * 100;

  const cmhcBefore = run(constantSchedule(CMHC_BENCHMARK.baselineC));
  const cmhcAfter = run(
    nightSetback(CMHC_BENCHMARK.baselineC, CMHC_BENCHMARK.setbackC, CMHC_BENCHMARK.startMin, CMHC_BENCHMARK.endMin)
  );
  const cmhcPct = compare(cmhcBefore, cmhcAfter).energySavedFraction * 100;

  return [
    {
      id: "nrcan",
      description: `${base} °C all day versus ${base - 1} °C from 11 p.m. to 7 a.m. (1 °C lower for eight hours)`,
      modelPct: nrcanPct,
      publishedPct: NRCAN_GUIDANCE.setbackSavingPct,
      rangeLowPct: NRCAN_RANGE_PCT.low,
      rangeHighPct: NRCAN_RANGE_PCT.high,
      verdict: verdictFor(nrcanPct, NRCAN_RANGE_PCT.low, NRCAN_RANGE_PCT.high),
    },
    {
      id: "cmhc",
      description: "22 °C all day versus 18 °C from 11 p.m. to 6 a.m.",
      modelPct: cmhcPct,
      publishedPct: CMHC_BENCHMARK.savingPct,
      rangeLowPct: CMHC_RANGE_PCT.low,
      rangeHighPct: CMHC_RANGE_PCT.high,
      verdict: verdictFor(cmhcPct, CMHC_RANGE_PCT.low, CMHC_RANGE_PCT.high),
    },
  ];
}
