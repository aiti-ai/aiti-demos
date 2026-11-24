/**
 * Boot skeleton teardown.
 *
 * `app/BootSkeleton.tsx` ships inside the static HTML so a cold load paints the
 * workbench chrome immediately. It has to stay up until the real shell is on
 * screen, otherwise the hand-over is just a different flavour of blank page.
 */

const ATTR = "data-demo-boot";

/** Fade the skeleton out once the app shell has been committed and painted. */
export function dismissBootSkeleton(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (root.getAttribute(ATTR) === "done") return;
  // Two frames: callers run in an effect, i.e. before this commit is painted.
  // Hiding on the second frame hands over to a painted shell, not a blank one.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => root.setAttribute(ATTR, "done"));
  });
}
