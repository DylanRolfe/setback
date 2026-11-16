import { Routine, SchedulePeriod, SimInputError, WeeklySchedule } from "./types";

export const MIN_PER_DAY = 1440;
export const MIN_PER_WEEK = 7 * MIN_PER_DAY;
export const SETPOINT_MIN_C = 5;
export const SETPOINT_MAX_C = 30;
export const MAX_PERIODS_PER_DAY = 6;

/** Day index 0..6 with Monday = 0. Saturday (5) and Sunday (6) are weekend days. */
export function isWeekendDay(day: number): boolean {
  return day >= 5;
}

/** Sort by start time and drop exact duplicates of start time (last one wins). */
export function normalizePeriods(periods: SchedulePeriod[]): SchedulePeriod[] {
  const byStart = new Map<number, SchedulePeriod>();
  for (const p of periods) byStart.set(p.startMin, { startMin: p.startMin, setpointC: p.setpointC });
  return [...byStart.values()].sort((a, b) => a.startMin - b.startMin);
}

function validatePeriods(periods: SchedulePeriod[], name: string): void {
  if (!Array.isArray(periods) || periods.length === 0) {
    throw new SimInputError(`The ${name} schedule needs at least one time block.`);
  }
  let last = -1;
  for (const p of periods) {
    if (!Number.isInteger(p.startMin) || p.startMin < 0 || p.startMin >= MIN_PER_DAY) {
      throw new SimInputError(`A ${name} time block has a start time outside 00:00 to 23:59.`);
    }
    if (p.startMin <= last) {
      throw new SimInputError(`The ${name} time blocks must be in order with different start times.`);
    }
    last = p.startMin;
    if (!Number.isFinite(p.setpointC) || p.setpointC < SETPOINT_MIN_C || p.setpointC > SETPOINT_MAX_C) {
      throw new SimInputError(
        `A ${name} temperature is outside ${SETPOINT_MIN_C} to ${SETPOINT_MAX_C} °C.`
      );
    }
  }
}

export function validateSchedule(schedule: WeeklySchedule): void {
  validatePeriods(schedule.weekday, "weekday");
  validatePeriods(schedule.weekend, "weekend");
}

/** Setpoint for every minute of the week (index 0 = Monday 00:00 local time).
 *  A period holds until the next one starts. Before the first period of a day,
 *  the last period of the previous day still applies, as on a real thermostat. */
export function buildWeeklySetpoints(schedule: WeeklySchedule): Float64Array {
  validateSchedule(schedule);
  const out = new Float64Array(MIN_PER_WEEK);
  const periodsFor = (day: number) => (isWeekendDay(day) ? schedule.weekend : schedule.weekday);
  for (let day = 0; day < 7; day++) {
    const today = periodsFor(day);
    const yesterday = periodsFor((day + 6) % 7);
    let current = yesterday[yesterday.length - 1].setpointC;
    let next = 0;
    for (let m = 0; m < MIN_PER_DAY; m++) {
      while (next < today.length && today[next].startMin <= m) {
        current = today[next].setpointC;
        next++;
      }
      out[day * MIN_PER_DAY + m] = current;
    }
  }
  return out;
}

function validateRoutine(r: Routine): void {
  const fields: [string, number][] = [
    ["weekday wake time", r.weekdayWakeMin],
    ["weekday bedtime", r.weekdaySleepMin],
    ["weekday leave time", r.weekdayLeaveMin],
    ["weekday return time", r.weekdayReturnMin],
    ["weekend wake time", r.weekendWakeMin],
    ["weekend bedtime", r.weekendSleepMin],
  ];
  for (const [name, v] of fields) {
    if (!Number.isInteger(v) || v < 0 || v >= MIN_PER_DAY) {
      throw new SimInputError(`The ${name} must be between 00:00 and 23:59.`);
    }
  }
}

/** 1 for every minute of the week when the person is home and awake, else 0.
 *  A bedtime at or before the wake time means "after midnight" (next day). */
