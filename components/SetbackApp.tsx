"use client";

// The whole app: one Scenario in state, four steps plus the Sources view, results
// recomputed in the browser. No server, no tracking, no network request other than
// the static weather file for the chosen city.

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import {
  cityById,
  DEFAULT_CITY_ID,
  defaultScenario,
  exampleScenario,
  runScenario,
  suggestForScenario,
  type Scenario,
} from "@/lib/sim";
import { scenarioFromHash, scenarioToHash } from "@/lib/share";
import { BetterStep } from "./BetterStep";
import { CO2e, ExtLink } from "./format";
import { NowStep } from "./NowStep";
import { PlaceStep } from "./PlaceStep";
import { trackPointer } from "./pointer";
import { ResultsStep } from "./ResultsStep";
import {
  errorMessage,
  headlineText,
  STEPS,
  suggestBasis,
  type RunOutcome,
  type StoredSuggestion,
  type View,
} from "./shared";
import { SourcesView } from "./SourcesView";
import { loadWeather, useWeather } from "./useWeather";

interface AppState {
  scenario: Scenario;
  view: View;
  /** Where "Back" goes from the Sources view. */
  backTo: View;
  /** True once the person has left the landing page. The share link is kept in step from then on. */
  started: boolean;
  /** Counts view changes, so focus moves to the new heading after each one. */
  moves: number;
  suggestion: StoredSuggestion | null;
}

type Action =
  | { type: "go"; view: View }
  | { type: "load"; scenario: Scenario; suggestion: StoredSuggestion | null }
  | { type: "update"; fn: (s: Scenario) => Scenario }
  | { type: "suggested"; suggestion: StoredSuggestion };

function initialState(): AppState {
  return { scenario: defaultScenario(), view: "landing", backTo: "landing", started: false, moves: 0, suggestion: null };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "go":
      return {
        ...state,
        view: action.view,
        backTo: state.view === "sources" ? state.backTo : state.view,
        started: state.started || action.view !== "landing",
        moves: state.moves + 1,
      };
    case "load":
      return {
        scenario: action.scenario,
        view: "results",
        backTo: "results",
        started: true,
        moves: state.moves + 1,
        suggestion: action.suggestion,
      };
    case "update":
      return { ...state, scenario: action.fn(state.scenario) };
    case "suggested":
      return {
        ...state,
        scenario: { ...state.scenario, after: action.suggestion.schedule },
        suggestion: action.suggestion,
      };
  }
}

const exampleCityName = cityById(DEFAULT_CITY_ID).name.split(",")[0];

