# Tada Jam — agent rules

This repo is a jam space for experimental kids' games that stay **Tada-cartridge compatible**. Every game lives in `games/<key>/` and must be portable into the Tada kid shell (`kieranklaassen/tada.computer`, `app/frontend/cartridges/<key>/`) without touching shell or contract code.

The authority for cartridge mechanics is Tada's `docs/cartridges.md`. This file restates the rules that apply here and names the four allowances the jam grants on top of them. If this file and the Tada contract disagree on anything not listed under "Jam allowances", the Tada contract wins.

## Verify

- `npm run check` runs TypeScript, vitest, the source egress scan, and the wordless check (no words or numerals rendered by kid-side game code). CI also builds and scans the built assets (`npm run build && npm run egress:built`).
- `npm run dev` starts the jam shell. Open the printed URL, pick a game. Add `?chrome=0` to hide the grown-up control strip.

## Documented knowledge

- `docs/solutions/` — compounded knowledge: conventions and solutions from past work, organized by category with YAML frontmatter (`module`, `tags`, `problem_type`, `applies_when`). Start a new game from [`docs/solutions/conventions/building-a-jam-game.md`](docs/solutions/conventions/building-a-jam-game.md), the step-by-step path from idea to a green PR.
- `CONCEPTS.md` — shared domain vocabulary for the jam (quality bar, claimed style, age band, guidance ladder, and more).
- [compound-cli](https://github.com/kieranklaassen/compound-cli) manages that knowledge. Before starting work, recall what applies with `compound find "<what you are about to do>"` (judged recall; needs `TYPESAFE_API_KEY` in the environment). Without the CLI or the key, grep the frontmatter under `docs/solutions/` instead. New learnings are captured with the compound-engineering `ce-compound` workflow, one learning per run, and `compound audit --strict` (config in `.compound-engineering/config.yaml`) validates their frontmatter in CI.

## Before you show the owner

Lessons from building Pebble Table, so the next game does not repeat them. The full checklist is in [`docs/solutions/conventions/building-a-jam-game.md`](docs/solutions/conventions/building-a-jam-game.md#before-you-show-the-owner).

- **Look first.** The first screenshot is already in the chosen style at the quality bar; explore styles before gameplay ([style per game](docs/solutions/conventions/distinct-visual-style-per-game-shared-quality-bar.md)).
- **Clear to a child.** One obvious want per scene, the guidance ladder in the first slice, and a cold playtest proxy run before the owner sees it ([wordless clarity](docs/solutions/conventions/wordless-clarity-for-the-declared-age-band.md)).
- **Every character moves like itself.** No shared animations; variants and delights per character ([motion personality](docs/solutions/design-patterns/motion-personality-per-character.md)).
- **Refine in logged passes.** Screenshot, critique, one fix set, re-screenshot, frame rate ([refinement loop](docs/solutions/workflow-issues/refinement-loop-for-kid-3d-readability.md)).
- **Measure on the target.** A production build in WebKit and throttled Chrome, a real iPad when possible; ship adaptive quality and the grown-up fps overlay from day one ([performance](docs/solutions/performance-issues/measure-on-the-target-device-and-ship-adaptive-quality.md)).
- **Share a production build.** `npm run serve:lan`, never the dev server, and say which URL is which ([production build](docs/solutions/workflow-issues/share-a-production-build-not-the-dev-server.md)).
- **Deliver cleanly.** Push the branch with CI green, hand the PR body to the coordinator, and never write a key value anywhere ([agent delivery](docs/solutions/workflow-issues/agent-delivery-push-branches-and-keep-secrets-out.md)).

## Shape of a game

- `games/<key>/manifest.ts` — the manifest const. No JSX, React imports, or Vite globals (it must stay Node-importable, like Tada's `manifests.ts`).
- `games/<key>/<key>.tsx` — the Mount and the exported `Cartridge` object.
- `games/<key>/index.ts` — jam-only: `export const game: JamGame = { cartridge, emoji }`. Deleted at port time.
- Pure logic in its own modules with `*.test.ts` beside it; saved state goes through a defensive `deserialize`.
- Contract types come from `../types` only (that path is `app/frontend/cartridges/types.ts` in Tada).

## Rules that still apply (from the Tada contract)

- **Contract surface only.** A game reaches the child, age, language, persistence, and attention through `ctx` alone. Never import from `harness/` or from another game. The egress check enforces this.
- **Manifest.** Kebab-case `key` equal to the folder name, non-blank `name`, an `ageBand` naming one audience (whole years, 2 to 12, at most five years wide; `test/games.test.ts` enforces it), `permissions` from the closed set, `iconIdentity` required. Declare `'storage'` if you persist.
- **Persistence only through `ctx.storage`.** No `fetch`, `localStorage`, `sessionStorage`, `IndexedDB`, or invented endpoints. Call `save()` on every meaningful change; it is debounced, and the shell flushes on put-away. Saved state is small plain JSON under 64 KB, versioned, and read defensively (older or corrupt shapes must not crash).
- **Lossless exit.** Put-away can happen at any instant. No confirm dialogs, no "are you sure", nothing lost.
- **Attention.** Pause animation loops, physics, and audio while `ctx.attention.attended` is false or `document.hidden` is true. A parked game stays mounted (`display: none`); unmount cleanups do not run on park.
- **Resize.** The shell can resize the surface without a `window` resize event. Canvas games watch their own element with a `ResizeObserver` and ignore `0×0` measurements. No hard-coded pixel geometry.
- **Zero egress (Tada R20).** No external URLs, CDN fonts, remote textures or audio, analytics, or third-party requests. Assets are procedural or repo-committed. System fonts only.
- **No engagement mechanics (Tada R15).** No scores, XP, streaks, timers pushing continuation, daily mechanics, counters dangled at the child, or punishment for leaving.
- **Age is a hint (Tada R8).** `ctx.childAge` (whole years or `null`) may set defaults; it never gates content. Handle `null`, and keep top and bottom buckets open-ended.
- **Language.** `ctx.language` picks a content pack with a silent fallback to the default pack. Kid-facing UI strings are avoided; any shell-facing string would go through Tada's `t()` at port time.
- **Sound.** Synthesized with tone.js or raw Web Audio. Start audio inside the child's first real tap, dispose nodes on cleanup, and stay silent while unattended.
- **Tech menu.** React 19, canvas 2D / SVG / pixi.js, three.js (raw), matter.js or rapier, tone.js, gsap, zustand. Anything else is a proposal in the PR description and must be egress-free, bundled, and license-clean (no AGPL/copyleft). The allowed package list lives in `scripts/egress-check.ts`.
- **Touch-first.** No hover-only behavior; hit targets around 48 px or larger.
- **Quality bar.** Every game meets the shared bar in `docs/art-direction.md`: alive at idle; motion and sound on every touch; weight, squash, and follow-through; kid-clear silhouettes and tappables; wordless clarity for the declared age band (every interaction understandable from cues at the youngest age in `ageBand`; no words or numerals on the kid side, enforced by `npm run wordless:check`; no voice instructions); wordless idle guidance; 60 fps on a mid-range iPad (DPR cap 2, under about 80 draw calls, no shadow maps, at most one post pass); procedural or committed assets only. Say in the PR how the game meets each line, with a measured frame rate.
- **Showcases are not cartridges.** An owner-approved showcase (so far only Alien Frontier) lives in `showcases/<key>/`, is listed apart from the games, and is exempt from the cartridge rules (age band, wordless, kid-side mechanics) but never from the egress and built-asset checks; `test/showcases.test.ts` holds that line.
- **A distinct look per game.** Games must not look alike. Before building visuals, pick a style nobody has claimed in the registry in `docs/art-direction.md`, spike it (screenshot at 1180×820 and measure fps at DPR 2), and register it there in the same PR with a link to the game's own art guide (`games/<key>/ART.md`). Claymation belongs to Pebble Table. Sharing techniques is fine; sharing a look is not.

## Jam allowances (proposed Tada contract deltas)

These come from the Pebble Table plan (`docs/plans/`) and are proposed upstream as clarifications (Δ1, Δ2, Δ4) and one amendment (Δ3). Games here may use them now. Each has a fallback that keeps the game shippable under the contract as written.

- **Δ1 — Calendar mirrors and hidden finds.** A world may mirror the real calendar or weather in how it looks, and may hide things a child finds by playing, provided nothing becomes available or unavailable by date, nothing counts days or finds, and nothing is dangled at the child.
- **Δ2 — World-time events.** A creature that wanders, naps, or nibbles while the child watches is allowed when it neither rewards presence nor punishes absence, pauses while unattended, and moves nothing the child cannot get back with one tap.
- **Δ3 — Spoken words.** Sound is synthesized by default. Short repo-committed clips may play from a same-origin URL when synthesis cannot make the sound (recorded number words are the worked case). On-device `speechSynthesis` is permitted for the same purpose. Remote URLs stay forbidden. Fallback if refused upstream: `speechSynthesis` only.
- **Jam stack — react-three-fiber, @react-three/postprocessing, and cannon-es.** Tada's tech menu asks for raw three.js and matter.js or rapier. The jam allows react-three-fiber (plus its postprocessing wrapper) and cannon-es so 3D games can iterate fast; they are egress-free, bundled, and MIT-licensed. Porting such a game means either proposing these libraries in the Tada PR or rewriting the view layer on raw three.js (the game rules, physics wrapper, and guidance are framework-free). The allowed package list lives in `scripts/egress-check.ts`.
- **Δ4 — Grown-up corner.** A game may keep a grown-up corner behind a deliberate hold gesture for settings a parent tunes in the moment. Its state lives in `ctx.storage`, and it never shows the child a score, log, or verdict.

## The mechanic prototype lab (`lab/`)

`lab/` holds throwaway **mechanic prototypes**, made to find game loops with depth on repeat play (see `CONCEPTS.md`: Mechanic prototype, Child persona, Depth gate, Hook). It is **exempt from every rule above**: no cartridge shape, no manifest, no wordless or egress checks, no quality bar, and words, scores, wins, and timers are allowed. Do not apply the jam rules to it, and do not copy its code into `games/`.

- It has its own scripts and toolchain (`npm run lab:check`, `lab:build`, `lab:serve`, `lab:panel`, `lab:report`, `lab:catalog`, `lab:smoke`; output lands in `lab/dist`, never the published `dist/`). Nothing under `lab/` imports from `games/` or `harness/`, and nothing there is imported by them; the root checks do not look inside it. `lab/kit/isolation.test.ts` enforces this.
- A prototype is `lab/protos/<key>/` with a pure, deterministic `meta.ts` and `sim.ts` (seeded, no `Math.random`, `Date.now`, or DOM), a thin canvas `view.ts`, and a `SPEC.md`. `lab/kit/example/` is the template; the shared contract suite in `lab/kit/contract.test.ts` runs over every folder.
- The persona panel is a set of model guesses at children, not measurements. Its reports and `lab/reports/SHORTLIST.md` say what to look at; real children check anything before it is polished into a cartridge.
- Specs, reports, and the idea catalog live under `lab/`, not `docs/solutions/` (the compound audit needs frontmatter there).

## Licensing

- The repo is under the O'Saasy license (same as Tada). Never copy code from Tada's pre-rebuild git history (AGPL). The jam shell in `harness/` is an independent re-implementation of the contract's behavior, not a copy of Tada's shim.