export function buildWeeklyHomeAwake(routine: Routine): Uint8Array {
  validateRoutine(routine);
  const out = new Uint8Array(MIN_PER_WEEK);
  for (let day = 0; day < 7; day++) {
    const weekend = isWeekendDay(day);
    const wake = weekend ? routine.weekendWakeMin : routine.weekdayWakeMin;
    let sleep = weekend ? routine.weekendSleepMin : routine.weekdaySleepMin;
    if (sleep <= wake) sleep += MIN_PER_DAY;
    for (let m = wake; m < sleep; m++) {
      out[(day * MIN_PER_DAY + m) % MIN_PER_WEEK] = 1;
    }
  }
  if (routine.outOnWeekdays && routine.weekdayReturnMin > routine.weekdayLeaveMin) {
    for (let day = 0; day < 5; day++) {
      for (let m = routine.weekdayLeaveMin; m < routine.weekdayReturnMin; m++) {
        out[day * MIN_PER_DAY + m] = 0;
      }
    }
  }
  return out;
}

export interface SuggestOptions {
  /** Setpoint while home and awake, degrees C. */
  homeC: number;
  /** Setpoint while asleep or out, degrees C. */
  setbackC: number;
  /** Start warming up this many minutes before waking or coming home. */
  preheatMin: number;
}

const wrap = (m: number) => ((m % MIN_PER_DAY) + MIN_PER_DAY) % MIN_PER_DAY;

/** Build a setback schedule from a routine: `setbackC` while asleep and (on
 *  weekdays) while out, `homeC` otherwise, with warm-up starting `preheatMin`
 *  minutes early so the room is back up to temperature when it is needed. */
export function suggestSchedule(routine: Routine, opts: SuggestOptions): WeeklySchedule {
  validateRoutine(routine);
  const { homeC, setbackC, preheatMin } = opts;

  const weekday: SchedulePeriod[] = [
    { startMin: wrap(routine.weekdayWakeMin - preheatMin), setpointC: homeC },
    { startMin: routine.weekdaySleepMin, setpointC: setbackC },
  ];
  const awayLongEnough =
    routine.outOnWeekdays && routine.weekdayReturnMin - preheatMin > routine.weekdayLeaveMin;
  if (awayLongEnough) {
    weekday.push({ startMin: routine.weekdayLeaveMin, setpointC: setbackC });
    weekday.push({ startMin: routine.weekdayReturnMin - preheatMin, setpointC: homeC });
  }

  const weekend: SchedulePeriod[] = [
    { startMin: wrap(routine.weekendWakeMin - preheatMin), setpointC: homeC },
    { startMin: routine.weekendSleepMin, setpointC: setbackC },
  ];

  return { weekday: normalizePeriods(weekday), weekend: normalizePeriods(weekend) };
}

export function constantSchedule(setpointC: number): WeeklySchedule {
  return {
    weekday: [{ startMin: 0, setpointC }],
    weekend: [{ startMin: 0, setpointC }],
  };
}

/** "07:30" style 24-hour label. */
export function formatClock(min: number): string {
  const m = wrap(Math.round(min));
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** "7:30 AM" style 12-hour label. */
export function formatClock12(min: number): string {
  const m = wrap(Math.round(min));
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  const suffix = hh < 12 ? "AM" : "PM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${suffix}`;
}

/** Parse "HH:MM" into minutes after midnight, or null if invalid. */
export function parseClock(text: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (hh > 23 || mm > 59) return null;
  return hh * 60 + mm;
}

const fmtC = (c: number) => String(Math.round(c * 10) / 10);

const describeDay = (periods: SchedulePeriod[]) =>
  periods.map((p) => `${formatClock12(p.startMin)} ${fmtC(p.setpointC)} °C`).join(", ");

/** One-line description of a schedule, for example "22 °C all day, every day". */
export function describeSchedule(schedule: WeeklySchedule): string {
  const { weekday, weekend } = schedule;
  if (weekday.length === 1 && weekend.length === 1 && weekday[0].setpointC === weekend[0].setpointC) {
    return `${fmtC(weekday[0].setpointC)} °C all day, every day`;
  }
  return `weekdays ${describeDay(weekday)}; weekends ${describeDay(weekend)}`;
}

/** One-line description of the home-and-awake routine. */
export function describeRoutine(r: Routine): string {
  const out = r.outOnWeekdays
    ? `, out ${formatClock12(r.weekdayLeaveMin)} to ${formatClock12(r.weekdayReturnMin)}`
    : ", home all day";
  return (
    `Weekdays: up ${formatClock12(r.weekdayWakeMin)}${out}, bed ${formatClock12(r.weekdaySleepMin)}. ` +
    `Weekends: up ${formatClock12(r.weekendWakeMin)}, bed ${formatClock12(r.weekendSleepMin)}.`
  );
}
