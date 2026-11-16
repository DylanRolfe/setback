// The rows of the "Sources and assumptions" panel, generated from the same
// constants the simulation uses, so the panel can never drift from the model.

import {
  GAS_CH4_G_PER_M3,
  GAS_HHV_MJ_PER_M3,
  GAS_N2O_G_PER_M3,
  gasKgCo2ePerM3,
  GWP_CH4,
  GWP_N2O,
  NRCAN_GUIDANCE,
  PROVINCES,
  SourceId,
} from "./factors";
import { DEFAULT_SUBSTEP_S } from "./model";
import {
  cityById,
  DEADBAND_C,
  FURNACE_OPTIONS,
  HEAT_PUMP_COP_CURVE,
  HEATER_DESIGN_INDOOR_C,
  HEATER_SIZING_FACTOR,
  homeById,
  MASS_CLASS_J_PER_K_M2,
  SUGGEST_COMFORT_SHARE,
  SUGGEST_HEAT_PUMP_DROP_C,
  SUGGEST_HOME_C,
  SUGGEST_SETBACK_DROP_C,
} from "./presets";
import { heaterCapacityW, Scenario } from "./scenario";
import { WeatherSeason } from "./types";

export type AssumptionKind = "cited" | "calculated" | "estimate" | "your input" | "model setting";

export interface AssumptionRow {
  group: "Weather" | "Your home" | "Heating system" | "Emissions" | "Suggested schedule";
  label: string;
  /** Value with its unit, ready to display. */
  value: string;
  kind: AssumptionKind;
  sourceIds: SourceId[];
  note?: string;
}

