import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { WeatherSeason } from "../types";

/** Load a static weather file the same way the browser gets it, but from disk. */
export function loadWeather(cityId: string): WeatherSeason {
  const file = join(process.cwd(), "public", "data", `weather-${cityId}.json`);
  return JSON.parse(readFileSync(file, "utf8")) as WeatherSeason;
}
