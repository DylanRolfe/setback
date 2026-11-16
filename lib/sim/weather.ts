import { SimInputError, WeatherSeason } from "./types";

export interface LocalTime {
  year: number;
  /** 1..12 */
  month: number;
  /** 1..31 */
  day: number;
  /** 0..23 */
  hour: number;
  /** 0..6 with Monday = 0 */
  dayOfWeek: number;
  /** Minutes since Monday 00:00 local time, 0..10079 */
  minuteOfWeek: number;
}

export function validateWeather(weather: WeatherSeason): void {
  if (!weather || !Array.isArray(weather.hourlyC) || weather.hourlyC.length === 0) {
    throw new SimInputError("The weather file has no hourly temperatures.");
  }
  if (weather.stepSeconds !== 3600) {
    throw new SimInputError("The weather file must have hourly samples.");
  }
  if (!Array.isArray(weather.utcOffsets) || weather.utcOffsets.length === 0 || weather.utcOffsets[0].fromIndex !== 0) {
    throw new SimInputError("The weather file is missing its time-zone offsets.");
  }
  if (Number.isNaN(Date.parse(weather.startUtc))) {
    throw new SimInputError("The weather file has an invalid start time.");
  }
}

/** UTC offset in minutes for hourly sample `index`. */
export function utcOffsetAt(weather: WeatherSeason, index: number): number {
  let offset = weather.utcOffsets[0].offsetMin;
  for (const run of weather.utcOffsets) {
    if (run.fromIndex <= index) offset = run.offsetMin;
    else break;
  }
  return offset;
}

/** Local wall-clock time at the start of hourly sample `index`. */
export function localTimeAt(weather: WeatherSeason, index: number): LocalTime {
  const startMs = Date.parse(weather.startUtc);
  const localMs = startMs + index * weather.stepSeconds * 1000 + utcOffsetAt(weather, index) * 60000;
  const d = new Date(localMs);
  const dayOfWeek = (d.getUTCDay() + 6) % 7;
  const hour = d.getUTCHours();
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour,
    dayOfWeek,
    minuteOfWeek: dayOfWeek * 1440 + hour * 60 + d.getUTCMinutes(),
  };
}

export interface WeekInfo {
  /** Index of the first hourly sample of the week (a local Monday 00:00). */
  startIndex: number;
  /** Number of hourly samples in the week (168, or 167/169 across a clock change). */
  hours: number;
  /** Local date of the Monday. */
  year: number;
  month: number;
  day: number;
  /** Mean outdoor temperature over the week, degrees C. */
  meanOutdoorC: number;
}

/** Complete Monday-to-Sunday weeks contained in the season. */
export function listWeeks(weather: WeatherSeason): WeekInfo[] {
  const n = weather.hourlyC.length;
  const starts: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = localTimeAt(weather, i);
    if (t.dayOfWeek === 0 && t.hour === 0) starts.push(i);
  }
  const weeks: WeekInfo[] = [];
  for (let k = 0; k + 1 < starts.length; k++) {
    const startIndex = starts[k];
    const hours = starts[k + 1] - startIndex;
    let sum = 0;
    for (let i = startIndex; i < startIndex + hours; i++) sum += weather.hourlyC[i];
    const t = localTimeAt(weather, startIndex);
    weeks.push({ startIndex, hours, year: t.year, month: t.month, day: t.day, meanOutdoorC: sum / hours });
  }
  return weeks;
}

/** Index (into listWeeks) of the week with the lowest mean outdoor temperature. */
export function coldestWeekIndex(weeks: WeekInfo[]): number {
  let best = 0;
  for (let k = 1; k < weeks.length; k++) {
    if (weeks[k].meanOutdoorC < weeks[best].meanOutdoorC) best = k;
  }
  return best;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function formatDate(year: number, month: number, day: number): string {
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

export function formatHourLabel(t: LocalTime): string {
  return `${DAYS[t.dayOfWeek]} ${MONTHS[t.month - 1]} ${t.day}, ${String(t.hour).padStart(2, "0")}:00`;
}

export function dayName(dayOfWeek: number): string {
  return DAYS[dayOfWeek];
}
