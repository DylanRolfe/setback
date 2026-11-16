import { describe, expect, it } from "vitest";
import { decodeScenario, encodeScenario, scenarioFromHash, scenarioToHash } from "../../share";
import {
  emissionFactorsFor,
  GAS_HHV_MJ_PER_M3,
  gasKgCo2ePerM3,
  NRCAN_GUIDANCE,
  PROVINCES,
  SOURCES,
} from "../factors";
import { simulate } from "../model";
import { CITIES, HEAT_PUMP_COP_CURVE, HOME_PRESETS, MASS_CLASS_J_PER_K_M2 } from "../presets";
import {
  buildSimInput,
  defaultScenario,
  exampleScenario,
  heaterCapacityW,
  maxSetpoint,
  runScenario,
  sanityCheck,
  Scenario,
  suggestForScenario,
} from "../scenario";
import { buildWeeklySetpoints, constantSchedule } from "../schedule";
import { loadWeather } from "./helpers";

const waterloo = loadWeather("waterloo");

describe("cited factors", () => {
  it("adds CH4 and N2O to the CO2 factor with the AR5 warming potentials", () => {
    // 1921 + 0.037 x 28 + 0.035 x 265 = 1931.311 g CO2e per m3
    expect(gasKgCo2ePerM3("ON")).toBeCloseTo(1.931311, 6);
    expect(gasKgCo2ePerM3("BC")).toBeCloseTo(1.976311, 6);
  });

  it("resolves factors for each province", () => {
    const on = emissionFactorsFor("ON");
    expect(on.gasMJPerM3).toBe(GAS_HHV_MJ_PER_M3);
    expect(on.gridKgCo2ePerKWh).toBeCloseTo(0.073, 9);
    expect(emissionFactorsFor("QC").gridKgCo2ePerKWh).toBeCloseTo(0.0026, 9);
    expect(emissionFactorsFor("AB").gridKgCo2ePerKWh).toBeCloseTo(0.346, 9);
    for (const city of CITIES) expect(PROVINCES[city.province]).toBeDefined();
  });

  it("gives every source a title, publisher, https link and licence", () => {
    for (const source of Object.values(SOURCES)) {
      expect(source.title.length).toBeGreaterThan(5);
      expect(source.publisher.length).toBeGreaterThan(2);
      expect(source.url).toMatch(/^https:\/\//);
      expect(source.licence.length).toBeGreaterThan(2);
    }
  });
});

describe("presets", () => {
  it("derive thermal mass from floor area and the ISO 13790 mass class", () => {
    for (const home of HOME_PRESETS) {
      const expected = (home.floorAreaM2 * MASS_CLASS_J_PER_K_M2[home.massClass]) / 1e6;
      expect(home.cMJPerK).toBeCloseTo(expected, 1);
    }
  });

  it("give a seasonal heat output inside NRCan's range for Ontario homes of that type", () => {
    // CEUD Ontario 2023, Table 32, gross output thermal requirements, GJ per household,
    // lowest and highest vintage class for each building type.
    const range: Record<string, [number, number]> = {
      apartment: [22.6, 68.7],
      townhouse: [38.2, 121.5],
      detached: [64.2, 150.5],
    };
    for (const home of HOME_PRESETS) {
      const scenario: Scenario = { ...defaultScenario(), homeId: home.id, uaWPerK: home.uaWPerK, cMJPerK: home.cMJPerK };
      const result = simulate(buildSimInput(scenario, waterloo, constantSchedule(21)));
      const gj = result.totals.heatDeliveredKWh * 0.0036;
      expect(gj).toBeGreaterThan(range[home.id][0]);
      expect(gj).toBeLessThan(range[home.id][1]);
    }
  });

  it("has a heat pump curve that passes through the midpoints of NRCan's ranges", () => {
    expect(HEAT_PUMP_COP_CURVE.find((p) => p.outdoorC === 8)?.cop).toBeCloseTo((2.0 + 5.4) / 2, 9);
    expect(HEAT_PUMP_COP_CURVE.find((p) => p.outdoorC === -8)?.cop).toBeCloseTo((1.1 + 3.7) / 2, 9);
  });
});

describe("scenario runs", () => {
  it("shows no saving when the two schedules are the same", () => {
    const run = runScenario(defaultScenario(), waterloo);
    expect(run.comparison.energySavedKWh).toBe(0);
    expect(run.comparison.co2eSavedKg).toBe(0);
  });

  it("sizes the heater from the coldest hour unless the user sets it", () => {
    const scenario = defaultScenario();
    const coldest = Math.min(...waterloo.hourlyC);
    const auto = heaterCapacityW(scenario, waterloo);
    expect(auto).toBeCloseTo(1.5 * scenario.uaWPerK * (22 - coldest), -2);
    expect(heaterCapacityW({ ...scenario, heaterKW: 7.5 }, waterloo)).toBe(7500);
  });

  it("gives a plausible, comfortable saving for the Waterloo example", () => {
    const scenario = exampleScenario(waterloo);
    const run = runScenario(scenario, waterloo);
    expect(run.comparison.energySavedFraction).toBeGreaterThan(0.03);
    expect(run.comparison.energySavedFraction).toBeLessThan(0.2);
    expect(run.comparison.gasSavedM3).toBeGreaterThan(0);
    expect(run.comparison.co2eSavedKg).toBeCloseTo(run.comparison.gasSavedM3 * gasKgCo2ePerM3("ON"), 6);
    expect(run.after.comfort.hoursBelowMin).toBeLessThanOrEqual(0.01 * run.after.comfort.homeAwakeHours);
    expect(run.comparison.costSavedCad).toBeNull();
  });

  it("reports a cost only when the user enters a price", () => {
    const scenario = { ...exampleScenario(waterloo), priceCents: 30 };
    const run = runScenario(scenario, waterloo);
    expect(run.comparison.costSavedCad).toBeCloseTo(run.comparison.gasSavedM3 * 0.3, 6);
  });
});

describe("suggestion", () => {
  it("follows NRCan: at most 3 °C of setback, never below 17 °C, 2 °C for heat pumps", () => {
    for (const heating of ["gas", "electric", "heatpump"] as const) {
      const scenario = { ...defaultScenario(), heating };
      const s = suggestForScenario(scenario, waterloo);
      expect(s.homeC).toBe(21);
      expect(s.setbackC).toBe(heating === "heatpump" ? 19 : 18);
      expect(s.setbackC).toBeGreaterThanOrEqual(NRCAN_GUIDANCE.floorC);
      expect(maxSetpoint(s.schedule)).toBe(21);
      expect(() => buildWeeklySetpoints(s.schedule)).not.toThrow();
      expect(s.comfortMet).toBe(true);
    }
  });

  it("does not suggest a warmer home than the person keeps now", () => {
    const scenario = { ...defaultScenario(), before: constantSchedule(20), comfortMinC: 19 };
    const s = suggestForScenario(scenario, waterloo);
    expect(s.homeC).toBe(20);
    expect(s.setbackC).toBe(17);
  });
});

describe("sanity check against published figures", () => {
  it("runs the NRCan and CMHC cases and labels the result honestly", () => {
    const checks = sanityCheck(exampleScenario(waterloo), waterloo);
    expect(checks.map((c) => c.id)).toEqual(["nrcan", "cmhc"]);
    for (const c of checks) {
      expect(c.modelPct).toBeGreaterThan(0);
      const expected = c.modelPct < c.rangeLowPct ? "below" : c.modelPct > c.rangeHighPct ? "above" : "inside";
      expect(c.verdict).toBe(expected);
    }
    expect(checks[0].publishedPct).toBe(2);
    expect(checks[1].publishedPct).toBe(6.5);
  });
});

describe("share link", () => {
  it("round-trips a scenario through the URL hash", () => {
    const scenario = { ...exampleScenario(waterloo), units: 40, priceCents: 28.5, heaterKW: 6.2 };
    const hash = scenarioToHash(scenario);
    expect(hash).toMatch(/^#s=[A-Za-z0-9_-]+$/);
    expect(scenarioFromHash(hash)).toEqual(scenario);
    expect(hash.length).toBeLessThan(600);
  });

  it("returns null for missing, broken or tampered links", () => {
    expect(scenarioFromHash("")).toBeNull();
    expect(scenarioFromHash("#s=not-base64-json")).toBeNull();
    expect(scenarioFromHash("#other=1")).toBeNull();
    const good = JSON.parse(Buffer.from(encodeScenario(defaultScenario()), "base64url").toString("utf8"));
    const pack = (obj: unknown) => Buffer.from(JSON.stringify(obj), "utf8").toString("base64url");
    expect(decodeScenario(pack(good))).not.toBeNull();
    expect(decodeScenario(pack({ ...good, v: 2 }))).toBeNull();
    expect(decodeScenario(pack({ ...good, c: "atlantis" }))).toBeNull();
    expect(decodeScenario(pack({ ...good, ua: 0 }))).toBeNull();
    expect(decodeScenario(pack({ ...good, ht: "coal" }))).toBeNull();
    expect(decodeScenario(pack({ ...good, b: [[[0, 99]], [[0, 20]]] }))).toBeNull();
    expect(decodeScenario(pack({ ...good, a: [[], [[0, 20]]] }))).toBeNull();
    expect(decodeScenario(pack({ ...good, r: [1, 2, 3] }))).toBeNull();
  });
});
