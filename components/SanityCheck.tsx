"use client";

import { useMemo } from "react";
import {
  LIMITATIONS,
  NRCAN_GUIDANCE,
  sanityCheck,
  type Benchmark,
  type Scenario,
  type WeatherSeason,
} from "@/lib/sim";
import { fmtNum, fmtPct, SourceLink } from "./format";

const VERDICT_WORDS: Record<Benchmark["verdict"], string> = {
  below: "below",
  inside: "in line with",
  above: "above",
};

/** Published test cases run through this same model, reported honestly. */
export function SanityCheck({ scenario, weather }: { scenario: Scenario; weather: WeatherSeason }) {
  const benchmarks = useMemo(() => {
    try {
      return sanityCheck(scenario, weather);
    } catch {
      return null;
    }
  }, [scenario, weather]);

  if (!benchmarks) {
    return <p className="callout">The sanity check could not run with the current inputs.</p>;
  }

  const nrcan = benchmarks.find((b) => b.id === "nrcan");
  const cmhc = benchmarks.find((b) => b.id === "cmhc");
  const anyAbove = benchmarks.some((b) => b.verdict === "above");
  const leanLow = LIMITATIONS.find((line) => line.startsWith("Free heat"));

  return (
    <div className="grid gap-4">
      <p>
        We ran two published test cases through this same model, using your home, city and heating system. If the
        model were far off, it would show here.
      </p>

      {nrcan ? (
        <div className="rounded-md border border-line p-4">
          <h4>Natural Resources Canada rule of thumb</h4>
          <blockquote className="quote">&ldquo;{NRCAN_GUIDANCE.setbackQuote}&rdquo;</blockquote>
          <p className="text-sm">
            Source: <SourceLink id="keepingHeatIn" />
          </p>
          <dl className="num mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-[auto_1fr]">
            <dt className="font-semibold">Test case</dt>
            <dd>{nrcan.description}</dd>
            <dt className="font-semibold">Published figure</dt>
            <dd>about {fmtNum(nrcan.publishedPct)}% of heating energy</dd>
            <dt className="font-semibold">This model</dt>
            <dd>{fmtPct(nrcan.modelPct)}% of simulated heating energy</dd>
          </dl>
          <p className="mt-3">
            <strong>Verdict:</strong> Our model gives {fmtPct(nrcan.modelPct)}%, which is{" "}
            {VERDICT_WORDS[nrcan.verdict]} NRCan&rsquo;s &ldquo;about {fmtNum(nrcan.publishedPct)} percent&rdquo;. We
            count {fmtNum(nrcan.rangeLowPct, 1)}% to {fmtNum(nrcan.rangeHighPct, 1)}% as in line with it.
          </p>
        </div>
      ) : null}

      {cmhc ? (
        <div className="rounded-md border border-line p-4">
          <h4>Canada Mortgage and Housing Corporation test house</h4>
          <p className="mt-1 text-sm">
            Source: <SourceLink id="cmhc" />
          </p>
          <dl className="num mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-[auto_1fr]">
            <dt className="font-semibold">Test case</dt>
            <dd>{cmhc.description}</dd>
            <dt className="font-semibold">Published figure</dt>
            <dd>{fmtNum(cmhc.publishedPct, 1)}% of winter furnace gas, for one test house in Ottawa</dd>
            <dt className="font-semibold">This model</dt>
            <dd>{fmtPct(cmhc.modelPct)}% of simulated heating energy, for your home and city</dd>
          </dl>
          <p className="mt-3">
            <strong>Verdict:</strong> Our model gives {fmtPct(cmhc.modelPct)}%, which is{" "}
            {VERDICT_WORDS[cmhc.verdict]} CMHC&rsquo;s {fmtNum(cmhc.publishedPct, 1)}%. That was one test house in
            Ottawa, in a different winter, so this is context and not a pass or fail test.
          </p>
        </div>
      ) : null}

      {anyAbove ? (
        <p>
          With your inputs the model is above a published figure. Treat the result with more caution, and check the
          estimates in step 1.
        </p>
      ) : leanLow ? (
        <p>
          <strong>Why the model leans low:</strong> {leanLow}
        </p>
      ) : null}
    </div>
  );
}
