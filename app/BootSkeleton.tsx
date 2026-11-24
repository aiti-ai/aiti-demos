/**
 * Boot skeleton — the static workbench chrome.
 *
 * The app is client-rendered (the page bails out to CSR), so a cold load paints
 * nothing until the whole client graph has been parsed and executed: ~0.7s on a
 * LAN and several seconds on a slow link. This markup ships inside the static
 * HTML, so the first frame already shows the shell's geometry; `boot-skeleton.ts`
 * fades it out once the real shell has mounted.
 *
 * Server component on purpose: no hooks, no data — it must render during
 * `next build` into out/index.html. Geometry mirrors the real shell (rail 357px,
 * transcript column 820px, composer at the bottom) so the hand-over does not
 * reflow.
 */
const SESSIONS = [
  { title: 74, meta: 46 },
  { title: 58, meta: 34 },
];
// Rail docks: a header row plus a hint of open file tree (0 = collapsed).
const DOCK_HEADS = [52, 44, 62];
const DOCK_BODIES = [3, 2, 0];
const THREAD = [96, 92, 88, 41];

export function BootSkeleton() {
  return (
    <div id="demo-boot" aria-hidden="true">
      <div className="db-rail">
        <div className="db-head">
          <span className="db-brand">Pi Web</span>
          <span className="db-pill db-pill-accent" />
          <span className="db-icon" />
          <span className="db-icon" />
          <span className="db-icon" />
        </div>
        <div className="db-label">
          <span className="db-bar db-bar-title" style={{ width: 62 }} />
          <span className="db-dot db-dot-sm" />
        </div>
        <div className="db-card">
          <span className="db-bar" style={{ width: "56%" }} />
        </div>
        <div className="db-sessions">
          {SESSIONS.map((row, i) => (
            <div className="db-session" key={i}>
              <span className="db-bar db-bar-title" style={{ width: `${row.title}%` }} />
              <span className="db-bar db-bar-meta" style={{ width: `${row.meta}%` }} />
            </div>
          ))}
        </div>
        <div className="db-docks">
          {DOCK_HEADS.map((width, i) => (
            <div className="db-dockgroup" key={i}>
              <div className="db-dock">
                <span className="db-bar db-bar-title" style={{ width }} />
                <span className="db-dot db-dot-sm" />
              </div>
              {DOCK_BODIES[i] > 0 && (
                <div className="db-dockbody">
                  {Array.from({ length: DOCK_BODIES[i] }, (_, row) => (
                    <span className="db-bar" key={row} style={{ width: `${58 + ((row * 17) % 30)}%` }} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="db-foot">
          <span className="db-bar" style={{ width: 40 }} />
          <span className="db-bar" style={{ width: 32 }} />
          <span className="db-bar" style={{ width: 46 }} />
          <span className="db-bar" style={{ width: 28 }} />
        </div>
      </div>
      <div className="db-main">
        <div className="db-toolbar">
          {Array.from({ length: 11 }, (_, i) => (
            <span className="db-dot" key={i} />
          ))}
        </div>
        <div className="db-thread">
          <div className="db-bubble" />
          <div className="db-msg">
            <span className="db-bar db-bar-strong" style={{ width: 108 }} />
            {THREAD.map((width, i) => (
              <span className="db-bar" key={i} style={{ width: `${width}%` }} />
            ))}
          </div>
        </div>
        <div className="db-composer" />
      </div>
    </div>
  );
}
