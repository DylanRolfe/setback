// Cities, home presets and defaults. Anything marked "estimate" is an assumption
// that the app labels as such and lets the user change.

import { ProvinceCode } from "./factors";
import { CopPoint, HeatingType, Routine } from "./types";

export interface City {
  id: string;
  name: string;
  province: ProvinceCode;
  /** Path of the static weather file, relative to the site root. */
  weatherPath: string;
}

export const CITIES: City[] = [
  { id: "waterloo", name: "Waterloo, Ontario", province: "ON", weatherPath: "/data/weather-waterloo.json" },
  { id: "toronto", name: "Toronto, Ontario", province: "ON", weatherPath: "/data/weather-toronto.json" },
  { id: "montreal", name: "Montreal, Quebec", province: "QC", weatherPath: "/data/weather-montreal.json" },
  { id: "calgary", name: "Calgary, Alberta", province: "AB", weatherPath: "/data/weather-calgary.json" },
  { id: "vancouver", name: "Vancouver, British Columbia", province: "BC", weatherPath: "/data/weather-vancouver.json" },
];

export const DEFAULT_CITY_ID = "waterloo";

export function cityById(id: string): City {
  return CITIES.find((c) => c.id === id) ?? CITIES[0];
}

export interface HomePreset {
  id: string;
  label: string;
  description: string;
  /** Estimate: heated floor area, m2. */
  floorAreaM2: number;
  /** Estimate: effective heat-loss coefficient, W/K. */
  uaWPerK: number;
  /** ISO 13790 mass class used for the capacitance estimate. */
  massClass: "light" | "medium";
  /** Estimate: floor area x mass-class heat capacity, in MJ/K. */
  cMJPerK: number;
}

/** Heat capacity per m2 of floor area for the ISO 13790 mass classes (cited, see SOURCES.iso13790). */
export const MASS_CLASS_J_PER_K_M2 = { light: 110_000, medium: 165_000 } as const;

const preset = (
  id: string,
  label: string,
  description: string,
  floorAreaM2: number,
  uaWPerK: number,
  massClass: "light" | "medium"
): HomePreset => ({
  id,
  label,
  description,
  floorAreaM2,
  uaWPerK,
  massClass,
  cMJPerK: Math.round((floorAreaM2 * MASS_CLASS_J_PER_K_M2[massClass]) / 1e5) / 10,
});

/** Home presets. UA and C are estimates, not measurements of any real home.
 *  UA was chosen so that the simulated seasonal heat output at a constant 21 °C
 *  in Waterloo falls inside the range NRCan reports for Ontario homes of that
 *  type (CEUD Table 32). See docs/SOURCES.md for the comparison. */
export const HOME_PRESETS: HomePreset[] = [
  preset("apartment", "Apartment", "About 70 m² in a multi-unit building", 70, 80, "medium"),
  preset("townhouse", "Townhouse", "About 140 m², shares one or two walls", 140, 145, "light"),
  preset("detached", "Detached house", "About 180 m², all walls exposed", 180, 220, "light"),
];

export const DEFAULT_HOME_ID = "apartment";

export function homeById(id: string): HomePreset {
  return HOME_PRESETS.find((h) => h.id === id) ?? HOME_PRESETS[0];
}

export interface HeatingOption {
  type: HeatingType;
  label: string;
  description: string;
}

export const HEATING_OPTIONS: HeatingOption[] = [
  { type: "gas", label: "Gas furnace", description: "Burns natural gas" },
  { type: "electric", label: "Electric baseboard", description: "1 kWh of electricity makes 1 kWh of heat" },
  { type: "heatpump", label: "Heat pump", description: "Air-source; efficiency drops as it gets colder" },
];

export interface FurnaceOption {
  efficiencyPct: number;
  label: string;
  sourceId: "furnaceRegs" | "heatingWithGas";
}

/** Furnace efficiency choices. Each value is cited (regulated minimum or NRCan's published range). */
export const FURNACE_OPTIONS: FurnaceOption[] = [
  { efficiencyPct: 95, label: "95% (minimum for furnaces made since July 2019)", sourceId: "furnaceRegs" },
  { efficiencyPct: 90, label: "90% (minimum for furnaces made 2010 to mid-2019)", sourceId: "furnaceRegs" },
  { efficiencyPct: 80, label: "80% (mid-efficiency furnace, NRCan range 78–84%)", sourceId: "heatingWithGas" },
  { efficiencyPct: 60, label: "60% (old furnace with a pilot light)", sourceId: "heatingWithGas" },
];

/** Default is the current legal minimum, which gives the smallest absolute saving (conservative). */
export const DEFAULT_FURNACE_EFFICIENCY_PCT = 95;

/** Heat-pump COP curve. ESTIMATE built from cited ranges: the midpoints of NRCan's
 *  typical air-source ranges (2.0 to 5.4 at 8 °C, 1.1 to 3.7 at –8 °C), falling to
 *  1.0 at –25 °C, the bottom of NRCan's stated minimum operating range, where backup
 *  resistance heat takes over. Held flat above 8 °C. */
export const HEAT_PUMP_COP_CURVE: CopPoint[] = [
  { outdoorC: -25, cop: 1.0 },
  { outdoorC: -8, cop: 2.4 },
  { outdoorC: 8, cop: 3.7 },
];

/** Estimate: heater output = this factor x the heat needed to hold 22 °C in the coldest hour of the season. */
export const HEATER_SIZING_FACTOR = 1.5;
export const HEATER_DESIGN_INDOOR_C = 22;

/** Thermostat deadband (total width), °C. Estimate. */
export const DEADBAND_C = 0.5;

/** Illustrative weekday/weekend routine. Not a real person. */
export const DEFAULT_ROUTINE: Routine = {
  weekdayWakeMin: 7 * 60,
  weekdaySleepMin: 23 * 60,
  outOnWeekdays: true,
  weekdayLeaveMin: 8 * 60 + 30,
  weekdayReturnMin: 17 * 60 + 30,
  weekendWakeMin: 9 * 60,
  weekendSleepMin: 23 * 60 + 30,
};

/** Default "schedule now": the same temperature all day, every day. */
export const DEFAULT_BEFORE_SETPOINT_C = 22;
/** Default lowest acceptable temperature while home and awake. */
export const DEFAULT_COMFORT_MIN_C = 20;

/** "Suggest" defaults. 21 °C at home with a 3 °C setback is the top of NRCan's
 *  "two to three degrees" and stays above NRCan's 17 °C floor. For heat pumps the
 *  setback is limited to 2 °C, following NRCan's heat pump guidance. */
export const SUGGEST_HOME_C = 21;
export const SUGGEST_SETBACK_DROP_C = 3;
export const SUGGEST_HEAT_PUMP_DROP_C = 2;
/** Warm-up lead times the suggestion tries, shortest first, in minutes. */
export const SUGGEST_PREHEAT_OPTIONS_MIN = [30, 60, 90, 120, 150, 180];
/** A suggestion is "comfortable" when at most this share of home-and-awake hours is below the minimum. */
export const SUGGEST_COMFORT_SHARE = 0.01;
