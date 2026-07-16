---
name: Screenshot limitation
description: Why app screenshots always show a static loading splash instead of the actual UI.
---

## Rule
The Cat Chase `index.html` contains a static pre-JS loading screen (animated progress bar, "Loading..." text). The screenshot tool captures this static HTML before React hydrates, so every app screenshot — regardless of path — shows the loading splash instead of the actual running UI.

**Why:** The screenshot tool renders the page without waiting for React to mount. This is a pre-existing limitation, not a regression from any code change.

**How to apply:** Do not treat the loading-splash screenshot as a failure. Verify correctness via `pnpm run typecheck`, clean workflow logs, and absence of browser console errors instead.
