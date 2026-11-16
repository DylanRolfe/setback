// Number formatting and small text helpers shared by every view.
// All figures are formatted for Canadian English and never typed by hand.

import { Fragment, type ReactNode } from "react";
import { SOURCES, type SourceId } from "@/lib/sim";

const LOCALE = "en-CA";

/** Round to `digits` decimals and never return negative zero. */
function tidy(x: number, digits: number): number {
  const f = 10 ** digits;
  const r = Math.round(x * f) / f;
  return r === 0 ? 0 : r;
}

export function fmtNum(x: number, digits = 0): string {
  return tidy(x, digits).toLocaleString(LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** kWh and cubic metres: whole numbers. */
export const fmtInt = (x: number) => fmtNum(x, 0);

/** kg CO2e: whole numbers, one decimal below 10. */
export function fmtKg(x: number): string {
  if (tidy(x, 1) === 0) return "0";
  return Math.abs(tidy(x, 1)) < 10 ? fmtNum(x, 1) : fmtNum(x, 0);
}

/** Percent value (already multiplied by 100): one decimal below 10, whole number otherwise. */
export function fmtPct(pct: number): string {
  if (tidy(pct, 1) === 0) return "0";
  return Math.abs(tidy(pct, 1)) < 10 ? fmtNum(pct, 1) : fmtNum(pct, 0);
}

/** Simulated temperatures: one decimal. */
export const fmtTemp = (x: number) => fmtNum(x, 1);

/** Thermostat settings: "21" or "20.5". */
export function fmtSetpoint(x: number): string {
  return Number.isInteger(x) ? fmtNum(x, 0) : fmtNum(x, 1);
}

/** Hours: whole numbers, one decimal below 10. */
export function fmtHours(x: number): string {
  if (tidy(x, 1) === 0) return "0";
  return Math.abs(tidy(x, 1)) < 10 ? fmtNum(x, 1) : fmtNum(x, 0);
}

/** Canadian dollars and cents. */
export function fmtMoney(x: number): string {
  const digits = 2;
  return tidy(x, digits).toLocaleString(LOCALE, {
    style: "currency",
    currency: "CAD",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** "CO2e" with a real subscript. */
export function CO2e() {
  return (
    <>
      CO<sub>2</sub>e
    </>
  );
}

const FORMULA = /(CO2e|CO2|CH4|N2O)/g;

/** Render plain text from the model with chemical formulas subscripted (CO2, CO2e, CH4, N2O). */
export function Chem({ text }: { text: string }) {
  const parts = text.split(FORMULA);
  return (
    <>
      {parts.map((part, i) => {
        let node: ReactNode = part;
        if (part === "CO2e") node = <CO2e />;
        else if (part === "CO2")
          node = (
            <>
              CO<sub>2</sub>
            </>
          );
        else if (part === "CH4")
          node = (
            <>
              CH<sub>4</sub>
            </>
          );
        else if (part === "N2O")
          node = (
            <>
              N<sub>2</sub>O
            </>
          );
        return <Fragment key={i}>{node}</Fragment>;
      })}
    </>
  );
}

/** External link that opens in a new tab and says so. */
export function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/** Link to one entry of the cited sources registry: "Publisher: Title". */
export function SourceLink({ id, short = false }: { id: SourceId; short?: boolean }) {
  const s = SOURCES[id];
  return <ExtLink href={s.url}>{short ? s.publisher : `${s.publisher}: ${s.title}`}</ExtLink>;
}

export function EstimateBadge() {
  return <span className="badge">estimate</span>;
}
