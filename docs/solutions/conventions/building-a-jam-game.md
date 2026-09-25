---
title: Build a new jam game from idea to a green PR by following the compounded conventions in order, and run the before-you-show-the-owner checklist
date: 2026-09-22
last_updated: 2026-09-25
category: conventions
module: game-creation
problem_type: convention
component: development_workflow
severity: high
related_components:
  - documentation
  - tooling
  - testing_framework
applies_when:
  - Adding a new game under games/ in tada-jam, or porting an idea into a jam cartridge
  - Asked to make a new jam game, or starting one from a one-paragraph idea
  - Planning the order of work for a game (age band, style spike, guidance ladder, quality bar, checks)
  - About to show a slice, build, or URL of a jam game to the owner or a playtester
  - Tempted to capture a jam workflow as an agent skill instead of in docs/solutions/
symptoms:
  - The end-to-end new-game workflow lived only in the jam-game-creator agent skill, outside docs/solutions/
  - The owner asked to keep the build workflow as compounded knowledge instead of a repo skill
  - Owner said instead of skills, keep it to compounded knowledge
  - Lessons from Pebble Table were scattered across separate learnings with no single entry point for a new game
root_cause: inadequate_documentation
resolution_type: documentation_update
tags: [new-game-workflow, kids-games, jam-cartridge, compounded-knowledge, pre-show-checklist, age-band, wordless-clarity, quality-bar]
---

# Build a new jam game from idea to a green PR by following the compounded conventions in order, and run the before-you-show-the-owner checklist

## Context

This is the entry point for building a new Tada Jam game. Read it first, then follow its links.

The repo used to carry a `jam-game-creator` skill (`.claude/skills/jam-game-creator/SKILL.md`, mirrored into `.cursor/skills/` by a symlink) that walked an agent from idea to a green PR. It was removed in favour of compounded knowledge: the lessons from building Pebble Table now live as separate learnings under `docs/solutions/`, each with `applies_when` frontmatter that `compound find` can recall and `compound audit --strict` checks in CI (`.github/workflows/ci.yml`, config in `.compound-engineering/config.yaml`). A skill is a frozen copy that drifts from those docs. This page only puts them in order. Each step names the concrete action and links the doc that holds the detail, so the detail lives in one place.

The order also changed from the old skill. The skill scaffolded gameplay before choosing a look and treated motion, performance, and sharing as end-of-build polish. Pebble Table showed that each of those costs a rewrite when it comes late, so they now come early.

## Guidance

Paths are relative to this file (`docs/solutions/conventions/`).

**0. Load what the jam already knows.** Run `compound find "<the activity, in a sentence>"` (needs `TYPESAFE_API_KEY`; see [agent delivery](../workflow-issues/agent-delivery-push-branches-and-keep-secrets-out.md) for loading it without printing it). Without the CLI or the key, grep the frontmatter instead: `rg -n -A6 '^applies_when:' docs/solutions`. Then read [`CONCEPTS.md`](../../../CONCEPTS.md) for the vocabulary, [`AGENTS.md`](../../../AGENTS.md) for the contract rules and jam allowances, and [`games/pebble-table/`](../../../games/pebble-table/) as the worked example (`games/pebble-table/guidance.ts`, `games/pebble-table/motion.ts`, `games/pebble-table/quality.ts`, `ART.md`, `REFINEMENT.md`).

**1. Shape the idea against Tada R15.** Write one paragraph: the one idea the child feels, the core verb (tip, deal, balance, sort), and how the world answers. Check it against "No engagement mechanics (Tada R15)" in [`AGENTS.md`](../../../AGENTS.md): no scores, streaks, timers, or counters dangled at the child (R15), and no verdicts (wordless clarity item 7). If the fun needs one, reshape the idea. Pick a kebab-case `key`; it is the folder name and the storage namespace.

