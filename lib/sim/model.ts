// Single-zone lumped thermal model (1R1C) with an on/off thermostat.
//
//   C * dT/dt = Q_heat - UA * (T - T_out)
//
//   T      indoor temperature (deg C)
//   T_out  outdoor temperature (deg C), constant within each hour of weather data
//   UA     heat-loss coefficient (W/K)
//   C      effective thermal capacitance (J/K)
//   Q_heat heat delivered by the heating system (W): heaterCapacityW when on, 0 when off
//
// Within a sub-step Q_heat and T_out are constant, so the equation has an exact
// solution: T relaxes exponentially toward T_eq = T_out + Q_heat / UA with time
// constant tau = C / UA. We use that exact solution instead of a numerical
// approximation, so energy is conserved to rounding error at every step.

import { inputPerHeat, validateHeating } from "./heating";
import { buildWeeklyHomeAwake, buildWeeklySetpoints, MIN_PER_WEEK } from "./schedule";
import {
  Building,
  Comparison,
  SimInput,
  SimInputError,
  SimResult,
  WeatherSeason,
} from "./types";
import { localTimeAt, validateWeather } from "./weather";

export const DEFAULT_DEADBAND_C = 0.5;
export const DEFAULT_SUBSTEP_S = 60;
const J_PER_KWH = 3.6e6;

export interface StepResult {
  /** Indoor temperature at the end of the step, deg C. */
  tEndC: number;
  /** Heat lost through the envelope during the step, J. */
  lossJ: number;
  /** Time-mean indoor temperature over the step, deg C. */
  tMeanC: number;
}

/** Exact solution of the 1R1C equation over one step with constant inputs. */
export function stepExact(
  tStartC: number,
  outdoorC: number,
  heatW: number,
  uaWPerK: number,
  cJPerK: number,
  dtS: number
): StepResult {
  const tau = cJPerK / uaWPerK;
  const decay = Math.exp(-dtS / tau);
  const tEq = outdoorC + heatW / uaWPerK;
  const tEndC = tEq + (tStartC - tEq) * decay;
  // Integral of (T - T_out) dt over the step, in K*s.
  const integral = (tEq - outdoorC) * dtS + (tStartC - tEq) * tau * (1 - decay);
  return { tEndC, lossJ: uaWPerK * integral, tMeanC: outdoorC + integral / dtS };
}

export function validateBuilding(b: Building): void {
  if (!Number.isFinite(b.uaWPerK) || b.uaWPerK <= 0) {
    throw new SimInputError(
      "Heat loss (UA) must be greater than 0 W/K. A home that loses no heat would never need heating."
    );
  }
  if (!Number.isFinite(b.cJPerK) || b.cJPerK <= 0) {
    throw new SimInputError("Thermal mass (C) must be greater than 0 J/K.");
  }
  if (!Number.isFinite(b.heaterCapacityW) || b.heaterCapacityW <= 0) {
    throw new SimInputError("Heater size must be greater than 0 W.");
  }
}

/** Default heater size: `sizingFactor` times the heat needed to hold `designIndoorC`
 *  during the coldest hour of the season. This is an estimate, shown as such. */
export function defaultHeaterCapacityW(
  uaWPerK: number,
  weather: WeatherSeason,
  sizingFactor = 1.5,
  designIndoorC = 22
): number {
  let coldest = Infinity;
  for (const t of weather.hourlyC) if (t < coldest) coldest = t;
  const designLoad = uaWPerK * Math.max(10, designIndoorC - coldest);
  return Math.round((sizingFactor * designLoad) / 100) * 100;
}

