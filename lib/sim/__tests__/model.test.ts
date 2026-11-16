import { describe, expect, it } from "vitest";
import { compare, defaultHeaterCapacityW, degreeHours, simulate, stepExact } from "../model";
import { constantSchedule, suggestSchedule } from "../schedule";
import { loadWeather } from "./helpers";
import {
  EmissionFactors,
  HeatingSystem,
  Routine,
  SimInput,
  SimInputError,
  WeatherSeason,
  WeeklySchedule,
} from "../types";

// Round test factors (not the cited ones) so expected values are easy to check by hand.
const TEST_FACTORS: EmissionFactors = { gasMJPerM3: 36, gasKgCo2ePerM3: 2, gridKgCo2ePerKWh: 0.1 };

const ROUTINE: Routine = {
  weekdayWakeMin: 7 * 60,
  weekdaySleepMin: 23 * 60,
  outOnWeekdays: true,
  weekdayLeaveMin: 8 * 60 + 30,
  weekdayReturnMin: 17 * 60 + 30,
  weekendWakeMin: 9 * 60,
  weekendSleepMin: 23 * 60 + 30,
};

const GAS: HeatingSystem = { type: "gas", furnaceEfficiency: 0.9, copCurve: [] };
const ELECTRIC: HeatingSystem = { type: "electric", furnaceEfficiency: 1, copCurve: [] };
const HEAT_PUMP: HeatingSystem = {
  type: "heatpump",
  furnaceEfficiency: 1,
  copCurve: [
    { outdoorC: -20, cop: 1.5 },
    { outdoorC: 10, cop: 3.5 },
  ],
};

const waterloo = loadWeather("waterloo");

function makeInput(overrides: Partial<SimInput> = {}): SimInput {
  const ua = 100;
  return {
    weather: waterloo,
    building: { uaWPerK: ua, cJPerK: 1.2e7, heaterCapacityW: defaultHeaterCapacityW(ua, waterloo) },
    heating: GAS,
    schedule: constantSchedule(21),
    routine: ROUTINE,
    comfortMinC: 20,
    factors: TEST_FACTORS,
    ...overrides,
  };
}

describe("constant setpoint", () => {
  it("delivers UA x degree-hours of heat, and burns that divided by efficiency", () => {
    for (const setpoint of [18, 21, 23]) {
      const result = simulate(makeInput({ schedule: constantSchedule(setpoint) }));
      const expectedHeatKWh = (100 * degreeHours(waterloo, setpoint)) / 1000;
      const expectedInputKWh = expectedHeatKWh / 0.9;
      // Tolerance 1%: the on/off thermostat wobbles around the setpoint and the
      // building coasts through mild hours, so the match is close but not exact.
      expect(result.totals.heatDeliveredKWh / expectedHeatKWh).toBeGreaterThan(0.99);
      expect(result.totals.heatDeliveredKWh / expectedHeatKWh).toBeLessThan(1.01);
      expect(result.totals.inputEnergyKWh / expectedInputKWh).toBeGreaterThan(0.99);
      expect(result.totals.inputEnergyKWh / expectedInputKWh).toBeLessThan(1.01);
    }
  });

  it("holds the indoor temperature inside the deadband once the heating season is under way", () => {
    const result = simulate(makeInput({ schedule: constantSchedule(21) }));
    // December to February: outdoor is always far below 21 C.
    for (let h = 1500; h < 3600; h++) {
      expect(result.indoorC[h]).toBeGreaterThan(20.7);
      expect(result.indoorC[h]).toBeLessThan(21.4);
    }
  });

  it("scales linearly with UA when C and heater size scale with it", () => {
    const one = simulate(makeInput());
    const two = simulate(
      makeInput({
        building: { uaWPerK: 200, cJPerK: 2.4e7, heaterCapacityW: 2 * defaultHeaterCapacityW(100, waterloo) },
      })
    );
    expect(two.totals.inputEnergyKWh / one.totals.inputEnergyKWh).toBeCloseTo(2, 6);
  });
});

