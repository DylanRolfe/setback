"use client";

// Skip link. Moves focus to the main content without changing the address, so the
// share link in the URL hash (#s=...) is not replaced by "#main".

export function SkipLink() {
  return (
    <a
      className="skip-link"
      href="#main"
      onClick={(event) => {
        const main = document.getElementById("main");
        if (!main) return;
        event.preventDefault();
        main.focus();
        main.scrollIntoView({ block: "start" });
      }}
    >
      Skip to main content
    </a>
  );
}
