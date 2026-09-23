---
title: Every game's global declaration of window.__jamPerf must be the same type down to readonly, or main fails TS2717 after a merge that each branch passed alone
date: 2026-09-23
category: build-errors
module: typescript
problem_type: build_error
component: tooling
severity: medium
related_components:
  - development_workflow
applies_when:
  - Adding window.__jamPerf, or any other property on the global Window, to a jam game
  - Merging a game branch into main when other games already declare the same global
  - "`npm run typecheck` fails with TS2717 or TS2687 after a merge although both sides passed"
  - Deciding how a new game should type its grown-up perf handle
symptoms:
  - "games/hillside-spring/view/perf.ts(20,5): error TS2717: Subsequent property declarations must have the same type."
  - "The message names the same type on both sides ('JamPerf | undefined' against 'JamPerf | undefined'), because each game calls its own local alias JamPerf"
  - "PR #10's branch typechecked and passed CI; main failed the typecheck only once PR #10 was merged in"
root_cause: scope_issue
resolution_type: code_fix
tags: [typescript, ts2717, declare-global, declaration-merging, jam-perf, merge, kids-games]
---

# Every game's global declaration of window.__jamPerf must be the same type down to readonly, or main fails TS2717 after a merge that each branch passed alone

## Problem

The ten style-showcase games expose a grown-up perf handle on `window.__jamPerf` for the shared probe (Pebble Table reports through its canvas's data attributes instead), and seven of them type it by adding a property to the global `Window` interface from inside their own folder. That declaration looks local to the game, but TypeScript merges every `declare global` in the program into one `Window`, and the typecheck covers all games at once. When two games typed the handle slightly differently, each branch passed and `main` broke on the merge.

## Symptoms

- After PR #10 (Hillside Spring) merged, `npm run typecheck` on `main` failed:

  ```
  games/hillside-spring/view/perf.ts(20,5): error TS2717: Subsequent property declarations must have the same type.  Property '__jamPerf' must be of type 'JamPerf | undefined', but here has type 'JamPerf | undefined'.
  ```

- The message names the same type twice. Each game calls its own local alias `JamPerf`, so the message cannot show what differs. Here it was `readonly`: Hillside Spring's four data fields had none, while the games already on `main` marked all four `readonly`.
- PR #10's branch held only Hillside Spring and Pebble Table, typechecked with no errors, and its CI was green. The failure existed only in the merged tree. CI never ran on that tree either: the merges were pushed together with the fix, a commit on `main` that added `readonly` to Hillside Spring's fields, and CI on that commit passed.

## What Didn't Work

- **Reading the error for the difference.** Both sides print as `JamPerf | undefined`. Compare the two type definitions field by field instead.
- **Trusting each branch's green CI.** A branch with only one game that augments `Window` has nothing to conflict with. The conflict appears only when a second declaring game is in the same tree.

## Solution

Make the declaration identical to the other games'. The fix on `main` after PR #10, in `games/hillside-spring/view/perf.ts`:

```diff
 export type JamPerf = {
-  cpuMs: number[]
-  tier: number
-  drawCalls: number
-  triangles: number
+  readonly cpuMs: number[]
+  readonly tier: number
+  readonly drawCalls: number
+  readonly triangles: number
   reset(): void
 }
```

Cosy Scarf made the same change to three fields inside its own branch before PR #14 merged ("declared with the same readonly shape as the other games"). The shape all seven declaring games now share, as Kite Tower writes it in `games/kite-tower/view/game.tsx`:

```ts
type JamPerf = { readonly cpuMs: number[]; readonly tier: number; readonly drawCalls: number; readonly triangles: number; reset(): void }

declare global {
  interface Window {
    __jamPerf?: JamPerf
  }
}
```

What has to match, found by changing Hillside Spring's copy one way at a time and typechecking the whole program:

| Change to one game's declaration | Result |
|---|---|
| One field without `readonly` | TS2717 |
| `cpuMs: readonly number[]` instead of `number[]` | TS2717 |
| An extra field | TS2717 |
| `__jamPerf: JamPerf \| undefined` (required instead of optional), or `readonly __jamPerf?` | TS2687, "All declarations of '__jamPerf' must have identical modifiers" |
| `reset: () => void` instead of `reset(): void` | passes |
| Fields in another order | passes |

The alias name, and whether the type is an alias or written inline (Shadow Lantern writes it inline in `games/shadow-lantern/view/game.ts`), do not matter either.

Three games avoid the global merge altogether, so their shape cannot conflict with anyone's. Light Garden types the handle with a local intersection in `games/light-garden/view/perf.tsx`:

```ts
type PerfWindow = Window & { __jamPerf?: JamPerf }

export function installJamPerf(perf: JamPerf): () => void {
  const target = window as PerfWindow
  target.__jamPerf = perf
  return () => {
    if (target.__jamPerf === perf) delete target.__jamPerf
  }
}
```

Bedtime Forest and Felt Meadow cast at the point of use (`window as unknown as { __jamPerf?: JamPerf }`), which also stays local, though a cast through `unknown` checks nothing.

## Why This Works

A `declare global` block inside a module adds to the one global scope of the whole TypeScript program, and `tsconfig.json` puts `harness`, `games`, `scripts`, and `test` into a single program. Interface declarations with the same name merge, and TypeScript requires every declaration of a merged property to have an identical type (TS2717) and identical modifiers (TS2687). Identity is structural and strict: `readonly` on a field is part of the type, while the method and function-property forms of `reset` are the same member. The local intersection adds nothing to the global `Window`, so there is nothing to merge.

Only `npm run typecheck` sees this. `vite build` and vitest strip types without checking them, so the build and the tests stay green on a tree that does not typecheck.

The handle's shape was specified only in prose. The game plans list `window.__jamPerf = { cpuMs, tier, drawCalls, triangles, reset() }` (for example R20 in `docs/plans/2026-09-23-felt-meadow-plan.md`), and each game wrote its own TypeScript type from that. The probe (`scripts/jam-perf.mjs`) reads `cpuMs`, `tier`, `drawCalls`, and `triangles`, and never calls `reset`.

## Prevention

- [ ] Declaring `window.__jamPerf` in a new game: prefer Light Garden's local intersection. If the game augments `Window` instead, copy Kite Tower's type exactly.
- [ ] Before pushing a game branch, merge `main` into it and run `npm run typecheck` on the result. A branch that passes alone can still break `main`.
- [ ] When TS2717 names the same alias on both sides, list every declaration with `rg -n -A4 "declare global" games` and compare their types field by field.
- [ ] Any other property a game adds to the global `Window` (Critter Clay's `__critterClayProbe` is one) follows the same rule: another game that declares the same name must match it exactly. A name only one game uses is safe.

**A shared type: recommended against, for now; no code was changed.** One shared `JamPerf` type would stop the copies drifting, but the jam's rules leave it no good home. Games may import only from their own folder, `../types`, and the allowed packages (`AGENTS.md`; the egress check enforces it), and `games/types.ts` re-exports the cartridge contract that mirrors Tada's `app/frontend/cartridges/types.ts`, so a jam-only probe type there would make the mirror differ from Tada's file. An ambient declaration file outside every game, declaring `Window.__jamPerf` once, would need no import, but it would not travel with a game ported into Tada, where the game's own `window.__jamPerf` assignment would then fail to typecheck unless Tada declared the handle too. The local intersection needs neither: the type lives in the game, the global `Window` stays untouched, and the game ports alone. The better fix is therefore for new games to use the local intersection. Whether to convert the seven games that augment `Window` today is a decision for the owner.

## Related Issues

- [Building a jam game](../conventions/building-a-jam-game.md), step 11, runs `npm run check`, which includes the typecheck, before the PR hand-off.
- [Agent delivery](../workflow-issues/agent-delivery-push-branches-and-keep-secrets-out.md): CI runs the typecheck on every push.
- [Measure on the target device](../performance-issues/measure-on-the-target-device-and-ship-adaptive-quality.md) describes the shared probe that reads `window.__jamPerf`.