export default function SetbackApp() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const { scenario, view, started, moves } = state;
  const weatherState = useWeather(scenario.cityId);
  const weather = weatherState.weather;
  const city = cityById(scenario.cityId);

  const [exampleStatus, setExampleStatus] = useState<"idle" | "loading" | "error">("idle");
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [announced, setAnnounced] = useState("");

  const go = useCallback((next: View) => dispatch({ type: "go", view: next }), []);
  const update = useCallback((fn: (s: Scenario) => Scenario) => dispatch({ type: "update", fn }), []);

  // Results for the current scenario. Runs in the browser in a few milliseconds.
  const outcome = useMemo<RunOutcome>(() => {
    if (!started || !weather) return { status: "waiting" };
    try {
      return { status: "ok", run: runScenario(scenario, weather) };
    } catch (error) {
      return { status: "error", message: errorMessage(error) };
    }
  }, [started, scenario, weather]);

  // Open a shared scenario from the link, now and whenever the hash changes.
  useEffect(() => {
    const openFromHash = () => {
      const shared = scenarioFromHash(window.location.hash);
      if (shared) dispatch({ type: "load", scenario: shared, suggestion: null });
    };
    openFromHash();
    trackPointer();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  // Keep the share link in the address bar in step with the scenario.
  useEffect(() => {
    if (!started) return;
    const timer = window.setTimeout(() => {
      window.history.replaceState(null, "", scenarioToHash(scenario));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [started, scenario]);

  // After a view change, move focus to the new heading and bring it into view.
  useEffect(() => {
    if (moves === 0) return;
    const heading = document.getElementById("view-heading");
    if (!heading) return;
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ block: "start" });
  }, [moves]);

  // Tell screen-reader users the headline result when it changes, without chattering.
  const headline =
    outcome.status === "ok" && (view === "better" || view === "results") ? headlineText(outcome.run) : "";
  useEffect(() => {
    const timer = window.setTimeout(() => setAnnounced(headline), 700);
    return () => window.clearTimeout(timer);
  }, [headline]);

  async function tryExample() {
    setExampleStatus("loading");
    try {
      const exampleWeather = await loadWeather(DEFAULT_CITY_ID);
      const example = exampleScenario(exampleWeather);
      const suggestion = suggestForScenario(example, exampleWeather);
      dispatch({
        type: "load",
        scenario: { ...example, after: suggestion.schedule },
        suggestion: { ...suggestion, basis: suggestBasis(example), comfortMinC: example.comfortMinC },
      });
      setExampleStatus("idle");
    } catch {
      setExampleStatus("error");
    }
  }

  function suggest() {
    if (!weather) return;
    try {
      const suggestion = suggestForScenario(scenario, weather);
      dispatch({
        type: "suggested",
        suggestion: { ...suggestion, basis: suggestBasis(scenario), comfortMinC: scenario.comfortMinC },
      });
      setSuggestError(null);
    } catch (error) {
      setSuggestError(errorMessage(error));
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      {view === "landing" ? null : (
        <header className="site-header border-b border-line bg-surface">
          <div className="wrap flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3">
            <h1 className="text-2xl font-bold tracking-tight text-primary">Setback</h1>
            <p className="muted text-sm">
              Heating schedule simulator. Energy and <CO2e />, before and after.
            </p>
          </div>
        </header>
      )}

      {view === "landing" ? null : (
        <nav aria-label="Steps" className="site-nav border-b border-line bg-bg">
          <div className="wrap grid gap-2 py-3">
            <ol className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {STEPS.map((step, i) => (
                <li key={step.view}>
                  <button
                    type="button"
                    className="step-btn"
                    aria-current={view === step.view ? "step" : undefined}
                    onClick={() => go(step.view)}
                  >
                    <span className="step-num" aria-hidden="true">
                      {i + 1}
                    </span>
                    <span>
                      <span className="sr-only">Step {i + 1}: </span>
                      {step.label}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <div>
              <button
                type="button"
                className="step-btn md:w-auto"
                aria-current={view === "sources" ? "page" : undefined}
                onClick={() => go("sources")}
              >
                Sources and assumptions
              </button>
            </div>
          </div>
        </nav>
      )}

      <main id="main" tabIndex={-1} className="flex-1">
        {view === "landing" ? (
          <div className="wrap py-12 sm:py-20">
            <h1 className="text-5xl font-bold tracking-tight text-primary sm:text-7xl">Setback</h1>
            <p className="mt-5 max-w-3xl text-2xl leading-snug sm:text-3xl">
              See exactly how much energy and <CO2e /> your heating schedule wastes, and get a better one to program
              tonight.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                className="btn btn-primary btn-lg"
                aria-busy={exampleStatus === "loading" ? true : undefined}
                onClick={tryExample}
              >
                Try the {exampleCityName} example
              </button>
              <button type="button" className="btn btn-lg" onClick={() => go("place")}>
                Start with my own place
              </button>
            </div>
            <p role="status" className={exampleStatus === "error" ? "error-text mt-3" : "muted mt-3"}>
              {exampleStatus === "loading" ? "Loading the example." : ""}
              {exampleStatus === "error"
                ? "Error: the example weather data did not load. Check your connection and try again."
                : ""}
            </p>
            <p className="mt-4 text-lg font-semibold">No login. No tracking. Runs in your browser.</p>

            <div className="mt-12 grid gap-6 border-t border-line pt-8 md:grid-cols-2">
              <div>
                <h2 className="text-xl">What it does</h2>
                <ol className="mt-3 grid list-decimal gap-2 pl-5">
                  <li>Your place: pick a city, a home type and how it is heated.</li>
                  <li>Your schedule now: enter the temperatures you use today.</li>
                  <li>A better schedule: get one built from your routine, or make your own.</li>
                  <li>Results: compare one simulated heating season, before and after, and print the schedule.</li>
                </ol>
              </div>
              <div>
                <h2 className="text-xl">What it is not</h2>
                <p className="mt-3">
                  The results are simulated from a simple model of one home and one past winter. They are not
                  measured savings. The example uses an illustrative routine, not a real user. Every source and
                  assumption is listed inside.
                </p>
                <button type="button" className="btn mt-4" onClick={() => go("sources")}>
                  Sources and assumptions
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="wrap py-6 sm:py-8">
            {view === "place" ? (
              <PlaceStep scenario={scenario} update={update} weatherState={weatherState} go={go} />
            ) : null}
            {view === "now" ? <NowStep scenario={scenario} update={update} go={go} /> : null}
            {view === "better" ? (
              <BetterStep
                scenario={scenario}
                update={update}
                weatherState={weatherState}
                cityName={city.name}
                outcome={outcome}
                suggestion={state.suggestion}
                suggestError={suggestError}
                onSuggest={suggest}
                go={go}
              />
            ) : null}
            {view === "results" ? (
              <ResultsStep
                scenario={scenario}
                update={update}
                weatherState={weatherState}
                outcome={outcome}
                go={go}
              />
            ) : null}
            {view === "sources" ? (
              <SourcesView scenario={scenario} weatherState={weatherState} backTo={state.backTo} go={go} />
            ) : null}
          </div>
        )}
      </main>

      <div aria-live="polite" className="no-print sr-only">
        {announced}
      </div>

      <footer className="site-footer mt-8 border-t border-line bg-surface">
        <div className="wrap grid gap-2 py-6 text-sm">
          <p>Built by Dylan Rolfe with an AI coding agent. Simulation, not measured savings.</p>
          <p>
            <ExtLink href="https://open-meteo.com/">Weather data by Open-Meteo.com</ExtLink>, licensed under{" "}
            <ExtLink href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</ExtLink>.
          </p>
          <p className="muted">No login. No tracking. Runs in your browser.</p>
        </div>
      </footer>
    </div>
  );
}
