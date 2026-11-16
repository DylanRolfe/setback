import type { ScenarioRun } from "@/lib/sim";
import { CO2e } from "./format";
import { headlineParts } from "./shared";

/** The one-sentence result, built only from computed values. */
export function HeadlineSentence({ run, emphasis = false }: { run: ScenarioRun; emphasis?: boolean }) {
  const h = headlineParts(run);
  const Num = emphasis ? "strong" : "span";
  if (h.kind === "same") {
    return <>This schedule does not save energy compared with your current one.</>;
  }
  if (h.kind === "more") {
    return (
      <>
        This schedule uses <Num className="num">{h.pct}%</Num> more simulated heating energy than your current one
        (about <Num className="num">{h.kg} kg</Num> <CO2e /> more this season) under these assumptions.
      </>
    );
  }
  return (
    <>
      This schedule cuts your simulated heating energy by <Num className="num">{h.pct}%</Num> (about{" "}
      <Num className="num">{h.kg} kg</Num> <CO2e /> this season) under these assumptions.
    </>
  );
}