**2. Declare the age band.** Set `ageBand: [min, max]` in `games/<key>/manifest.ts` (whole years, 2 to 12, at most five wide; `test/games.test.ts` fails otherwise). Find the row for `min` in the age-band cue table of [wordless clarity](wordless-clarity-for-the-declared-age-band.md); its "Avoid" column is a hard constraint. Decide what `ctx.childAge` changes as a default, never a gate (Pebble Table: `bagStonesForAge`, `defaultMatForAge` in `state.ts`).

**3. Explore the look before any gameplay.** Build the real scene (surface, props, one character) in several unclaimed styles from the menu in [`docs/art-direction.md`](../../art-direction.md). Screenshot each at 1180×820 with a measured fps at DPR 2, put them on one contact sheet, and let the owner pick. Register the pick in the claimed-styles table and write `games/<key>/ART.md` in the same PR. Detail: [distinct visual style per game](distinct-visual-style-per-game-shared-quality-bar.md).

**4. Scaffold the cartridge.** `manifest.ts` (no JSX or React), `<key>.tsx` (the `Cartridge` and its Mount), `index.ts` (`export const game: JamGame = { cartridge, emoji }`), contract types from `../types` only ([`AGENTS.md`](../../../AGENTS.md) "Shape of a game"). Rules go in pure modules with no renderer or physics imports and a `*.test.ts` beside each; saved state is versioned and read through a defensive `deserialize` (`STATE_VERSION` and `deserialize` in `games/pebble-table/state.ts`). Pause loops, physics, and audio when unattended or hidden (`running = ctx.attention.attended && !hidden` in `pebble-table.tsx`). Watch the element with a `ResizeObserver` and ignore 0×0; Pebble Table gets this from react-three-fiber's `Canvas`, a raw canvas game must add it. A 3D game with rigid bodies starts on Rapier, which is on Tada's tech menu, not cannon-es: load its WebAssembly behind a ready promise that the Mount awaits with the save, step it at a fixed rate on every tier, and set `mountsAfterLoading: true` in the game's audit config. Detail and the engine's gotchas: [use Rapier as the default physics engine](../tooling-decisions/use-rapier-as-the-default-physics-engine-for-jam-3d-games.md).

**5. One obvious want per scene, plus the guidance ladder, in the first slice.** From the first frame one thing visibly wants something from the child and each step toward it resolves visibly (the Scene want in [`CONCEPTS.md`](../../../CONCEPTS.md)). Add the idle ladder as a pure, tested module: glow, then a ghost-hand demonstration of one move, backing off and stopping (`chooseHint`, `IDLE_BEFORE_GLOW`, `IDLE_BEFORE_HINT`, `MAX_DEMOS_PER_IDLE` in `games/pebble-table/guidance.ts`). No words or numerals on the kid side (`npm run wordless:check`). Detail: checklist items 5 to 13 of [wordless clarity](wordless-clarity-for-the-declared-age-band.md).

**6. Give every character and object its own motion.** Before writing any curve, decide each character's tempo, weight, and funniest body part. Put motion in a pure module with a `Personality` per species and a `MotionDirector` that picks variants without repeats (`games/pebble-table/motion.ts`), give props their own springs (`STONE_FEEL`, `BagModel`, `ScaleModel` in `games/pebble-table/view/models.tsx`), and add tests that fail on shared or near-copy actions (`motion.test.ts`). Detail: [motion personality per character](../design-patterns/motion-personality-per-character.md).

