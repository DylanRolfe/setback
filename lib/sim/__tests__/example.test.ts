// The numbers quoted in README.md, docs/DEVPOST.md, docs/SOURCES.md and the video
// script come from this exact scenario. If the model, the weather file or a factor
// changes, this test fails and the documents must be updated to match.

import { describe, expect, it } from "vitest";
import { exampleScenario, runScenario, sanityCheck, suggestForScenario } from "../scenario";
import { loadWeather } from "./helpers";

const waterloo = loadWeather("waterloo");

describe("documented Waterloo example (apartment, gas furnace, 22 °C all day versus suggested schedule)", () => {
  const scenario = exampleScenario(waterloo);
  const run = runScenario(scenario, waterloo);

  it("suggests 21 °C / 18 °C with a 120 minute warm-up", () => {
    const s = suggestForScenario(scenario, waterloo);
    expect([s.homeC, s.setbackC, s.preheatMin, s.comfortMet]).toEqual([21, 18, 120, true]);
    expect(scenario.after.weekday).toEqual([
      { startMin: 5 * 60, setpointC: 21 },
      { startMin: 8 * 60 + 30, setpointC: 18 },
      { startMin: 15 * 60 + 30, setpointC: 21 },
      { startMin: 23 * 60, setpointC: 18 },
    ]);
    expect(scenario.after.weekend).toEqual([
      { startMin: 7 * 60, setpointC: 21 },
      { startMin: 23 * 60 + 30, setpointC: 18 },
    ]);
  });

  it("matches the before and after totals quoted in the documents", () => {
    expect(Math.round(run.before.totals.inputEnergyKWh)).toBe(9373);
    expect(Math.round(run.before.totals.gasM3)).toBe(879);
    expect(Math.round(run.before.totals.co2eKg)).toBe(1697);
    expect(Math.round(run.after.totals.inputEnergyKWh)).toBe(8546);
    expect(Math.round(run.after.totals.gasM3)).toBe(801);
    expect(Math.round(run.after.totals.co2eKg)).toBe(1548);
  });

  it("matches the savings quoted in the documents", () => {
    expect(Math.round(run.comparison.energySavedKWh)).toBe(827);
    expect((run.comparison.energySavedFraction * 100).toFixed(1)).toBe("8.8");
    expect(Math.round(run.comparison.gasSavedM3)).toBe(78);
    expect(Math.round(run.comparison.co2eSavedKg)).toBe(150);
    // "Scale it" example: a residence floor of 40 identical units (linear estimate).
    expect(Math.round((40 * run.comparison.co2eSavedKg) / 10) * 10).toBe(5990);
    expect(Math.round((40 * run.comparison.gasSavedM3) / 10) * 10).toBe(3100);
  });

  it("matches the comfort check and mean temperatures quoted in the documents", () => {
    expect(run.after.comfort.homeAwakeHours).toBe(1934);
    expect(run.after.comfort.hoursBelowMin.toFixed(1)).toBe("6.9");
    expect((run.after.comfort.lowestHomeAwakeC as number).toFixed(1)).toBe("19.4");
    expect(run.before.meanIndoorC.toFixed(1)).toBe("22.0");
    expect(run.after.meanIndoorC.toFixed(1)).toBe("20.1");
    expect(run.before.meanOutdoorC.toFixed(1)).toBe("0.1");
  });

  it("lands below both published figures, as the documents say", () => {
    const [nrcan, cmhc] = sanityCheck(scenario, waterloo);
    expect(nrcan.modelPct.toFixed(1)).toBe("1.4");
    expect(nrcan.verdict).toBe("below");
    expect(cmhc.modelPct.toFixed(1)).toBe("3.3");
    expect(cmhc.verdict).toBe("below");
  });
});

describe("documented five-city range for the NRCan test case (apartment, gas furnace)", () => {
  it("is 1.3% to 2.0%, inside NRCan's range only for Vancouver", () => {
    const pct: Record<string, number> = {};
    for (const id of ["waterloo", "toronto", "montreal", "calgary", "vancouver"]) {
      const weather = loadWeather(id);
      const scenario = { ...exampleScenario(weather), cityId: id };
      pct[id] = sanityCheck(scenario, weather)[0].modelPct;
    }
    const values = Object.values(pct);
    expect(Math.min(...values).toFixed(1)).toBe("1.3");
    expect(Math.max(...values).toFixed(1)).toBe("2.0");
    const inside = Object.keys(pct).filter((id) => pct[id] >= 1.5 && pct[id] <= 2.5);
    expect(inside).toEqual(["vancouver"]);
  });
});
