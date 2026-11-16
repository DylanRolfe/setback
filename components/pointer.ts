// Error messages are revealed when someone leaves a field. If they left it by
// pressing a button, showing the message at once would move the page under the
// pointer and the click could miss. So the reveal waits until the press is over.

let pointerIsDown = false;
let listening = false;

function listen() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("pointerdown", () => (pointerIsDown = true), true);
  window.addEventListener("pointerup", () => (pointerIsDown = false), true);
  window.addEventListener("pointercancel", () => (pointerIsDown = false), true);
}

/** Run `fn` now, or just after the current mouse or touch press has finished. */
export function afterPointerUp(fn: () => void): void {
  listen();
  if (!pointerIsDown) {
    fn();
    return;
  }
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    window.removeEventListener("pointerup", later, true);
    window.removeEventListener("pointercancel", later, true);
    fn();
  };
  // Wait a moment after the press ends so the click itself is delivered first.
  const later = () => window.setTimeout(run, 60);
  window.addEventListener("pointerup", later, true);
  window.addEventListener("pointercancel", later, true);
}

/** Start tracking presses. Call once from an effect so the first press is seen. */
export function trackPointer(): void {
  listen();
}
