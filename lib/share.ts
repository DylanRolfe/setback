// Share link: the whole scenario is encoded in the URL hash (#s=...). Nothing is sent to a server.

import { CITIES, HOME_PRESETS } from "./sim/presets";
import { defaultScenario, Scenario } from "./sim/scenario";
import { MAX_PERIODS_PER_DAY, normalizePeriods, SETPOINT_MAX_C, SETPOINT_MIN_C } from "./sim/schedule";
import { HeatingType, Routine, SchedulePeriod, WeeklySchedule } from "./sim/types";

const HASH_KEY = "s";

/** Largest "Scale it" value. The field in the app and the link decoder use the same limit. */
export const MAX_UNITS = 10000;

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): string {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((text.length + 3) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Compact form: short keys and arrays, so links stay short. */
type Packed = {
  v: 1;
  c: string;
  h: string;
  ua: number;
  cm: number;
  hk: number | null;
  ht: HeatingType;
  fe: number;
  r: [number, number, 0 | 1, number, number, number, number];
  cf: number;
  b: [number[][], number[][]];
  a: [number[][], number[][]];
  n: number;
  p: number | null;
};

const packPeriods = (periods: SchedulePeriod[]) => periods.map((p) => [p.startMin, p.setpointC]);
const packSchedule = (s: WeeklySchedule): [number[][], number[][]] => [packPeriods(s.weekday), packPeriods(s.weekend)];

export function encodeScenario(scenario: Scenario): string {
  const r = scenario.routine;
  const packed: Packed = {
    v: 1,
    c: scenario.cityId,
    h: scenario.homeId,
    ua: scenario.uaWPerK,
    cm: scenario.cMJPerK,
    hk: scenario.heaterKW,
    ht: scenario.heating,
    fe: scenario.furnaceEfficiencyPct,
    r: [
      r.weekdayWakeMin,
      r.weekdaySleepMin,
      r.outOnWeekdays ? 1 : 0,
      r.weekdayLeaveMin,
      r.weekdayReturnMin,
      r.weekendWakeMin,
      r.weekendSleepMin,
    ],
    cf: scenario.comfortMinC,
    b: packSchedule(scenario.before),
    a: packSchedule(scenario.after),
    n: scenario.units,
    p: scenario.priceCents,
  };
  return toBase64Url(JSON.stringify(packed));
}

const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const isMinute = (x: unknown): x is number => isNum(x) && Number.isInteger(x) && x >= 0 && x < 1440;

function unpackPeriods(raw: unknown): SchedulePeriod[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_PERIODS_PER_DAY) return null;
  const periods: SchedulePeriod[] = [];
  for (const item of raw) {
    if (!Array.isArray(item) || !isMinute(item[0]) || !isNum(item[1])) return null;
    if (item[1] < SETPOINT_MIN_C || item[1] > SETPOINT_MAX_C) return null;
    periods.push({ startMin: item[0], setpointC: item[1] });
  }
  return normalizePeriods(periods);
}

function unpackSchedule(raw: unknown): WeeklySchedule | null {
  if (!Array.isArray(raw) || raw.length !== 2) return null;
  const weekday = unpackPeriods(raw[0]);
  const weekend = unpackPeriods(raw[1]);
  return weekday && weekend ? { weekday, weekend } : null;
}

/** Decode and validate a share payload. Returns null for anything that is not a valid scenario,
 *  so a broken or tampered link falls back to the defaults instead of crashing. */
export function decodeScenario(encoded: string): Scenario | null {
  try {
    const p = JSON.parse(fromBase64Url(encoded)) as Partial<Packed>;
    if (!p || p.v !== 1) return null;
    const base = defaultScenario();
    if (typeof p.c !== "string" || !CITIES.some((c) => c.id === p.c)) return null;
    if (typeof p.h !== "string" || !HOME_PRESETS.some((h) => h.id === p.h)) return null;
    if (!isNum(p.ua) || p.ua <= 0 || !isNum(p.cm) || p.cm <= 0) return null;
    if (p.ht !== "gas" && p.ht !== "electric" && p.ht !== "heatpump") return null;
    const r = p.r;
    if (!Array.isArray(r) || r.length !== 7) return null;
    if (![r[0], r[1], r[3], r[4], r[5], r[6]].every(isMinute)) return null;
    const routine: Routine = {
      weekdayWakeMin: r[0],
      weekdaySleepMin: r[1],
      outOnWeekdays: r[2] === 1,
      weekdayLeaveMin: r[3],
      weekdayReturnMin: r[4],
      weekendWakeMin: r[5],
      weekendSleepMin: r[6],
    };
    const before = unpackSchedule(p.b);
    const after = unpackSchedule(p.a);
    if (!before || !after) return null;
    return {
      v: 1,
      cityId: p.c,
      homeId: p.h,
      uaWPerK: clamp(p.ua, 1, 5000),
      cMJPerK: clamp(p.cm, 0.1, 1000),
      heaterKW: isNum(p.hk) && p.hk > 0 ? clamp(p.hk, 0.1, 200) : null,
      heating: p.ht,
      furnaceEfficiencyPct: isNum(p.fe) ? clamp(p.fe, 30, 100) : base.furnaceEfficiencyPct,
      routine,
      comfortMinC: isNum(p.cf) ? clamp(p.cf, SETPOINT_MIN_C, SETPOINT_MAX_C) : base.comfortMinC,
      before,
      after,
      units: isNum(p.n) ? clamp(Math.round(p.n), 1, MAX_UNITS) : 1,
      priceCents: isNum(p.p) && p.p >= 0 ? clamp(p.p, 0, 1000) : null,
    };
  } catch {
    return null;
  }
}

/** "#s=<payload>" for a scenario. */
export function scenarioToHash(scenario: Scenario): string {
  return `#${HASH_KEY}=${encodeScenario(scenario)}`;
}

/** Read a scenario from a location hash, or null if there is none or it is invalid. */
export function scenarioFromHash(hash: string): Scenario | null {
  const match = new RegExp(`[#&]${HASH_KEY}=([A-Za-z0-9_-]+)`).exec(hash);
  return match ? decodeScenario(match[1]) : null;
}
