"use client";

// Text-like inputs that never block typing: each keeps what the person typed as a
// local string, commits it as soon as it is valid, and shows an inline text error
// (tied to the input with aria-describedby) once they leave the field with a value
// that cannot be used.

import { useId, useState, type ReactNode } from "react";
import { formatClock, parseClock } from "@/lib/sim";
import { afterPointerUp } from "./pointer";

interface Draft<T> {
  text: string;
  /** The committed value this draft belongs to. A draft is dropped when the value changes elsewhere. */
  base: T;
  bad: boolean;
  /** Errors are revealed when the person leaves the field, so they do not flash while typing. */
  revealed: boolean;
}

interface NumberFieldProps {
  label: ReactNode;
  value: number | null;
  onCommit: (value: number | null) => void;
  min: number;
  max: number;
  step?: number;
  /** Allow an empty field, committed as null. */
  allowBlank?: boolean;
  /** Only whole numbers are accepted. */
  integer?: boolean;
  /** Unit shown after the range in error messages, for example "°C". */
  unit?: string;
  hint?: ReactNode;
  placeholder?: string;
  className?: string;
  /** Extra class for the input itself, for example a width. */
  inputClassName?: string;
}

type Parsed = { ok: true; value: number | null } | { ok: false; message: string };

function parseNumber(text: string, bad: boolean, p: NumberFieldProps): Parsed {
  const range = `from ${p.min} to ${p.max}${p.unit ? ` ${p.unit}` : ""}`;
  const trimmed = text.trim();
  if (bad) return { ok: false, message: `Enter a number ${range}.` };
  if (trimmed === "") {
    return p.allowBlank ? { ok: true, value: null } : { ok: false, message: `Enter a number ${range}.` };
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return { ok: false, message: `Enter a number ${range}.` };
  if (p.integer && !Number.isInteger(n)) return { ok: false, message: `Enter a whole number ${range}.` };
  if (n < p.min || n > p.max) return { ok: false, message: `Enter a number ${range}.` };
  return { ok: true, value: n };
}

export function NumberField(props: NumberFieldProps) {
  const { label, value, onCommit, min, max, step, hint, placeholder, className, inputClassName } = props;
  const id = useId();
  const [draft, setDraft] = useState<Draft<number | null> | null>(null);
  const active = draft !== null && draft.base === value ? draft : null;
  const text = active ? active.text : value === null ? "" : String(value);
  const parsed = active ? parseNumber(active.text, active.bad, props) : null;
  const error = active && active.revealed && parsed && !parsed.ok ? parsed.message : null;
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ");

  return (
    <div className={className}>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={`input ${inputClassName ?? ""}`}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step ?? "any"}
        value={text}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        onChange={(e) => {
          const nextText = e.target.value;
          const bad = e.target.validity.badInput;
          const next = parseNumber(nextText, bad, props);
          if (next.ok) {
            setDraft({ text: nextText, base: next.value, bad, revealed: false });
            if (next.value !== value) onCommit(next.value);
          } else {
            setDraft({ text: nextText, base: value, bad, revealed: active?.revealed ?? false });
          }
        }}
        onBlur={() => {
          afterPointerUp(() =>
            setDraft((d) => {
              if (!d) return d;
              return parseNumber(d.text, d.bad, props).ok ? null : { ...d, revealed: true };
            })
          );
        }}
      />
      {hint ? (
        <p id={`${id}-hint`} className="hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="error-text">
          Error: {error}
        </p>
      ) : null}
    </div>
  );
}

interface TimeFieldProps {
  label: ReactNode;
  /** Minutes after midnight. */
  value: number;
  onCommit: (minutes: number) => void;
  hint?: ReactNode;
  className?: string;
}

export function TimeField({ label, value, onCommit, hint, className }: TimeFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState<Draft<number> | null>(null);
  const active = draft !== null && draft.base === value ? draft : null;
  const text = active ? active.text : formatClock(value);
  const invalid = active !== null && parseClock(active.text) === null;
  const error = invalid && active.revealed ? "Enter a time, for example 07:30." : null;
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ");

  return (
    <div className={className}>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="input"
        type="time"
        value={text}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        onChange={(e) => {
          const nextText = e.target.value;
          const minutes = parseClock(nextText);
          if (minutes !== null) {
            setDraft({ text: nextText, base: minutes, bad: false, revealed: false });
            if (minutes !== value) onCommit(minutes);
          } else {
            setDraft({ text: nextText, base: value, bad: true, revealed: active?.revealed ?? false });
          }
        }}
        onBlur={() => {
          afterPointerUp(() =>
            setDraft((d) => {
              if (!d) return d;
              return parseClock(d.text) !== null ? null : { ...d, revealed: true };
            })
          );
        }}
      />
      {hint ? (
        <p id={`${id}-hint`} className="hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="error-text">
          Error: {error}
        </p>
      ) : null}
    </div>
  );
}