**7. Build performance in from day one.** Write the budgets down, ship adaptive quality tiers (`QualityGovernor`, `TIERS` in `games/pebble-table/quality.ts`, tested in `quality.test.ts`), a triple-tap grown-up fps overlay (`GrownUpOverlay` in `games/pebble-table/view/overlay.tsx`), and a frame-budget test that CI runs through `npm test` (`games/pebble-table/perf.test.ts`). Profile a production build in WebKit, Chrome at 6x and 20x CPU throttle, and SwiftShader by adapting `scripts/pebble-perf.mjs` (`npm run perf:pebble`). Detail: [measure on the target device](../performance-issues/measure-on-the-target-device-and-ship-adaptive-quality.md). With physics, keep colliders as drawn but few and cheap ([colliders](../ui-bugs/pieces-collide-as-drawn-and-rest-on-what-is-drawn.md)), wake only what a moving thing can reach ([wake scope](../performance-issues/wake-only-what-a-moving-body-can-reach-and-let-the-mover-stop.md)), and compare builds with a probe that drives every build by the same screen positions, never by object names ([build-comparison probes](../workflow-issues/drive-a-build-comparison-perf-probe-by-layout-screen-positions-not-object-names.md)).

**8. Refine in logged passes.** Seed one busy state, screenshot at 1180×820 DPR 2 about 6.4 s after load (so the glow and a demonstration are in frame), critique in writing as the child, make one themed fix set, re-shoot, revert what hurts, and sample fps with no screenshots running. Log each pass as a row in `games/<key>/REFINEMENT.md` and end with "Still weak". For motion, review recorded video, not stills. Detail: [refinement loop](../workflow-issues/refinement-loop-for-kid-3d-readability.md).

**9. Run the cold playtest proxy.** Load the production build with fresh state, touch nothing for 10 s and write down what the scene invites, then play the first 60 s as a newcomer and list every unclear moment, recording the screen. Fix, rerun, and diff the lists. Detail: "Run a cold playtest proxy" in [wordless clarity](wordless-clarity-for-the-declared-age-band.md).

**10. Share a production build.** Run `npm run serve:lan` (build plus `vite preview` on port 4173 with `--strictPort`) in its own tmux session, separate from `npm run dev`, and rebuild before every re-share. Send `http://<LAN IP>:4173/?chrome=0#/play/<key>` and say in the message which URL is the production build to judge and which is the dev server to ignore. Detail: [share a production build](../workflow-issues/share-a-production-build-not-the-dev-server.md).

**11. Checks, push, PR hand-off.** Run `npm run check` (typecheck, vitest, egress scan, wordless check), then `npm run build && npm run egress:built`, then `compound audit --strict` if you touched `docs/solutions/`; CI runs all of these (`.github/workflows/ci.yml`). Then check that nothing passes through anything, starting from [run the intersection audit](../workflow-issues/run-the-intersection-audit-before-showing-the-owner.md). For a three.js game, run `npm run check:intersections -- <key>` on that build with the game's own moments, fix or allow every finding, and set `enforce: true` once it is clean, so CI's intersection job keeps it that way. A canvas-2D game gets its own overlap test instead, as that doc describes. Push with `git push -u origin <branch>` and read status with `gh run list --branch <branch>`. If `git push` returns 403 from a cloud VM, publish through the GitHub MCP instead, as in [deliver from a cloud VM through the GitHub MCP](../workflow-issues/deliver-from-a-cloud-vm-through-the-github-mcp-when-git-push-is-refused.md). Write the PR body to the Project store's `internal/` for the coordinator, saying how each quality-bar line is met, with engine, throttle, DPR, and build for every fps number. Detail: [agent delivery](../workflow-issues/agent-delivery-push-branches-and-keep-secrets-out.md).

**12. Compound what you learned.** For each durable learning run `ce-compound`, one learning per run ([`AGENTS.md`](../../../AGENTS.md) "Documented knowledge"). Before writing a new doc, check it against the existing ones with `compound find --overlap --doc <draft>` and extend an existing doc when they overlap. Add new terms to [`CONCEPTS.md`](../../../CONCEPTS.md), then run `compound audit --strict` so the `applies_when` field required by `.compound-engineering/config.yaml` is present.

## Before you show the owner

Each item is a mistake made while building Pebble Table, except the intersection-audit item, which the audit passes on the games after it paid for.