export function simulate(input: SimInput): SimResult {
  const { weather, building, heating, factors, prices } = input;
  validateWeather(weather);
  validateBuilding(building);
  validateHeating(heating);

  const deadband = input.deadbandC ?? DEFAULT_DEADBAND_C;
  if (!Number.isFinite(deadband) || deadband < 0 || deadband > 5) {
    throw new SimInputError("Thermostat deadband must be between 0 and 5 °C.");
  }
  const dt = input.substepSeconds ?? DEFAULT_SUBSTEP_S;
  if (!Number.isInteger(dt) || dt <= 0 || 3600 % dt !== 0 || dt % 60 !== 0) {
    throw new SimInputError("The sub-step must be a whole number of minutes that divides one hour.");
  }
  if (!Number.isFinite(input.comfortMinC)) {
    throw new SimInputError("The comfort minimum must be a number.");
  }
  if (
    !(factors.gasMJPerM3 > 0) ||
    !(factors.gasKgCo2ePerM3 >= 0) ||
    !(factors.gridKgCo2ePerKWh >= 0)
  ) {
    throw new SimInputError("Emission factors must be positive numbers.");
  }

  const setpoints = buildWeeklySetpoints(input.schedule);
  const homeAwake = buildWeeklyHomeAwake(input.routine);

  const ua = building.uaWPerK;
  const c = building.cJPerK;
  const cap = building.heaterCapacityW;
  const tau = c / ua;
  const decay = Math.exp(-dt / tau);
  const tauOneMinusDecay = tau * (1 - decay);
  const half = deadband / 2;
  const stepsPerHour = 3600 / dt;
  const minPerStep = dt / 60;
  const hoursPerStep = dt / 3600;

  const hours = weather.hourlyC.length;
  const indoorC = new Float64Array(hours);
  const setpointC = new Float64Array(hours);
  const heatW = new Float64Array(hours);
  const inputKWh = new Float64Array(hours);

  // Start at the first setpoint, or at the outdoor temperature if that is warmer.
  const firstMinute = localTimeAt(weather, 0).minuteOfWeek;
  let t = Math.max(setpoints[firstMinute], weather.hourlyC[0]);
  const tStart = t;
  let on = false;

  let heatJ = 0;
  let lossJ = 0;
  let inputJ = 0;
  let sumIndoor = 0;
  let sumOutdoor = 0;
  let homeAwakeSteps = 0;
  let belowSteps = 0;
  let lowestHome = Infinity;

  for (let h = 0; h < hours; h++) {
    const tOut = weather.hourlyC[h];
    const perHeat = inputPerHeat(heating, tOut);
    let minute = localTimeAt(weather, h).minuteOfWeek;
    let hourHeatJ = 0;
    let hourIndoor = 0;
    let hourSetpoint = 0;

    for (let s = 0; s < stepsPerHour; s++) {
      const sp = setpoints[minute];
      // On/off thermostat with hysteresis.
      if (t < sp - half) on = true;
      else if (t >= sp + half) on = false;
      const q = on ? cap : 0;

      const tEq = tOut + q / ua;
      const diff = t - tEq;
      const integral = (tEq - tOut) * dt + diff * tauOneMinusDecay;
      const tMean = tOut + integral / dt;
      const tEnd = tEq + diff * decay;

      lossJ += ua * integral;
      hourHeatJ += q * dt;
      hourIndoor += tMean;
      hourSetpoint += sp;

      if (homeAwake[minute] === 1) {
        homeAwakeSteps++;
        if (tMean < input.comfortMinC) belowSteps++;
        if (tMean < lowestHome) lowestHome = tMean;
      }

      t = tEnd;
      minute += minPerStep;
      if (minute >= MIN_PER_WEEK) minute -= MIN_PER_WEEK;
    }

    heatJ += hourHeatJ;
    inputJ += hourHeatJ * perHeat;
    indoorC[h] = hourIndoor / stepsPerHour;
    setpointC[h] = hourSetpoint / stepsPerHour;
    heatW[h] = hourHeatJ / 3600;
    inputKWh[h] = (hourHeatJ * perHeat) / J_PER_KWH;
    sumIndoor += indoorC[h];
    sumOutdoor += tOut;
  }

  const heatDeliveredKWh = heatJ / J_PER_KWH;
  const inputEnergyKWh = inputJ / J_PER_KWH;
  const isGas = heating.type === "gas";
  const gasM3 = isGas ? inputJ / (factors.gasMJPerM3 * 1e6) : 0;
  const electricityKWh = isGas ? 0 : inputEnergyKWh;
  const co2eKg = isGas ? gasM3 * factors.gasKgCo2ePerM3 : electricityKWh * factors.gridKgCo2ePerKWh;

  let costCad: number | null = null;
  if (isGas && prices?.gasCadPerM3 !== undefined && Number.isFinite(prices.gasCadPerM3)) {
    costCad = gasM3 * prices.gasCadPerM3;
  } else if (
    !isGas &&
    prices?.electricityCadPerKWh !== undefined &&
    Number.isFinite(prices.electricityCadPerKWh)
  ) {
    costCad = electricityKWh * prices.electricityCadPerKWh;
  }

  const storedJ = c * (t - tStart);

  return {
    hours,
    indoorC,
    setpointC,
    heatW,
    inputKWh,
    totals: { heatDeliveredKWh, inputEnergyKWh, gasM3, electricityKWh, co2eKg, costCad },
    comfort: {
      homeAwakeHours: homeAwakeSteps * hoursPerStep,
      hoursBelowMin: belowSteps * hoursPerStep,
      lowestHomeAwakeC: homeAwakeSteps > 0 ? lowestHome : null,
    },
    balance: {
      heatLostKWh: lossJ / J_PER_KWH,
      storedChangeKWh: storedJ / J_PER_KWH,
      residualKWh: (heatJ - lossJ - storedJ) / J_PER_KWH,
    },
    meanIndoorC: sumIndoor / hours,
    meanOutdoorC: sumOutdoor / hours,
  };
}

/** Before-versus-after savings. Positive numbers mean the "after" schedule uses less. */
export function compare(before: SimResult, after: SimResult): Comparison {
  const b = before.totals;
  const a = after.totals;
  const energySavedKWh = b.inputEnergyKWh - a.inputEnergyKWh;
  return {
    energySavedKWh,
    energySavedFraction: b.inputEnergyKWh > 0 ? energySavedKWh / b.inputEnergyKWh : 0,
    gasSavedM3: b.gasM3 - a.gasM3,
    electricitySavedKWh: b.electricityKWh - a.electricityKWh,
    co2eSavedKg: b.co2eKg - a.co2eKg,
    costSavedCad: b.costCad !== null && a.costCad !== null ? b.costCad - a.costCad : null,
  };
}

/** Sum of max(0, indoor - outdoor) over the season in K*h: the "degree-hours"
 *  a perfectly steady thermostat at `indoorC` would have to make up. */
export function degreeHours(weather: WeatherSeason, indoorC: number): number {
  let sum = 0;
  for (const t of weather.hourlyC) sum += Math.max(0, indoorC - t);
  return sum;
}