describe("setback", () => {
  const setbacks: WeeklySchedule[] = [
    suggestSchedule(ROUTINE, { homeC: 21, setbackC: 18, preheatMin: 60 }),
    suggestSchedule(ROUTINE, { homeC: 21, setbackC: 15, preheatMin: 0 }),
    suggestSchedule(ROUTINE, { homeC: 21, setbackC: 20.5, preheatMin: 120 }),
    {
      weekday: [
        { startMin: 0, setpointC: 16 },
        { startMin: 360, setpointC: 21 },
        { startMin: 480, setpointC: 12 },
        { startMin: 1020, setpointC: 21 },
        { startMin: 1410, setpointC: 16 },
      ],
      weekend: [
        { startMin: 30, setpointC: 17 },
        { startMin: 600, setpointC: 21 },
      ],
    },
  ];

  it("never uses more heat or fuel than holding the higher setpoint all the time", () => {
    for (const cityId of ["waterloo", "toronto", "montreal", "calgary", "vancouver"]) {
      const weather = loadWeather(cityId);
      for (const heating of [GAS, ELECTRIC]) {
        const base = makeInput({
          weather,
          heating,
          building: { uaWPerK: 100, cJPerK: 1.2e7, heaterCapacityW: defaultHeaterCapacityW(100, weather) },
        });
        const constant = simulate({ ...base, schedule: constantSchedule(21) });
        for (const schedule of setbacks) {
          const setback = simulate({ ...base, schedule });
          expect(setback.totals.heatDeliveredKWh).toBeLessThanOrEqual(constant.totals.heatDeliveredKWh);
          expect(setback.totals.inputEnergyKWh).toBeLessThanOrEqual(constant.totals.inputEnergyKWh);
          expect(setback.totals.co2eKg).toBeLessThanOrEqual(constant.totals.co2eKg);
        }
      }
    }
  });

  it("saves more with a deeper setback", () => {
    const base = makeInput();
    const constant = simulate({ ...base, schedule: constantSchedule(21) });
    const shallow = simulate({ ...base, schedule: suggestSchedule(ROUTINE, { homeC: 21, setbackC: 19, preheatMin: 60 }) });
    const deep = simulate({ ...base, schedule: suggestSchedule(ROUTINE, { homeC: 21, setbackC: 16, preheatMin: 60 }) });
    const s1 = compare(constant, shallow).energySavedFraction;
    const s2 = compare(constant, deep).energySavedFraction;
    expect(s1).toBeGreaterThan(0);
    expect(s2).toBeGreaterThan(s1);
    expect(s2).toBeLessThan(0.5);
  });

  it("saves less in a building with more thermal mass, because it cools more slowly", () => {
    const schedule = suggestSchedule(ROUTINE, { homeC: 21, setbackC: 17, preheatMin: 60 });
    const saving = (cJPerK: number) => {
      const base = makeInput({ building: { uaWPerK: 100, cJPerK, heaterCapacityW: 8000 } });
      return compare(simulate({ ...base, schedule: constantSchedule(21) }), simulate({ ...base, schedule }))
        .energySavedFraction;
    };
    expect(saving(5e6)).toBeGreaterThan(saving(5e7));
  });
});

describe("energy conservation", () => {
  it("balances exactly in a single step: heat in = heat lost + heat stored", () => {
    const cases = [
      { t: 21, out: -10, q: 8000, ua: 120, c: 1e7, dt: 60 },
      { t: 15, out: 5, q: 0, ua: 60, c: 4e6, dt: 60 },
      { t: 18, out: 25, q: 0, ua: 300, c: 5e7, dt: 3600 },
      { t: 22.3, out: -26.2, q: 20000, ua: 250, c: 3e7, dt: 300 },
    ];
    for (const k of cases) {
      const step = stepExact(k.t, k.out, k.q, k.ua, k.c, k.dt);
      const heatIn = k.q * k.dt;
      const stored = k.c * (step.tEndC - k.t);
      expect(Math.abs(heatIn - step.lossJ - stored)).toBeLessThan(1e-6 * Math.max(1, Math.abs(heatIn), Math.abs(stored)));
    }
  });

  it("moves toward the outdoor temperature with no heat, and never past it", () => {
    const cool = stepExact(21, 0, 0, 100, 1e7, 3600);
    expect(cool.tEndC).toBeLessThan(21);
    expect(cool.tEndC).toBeGreaterThan(0);
    const longAgo = stepExact(21, 0, 0, 100, 1e7, 3600 * 24 * 365);
    expect(longAgo.tEndC).toBeCloseTo(0, 6);
  });

  it("balances over the whole season for every heating type", () => {
    const schedule = suggestSchedule(ROUTINE, { homeC: 21, setbackC: 17, preheatMin: 60 });
    for (const heating of [GAS, ELECTRIC, HEAT_PUMP]) {
      const r = simulate(makeInput({ heating, schedule }));
      expect(Math.abs(r.balance.residualKWh)).toBeLessThan(1e-6);
      expect(r.balance.heatLostKWh + r.balance.storedChangeKWh).toBeCloseTo(r.totals.heatDeliveredKWh, 6);
      // Hourly outputs add up to the totals.
      let heat = 0;
      let input = 0;
      for (let h = 0; h < r.hours; h++) {
        heat += r.heatW[h] / 1000;
        input += r.inputKWh[h];
      }
      expect(heat).toBeCloseTo(r.totals.heatDeliveredKWh, 6);
      expect(input).toBeCloseTo(r.totals.inputEnergyKWh, 6);
    }
  });
});