const fmt = (x: number, digits = 0) =>
  x.toLocaleString("en-CA", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export function listAssumptions(scenario: Scenario, weather: WeatherSeason): AssumptionRow[] {
  const city = cityById(scenario.cityId);
  const province = PROVINCES[city.province];
  const home = homeById(scenario.homeId);
  const uaIsPreset = scenario.uaWPerK === home.uaWPerK;
  const cIsPreset = scenario.cMJPerK === home.cMJPerK;
  const furnace = FURNACE_OPTIONS.find((f) => f.efficiencyPct === scenario.furnaceEfficiencyPct);
  const rows: AssumptionRow[] = [];

  rows.push({
    group: "Weather",
    label: `Outdoor temperature, ${weather.name}`,
    value: `${fmt(weather.hourlyC.length)} hourly values, ${weather.seasonLabel}`,
    kind: "cited",
    sourceIds: ["openMeteo"],
    note: "Weather data by Open-Meteo.com, CC BY 4.0. Downloaded once when the site was built and rounded to 0.1 °C. One past season; other winters will differ.",
  });

  rows.push({
    group: "Your home",
    label: "Heat loss (UA)",
    value: `${fmt(scenario.uaWPerK)} W/K`,
    kind: uaIsPreset ? "estimate" : "your input",
    sourceIds: ["ceudOntario"],
    note: uaIsPreset
      ? `Estimate for the "${home.label}" preset, not a measurement. Chosen so the simulated seasonal heat output at a constant 21 °C in Waterloo sits inside the range NRCan reports for Ontario homes of this type.`
      : "You changed this from the preset.",
  });
  rows.push({
    group: "Your home",
    label: "Thermal mass (C)",
    value: `${fmt(scenario.cMJPerK, 1)} MJ/K`,
    kind: cIsPreset ? "estimate" : "your input",
    sourceIds: ["iso13790"],
    note: cIsPreset
      ? `Estimate: ${home.floorAreaM2} m² of floor × ${fmt(MASS_CLASS_J_PER_K_M2[home.massClass])} J/K per m² (the "${home.massClass}" building class of ISO 13790). Using that class value as the single C of this model is our assumption.`
      : "You changed this from the preset.",
  });
  rows.push({
    group: "Your home",
    label: "Heater size",
    value: `${fmt(heaterCapacityW(scenario, weather) / 1000, 1)} kW`,
    kind: scenario.heaterKW === null ? "estimate" : "your input",
    sourceIds: [],
    note:
      scenario.heaterKW === null
        ? `Estimate: ${HEATER_SIZING_FACTOR} × the heat needed to hold ${HEATER_DESIGN_INDOOR_C} °C in the coldest hour of this season. It only affects how fast the room warms back up.`
        : "You entered this.",
  });
  rows.push({
    group: "Your home",
    label: "Thermostat deadband",
    value: `${DEADBAND_C} °C`,
    kind: "estimate",
    sourceIds: [],
    note: `The heat turns on ${DEADBAND_C / 2} °C below the set temperature and off ${DEADBAND_C / 2} °C above it.`,
  });
  rows.push({
    group: "Your home",
    label: "Time step",
    value: `${DEFAULT_SUBSTEP_S} seconds`,
    kind: "model setting",
    sourceIds: [],
    note: "Each step uses the exact solution of the heat-balance equation, so energy in equals energy lost plus energy stored.",
  });

  if (scenario.heating === "gas") {
    rows.push({
      group: "Heating system",
      label: "Furnace efficiency (AFUE)",
      value: `${fmt(scenario.furnaceEfficiencyPct)}%`,
      kind: furnace ? "cited" : "your input",
      sourceIds: furnace ? [furnace.sourceId] : [],
      note: furnace ? furnace.label : "You entered this.",
    });
  } else if (scenario.heating === "electric") {
    rows.push({
      group: "Heating system",
      label: "Electric baseboard efficiency",
      value: "100% (COP 1)",
      kind: "model setting",
      sourceIds: [],
      note: "All the electricity an electric resistance heater uses becomes heat in the room.",
    });
  } else {
    rows.push({
      group: "Heating system",
      label: "Heat pump efficiency (COP)",
      value: HEAT_PUMP_COP_CURVE.map((p) => `${fmt(p.cop, 1)} at ${p.outdoorC} °C`).join(", "),
      kind: "estimate",
      sourceIds: ["nrcanHeatPump", "canmetCcht"],
      note: "Estimate built from cited ranges: the midpoints of NRCan's typical ranges (2.0 to 5.4 at 8 °C, 1.1 to 3.7 at –8 °C), straight lines between points, 1.0 at –25 °C where backup heat takes over, flat above 8 °C. Your unit may be better or worse. Backup heat during warm-up is not modeled.",
    });
  }

  if (scenario.heating === "gas") {
    rows.push({
      group: "Emissions",
      label: `Natural gas CO2, ${province.name}`,
      value: `${fmt(province.gasCo2GPerM3)} g CO2 per m³`,
      kind: "cited",
      sourceIds: ["nirA6", "ecccFactors"],
    });
    rows.push({
      group: "Emissions",
      label: "Natural gas CH4 and N2O, residential",
      value: `${GAS_CH4_G_PER_M3} g CH4 and ${GAS_N2O_G_PER_M3} g N2O per m³`,
      kind: "cited",
      sourceIds: ["nirA6", "ecccFactors"],
    });
    rows.push({
      group: "Emissions",
      label: "Global warming potentials (100-year)",
      value: `CH4 = ${GWP_CH4}, N2O = ${GWP_N2O}`,
      kind: "cited",
      sourceIds: ["ecccGwp"],
    });
    rows.push({
      group: "Emissions",
      label: "Natural gas CO2e",
      value: `${fmt(gasKgCo2ePerM3(city.province), 3)} kg CO2e per m³`,
      kind: "calculated",
      sourceIds: ["nirA6", "ecccGwp"],
      note: `${fmt(province.gasCo2GPerM3)} + ${GAS_CH4_G_PER_M3} × ${GWP_CH4} + ${GAS_N2O_G_PER_M3} × ${GWP_N2O} grams. Burning the gas only; leaks and production upstream are not included.`,
    });
    rows.push({
      group: "Emissions",
      label: "Energy in natural gas (higher heating value)",
      value: `${GAS_HHV_MJ_PER_M3} MJ per m³`,
      kind: "cited",
      sourceIds: ["ecccFactors"],
    });
  } else {
    rows.push({
      group: "Emissions",
      label: `Grid electricity, ${province.name}`,
      value: `${province.gridGPerKWh} g CO2e per kWh used`,
      kind: "cited",
      sourceIds: ["nirA7", "ecccFactors"],
      note: `Consumption intensity for 2024 (marked preliminary), NIR Table ${province.gridTable}. This is a yearly average for the province. The power plants that respond when you use less on a cold evening can be cleaner or dirtier than the average.`,
    });
  }

  rows.push({
    group: "Suggested schedule",
    label: "Temperatures",
    value: `${SUGGEST_HOME_C} °C at home, ${SUGGEST_SETBACK_DROP_C} °C lower asleep or out (${SUGGEST_HEAT_PUMP_DROP_C} °C lower for heat pumps), never below ${NRCAN_GUIDANCE.floorC} °C`,
    kind: "estimate",
    sourceIds: ["nrcanSmart", "keepingHeatIn", "nrcanHeatPump"],
    note: "Our choice, kept inside NRCan's advice: two to three degrees of setback, not below 17 °C, and not more than 2 °C for heat pumps. If you keep your home cooler than 21 °C now, the suggestion uses your temperature.",
  });
  rows.push({
    group: "Suggested schedule",
    label: "Warm-up lead time",
    value: "30 to 180 minutes, chosen by simulation",
    kind: "model setting",
    sourceIds: [],
    note: `The shortest lead time for which the simulated room is below your comfort minimum for at most ${SUGGEST_COMFORT_SHARE * 100}% of the hours you are home and awake.`,
  });

  return rows;
}

/** Model limitations, in plain language. Shown in the app and repeated in the README and Devpost text. */
export const LIMITATIONS: string[] = [
  "These are simulations, not measured savings. Nobody's meter was read.",
  "The home is modeled as a single zone: one indoor temperature, one heat-loss number (UA) and one thermal-mass number (C). Real homes have warm and cold rooms.",
  "The UA and C presets are estimates, not measurements of your home. Your results depend on them.",
  "Free heat from the sun, people and appliances is not modeled, and neither is heat shared with neighbouring units. This makes the percentage saving lean low: the model lands at or below the published figures it is checked against.",
  "The heat pump efficiency curve is approximate. Backup heat that some heat pumps switch on while warming back up is not modeled, so heat pump savings may be overstated. NRCan advises setbacks of no more than 2 °C for heat pumps.",
  "Humidity and how warm a room feels are not modeled. NRCan advises not going below 17 °C because of moisture risk in outside walls.",
  "Furnace fan electricity, pilot lights and duct losses are not counted.",
  "Gas emissions cover burning the gas only. Grid emissions use a yearly provincial average, not the hour-by-hour mix.",
  "The weather is one past heating season (October 2025 to April 2026). A colder or milder winter changes the totals.",
  "Savings only happen if the schedule is actually programmed and left running. Renters who cannot control their thermostat cannot act on it.",
  "\"Scale it\" multiplies one home by a number. It assumes identical homes and schedules.",
];
