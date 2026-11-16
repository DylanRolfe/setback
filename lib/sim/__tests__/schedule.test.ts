import { describe, expect, it } from "vitest";
import { copAt } from "../heating";
import {
  buildWeeklyHomeAwake,
  buildWeeklySetpoints,
  constantSchedule,
  formatClock,
  formatClock12,
  MIN_PER_DAY,
  MIN_PER_WEEK,
  parseClock,
  suggestSchedule,
} from "../schedule";
import { Routine, SimInputError, WeatherSeason } from "../types";
import { coldestWeekIndex, listWeeks, localTimeAt } from "../weather";
import { loadWeather } from "./helpers";

const ROUTINE: Routine = {
  weekdayWakeMin: 7 * 60,
  weekdaySleepMin: 23 * 60,
  outOnWeekdays: true,
  weekdayLeaveMin: 8 * 60 + 30,
  weekdayReturnMin: 17 * 60 + 30,
  weekendWakeMin: 9 * 60,
  weekendSleepMin: 30, // 00:30, after midnight
};

describe("weekly setpoints", () => {
  it("fills the whole week for a constant schedule", () => {
    const week = buildWeeklySetpoints(constantSchedule(22));
    expect(week.length).toBe(MIN_PER_WEEK);
    expect(Math.min(...week)).toBe(22);
    expect(Math.max(...week)).toBe(22);
  });

  it("holds each period until the next and carries the last one past midnight", () => {
    const week = buildWeeklySetpoints({
      weekday: [
        { startMin: 6 * 60, setpointC: 21 },
        { startMin: 22 * 60, setpointC: 17 },
      ],
      weekend: [
        { startMin: 8 * 60, setpointC: 20 },
        { startMin: 23 * 60, setpointC: 16 },
      ],
    });
    const at = (day: number, hh: number, mm = 0) => week[day * MIN_PER_DAY + hh * 60 + mm];
    expect(at(1, 5, 59)).toBe(17); // Tuesday before 06:00: Monday night's setting
    expect(at(1, 6)).toBe(21);
    expect(at(1, 21, 59)).toBe(21);
    expect(at(1, 22)).toBe(17);
    expect(at(0, 3)).toBe(16); // Monday 03:00: Sunday (weekend) night's setting
    expect(at(5, 7)).toBe(17); // Saturday 07:00: Friday (weekday) night's setting
    expect(at(5, 8)).toBe(20);
    expect(at(6, 23, 30)).toBe(16);
  });

  it("rejects empty, unordered or out-of-range schedules", () => {
    expect(() => buildWeeklySetpoints({ weekday: [], weekend: [{ startMin: 0, setpointC: 20 }] })).toThrow(SimInputError);
    expect(() =>
      buildWeeklySetpoints({
        weekday: [
          { startMin: 600, setpointC: 20 },
          { startMin: 300, setpointC: 18 },
        ],
        weekend: [{ startMin: 0, setpointC: 20 }],
      })
    ).toThrow(/in order/);
    expect(() => buildWeeklySetpoints(constantSchedule(45))).toThrow(/outside/);
    expect(() => buildWeeklySetpoints({ weekday: [{ startMin: 1440, setpointC: 20 }], weekend: [{ startMin: 0, setpointC: 20 }] })).toThrow(/start time/);
  });
});

describe("home-and-awake hours", () => {
  it("counts weekday mornings and evenings, and weekend days, including after midnight", () => {
    const week = buildWeeklyHomeAwake(ROUTINE);
    const at = (day: number, hh: number, mm = 0) => week[(day * MIN_PER_DAY + hh * 60 + mm) % MIN_PER_WEEK];
    expect(at(0, 6, 59)).toBe(0); // asleep
    expect(at(0, 7)).toBe(1);
    expect(at(0, 8, 30)).toBe(0); // left
    expect(at(0, 17, 29)).toBe(0);
    expect(at(0, 17, 30)).toBe(1);
    expect(at(0, 22, 59)).toBe(1);
    expect(at(0, 23)).toBe(0);
    expect(at(5, 12)).toBe(1); // Saturday midday
    expect(at(6, 0, 15)).toBe(1); // Sunday 00:15: still up from Saturday
    expect(at(6, 0, 30)).toBe(0);
    expect(at(0, 0, 15)).toBe(1); // Monday 00:15: still up from Sunday
    const minutes = week.reduce((a, b) => a + b, 0);
    // Weekdays: 1.5 h + 5.5 h = 7 h. Weekend days: 09:00 to 00:30 = 15.5 h.
    expect(minutes).toBe(5 * 7 * 60 + 2 * 15.5 * 60);
  });

  it("keeps the person home all day when they do not go out on weekdays", () => {
    const week = buildWeeklyHomeAwake({ ...ROUTINE, outOnWeekdays: false });
    expect(week[12 * 60]).toBe(1);
  });
});