describe("fuel and emission conversion", () => {
  it("converts gas energy to cubic metres and CO2e with the given factors", () => {
    const r = simulate(makeInput());
    const expectedM3 = (r.totals.inputEnergyKWh * 3.6) / TEST_FACTORS.gasMJPerM3;
    expect(r.totals.gasM3).toBeCloseTo(expectedM3, 6);
    expect(r.totals.co2eKg).toBeCloseTo(expectedM3 * 2, 6);
    expect(r.totals.electricityKWh).toBe(0);
    expect(r.totals.inputEnergyKWh).toBeCloseTo(r.totals.heatDeliveredKWh / 0.9, 6);
  });

  it("treats electric baseboard as COP 1 and applies the grid factor", () => {
    const r = simulate(makeInput({ heating: ELECTRIC }));
    expect(r.totals.electricityKWh).toBeCloseTo(r.totals.heatDeliveredKWh, 9);
    expect(r.totals.gasM3).toBe(0);
    expect(r.totals.co2eKg).toBeCloseTo(r.totals.electricityKWh * 0.1, 9);
  });

  it("uses less electricity with a heat pump than with baseboards, for the same heat", () => {
    const baseboard = simulate(makeInput({ heating: ELECTRIC }));
    const heatPump = simulate(makeInput({ heating: HEAT_PUMP }));
    expect(heatPump.totals.heatDeliveredKWh).toBeCloseTo(baseboard.totals.heatDeliveredKWh, 9);
    expect(heatPump.totals.electricityKWh).toBeLessThan(baseboard.totals.electricityKWh / 1.5);
    expect(heatPump.totals.electricityKWh).toBeGreaterThan(baseboard.totals.electricityKWh / 3.5);
  });

  it("only reports a cost when a price for the fuel in use is given", () => {
    expect(simulate(makeInput()).totals.costCad).toBeNull();
    expect(simulate(makeInput({ prices: { electricityCadPerKWh: 0.1 } })).totals.costCad).toBeNull();
    const priced = simulate(makeInput({ prices: { gasCadPerM3: 0.3 } }));
    expect(priced.totals.costCad).toBeCloseTo(priced.totals.gasM3 * 0.3, 9);
  });
});

describe("edge cases", () => {
  it("uses no energy when the setpoint is always below the outdoor temperature", () => {
    const r = simulate(makeInput({ schedule: constantSchedule(5), weather: { ...waterloo, hourlyC: waterloo.hourlyC.map(() => 12) } }));
    expect(r.totals.heatDeliveredKWh).toBe(0);
    expect(r.totals.inputEnergyKWh).toBe(0);
    expect(r.totals.co2eKg).toBe(0);
    // The room drifts to the outdoor temperature; the model does not cool.
    expect(r.indoorC[r.hours - 1]).toBeCloseTo(12, 3);
  });

  it("gives zero saving, not a division by zero, when nothing is used", () => {
    const warm = { ...waterloo, hourlyC: waterloo.hourlyC.map(() => 25) };
    const r = simulate(makeInput({ weather: warm }));
    expect(compare(r, r).energySavedFraction).toBe(0);
  });

  it("rejects zero, negative or non-numeric UA with a clear message", () => {
    for (const ua of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const run = () => simulate(makeInput({ building: { uaWPerK: ua, cJPerK: 1e7, heaterCapacityW: 5000 } }));
      expect(run).toThrow(SimInputError);
      expect(run).toThrow(/UA.*greater than 0/);
    }
  });

  it("rejects zero thermal mass and zero heater size", () => {
    expect(() => simulate(makeInput({ building: { uaWPerK: 100, cJPerK: 0, heaterCapacityW: 5000 } }))).toThrow(/Thermal mass/);
    expect(() => simulate(makeInput({ building: { uaWPerK: 100, cJPerK: 1e7, heaterCapacityW: 0 } }))).toThrow(/Heater size/);
  });

  it("rejects impossible heating settings", () => {
    expect(() => simulate(makeInput({ heating: { ...GAS, furnaceEfficiency: 0 } }))).toThrow(/efficiency/);
    expect(() => simulate(makeInput({ heating: { ...GAS, furnaceEfficiency: 1.2 } }))).toThrow(/efficiency/);
    expect(() => simulate(makeInput({ heating: { ...HEAT_PUMP, copCurve: [] } }))).toThrow(/COP/);
  });

  it("falls short on comfort, and says so, when the heater is too small to recover", () => {
    const schedule = suggestSchedule(ROUTINE, { homeC: 21, setbackC: 15, preheatMin: 0 });
    const small = simulate(makeInput({ schedule, building: { uaWPerK: 100, cJPerK: 1.2e7, heaterCapacityW: 3000 } }));
    expect(small.comfort.hoursBelowMin).toBeGreaterThan(100);
    expect(small.comfort.lowestHomeAwakeC).not.toBeNull();
    expect(small.comfort.lowestHomeAwakeC as number).toBeLessThan(20);
    const steady = simulate(makeInput({ schedule: constantSchedule(21) }));
    expect(steady.comfort.hoursBelowMin).toBe(0);
    expect(steady.comfort.homeAwakeHours).toBeGreaterThan(1000);
  });
});

describe("performance", () => {
  it("runs a before-and-after pair in well under one second", () => {
    const base = makeInput();
    const t0 = performance.now();
    simulate({ ...base, schedule: constantSchedule(22) });
    simulate({ ...base, schedule: suggestSchedule(ROUTINE, { homeC: 21, setbackC: 18, preheatMin: 60 }) });
    expect(performance.now() - t0).toBeLessThan(1000);
  });
});
