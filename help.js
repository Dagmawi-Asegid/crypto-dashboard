// Shared "?" help-button behavior. Any button with class="help-btn" and a
// matching aria-controls target (a sibling .help-popover) toggles that
// popover open/closed. Works the same on every page that includes this file.

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".help-btn");

  // Close every open popover unless the click was on a help button or inside
  // an already-open popover (so clicking an explanation's own text doesn't
  // close it).
  if (!btn && !e.target.closest(".help-popover")) {
    document.querySelectorAll('.help-btn[aria-expanded="true"]').forEach((b) => {
      b.setAttribute("aria-expanded", "false");
      const id = b.getAttribute("aria-controls");
      const popover = id && document.getElementById(id);
      if (popover) popover.hidden = true;
    });
    return;
  }

  if (!btn) return;

  const id = btn.getAttribute("aria-controls");
  const popover = id && document.getElementById(id);
  if (!popover) return;

  const isOpen = btn.getAttribute("aria-expanded") === "true";

  // Close any other open popovers first (only one open at a time).
  document.querySelectorAll('.help-btn[aria-expanded="true"]').forEach((b) => {
    if (b !== btn) {
      b.setAttribute("aria-expanded", "false");
      const otherId = b.getAttribute("aria-controls");
      const otherPopover = otherId && document.getElementById(otherId);
      if (otherPopover) otherPopover.hidden = true;
    }
  });

  btn.setAttribute("aria-expanded", String(!isOpen));
  popover.hidden = isOpen;
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  document.querySelectorAll('.help-btn[aria-expanded="true"]').forEach((b) => {
    b.setAttribute("aria-expanded", "false");
    const id = b.getAttribute("aria-controls");
    const popover = id && document.getElementById(id);
    if (popover) popover.hidden = true;
  });
});
