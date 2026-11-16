import type { ReactNode } from "react";

interface NavTarget {
  label: string;
  onClick: () => void;
}

interface StepFrameProps {
  /** 1 to 4 for the steps; omitted for the Sources view. */
  step?: number;
  title: string;
  children: ReactNode;
  back?: NavTarget;
  next?: NavTarget;
}

/** One view of the app: a focusable heading, the content, and Back / Next buttons. */
export function StepFrame({ step, title, children, back, next }: StepFrameProps) {
  return (
    <section aria-labelledby="view-heading">
      {step ? <p className="no-print muted mb-2 text-sm font-semibold">Step {step} of 4</p> : null}
      <h2 id="view-heading" tabIndex={-1} className="no-print mb-4 scroll-mt-12">
        {title}
      </h2>
      <div className="grid gap-6">{children}</div>
      <div className="no-print mt-8 flex flex-wrap justify-between gap-3 border-t border-line pt-6">
        {back ? (
          <button type="button" className="btn" onClick={back.onClick}>
            Back: {back.label}
          </button>
        ) : (
          <span />
        )}
        {next ? (
          <button type="button" className="btn btn-primary" onClick={next.onClick}>
            Next: {next.label}
          </button>
        ) : null}
      </div>
    </section>
  );
}

export function WeatherNotice({
  status,
  cityName,
  retry,
}: {
  status: "loading" | "ready" | "error";
  cityName: string;
  retry: () => void;
}) {
  if (status === "ready") return null;
  if (status === "loading") {
    return (
      <p role="status" className="callout">
        Loading weather data for {cityName}.
      </p>
    );
  }
  return (
    <div role="alert" className="callout callout-error">
      <p>
        <strong>Error:</strong> the weather data for {cityName} did not load. Check your connection and try again.
      </p>
      <button type="button" className="btn mt-2" onClick={retry}>
        Try again
      </button>
    </div>
  );
}
