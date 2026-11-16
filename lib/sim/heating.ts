import { CopPoint, HeatingSystem, SimInputError } from "./types";

/** Heat-pump COP at an outdoor temperature: linear interpolation between curve
 *  points, held flat beyond the ends, and never below 1 (a heat pump with
 *  electric backup is at worst as good as electric resistance heat). */
export function copAt(curve: CopPoint[], outdoorC: number): number {
  if (curve.length === 0) throw new SimInputError("The heat pump needs a COP curve.");
  let cop: number;
  if (outdoorC <= curve[0].outdoorC) {
    cop = curve[0].cop;
  } else if (outdoorC >= curve[curve.length - 1].outdoorC) {
    cop = curve[curve.length - 1].cop;
  } else {
    cop = curve[curve.length - 1].cop;
    for (let i = 0; i + 1 < curve.length; i++) {
      const a = curve[i];
      const b = curve[i + 1];
      if (outdoorC >= a.outdoorC && outdoorC <= b.outdoorC) {
        const f = (outdoorC - a.outdoorC) / (b.outdoorC - a.outdoorC);
        cop = a.cop + f * (b.cop - a.cop);
        break;
      }
    }
  }
  return Math.max(1, cop);
}

export function validateHeating(heating: HeatingSystem): void {
  if (heating.type === "gas") {
    const e = heating.furnaceEfficiency;
    if (!Number.isFinite(e) || e <= 0 || e > 1) {
      throw new SimInputError("Furnace efficiency must be more than 0% and at most 100%.");
    }
  } else if (heating.type === "heatpump") {
    const c = heating.copCurve;
    if (!Array.isArray(c) || c.length === 0) {
      throw new SimInputError("The heat pump needs a COP curve.");
    }
    for (let i = 0; i < c.length; i++) {
      if (!Number.isFinite(c[i].cop) || c[i].cop <= 0 || !Number.isFinite(c[i].outdoorC)) {
        throw new SimInputError("Every heat pump COP point needs a temperature and a COP above 0.");
      }
      if (i > 0 && c[i].outdoorC <= c[i - 1].outdoorC) {
        throw new SimInputError("Heat pump COP points must be in order of rising outdoor temperature.");
      }
    }
  } else if (heating.type !== "electric") {
    throw new SimInputError("Unknown heating type.");
  }
}

/** Energy bought per unit of heat delivered (1 / efficiency or 1 / COP). */
export function inputPerHeat(heating: HeatingSystem, outdoorC: number): number {
  switch (heating.type) {
    case "gas":
      return 1 / heating.furnaceEfficiency;
    case "electric":
      return 1;
    case "heatpump":
      return 1 / copAt(heating.copCurve, outdoorC);
  }
}
