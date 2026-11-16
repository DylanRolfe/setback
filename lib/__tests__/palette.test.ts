import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { hexToRgb, PALETTE } from "../palette";

const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

/** Value of a custom property declared in :root, following one level of var(). */
function token(name: string): string {
  const match = new RegExp(`--${name}:\\s*([^;]+);`).exec(css);
  if (!match) throw new Error(`--${name} is not declared in app/globals.css`);
  const value = match[1].trim();
  const alias = /^var\(--([a-z-]+)\)$/.exec(value);
  return (alias ? token(alias[1]) : value).toLowerCase();
}

describe("SVG palette", () => {
  it("matches the design tokens in app/globals.css", () => {
    const pairs: [keyof typeof PALETTE, string][] = [
      ["slate", "slate"],
      ["paper", "paper"],
      ["ember", "ember"],
      ["blue", "blue"],
      ["muted", "muted"],
      ["borderStrong", "border-strong"],
      ["chartGrid", "chart-grid"],
      ["chartAxis", "chart-axis"],
      ["bandCold", "band-cold"],
      ["bandNeutral", "band-neutral"],
      ["bandWarm", "band-warm"],
    ];
    for (const [key, name] of pairs) {
      expect(PALETTE[key], `${key} versus --${name}`).toBe(token(name));
    }
  });

  it("keeps the series colours tied to their roles", () => {
    expect(token("before")).toBe(PALETTE.ember);
    expect(token("after")).toBe(PALETTE.blue);
    expect(token("text")).toBe(PALETTE.slate);
  });

  it("converts hex to rgb", () => {
    expect(hexToRgb("#ffb866")).toEqual([255, 184, 102]);
    expect(hexToRgb("#17252f")).toEqual([23, 37, 47]);
  });
});
