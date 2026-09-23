---
title: Share a production build on a stable LAN port for anything the owner judges, keep the Vite dev server separate, and label which URL is which
date: 2026-09-22
category: workflow-issues
module: lan-preview
problem_type: workflow_issue
component: development_workflow
severity: high
related_components:
  - tooling
  - documentation
applies_when:
  - Handing the owner or a playtester a URL to try a jam game on an iPad or other LAN device
  - The owner is about to judge smoothness, feel, or performance on a real device
  - A Vite dev server is already running in tmux and it is tempting to share its LAN address
  - Reporting that a change is ready to try, with more than one server running
  - Starting a new game or harness and deciding how it is served for review
symptoms:
  - The LAN URL the owner played was the Vite dev server on port 5199, not a build
  - The owner judged smoothness on unbundled modules, React development mode, StrictMode double renders, and HMR
  - No stable production URL existed, so the agent never said which URL was the real game
root_cause: missing_workflow_step
resolution_type: workflow_improvement
tags: [lan-sharing, production-build, vite-preview, vite-dev-server, serve-lan, strictmode, ipad-playtest, kids-games]
---

# Share a production build on a stable LAN port for anything the owner judges, keep the Vite dev server separate, and label which URL is which

## Context

While building Pebble Table (in PR #1, unmerged as of writing), the LAN URL the owner opened (likely on the iPad) was the Vite dev server: `npm run dev`, on port 5199 in that tmux session. `vite.config.ts` sets `server.host: true`, so the dev server binds to the LAN by default, and the README "Run it" section points there first ("an iPad on the same network can open it"); a later paragraph now says to judge smoothness on a production build. The owner judged smoothness on that URL and reported heavy lag. Part of what he saw was the dev server itself, not the game a child would run.

## Guidance

Never share the dev server as "the game" when the owner is going to judge feel or performance. Share a production build on a stable port and keep the dev server separate.

1. Build and serve the production bundle on the LAN with the `serve:lan` script in `package.json`:

   ```bash
   npm run serve:lan
   # = vite build && vite preview --host 0.0.0.0 --port 4173 --strictPort
   ```

   `--strictPort` makes it fail instead of silently moving to another port, so the URL you shared stays valid.

2. Find the Mac's LAN IP (Wi-Fi is usually `en0`; try `en1` if that prints nothing):

   ```bash
   ipconfig getifaddr en0
   ```

3. Share this URL shape, with the grown-up strip hidden and the game opened directly:

   ```
   http://<LAN IP>:4173/?chrome=0#/play/<key>
   ```

   The `#/play/<key>` hash is what `harness/main.tsx` routes on; `?chrome=0` starts with the strip hidden (README "Run it").

4. Run the preview in its own tmux session (for example `tada-jam-prod`) so the dev server session keeps running for iteration.

5. Rebuild before re-sharing. `vite preview` serves `dist/` as it was last built and does not watch source files. Re-run `npm run serve:lan` (or `npm run build` and restart the preview) after every change the owner should see.

6. Tell the owner which URL is which: port 4173 is the production build for judging; the dev port is for development only and will feel slower.

7. Point the owner at the hidden grown-up overlay in Pebble Table: triple-tap the top-left corner to see real fps, draw calls, triangles and the quality tier on the device itself.

## Why This Matters

The dev server is a different program from what ships:

- **Unbundled modules.** Vite serves each source file as a separate ES module, so first load makes many requests and parses untransformed-for-production code.
- **React development mode.** Extra checks and warnings run on every render.
- **StrictMode.** `harness/main.tsx` wraps the app in `<StrictMode>`, which in development double-invokes renders and mounts, unmounts and remounts effects. In a react-three-fiber scene with physics and audio that is real extra work at startup.
- **HMR client.** A WebSocket and module-graph bookkeeping run alongside the game.

Together these change first-load time and CPU cost, and a child in Tada never runs any of it. Judging on the dev server can make a fine game look laggy, or hide which part of the lag is genuinely the game's (on Pebble Table the likely iPad costs, found with throttled Chrome and a software-GPU proxy and not yet measured on a physical iPad, were GPU fill and a physics spill spiral, which only a production build isolates). Feedback on the wrong build leads to fixing the wrong thing.

## When to Apply

- Any time you send the owner (or anyone) a URL to try a game on a phone or iPad.
- Before recording fps numbers, videos or screenshots meant to represent how the game feels.
- When running `npm run perf:pebble`, which profiles against the production server.
- Not needed for your own quick visual checks while iterating; the dev server is fine for that.

## Examples

Two tmux sessions, one for each purpose:

```bash
# Development, hot reload (your iteration loop)
tmux new-session -d -s tada-jam-dev -c ~/tada-jam 'npm run dev'

# Production build for the owner to judge
tmux new-session -d -s tada-jam-prod -c ~/tada-jam 'npm run serve:lan'
ipconfig getifaddr en0   # e.g. 192.168.1.42
```

Message to the owner:

> Open http://192.168.1.42:4173/?chrome=0#/play/pebble-table on the iPad. That is the production build, the one to judge. Triple-tap the top-left corner to see fps. (The other port is my dev server; it is slower on purpose, please ignore it.)

After a change:

```bash
tmux respawn-pane -k -t tada-jam-prod 'npm run serve:lan'
```

## Related

- [`measure-on-the-target-device-and-ship-adaptive-quality.md`](../performance-issues/measure-on-the-target-device-and-ship-adaptive-quality.md): what to measure once a production build is being served, and the adaptive quality that keeps it smooth.
- [`README.md`](../../../README.md): "Run it", including judging smoothness on a production build.