- [ ] The first screenshot is already in the chosen style at the quality bar, not a placeholder renderer. The 2D first slice was called "ugly" and its renderer was deleted. ([distinct visual style](distinct-visual-style-per-game-shared-quality-bar.md))
- [ ] Style details live in `games/<key>/ART.md`, not in jam-wide docs. The first art-direction doc made claymation the jam's look. ([distinct visual style](distinct-visual-style-per-game-shared-quality-bar.md))
- [ ] With no touch, one thing visibly wants something and faces the child. The owner said "not clear" a second time even with the ladder in place. ([wordless clarity](wordless-clarity-for-the-declared-age-band.md), item 13)
- [ ] The idle guidance ladder is in: glow, then one demonstrated move, backing off. The first slice had none. ([wordless clarity](wordless-clarity-for-the-declared-age-band.md), item 8)
- [ ] The "touch here" cue reads on every surface in the scene. The first glow vanished on the cream rug. ([refinement loop](../workflow-issues/refinement-loop-for-kid-3d-readability.md))
- [ ] The cold playtest proxy has run and its unclear-moment list is short or empty. ([wordless clarity](wordless-clarity-for-the-declared-age-band.md), item 14)
- [ ] No two characters share an animation, and a poke has its own reaction and sound. The first guests differed only by phase offset. ([motion personality](../design-patterns/motion-personality-per-character.md))
- [ ] Every visual change went through a logged pass. Grading before tone mapping turned highlights pink and was caught only by the re-shot. ([refinement loop](../workflow-issues/refinement-loop-for-kid-3d-readability.md))
- [ ] Fps numbers come from a production build under WebKit, throttled Chrome, and SwiftShader, and the lowest tier still looks like the game. Headless Chrome on an M4 said 60 fps while the device lagged. ([measure on the target device](../performance-issues/measure-on-the-target-device-and-ship-adaptive-quality.md))
- [ ] The report says plainly whether a physical iPad was measured. ([measure on the target device](../performance-issues/measure-on-the-target-device-and-ship-adaptive-quality.md))
- [ ] The [intersection audit](../workflow-issues/run-the-intersection-audit-before-showing-the-owner.md) (`npm run check:intersections -- <key>`) is clean and enforced on moments that reach every state, every allowed contact has a reason and a cap, and what it cannot read (shader motion, 2D games) has model tests. The owner saw pieces going through each other in many games, and Moon Phases' audit was clean while its child could stand inside Earth. The fixes by kind are in the z-fighting, animation-clipping and colliders docs the audit doc links.
- [ ] The URL you send is `npm run serve:lan` on port 4173, rebuilt after the last change, and the message says which URL is which. The owner judged smoothness on the dev server. ([share a production build](../workflow-issues/share-a-production-build-not-the-dev-server.md))
- [ ] The branch is pushed, CI is green on it, and the PR body is in the Project store, with no key value anywhere. ([agent delivery](../workflow-issues/agent-delivery-push-branches-and-keep-secrets-out.md))

Pebble Table itself has not done three of these yet: no scene has a want (guests look straight ahead at rest, per `gazeTarget` in `games/pebble-table/feeding.ts`), the cold playtest proxy has not been run, and no physical iPad has been measured. Its intersection audit now plays its own moments and is enforced (`scripts/intersections/games/pebble-table.ts`), merged with the Rapier port. See the filled-in checklist under Examples.

## Why This Matters

- **One entry point, no duplicate.** The removed skill restated rules the docs also held, so the two could disagree. This page holds only the order and the links; a fix to a learning reaches every future game without editing a second copy.
- **The order is what the session paid for.** Each step sits where its absence caused a rewrite or a second owner complaint: the look before gameplay (the 2D renderer was deleted), the want and the ladder in the first slice ("not clear" twice), motion personalities from the first build (a new module, split geometry, and five passes to retrofit), and adaptive quality from day one (lag hidden by desktop numbers).
- **The owner's time is the scarce resource.** Every mistake in "Before you show the owner" reached the owner before it was caught. Checking them first turns owner feedback into taste calls instead of bug reports.
- **Recall scales past memory.** As games and learnings accumulate, `compound find` surfaces the ones that apply to the activity at hand, including learnings this page does not link yet.

