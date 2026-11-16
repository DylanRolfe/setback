// Small shared types and helpers for the UI. No React here.

import {
  maxSetpoint,
  SimInputError,
  type Scenario,
  type ScenarioRun,
  type Suggestion,
  type WeeklySchedule,
} from "@/lib/sim";
import { fmtKg, fmtPct } from "./format";

export type View = "landing" | "place" | "now" | "better" | "results" | "sources";

export const VIEWS: View[] = ["landing", "place", "now", "better", "results", "sources"];

export const STEPS: { view: View; label: string }[] = [
  { view: "place", label: "Your place" },
  { view: "now", label: "Your schedule now" },
  { view: "better", label: "A better schedule" },
  { view: "results", label: "Results" },
];

export type RunOutcome =
  | { status: "waiting" }
  | { status: "ok"; run: ScenarioRun }
  | { status: "error"; message: string };

/** A suggestion, plus the inputs it was computed from, so a stale explanation is never shown. */
export interface StoredSuggestion extends Suggestion {
  basis: string;
  comfortMinC: number;
}

/** Everything suggestForScenario reads. If this changes, an old suggestion no longer applies. */
export function suggestBasis(s: Scenario): string {
  return JSON.stringify([
    s.cityId,
    s.uaWPerK,
    s.cMJPerK,
    s.heaterKW,
    s.heating,
    s.furnaceEfficiencyPct,
    s.routine,
    s.comfortMinC,
    maxSetpoint(s.before),
  ]);
}

export function sameSchedule(a: WeeklySchedule, b: WeeklySchedule): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function copySchedule(s: WeeklySchedule): WeeklySchedule {
  return { weekday: s.weekday.map((p) => ({ ...p })), weekend: s.weekend.map((p) => ({ ...p })) };
}

/** A message that is safe to show. SimInputError messages are written for users. */
export function errorMessage(error: unknown): string {
  if (error instanceof SimInputError) return error.message;
  return "The simulation could not run with these inputs. Check the numbers in steps 1 to 3.";
}

export type HeadlineKind = "saves" | "same" | "more";

export interface HeadlineParts {
  kind: HeadlineKind;
  /** Percent of heating energy, formatted, always positive. */
  pct: string;
  /** kg CO2e over the season, formatted, always positive. */
  kg: string;
}

export function headlineParts(run: ScenarioRun): HeadlineParts {
  const c = run.comparison;
  const kind: HeadlineKind = Math.abs(c.energySavedKWh) < 0.5 ? "same" : c.energySavedKWh > 0 ? "saves" : "more";
  return {
    kind,
    pct: fmtPct(Math.abs(c.energySavedFraction) * 100),
    kg: fmtKg(Math.abs(c.co2eSavedKg)),
  };
}

/** The headline as plain text, for the screen-reader live region and the printed card. */
export function headlineText(run: ScenarioRun): string {
  const h = headlineParts(run);
  if (h.kind === "same") return "This schedule does not save energy compared with your current one.";
  if (h.kind === "more") {
    return `This schedule uses ${h.pct}% more simulated heating energy than your current one (about ${h.kg} kg CO2e more this season) under these assumptions.`;
  }
  return `This schedule cuts your simulated heating energy by ${h.pct}% (about ${h.kg} kg CO2e this season) under these assumptions.`;
}
