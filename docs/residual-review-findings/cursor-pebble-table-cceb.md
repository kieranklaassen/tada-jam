# Residual Review Findings

Source: `ce-code-review mode:agent` on `cursor/pebble-table-cceb` against `docs/plans/2026-09-22-001-feat-pebble-table-plan.md`, run by the `lfg` pipeline on 2026-09-22. The reviewer ran every lens inline in one context (no independent sub-reviewers), so none of these are independently corroborated.

All nine actionable findings (one P1, three P2, five P3) were applied in the review-fix commit, except the decision half of the ninth one below. No issue tracker is configured for this repo, so this file is the durable record.

## Residual Review Findings

- **P3** `.github/workflows/ci.yml:5` — CI now runs on pushes to every branch (`branches: ['**']`), which sits outside the plan's Definition of Done boundary ("nothing outside `games/pebble-table/` changes except the README games table and this plan"). Kept deliberately: the agent's PR tool could not open a pull request in this repo, so branch-push CI is the only CI signal for the branch. Revert to `branches: [main]` plus `pull_request` once PRs flow normally if double runs are unwanted.
- **FYI** `games/pebble-table/scene.ts` — the scene clock keeps running while paused. A pending voice or munch is cleared when attention drops, so nothing fires late, but any future world-time feature (U19's mouse) must use attended time, not `now()`.
- **FYI** `games/pebble-table/scale.ts` — `stepBeam`'s `settledLevel` stays true on every step while level (the doc says it flips once). The scene does not use it; the test counts the flip edge.
- **FYI** `games/pebble-table/audio.ts` — `creak()` schedules a new `setTargetAtTime` each frame without cancelling earlier ramps. Harmless in practice; consider `cancelScheduledValues` if WebKit shows automation buildup.
- **FYI** `games/pebble-table/scene.ts` — a `devicePixelRatio` change with no box resize (moving a window between displays) is not picked up until the next resize.
- **FYI** `games/pebble-table/scene.ts` has no unit tests (it needs a canvas). Its seams are covered by the pure-module tests plus the Playwright browser smoke; a jsdom + canvas-mock harness would let the scene's intent routing be tested directly.
