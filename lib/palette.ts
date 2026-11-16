// Colours used by hand-written SVG (the week charts and the 24-hour day band).
//
// SVG attributes are set from TypeScript, so these values cannot come straight
// from CSS. They mirror the tokens in app/globals.css, and a test
// (lib/__tests__/palette.test.ts) fails if the two ever differ.

export const PALETTE = {
  /** --slate: text. */
  slate: "#17252f",
  /** --paper: panel background, and the gaps between day-band segments. */
  paper: "#ffffff",
  /** --ember: heat, and "your schedule now". */
  ember: "#b8400a",
  /** --blue: the better schedule. */
  blue: "#0b5a8a",
  /** --muted: secondary text and the outdoor line. */
  muted: "#4a5a67",
  /** --border-strong: tick marks. */
  borderStrong: "#5f7180",
  /** --chart-grid: grid lines inside charts. */
  chartGrid: "#dde4ea",
  /** --chart-axis: chart frames. */
  chartAxis: "#93a1ad",
  /** --band-cold: the day band at 17 °C and below. */
  bandCold: "#8fc1e3",
  /** --band-neutral: the day band at 19.5 °C. */
  bandNeutral: "#f4f1ea",
  /** --band-warm: the day band at 22 °C and above. */
  bandWarm: "#ffb866",
} as const;

/** "#rrggbb" to [r, g, b]. */
export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