## When to Apply

- Starting any new game under `games/`, or porting an idea into a jam cartridge.
- Asked to "make a new jam game" or given a game idea by the owner.
- Picking up a half-built game and deciding what to do next: find the first step it has not done.
- Before sending the owner any build of any game: run "Before you show the owner".
- Not for polishing an existing game's look in isolation (go straight to the [refinement loop](../workflow-issues/refinement-loop-for-kid-3d-readability.md)) or for porting a finished game into Tada (README "Port a game into Tada").

## Examples

**Step 0, using the recall.** For a hypothetical sorting toy, `compound find "build a new jam game: a 3D sorting toy for ages 3 to 6 with animal characters"` returned all seven learnings that existed before this page (abridged):

```text
compound find: 7 hits (threshold 0.6) over 7 learnings, 0 pack rules, 12 pack candidates
1.00  docs/solutions/conventions/distinct-visual-style-per-game-shared-quality-bar.md
      passage: The rule for a new game
1.00  docs/solutions/conventions/wordless-clarity-for-the-declared-age-band.md
      passage: Guidance / The rule / Give every scene one obvious want
0.97  docs/solutions/design-patterns/motion-personality-per-character.md
0.97  docs/solutions/performance-issues/measure-on-the-target-device-and-ship-adaptive-quality.md
      passage: Prevention
0.89  docs/solutions/workflow-issues/share-a-production-build-not-the-dev-server.md
0.80  docs/solutions/workflow-issues/refinement-loop-for-kid-3d-readability.md
0.70  docs/solutions/workflow-issues/agent-delivery-push-branches-and-keep-secrets-out.md
```

Use it by mapping each hit to its step and reading the cited passage there, not all seven docs up front: the style passage feeds step 3, the want passage feeds step 5, "Prevention" is the day-one list for step 7. A hit that maps to no step is a learning this page has not absorbed yet; read it now and link it here in a later compound run. With "animal characters" in the activity, the motion doc ranks high, which is a cue to design personalities at step 6, not after the owner complains.

**"Before you show the owner" for Pebble Table as it stands on `cursor/pebble-table-cceb` (PR #1, unmerged):**

- [x] Chosen style at the quality bar: claymation, registered in `docs/art-direction.md`, but only after a 2D slice was shown first.
- [x] Style details in `games/pebble-table/ART.md`; the jam-wide doc holds only the bar and the registry.
- [ ] One want per scene: not done. Guests look straight ahead while plates are empty (`gazeTarget` in `games/pebble-table/feeding.ts`) and turn toward the bowl, not the child, only after 3 s idle (`guestsShouldReach` in `games/pebble-table/guidance.ts`); empty scale pans rest level.
- [x] Guidance ladder: `games/pebble-table/guidance.ts`, with first-open bag wiggle and idle ghost hand.
- [x] Touch cue on every surface: golden ring glow (`ringTexture` in `games/pebble-table/view/clay.ts`).
- [ ] Cold playtest proxy: not run.
- [x] Motion personalities: `games/pebble-table/motion.ts` with `motion.test.ts`; "Still weak (motion)" in `REFINEMENT.md` notes the whole party still starts eating at once.
- [x] Logged passes: ten visual and five animation passes in `REFINEMENT.md`.
- [x] Production-build measurements in WebKit, Chrome at 6x and 20x, and SwiftShader, with the minimal tier graded in materials (`installClayToneMapping`).
- [ ] Physical iPad: not measured; the PR must say so.
- [x] Production URL: `npm run serve:lan` exists and is documented; the earlier share was the dev server.
- [x] Pushed with CI green on the branch (`gh run list --branch cursor/pebble-table-cceb`); PR body at `internal/pebble-table-pr-body.md` in the Project store.