describe("suggested schedule", () => {
  it("sets back while asleep and out, and warms up early", () => {
    const s = suggestSchedule(ROUTINE, { homeC: 21, setbackC: 18, preheatMin: 60 });
    expect(s.weekday).toEqual([
      { startMin: 6 * 60, setpointC: 21 },
      { startMin: 8 * 60 + 30, setpointC: 18 },
      { startMin: 16 * 60 + 30, setpointC: 21 },
      { startMin: 23 * 60, setpointC: 18 },
    ]);
    expect(s.weekend).toEqual([
      { startMin: 30, setpointC: 18 },
      { startMin: 8 * 60, setpointC: 21 },
    ]);
    // It must be a valid schedule.
    expect(() => buildWeeklySetpoints(s)).not.toThrow();
  });

  it("skips the daytime setback when the person is home on weekdays", () => {
    const s = suggestSchedule({ ...ROUTINE, outOnWeekdays: false }, { homeC: 21, setbackC: 18, preheatMin: 60 });
    expect(s.weekday.length).toBe(2);
  });
});

describe("clock helpers", () => {
  it("formats and parses times", () => {
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(7 * 60 + 5)).toBe("07:05");
    expect(formatClock12(0)).toBe("12:00 AM");
    expect(formatClock12(13 * 60 + 30)).toBe("1:30 PM");
    expect(parseClock("07:05")).toBe(425);
    expect(parseClock("24:00")).toBeNull();
    expect(parseClock("abc")).toBeNull();
  });
});

describe("heat pump COP curve", () => {
  const curve = [
    { outdoorC: -15, cop: 2 },
    { outdoorC: 5, cop: 3 },
  ];
  it("interpolates between points and holds flat outside them", () => {
    expect(copAt(curve, -5)).toBeCloseTo(2.5, 9);
    expect(copAt(curve, -30)).toBe(2);
    expect(copAt(curve, 20)).toBe(3);
  });
  it("never drops below 1", () => {
    expect(copAt([{ outdoorC: -20, cop: 0.8 }, { outdoorC: 0, cop: 2 }], -25)).toBe(1);
  });
});

describe("weather files", () => {
  const cities = ["waterloo", "toronto", "montreal", "calgary", "vancouver"];

  it("hold a complete Oct 1 to Apr 30 season in local time, with credit and licence", () => {
    for (const id of cities) {
      const w: WeatherSeason = loadWeather(id);
      expect(w.hourlyC.length).toBe(212 * 24);
      expect(w.hourlyC.every((t) => Number.isFinite(t) && t > -60 && t < 45)).toBe(true);
      const first = localTimeAt(w, 0);
      expect([first.year, first.month, first.day, first.hour]).toEqual([2025, 10, 1, 0]);
      expect(first.dayOfWeek).toBe(2); // Oct 1, 2025 was a Wednesday
      const last = localTimeAt(w, w.hourlyC.length - 1);
      expect([last.year, last.month, last.day, last.hour]).toEqual([2026, 4, 30, 23]);
      expect(w.source.licence).toBe("CC BY 4.0");
      expect(w.source.attribution).toMatch(/Open-Meteo/);
    }
  });

  it("follows the clock changes", () => {
    const w = loadWeather("waterloo");
    // Sunday Nov 2, 2025: 01:00 happens twice.
    expect(localTimeAt(w, 769).hour).toBe(1);
    expect(localTimeAt(w, 770).hour).toBe(1);
    expect(localTimeAt(w, 771).hour).toBe(2);
    // Sunday Mar 8, 2026: 02:00 is skipped.
    const before = localTimeAt(w, 3794);
    const after = localTimeAt(w, 3795);
    expect([before.month, before.day, before.hour]).toEqual([3, 8, 1]);
    expect(after.hour).toBe(3);
  });

  it("lists whole weeks starting on Monday and finds the coldest", () => {
    const w = loadWeather("waterloo");
    const weeks = listWeeks(w);
    expect(weeks.length).toBeGreaterThanOrEqual(29);
    for (const wk of weeks) {
      expect(localTimeAt(w, wk.startIndex).dayOfWeek).toBe(0);
      expect([167, 168, 169]).toContain(wk.hours);
    }
    const coldest = weeks[coldestWeekIndex(weeks)];
    expect(coldest.meanOutdoorC).toBeLessThan(-5);
    expect([12, 1, 2]).toContain(coldest.month);
  });
});
