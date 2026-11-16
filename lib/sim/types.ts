// Shared types for the Setback simulation. Pure data, no React, no I/O.

/** One programmable-thermostat period: from `startMin` the setpoint is `setpointC`
 *  until the next period starts (carrying over past midnight into the next day). */
export interface SchedulePeriod {
  /** Minutes after local midnight, 0..1439. */
  startMin: number;
  /** Thermostat setpoint in degrees Celsius. */
  setpointC: number;
}

/** A 5+2 programmable thermostat schedule (Mon-Fri and Sat-Sun). */
export interface WeeklySchedule {
  weekday: SchedulePeriod[];
  weekend: SchedulePeriod[];
}

/** When the person is home and awake. Used only for the comfort check and for
 *  the "Suggest" button. All values are minutes after local midnight, 0..1439. */
export interface Routine {
  weekdayWakeMin: number;
  weekdaySleepMin: number;
  /** If true, the home is empty on weekdays between leave and return. */
  outOnWeekdays: boolean;
  weekdayLeaveMin: number;
  weekdayReturnMin: number;
  weekendWakeMin: number;
  weekendSleepMin: number;
}

export interface Building {
  /** Heat-loss coefficient UA in W/K (watts lost per degree of indoor-outdoor difference). */
  uaWPerK: number;
  /** Effective thermal capacitance C in J/K. */
  cJPerK: number;
  /** Heat output of the heating system when it is on, in W. */
  heaterCapacityW: number;
}

export type HeatingType = "gas" | "electric" | "heatpump";

/** One point on a heat-pump COP curve. COP is linearly interpolated between
 *  points and held flat outside the first and last point. */
export interface CopPoint {
  outdoorC: number;
  cop: number;
}

export interface HeatingSystem {
  type: HeatingType;
  /** Gas furnace seasonal efficiency as a fraction (0..1]. Ignored unless type is "gas". */
  furnaceEfficiency: number;
  /** Heat-pump COP curve. Ignored unless type is "heatpump". */
  copCurve: CopPoint[];
}

/** Conversion factors already resolved for the user's province and fuel. */
export interface EmissionFactors {
  /** Energy content of natural gas, MJ per cubic metre. */
  gasMJPerM3: number;
  /** Natural gas combustion, kg CO2e per cubic metre. */
  gasKgCo2ePerM3: number;
  /** Grid electricity, kg CO2e per kWh consumed. */
  gridKgCo2ePerKWh: number;
}

/** Optional energy prices. Cost is only shown when a price is provided. */
export interface Prices {
  gasCadPerM3?: number;
  electricityCadPerKWh?: number;
}

export interface UtcOffsetRun {
  fromIndex: number;
  offsetMin: number;
}

/** Static weather file saved in /public/data by scripts/fetch-weather.mjs. */
export interface WeatherSeason {
  schema: number;
  cityId: string;
  name: string;
  province: string;
  timeZone: string;
  seasonLabel: string;
  /** UTC instant of the first hourly sample (ISO 8601). */
  startUtc: string;
  stepSeconds: number;
  /** Run-length encoded UTC offsets so local time can be rebuilt without a tz database. */
  utcOffsets: UtcOffsetRun[];
  /** Hourly 2 m air temperature in degrees Celsius. */
  hourlyC: number[];
  source: {
    name: string;
    url: string;
    requestUrl: string;
    licence: string;
    licenceUrl: string;
    attribution: string;
    retrieved: string;
  };
  grid?: { latitude: number; longitude: number; elevationM: number };
  requested?: { latitude: number; longitude: number };
}

export interface SimInput {
  weather: WeatherSeason;
  building: Building;
  heating: HeatingSystem;
  schedule: WeeklySchedule;
  routine: Routine;
  /** Lowest indoor temperature the person accepts while home and awake. */
  comfortMinC: number;
  factors: EmissionFactors;
  prices?: Prices;
  /** Total thermostat deadband width in degrees C (default 0.5: on below
   *  setpoint - 0.25, off above setpoint + 0.25). */
  deadbandC?: number;
  /** Internal sub-step in seconds (default 60). Must divide 3600. */
  substepSeconds?: number;
}

export interface SimTotals {
  /** Heat delivered to the room over the season, kWh. */
  heatDeliveredKWh: number;
  /** Energy bought (gas energy content or electricity), kWh. */
  inputEnergyKWh: number;
  /** Natural gas burned, cubic metres (0 for electric systems). */
  gasM3: number;
  /** Electricity used for heating, kWh (0 for gas). */
  electricityKWh: number;
  /** Greenhouse gas emissions, kg CO2e. */
  co2eKg: number;
  /** Energy cost in CAD, or null when no price was provided. */
  costCad: number | null;
}

export interface ComfortCheck {
  /** Hours in the season when the person is home and awake. */
  homeAwakeHours: number;
  /** Of those, hours when the indoor temperature was below comfortMinC. */
  hoursBelowMin: number;
  /** Lowest indoor temperature during home-and-awake time (null if never home). */
  lowestHomeAwakeC: number | null;
}

export interface EnergyBalance {
  /** Heat lost through the envelope, kWh (UA times the integral of indoor minus outdoor). */
  heatLostKWh: number;
  /** Change in heat stored in the building mass from start to end, kWh. */
  storedChangeKWh: number;
  /** heatDelivered - heatLost - storedChange. Should be ~0 (numerical check). */
  residualKWh: number;
}

export interface SimResult {
  /** Number of hourly samples. */
  hours: number;
  /** Hourly mean indoor temperature, degrees C. */
  indoorC: Float64Array;
  /** Hourly mean setpoint, degrees C. */
  setpointC: Float64Array;
  /** Hourly mean heat delivered, W. */
  heatW: Float64Array;
  /** Hourly energy bought (gas energy content or electricity), kWh. */
  inputKWh: Float64Array;
  totals: SimTotals;
  comfort: ComfortCheck;
  balance: EnergyBalance;
  /** Season mean indoor and outdoor temperature, degrees C. */
  meanIndoorC: number;
  meanOutdoorC: number;
}

export interface Comparison {
  energySavedKWh: number;
  /** Fraction of the "before" input energy saved (0.1 = 10%). 0 when before is 0. */
  energySavedFraction: number;
  gasSavedM3: number;
  electricitySavedKWh: number;
  co2eSavedKg: number;
  costSavedCad: number | null;
}

/** Thrown when an input is physically meaningless. The message is safe to show to users. */
export class SimInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SimInputError";
  }
}
