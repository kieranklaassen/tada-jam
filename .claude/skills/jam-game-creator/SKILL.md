---
name: jam-game-creator
description: Build a new Tada Jam kids' game from idea to a green PR. Use when adding a game under games/, porting an idea into a jam cartridge, or asked to "make a new jam game". Walks through declaring the age band, picking an unclaimed visual style, spiking it, building the wordless guidance ladder, meeting the shared quality bar, and passing CI.
---

# Jam game creator

A jam game is a Tada-shaped cartridge in `games/<key>/` for a child who may not read yet. It must be understandable at the youngest age it declares, through cues alone, look unlike every other jam game, and hold 60 fps on an iPad. Work through the steps in order; each ends with something you can check.

## 0. Load what the jam already knows

Before designing anything, read:

- `docs/solutions/`: documented conventions and solutions, with YAML frontmatter (`module`, `tags`, `problem_type`). Grep the frontmatter for your area. Two conventions govern every game:
  - `docs/solutions/conventions/wordless-clarity-for-the-declared-age-band.md` (age band, cue table, checklist)
  - `docs/solutions/conventions/distinct-visual-style-per-game-shared-quality-bar.md` (one look per game, shared bar)
- `CONCEPTS.md`: the jam's vocabulary (quality bar, claimed style, age band, wordless clarity, guidance ladder, state-revealed affordance).
- `AGENTS.md`: contract rules and jam allowances. `docs/art-direction.md`: the quality bar and the claimed-styles registry.
- `games/pebble-table/` as the worked example (`guidance.ts`, `controller.ts`, `ART.md`, `REFINEMENT.md`).

## 1. Shape the idea

- [ ] Write one paragraph: the one idea the child feels, the core verb (tip, deal, balance, knock), and what the world does back.
- [ ] Check it against Tada R15 in `AGENTS.md`: no scores, levels, streaks, timers, unlocks, or verdicts. If the fun needs any of those, reshape the idea.
- [ ] Pick a kebab-case `key`; it is the folder name and the storage namespace.

## 2. Declare the age band

- [ ] Set `ageBand: [min, max]` in `games/<key>/manifest.ts`: whole years, `min` at least 2, `max` at most 12, at most five years wide. `test/games.test.ts` fails otherwise.
- [ ] Look up the row for `min` in the age-band cue table of the wordless-clarity convention. Its "Avoid" column is a hard constraint; its "Cues that work" column is your toolbox.
- [ ] Decide what `ctx.childAge` changes. Age is a dial for defaults (how much material, which activity opens first), never a gate: every child can reach everything.

## 3. Scaffold the cartridge

- [ ] `manifest.ts` (no JSX or React), `<key>.tsx` (the `Cartridge` with its Mount), `index.ts` (`export const game: JamGame = { cartridge, emoji }`). Contract types come from `../types` only.
- [ ] Pure logic in modules with `*.test.ts` beside them. Saved state is small versioned JSON read through a defensive `deserialize`, saved only via `ctx.storage`.
- [ ] Pause loops, physics, and audio while unattended or hidden. Watch the element with a `ResizeObserver`.
- [ ] `npm run dev`, open the game from the list, and confirm it mounts, parks, and reloads losslessly.

## 4. Pick, spike, and register a style

- [ ] Choose a direction nobody has claimed in `docs/art-direction.md` (the menu of unclaimed directions is a good start).
- [ ] Spike it on the game's real scene: screenshot at 1180×820 and measure fps at DPR 2 with a scripted run (no screenshots during the timed part).
- [ ] Write `games/<key>/ART.md` (palette, materials, motion rules, budget) and add a row to the claimed-styles registry in the same PR.

## 5. Make it understandable without words

Work the checklist in the wordless-clarity convention. The essentials:

- [ ] Nothing on the kid side is a word or numeral. `npm run wordless:check` fails on JSX text, string children, formatted values, DOM or canvas text, and text components. Review bare `{value}` children by hand. A deliberate grown-up exception carries `wordless-ok: <reason>`.
- [ ] No voice instructions. Speech, if any, is number words or sounds the child asked for.
- [ ] Touchable things look touchable, on every surface in the scene. Targets around 48 px or larger.
- [ ] One next act at a time. Tools appear only when the state makes them meaningful (a state-revealed affordance, like Pebble Table's knife that exists only with a leftover).
- [ ] The material is the verdict: things tilt, match, settle, or stay. No ticks, crosses, fanfares, or sad faces.
- [ ] At most three fingers act; a fourth means a resting hand.
- [ ] Build the guidance ladder as a pure, tested module (Pebble Table's `guidance.ts` is the reference):
  - choose one next act from the current state;
  - after a few idle seconds, glow on what can be touched;
  - a little later, a ghost hand (or a character) demonstrates that one move, never the answer;
  - back off with growing gaps and stop after a few demonstrations;
  - any touch fades everything at once;
  - an optional first-open invitation (a wiggle, a peek) and characters that look and reach toward what matters while the child is idle.

## 6. Meet the quality bar

- [ ] Go line by line through the quality bar in `docs/art-direction.md`: alive at idle; motion and sound on every touch; weight, squash, and follow-through; kid-clear; wordless clarity for the declared age; wordless guidance; 60 fps on a mid-range iPad; procedural or committed assets; its own art direction.
- [ ] Measure: a scripted walkthrough at 1180×820, DPR 2, including an idle stretch long enough for the glow and one demonstration. Target about 60 fps average and no frame over 25 ms in normal play; under about 80 draw calls; at most one post pass; no shadow maps.
- [ ] Take an idle screenshot and ask honestly: would a child at the youngest declared age know what to touch? Playtest with one if you can.

## 7. Checks, PR, and CI

- [ ] `npm run check` (TypeScript, vitest, egress scan, wordless check), then `npm run build && npm run egress:built`.
- [ ] Open a PR. Say how the game meets each quality-bar line, with the measured frame rate, the declared age band, and the cues a child at its youngest age will see. Keep CI green.

## 8. Compound what you learned

- [ ] When the build taught something durable (a clarity fix, a performance trick, a design rule), run `ce-compound` for each learning, one per run, so it lands in `docs/solutions/` and new terms land in `CONCEPTS.md`.
